/** vendas.js — PDV: carrinho, cliente, desconto, pagamento, recibo e histórico */

const Vendas = (() => {
  const PAGAMENTOS = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Transferência"];
  const state = {
    cart: [],            // { produtoId, nome, preco, qtd }
    clienteId: "",
    descontoTipo: "valor", // "valor" | "percent"
    desconto: 0,
    pagamento: "Pix",
    term: "",
    page: 1,
    perPage: 6,
  };

  /* ---------- Cálculos ---------- */
  const subtotal = () => state.cart.reduce((s, i) => s + i.preco * i.qtd, 0);
  const descontoValor = () => {
    const sub = subtotal();
    const d = state.descontoTipo === "percent" ? (sub * (Number(state.desconto) || 0)) / 100 : Number(state.desconto) || 0;
    return Math.min(Math.max(d, 0), sub);
  };
  const total = () => subtotal() - descontoValor();

  /* ---------- Carrinho ---------- */
  function addItem(produtoId) {
    const p = DB.produtos.find(produtoId);
    if (!p) return;
    const estoque = Number(p.quantidade) || 0;
    const item = state.cart.find((i) => i.produtoId === p.id);
    if ((item?.qtd || 0) + 1 > estoque) return UI.toast(`Estoque insuficiente para “${p.nome}”.`, "warn");
    if (item) item.qtd++;
    else state.cart.push({ produtoId: p.id, nome: p.nome, preco: Number(p.preco) || 0, qtd: 1 });
    App.refresh();
  }

  function setQtd(produtoId, qtd) {
    const p = DB.produtos.find(produtoId);
    const item = state.cart.find((i) => i.produtoId === produtoId);
    if (!item) return;
    const max = Number(p?.quantidade) || 0;
    item.qtd = Math.min(Math.max(1, Number(qtd) || 1), max || 1);
    App.refresh();
  }

  const removeItem = (id) => { state.cart = state.cart.filter((i) => i.produtoId !== id); App.refresh(); };
  const limpar = () => { state.cart = []; state.desconto = 0; state.clienteId = ""; App.refresh(); };

  /* ---------- Finalização ---------- */
  function finalizar() {
    if (!state.cart.length) return UI.toast("Adicione ao menos um produto ao carrinho.", "warn");
    const cliente = state.clienteId ? DB.clientes.find(state.clienteId) : null;
    const venda = {
      numero: "VD-" + String(DB.vendas.count() + 1001),
      data: new Date().toISOString(),
      clienteId: state.clienteId || "",
      cliente: cliente?.nome || "Consumidor final",
      itens: state.cart.map((i) => ({ ...i, subtotal: i.preco * i.qtd })),
      subtotal: subtotal(),
      descontoTipo: state.descontoTipo,
      descontoInformado: Number(state.desconto) || 0,
      desconto: descontoValor(),
      total: total(),
      pagamento: state.pagamento,
    };

    UI.withLoading(() => {
      // baixa de estoque + movimentações
      venda.itens.forEach((i) => {
        const p = DB.produtos.find(i.produtoId);
        if (p) {
          DB.produtos.update(p.id, { quantidade: Math.max(0, (Number(p.quantidade) || 0) - i.qtd) });
          DB.movimentacoes.insert({ produtoId: p.id, produto: p.nome, tipo: "saida", quantidade: i.qtd, motivo: `Venda ${venda.numero}`, data: venda.data });
        }
      });
      const saved = DB.vendas.insert(venda);
      DB.financeiro.insert({ tipo: "entrada", categoria: "Venda", descricao: `${venda.numero} — ${venda.cliente}`, valor: venda.total, data: venda.data, origem: "venda" });
      limpar();
      UI.toast("Venda finalizada com sucesso!");
      recibo(saved.id);
    });
  }

  /* ---------- Recibo ---------- */
  function reciboHTML(v) {
    const s = DB.settings.get();
    return `
      <div class="receipt" id="receipt">
        <div class="receipt__head">
          <strong>${Utils.escape(s.empresa)}</strong>
          <span>Recibo de venda ${Utils.escape(v.numero || "")}</span>
        </div>
        <div class="receipt__meta">
          <div><small>Cliente</small><strong>${Utils.escape(v.cliente || "Consumidor final")}</strong></div>
          <div><small>Data</small><strong>${Utils.date(v.data)}</strong></div>
          <div><small>Pagamento</small><strong>${Utils.escape(v.pagamento || "—")}</strong></div>
        </div>
        <table class="receipt__table">
          <thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
          <tbody>
            ${(v.itens || []).map((i) => `<tr><td>${Utils.escape(i.nome)}</td><td>${i.qtd}</td><td>${Utils.money(i.preco)}</td><td>${Utils.money(i.preco * i.qtd)}</td></tr>`).join("") || `<tr><td colspan="4">Sem itens detalhados</td></tr>`}
          </tbody>
        </table>
        <div class="receipt__totals">
          <div><span>Subtotal</span><span>${Utils.money(v.subtotal ?? v.total)}</span></div>
          <div><span>Desconto</span><span>- ${Utils.money(v.desconto || 0)}</span></div>
          <div class="is-total"><span>Total</span><span>${Utils.money(v.total)}</span></div>
        </div>
        <p class="receipt__foot">Obrigado pela preferência! 🌊 Documento sem valor fiscal.</p>
      </div>`;
  }

  function recibo(id) {
    const v = DB.vendas.find(id);
    if (!v) return;
    UI.openModal({
      title: "Recibo da venda",
      size: 560,
      body: reciboHTML(v),
      footer: `<button class="btn btn--ghost" data-close>Fechar</button>
               <button class="btn btn--primary" id="vdPrint"><i class="fa-solid fa-print"></i>Imprimir / PDF</button>`,
    });
    UI.$("#vdPrint").onclick = () => {
      const w = window.open("", "_blank", "width=420,height=640");
      w.document.write(`<html><head><title>Recibo ${Utils.escape(v.numero || "")}</title>
        <style>body{font-family:system-ui,sans-serif;padding:18px;color:#12212e}
        table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
        th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}
        .receipt__totals div{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
        .is-total{font-weight:700;font-size:15px;border-top:1px solid #333;margin-top:6px;padding-top:6px}
        .receipt__meta div{margin-bottom:4px;font-size:13px} small{color:#667;display:block}
        </style></head><body>${reciboHTML(v)}</body></html>`);
      w.document.close();
      w.focus();
      w.print();
    };
  }

  /* ---------- Render ---------- */
  function render() {
    const produtos = Utils.sort(Utils.search(DB.produtos.all(), state.term, ["nome", "codigo", "categoria"]), "nome");
    const clientes = Utils.sort(DB.clientes.all(), "nome");
    const historico = Utils.sort(DB.vendas.all(), "data", "desc");
    const pageList = Utils.paginate(historico, state.page, state.perPage);
    const hoje = historico.filter((v) => Utils.isSameDay(v.data));

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-cart-shopping"></i><div><strong>${hoje.length}</strong><small>Vendas hoje</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-money-bill-wave"></i><div><strong>${Utils.money(hoje.reduce((s, v) => s + (v.total || 0), 0))}</strong><small>Faturamento do dia</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-receipt"></i><div><strong>${historico.length}</strong><small>Vendas registradas</small></div></div>
        </div>
        <button class="btn btn--ghost" id="vdLimpar"><i class="fa-solid fa-eraser"></i>Limpar carrinho</button>
      </div>

      <div class="pdv">
        <div class="card">
          <div class="card__head"><div><h3>Produtos disponíveis</h3><p>Clique para adicionar ao carrinho</p></div></div>
          <div class="card__body">
            <div class="search" style="margin-bottom:12px"><i class="fa-solid fa-magnifying-glass"></i>
              <input id="vdSearch" style="border-radius: 5px;" type="search" placeholder="Buscar produto..." value="${Utils.escape(state.term)}" />
            </div>
            <div class="pdv-grid">
              ${produtos.length
                ? produtos.map((p) => {
                    const q = Number(p.quantidade) || 0;
                    return `
                      <button class="pdv-card ${q <= 0 ? "is-off" : ""}" data-add="${p.id}" ${q <= 0 ? "disabled" : ""}>
                        <span class="pdv-card__cat">${Utils.escape(p.categoria || "—")}</span>
                        <strong>${Utils.escape(p.nome)}</strong>
                        <span class="pdv-card__price">${Utils.money(p.preco)}</span>
                        <small>${q} em estoque</small>
                      </button>`;
                  }).join("")
                : UI.empty("fa-box-open", "Nenhum produto", "Cadastre produtos no módulo Produtos.")}
            </div>
          </div>
        </div>

        <div class="card cart">
          <div class="card__head"><div><h3>Carrinho</h3><p>${state.cart.length} item(ns)</p></div></div>
          <div class="card__body">
            <div class="field"><label>Cliente</label>
              <select id="vdCliente">
                <option value="">Consumidor final</option>
                ${clientes.map((c) => `<option value="${c.id}" ${state.clienteId === c.id ? "selected" : ""}>${Utils.escape(c.nome)}</option>`).join("")}
              </select>
            </div>

            <ul class="cart-list">
              ${state.cart.length
                ? state.cart.map((i) => `
                  <li class="cart-item">
                    <div><strong>${Utils.escape(i.nome)}</strong><small>${Utils.money(i.preco)} un.</small></div>
                    <div class="cart-item__qty">
                      <button class="qty-btn" data-dec="${i.produtoId}">−</button>
                      <input type="number" min="1" value="${i.qtd}" data-qty="${i.produtoId}" />
                      <button class="qty-btn" data-inc="${i.produtoId}">+</button>
                    </div>
                    <strong>${Utils.money(i.preco * i.qtd)}</strong>
                    <button class="icon-btn btn--sm" data-rm="${i.produtoId}" style="width:30px;height:30px"><i class="fa-solid fa-xmark"></i></button>
                  </li>`).join("")
                : `<li class="cart-empty"><i class="fa-solid fa-cart-shopping"></i><span>Carrinho vazio</span></li>`}
            </ul>

            <div class="form-grid" style="margin-top:6px">
              <div class="field"><label>Desconto</label>
                <input id="vdDesconto" type="number" min="0" step="0.01" value="${state.desconto}" />
              </div>
              <div class="field"><label>Tipo</label>
                <select id="vdDescTipo">
                  <option value="valor" ${state.descontoTipo === "valor" ? "selected" : ""}>R$</option>
                  <option value="percent" ${state.descontoTipo === "percent" ? "selected" : ""}>%</option>
                </select>
              </div>
              <div class="field col-2"><label>Forma de pagamento</label>
                <select id="vdPagamento">${PAGAMENTOS.map((p) => `<option ${state.pagamento === p ? "selected" : ""}>${p}</option>`).join("")}</select>
              </div>
            </div>

            <div class="cart-totals">
              <div><span>Subtotal</span><span>${Utils.money(subtotal())}</span></div>
              <div><span>Desconto</span><span>- ${Utils.money(descontoValor())}</span></div>
              <div class="is-total"><span>Total</span><span>${Utils.money(total())}</span></div>
            </div>

            <button class="btn btn--primary" id="vdFinalizar" style="width:100%;justify-content:center;margin-top:12px" ${state.cart.length ? "" : "disabled"}>
              <i class="fa-solid fa-circle-check"></i>Finalizar venda
            </button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="card__head"><div><h3>Histórico de vendas</h3><p>Recibos gerados</p></div></div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Venda</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Data</th><th style="text-align:right">Ações</th></tr></thead>
            <tbody>
              ${pageList.length
                ? pageList.map((v) => `
                  <tr>
                    <td><strong>${Utils.escape(v.numero || "—")}</strong></td>
                    <td>${Utils.escape(v.cliente || "Consumidor final")}</td>
                    <td><span class="badge">${Utils.escape(v.pagamento || "—")}</span></td>
                    <td><strong>${Utils.money(v.total)}</strong></td>
                    <td>${Utils.date(v.data)}</td>
                    <td><div class="row-actions">
                      <button class="icon-btn btn--sm" data-rec="${v.id}" data-tip="Recibo" style="width:32px;height:32px"><i class="fa-solid fa-receipt"></i></button>
                      <button class="icon-btn btn--sm" data-delv="${v.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                  </tr>`).join("")
                : `<tr><td colspan="6">${UI.empty("fa-receipt", "Nenhuma venda registrada", "Finalize uma venda para ver o histórico.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        ${historico.length ? UI.pagination(historico.length, state.page, state.perPage) : ""}
      </div>`;
  }

  function mount(root) {
    UI.$("#vdSearch").addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; App.refresh(true); }, 300));
    UI.$("#vdCliente").onchange = (e) => (state.clienteId = e.target.value);
    UI.$("#vdPagamento").onchange = (e) => (state.pagamento = e.target.value);
    UI.$("#vdDescTipo").onchange = (e) => { state.descontoTipo = e.target.value; App.refresh(); };
    UI.$("#vdDesconto").addEventListener("input", Utils.debounce((e) => { state.desconto = Number(e.target.value) || 0; App.refresh(true); }, 350));
    UI.$("#vdFinalizar").onclick = finalizar;
    UI.$("#vdLimpar").onclick = limpar;

    root.addEventListener("change", (e) => {
      const qty = e.target.closest("[data-qty]");
      if (qty) setQtd(qty.dataset.qty, qty.value);
    });

    root.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) return addItem(add.dataset.add);
      const inc = e.target.closest("[data-inc]");
      if (inc) return addItem(inc.dataset.inc);
      const dec = e.target.closest("[data-dec]");
      if (dec) {
        const item = state.cart.find((i) => i.produtoId === dec.dataset.dec);
        return item && item.qtd > 1 ? setQtd(item.produtoId, item.qtd - 1) : removeItem(dec.dataset.dec);
      }
      const rm = e.target.closest("[data-rm]");
      if (rm) return removeItem(rm.dataset.rm);
      const rec = e.target.closest("[data-rec]");
      if (rec) return recibo(rec.dataset.rec);
      const del = e.target.closest("[data-delv]");
      if (del) {
        return UI.confirm({
          message: "Excluir esta venda do histórico? O estoque não será devolvido automaticamente.",
          onConfirm: () => UI.withLoading(() => { DB.vendas.remove(del.dataset.delv); UI.toast("Venda excluída.", "info"); App.refresh(); }),
        });
      }
      const nav = e.target.closest("[data-page-nav]");
      if (nav && !nav.disabled) { state.page = Number(nav.dataset.pageNav); App.refresh(); }
    });
  }

  return { render, mount };
})();
