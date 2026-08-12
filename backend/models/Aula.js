/**
 * models/Aula.js — Modelo de Aula (agenda)
 *
 * Compatível com os dados existentes no localStorage:
 *   id, aluno, professor, data, horario, status, obs, criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const aulaSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    aluno: { type: String, required: [true, "Aluno é obrigatório"], trim: true },
    clienteId: { type: String, trim: true, default: null },
    professor: { type: String, required: [true, "Professor é obrigatório"], trim: true },
    data: { type: String },
    horario: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Agendada", "Realizada", "Cancelada"],
      default: "Agendada",
    },
    obs: { type: String, trim: true },
    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Aula", aulaSchema);