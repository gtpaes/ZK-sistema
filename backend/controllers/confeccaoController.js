/**
 * controllers/confeccaoController.js — Controller de Confecção
 *
 * Regras de negócio protegidas no backend:
 *   - entregar: lança financeiro e move para histórico (transação)
 *   - reabrir: remove SOMENTE o financeiro vinculado e restaura a confecção (transação)
 *   - excluir: remove SOMENTE o financeiro vinculado e remove a confecção
 */

const mongoose = require("mongoose");
const Confeccao = require("../models/Confeccao");
const ConfeccaoHistorico = require("../models/ConfeccaoHistorico");
const Financeiro = require("../models/Financeiro");
const uid = require("../utils/uid");

/**
 * POST /api/confeccoes/:id/entregar — Entrega confecção: lança financeiro e arquiva
 */
async function entregar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const c = await Confeccao.findOne({ id }).session(session);
    if (!c) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Confecção não encontrada" });
    }
    if (c.status === "Entregue") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Esta confecção já foi entregue" });
    }

    const agora = new Date().toISOString();

    // 1) Lança financeiro (uma única vez)
    if (Number(c.valor) > 0) {
      // Remove qualquer lançamento duplicado residual
      await Financeiro.deleteMany({ origem: "confeccao", confeccaoId: c.id }, { session });
      await Financeiro.create(
        [
          {
            id: uid(),
            tipo: "entrada",
            categoria: "Confecção",
            descricao: `${c.numero} — ${c.cliente}`,
            valor: Number(c.valor),
            data: agora,
            origem: "confeccao",
            confeccaoId: c.id,
          },
        ],
        { session }
      );
    }

    // 2) Move para histórico
    await ConfeccaoHistorico.create(
      [
        {
          id: uid(),
          numero: c.numero,
          cliente: c.cliente,
          modelo: c.modelo,
          medidas: c.medidas,
          descricao: c.descricao,
          pintura: c.pintura,
          valor: c.valor,
          obs: c.descricao,
          dataEntrada: c.criadoEm,
          dataEntrega: agora,
          statusFinal: "Entregue",
          origemId: c.id,
        },
      ],
      { session }
    );

    // 3) Remove confecção ativa
    await Confeccao.deleteOne({ id: c.id }, { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Confecção entregue e lançada no Financeiro" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/confeccoes/historico/:id/reabrir — Reabre confecção do histórico
 */
async function reabrir(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    const h = await ConfeccaoHistorico.findOne({ id }).session(session);
    if (!h) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Registro do histórico não encontrado" });
    }

    // 1) Remove SOMENTE o financeiro vinculado
    await Financeiro.deleteMany(
      { origem: "confeccao", confeccaoId: h.origemId },
      { session }
    );

    // 2) Restaura confecção como ativa
    await Confeccao.create(
      [
        {
          id: uid(),
          numero: h.numero,
          cliente: h.cliente,
          modelo: h.modelo,
          medidas: h.medidas,
          descricao: h.descricao,
          pintura: h.pintura,
          valor: h.valor,
          prazo: h.prazo,
          status: "Pronta",
          historico: [],
        },
      ],
      { session }
    );

    // 3) Remove do histórico
    await ConfeccaoHistorico.deleteOne({ id: h.id }, { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Confecção reaberta com sucesso" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * DELETE /api/confeccoes/:id/financeiro — Remove financeiros vinculados
 * (usado ao excluir uma confecção no frontend)
 */
async function removerFinanceiro(req, res, next) {
  try {
    const { id } = req.params;
    const result = await Financeiro.deleteMany({ origem: "confeccao", confeccaoId: id });
    res.json({ success: true, message: `${result.deletedCount} lançamento(s) removido(s)` });
  } catch (err) {
    next(err);
  }
}

module.exports = { entregar, reabrir, removerFinanceiro };