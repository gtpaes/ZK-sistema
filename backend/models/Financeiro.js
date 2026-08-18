/**
 * models/Financeiro.js — Modelo de Lançamento Financeiro
 *
 * Compatível com os dados existentes no localStorage:
 *   id, tipo (entrada/saida), categoria, descricao, valor, data,
 *   origem (venda/conserto/confeccao/guarderia/aula/produto), + campos de vínculo
 *   (vendaId, consertoId, confeccaoId, guarderiaId, assinaturaId, alunoId,
 *   produtoId, movimentoId), criadoEm
 */

const mongoose = require("mongoose");
const uid = require("../utils/uid");

const financeiroSchema = new mongoose.Schema(
  {
    id: { type: String, default: uid, unique: true, index: true },
    tipo: { type: String, enum: ["entrada", "saida"], required: true },
    categoria: { type: String, trim: true },
    descricao: { type: String, trim: true },
    valor: { type: Number, required: true, min: 0 },
    data: { type: String, default: () => new Date().toISOString() },

    // Origem da transação
    origem: {
      type: String,
      enum: ["venda", "conserto", "confeccao", "guarderia", "aula", "produto", "manual", ""],
      default: "manual",
    },

    // Vínculos (preservam a relação com a operação de origem)
    vendaId: { type: String, default: null },
    consertoId: { type: String, default: null },
    confeccaoId: { type: String, default: null },
    guarderiaId: { type: String, default: null },
    assinaturaId: { type: String, default: null },
    alunoId: { type: String, default: null },

    // Vínculo com compras de produto/estoque
    produtoId: { type: String, default: null },
    movimentoId: { type: String, default: null },

    // Metadados adicionais da guarderia
    referencia: { type: String, default: null },
    periodoInicio: { type: String, default: null },
    periodoFim: { type: String, default: null },

    criadoEm: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Índices para consultas frequentes
financeiroSchema.index({ data: 1 });
financeiroSchema.index({ origem: 1 });
financeiroSchema.index({ tipo: 1 });

module.exports = mongoose.model("Financeiro", financeiroSchema);