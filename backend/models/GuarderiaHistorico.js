/**
 * models/GuarderiaHistorico.js — Modelo de Histórico de Pagamentos da Guarderia
 *
 * Compatível com os dados existentes no localStorage:
 *   id, guarderiaId, assinaturaId, cliente, prancha, vaga, tipo, plano,
 *   inicio, vencimento, referencia, valor, obs, dataPagamento, status,
 *   criadoEm
 *
 * Cada pagamento tem identidade própria e é permanente.
 * Não é sobrescrito quando o contrato atual muda.
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const guarderiaHistoricoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    guarderiaId: { type: String, required: true, index: true },
    assinaturaId: { type: String, required: true, index: true },
    cliente: { type: String, trim: true },
    prancha: { type: String, trim: true },
    vaga: { type: String, trim: true },
    tipo: { type: String, trim: true },
    plano: { type: String, trim: true },
    inicio: { type: String },
    vencimento: { type: String },
    referencia: { type: String, trim: true },
    valor: { type: Number, default: 0 },
    obs: { type: String, trim: true },
    dataPagamento: { type: String, default: () => new Date().toISOString() },
    status: { type: String, default: "Pago" },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Índices para consultas frequentes
guarderiaHistoricoSchema.index({ assinaturaId: 1, dataPagamento: -1 });

module.exports = mongoose.model("GuarderiaHistorico", guarderiaHistoricoSchema);