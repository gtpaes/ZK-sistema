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

  /** Mapa de categoria → prefixo do código interno */
  const PREFIXO = {
    Pranchas: "PR",
    Leash: "LE",
    Deck: "DE",
    Parafina: "PA",
    Quilhas: "QU",
    Camisetas: "CM",
    "Acessórios": "AC",
    Roupas: "RO",
  };

  /** Gera o próximo código de produto por categoria (ex.: CM-001, CM-002...). */
  function proximoCodigo(categoria) {
    const prefixo = PREFIXO[categoria];
    if (!prefixo) return "";
    let max = 0;
    const re = new RegExp(`^${prefixo}-(\\d+)$`, "i");
    DB.produtos.all().forEach((p) => {
      const m = re.exec(String(p.codigo || "").trim());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `${prefixo}-${String(max + 1).padStart(3, "0")}`;
  }

  const COLUMNS = [
    { key: "nome", label: "Produto" },
    { key: "categoria", label: "Categoria" },
    { key: "quantidade", label: "Estoque" },
    { label: "Custo / Venda" },
    { label: "Valores em estoque" },
    { label: "Margem" },
    { label: "Ações", style: "text-align:right" },
  ];

  /* ---------- Cálculos de custo / margem ---------- */
  const ar2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  const custoUnit = (p) => ar2(p && p.custoUnitario);

  const custoEstoque = (p) => ar2(custoUnit(p) * (Number(p && p.quantidade) || 0));

  const valorVenda = (p) => ar2((Number(p && p.preco) || 0) * (Number(p && p.quantidade) || 0));

  const margemTotal = (p) => ar2(valorVenda(p) - custoEstoque(p));

  /** Margem percentual sobre o preço de venda. Retorna null quando não há custo ou preço. */
  const margemPct = (p) => {
    const c = custoUnit(p);
    const v = Number(p && p.preco) || 0;
    if (!(c > 0) || !(v > 0)) return null;
    return Math.round(((v - c) / v) * 100);
  };

  function badgeMargem(p) {
    const m = margemPct(p);
    if (m == null) return `<span class="badge" data-tip="Sem custo cadastrado" style="cursor:help">Sem custo</span>`;
    if (m < 0) return `<span class="badge badge--danger">${m}%</span>`;
    if (m <= 25) return `<span class="badge badge--warn">${m}%</span>`;
    return `<span class="badge badge--success">${m}%</span>`;
  }

  const stack = (top, bottom) =>
    `<div class="cell-stack"><strong>${top}</strong><small>${bottom}</small></div>`;

  function filtered() {
    let list = DB.produtos.all();
    if (state.categoria) list = list.filter((p) => p.categoria === state.categoria);
    list = Utils.search(list, state.term, FIELDS);
    return Utils.sort(list, state.sort.key, state.sort.dir);
  }

  function badgeEstoque(p) {
    const q = Number(p.quantidade) || 0;
    if (q <= 0) return `<span class="badge badge--danger">Sem estoque</span>`;
    if (q <= Utils.limiteMinimo(p)) return `<span class="badge badge--warn">${q} un. (baixo)</span>`;
    return `<span class="badge badge--success">${q} un.</span>`;
  }

  function rows(list) {
    if (!list.length)
      return `<tr><td colspan="7">${UI.empty("fa-box-open", "Nenhum produto encontrado", "Cadastre um produto para começar o catálogo.")}</td></tr>`;
    return list
      .map(
        (p) => {
          const c = custoUnit(p);
          return `
      <tr>
        <td>
          <div class="cli-cell">
            <span class="cli-avatar"><i class="fa-solid fa-box"></i></span>
            <div><strong>${Utils.escape(p.nome)}</strong><small>${Utils.escape(p.fornecedor || "Sem fornecedor")}</small></div>
          </div>
        </td>
        <td>${Utils.escape(p.categoria || "—")}<br><small style="color:var(--text-muted)">${Utils.escape(p.codigo || "sem código")}</small></td>
        <td>${badgeEstoque(p)}</td>
        <td>${stack(c > 0 ? Utils.money(c) : '<span class="badge" style="cursor:help" data-tip="Sem custo cadastrado">—</span>', Utils.money(p.preco))}</td>
        <td>${stack(Utils.money(custoEstoque(p)), Utils.money(valorVenda(p)))}</td>
        <td>${badgeMargem(p)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn btn--sm" data-view="${p.id}" data-tip="Detalhes" style="width:32px;height:32px"><i class="fa-solid fa-eye"></i></button>
            <button class="icon-btn btn--sm" data-edit="${p.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn btn--sm" data-del="${p.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
        },
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
    const investido = all.reduce((s, p) => s + custoEstoque(p), 0);
    const margemBruta = ar2(valorEstoque - investido);
    const baixos = all.filter((p) => (Number(p.quantidade) || 0) <= Utils.limiteMinimo(p)).length;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-box-open"></i><div><strong>${all.length}</strong><small>Produtos ativos</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-coins"></i><div><strong>${Utils.money(investido)}</strong><small>Investido em estoque (custo)</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-cart-shopping"></i><div><strong>${Utils.money(valorEstoque)}</strong><small>Valor de venda do estoque</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-chart-line"></i><div><strong>${Utils.money(margemBruta)}</strong><small>Margem bruta (estimativa)</small></div></div>
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

  function margensTexto(c, v) {
    if (!(v > 0)) return { classe: "is-muted", texto: "Informe o preço de venda." };
    if (!(c > 0)) return { classe: "is-muted", texto: "Informe o custo para calcular a margem." };
    const pct = Math.round(((v - c) / v) * 100);
    return { classe: "", texto: `${Utils.money(ar2(v - c))} por un. (${pct}%)` };
  }

  function form(p = {}) {
    const v = (k) => Utils.escape(p[k] ?? "");
    const isNovo = !p.id;
    const cIn = custoUnit(p);
    const qIn = Number(p.quantidade) || 0;
    const vIn = Number(p.preco) || 0;
    const m = margensTexto(cIn, vIn);
    const labelInvestido = isNovo ? "Total investido nesta compra" : "Valor em custo no estoque";
    const totalInvInicial = ar2(cIn * qIn);
    const totalVDInicial = ar2(vIn * qIn);

    return `
      <form id="prodForm" class="form-grid" novalidate>
        <div class="form-section col-2">
          <h4 class="form-section__title"><i class="fa-solid fa-circle-info"></i> Informações do produto</h4>
          <div class="form-grid">
            <div class="field col-2"><label>Nome do produto *</label><input name="nome" value="${v("nome")}" placeholder="Ex.: Prancha Fish 6'2&quot;" /><span class="error" data-err="nome"></span></div>
            <div class="field"><label>Categoria</label>
              <select name="categoria">${CATEGORIAS.map((c) => `<option ${p.categoria === c ? "selected" : ""}>${c}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Código interno${p.codigo ? "" : " (automático)"}</label><input name="codigo" id="codAuto" value="${v("codigo")}" placeholder="PR-001" ${p.codigo ? "" : "readonly"} /></div>
            <div class="field col-2"><label>Fornecedor</label><input name="fornecedor" value="${v("fornecedor")}" /></div>
            <div class="field col-2"><label>Descrição</label><textarea name="descricao">${v("descricao")}</textarea></div>
          </div>
        </div>

        <div class="form-section col-2">
          <h4 class="form-section__title"><i class="fa-solid fa-tags"></i> Valores</h4>
          <div class="form-grid">
            <div class="field"><label>Custo de aquisição por unidade</label>
              <div class="money-input"><span>R$</span><input id="fCusto" name="custoUnitario" type="number" step="0.01" min="0" value="${p.custoUnitario ?? ""}" placeholder="0,00" /></div>
              <span class="error" data-err="custoUnitario"></span>
              <small style="color:var(--text-muted)">Quanto a loja paga por 1 unidade</small>
            </div>
            <div class="field"><label>Preço de venda *</label>
              <div class="money-input"><span>R$</span><input name="preco" id="fPreco" type="number" step="0.01" min="0" value="${v("preco")}" /></div>
              <span class="error" data-err="preco"></span>
            </div>
            <div class="field col-2"><label>Margem estimada</label><div id="margemLive" class="calc-live ${m.classe}">${m.texto}</div></div>
          </div>
        </div>

        <div class="form-section col-2">
          <h4 class="form-section__title"><i class="fa-solid fa-warehouse"></i> Estoque</h4>
          <div class="form-grid">
            <div class="field"><label>Quantidade</label><input name="quantidade" id="fQtd" type="number" min="0" value="${qIn}" /><span class="error" data-err="quantidade"></span></div>
            <div class="field"><label>Limite mínimo (estoque)</label><input name="estoqueMinimo" type="number" min="0" value="${p.estoqueMinimo != null && p.estoqueMinimo !== "" ? p.estoqueMinimo : ""}" placeholder="Usa o global (${Utils.limiteMinimo(p)})" /></div>
            <div class="field col-2">
              <div class="calc-summary">
                <div><span>${labelInvestido}</span><strong id="totInv">${Utils.money(totalInvInicial)}</strong></div>
                <div><span>Valor potencial de venda</span><strong id="totVD">${Utils.money(totalVDInicial)}</strong></div>
              </div>
            </div>
            ${
              isNovo
                ? `<p class="form-hint col-2"><i class="fa-solid fa-circle-info"></i>Se informar custo e quantidade, o sistema registra esta compra inicial: aumenta o estoque e lança a saída no Financeiro.</p>`
                : `<p class="form-hint col-2"><i class="fa-solid fa-circle-info"></i>Para comprar mais unidades, use Estoque → “Movimentar estoque” (Entrada). Alterar custo, preço, nome ou quantidade aqui <b>não</b> gera lançamento financeiro.</p>`
            }
          </div>
        </div>
      </form>`;
  }

  function openForm(id) {
    const p = id ? DB.produtos.find(id) : {};
    const isNovo = !id;
    UI.openModal({
      title: isNovo ? "Novo produto" : "Editar produto",
      size: 760,
      body: form(p),
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="prodSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    const codEl = UI.$("#codAuto");
    const catSel = UI.$("#prodForm [name=categoria]");
    if (codEl && catSel && isNovo) {
      const atualizaCodigo = () => { codEl.value = proximoCodigo(catSel.value) || ""; };
      atualizaCodigo();
      catSel.addEventListener("change", atualizaCodigo);
    }

    // Cálculo em tempo real
    const cEl = UI.$("#fCusto");
    const vEl = UI.$("#fPreco");
    const qEl = UI.$("#fQtd");
    const totInv = UI.$("#totInv");
    const totVD = UI.$("#totVD");
    const margemLive = UI.$("#margemLive");
    const upd = () => {
      const c = Number(cEl.value) || 0;
      const v = Number(vEl.value) || 0;
      const q = Number(qEl.value) || 0;
      totInv.textContent = Utils.money(ar2(c * q));
      totVD.textContent = Utils.money(ar2(v * q));
      const m = margensTexto(c, v);
      margemLive.textContent = m.texto;
      margemLive.className = "calc-live " + m.classe;
    };
    cEl.addEventListener("input", upd);
    vEl.addEventListener("input", upd);
    qEl.addEventListener("input", upd);

    UI.$("#prodSave").onclick = () => {
      const data = Object.fromEntries(new FormData(UI.$("#prodForm")).entries());
      const errs = {};
      if (!data.nome.trim()) errs.nome = "Informe o nome do produto.";
      if (data.preco === "" || Number(data.preco) < 0) errs.preco = "Informe um preço válido.";
      const custo = data.custoUnitario === "" || data.custoUnitario == null ? 0 : Number(data.custoUnitario);
      if (data.custoUnitario !== "" && data.custoUnitario != null && (Number.isNaN(custo) || custo < 0))
        errs.custoUnitario = "Informe um custo válido (0 ou maior).";
      document
        .querySelectorAll("#prodForm .error")
        .forEach((e) => (e.textContent = errs[e.dataset.err] || ""));
      if (Object.keys(errs).length) return;
      data.preco = ar2(Number(data.preco));
      data.custoUnitario = Math.max(0, ar2(custo || 0));
      data.quantidade = Math.max(0, Math.floor(Number(data.quantidade) || 0));
      data.estoqueMinimo =
        data.estoqueMinimo === "" || data.estoqueMinimo == null ? null : Number(data.estoqueMinimo);
      UI.withLoading(() => {
        if (isNovo) {
          const novo = DB.produtos.insert(data);
          registrarCompra(novo, data.quantidade, data.custoUnitario, "Compra inicial (cadastro)");
        } else {
          DB.produtos.update(id, data);
        }
        UI.closeModal();
        UI.toast(isNovo ? "Produto cadastrado!" : "Produto atualizado!");
        App.refresh();
      });
    };
  }
/**
   * Registra uma compra de estoque de forma consistente:
   *  1) insere a movimentação de entrada (com o custo da compra — preserva o histórico);
   *  2) lança a saída no Financeiro (origem = "produto", com produtoId e movimentoId).
   * Só gera lançamento quando quantidade E custo são > 0 — jamais durante edições.
   */
  function registrarCompra(produto, qtd, custoUnitario, motivo) {
    const q = Math.floor(Number(qtd) || 0);
    const c = Math.max(0, ar2(Number(custoUnitario) || 0));
    const total = ar2(q * c);
    if (q <= 0 || c <= 0) return;
    const mov = DB.movimentacoes.insert({
      produtoId: produto.id,
      produto: produto.nome,
      tipo: "entrada",
      quantidade: q,
      custoUnitario: c,
      custoTotal: total,
      motivo: motivo || "Entrada de estoque",
      data: new Date().toISOString(),
    });
    DB.financeiro.insert({
      tipo: "saida",
      categoria: "Produto / Estoque",
      descricao: `Compra de ${q} unidades de ${produto.nome}`,
      valor: total,
      data: new Date().toISOString(),
      origem: "produto",
      produtoId: produto.id,
      movimentoId: mov.id,
    });
  }

  function verDetalhe(id) {
    const p = DB.produtos.find(id);
    if (!p) return;
    const q = Number(p.quantidade) || 0;
    const c = custoUnit(p);
    const pct = margemPct(p);
    const compras = DB.movimentacoes.where(
      (m) => m.produtoId === id && m.tipo === "entrada" && (Number(m.custoTotal) || 0) > 0,
    );
    UI.openModal({
      title: Utils.escape(p.nome),
      size: 560,
      body: `
        <div class="list" style="display:flex;flex-direction:column;gap:8px">
          <div class="list__item"><div><strong>Preço de venda</strong></div><span class="badge">${Utils.money(p.preco)}</span></div>
          <div class="list__item"><div><strong>Custo unitário</strong><small>${c > 0 ? "Cadastrado" : "Sem custo cadastrado"}</small></div><span class="badge">${c > 0 ? Utils.money(c) : "—"}</span></div>
          <div class="list__item"><div><strong>Estoque</strong></div><span class="badge">${q} un.</span></div>
          <div class="list__item"><div><strong>Custo do estoque</strong><small>${q} un. × ${Utils.money(c)}</small></div><span class="badge badge--warn">${Utils.money(custoEstoque(p))}</span></div>
          <div class="list__item"><div><strong>Valor potencial de venda</strong><small>${q} un. × ${Utils.money(p.preco)}</small></div><span class="badge badge--info">${Utils.money(valorVenda(p))}</span></div>
          <div class="list__item"><div><strong>Margem bruta potencial</strong><small>estimativa, não é lucro líquido</small></div><span class="badge badge--success">${Utils.money(margemTotal(p))} ${pct == null ? "" : `(${pct}%)`}</span></div>
        </div>
        ${
          compras.length
            ? `<h3 style="margin:16px 0 8px;font-size:15px;color:var(--text-muted)">Histórico de compras</h3>
               <div class="list" style="display:flex;flex-direction:column;gap:8px">${compras
                 .map(
                   (m) =>
                     `<div class="list__item"><div><strong>${m.quantidade} un. × ${Utils.money(m.custoUnitario)}</strong><small>${Utils.date(m.data)} — ${Utils.money(m.custoTotal)}</small></div><span class="badge badge--warn">${Utils.money(m.custoTotal)}</span></div>`,
                 )
                 .join("")}</div>`
            : ""
        }`,
      footer: `<button class="btn btn--ghost" data-close>Fechar</button>`,
    });
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
      const view = e.target.closest("[data-view]");
      if (view) return verDetalhe(view.dataset.view);
      const edit = e.target.closest("[data-edit]");
      if (edit) return openForm(edit.dataset.edit);
      const del = e.target.closest("[data-del]");
      if (del) {
        const p = DB.produtos.find(del.dataset.del);
return UI.confirm({
          message: `Excluir o produto “${p.nome}”? Esta ação não pode ser desfeita.`,
          tone: "danger",
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
  const state = { tipo: "", term: "", page: 1, perPage: 8, pageProd: 1, perPageProd: 8 };

  function badgeInv(p) {
    const q = Number(p.quantidade) || 0;
    if (q <= 0) return `<span class="badge badge--danger">Sem estoque</span>`;
    if (q <= Utils.limiteMinimo(p)) return `<span class="badge badge--warn">${q} un. (baixo)</span>`;
    return `<span class="badge badge--success">${q} un.</span>`;
  }

  function movimentar() {
    const produtos = Utils.sort(DB.produtos.all(), "nome");
    if (!produtos.length)
      return UI.toast("Cadastre um produto antes de movimentar o estoque.", "warn");
    UI.openModal({
      title: "Nova movimentação",
      size: 560,
      body: `
        <form id="movForm" class="form-grid">
          <div class="field col-2"><label>Produto *</label>
            <select name="produtoId" id="movProd">${produtos.map((p) => `<option value="${p.id}" data-custo="${p.custoUnitario || 0}">${Utils.escape(p.nome)} — ${p.quantidade || 0} un.</option>`).join("")}</select>
          </div>
          <div class="field"><label>Tipo</label>
            <select name="tipo" id="movTipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
          </div>
          <div class="field"><label>Quantidade *</label><input name="quantidade" id="movQtd" type="number" min="1" value="1" /><span class="error" data-err="quantidade"></span></div>
          <div class="field" id="movCustoWrap"><label>Custo unitário (compra)</label>
            <div class="money-input"><span>R$</span><input name="custoUnitario" id="movCusto" type="number" step="0.01" min="0" value="" placeholder="0,00" /></div>
            <small style="color:var(--text-muted)">Vazio = custo padrão do produto</small>
          </div>
          <div class="field" id="movTotalWrap"><label>Total da compra</label><div id="movTotal" class="calc-live is-muted">R$ 0,00</div></div>
          <div class="field col-2"><label>Motivo / observação</label><input name="motivo" placeholder="Compra de fornecedor, ajuste, perda..." /></div>
        </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="movSave"><i class="fa-solid fa-arrow-right-arrow-left"></i>Registrar</button>`,
    });

    const prodSel = UI.$("#movProd");
    const tipoSel = UI.$("#movTipo");
    const custoEl = UI.$("#movCusto");
    const qtdEl = UI.$("#movQtd");
    const custoWrap = UI.$("#movCustoWrap");
    const totalWrap = UI.$("#movTotalWrap");
    const totalEl = UI.$("#movTotal");

    const atualizaResumo = () => {
      const ehEntrada = tipoSel.value === "entrada";
      custoWrap.style.display = ehEntrada ? "flex" : "none";
      totalWrap.style.display = ehEntrada ? "flex" : "none";
      if (ehEntrada) {
        const c = Number(custoEl.value) || 0;
        const q = Number(qtdEl.value) || 0;
        const t = Math.round(c * q * 100) / 100;
        totalEl.textContent = Utils.money(t);
        totalEl.className = "calc-live" + (t > 0 ? "" : " is-muted");
      }
    };

    tipoSel.addEventListener("change", atualizaResumo);
    custoEl.addEventListener("input", atualizaResumo);
    qtdEl.addEventListener("input", atualizaResumo);
    prodSel.addEventListener("change", () => {
      const opt = prodSel.selectedOptions[0];
      custoEl.value = opt && opt.dataset.custo ? opt.dataset.custo : "";
      atualizaResumo();
    });
    atualizaResumo();

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
      // Custo da entrada: se informado, usa; senão usa o custo padrão do produto.
      const custo = d.tipo === "entrada" ? Math.max(0, Math.round((Number(d.custoUnitario) || prod.custoUnitario || 0) * 100) / 100) : 0;
      const total = Math.round(qtd * custo * 100) / 100;
      UI.withLoading(() => {
        const nova = (Number(prod.quantidade) || 0) + (d.tipo === "entrada" ? qtd : -qtd);
        const patch = { quantidade: nova };
        // Entrada com custo atualiza o custo unitário corrente do produto.
        if (d.tipo === "entrada" && custo > 0) patch.custoUnitario = custo;
        DB.produtos.update(prod.id, patch);
        const mov = DB.movimentacoes.insert({
          produtoId: prod.id,
          produto: prod.nome,
          tipo: d.tipo,
          quantidade: qtd,
          custoUnitario: d.tipo === "entrada" ? custo : 0,
          custoTotal: d.tipo === "entrada" ? total : 0,
          motivo: d.motivo,
          data: new Date().toISOString(),
        });
        // Compra (entrada com custo) gera saída financeira vinculada.
        if (d.tipo === "entrada" && total > 0) {
          DB.financeiro.insert({
            tipo: "saida",
            categoria: "Produto / Estoque",
            descricao: `Compra de ${qtd} unidades de ${prod.nome}`,
            valor: total,
            data: new Date().toISOString(),
            origem: "produto",
            produtoId: prod.id,
            movimentoId: mov.id,
          });
        }
        UI.closeModal();
        UI.toast(`${d.tipo === "entrada" ? "Entrada" : "Saída"} registrada!`);
        App.refresh();
      });
    };
  }

  function render() {
    const produtos = DB.produtos.all();
    const alertas = produtos.filter((p) => (Number(p.quantidade) || 0) <= Utils.limiteMinimo(p));
    let movs = Utils.sort(DB.movimentacoes.all(), "data", "desc");
    if (state.tipo) movs = movs.filter((m) => m.tipo === state.tipo);
    const pageList = Utils.paginate(movs, state.page, state.perPage);
    const invList = Utils.sort(Utils.search(produtos, state.term, ["nome", "categoria", "codigo"]), "nome", "asc");
    const invRows = Utils.paginate(invList, state.pageProd, state.perPageProd);

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-arrow-down"></i><div><strong>${DB.movimentacoes.where((m) => m.tipo === "entrada").length}</strong><small>Entradas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-arrow-up"></i><div><strong>${DB.movimentacoes.where((m) => m.tipo === "saida").length}</strong><small>Saídas</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-bell"></i><div><strong>${alertas.length}</strong><small>Alertas de estoque</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnMov"><i class="fa-solid fa-arrow-right-arrow-left"></i>Movimentar estoque</button>
      </div>

      <div class="card">
        <div class="card__head"><div><h3>Estoque completo</h3><p>Todos os produtos cadastrados, incluindo sem estoque</p></div>
          <div class="search" style="max-width:260px"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="invSearch" type="search" placeholder="Buscar no estoque..." value="${Utils.escape(state.term)}" />
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Código</th><th>Estoque atual</th><th>Limite mín.</th><th>Custo</th><th>Status</th></tr></thead>
            <tbody>
              ${invRows.length
                ? invRows.map((p) => {
                    const cu = Math.round((Number(p.custoUnitario) || 0) * 100) / 100;
                    return `
                    <tr>
                      <td><strong>${Utils.escape(p.nome)}</strong><small>${Utils.escape(p.fornecedor || "")}</small></td>
                      <td>${Utils.escape(p.categoria || "—")}</td>
                      <td>${Utils.escape(p.codigo || "—")}</td>
                      <td><strong>${Number(p.quantidade) || 0} un.</strong></td>
                      <td>${Utils.limiteMinimo(p)} un.</td>
                      <td>${stack(cu > 0 ? Utils.money(cu) : "—", Utils.money(Math.round(((Number(p.quantidade) || 0) * cu) * 100) / 100))}</td>
                      <td>${badgeInv(p)}</td>
                    </tr>`;
                  }).join("")
                : `<tr><td colspan="7">${UI.empty("fa-box-open", "Nenhum produto", state.term ? "Tente outra busca." : "Cadastre produtos para ver o estoque.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${invList.length ? UI.pagination(invList.length, state.pageProd, state.perPageProd, "data-pnavprod") : ""}
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
              <thead><tr><th>Produto</th><th>Tipo</th><th>Qtd.</th><th>Custo</th><th>Data</th><th style="text-align:right">Ações</th></tr></thead>
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

                    <td>${m.tipo === "entrada" && (Number(m.custoTotal) || 0) > 0 ? `<span class="badge badge--warn">${Utils.money(m.custoTotal)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>

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
                    <td colspan="6">
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
          <div class="card__head"><div><h3>Alertas de estoque baixo</h3><p>Produtos igual ou abaixo do limite mínimo</p></div></div>
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

  const invSearch = UI.$("#invSearch");
  if (invSearch) invSearch.addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; state.pageProd = 1; App.refresh(true); }, 300));

  root.addEventListener("click", (e) => {

    // Excluir movimentação
    const delMov = e.target.closest("[data-del-mov]");

    if (delMov) {

      const mov = DB.movimentacoes.find(delMov.dataset.delMov);

      if (!mov) return;

      const produto = DB.produtos.find(mov.produtoId);

UI.confirm({
        message: "Excluir esta movimentação do estoque?",
        tone: "danger",

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

          // Se a movimentação era uma compra (entrada com custo), remove também o
          // lançamento financeiro vinculado — evita despesa órfã/duplicada.
          DB.financeiro
            .where((f) => f.origem === "produto" && f.movimentoId === mov.id && f.tipo === "saida")
            .forEach((f) => DB.financeiro.remove(f.id));

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

    const pnav = e.target.closest("[data-pnavprod]");
    if (pnav && !pnav.disabled) {
      state.pageProd = Number(pnav.dataset.pnavprod);
      return App.refresh();
    }

  });
}

  return { render, mount };
})();
