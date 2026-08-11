/**
 * models/ConsertoHistorico.js — Modelo de Histórico de Consertos
 *
 * Compatível com os dados existentes no localStorage:
 *   id, numero, cliente, marca, descricao, valor, obs, dataEntrada,
 *   dataEntrega, statusFinal, origemId, criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const consertoHistoricoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    numero: { type: String, trim: true },
    cliente: { type: String, trim: true },
    marca: { type: String, trim: true },
    descricao: { type: String, trim: true },
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

module.exports = mongoose.model("ConsertoHistorico", consertoHistoricoSchema);