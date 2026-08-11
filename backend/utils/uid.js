/**
 * utils/uid.js — Gera IDs compatíveis com o formato usado pelo frontend
 * Formato: Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
 */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

module.exports = uid;