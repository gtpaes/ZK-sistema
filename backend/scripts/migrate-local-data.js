/**
 * scripts/migrate-local-data.js — Script de migração de dados do localStorage
 *
 * Este script lê um arquivo JSON exportado pelo frontend
 * (Configurações → Exportar dados) e envia para a API.
 *
 * Uso:
 *   npm run migrate -- backend/backup.json
 *   node scripts/migrate-local-data.js backup.json
 *
 * Pré-requisitos:
 *   1. Backend rodando (npm run dev)
 *   2. Arquivo JSON exportado do ZK SurfHouse
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const API_URL = process.env.API_URL || "http://localhost:5000";

async function main() {
  // 1) Localiza o arquivo de backup
  const arquivo = process.argv[2] || "backup-zk-surfhouse.json";
  const caminho = path.resolve(process.cwd(), arquivo);

  if (!fs.existsSync(caminho)) {
    console.error(` Arquivo não encontrado: ${caminho}`);
    console.error("   Exporte os dados no frontend (Configurações → Exportar) e tente novamente.");
    process.exit(1);
  }

  // 2) Lê e valida o JSON
  let dump;
  try {
    dump = JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch (err) {
    console.error(" Erro ao ler o arquivo JSON:", err.message);
    process.exit(1);
  }

  if (!dump || typeof dump !== "object") {
    console.error(" Arquivo JSON inválido.");
    process.exit(1);
  }

  const collections = [
    "clientes", "produtos", "movimentacoes", "vendas",
    "consertos", "consertosHistorico", "professores", "alunos", "turmas",
    "aulas", "financeiro", "confeccoes", "confeccoesHistorico",
    "guarderias", "guarderiaHistorico", "settings",
  ];

  const totalRegistros = collections.reduce(
    (s, c) => s + (Array.isArray(dump[c]) ? dump[c].length : c === "settings" && dump[c] ? 1 : 0),
    0
  );

  if (totalRegistros === 0) {
    console.error(" Nenhum dado encontrado no arquivo de backup.");
    process.exit(1);
  }

  console.log(" Resumo do backup:");
  collections.forEach((c) => {
    const qtd = Array.isArray(dump[c]) ? dump[c].length : c === "settings" && dump[c] ? 1 : 0;
    if (qtd > 0) console.log(`   • ${c}: ${qtd} registro(s)`);
  });
  console.log(`   Total: ${totalRegistros} registro(s)`);
  console.log("");

  // 3) Envia para a API
  console.log(` Enviando para ${API_URL}/api/migracao/importar ...`);

  try {
    const resposta = await fetch(`${API_URL}/api/migracao/importar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dump),
    });

    const resultado = await resposta.json();

    if (!resultado.success) {
      console.error(" Falha na migração:", resultado.message);
      if (resultado.errors) {
        console.error("   Erros:", resultado.errors);
      }
      process.exit(1);
    }

    console.log("✅ Migração concluída com sucesso!");
    console.log("");
    console.log("📊 Relatório:");

    const relatorio = resultado.relatorio || {};
    collections.forEach((c) => {
      const importados = relatorio.importado?.[c] ?? 0;
      const ignorados = relatorio.ignorado?.[c] ?? 0;
      console.log(`   • ${c}: ${importados} importado(s), ${ignorados} ignorado(s)`);
    });

    if (relatorio.erros?.length) {
      console.log("");
      console.warn(`⚠️  ${relatorio.erros.length} erro(s) encontrados:`);
      relatorio.erros.slice(0, 10).forEach((e) => {
        console.warn(`   - [${e.collection}:${e.id}] ${e.erro}`);
      });
    }
  } catch (err) {
    console.error(" Não foi possível conectar à API:", err.message);
    console.error("   Verifique se o backend está rodando em", API_URL);
    process.exit(1);
  }
}

main();