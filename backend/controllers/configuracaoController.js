/**
 * controllers/configuracaoController.js — Controller de Configurações
 *
 * Estratégia: documento único com chave "default".
 * GET / → retorna as configurações (cria com defaults se não existir)
 * PUT / → atualiza as configurações
 */

const Configuracao = require("../models/Configuracao");

/** Garante que o documento padrão exista */
async function obterOuCriar() {
  let cfg = await Configuracao.findOne({ chave: "default" });
  if (!cfg) {
    cfg = await Configuracao.create({ chave: "default" });
  }
  return cfg;
}

/** GET /api/configuracoes */
async function obter(req, res, next) {
  try {
    const cfg = await obterOuCriar();
    const { chave, ...dados } = cfg.toObject();
    res.json({ success: true, data: dados });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/configuracoes */
async function atualizar(req, res, next) {
  try {
    const cfg = await obterOuCriar();
    const permitidos = ["empresa", "admin", "cargo", "tema", "estoqueMinimo"];

    // Atualiza somente campos permitidos
    permitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        cfg[campo] = req.body[campo];
      }
    });
    cfg.atualizadoEm = new Date().toISOString();

    await cfg.save();

    const { chave, ...dados } = cfg.toObject();
    res.json({ success: true, data: dados });
  } catch (err) {
    next(err);
  }
}

module.exports = { obter, atualizar };