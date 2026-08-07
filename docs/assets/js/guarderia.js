/**
 * guarderia.js — Guarderia de pranchas (armazenamento por plano).
 *
 * Arquitetura: assinatura mensal recorrente.
 * - Cada mensalidade é um PERÍODO independente (um registro em DB.guarderias).
 * - Ao pagar um período: cria lançamento no Financeiro, move o período para
 *   o histórico (Pago) e cria automaticamente o próximo período pendente.
 * - Cada período tem seu próprio id (guarderiaId) e referência (mes/ano).
 * - O botão cancelar faz estorno completo do período pago mais recente,
 *   sem afetar períodos anteriores.
 */

const Guarderia = (() => {
  const PLANOS = [
    { nome: "Mensal", meses: 1, valor: 120 },
    { nome: "Trimestral", meses: 3, valor: 330 },
    { nome: "Semestral", meses: 6, valor: 600 },
    { nome: "Anual", meses: 12, valor: 1080 },
  ];
  const TIPOS = ["Prancha curta", "Prancha longa", "Stand Up Paddle", "Bodyboard", "Kitesurf"];

  const state = { term: "", filtro: "", tab: "lista", page: 1, perPage: 8 };

  const plano = (n) => PLANOS.find((p) => p.nome === n) || PLANOS[0];

  /** Calcula o vencimento a partir do início e do plano */
  function vencimento(inicio, nomePlano) {
    if (!inicio) return "";
    const d = new Date(inicio + "T00:00:00");
    d.setMonth(d.getMonth() + plano(nomePlano).meses);
    return d.toISOString().slice(0, 10);
  }

  /** Rótulo de referência do período (ex.: "Agosto/2025") */
  function referencia(dataIso) {
    if (!dataIso) return "—";
    const d = new Date(dataIso + (dataIso.length === 10 ? "T12:00:00" : ""));
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  /** Gera o primeiro dia do mês seguinte à data de referência */
  function proximoInicio(dataIso) {
    const d = dataIso ? new Date(dataIso + "T12:00:00") : new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }

/** Encontra o período ativo (não pago) de uma assinatura */
  function ativoDaAssinatura(assinaturaId) {
    return DB.guarderias.all().find((g) => g.assinaturaId === assinaturaId && !g.pago) || null;
  }

  /** Atribui assinaturaId/referencia a registros antigos (migração) */
  function normalizarAssinaturas() {
    const list = DB.guarderias.all();
    list.forEach((g) => {
      const patch = {};
      if (!g.assinaturaId) patch.assinaturaId = g.id;
      if (!g.referencia && g.inicio) patch.referencia = referencia(g.inicio);
      if (Object.keys(patch).length) DB.guarderias.update(g.id, patch);
    });
  }

  function situacao(g) {
    if (g.encerrado) return { label: "Encerrado", cor: "" };
    if (g.pago) return { label: "Pago", cor: "success" };
    const dias = Utils.daysUntil(g.vencimento);
    if (dias < 0) return { label: "Vencido", cor: "danger", dias };
    if (dias <= 7) return { label: "A vencer", cor: "warn", dias };
    return { label: "Ativo", cor: "success", dias };
  }

  function filtered() {
    let list = DB.guarderias.all();
    if (state.filtro) list = list.filter((g) => situacao(g).label === state.filtro);
    return Utils.sort(Utils.search(list, state.term, ["cliente", "prancha", "tipo", "vaga", "plano", "referencia"]), "vencimento", "asc");
  }

  /* ---------- Render ---------- */
  function render() {
    const all = DB.guarderias.all();
    const list = filtered();
    const pageList = Utils.paginate(list, state.page, state.perPage);
    const ativos = all.filter((g) => !g.encerrado);
    const vencidos = ativos.filter((g) => situacao(g).label === "Vencido");
    const receita = ativos.reduce((s, g) => s + (Number(g.valor) || 0), 0);

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-warehouse"></i><div><strong>${ativos.length}</strong><small>Períodos ativos</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>${vencidos.length}</strong><small>Vencidos</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-sack-dollar"></i><div><strong>${Utils.money(receita)}</strong><small>Receita contratada</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnNovaGD"><i class="fa-solid fa-plus"></i>Nova assinatura</button>
      </div>

      <div class="tabs">
        <button class="tab ${state.tab === "lista" ? "is-active" : ""}" data-gdtab="lista">Assinaturas</button>
        <button class="tab ${state.tab === "historico" ? "is-active" : ""}" data-gdtab="historico">Histórico de pagamentos</button>
        <button class="tab ${state.tab === "planos" ? "is-active" : ""}" data-gdtab="planos">Planos</button>
      </div>

      ${state.tab === "planos" ? painelPlanos(all) : state.tab === "historico" ? painelHistorico() : `
      <div class="card">
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="gdSearch" type="search" placeholder="Buscar por cliente, prancha ou vaga..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="gdFiltro">
            <option value="">Todas as situações</option>
            ${["Ativo", "A vencer", "Vencido", "Pago", "Encerrado"].map((s) => `<option ${state.filtro === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th>Prancha</th><th>Vaga</th><th>Plano</th><th>Referência</th><th>Vencimento</th><th>Valor</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${pageList.length
                ? pageList.map((g) => {
                    const st = situacao(g);
                    return `
                  <tr>
                    <td><strong>${Utils.escape(g.cliente || "—")}</strong>${g.pago ? "" : `<br><small style="color:var(--text-muted)">${Utils.escape(g.referencia || "")}</small>`}</td>
                    <td>${Utils.escape(g.prancha || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(g.tipo || "")}</small></td>
                    <td><span class="badge">${Utils.escape(g.vaga || "—")}</span></td>
                    <td>${Utils.escape(g.plano || "—")}</td>
                    <td>${Utils.escape(g.referencia || "—")}</td>
                    <td>${Utils.date(g.vencimento)}<br><span class="badge badge--${st.cor}">${st.label}</span></td>
                    <td>${Utils.money(g.valor)}<br>${g.pago? `<span class="badge badge--success">Pago</span>`: `<span class="badge badge--danger">Pendente</span>`}</td>
                    <td><div class="row-actions">
                    <button
                    class="icon-btn btn--sm"
                    data-gdpag="${g.id}"
                    data-tip="${g.pago ? "Cancelar pagamento" : "Marcar como pago"}"
                    style="width:32px;height:32px">
<i class="fa-solid ${g.pago ? "fa-xmark" : "fa-check"}"></i>
                    </button>
                      <button class="icon-btn btn--sm" data-gdedit="${g.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
                      <button class="icon-btn btn--sm" data-gddel="${g.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                  </tr>`;
                  }).join("")
                : `<tr><td colspan="8">${UI.empty("fa-warehouse", "Nenhuma assinatura de guarderia", "Cadastre a primeira assinatura de armazenamento.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${list.length ? UI.pagination(list.length, state.page, state.perPage) : ""}
      </div>`}`;
  }

function painelHistorico() {
    const hist = Utils.sort(DB.guarderiaHistorico.all(), "dataPagamento", "desc");
    return `
      <div class="card">
        <div class="card__head"><div><h3>Histórico de pagamentos</h3><p>Períodos pagos e devidamente vinculados ao Financeiro</p></div></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Cliente</th><th>Referência</th><th>Plano</th><th>Valor</th><th>Pago em</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${hist.length
                ? hist.map((h, i) => `
                  <tr>
                    <td><strong>${Utils.escape(h.cliente || "—")}</strong></td>
                    <td>${Utils.escape(h.referencia || "—")}</td>
                    <td>${Utils.escape(h.plano || "—")}</td>
                    <td>${Utils.money(h.valor)}</td>
                    <td>${Utils.date(h.dataPagamento)}</td>
                    <td><div class="row-actions">
                      ${i === 0
                        ? `<button class="icon-btn btn--sm" data-gdest="${h.id}" data-tip="Cancelar" style="width:32px;height:32px"><i class="fa-solid fa-rotate-left"></i></button>`
                        : `<span style="color:var(--text-muted);font-size:11px">—</span>`}
                    </div></td>
                  </tr>`).join("")
                : `<tr><td colspan="6">${UI.empty("fa-receipt", "Nenhum pagamento", "Os pagamentos confirmados aparecerão aqui.")}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function painelPlanos(all) {
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Planos disponíveis</h3><p>Valores sugeridos por período</p></div></div>
          <div class="card__body">
            <ul class="list">
              ${PLANOS.map((p) => {
                const qtd = all.filter((g) => g.plano === p.nome && !g.encerrado).length;
                return `<li class="list__item">
                  <div><strong>${p.nome}</strong><small>${p.meses} ${p.meses === 1 ? "mês" : "meses"} — ${Utils.money(p.valor)}</small></div>
                  <span class="badge">${qtd} período(s)</span>
                </li>`;
              }).join("")}
            </ul>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><div><h3>Vencimentos próximos</h3><p>Períodos que expiram em até 15 dias</p></div></div>
          <div class="card__body">
            <ul class="list">
              ${(() => {
                const prox = all.filter((g) => !g.encerrado && !g.pago && Utils.daysUntil(g.vencimento) <= 15).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));
                return prox.length
                  ? prox.map((g) => {
                      const st = situacao(g);
                      return `<li class="list__item"><div><strong>${Utils.escape(g.cliente)}</strong><small>${Utils.escape(g.referencia || "")} — ${Utils.date(g.vencimento)}</small></div><span class="badge badge--${st.cor}">${st.label}</span></li>`;
                    }).join("")
                  : `<li>${UI.empty("fa-calendar-check", "Tudo em dia", "Nenhum vencimento nos próximos 15 dias.")}</li>`;
              })()}
            </ul>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Financeiro ---------- */
  function lancar(g, obs) {
    if (!(Number(g.valor) > 0)) return;
    DB.financeiro.insert({
      tipo: "entrada",
      categoria: "Guarderia",
      descricao: `${obs} — ${g.cliente} (${g.referencia || ""})`,
      valor: Number(g.valor),
      data: new Date().toISOString(),
      origem: "guarderia",
      guarderiaId: g.id,
      assinaturaId: g.assinaturaId,
      referencia: g.referencia,
      periodoInicio: g.inicio,
      periodoFim: g.vencimento,
    });
  }

  function removerFinanceiro(g) {
    if (!g) return;
    DB.financeiro.where((f) => f.origem === "guarderia" && f.guarderiaId === g.id)
      .forEach((f) => DB.financeiro.remove(f.id));
  }

  /* ---------- Núcleo da assinatura recorrente ---------- */

  /** Cria/avança o período pendente de uma assinatura */
  function criarProximoPeriodo(assinaturaBase, inicio) {
    const novoInicio = inicio || proximoInicio(assinaturaBase.inicio);
    return DB.guarderias.insert({
      assinaturaId: assinaturaBase.assinaturaId,
      cliente: assinaturaBase.cliente,
      prancha: assinaturaBase.prancha,
      vaga: assinaturaBase.vaga,
      tipo: assinaturaBase.tipo,
      plano: assinaturaBase.plano,
      inicio: novoInicio,
      vencimento: vencimento(novoInicio, assinaturaBase.plano),
      referencia: referencia(novoInicio),
      valor: assinaturaBase.valor,
      obs: assinaturaBase.obs,
      encerrado: false,
      pago: false,
      dataPagamento: null,
    });
  }

  /** Pagar o período ativo: lança no Financeiro, arquiva como pago e cria o próximo */
  function pagar(g) {
    // 1) Movimenta para o histórico como Pago
    const { id, ...dados } = g;
    const pagoReg = {
      ...dados,
      guarderiaId: g.id,
      assinaturaId: g.assinaturaId,
      referencia: g.referencia,
      plano: g.plano,
      valor: g.valor,
      dataPagamento: new Date().toISOString(),
      status: "Pago",
    };
    DB.guarderiaHistorico.insert(pagoReg);

    // 2) Lança no Financeiro vinculado ao período atual
    lancar(g, `Guarderia ${g.plano}`);

    // 3) Remove o período ativo (já pago)
    DB.guarderias.remove(g.id);

    // 4) Cria o próximo período pendente (independente, novo id)
    criarProximoPeriodo(g, null);
  }

/** Estorna um pagamento a partir do registro do histórico */
  function estornarPorHistorico(hist) {
    const assinaturaId = hist.assinaturaId;

    // 1) Remove o período pendente que existir para a assinatura (auto-gerado)
    const pendente = ativoDaAssinatura(assinaturaId);
    if (pendente) DB.guarderias.remove(pendente.id);

    // 2) Remove lançamento financeiro do período pago (somente o dele)
    removerFinanceiro({ id: hist.guarderiaId, assinaturaId });

    // 3) Remove registro do histórico
    DB.guarderiaHistorico.remove(hist.id);

    // 4) Reinstala o período pago de volta como ativo/pendente
    DB.guarderias.insert({
      assinaturaId,
      cliente: hist.cliente,
      prancha: hist.prancha,
      vaga: hist.vaga,
      tipo: hist.tipo,
      plano: hist.plano,
      inicio: hist.inicio,
      vencimento: hist.vencimento,
      referencia: hist.referencia,
      valor: hist.valor,
      obs: hist.obs,
      encerrado: false,
      pago: false,
      dataPagamento: null,
    });

    UI.toast("Pagamento cancelado e período restaurado como pendente.", "info");
  }

  /** Estorna o pagamento do período pago mais recente da assinatura */
  function estornar(g) {
    const hist = DB.guarderiaHistorico.where((h) => h.assinaturaId === g.assinaturaId)
      .sort((a, b) => new Date(b.dataPagamento) - new Date(a.dataPagamento));

    if (!hist.length) {
      UI.toast("Nenhum pagamento registrado para estornar.", "info");
      return;
    }

    const pago = hist[0];

    // 1) Remove o período pendente que foi auto-gerado após o pagamento
    const pendente = ativoDaAssinatura(g.assinaturaId);
    if (pendente) DB.guarderias.remove(pendente.id);

    // 2) Remove lançamento financeiro do período pago (somente o dele)
    removerFinanceiro({ id: pago.guarderiaId, assinaturaId: g.assinaturaId });

    // 3) Remove registro do histórico
    DB.guarderiaHistorico.remove(pago.id);

    // 4) Reinstala o período pago de volta como ativo/pendente
    DB.guarderias.insert({
      assinaturaId: g.assinaturaId,
      cliente: pago.cliente,
      prancha: pago.prancha,
      vaga: pago.vaga,
      tipo: pago.tipo,
      plano: pago.plano,
      inicio: pago.inicio,
      vencimento: pago.vencimento,
      referencia: pago.referencia,
      valor: pago.valor,
      obs: pago.obs,
      encerrado: false,
      pago: false,
      dataPagamento: null,
    });

    UI.toast("Pagamento cancelado e período restaurado como pendente.", "info");
  }

  /* ---------- Formulário ---------- */
  function openForm(id) {
    const g = id ? DB.guarderias.find(id) : {};
    const clientes = Utils.sort(DB.clientes.all(), "nome");
    const v = (k) => Utils.escape(g[k] ?? "");
    const hoje = new Date().toISOString().slice(0, 10);

    UI.openModal({
      title: id ? "Editar período" : "Nova assinatura de guarderia",
      body: `
        <form id="gdForm" class="form-grid">
          <div class="field"><label>Cliente *</label>
            <select name="cliente">
              <option value="">Selecione...</option>
              ${clientes.map((cl) => `<option ${g.cliente === cl.nome ? "selected" : ""}>${Utils.escape(cl.nome)}</option>`).join("")}
            </select>
            <span class="error" data-err="cliente"></span>
          </div>
          <div class="field"><label>Vaga / posição</label><input name="vaga" value="${v("vaga")}" placeholder="Ex.: A-12" /></div>
          <div class="field"><label>Prancha</label><input name="prancha" value="${v("prancha")}" placeholder="Marca e medidas" /></div>
          <div class="field"><label>Tipo</label><select name="tipo">${TIPOS.map((t) => `<option ${g.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div class="field"><label>Plano</label>
            <select name="plano" id="gdPlano">${PLANOS.map((p) => `<option ${g.plano === p.nome ? "selected" : ""}>${p.nome}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Início</label><input name="inicio" id="gdInicio" type="date" value="${v("inicio") || hoje}" /></div>
          <div class="field"><label>Vencimento</label><input name="vencimento" id="gdVenc" type="date" value="${v("vencimento")}" readonly /></div>
          <div class="field"><label>Valor</label><input name="valor" id="gdValor" type="number" min="0" step="0.01" value="${g.valor ?? ""}" /></div>
          <div class="field col-2"><label>Observações</label><textarea name="obs" placeholder="Acessórios entregues, estado da prancha...">${v("obs")}</textarea></div>
          <div class="field col-2"><label class="check"><input type="checkbox" name="encerrado" ${g.encerrado ? "checked" : ""} /> Contrato encerrado</label></div>
        </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="gdSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    const sync = () => {
      const p = UI.$("#gdPlano").value, ini = UI.$("#gdInicio").value;
      UI.$("#gdVenc").value = vencimento(ini, p);
      if (!id || !UI.$("#gdValor").value) UI.$("#gdValor").value = plano(p).valor;
    };
    UI.$("#gdPlano").onchange = sync;
    UI.$("#gdInicio").onchange = sync;
    if (!g.vencimento) sync();

    UI.$("#gdSave").onclick = () => {
      const form = UI.$("#gdForm");
      const d = Object.fromEntries(new FormData(form).entries());
      if (!d.cliente) { form.querySelector(".error").textContent = "Selecione um cliente."; return; }
      d.valor = Number(d.valor) || 0;
      d.encerrado = form.querySelector("[name=encerrado]").checked;
      d.vencimento = d.vencimento || vencimento(d.inicio, d.plano);
      d.referencia = referencia(d.inicio);

      UI.withLoading(() => {
        if (id) {
          DB.guarderias.update(id, d);
          UI.toast("Período atualizado!");
        } else {
          // Nova assinatura: cria o período inicial pendente
          const assinaturaId = DB.uid();
          DB.guarderias.insert({ ...d, assinaturaId, pago: false, dataPagamento: null });
          UI.toast("Assinatura cadastrada!");
        }
        UI.closeModal();
        App.refresh();
      });
    };
  }

  /* ---------- Mount ---------- */
  function mount(root) {
    UI.$("#btnNovaGD").onclick = () => openForm();
    const busca = UI.$("#gdSearch");
    if (busca) busca.addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; state.page = 1; App.refresh(true); }, 300));
    const filtro = UI.$("#gdFiltro");
    if (filtro) filtro.onchange = (e) => { state.filtro = e.target.value; state.page = 1; App.refresh(); };

root.addEventListener("click", (e) => {
      normalizarAssinaturas();
      const tab = e.target.closest("[data-gdtab]");
      if (tab) { state.tab = tab.dataset.gdtab; return App.refresh(); }
      const gdest = e.target.closest("[data-gdest]");
      if (gdest) {
        const hist = DB.guarderiaHistorico.find(gdest.dataset.gdest);
        if (!hist) return App.refresh();
return UI.confirm({
          title: "Cancelar pagamento",
          confirmText: "Cancelar pagamento",
          tone: "danger",
          message: `Cancelar o pagamento de ${hist.cliente} (${hist.referencia || ""})? A transação no Financeiro será removida e o período voltará como pendente.`,
          onConfirm: () => UI.withLoading(() => {
            estornarPorHistorico(hist);
            App.refresh();
          }),
        });
      }
const pag = e.target.closest("[data-gdpag]");
      if (pag) {
        const g = DB.guarderias.find(pag.dataset.gdpag);
        if (!g) return App.refresh();
        if (!g.pago) {
          UI.withLoading(() => {
            pagar(g);
            UI.toast("Pagamento confirmado! Próximo período criado.", "success");
            App.refresh();
          });
        } else {
          UI.withLoading(() => {
            estornar(g);
            App.refresh();
          });
        }
        return;
      }
      const ed = e.target.closest("[data-gdedit]");
      if (ed) return openForm(ed.dataset.gdedit);
const del = e.target.closest("[data-gddel]");
      if (del) return UI.confirm({
        message: "Excluir este período? Os lançamentos financeiros vinculados também serão removidos.",
        tone: "danger",
        onConfirm: () => UI.withLoading(() => {
          removerFinanceiro(DB.guarderias.find(del.dataset.gddel));
          DB.guarderias.remove(del.dataset.gddel);
          UI.toast("Período excluído.", "info");
          App.refresh();
        }),
      });
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) { state.page = Number(nav.dataset.pageNav); App.refresh(); }
    });
  }

  return { render, mount, setTerm: (t) => { state.term = t; state.page = 1; } };
})();
