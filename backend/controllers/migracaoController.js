/**
 * controllers/migracaoController.js — Migração de dados do localStorage
 *
 * Recebe o dump do frontend (DB.exportAll()) e importa para o MongoDB.
 *
 * Regras:
 *   - Preserva IDs existentes
 *   - Detecta duplicados (por id)
 *   - Não sobrescreve registros já migrados
 *   - Gera relatório completo
 */

const Cliente = require("../models/Cliente");
const Produto = require("../models/Produto");
const Movimentacao = require("../models/Movimentacao");
const Venda = require("../models/Venda");
const Conserto = require("../models/Conserto");
const ConsertoHistorico = require("../models/ConsertoHistorico");
const Professor = require("../models/Professor");
const Aluno = require("../models/Aluno");
const Turma = require("../models/Turma");
const Aula = require("../models/Aula");
const Financeiro = require("../models/Financeiro");
const Confeccao = require("../models/Confeccao");
const ConfeccaoHistorico = require("../models/ConfeccaoHistorico");
const Guarderia = require("../models/Guarderia");
const GuarderiaHistorico = require("../models/GuarderiaHistorico");
const Configuracao = require("../models/Configuracao");

const COLLECTION_MAP = {
  clientes: Cliente,
  produtos: Produto,
  movimentacoes: Movimentacao,
  vendas: Venda,
  consertos: Conserto,
  consertosHistorico: ConsertoHistorico,
  professores: Professor,
  alunos: Aluno,
  turmas: Turma,
  aulas: Aula,
  financeiro: Financeiro,
  confeccoes: Confeccao,
  confeccoesHistorico: ConfeccaoHistorico,
  guarderias: Guarderia,
  guarderiaHistorico: GuarderiaHistorico,
};

/**
 * POST /api/migracao/importar
 *
 * Body: { clientes: [], produtos: [], ..., settings: {} }
 */
async function importar(req, res, next) {
  try {
    const dump = req.body;
    if (!dump || typeof dump !== "object") {
      return res.status(400).json({ success: false, message: "Dump inválido" });
    }

    const relatorio = { importado: {}, ignorado: {}, erros: [] };

    // Importa cada collection conhecida
    for (const [nome, Model] of Object.entries(COLLECTION_MAP)) {
      const registros = Array.isArray(dump[nome]) ? dump[nome] : [];
      let importados = 0;
      let ignorados = 0;

      for (const registro of registros) {
        try {
          if (!registro || typeof registro !== "object") {
            ignorados++;
            continue;
          }

          // Preserva o id existente
          const dados = { ...registro };
          if (!dados.id) {
            // Sem id: gera um (mas conta como ignorado? Não — gera novo id)
            delete dados.id;
          }

          // Verifica se já existe (não sobrescreve)
          if (dados.id) {
            const existe = await Model.findOne({ id: dados.id });
            if (existe) {
              ignorados++;
              continue;
            }
          }

          await Model.create(dados);
          importados++;
        } catch (err) {
          relatorio.erros.push({ collection: nome, id: registro?.id || "?", erro: err.message });
          ignorados++;
        }
      }

      relatorio.importado[nome] = importados;
      relatorio.ignorado[nome] = ignorados;
    }

    // Importa configurações se existirem
    if (dump.settings && typeof dump.settings === "object") {
      const { empresa, admin, cargo, tema, estoqueMinimo } = dump.settings;
      let cfg = await Configuracao.findOne({ chave: "default" });
      if (!cfg) {
        cfg = await Configuracao.create({ chave: "default" });
      }
      if (empresa !== undefined) cfg.empresa = empresa;
      if (admin !== undefined) cfg.admin = admin;
      if (cargo !== undefined) cfg.cargo = cargo;
      if (tema !== undefined) cfg.tema = tema;
      if (estoqueMinimo !== undefined) cfg.estoqueMinimo = Number(estoqueMinimo);
      cfg.atualizadoEm = new Date().toISOString();
      await cfg.save();
      relatorio.importado.settings = 1;
    }

    res.json({
      success: true,
      message: "Migração concluída",
      relatorio,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { importar };