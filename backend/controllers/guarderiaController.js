/**
 * controllers/guarderiaController.js — Controller da Guarderia
 *
 * Regras de negócio protegidas no backend:
 *   - pagar: move período para histórico, cria lançamento financeiro e
 *     gera o próximo período pendente (TUDO em transação)
 *   - estornar: remove SOMENTE o lançamento vinculado, restaura o período
 *     e remove o período pendente auto-gerado (TUDO em transação)
 *   - excluir: remove o período e SOMENTE os lançamentos vinculados a ele
 *
 * Interface síncrona do frontend preservada:
 *   Guarderia.pagar(g), Guarderia.estornar(g) → essas regras agora
 *   também são protegidas no backend para consistência.
 */

const mongoose = require("mongoose");
const Guarderia = require("../models/Guarderia");
const GuarderiaHistorico = require("../models/GuarderiaHistorico");
const Financeiro = require("../models/Financeiro");
const uid = require("../utils/uid");

const PLANOS = [
  { nome: "Mensal", meses: 1 },
  { nome: "Trimestral", meses: 3 },
  { nome: "Semestral", meses: 6 },
  { nome: "Anual", meses: 12 },
];

const planoMeses = (nome) => (PLANOS.find((p) => p.nome === nome) || PLANOS[0]).meses;

/** Calcula vencimento a partir do início e do plano */
function vencimento(inicio, nomePlano) {
  if (!inicio) return "";
  const d = new Date(inicio + "T00:00:00");
  d.setMonth(d.getMonth() + planoMeses(nomePlano));
  return d.toISOString().slice(0, 10);
}

/** Rótulo de referência do período (ex.: "agosto de 2025") */
function referencia(dataIso) {
  if (!dataIso) return "—";
  const d = new Date(dataIso + (dataIso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Primeiro dia do mês seguinte */
function proximoInicio(dataIso) {
  const d = dataIso ? new Date(dataIso + "T12:00:00") : new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Encontra o período ativo (não pago) de uma assinatura */
async function ativoDaAssinatura(assinaturaId) {
  return Guarderia.findOne({ assinaturaId, pago: { $ne: true } }).lean();
}

/**
 * POST /api/guarderias/pagar — Confirma pagamento do período ativo
 *
 * Fluxo (transação MongoDB):
 *   1. Valida período ativo
 *   2. Move para histórico como Pago
 *   3. Cria lançamento financeiro vinculado
 *   4. Remove período ativo
 *   5. Cria próximo período pendente
 */
async function pagar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { guarderiaId } = req.body;
    if (!guarderiaId) {
      return res.status(400).json({ success: false, message: "guarderiaId é obrigatório" });
    }

    const g = await Guarderia.findOne({ id: guarderiaId }).session(session);
    if (!g) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Período de guarderia não encontrado" });
    }
    if (g.pago) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Este período já está pago" });
    }
    if (g.encerrado) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Este contrato está encerrado" });
    }

    const agora = new Date().toISOString();

    // 1) Registro no histórico (identidade própria)
    const pagoReg = {
      id: uid(),
      guarderiaId: g.id,
      assinaturaId: g.assinaturaId,
      cliente: g.cliente,
      prancha: g.prancha,
      vaga: g.vaga,
      tipo: g.tipo,
      plano: g.plano,
      inicio: g.inicio,
      vencimento: g.vencimento,
      referencia: g.referencia,
      valor: g.valor,
      obs: g.obs,
      dataPagamento: agora,
      status: "Pago",
    };
    await GuarderiaHistorico.create([pagoReg], { session });

    // 2) Lançamento financeiro vinculado ao período
    if (Number(g.valor) > 0) {
      await Financeiro.create(
        [
          {
            id: uid(),
            tipo: "entrada",
            categoria: "Guarderia",
            descricao: `Guarderia ${g.plano} — ${g.cliente} (${g.referencia || ""})`,
            valor: Number(g.valor),
            data: agora,
            origem: "guarderia",
            guarderiaId: g.id,
            assinaturaId: g.assinaturaId,
            referencia: g.referencia,
            periodoInicio: g.inicio,
            periodoFim: g.vencimento,
          },
        ],
        { session }
      );
    }

    // 3) Remove período ativo
    await Guarderia.deleteOne({ id: g.id }, { session });

    // 4) Cria próximo período pendente (novo id, mesmo assinaturaId)
    const novoInicio = proximoInicio(g.inicio);
    await Guarderia.create(
      [
        {
          id: uid(),
          assinaturaId: g.assinaturaId,
          cliente: g.cliente,
          prancha: g.prancha,
          vaga: g.vaga,
          tipo: g.tipo,
          plano: g.plano,
          inicio: novoInicio,
          vencimento: vencimento(novoInicio, g.plano),
          referencia: referencia(novoInicio),
          valor: g.valor,
          obs: g.obs,
          encerrado: false,
          pago: false,
          dataPagamento: null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, message: "Pagamento confirmado e próximo período criado" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/guarderias/estornar — Cancela pagamento de um período pago
 *
 * Fluxo (transação MongoDB):
 *   1. Localiza o pagamento no histórico (pelo guarderiaId ou pelo mais recente da assinatura)
 *   2. Remove período pendente auto-gerado (se existir)
 *   3. Remove SOMENTE o lançamento financeiro vinculado
 *   4. Remove registro do histórico
 *   5. Reinstala o período pago como ativo/pendente
 */
async function estornar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { guarderiaId } = req.body;
    if (!guarderiaId) {
      return res.status(400).json({ success: false, message: "guarderiaId é obrigatório" });
    }

    // Localiza o registro no histórico
    let hist = await GuarderiaHistorico.findOne({ guarderiaId }).sort({ dataPagamento: -1 }).session(session);

    // Fallback: busca o mais recente da assinatura
    if (!hist) {
      const g = await Guarderia.findOne({ id: guarderiaId }).session(session);
      if (g) {
        hist = await GuarderiaHistorico.findOne({ assinaturaId: g.assinaturaId }).sort({ dataPagamento: -1 }).session(session);
      }
    }

    if (!hist) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Nenhum pagamento encontrado para estornar" });
    }

    const assinaturaId = hist.assinaturaId;

    // 1) Remove período pendente auto-gerado
    const pendente = await Guarderia.findOne({ assinaturaId, pago: { $ne: true } }).session(session);
    if (pendente) {
      await Guarderia.deleteOne({ id: pendente.id }, { session });
    }

    // 2) Remove SOMENTE o financeiro vinculado ao período pago
    await Financeiro.deleteMany(
      { origem: "guarderia", guarderiaId: hist.guarderiaId },
      { session }
    );

    // 3) Remove registro do histórico
    await GuarderiaHistorico.deleteOne({ id: hist.id }, { session });

    // 4) Reinstala período como ativo/pendente
    await Guarderia.create(
      [
        {
          id: uid(),
          assinaturaId,
          cliente: hist.cliente,
          prancha: hist.prancha,
          vaga: hist.vaga,
          tipo: hist.tipo,
          plano: hist.plano,
          inicio: hist.inicio,
          vencimento: hist.vencimento,
          referencia: hist.referencia,
          valor: hist.valor,
          obs: hist.obs,
          encerrado: false,
          pago: false,
          dataPagamento: null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, message: "Pagamento cancelado e período restaurado como pendente" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/guarderias/:id/financeiro — Remove financeiros vinculados a um período
 * (usado na exclusão de período no frontend)
 */
async function removerFinanceiro(req, res, next) {
  try {
    const { id } = req.params;
    const result = await Financeiro.deleteMany({ origem: "guarderia", guarderiaId: id });
    res.json({ success: true, message: `${result.deletedCount} lançamento(s) removido(s)` });
  } catch (err) {
    next(err);
  }
}

module.exports = { pagar, estornar, removerFinanceiro };