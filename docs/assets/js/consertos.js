/** consertos.js — Ordens de serviço de pranchas (CRUD + status + prazos) */

const Consertos = (() => {
  const STATUS = ["Recebida", "Em análise", "Aguardando aprovação", "Em conserto", "Pronta", "Entregue"];
  const state = { term: "", status: "", tab: "lista", page: 1, perPage: 8 };

  const cor = (s) =>
    s === "Entregue" ? "success" : s === "Pronta" ? "success" : s === "Aguardando aprovação" ? "warn" : s === "Em conserto" ? "info" : "";

  function filtered() {
    let list = DB.consertos.all().filter((c) => c.status !== "Entregue");
    if (state.status) list = list.filter((c) => c.status === state.status);
    return Utils.sort(Utils.search(list, state.term, ["numero", "cliente", "marca", "descricao"]), "criadoEm", "desc");
  }

  function prazoCell(c) {
    if (!c.prazo) return "—";
    const d = Utils.daysUntil(c.prazo);
    const finalizado = c.status === "Entregue" || c.status === "Pronta";
    const tag = finalizado ? "" : d < 0 ? `<span class="badge badge--danger">Atrasada</span>` : d === 0 ? `<span class="badge badge--warn">Hoje</span>` : `<span class="badge">${d} dia(s)</span>`;
    return `${Utils.date(c.prazo)}<br>${tag}`;
  }

  function render() {
    const all = DB.consertos.all();
    const ativos = all.filter((c) => c.status !== "Entregue");
    const historico = DB.consertosHistorico.all();
    const list = filtered();
    const pageList = Utils.paginate(list, state.page, state.perPage);
    const abertas = ativos.length;
    const atrasadas = ativos.filter((c) => c.status !== "Pronta" && Utils.daysUntil(c.prazo) < 0).length;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-screwdriver-wrench"></i><div><strong>${abertas}</strong><small>Ordens abertas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-clock"></i><div><strong>${atrasadas}</strong><small>Atrasadas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-check-double"></i><div><strong>${historico.length}</strong><small>Entregues</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnNovaOS"><i class="fa-solid fa-plus"></i>Nova ordem</button>
      </div>

      <div class="tabs">
        <button class="tab ${state.tab === "lista" ? "is-active" : ""}" data-ostab="lista">Consertos</button>
        <button class="tab ${state.tab === "historico" ? "is-active" : ""}" data-ostab="historico">Histórico</button>
      </div>

      ${state.tab === "historico" ? painelHistorico() : `
      <div class="card">
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="osSearch" type="search" placeholder="Buscar por OS, cliente ou marca..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="osStatus">
            <option value="">Todos os status</option>
            ${STATUS.filter((s) => s !== "Entregue").map((s) => `<option ${state.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>OS</th><th>Cliente</th><th>Prancha</th><th>Status</th><th>Prazo</th><th>Valor</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${pageList.length
                ? pageList.map((c) => `
                  <tr>
                    <td><strong>${Utils.escape(c.numero || "—")}</strong></td>
                    <td>${Utils.escape(c.cliente || "—")}</td>
                    <td>${Utils.escape(c.marca || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(c.descricao || "")}</small></td>
                    <td><span class="badge badge--${cor(c.status)}">${Utils.escape(c.status || "Recebida")}</span></td>
                    <td>${prazoCell(c)}</td>
                    <td>${Utils.money(c.valor)}</td>
<td><div class="row-actions">
                      <button class="icon-btn btn--sm" data-entregaros="${c.id}" data-tip="Marcar como entregue" style="width:32px;height:32px"><i class="fa-solid fa-check" style="color:var(--success)"></i></button>
                      <button class="icon-btn btn--sm" data-print="${c.id}" data-tip="Imprimir OS" style="width:32px;height:32px"><i class="fa-solid fa-print"></i></button>
                      <button class="icon-btn btn--sm" data-edit="${c.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
                      <button class="icon-btn btn--sm" data-del="${c.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
                    </div></td>

                  </tr>`).join("")
                : `<tr><td colspan="7">${UI.empty("fa-screwdriver-wrench", "Nenhuma ordem de serviço ativa", "Cadastre a primeira OS de conserto.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${list.length ? UI.pagination(list.length, state.page, state.perPage) : ""}
      </div>`}`;
  }

function painelHistorico() {
    const hist = Utils.sort(DB.consertosHistorico.all(), "dataEntrega", "desc");
    return `
      <div class="card">
        <div class="card__head"><div><h3>Histórico de consertos</h3><p>Serviços finalizados e entregues</p></div></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>OS</th><th>Cliente</th><th>Prancha</th><th>Serviço</th><th>Valor</th><th>Entrada</th><th>Entrega</th><th>Status</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${hist.length
                ? hist.map((h) => `
                  <tr>
                    <td><strong>${Utils.escape(h.numero || "—")}</strong></td>
                    <td>${Utils.escape(h.cliente || "—")}</td>
                    <td>${Utils.escape(h.marca || "—")}</td>
                    <td>${Utils.escape(h.descricao || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(h.obs || "")}</small></td>
                    <td>${Utils.money(h.valor)}</td>
                    <td>${Utils.date(h.dataEntrada || h.criadoEm)}</td>
                    <td>${Utils.date(h.dataEntrega)}</td>
                    <td><span class="badge badge--success">${Utils.escape(h.statusFinal || "Entregue")}</span></td>
                    <td><div class="row-actions">
                      <button class="icon-btn btn--sm" data-reabriros="${h.id}" data-tip="Reabrir ordem" style="width:32px;height:32px"><i class="fa-solid fa-rotate-left"></i></button>
                    </div></td>
                  </tr>`).join("")
                : `<tr><td colspan="9">${UI.empty("fa-clock-rotate-left", "Nenhum conserto no histórico", "Os serviços entregues aparecerão aqui.")}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function openForm(id) {
    const c = id ? DB.consertos.find(id) : {};
    const clientes = Utils.sort(DB.clientes.all(), "nome");
    const v = (k) => Utils.escape(c[k] ?? "");
    const anexos = { quadrantes: [...(c.quadrantes || [])], fotos: [...(c.fotos || [])] };

    UI.openModal({
      title: id ? `Editar ${c.numero || "ordem"}` : "Nova ordem de serviço",
      body: `
        <form id="osForm" class="form-grid">
          <div class="field"><label>Número da OS</label><input name="numero" value="${v("numero") || "OS-" + (1001 + DB.consertos.count())}" /></div>
          <div class="field"><label>Cliente *</label>
            <select name="cliente">
              <option value="">Selecione...</option>
              ${clientes.map((cl) => `<option ${c.cliente === cl.nome ? "selected" : ""}>${Utils.escape(cl.nome)}</option>`).join("")}
            </select>
            <span class="error" data-err="cliente"></span>
          </div>
          <div class="field"><label>Marca / modelo da prancha</label><input name="marca" value="${v("marca")}" placeholder="Ex.: Rusty 6'0&quot;" /></div>
          <div class="field"><label>Status</label>
            <select name="status">${STATUS.map((s) => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Prazo de entrega</label><input name="prazo" type="date" value="${v("prazo")}" /></div>
          <div class="field"><label>Valor do serviço</label><input name="valor" type="number" min="0" step="0.01" value="${c.valor ?? ""}" /></div>
<div class="field col-2"><label>Descrição do reparo</label><textarea name="descricao" placeholder="Quebra no bico, delaminação, troca de quilha...">${v("descricao")}</textarea></div>
          <div class="field col-2"><label>Observações</label><textarea name="obs" placeholder="Observações finais para o histórico...">${v("obs")}</textarea></div>

          <div class="field col-2"><label>Quadrantes da prancha — marque onde estão os danos</label>
            ${Anexos.quadrantes(anexos.quadrantes)}
          </div>

          <div class="field col-2"><label>Fotos da prancha</label>
            ${Anexos.fotos(anexos.fotos)}
          </div>
        </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="osSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    Anexos.mount(UI.$("#osForm"), anexos);

UI.$("#osSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#osForm")).entries());
      if (!d.cliente) { UI.$("#osForm .error").textContent = "Selecione um cliente."; return; }
      d.valor = Number(d.valor) || 0;
      d.obs = d.obs || "";
      d.quadrantes = anexos.quadrantes;
      d.fotos = anexos.fotos;
      UI.withLoading(() => {
        const antes = id ? DB.consertos.find(id)?.status : null;
        const saved = id ? DB.consertos.update(id, d) : DB.consertos.insert(d);

        // Finalização: lança entrada no Financeiro e move para o histórico
        if (d.status === "Entregue" && antes !== "Entregue") {
          if (d.valor > 0)
            DB.financeiro.insert({ tipo: "entrada", categoria: "Conserto", descricao: `${d.numero} — ${d.cliente}`, valor: d.valor, data: new Date().toISOString(), origem: "conserto", consertoId: saved.id });
          finalizarEArquivar(saved);
        }
        // Reabertura: remove a entrada financeira gerada na entrega
        if (antes === "Entregue" && d.status !== "Entregue") removerFinanceiro(saved);
        UI.closeModal();
        UI.toast(id ? "Ordem atualizada!" : "Ordem cadastrada!");
        App.refresh();
      });
    };
  }

  /** Move o conserto entregue para o histórico */
  function finalizarEArquivar(c) {
    const reg = {
      numero: c.numero,
      cliente: c.cliente,
      marca: c.marca,
      descricao: c.descricao,
      valor: c.valor,
      obs: c.obs,
      dataEntrada: c.criadoEm,
      dataEntrega: new Date().toISOString(),
      statusFinal: "Entregue",
      origemId: c.id,
    };
    DB.consertosHistorico.insert(reg);
    DB.consertos.remove(c.id);
  }

  /** Remove os lançamentos financeiros vinculados a uma OS (evita duplicidade) */
  function removerFinanceiro(c) {
    if (!c) return;
    DB.financeiro
      .where((f) => f.origem === "conserto" && (f.consertoId === c.id || (!f.consertoId && f.descricao === `${c.numero} — ${c.cliente}`)))
      .forEach((f) => DB.financeiro.remove(f.id));
  }

  /* ---------- Impressão ---------- */
  function imprimir(id) {
    const c = DB.consertos.find(id);
    if (!c) return;
    const s = DB.settings.get();
    const cli = DB.clientes.all().find((x) => x.nome === c.cliente) || {};

    Anexos.print(`OS ${c.numero || ""}`, `
      <div class="doc-head">
        <div><h1>${Utils.escape(s.empresa)}</h1><small>Oficina de pranchas — Ordem de serviço</small></div>
        <div class="doc-num"><small>Ordem de serviço</small><strong>${Utils.escape(c.numero || "—")}</strong>
          <small>Emitida em ${Utils.date(c.criadoEm || new Date().toISOString())}</small></div>
      </div>

      <div class="doc-sec"><h2>Cliente</h2>
        <div class="doc-grid">
          <div><small>Nome</small>${Utils.escape(c.cliente || "—")}</div>
          <div><small>Telefone</small>${Utils.escape(cli.telefone || "—")}</div>
          <div><small>E-mail</small>${Utils.escape(cli.email || "—")}</div>
        </div>
      </div>

      <div class="doc-sec"><h2>Prancha</h2>
        <div class="doc-grid">
          <div><small>Marca / modelo</small>${Utils.escape(c.marca || "—")}</div>
          <div><small>Status</small>${Utils.escape(c.status || "Recebida")}</div>
          <div><small>Prazo de entrega</small>${Utils.date(c.prazo)}</div>
        </div>
      </div>

      <div class="doc-sec"><h2>Descrição do reparo</h2>
        <div class="doc-box">${Utils.escape(c.descricao || "—")}</div>
      </div>

      <div class="doc-sec"><h2>Quadrantes marcados</h2>
        <div class="doc-box">${Utils.escape(Anexos.quadrantesTexto(c.quadrantes))}</div>
      </div>

      ${(c.fotos || []).length ? `<div class="doc-sec"><h2>Fotos anexadas</h2>
        <div class="doc-photos">${c.fotos.map((f, i) => `<img src="${f}" alt="Foto ${i + 1}" />`).join("")}</div></div>` : ""}

      <div class="doc-sec">
        <div class="doc-total"><span>Valor do serviço</span><span>${Utils.money(c.valor)}</span></div>
      </div>

      <div class="doc-sign">
        <div>Assinatura do cliente</div>
        <div>Assinatura ${Utils.escape(s.empresa)}</div>
      </div>
      <p class="doc-foot">Documento sem valor fiscal — comprovante de entrada/entrega de prancha.</p>
    `);
  }

function mount(root) {
    const btnNova = UI.$("#btnNovaOS");
    if (btnNova) btnNova.onclick = () => openForm();
    const busca = UI.$("#osSearch");
    if (busca) busca.addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; state.page = 1; App.refresh(true); }, 300));
    const filtro = UI.$("#osStatus");
    if (filtro) filtro.onchange = (e) => { state.status = e.target.value; state.page = 1; App.refresh(); };
    root.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-ostab]");
      if (tab) { state.tab = tab.dataset.ostab; state.page = 1; return App.refresh(); }
      const entregar = e.target.closest("[data-entregaros]");
      if (entregar) {
        const c = DB.consertos.find(entregar.dataset.entregaros);
        if (!c) return App.refresh();
        return UI.confirm({
          title: "Marcar como entregue",
          message: `Marcar a OS ${c.numero || ""} de ${c.cliente} como entregue? Isso lançará a entrada no Financeiro e moverá para o histórico.`,
          confirmText: "Entregar",
          onConfirm: () => UI.withLoading(() => {
            if (c.valor > 0)
              DB.financeiro.insert({ tipo: "entrada", categoria: "Conserto", descricao: `${c.numero} — ${c.cliente}`, valor: Number(c.valor) || 0, data: new Date().toISOString(), origem: "conserto", consertoId: c.id });
            finalizarEArquivar(c);
            UI.toast("OS entregue e lançada no Financeiro!", "success");
            App.refresh();
          }),
        });
      }
      const reabrir = e.target.closest("[data-reabriros]");
      if (reabrir) {
        const h = DB.consertosHistorico.find(reabrir.dataset.reabriros);
        if (!h) return App.refresh();
return UI.confirm({
          title: "Reabrir ordem",
          message: `Reabrir a OS ${h.numero || ""} de ${h.cliente} como ordem ativa? A entrada financeira correspondente será removida.`,
          confirmText: "Reabrir",
          tone: "danger",
          onConfirm: () => UI.withLoading(() => {
            removerFinanceiro({ id: h.origemId, numero: h.numero, cliente: h.cliente });
            DB.consertos.insert({
              numero: h.numero,
              cliente: h.cliente,
              marca: h.marca,
              descricao: h.descricao,
              valor: h.valor,
              obs: h.obs,
              status: "Pronta",
              prazo: h.vencimento || h.prazo,
            });
            DB.consertosHistorico.remove(h.id);
            UI.toast("Ordem reaberta.", "info");
            App.refresh();
          }),
        });
      }
      const pr = e.target.closest("[data-print]");
      if (pr) return imprimir(pr.dataset.print);
      const edit = e.target.closest("[data-edit]");
      if (edit) return openForm(edit.dataset.edit);
      const del = e.target.closest("[data-del]");
      if (del) return UI.confirm({
        message: "Excluir esta ordem de serviço? A entrada financeira gerada por ela também será removida.",
        tone: "danger",
        onConfirm: () => UI.withLoading(() => {
          removerFinanceiro(DB.consertos.find(del.dataset.del));
          DB.consertos.remove(del.dataset.del);
          UI.toast("Ordem excluída.", "info");
          App.refresh();
        }),
      });
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) { state.page = Number(nav.dataset.pageNav); App.refresh(); }
    });
  }


  return { render, mount, setTerm: (t) => { state.term = t; state.page = 1; } };
})();
