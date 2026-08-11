/**
 * models/Confeccao.js — Modelo de Confecção (pranchas sob encomenda)
 *
 * Compatível com os dados existentes no localStorage:
 *   id, numero, cliente, modelo, medidas, quilhas, rabeta, bico, status,
 *   prazo, valor, pintura, descricao, fotos[], quadrantes[], historico[],
 *   criadoEm, atualizadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const historicoStatusSchema = new mongoose.Schema(
  {
    status: { type: String, trim: true },
    em: { type: String },
    pintura: { type: String },
    descricao: { type: String },
    fotos: { type: [String], default: [] },
    quadrantes: { type: [String], default: [] },
  },
  { _id: false, versionKey: false }
);

const confeccaoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    numero: { type: String, trim: true },
    cliente: { type: String, required: [true, "Cliente é obrigatório"], trim: true },
    modelo: { type: String, trim: true },
    medidas: { type: String, trim: true },
    quilhas: { type: String, trim: true },
    rabeta: { type: String, trim: true },
    bico: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Recebida", "Em produção", "Pintura", "Acabamento", "Pronta", "Entregue"],
      default: "Recebida",
    },
    prazo: { type: String },
    valor: { type: Number, default: 0, min: 0 },
    pintura: { type: String, trim: true },
    descricao: { type: String, trim: true },
    fotos: { type: [String], default: [] },
    quadrantes: { type: [String], default: [] },
    historico: { type: [historicoStatusSchema], default: [] },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Confeccao", confeccaoSchema);