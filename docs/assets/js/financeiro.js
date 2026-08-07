/** financeiro.js — Fluxo de caixa (entradas e saídas) com filtros e resumo */

const Financeiro = (() => {
  const CATEGORIAS = ["Venda", "Conserto", "Mensalidade", "Fornecedor", "Aluguel", "Salário", "Marketing", "Outros"];
  const state = { tipo: "", mes: new Date().toISOString().slice(0, 7), page: 1, perPage: 10 };

  const doMes = (list) => list.filter((f) => (f.data || "").slice(0, 7) === state.mes);

  function render() {
    let list = doMes(DB.financeiro.all());
    const entradas = list.filter((f) => f.tipo === "entrada").reduce((s, f) => s + Number(f.valor || 0), 0);
    const saidas = list.filter((f) => f.tipo === "saida").reduce((s, f) => s + Number(f.valor || 0), 0);
    if (state.tipo) list = list.filter((f) => f.tipo === state.tipo);
    list = Utils.sort(list, "data", "desc");
    const pageList = Utils.paginate(list, state.page, state.perPage);

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-arrow-trend-up"></i><div><strong>${Utils.money(entradas)}</strong><small>Entradas do mês</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-arrow-trend-down"></i><div><strong>${Utils.money(saidas)}</strong><small>Saídas do mês</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-scale-balanced"></i><div><strong>${Utils.money(entradas - saidas)}</strong><small>Saldo do mês</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnLanc"><i class="fa-solid fa-plus"></i>Novo lançamento</button>
      </div>

      <div class="card">
        <div class="toolbar">
          <input id="finMes" type="month" value="${state.mes}" style="max-width:190px" />
          <select id="finTipo" style="max-width:170px">
            <option value="">Entradas e saídas</option>
            <option value="entrada" ${state.tipo === "entrada" ? "selected" : ""}>Somente entradas</option>
            <option value="saida" ${state.tipo === "saida" ? "selected" : ""}>Somente saídas</option>
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Data</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${pageList.length
                ? pageList.map((f) => `
                  <tr>
                    <td><strong>${Utils.escape(f.descricao || "—")}</strong></td>
                    <td>${Utils.escape(f.categoria || "—")}</td>
                    <td><span class="badge badge--${f.tipo === "entrada" ? "success" : "danger"}">${f.tipo === "entrada" ? "Entrada" : "Saída"}</span></td>
                    <td><strong>${Utils.money(f.valor)}</strong></td>
                    <td>${Utils.date(f.data)}</td>
                    <td><div class="row-actions"><button class="icon-btn btn--sm" data-del="${f.id}" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button></div></td>
                  </tr>`).join("")
                : `<tr><td colspan="6">${UI.empty("fa-sack-dollar", "Nenhum lançamento no período", "Escolha outro mês ou registre um lançamento.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${list.length ? UI.pagination(list.length, state.page, state.perPage) : ""}
      </div>`;
  }

  function openForm() {
    UI.openModal({
      title: "Novo lançamento",
      size: 540,
      body: `<form id="finForm" class="form-grid">
        <div class="field col-2"><label>Descrição *</label><input name="descricao" placeholder="Compra de parafina, conta de luz..." /><span class="error" data-err="descricao"></span></div>
        <div class="field"><label>Tipo</label><select name="tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div>
        <div class="field"><label>Categoria</label><select name="categoria">${CATEGORIAS.map((c) => `<option>${c}</option>`).join("")}</select></div>
        <div class="field"><label>Valor *</label><input name="valor" type="number" min="0" step="0.01" /><span class="error" data-err="valor"></span></div>
        <div class="field"><label>Data</label><input name="data" type="date" value="${Utils.today()}" /></div>
      </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="finSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });
    UI.$("#finSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#finForm")).entries());
      const errs = {};
      if (!d.descricao.trim()) errs.descricao = "Informe a descrição.";
      if (!d.valor || Number(d.valor) <= 0) errs.valor = "Informe um valor maior que zero.";
      document.querySelectorAll("#finForm .error").forEach((e) => (e.textContent = errs[e.dataset.err] || ""));
      if (Object.keys(errs).length) return;
      d.valor = Number(d.valor);
      d.data = new Date(d.data + "T12:00:00").toISOString();
      UI.withLoading(() => { DB.financeiro.insert(d); UI.closeModal(); UI.toast("Lançamento registrado!"); App.refresh(); });
    };
  }

  function mount(root) {
    UI.$("#btnLanc").onclick = openForm;
    UI.$("#finMes").onchange = (e) => { state.mes = e.target.value; state.page = 1; App.refresh(); };
    UI.$("#finTipo").onchange = (e) => { state.tipo = e.target.value; state.page = 1; App.refresh(); };
    root.addEventListener("click", (e) => {
      const del = e.target.closest("[data-del]");
      if (del) return UI.confirm({ message: "Excluir este lançamento?", tone: "danger", onConfirm: () => UI.withLoading(() => { DB.financeiro.remove(del.dataset.del); UI.toast("Lançamento excluído.", "info"); App.refresh(); }) });
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) { state.page = Number(nav.dataset.pageNav); App.refresh(); }
    });
  }

  return { render, mount };
})();
