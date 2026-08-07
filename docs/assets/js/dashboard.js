/** dashboard.js — visão geral com KPIs, gráficos simulados (CSS) e listas */

const Dashboard = (() => {
  const STATUS_ANDAMENTO = ["Recebida", "Em análise", "Aguardando aprovação", "Em conserto"];

  function metrics() {
    const cfg = DB.settings.get();
    const produtos = DB.produtos.all();
    const vendas = DB.vendas.all();
    const consertos = DB.consertos.all();
    const fin = DB.financeiro.all();

    const vendasHoje = vendas.filter((v) => Utils.isSameDay(v.data));
    const lucroDia =
      vendasHoje.reduce((s, v) => s + (v.total || 0), 0) +
      fin.filter((f) => f.tipo === "entrada" && Utils.isSameDay(f.data)).reduce((s, f) => s + f.valor, 0) -
      fin.filter((f) => f.tipo === "saida" && Utils.isSameDay(f.data)).reduce((s, f) => s + f.valor, 0);

    const lucroMes =
      vendas.filter((v) => Utils.isSameMonth(v.data)).reduce((s, v) => s + (v.total || 0), 0) +
      fin.filter((f) => f.tipo === "entrada" && Utils.isSameMonth(f.data)).reduce((s, f) => s + f.valor, 0) -
      fin.filter((f) => f.tipo === "saida" && Utils.isSameMonth(f.data)).reduce((s, f) => s + f.valor, 0);

const confeccoes = DB.confeccoes.all();
    const confeccoesHist = DB.confeccoesHistorico.all();
    const guarderiaHist = DB.guarderiaHistorico.all();

    const confeccoesAtivas = confeccoes.filter((c) => c.status !== "Entregue");
    const guarderiaAtivos = DB.guarderias.all().filter((g) => !g.encerrado);

    return {
      clientes: DB.clientes.count(),
      produtos: produtos.length,
      estoqueBaixo: produtos.filter((p) => Number(p.quantidade) <= (cfg.estoqueMinimo ?? 5)).length,
      vendasHoje: vendasHoje.length,
      totalVendasHoje: vendasHoje.reduce((s, v) => s + (v.total || 0), 0),
      andamento: consertos.filter((c) => STATUS_ANDAMENTO.includes(c.status)).length,
      atrasados: consertos.filter(
        (c) => STATUS_ANDAMENTO.includes(c.status) && Utils.daysUntil(c.prazo) < 0
      ).length,
      prontos: consertos.filter((c) => c.status === "Pronta").length,
      aulas: DB.turmas.count(),
      lucroDia,
      lucroMes,

      // Confecção
      confeccoesAndamento: confeccoesAtivas.length,
      confeccoesAtrasadas: confeccoesAtivas.filter(
        (c) => c.status !== "Pronta" && Utils.daysUntil(c.prazo) < 0
      ).length,
      confeccoesProntas: confeccoes.filter((c) => c.status === "Pronta").length,
      confeccoesFaturado: confeccoesHist.reduce((s, c) => s + (Number(c.valor) || 0), 0),

      // Guarderia
      guarderiaAtivos: guarderiaAtivos.length,
      guarderiaVencidos: guarderiaAtivos.filter(
        (g) => !g.pago && Utils.daysUntil(g.vencimento) < 0
      ).length,
      guarderiaReceita: guarderiaAtivos.reduce((s, g) => s + (Number(g.valor) || 0), 0),
      guarderiaPagos: guarderiaHist.length,
      guarderiaRecebido: guarderiaHist.reduce((s, g) => s + (Number(g.valor) || 0), 0),
    };
  }

  const kpi = (mod, icon, label, value, foot) => `
    <article class="kpi ${mod}">
      <div class="kpi__top">
        <div class="kpi__icon"><i class="fa-solid ${icon}"></i></div>
        <div class="kpi__label">${label}</div>
      </div>
      <div class="kpi__value">${value}</div>
      <div class="kpi__foot">${foot}</div>
    </article>`;

  /** Gráfico de barras simulado: faturamento dos últimos 7 dias */
  function chartVendas() {
    const vendas = DB.vendas.all();
    const dias = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const total = vendas
        .filter((v) => Utils.isSameDay(v.data, d))
        .reduce((s, v) => s + (v.total || 0), 0);
      return { label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), total };
    });
    const max = Math.max(...dias.map((d) => d.total), 1);
    return `
      <div class="chart-bars">
        ${dias
          .map(
            (d, i) => `
          <div class="bar-col">
            <div class="bar" style="height:${(d.total / max) * 100}%;animation-delay:${i * 60}ms"
                 data-value="${Utils.money(d.total)}"></div>
            <span class="bar-label">${d.label}</span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  /** Donut simulado com conic-gradient: consertos por status */
  function chartConsertos() {
    const consertos = DB.consertos.all();
    const grupos = [
      { label: "Em conserto", cor: "#0e6ba8", n: consertos.filter((c) => c.status === "Em conserto").length },
      { label: "Aguardando", cor: "#e8961d", n: consertos.filter((c) => ["Recebida", "Em análise", "Aguardando aprovação"].includes(c.status)).length },
      { label: "Prontas", cor: "#14b8a6", n: consertos.filter((c) => c.status === "Pronta").length },
      { label: "Entregues", cor: "#17a06b", n: consertos.filter((c) => c.status === "Entregue").length },
    ];
    const total = grupos.reduce((s, g) => s + g.n, 0);
    let acc = 0;
    const stops = total
      ? grupos
          .map((g) => {
            const start = (acc / total) * 100;
            acc += g.n;
            return `${g.cor} ${start}% ${(acc / total) * 100}%`;
          })
          .join(",")
      : "var(--border) 0% 100%";

    return `
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops})">
          <div class="donut__center"><div><strong>${total}</strong><span>ordens</span></div></div>
        </div>
        <div class="legend">
          ${grupos
            .map(
              (g) => `<div><span class="dot" style="background:${g.cor}"></span>${g.label}<span class="val">${g.n}</span></div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  /** Donut simulado: confecções por status */
  function chartConfeccoes() {
    const confeccoes = DB.confeccoes.all();
    const grupos = [
      { label: "Em produção", cor: "#0e6ba8", n: confeccoes.filter((c) => c.status !== "Entregue" && c.status !== "Pronta").length },
      { label: "Prontas", cor: "#14b8a6", n: confeccoes.filter((c) => c.status === "Pronta").length },
      { label: "Entregues", cor: "#17a06b", n: confeccoes.filter((c) => c.status === "Entregue").length },
    ];
    const total = grupos.reduce((s, g) => s + g.n, 0);
    let acc = 0;
    const stops = total
      ? grupos
          .map((g) => {
            const start = (acc / total) * 100;
            acc += g.n;
            return `${g.cor} ${start}% ${(acc / total) * 100}%`;
          })
          .join(",")
      : "var(--border) 0% 100%";

    return `
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops})">
          <div class="donut__center"><div><strong>${total}</strong><span>confecções</span></div></div>
        </div>
        <div class="legend">
          ${grupos
            .map(
              (g) => `<div><span class="dot" style="background:${g.cor}"></span>${g.label}<span class="val">${g.n}</span></div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  /** Lista de confecções com prazo mais próximo */
  function prazosConfeccoes() {
    const lista = DB.confeccoes
      .where((c) => c.status !== "Entregue" && c.prazo)
      .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
      .slice(0, 5);
    if (!lista.length) return UI.empty("fa-hammer", "Nenhuma confecção ativa", "As encomendas aparecerão aqui.");
    return `<div class="mini-list">
      ${lista
        .map((c) => {
          const d = Utils.daysUntil(c.prazo);
          const badge = d < 0
            ? `<span class="badge badge--danger">Atrasada ${Math.abs(d)}d</span>`
            : d === 0
            ? `<span class="badge badge--warn">Vence hoje</span>`
            : `<span class="badge badge--info">Em ${d}d</span>`;
          return `<div class="mini-list__item">
            <div class="ico"><i class="fa-solid fa-hammer"></i></div>
            <div><strong>${Utils.escape(c.cliente || "Cliente")}</strong><small>${c.numero} · ${Utils.escape(c.modelo || "—")}</small></div>
            <div class="right">${badge}</div>
          </div>`;
        })
        .join("")}
    </div>`;
  }

  /** Lista de pagamentos mais recentes da guarderia */
  function pagamentosGuarderia() {
    const lista = Utils.sort(DB.guarderiaHistorico.all(), "dataPagamento", "desc").slice(0, 5);
    if (!lista.length) return UI.empty("fa-warehouse", "Sem pagamentos", "Os pagamentos da guarderia aparecerão aqui.");
    return `<div class="mini-list">
      ${lista
        .map((g) => `
          <div class="mini-list__item">
            <div class="ico"><i class="fa-solid fa-warehouse"></i></div>
            <div><strong>${Utils.escape(g.cliente || "Cliente")}</strong><small>${Utils.escape(g.referencia || "—")} · ${Utils.escape(g.plano || "—")}</small></div>
            <div class="right"><strong style="color:var(--success)">${Utils.money(g.valor)}</strong></div>
          </div>`)
        .join("")}
    </div>`;
  }

  function topProdutos() {
    const produtos = Utils.sort(DB.produtos.all(), "quantidade", "asc").slice(0, 5);
    if (!produtos.length) return UI.empty("fa-box-open", "Sem produtos", "Cadastre produtos para acompanhar o estoque.");
    const max = Math.max(...produtos.map((p) => Number(p.quantidade) || 0), 10);
    return `<div class="progress-list">
      ${produtos
        .map(
          (p) => `<div class="progress-item">
            <span><b>${Utils.escape(p.nome)}</b><em style="font-style:normal;color:var(--text-muted)">${p.quantidade} un.</em></span>
            <div class="progress-track"><div class="progress-fill" style="width:${((p.quantidade || 0) / max) * 100}%"></div></div>
          </div>`
        )
        .join("")}
    </div>`;
  }

  function proximosPrazos() {
    const lista = DB.consertos
      .where((c) => STATUS_ANDAMENTO.includes(c.status) && c.prazo)
      .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
      .slice(0, 5);
    if (!lista.length) return UI.empty("fa-screwdriver-wrench", "Nenhum conserto ativo", "As ordens de serviço aparecerão aqui.");
    return `<div class="mini-list">
      ${lista
        .map((c) => {
          const d = Utils.daysUntil(c.prazo);
          const badge = d < 0
            ? `<span class="badge badge--danger">Atrasado ${Math.abs(d)}d</span>`
            : d === 0
            ? `<span class="badge badge--warn">Vence hoje</span>`
            : `<span class="badge badge--info">Em ${d}d</span>`;
          return `<div class="mini-list__item">
            <div class="ico"><i class="fa-solid fa-water"></i></div>
            <div><strong>${Utils.escape(c.cliente || "Cliente")}</strong><small>OS ${c.numero} · ${Utils.escape(c.marca || "—")}</small></div>
            <div class="right">${badge}</div>
          </div>`;
        })
        .join("")}
    </div>`;
  }

  function render() {
    const m = metrics();
    return `
      <section class="kpi-grid">
        ${kpi("", "fa-users", "Clientes cadastrados", m.clientes, "Base ativa da loja")}
        ${kpi("kpi--accent", "fa-box-open", "Produtos cadastrados", m.produtos, "Catálogo completo")}
        ${kpi("kpi--warn", "fa-triangle-exclamation", "Estoque baixo", m.estoqueBaixo, "Precisam de reposição")}
        ${kpi("kpi--success", "fa-cart-shopping", "Vendas do dia", m.vendasHoje, Utils.money(m.totalVendasHoje))}
        ${kpi("", "fa-screwdriver-wrench", "Consertos em andamento", m.andamento, "Oficina")}
        ${kpi("kpi--danger", "fa-clock", "Consertos atrasados", m.atrasados, "Prazo vencido")}
        ${kpi("kpi--accent", "fa-circle-check", "Consertos prontos", m.prontos, "Aguardando retirada")}
${kpi("", "fa-person-swimming", "Próximas aulas", m.aulas, "Turmas programadas")}
        ${kpi("kpi--success", "fa-sack-dollar", "Lucro do dia", Utils.money(m.lucroDia), "Entradas − saídas")}
        ${kpi("kpi--success", "fa-chart-line", "Lucro do mês", Utils.money(m.lucroMes), "Acumulado mensal")}
        ${kpi("kpi--accent", "fa-hammer", "Confecções em andamento", m.confeccoesAndamento, "Produções ativas")}
        ${kpi("kpi--danger", "fa-hourglass-end", "Confecções atrasadas", m.confeccoesAtrasadas, "Prazo vencido")}
        ${kpi("kpi--success", "fa-circle-check", "Confecções prontas", m.confeccoesProntas, "Aguardando entrega")}
        ${kpi("kpi--success", "fa-sack-dollar", "Faturado (confecção)", Utils.money(m.confeccoesFaturado), "Confecções entregues")}
        ${kpi("kpi--accent", "fa-warehouse", "Períodos ativos", m.guarderiaAtivos, "Contratos de guarderia")}
        ${kpi("kpi--danger", "fa-clock", "Guarderias vencidas", m.guarderiaVencidos, "Mensalidades em atraso")}
        ${kpi("kpi--warn", "fa-hand-holding-dollar", "Receita contratada", Utils.money(m.guarderiaReceita), "Mensalidades a receber")}
        ${kpi("kpi--success", "fa-circle-dollar-to-slot", "Receita recebida", Utils.money(m.guarderiaRecebido), "Pagamentos de guarderia")}
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Faturamento — últimos 7 dias</h3><p>Vendas registradas no sistema</p></div></div>
          <div class="card__body">${chartVendas()}</div>
        </div>
        <div class="card">
          <div class="card__head"><div><h3>Consertos por status</h3><p>Distribuição das ordens</p></div></div>
          <div class="card__body">${chartConsertos()}</div>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Confecção por status</h3><p>Distribuição das encomendas</p></div></div>
          <div class="card__body">${chartConfeccoes()}</div>
        </div>
        <div class="card">
          <div class="card__head"><div><h3>Pagamentos recebidos — Guarderia</h3><p>Períodos pagos mais recentes</p></div></div>
          <div class="card__body">${pagamentosGuarderia()}</div>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Prazos de entrega</h3><p>Ordens mais próximas do vencimento</p></div></div>
          <div class="card__body">${proximosPrazos()}</div>
        </div>
        <div class="card">
          <div class="card__head"><div><h3>Menores estoques</h3><p>Prioridade de reposição</p></div></div>
          <div class="card__body">${topProdutos()}</div>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Prazos de confecção</h3><p>Encomendas mais próximas do vencimento</p></div></div>
          <div class="card__body">${prazosConfeccoes()}</div>
        </div>
      </section>`;
  }

  return { render, mount: () => {} };
})();
