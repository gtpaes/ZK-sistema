/**
 * models/Cliente.js — Modelo de Cliente
 *
 * Compatível com os dados existentes no localStorage:
 *   id, nome, cpf, telefone, whatsapp, email, endereco, observacoes,
 *   criadoEm, atualizadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const clienteSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    nome: { type: String, required: [true, "Nome do cliente é obrigatório"], trim: true },
    cpf: { type: String, trim: true },
    telefone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    endereco: { type: String, trim: true },
    observacoes: { type: String, trim: true },
    criadoEm: { type: String, default: () => new Date().toISOString() },
    atualizadoEm: { type: String, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Cliente", clienteSchema);