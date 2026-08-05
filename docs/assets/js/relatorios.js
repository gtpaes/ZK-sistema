/** relatorios.js — Análises a partir dos dados locais + exportação CSV */

const Relatorios = (() => {
  const state = { periodo: 30 };

  const desde = () => Date.now() - state.periodo * 86400000;

  function dados() {
    const vendas = DB.vendas.all().filter((v) => new Date(v.data || v.criadoEm).getTime() >= desde());
    const fin = DB.financeiro.all().filter((f) => new Date(f.data || f.criadoEm).getTime() >= desde());
    const faturamento = vendas.reduce((s, v) => s + Number(v.total || 0), 0);
    const saidas = fin.filter((f) => f.tipo === "saida").reduce((s, f) => s + Number(f.valor || 0), 0);
    const entradasExtras = fin.filter((f) => f.tipo === "entrada" && f.origem !== "venda").reduce((s, f) => s + Number(f.valor || 0), 0);

    const porProduto = {};
    vendas.forEach((v) => (v.itens || []).forEach((i) => {
      porProduto[i.nome] = porProduto[i.nome] || { nome: i.nome, qtd: 0, total: 0 };
      porProduto[i.nome].qtd += i.qtd;
      porProduto[i.nome].total += i.preco * i.qtd;
    }));

    const porPagamento = {};
    vendas.forEach((v) => (porPagamento[v.pagamento || "—"] = (porPagamento[v.pagamento || "—"] || 0) + Number(v.total || 0)));

    return {
      vendas, fin, faturamento, saidas, entradasExtras,
      ticket: vendas.length ? faturamento / vendas.length : 0,
      topProdutos: Object.values(porProduto).sort((a, b) => b.total - a.total).slice(0, 6),
      porPagamento: Object.entries(porPagamento).sort((a, b) => b[1] - a[1]),
    };
  }

  function barras(items, max) {
    if (!items.length) return UI.empty("fa-chart-simple", "Sem dados no período", "Registre vendas para gerar análises.");
    return `<ul class="bar-list">${items.map(([label, valor]) => `
      <li><div class="bar-list__top"><span>${Utils.escape(label)}</span><strong>${Utils.money(valor)}</strong></div>
      <div class="bar"><span style="width:${max ? (valor / max) * 100 : 0}%"></span></div></li>`).join("")}</ul>`;
  }

  function render() {
    const d = dados();
    const maxPag = Math.max(...d.porPagamento.map(([, v]) => v), 0);
    const lucro = d.faturamento + d.entradasExtras - d.saidas;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-cash-register"></i><div><strong>${Utils.money(d.faturamento)}</strong><small>Faturamento em vendas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-receipt"></i><div><strong>${Utils.money(d.ticket)}</strong><small>Ticket médio</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-scale-balanced"></i><div><strong>${Utils.money(lucro)}</strong><small>Resultado do período</small></div></div>
        </div>
        <select id="repPeriodo" style="max-width:170px; color: black;border-radius: 10px;">
          ${[7, 30, 90, 365].map((p) => `<option value="${p}" ${state.periodo === p ? "selected" : ""}>Últimos ${p} dias</option>`).join("")}
        </select>
        <button class="btn btn--primary" id="repCsv"><i class="fa-solid fa-file-csv"></i>Exportar CSV</button>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Produtos mais vendidos</h3><p>Por faturamento no período</p></div></div>
          <div class="card__body">
            ${d.topProdutos.length
              ? `<ul class="list">${d.topProdutos.map((p, i) => `
                <li class="list__item"><div><strong>${i + 1}. ${Utils.escape(p.nome)}</strong><small>${p.qtd} unidade(s)</small></div>
                <span class="badge badge--success">${Utils.money(p.total)}</span></li>`).join("")}</ul>`
              : UI.empty("fa-box-open", "Sem vendas no período", "Finalize vendas no PDV para alimentar o relatório.")}
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Formas de pagamento</h3><p>Distribuição do faturamento</p></div></div>
          <div class="card__body">${barras(d.porPagamento, maxPag)}</div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Resumo financeiro</h3><p>Período selecionado</p></div></div>
          <div class="card__body">
            <ul class="list">
              <li class="list__item"><div><strong>Vendas</strong><small>${d.vendas.length} venda(s)</small></div><span class="badge badge--success">${Utils.money(d.faturamento)}</span></li>
              <li class="list__item"><div><strong>Outras entradas</strong><small>Consertos, mensalidades e avulsos</small></div><span class="badge badge--success">${Utils.money(d.entradasExtras)}</span></li>
              <li class="list__item"><div><strong>Saídas</strong><small>Despesas lançadas</small></div><span class="badge badge--danger">${Utils.money(d.saidas)}</span></li>
              <li class="list__item"><div><strong>Resultado</strong><small>Entradas − saídas</small></div><span class="badge badge--${lucro >= 0 ? "success" : "danger"}">${Utils.money(lucro)}</span></li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Operação</h3><p>Indicadores gerais</p></div></div>
          <div class="card__body">
            <ul class="list">
              <li class="list__item"><div><strong>Clientes cadastrados</strong></div><span class="badge">${DB.clientes.count()}</span></li>
              <li class="list__item"><div><strong>Produtos no catálogo</strong></div><span class="badge">${DB.produtos.count()}</span></li>
              <li class="list__item"><div><strong>Ordens de conserto abertas</strong></div><span class="badge badge--warn">${DB.consertos.where((c) => c.status !== "Entregue").length}</span></li>
              <li class="list__item"><div><strong>Alunos matriculados</strong></div><span class="badge">${DB.alunos.count()}</span></li>
            </ul>
          </div>
        </div>
      </div>`;
  }

  function exportCsv() {
    const d = dados();
    const linhas = [["Tipo", "Descrição", "Categoria", "Valor", "Data"]];
    d.vendas.forEach((v) => linhas.push(["Venda", v.numero || "", v.cliente || "", String(v.total || 0).replace(".", ","), Utils.date(v.data)]));
    d.fin.forEach((f) => linhas.push([f.tipo === "entrada" ? "Entrada" : "Saída", f.descricao || "", f.categoria || "", String(f.valor || 0).replace(".", ","), Utils.date(f.data)]));
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `zk-relatorio-${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast("Relatório exportado em CSV.");
  }

  function mount() {
    UI.$("#repPeriodo").onchange = (e) => { state.periodo = Number(e.target.value); App.refresh(); };
    UI.$("#repCsv").onclick = exportCsv;
  }

  return { render, mount };
})();
