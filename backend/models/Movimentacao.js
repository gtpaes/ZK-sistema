/**
 * models/Movimentacao.js — Modelo de Movimentação de Estoque
 *
 * Compatível com os dados existentes no localStorage:
 *   id, produtoId, produto, tipo (entrada/saida), quantidade, motivo, data,
 *   criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const movimentacaoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    produtoId: { type: String, required: true, index: true },
    produto: { type: String, trim: true },
    tipo: { type: String, enum: ["entrada", "saida"], required: true },
    quantidade: { type: Number, required: true, min: 0 },
    motivo: { type: String, trim: true },
    data: { type: String, default: () => new Date().toISOString() },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Movimentacao", movimentacaoSchema);