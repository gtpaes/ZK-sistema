/**
 * models/Aluno.js — Modelo de Aluno
 *
 * Compatível com os dados existentes no localStorage:
 *   id, nome, telefone, nivel, turma, mensalidade, pago, ultimoPagamento,
 *   criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const alunoSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    nome: { type: String, required: [true, "Nome do aluno é obrigatório"], trim: true },
    telefone: { type: String, trim: true },
    nivel: { type: String, enum: ["Iniciante", "Intermediário", "Avançado"], default: "Iniciante" },
    turma: { type: String, trim: true },
    mensalidade: { type: Number, default: 0, min: 0 },
    pago: { type: Boolean, default: false },
    ultimoPagamento: { type: String, default: null },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Aluno", alunoSchema);