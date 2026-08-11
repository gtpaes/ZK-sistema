/**
 * models/Venda.js — Modelo de Venda
 *
 * Compatível com os dados existentes no localStorage:
 *   id, numero, data, clienteId, cliente, itens[], subtotal, descontoTipo,
 *   descontoInformado, desconto, total, pagamento, cancelada, canceladaEm,
 *   criadoEm, atualizadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const itemSchema = new mongoose.Schema(
  {
    produtoId: { type: String, required: true },
    nome: { type: String, trim: true },
    preco: { type: Number, default: 0 },
    qtd: { type: Number, default: 1, min: 1 },
    subtotal: { type: Number, default: 0 },
  },
  { _id: false, versionKey: false }
);

const vendaSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    numero: { type: String, trim: true },
    data: { type: String, default: () => new Date().toISOString() },
    clienteId: { type: String, default: "" },
    cliente: { type: String, default: "Consumidor final", trim: true },
    itens: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    descontoTipo: { type: String, enum: ["valor", "percent"], default: "valor" },
    descontoInformado: { type: Number, default: 0 },
    desconto: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    pagamento: { type: String, default: "Pix", trim: true },
    cancelada: { type: Boolean, default: false },
    canceladaEm: { type: String, default: null },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Venda", vendaSchema);