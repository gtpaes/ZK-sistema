/**
 * controllers/vendaController.js — Controller de Vendas
 *
 * Regras de negócio protegidas no backend:
 *   - finalizar: baixa estoque, cria movimentações, registra venda e
 *     lança financeiro (TUDO em transação)
 *   - estornar: devolve estoque, cria movimentações de entrada e remove
 *     SOMENTE o lançamento financeiro vinculado (TUDO em transação)
 *   - excluir: remove venda + estorno completo
 *
 * Uma venda NUNCA pode ser registrada parcialmente.
 */

const mongoose = require("mongoose");
const Venda = require("../models/Venda");
const Produto = require("../models/Produto");
const Movimentacao = require("../models/Movimentacao");
const Financeiro = require("../models/Financeiro");
const uid = require("../utils/uid");

/**
 * POST /api/vendas/finalizar — Finaliza venda com baixa de estoque
 */
async function finalizar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const venda = req.body;

    if (!Array.isArray(venda.itens) || venda.itens.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Adicione ao menos um item ao carrinho" });
    }

    // 1) Valida estoque e baixa
    for (const item of venda.itens) {
      const produto = await Produto.findOne({ id: item.produtoId }).session(session);
      if (!produto) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: `Produto não encontrado: ${item.nome}` });
      }
      const qtdAtual = Number(produto.quantidade) || 0;
      if (item.qtd > qtdAtual) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente para "${produto.nome}" (disponível: ${qtdAtual})`,
        });
      }
    }

    // 2) Aplica baixa de estoque + movimentações
    for (const item of venda.itens) {
      const produto = await Produto.findOne({ id: item.produtoId }).session(session);
      const novaQtd = Math.max(0, (Number(produto.quantidade) || 0) - item.qtd);
      await Produto.updateOne({ id: produto.id }, { quantidade: novaQtd }, { session });

      await Movimentacao.create(
        [
          {
            id: uid(),
            produtoId: produto.id,
            produto: produto.nome,
            tipo: "saida",
            quantidade: item.qtd,
            motivo: `Venda ${venda.numero}`,
            data: venda.data || new Date().toISOString(),
          },
        ],
        { session }
      );
    }

    // 3) Registra a venda
    if (!venda.id) delete venda.id;
    const saved = await Venda.create([venda], { session });

    // 4) Lança financeiro vinculado
    if (Number(venda.total) > 0) {
      await Financeiro.create(
        [
          {
            id: uid(),
            tipo: "entrada",
            categoria: "Venda",
            descricao: `${venda.numero} — ${venda.cliente}`,
            valor: Number(venda.total),
            data: venda.data || new Date().toISOString(),
            origem: "venda",
            vendaId: saved[0].id,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    res.status(201).json({ success: true, data: saved[0] });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/vendas/estornar — Estorna venda (devolve estoque + remove financeiro)
 */
async function estornar(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { vendaId } = req.body;
    if (!vendaId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "vendaId é obrigatório" });
    }

    const venda = await Venda.findOne({ id: vendaId }).session(session);
    if (!venda) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Venda não encontrada" });
    }
    if (venda.cancelada) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Esta venda já está cancelada" });
    }

    const agora = new Date().toISOString();

    // 1) Devolve estoque + movimentações de entrada
    for (const item of venda.itens || []) {
      const produto = await Produto.findOne({ id: item.produtoId }).session(session);
      if (produto) {
        const novaQtd = (Number(produto.quantidade) || 0) + (Number(item.qtd) || 0);
        await Produto.updateOne({ id: produto.id }, { quantidade: novaQtd }, { session });

        await Movimentacao.create(
          [
            {
              id: uid(),
              produtoId: produto.id,
              produto: produto.nome,
              tipo: "entrada",
              quantidade: Number(item.qtd) || 0,
              motivo: `Estorno da venda ${venda.numero}`,
              data: agora,
            },
          ],
          { session }
        );
      }
    }

    // 2) Remove SOMENTE o financeiro vinculado
    await Financeiro.deleteMany({ origem: "venda", vendaId: venda.id }, { session });

    // 3) Marca como cancelada
    await Venda.updateOne(
      { id: venda.id },
      { cancelada: true, canceladaEm: agora },
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, message: "Venda estornada com sucesso" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

module.exports = { finalizar, estornar };