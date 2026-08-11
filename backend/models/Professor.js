/**
 * models/Professor.js — Modelo de Professor
 *
 * Compatível com os dados existentes no localStorage:
 *   id, nome, telefone, especialidade, criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const professorSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    nome: { type: String, required: [true, "Nome do professor é obrigatório"], trim: true },
    telefone: { type: String, trim: true },
    especialidade: { type: String, trim: true },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Professor", professorSchema);