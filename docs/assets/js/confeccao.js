/**
 * confeccao.js — Confecção de pranchas sob encomenda.
 * Segue o mesmo padrão do módulo Consertos: listagem, busca, filtros, paginação,
 * CRUD, histórico de status, relatório e integração financeira na entrega.
 */

const Confeccao = (() => {
  const STATUS = ["Recebida", "Em produção", "Pintura", "Acabamento", "Pronta", "Entregue"];
  const MODELOS = ["Shortboard", "Fish", "Funboard", "Longboard", "Evolution", "Mini Simmons", "Gun", "Sob medida"];
  const QUILHAS = ["Thruster (3)", "Quad (4)", "Twin (2)", "Single", "2+1", "Five (5)"];
  const RABETAS = ["Squash", "Round", "Round pin", "Pin", "Swallow", "Diamond", "Bat tail"];
  const BICOS = ["Pointed", "Round", "Hipster", "Nose larga"];

  const state = { term: "", status: "", tab: "lista", page: 1, perPage: 8 };

  const cor = (s) =>
    s === "Entregue" || s === "Pronta" ? "success" : s === "Pintura" || s === "Acabamento" ? "info" : s === "Em produção" ? "warn" : "";

  /** Numeração automática CF-000001 */
  function proximoNumero() {
    const nums = DB.confeccoes.all()
      .map((c) => Number(String(c.numero || "").replace(/\D/g, "")) || 0);
    return "CF-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(6, "0");
  }

function filtered() {
    let list = DB.confeccoes.all().filter((c) => c.status !== "Entregue");
    if (state.status) list = list.filter((c) => c.status === state.status);
    return Utils.sort(Utils.search(list, state.term, ["numero", "cliente", "modelo", "medidas", "descricao"]), "criadoEm", "desc");
  }

  function prazoCell(c) {
    if (!c.prazo) return "—";
    const d = Utils.daysUntil(c.prazo);
    const fim = c.status === "Entregue" || c.status === "Pronta";
    const tag = fim ? "" : d < 0 ? `<span class="badge badge--danger">Atrasada</span>` : d === 0 ? `<span class="badge badge--warn">Hoje</span>` : `<span class="badge">${d} dia(s)</span>`;
    return `${Utils.date(c.prazo)}<br>${tag}`;
  }

  /* ---------- Render ---------- */
function render() {
    const all = DB.confeccoes.all();
    const ativos = all.filter((c) => c.status !== "Entregue");
    const historico = DB.confeccoesHistorico.all();
    const list = filtered();
    const pageList = Utils.paginate(list, state.page, state.perPage);
    const emProducao = ativos.length;
    const entregues = historico;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-hammer"></i><div><strong>${emProducao}</strong><small>Em andamento</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-check-double"></i><div><strong>${entregues.length}</strong><small>Entregues</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-sack-dollar"></i><div><strong>${Utils.money(entregues.reduce((s, c) => s + (Number(c.valor) || 0), 0))}</strong><small>Faturado</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnNovaCF"><i class="fa-solid fa-plus"></i>Nova confecção</button>
      </div>

      <div class="tabs">
        <button class="tab ${state.tab === "lista" ? "is-active" : ""}" data-cftab="lista">Confecções</button>
        <button class="tab ${state.tab === "historico" ? "is-active" : ""}" data-cftab="historico">Histórico</button>
        <button class="tab ${state.tab === "relatorio" ? "is-active" : ""}" data-cftab="relatorio">Relatório</button>
      </div>

      ${state.tab === "relatorio" ? relatorio(all) : state.tab === "historico" ? painelHistorico() : `
      <div class="card">
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="cfSearch" type="search" placeholder="Buscar por número, cliente ou modelo..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="cfStatus">
            <option value="">Todos os status</option>
            ${STATUS.filter((s) => s !== "Entregue").map((s) => `<option ${state.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Prancha</th><th>Status</th><th>Prazo</th><th>Valor</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${pageList.length
                ? pageList.map((c) => `
                  <tr>
                    <td><strong>${Utils.escape(c.numero || "—")}</strong></td>
                    <td>${Utils.escape(c.cliente || "—")}</td>
                    <td>${Utils.escape(c.modelo || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(c.medidas || "")}</small></td>
                    <td><span class="badge badge--${cor(c.status)}">${Utils.escape(c.status || "Recebida")}</span></td>
                    <td>${prazoCell(c)}</td>
                    <td>${Utils.money(c.valor)}</td>
                    <td><div class="row-actions">
                      <button class="icon-btn btn--sm" data-cfentregar="${c.id}" data-tip="Marcar como entregue" style="width:32px;height:32px"><i class="fa-solid fa-check" style="color:var(--success)"></i></button>
                      <button class="icon-btn btn--sm" data-cfhist="${c.id}" data-tip="Histórico" style="width:32px;height:32px"><i class="fa-solid fa-clock-rotate-left"></i></button>
                      <button class="icon-btn btn--sm" data-cfprint="${c.id}" data-tip="Imprimir" style="width:32px;height:32px"><i class="fa-solid fa-print"></i></button>
                      <button class="icon-btn btn--sm" data-cfedit="${c.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
                      <button class="icon-btn btn--sm" data-cfdel="${c.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                  </tr>`).join("")
                : `<tr><td colspan="7">${UI.empty("fa-hammer", "Nenhuma confecção ativa", "Cadastre a primeira prancha sob encomenda.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${list.length ? UI.pagination(list.length, state.page, state.perPage) : ""}
      </div>`}`;
  }

function painelHistorico() {
    const hist = Utils.sort(DB.confeccoesHistorico.all(), "dataEntrega", "desc");
    return `
      <div class="card">
        <div class="card__head"><div><h3>Histórico de confecção</h3><p>Produções finalizadas e entregues</p></div></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Peça/Produto</th><th>Descrição</th><th>Valor</th><th>Entrada</th><th>Entrega</th><th>Status</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${hist.length
                ? hist.map((h) => `
                  <tr>
                    <td><strong>${Utils.escape(h.numero || "—")}</strong></td>
                    <td>${Utils.escape(h.cliente || "—")}</td>
                    <td>${Utils.escape(h.modelo || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(h.medidas || "")}</small></td>
                    <td>${Utils.escape(h.descricao || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(h.obs || "")}</small></td>
                    <td>${Utils.money(h.valor)}</td>
                    <td>${Utils.date(h.dataEntrada || h.criadoEm)}</td>
                    <td>${Utils.date(h.dataEntrega)}</td>
                    <td><span class="badge badge--success">${Utils.escape(h.statusFinal || "Entregue")}</span></td>
                    <td><div class="row-actions">
                      <button class="icon-btn btn--sm" data-cfreabrir="${h.id}" data-tip="Reabrir confecção" style="width:32px;height:32px"><i class="fa-solid fa-rotate-left"></i></button>
                    </div></td>
                  </tr>`).join("")
                : `<tr><td colspan="9">${UI.empty("fa-clock-rotate-left", "Nenhuma confecção no histórico", "As produções entregues aparecerão aqui.")}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function relatorio(all) {
    const porStatus = STATUS.map((s) => ({ s, qtd: all.filter((c) => c.status === s).length }));
    const porModelo = MODELOS.map((m) => ({ m, qtd: all.filter((c) => c.modelo === m).length })).filter((x) => x.qtd).sort((a, b) => b.qtd - a.qtd);
    const ticket = all.length ? all.reduce((s, c) => s + (Number(c.valor) || 0), 0) / all.length : 0;

    return `
      <div class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Confecções por status</h3><p>Distribuição da produção</p></div></div>
          <div class="card__body">
            <ul class="list">
              ${porStatus.map((x) => `<li class="list__item"><div><strong>${x.s}</strong></div><span class="badge badge--${cor(x.s)}">${x.qtd}</span></li>`).join("")}
            </ul>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><div><h3>Modelos mais pedidos</h3><p>Ticket médio: ${Utils.money(ticket)}</p></div></div>
          <div class="card__body">
            <ul class="list">
              ${porModelo.length
                ? porModelo.map((x) => `<li class="list__item"><div><strong>${x.m}</strong></div><span class="badge">${x.qtd} pedido(s)</span></li>`).join("")
                : `<li>${UI.empty("fa-chart-simple", "Sem dados", "Cadastre confecções para gerar o relatório.")}</li>`}
            </ul>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Financeiro ---------- */
  function removerFinanceiro(c) {
    if (!c) return;
    DB.financeiro
      .where((f) => f.origem === "confeccao" && (f.confeccaoId === c.id || (!f.confeccaoId && f.descricao === `${c.numero} — ${c.cliente}`)))
      .forEach((f) => DB.financeiro.remove(f.id));
  }

  /* ---------- Formulário ---------- */
  function openForm(id) {
    const c = id ? DB.confeccoes.find(id) : {};
    const clientes = Utils.sort(DB.clientes.all(), "nome");
    const v = (k) => Utils.escape(c[k] ?? "");
    const opts = (arr, sel) => arr.map((o) => `<option ${sel === o ? "selected" : ""}>${o}</option>`).join("");
    const anexos = { quadrantes: [...(c.quadrantes || [])], fotos: [...(c.fotos || [])] };

    UI.openModal({
      title: id ? `Editar ${c.numero || "confecção"}` : "Nova confecção",
      body: `
        <form id="cfForm" class="form-grid">
          <div class="field"><label>Número</label><input name="numero" value="${v("numero") || proximoNumero()}" readonly /></div>
          <div class="field"><label>Cliente *</label>
            <select name="cliente">
              <option value="">Selecione...</option>
              ${clientes.map((cl) => `<option ${c.cliente === cl.nome ? "selected" : ""}>${Utils.escape(cl.nome)}</option>`).join("")}
            </select>
            <span class="error" data-err="cliente"></span>
          </div>
          <div class="field"><label>Modelo da prancha</label><select name="modelo">${opts(MODELOS, c.modelo)}</select></div>
          <div class="field"><label>Medidas</label><input name="medidas" value="${v("medidas")}" placeholder="6'2&quot; x 19 1/4 x 2 1/2 — 30L" /></div>
          <div class="field"><label>Sistema de quilhas</label><select name="quilhas">${opts(QUILHAS, c.quilhas)}</select></div>
          <div class="field"><label>Rabeta</label><select name="rabeta">${opts(RABETAS, c.rabeta)}</select></div>
          <div class="field"><label>Bico</label><select name="bico">${opts(BICOS, c.bico)}</select></div>
          <div class="field"><label>Status</label><select name="status">${opts(STATUS, c.status)}</select></div>
          <div class="field"><label>Prazo de entrega</label><input name="prazo" type="date" value="${v("prazo")}" /></div>
          <div class="field"><label>Valor</label><input name="valor" type="number" min="0" step="0.01" value="${c.valor ?? ""}" /></div>

          <div class="field col-2"><label>Pintura — descrição</label>
            <textarea name="pintura" placeholder="Spray degradê azul, faixa central, logo na deck...">${v("pintura")}</textarea>
          </div>
          <div class="field col-2"><label>Referências de pintura (imagens)</label>${Anexos.fotos(anexos.fotos)}</div>

          <div class="field col-2"><label>Detalhes / observações da confecção</label>
            <textarea name="descricao" placeholder="Laminação, gramatura, deck duplo, preferências do cliente...">${v("descricao")}</textarea>
          </div>

          <div class="field col-2"><label>Quadrantes de destaque (opcional)</label>${Anexos.quadrantes(anexos.quadrantes)}</div>
        </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="cfSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    Anexos.mount(UI.$("#cfForm"), anexos);

    UI.$("#cfSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#cfForm")).entries());
      if (!d.cliente) { UI.$("#cfForm .error").textContent = "Selecione um cliente."; return; }
      d.valor = Number(d.valor) || 0;
      d.fotos = anexos.fotos;
      d.quadrantes = anexos.quadrantes;

      UI.withLoading(() => {
        const atual = id ? DB.confeccoes.find(id) : null;
        const antes = atual?.status || null;
        d.historico = [...(atual?.historico || [])];
        if (antes !== d.status)
         d.historico.push({
    status: d.status,
    em: new Date().toISOString(),

    pintura: d.pintura,
    descricao: d.descricao,

    fotos: [...d.fotos],
    quadrantes: [...d.quadrantes]
});

const saved = id ? DB.confeccoes.update(id, d) : DB.confeccoes.insert(d);

        // Entrega gera entrada financeira (uma única vez) e arquiva no histórico
        if (d.status === "Entregue" && antes !== "Entregue") {
          if (d.valor > 0) {
            removerFinanceiro(saved);
            DB.financeiro.insert({
              tipo: "entrada", categoria: "Confecção", descricao: `${d.numero} — ${d.cliente}`,
              valor: d.valor, data: new Date().toISOString(), origem: "confeccao", confeccaoId: saved.id,
            });
          }
          finalizarEArquivar(saved);
        }
        if (antes === "Entregue" && d.status !== "Entregue") removerFinanceiro(saved);

        UI.closeModal();
        UI.toast(id ? "Confecção atualizada!" : "Confecção cadastrada!");
        App.refresh();
      });
    };
  }

  /** Move a confecção entregue para o histórico */
  function finalizarEArquivar(c) {
    const reg = {
      numero: c.numero,
      cliente: c.cliente,
      modelo: c.modelo,
      medidas: c.medidas,
      descricao: c.descricao,
      pintura: c.pintura,
      valor: c.valor,
      obs: c.descricao,
      dataEntrada: c.criadoEm,
      dataEntrega: new Date().toISOString(),
      statusFinal: "Entregue",
      origemId: c.id,
    };
    DB.confeccoesHistorico.insert(reg);
    DB.confeccoes.remove(c.id);
  }

  /* ---------- Histórico ---------- */
 function historico(id) {
  const c = DB.confeccoes.find(id);
  if (!c) return;

  const h = [...(c.historico || [])].reverse();

  UI.openModal({
    title: `Histórico — ${c.numero}`,
    size: 650,

    body: `
      <div style="display:flex;flex-direction:column;gap:18px;">

        <ul class="list">
          ${
            h.length
              ? h.map((x) => `
                <li class="list__item">
                  <div>
                    <strong>${Utils.escape(x.status)}</strong>
                    <small>${Utils.date(x.em)}</small>
                  </div>
                </li>
              `).join("")
              : UI.empty(
                  "fa-clock-rotate-left",
                  "Sem histórico",
                  "As mudanças de status aparecerão aqui."
                )
          }

          <li class="list__item">
            <div>
              <strong>Criada em</strong>
              <small>${Utils.date(c.criadoEm)}</small>
            </div>
          </li>
        </ul>

        ${
          (c.fotos || []).length
            ? `
              <div>
                <h4 style="margin-bottom:12px;">Fotos anexadas</h4>

                <div style="
                  display:grid;
                  grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
                  gap:12px;
                ">
                  ${c.fotos
                    .map(
                      (foto) => `
                        <img
                          src="${foto}"
                          alt="Foto da confecção"
                          style="
                            width:100%;
                            height:140px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid var(--border);
                            cursor:pointer;
                          "
                          onclick="window.open('${foto}','_blank')"
                        >
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
            : ""
        }

      </div>
    `,

    footer: `
      <button class="btn btn--ghost" data-close>
        Fechar
      </button>
    `,
  });
}

  /* ---------- Impressão ---------- */
  function imprimir(id) {
    const c = DB.confeccoes.find(id);
    if (!c) return;
    const s = DB.settings.get();
    const cli = DB.clientes.all().find((x) => x.nome === c.cliente) || {};

    Anexos.print(`Confecção ${c.numero || ""}`, `
      <div class="doc-head">
        <div><h1>${Utils.escape(s.empresa)}</h1><small>Pedido de confecção de prancha</small></div>
        <div class="doc-num"><small>Pedido</small><strong>${Utils.escape(c.numero || "—")}</strong>
          <small>Emitido em ${Utils.date(c.criadoEm || new Date().toISOString())}</small></div>
      </div>

      <div class="doc-sec"><h2>Cliente</h2>
        <div class="doc-grid">
          <div><small>Nome</small>${Utils.escape(c.cliente || "—")}</div>
          <div><small>Telefone</small>${Utils.escape(cli.telefone || "—")}</div>
          <div><small>E-mail</small>${Utils.escape(cli.email || "—")}</div>
        </div>
      </div>

      <div class="doc-sec"><h2>Especificações</h2>
        <div class="doc-grid">
          <div><small>Modelo</small>${Utils.escape(c.modelo || "—")}</div>
          <div><small>Medidas</small>${Utils.escape(c.medidas || "—")}</div>
          <div><small>Quilhas</small>${Utils.escape(c.quilhas || "—")}</div>
          <div><small>Rabeta</small>${Utils.escape(c.rabeta || "—")}</div>
          <div><small>Bico</small>${Utils.escape(c.bico || "—")}</div>
          <div><small>Status</small>${Utils.escape(c.status || "Recebida")}</div>
          <div><small>Prazo</small>${Utils.date(c.prazo)}</div>
        </div>
      </div>

      <div class="doc-sec"><h2>Pintura</h2><div class="doc-box">${Utils.escape(c.pintura || "—")}</div></div>
      <div class="doc-sec"><h2>Descrição geral</h2><div class="doc-box">${Utils.escape(c.descricao || "—")}</div></div>
      <div class="doc-sec"><h2>Quadrantes de destaque</h2><div class="doc-box">${Utils.escape(Anexos.quadrantesTexto(c.quadrantes))}</div></div>

      ${(c.fotos || []).length ? `<div class="doc-sec"><h2>Referências</h2>
        <div class="doc-photos">${c.fotos.map((f, i) => `<img src="${f}" alt="Referência ${i + 1}" />`).join("")}</div></div>` : ""}

      <div class="doc-sec"><div class="doc-total"><span>Valor da confecção</span><span>${Utils.money(c.valor)}</span></div></div>

      <div class="doc-sign"><div>Assinatura do cliente</div><div>Assinatura ${Utils.escape(s.empresa)}</div></div>
      <p class="doc-foot">Documento sem valor fiscal — pedido de confecção sob medida.</p>
    `);
  }

/* ---------- Mount ---------- */
  function mount(root) {
    const btnNova = UI.$("#btnNovaCF");
    if (btnNova) btnNova.onclick = () => openForm();
    const busca = UI.$("#cfSearch");
    if (busca) busca.addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; state.page = 1; App.refresh(true); }, 300));
    const filtro = UI.$("#cfStatus");
    if (filtro) filtro.onchange = (e) => { state.status = e.target.value; state.page = 1; App.refresh(); };

    root.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-cftab]");
      if (tab) { state.tab = tab.dataset.cftab; state.page = 1; return App.refresh(); }
      const entregar = e.target.closest("[data-cfentregar]");
      if (entregar) {
        const c = DB.confeccoes.find(entregar.dataset.cfentregar);
        if (!c) return App.refresh();
        return UI.confirm({
          title: "Marcar como entregue",
          message: `Marcar a confecção ${c.numero || ""} de ${c.cliente} como entregue? Isso lançará a entrada no Financeiro e moverá para o histórico.`,
          confirmText: "Entregar",
          onConfirm: () => UI.withLoading(() => {
            if (c.valor > 0) {
              removerFinanceiro(c);
              DB.financeiro.insert({
                tipo: "entrada", categoria: "Confecção", descricao: `${c.numero} — ${c.cliente}`,
                valor: Number(c.valor) || 0, data: new Date().toISOString(), origem: "confeccao", confeccaoId: c.id,
              });
            }
            finalizarEArquivar(c);
            UI.toast("Confecção entregue e lançada no Financeiro!", "success");
            App.refresh();
          }),
        });
      }
      const reabrir = e.target.closest("[data-cfreabrir]");
      if (reabrir) {
        const h = DB.confeccoesHistorico.find(reabrir.dataset.cfreabrir);
        if (!h) return App.refresh();
return UI.confirm({
          title: "Reabrir confecção",
          message: `Reabrir a confecção ${h.numero || ""} de ${h.cliente} como ativa? A entrada financeira correspondente será removida.`,
          confirmText: "Reabrir",
          tone: "danger",
          onConfirm: () => UI.withLoading(() => {
            removerFinanceiro({ id: h.origemId, numero: h.numero, cliente: h.cliente });
            DB.confeccoes.insert({
              numero: h.numero,
              cliente: h.cliente,
              modelo: h.modelo,
              medidas: h.medidas,
              descricao: h.descricao,
              pintura: h.pintura,
              valor: h.valor,
              prazo: h.prazo,
              status: "Pronta",
              historico: [],
            });
            DB.confeccoesHistorico.remove(h.id);
            UI.toast("Confecção reaberta.", "info");
            App.refresh();
          }),
        });
      }
      const hist = e.target.closest("[data-cfhist]");
      if (hist) return historico(hist.dataset.cfhist);
      const pr = e.target.closest("[data-cfprint]");
      if (pr) return imprimir(pr.dataset.cfprint);
      const ed = e.target.closest("[data-cfedit]");
      if (ed) return openForm(ed.dataset.cfedit);
const del = e.target.closest("[data-cfdel]");
      if (del) return UI.confirm({
        message: "Excluir esta confecção? A entrada financeira gerada por ela também será removida.",
        tone: "danger",
        onConfirm: () => UI.withLoading(() => {
          removerFinanceiro(DB.confeccoes.find(del.dataset.cfdel));
          DB.confeccoes.remove(del.dataset.cfdel);
          UI.toast("Confecção excluída.", "info");
          App.refresh();
        }),
      });
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) { state.page = Number(nav.dataset.pageNav); App.refresh(); }
    });
  }

  return { render, mount, setTerm: (t) => { state.term = t; state.page = 1; } };
})();
