/**
 * models/Turma.js — Modelo de Turma
 *
 * Compatível com os dados existentes no localStorage:
 *   id, nome, professor, dias, horario, criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const turmaSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    nome: { type: String, required: [true, "Nome da turma é obrigatório"], trim: true },
    professor: { type: String, trim: true },
    dias: { type: String, trim: true },
    horario: { type: String, trim: true },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Turma", turmaSchema);