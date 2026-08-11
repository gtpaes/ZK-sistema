/**
 * models/Usuario.js — Modelo de Usuário (preparado para o futuro login)
 *
 * ⚠️ NÃO implementar o login agora. Apenas a estrutura está pronta.
 *
 * Estrutura:
 *   _id, nome, email, senhaHash, role, ativo, createdAt, updatedAt
 *
 * A senha JAMAIS deve ser armazenada em texto puro.
 * Quando o login for implementado, usar bcrypt para gerar o hash.
 */

const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    senhaHash: { type: String, required: false, default: null },
    role: { type: String, enum: ["dono", "admin", "funcionario"], default: "dono" },
    ativo: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Usuario", usuarioSchema);