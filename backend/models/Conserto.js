/**
 * models/Conserto.js — Modelo de Conserto (Ordens de Serviço)
 *
 * Compatível com os dados existentes no localStorage:
 *   id, numero, cliente, marca, descricao, status, prazo, valor, obs,
 *   quadrantes[], fotos[], criadoEm, atualizadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const consertoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    numero: { type: String, trim: true },
    cliente: { type: String, required: [true, "Cliente é obrigatório"], trim: true },
    marca: { type: String, trim: true },
    descricao: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Recebida", "Em análise", "Aguardando aprovação", "Em conserto", "Pronta", "Entregue"],
      default: "Recebida",
    },
    prazo: { type: String },
    valor: { type: Number, default: 0, min: 0 },
    obs: { type: String, trim: true },
    quadrantes: { type: [String], default: [] },
    fotos: { type: [String], default: [] },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Conserto", consertoSchema);