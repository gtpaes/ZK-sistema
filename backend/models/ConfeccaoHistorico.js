/**
 * models/ConfeccaoHistorico.js — Modelo de Histórico de Confecções
 *
 * Compatível com os dados existentes no localStorage:
 *   id, numero, cliente, modelo, medidas, descricao, pintura, valor, obs,
 *   dataEntrada, dataEntrega, statusFinal, origemId, criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const confeccaoHistoricoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    numero: { type: String, trim: true },
    cliente: { type: String, trim: true },
    modelo: { type: String, trim: true },
    medidas: { type: String, trim: true },
    descricao: { type: String, trim: true },
    pintura: { type: String, trim: true },
    valor: { type: Number, default: 0 },
    obs: { type: String, trim: true },
    dataEntrada: { type: String },
    dataEntrega: { type: String },
    statusFinal: { type: String, default: "Entregue" },
    origemId: { type: String },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("ConfeccaoHistorico", confeccaoHistoricoSchema);