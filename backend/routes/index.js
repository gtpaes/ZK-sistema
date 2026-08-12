/**
 * routes/index.js — Rotas da API do ZK SurfHouse
 *
 * Estrutura consolidada para evitar arquivos desnecessários.
 * Módulos simples usam o CRUD genérico; módulos com regras de negócio
 * usam controllers específicos.
 *
 * ⚠️ IMPORTANTE: Rotas específicas (historico, professores, alunos, pagar,
 * estornar, finalizar) DEVEM vir ANTES de rotas com :id — caso contrário
 * o Express captura "historico" como :id.
 */

const express = require("express");
const router = express.Router();
const authRoutes = require("./auth");
const { auth } = require("../middleware/auth");

// Models
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

// Controllers
const criarCRUD = require("../controllers/crudController");
const guarderiaController = require("../controllers/guarderiaController");
const vendaController = require("../controllers/vendaController");
const consertoController = require("../controllers/consertoController");
const confeccaoController = require("../controllers/confeccaoController");
const configuracaoController = require("../controllers/configuracaoController");
const migracaoController = require("../controllers/migracaoController");

// CRUDs genéricos
const clientes = criarCRUD(Cliente);
const produtos = criarCRUD(Produto);
const movimentacoes = criarCRUD(Movimentacao);
const vendas = criarCRUD(Venda);
const consertos = criarCRUD(Conserto);
const consertosHistorico = criarCRUD(ConsertoHistorico);
const professores = criarCRUD(Professor);
const alunos = criarCRUD(Aluno);
const turmas = criarCRUD(Turma);
const aulas = criarCRUD(Aula);
const financeiro = criarCRUD(Financeiro);
const confeccoes = criarCRUD(Confeccao);
const confeccoesHistorico = criarCRUD(ConfeccaoHistorico);
const guarderias = criarCRUD(Guarderia);
const guarderiaHistorico = criarCRUD(GuarderiaHistorico);

/* ============ CLIENTES ============ */
router.get("/clientes", clientes.listar);
router.get("/clientes/:id", clientes.buscar);
router.post("/clientes", clientes.criar);
router.put("/clientes/:id", clientes.atualizar);
router.delete("/clientes/:id", clientes.remover);

/* ============ PRODUTOS ============ */
router.get("/produtos", produtos.listar);
router.get("/produtos/:id", produtos.buscar);
router.post("/produtos", produtos.criar);
router.put("/produtos/:id", produtos.atualizar);
router.delete("/produtos/:id", produtos.remover);

/* ============ MOVIMENTAÇÕES (ESTOQUE) ============ */
router.get("/movimentacoes", movimentacoes.listar);
router.get("/movimentacoes/:id", movimentacoes.buscar);
router.post("/movimentacoes", movimentacoes.criar);
router.delete("/movimentacoes/:id", movimentacoes.remover);

/* ============ VENDAS ============ */
// Rotas específicas ANTES de rotas com :id
router.post("/vendas/finalizar", vendaController.finalizar);
router.post("/vendas/estornar", vendaController.estornar);

router.get("/vendas", vendas.listar);
router.get("/vendas/:id", vendas.buscar);
router.post("/vendas", vendas.criar);
router.put("/vendas/:id", vendas.atualizar);
router.delete("/vendas/:id", vendas.remover);

/* ============ CONSERTOS ============ */
// Rotas específicas ANTES de rotas com :id
router.get("/consertos/historico", consertosHistorico.listar);
router.get("/consertos/historico/:id", consertosHistorico.buscar);
router.post("/consertos/historico", consertosHistorico.criar);
router.delete("/consertos/historico/:id", consertosHistorico.remover);
router.post("/consertos/historico/:id/reabrir", consertoController.reabrir);

router.get("/consertos", consertos.listar);
router.get("/consertos/:id", consertos.buscar);
router.post("/consertos", consertos.criar);
router.put("/consertos/:id", consertos.atualizar);
router.delete("/consertos/:id", consertos.remover);
router.post("/consertos/:id/entregar", consertoController.entregar);
router.delete("/consertos/:id/financeiro", consertoController.removerFinanceiro);

/* ============ AULAS ============ */
// Rotas específicas ANTES de rotas com :id
router.get("/aulas/professores", professores.listar);
router.get("/aulas/professores/:id", professores.buscar);
router.post("/aulas/professores", professores.criar);
router.put("/aulas/professores/:id", professores.atualizar);
router.delete("/aulas/professores/:id", professores.remover);

router.get("/aulas/alunos", alunos.listar);
router.get("/aulas/alunos/:id", alunos.buscar);
router.post("/aulas/alunos", alunos.criar);
router.put("/aulas/alunos/:id", alunos.atualizar);
router.delete("/aulas/alunos/:id", alunos.remover);

router.get("/aulas/turmas", turmas.listar);
router.get("/aulas/turmas/:id", turmas.buscar);
router.post("/aulas/turmas", turmas.criar);
router.put("/aulas/turmas/:id", turmas.atualizar);
router.delete("/aulas/turmas/:id", turmas.remover);

router.get("/aulas", aulas.listar);
router.get("/aulas/:id", aulas.buscar);
router.post("/aulas", aulas.criar);
router.put("/aulas/:id", aulas.atualizar);
router.delete("/aulas/:id", aulas.remover);

/* ============ FINANCEIRO ============ */
router.get("/financeiro", financeiro.listar);
router.get("/financeiro/:id", financeiro.buscar);
router.post("/financeiro", financeiro.criar);
router.put("/financeiro/:id", financeiro.atualizar);
router.delete("/financeiro/:id", financeiro.remover);

/* ============ CONFECÇÕES ============ */
// Rotas específicas ANTES de rotas com :id
router.get("/confeccoes/historico", confeccoesHistorico.listar);
router.get("/confeccoes/historico/:id", confeccoesHistorico.buscar);
router.post("/confeccoes/historico", confeccoesHistorico.criar);
router.delete("/confeccoes/historico/:id", confeccoesHistorico.remover);
router.post("/confeccoes/historico/:id/reabrir", confeccaoController.reabrir);

router.get("/confeccoes", confeccoes.listar);
router.get("/confeccoes/:id", confeccoes.buscar);
router.post("/confeccoes", confeccoes.criar);
router.put("/confeccoes/:id", confeccoes.atualizar);
router.delete("/confeccoes/:id", confeccoes.remover);
router.post("/confeccoes/:id/entregar", confeccaoController.entregar);
router.delete("/confeccoes/:id/financeiro", confeccaoController.removerFinanceiro);

/* ============ GUARDERIA ============ */
// Rotas específicas ANTES de rotas com :id
router.get("/guarderias/historico", guarderiaHistorico.listar);
router.get("/guarderias/historico/:id", guarderiaHistorico.buscar);
router.post("/guarderias/historico", guarderiaHistorico.criar);
router.delete("/guarderias/historico/:id", guarderiaHistorico.remover);

router.post("/guarderias/pagar", guarderiaController.pagar);
router.post("/guarderias/estornar", guarderiaController.estornar);

router.get("/guarderias", guarderias.listar);
router.get("/guarderias/:id", guarderias.buscar);
router.post("/guarderias", guarderias.criar);
router.put("/guarderias/:id", guarderias.atualizar);
router.delete("/guarderias/:id", guarderias.remover);
router.delete("/guarderias/:id/financeiro", guarderiaController.removerFinanceiro);

/* ============ AUTENTICAÇÃO ============ */
router.use("/auth", authRoutes);

/* ============ PROTEÇÃO DAS ROTAS ============ */
router.use(auth);

/* ============ CONFIGURAÇÕES ============ */
router.get("/configuracoes", configuracaoController.obter);
router.put("/configuracoes", configuracaoController.atualizar);

/* ============ MIGRAÇÃO ============ */
router.post("/migracao/importar", migracaoController.importar);

module.exports = router;