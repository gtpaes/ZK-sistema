/**
 * models/Produto.js — Modelo de Produto
 *
 * Compatível com os dados existentes no localStorage:
 *   id, nome, categoria, codigo, preco, custoUnitario, quantidade, fornecedor,
 *   descricao, criadoEm, atualizadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const produtoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    nome: { type: String, required: [true, "Nome do produto é obrigatório"], trim: true },
    categoria: { type: String, trim: true },
    codigo: { type: String, trim: true },
    preco: { type: Number, default: 0, min: 0 },
    // Custo de aquisição por unidade (padrão). Produtos antigos sem custo
    // permanecem com 0 — nunca inventamos valores retroativos.
    custoUnitario: { type: Number, default: 0, min: 0 },
    quantidade: { type: Number, default: 0, min: 0 },
    estoqueMinimo: { type: Number, default: null, min: 0 },
    fornecedor: { type: String, trim: true },
    descricao: { type: String, trim: true },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Produto", produtoSchema);