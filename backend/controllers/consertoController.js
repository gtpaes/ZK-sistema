/**
 * controllers/consertoController.js — Controller de Consertos
 *
 * Regras de negócio protegidas no backend:
 *   - entregar: cria lançamento financeiro e move para histórico (transação)
 *   - reabrir: remove SOMENTE o financeiro vinculado e restaura a OS (transação)
 *   - excluir: remove SOMENTE o financeiro vinculado e remove a OS
 */

const mongoose = require("mongoose");
const Conserto = require("../models/Conserto");
const ConsertoHistorico = require("../models/ConsertoHistorico");
const Financeiro = require("../models/Financeiro");
const uid = require("../utils/uid");

/**
 * POST /api/consertos/:id/entregar — Entrega OS: lança financeiro e arquiva
 */
async function entregar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const c = await Conserto.findOne({ id }).session(session);
    if (!c) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Ordem de serviço não encontrada" });
    }
    if (c.status === "Entregue") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Esta OS já foi entregue" });
    }

    const agora = new Date().toISOString();

    // 1) Lança financeiro (uma única vez)
    if (Number(c.valor) > 0) {
      // Remove qualquer lançamento duplicado residual
      await Financeiro.deleteMany({ origem: "conserto", consertoId: c.id }, { session });
      await Financeiro.create(
        [
          {
            id: uid(),
            tipo: "entrada",
            categoria: "Conserto",
            descricao: `${c.numero} — ${c.cliente}`,
            valor: Number(c.valor),
            data: agora,
            origem: "conserto",
            consertoId: c.id,
          },
        ],
        { session }
      );
    }

    // 2) Move para histórico
    await ConsertoHistorico.create(
      [
        {
          id: uid(),
          numero: c.numero,
          cliente: c.cliente,
          marca: c.marca,
          descricao: c.descricao,
          valor: c.valor,
          obs: c.obs,
          dataEntrada: c.criadoEm,
          dataEntrega: agora,
          statusFinal: "Entregue",
          origemId: c.id,
        },
      ],
      { session }
    );

    // 3) Remove OS ativa
    await Conserto.deleteOne({ id: c.id }, { session });

    await session.commitTransaction();
    res.json({ success: true, message: "OS entregue e lançada no Financeiro" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/consertos/historico/:id/reabrir — Reabre OS do histórico
 */
async function reabrir(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const h = await ConsertoHistorico.findOne({ id }).session(session);
    if (!h) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Registro do histórico não encontrado" });
    }

    // 1) Remove SOMENTE o financeiro vinculado
    await Financeiro.deleteMany(
      { origem: "conserto", consertoId: h.origemId },
      { session }
    );

    // 2) Restaura OS como ativa
    await Conserto.create(
      [
        {
          id: uid(),
          numero: h.numero,
          cliente: h.cliente,
          marca: h.marca,
          descricao: h.descricao,
          valor: h.valor,
          obs: h.obs,
          status: "Pronta",
          prazo: h.vencimento || h.prazo,
        },
      ],
      { session }
    );

    // 3) Remove do histórico
    await ConsertoHistorico.deleteOne({ id: h.id }, { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Ordem reaberta com sucesso" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * DELETE /api/consertos/:id/financeiro — Remove financeiros vinculados
 * (usado ao excluir uma OS no frontend)
 */
async function removerFinanceiro(req, res, next) {
  try {
    const { id } = req.params;
    const result = await Financeiro.deleteMany({ origem: "conserto", consertoId: id });
    res.json({ success: true, message: `${result.deletedCount} lançamento(s) removido(s)` });
  } catch (err) {
    next(err);
  }
}

module.exports = { entregar, reabrir, removerFinanceiro };