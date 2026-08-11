/**
 * models/Guarderia.js — Modelo de Guarderia (períodos de assinatura)
 *
 * Compatível com os dados existentes no localStorage:
 *   id, assinaturaId, cliente, prancha, vaga, tipo, plano, inicio,
 *   vencimento, referencia, valor, obs, encerrado, pago, dataPagamento,
 *   criadoEm, atualizadoEm
 *
 * Cada período (mensalidade) é um documento independente com seu próprio id.
 * Ao pagar: move para guarderia_historico e cria o próximo período.
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const guarderiaSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    assinaturaId: { type: String, required: true, index: true },
    cliente: { type: String, required: [true, "Cliente é obrigatório"], trim: true },
    prancha: { type: String, trim: true },
    vaga: { type: String, trim: true },
    tipo: { type: String, trim: true },
    plano: { type: String, trim: true },
    inicio: { type: String },
    vencimento: { type: String },
    referencia: { type: String, trim: true },
    valor: { type: Number, default: 0, min: 0 },
    obs: { type: String, trim: true },
    encerrado: { type: Boolean, default: false },
    pago: { type: Boolean, default: false },
    dataPagamento: { type: String, default: null },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Índices para consultas frequentes
guarderiaSchema.index({ assinaturaId: 1, pago: 1 });
guarderiaSchema.index({ cliente: 1 });

module.exports = mongoose.model("Guarderia", guarderiaSchema);