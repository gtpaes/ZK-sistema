/** produtos.js — Catálogo de produtos (CRUD) e Estoque (entradas/saídas + histórico) */

const Produtos = (() => {
  const state = { term: "", categoria: "", sort: { key: "nome", dir: "asc" }, page: 1, perPage: 8 };
  const FIELDS = ["nome", "categoria", "codigo", "fornecedor"];
  const CATEGORIAS = [
    "Pranchas",
    "Leash",
    "Deck",
    "Parafina",
    "Quilhas",
    "Camisetas",
    "Acessórios",
    "Roupas",
  ];

  const COLUMNS = [
    { key: "nome", label: "Produto" },
    { key: "categoria", label: "Categoria" },
    { key: "codigo", label: "Código" },
    { key: "preco", label: "Preço" },
    { key: "quantidade", label: "Estoque" },
    { label: "Ações", style: "text-align:right" },
  ];

  const minimo = () => DB.settings.get().estoqueMinimo || 5;

  function filtered() {
    let list = DB.produtos.all();
    if (state.categoria) list = list.filter((p) => p.categoria === state.categoria);
    list = Utils.search(list, state.term, FIELDS);
    return Utils.sort(list, state.sort.key, state.sort.dir);
  }

  function badgeEstoque(q) {
    if (q <= 0) return `<span class="badge badge--danger">Sem estoque</span>`;
    if (q <= minimo()) return `<span class="badge badge--warn">${q} un. (baixo)</span>`;
    return `<span class="badge badge--success">${q} un.</span>`;
  }

  function rows(list) {
    if (!list.length)
      return `<tr><td colspan="6">${UI.empty("fa-box-open", "Nenhum produto encontrado", "Cadastre um produto para começar o catálogo.")}</td></tr>`;
    return list
      .map(
        (p) => `
      <tr>
        <td>
          <div class="cli-cell">
            <span class="cli-avatar"><i class="fa-solid fa-box"></i></span>
            <div><strong>${Utils.escape(p.nome)}</strong><small>${Utils.escape(p.fornecedor || "Sem fornecedor")}</small></div>
          </div>
        </td>
        <td>${Utils.escape(p.categoria || "—")}</td>
        <td>${Utils.escape(p.codigo || "—")}</td>
        <td>${Utils.money(p.preco)}</td>
        <td>${badgeEstoque(Number(p.quantidade) || 0)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn btn--sm" data-edit="${p.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn btn--sm" data-del="${p.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`,
      )
      .join("");
  }

  function render() {
    const all = DB.produtos.all();
    const list = filtered();
    const pageList = Utils.paginate(list, state.page, state.perPage);
    const valorEstoque = all.reduce(
      (s, p) => s + (Number(p.preco) || 0) * (Number(p.quantidade) || 0),
      0,
    );
    const baixos = all.filter((p) => (Number(p.quantidade) || 0) <= minimo()).length;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-box-open"></i><div><strong>${all.length}</strong><small>Produtos ativos</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-coins"></i><div><strong>${Utils.money(valorEstoque)}</strong><small>Valor em estoque</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>${baixos}</strong><small>Estoque baixo</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnNovoProduto"><i class="fa-solid fa-plus"></i>Novo produto</button>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="prodSearch" type="search" placeholder="Buscar por nome, código ou fornecedor..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="prodCat">
            <option value="">Todas as categorias</option>
            ${CATEGORIAS.map((c) => `<option ${state.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <select id="prodSort">
            <option value="nome:asc" ${state.sort.key === "nome" ? "selected" : ""}>Nome (A–Z)</option>
            <option value="preco:desc" ${state.sort.key === "preco" ? "selected" : ""}>Maior preço</option>
            <option value="quantidade:asc" ${state.sort.key === "quantidade" ? "selected" : ""}>Menor estoque</option>
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>${UI.tableHead(COLUMNS, state.sort)}</thead>
            <tbody>${rows(pageList)}</tbody>
          </table>
        </div>
        ${list.length ? UI.pagination(list.length, state.page, state.perPage) : ""}
      </div>`;
  }

  function form(p = {}) {
    const v = (k) => Utils.escape(p[k] ?? "");
    return `
      <form id="prodForm" class="form-grid" novalidate>
        <div class="field col-2"><label>Nome do produto *</label><input name="nome" value="${v("nome")}" placeholder="Ex.: Prancha Fish 6'2&quot;" /><span class="error" data-err="nome"></span></div>
        <div class="field"><label>Categoria</label>
          <select name="categoria">${CATEGORIAS.map((c) => `<option ${p.categoria === c ? "selected" : ""}>${c}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Código interno</label><input name="codigo" value="${v("codigo")}" placeholder="PR-001" /></div>
        <div class="field"><label>Preço de venda *</label><input name="preco" type="number" step="0.01" min="0" value="${v("preco")}" /><span class="error" data-err="preco"></span></div>
        <div class="field"><label>Quantidade em estoque</label><input name="quantidade" type="number" min="0" value="${p.quantidade ?? 0}" /></div>
        <div class="field col-2"><label>Fornecedor</label><input name="fornecedor" value="${v("fornecedor")}" /></div>
        <div class="field col-2"><label>Descrição</label><textarea name="descricao">${v("descricao")}</textarea></div>
      </form>`;
  }

  function openForm(id) {
    const p = id ? DB.produtos.find(id) : {};
    UI.openModal({
      title: id ? "Editar produto" : "Novo produto",
      body: form(p),
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="prodSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });
    UI.$("#prodSave").onclick = () => {
      const data = Object.fromEntries(new FormData(UI.$("#prodForm")).entries());
      const errs = {};
      if (!data.nome.trim()) errs.nome = "Informe o nome do produto.";
      if (data.preco === "" || Number(data.preco) < 0) errs.preco = "Informe um preço válido.";
      document
        .querySelectorAll("#prodForm .error")
        .forEach((e) => (e.textContent = errs[e.dataset.err] || ""));
      if (Object.keys(errs).length) return;
      data.preco = Number(data.preco);
      data.quantidade = Number(data.quantidade) || 0;
      UI.withLoading(() => {
        id ? DB.produtos.update(id, data) : DB.produtos.insert(data);
        UI.closeModal();
        UI.toast(id ? "Produto atualizado!" : "Produto cadastrado!");
        App.refresh();
      });
    };
  }

  function mount(root) {
    UI.$("#btnNovoProduto").onclick = () => openForm();
    UI.$("#prodSearch").addEventListener(
      "input",
      Utils.debounce((e) => {
        state.term = e.target.value;
        state.page = 1;
        App.refresh(true);
      }, 300),
    );
    UI.$("#prodCat").onchange = (e) => {
      state.categoria = e.target.value;
      state.page = 1;
      App.refresh();
    };
    UI.$("#prodSort").onchange = (e) => {
      const [k, d] = e.target.value.split(":");
      state.sort = { key: k, dir: d };
      App.refresh();
    };

    root.addEventListener("click", (e) => {
      const th = e.target.closest("[data-sort]");
      if (th) {
        const k = th.dataset.sort;
        state.sort = {
          key: k,
          dir: state.sort.key === k && state.sort.dir === "asc" ? "desc" : "asc",
        };
        return App.refresh();
      }
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) {
        state.page = Number(nav.dataset.pageNav);
        return App.refresh();
      }
      const edit = e.target.closest("[data-edit]");
      if (edit) return openForm(edit.dataset.edit);
      const del = e.target.closest("[data-del]");
      if (del) {
        const p = DB.produtos.find(del.dataset.del);
        return UI.confirm({
          message: `Excluir o produto “${p.nome}”? Esta ação não pode ser desfeita.`,
          onConfirm: () =>
            UI.withLoading(() => {
              DB.produtos.remove(p.id);
              UI.toast("Produto excluído.", "info");
              App.refresh();
            }),
        });
      }
    });
  }

  return {
    render,
    mount,
    CATEGORIAS,
    setTerm: (t) => {
      state.term = t;
      state.page = 1;
    },
  };
})();

/** Estoque — movimentações de entrada e saída com histórico e alertas */
const Estoque = (() => {
  const state = { tipo: "", page: 1, perPage: 8 };

  function movimentar() {
    const produtos = Utils.sort(DB.produtos.all(), "nome");
    if (!produtos.length)
      return UI.toast("Cadastre um produto antes de movimentar o estoque.", "warn");
    UI.openModal({
      title: "Nova movimentação",
      size: 520,
      body: `
        <form id="movForm" class="form-grid">
          <div class="field col-2"><label>Produto *</label>
            <select name="produtoId">${produtos.map((p) => `<option value="${p.id}">${Utils.escape(p.nome)} — ${p.quantidade || 0} un.</option>`).join("")}</select>
          </div>
          <div class="field"><label>Tipo</label>
            <select name="tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
          </div>
          <div class="field"><label>Quantidade *</label><input name="quantidade" type="number" min="1" value="1" /><span class="error" data-err="quantidade"></span></div>
          <div class="field col-2"><label>Motivo / observação</label><input name="motivo" placeholder="Compra de fornecedor, ajuste, perda..." /></div>
        </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="movSave"><i class="fa-solid fa-arrow-right-arrow-left"></i>Registrar</button>`,
    });

    UI.$("#movSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#movForm")).entries());
      const qtd = Number(d.quantidade);
      const prod = DB.produtos.find(d.produtoId);
      const err = UI.$("#movForm .error");
      if (!qtd || qtd < 1) {
        err.textContent = "Informe uma quantidade válida.";
        return;
      }
      if (d.tipo === "saida" && qtd > (prod.quantidade || 0)) {
        err.textContent = "Quantidade maior que o estoque disponível.";
        return;
      }
      UI.withLoading(() => {
        const nova = (Number(prod.quantidade) || 0) + (d.tipo === "entrada" ? qtd : -qtd);
        DB.produtos.update(prod.id, { quantidade: nova });
        DB.movimentacoes.insert({
          produtoId: prod.id,
          produto: prod.nome,
          tipo: d.tipo,
          quantidade: qtd,
          motivo: d.motivo,
          data: new Date().toISOString(),
        });
        UI.closeModal();
        UI.toast(`${d.tipo === "entrada" ? "Entrada" : "Saída"} registrada!`);
        App.refresh();
      });
    };
  }

  function render() {
    const min = DB.settings.get().estoqueMinimo || 5;
    const produtos = DB.produtos.all();
    const alertas = produtos.filter((p) => (Number(p.quantidade) || 0) <= min);
    let movs = Utils.sort(DB.movimentacoes.all(), "data", "desc");
    if (state.tipo) movs = movs.filter((m) => m.tipo === state.tipo);
    const pageList = Utils.paginate(movs, state.page, state.perPage);

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-arrow-down"></i><div><strong>${DB.movimentacoes.where((m) => m.tipo === "entrada").length}</strong><small>Entradas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-arrow-up"></i><div><strong>${DB.movimentacoes.where((m) => m.tipo === "saida").length}</strong><small>Saídas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-bell"></i><div><strong>${alertas.length}</strong><small>Alertas de estoque</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnMov"><i class="fa-solid fa-arrow-right-arrow-left"></i>Movimentar estoque</button>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Histórico de movimentações</h3><p>Entradas e saídas registradas</p></div>
            <select id="movFiltro" 
            style="max-width:150px;
            color:#1f2937;border-radius: 10px;">
              <option value="">Todas</option>
              <option value="entrada" ${state.tipo === "entrada" ? "selected" : ""}>Entradas</option>
              <option value="saida" ${state.tipo === "saida" ? "selected" : ""}>Saídas</option>
            </select>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Produto</th><th>Tipo</th><th>Qtd.</th><th>Data</th><th style="text-align:right">Ações</th></tr></thead>
             <tbody>
              ${
                pageList.length
                  ? pageList
                      .map(
                        (m) => `
                  <tr>
                    <td>
                      <strong>${Utils.escape(m.produto)}</strong><br>
                      <small style="color:var(--text-muted)">
                        ${Utils.escape(m.motivo || "—")}
                      </small>
                    </td>
                      
                    <td>
                      <span class="badge badge--${m.tipo === "entrada" ? "success" : "danger"}">
                        ${m.tipo === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                      
                    <td>${m.quantidade}</td>
                      
                    <td>${Utils.date(m.data)}</td>
                      
                    <td>
                      <div class="row-actions">
                        <button
                          class="icon-btn btn--sm"
                          data-del-mov="${m.id}"
                          data-tip="Excluir"
                          style="width:32px;height:32px"
                        >
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `,
                      )
                      .join("")
                  : `
                  <tr>
                    <td colspan="5">
                      ${UI.empty(
                        "fa-warehouse",
                        "Sem movimentações",
                        "Registre entradas e saídas para acompanhar o estoque."
                      )}
                    </td>
                  </tr>
                `
              }
            </tbody>
            </table>
          </div>
          ${movs.length ? UI.pagination(movs.length, state.page, state.perPage) : ""}
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Alertas de estoque baixo</h3><p>Igual ou abaixo de ${min} unidades</p></div></div>
          <div class="card__body">
            ${
              alertas.length
                ? `<ul class="list">${alertas
                    .map(
                      (p) => `
                  <li class="list__item">
                    <div><strong>${Utils.escape(p.nome)}</strong><small>${Utils.escape(p.categoria || "—")}</small></div>
                    <span class="badge badge--${(p.quantidade || 0) <= 0 ? "danger" : "warn"}">${p.quantidade || 0} un.</span>
                  </li>`,
                    )
                    .join("")}</ul>`
                : UI.empty(
                    "fa-circle-check",
                    "Estoque saudável",
                    "Nenhum produto abaixo do mínimo configurado.",
                  )
            }
          </div>
        </div>
      </div>`;
  }

  function mount(root) {
  UI.$("#btnMov").onclick = movimentar;

  UI.$("#movFiltro").onchange = (e) => {
    state.tipo = e.target.value;
    state.page = 1;
    App.refresh();
  };

  root.addEventListener("click", (e) => {

    // Excluir movimentação
    const delMov = e.target.closest("[data-del-mov]");

    if (delMov) {

      const mov = DB.movimentacoes.find(delMov.dataset.delMov);

      if (!mov) return;

      const produto = DB.produtos.find(mov.produtoId);

      UI.confirm({
        message: "Excluir esta movimentação do estoque?",

        onConfirm: () => UI.withLoading(() => {

          let novaQtd = Number(produto.quantidade);

          if (mov.tipo === "entrada") {
            novaQtd -= Number(mov.quantidade);
          } else {
            novaQtd += Number(mov.quantidade);
          }

          if (novaQtd < 0) {
            UI.toast(
              "Não é possível excluir esta movimentação porque deixaria o estoque negativo.",
              "warn"
            );
            return;
          }

          DB.produtos.update(produto.id, {
            quantidade: novaQtd
          });

          DB.movimentacoes.remove(mov.id);

          UI.toast("Movimentação excluída.");

          App.refresh();

        })
      });

      return;
    }

    // Paginação
    const nav = e.target.closest("[data-page-nav]");

    if (nav && !nav.disabled) {
      state.page = Number(nav.dataset.pageNav);
      App.refresh();
    }

  });
}

  return { render, mount };
})();
