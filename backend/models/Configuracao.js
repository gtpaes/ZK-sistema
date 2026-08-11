/**
 * models/Configuracao.js — Modelo de Configurações do Sistema
 *
 * Compatível com DB.settings do localStorage:
 *   empresa, admin, cargo, tema, estoqueMinimo
 *
 * Estratégia: documento único com chave fixa "default"
 * para facilitar get/put sem listas.
 */

const mongoose = require("mongoose");

const configuracaoSchema = new mongoose.Schema(
  {
    chave: { type: String, default: "default", unique: true },
    empresa: { type: String, default: "ZK SurfHouse" },
    admin: { type: String, default: "Administrador" },
    cargo: { type: String, default: "Acesso total" },
    tema: { type: String, enum: ["light", "dark"], default: "light" },
    estoqueMinimo: { type: Number, default: 5, min: 0 },
    atualizadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Configuracao", configuracaoSchema);