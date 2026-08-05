/** clientes.js — CRUD completo com busca em tempo real, ordenação e paginação */

const Clientes = (() => {
  const state = { term: "", sort: { key: "nome", dir: "asc" }, page: 1, perPage: 8 };
  const FIELDS = ["nome", "cpf", "telefone", "email", "endereco"];

  const COLUMNS = [
    { key: "nome", label: "Cliente" },
    { key: "cpf", label: "CPF" },
    { key: "telefone", label: "Telefone" },
    { key: "email", label: "E-mail" },
    { key: "criadoEm", label: "Cadastro" },
    { label: "Ações", style: "text-align:right" },
  ];

  function filtered() {
    const list = Utils.search(DB.clientes.all(), state.term, FIELDS);
    return Utils.sort(list, state.sort.key, state.sort.dir);
  }

  function rows(list) {
    if (!list.length)
      return `<tr><td colspan="6">${UI.empty(
        "fa-user-plus",
        state.term ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado",
        state.term ? "Tente outro termo de busca." : "Clique em “Novo cliente” para começar."
      )}</td></tr>`;

    return list
      .map(
        (c) => `
      <tr>
        <td>
          <div class="cli-cell">
            <span class="cli-avatar">${Utils.initials(c.nome)}</span>
            <div><strong>${Utils.escape(c.nome)}</strong><small>${Utils.escape(c.endereco || "Sem endereço")}</small></div>
          </div>
        </td>
        <td>${Utils.escape(c.cpf || "—")}</td>
        <td>
          ${Utils.escape(c.telefone || "—")}
          ${c.whatsapp ? `<br><a class="link-wa" target="_blank" rel="noopener" href="https://wa.me/55${Utils.onlyDigits(c.whatsapp)}"><i class="fa-brands fa-whatsapp"></i> ${Utils.escape(c.whatsapp)}</a>` : ""}
        </td>
        <td>${Utils.escape(c.email || "—")}</td>
        <td>${Utils.date(c.criadoEm)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn btn--sm" data-view="${c.id}" data-tip="Detalhes" style="width:32px;height:32px"><i class="fa-solid fa-eye"></i></button>
            <button class="icon-btn btn--sm" data-edit="${c.id}" data-tip="Editar" style="width:32px;height:32px"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn btn--sm" data-del="${c.id}" data-tip="Excluir" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`
      )
      .join("");
  }

  function render() {
    const all = DB.clientes.all();
    const list = filtered();
    const pageList = Utils.paginate(list, state.page, state.perPage);
    const comWhats = all.filter((c) => c.whatsapp).length;
    const novosMes = all.filter((c) => Utils.isSameMonth(c.criadoEm)).length;

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-users"></i><div><strong>${all.length}</strong><small>Total de clientes</small></div></div>
          <div class="mini-stat"><i class="fa-brands fa-whatsapp"></i><div><strong>${comWhats}</strong><small>Com WhatsApp</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-user-plus"></i><div><strong>${novosMes}</strong><small>Novos neste mês</small></div></div>
        </div>
        <button class="btn btn--primary" id="btnNovoCliente"><i class="fa-solid fa-plus"></i>Novo cliente</button>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input id="cliSearch" type="search" placeholder="Buscar por nome, CPF, telefone ou e-mail..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="cliSort">
            <option value="nome:asc" ${state.sort.key === "nome" && state.sort.dir === "asc" ? "selected" : ""}>Nome (A–Z)</option>
            <option value="nome:desc" ${state.sort.key === "nome" && state.sort.dir === "desc" ? "selected" : ""}>Nome (Z–A)</option>
            <option value="criadoEm:desc" ${state.sort.key === "criadoEm" && state.sort.dir === "desc" ? "selected" : ""}>Mais recentes</option>
            <option value="criadoEm:asc" ${state.sort.key === "criadoEm" && state.sort.dir === "asc" ? "selected" : ""}>Mais antigos</option>
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

  /* ---------- Formulário ---------- */
  function form(cliente = {}) {
    const v = (k) => Utils.escape(cliente[k] || "");
    return `
      <form id="cliForm" class="form-grid" novalidate>
        <div class="field col-2"><label>Nome completo *</label><input name="nome" value="${v("nome")}" placeholder="Ex.: Ana Beatriz Souza" /><span class="error" data-err="nome"></span></div>
        <div class="field"><label>CPF</label><input name="cpf" data-mask="cpf" value="${v("cpf")}" placeholder="000.000.000-00" /><span class="error" data-err="cpf"></span></div>
        <div class="field"><label>Telefone</label><input name="telefone" data-mask="phone" value="${v("telefone")}" placeholder="(00) 00000-0000" /></div>
        <div class="field"><label>WhatsApp</label><input name="whatsapp" data-mask="phone" value="${v("whatsapp")}" placeholder="(00) 00000-0000" /></div>
        <div class="field"><label>E-mail</label><input name="email" value="${v("email")}" placeholder="cliente@email.com" /><span class="error" data-err="email"></span></div>
        <div class="field col-2"><label>Endereço</label><input name="endereco" value="${v("endereco")}" placeholder="Rua, número, bairro, cidade" /></div>
        <div class="field col-2"><label>Observações</label><textarea name="observacoes" placeholder="Preferências, histórico, tamanho de prancha...">${v("observacoes")}</textarea></div>
      </form>`;
  }

  function openForm(id) {
    const cliente = id ? DB.clientes.find(id) : {};
    UI.openModal({
      title: id ? "Editar cliente" : "Novo cliente",
      body: form(cliente),
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               <button class="btn btn--primary" id="cliSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    const formEl = UI.$("#cliForm");
    formEl.querySelectorAll("[data-mask]").forEach((input) => {
      input.addEventListener("input", (e) => {
        const type = e.target.dataset.mask;
        e.target.value = type === "cpf" ? Utils.maskCPF(e.target.value) : Utils.maskPhone(e.target.value);
      });
    });

    UI.$("#cliSave").onclick = () => {
      const data = Object.fromEntries(new FormData(formEl).entries());
      formEl.querySelectorAll(".error").forEach((e) => (e.textContent = ""));

      const errors = {};
      if (!data.nome.trim()) errors.nome = "Informe o nome do cliente.";
      if (data.cpf && !Utils.validCPF(data.cpf)) errors.cpf = "CPF inválido.";
      if (data.email && !Utils.validEmail(data.email)) errors.email = "E-mail inválido.";

      const duplicado = DB.clientes.all().find(
        (c) => data.cpf && c.cpf === data.cpf && c.id !== id
      );
      if (duplicado) errors.cpf = "Já existe um cliente com este CPF.";

      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([k, msg]) => {
          const el = formEl.querySelector(`[data-err="${k}"]`);
          if (el) el.textContent = msg;
        });
        UI.toast("Revise os campos destacados.", "warn");
        return;
      }

      UI.withLoading(() => {
        id ? DB.clientes.update(id, data) : DB.clientes.insert(data);
        UI.closeModal();
        UI.toast(id ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
        App.refresh();
      });
    };
  }

  function openDetail(id) {
    const c = DB.clientes.find(id);
    if (!c) return;
    const item = (label, value, full) =>
      `<div class="item ${full ? "col-2" : ""}"><span>${label}</span><strong>${Utils.escape(value || "—")}</strong></div>`;
    UI.openModal({
      title: c.nome,
      size: 560,
      body: `<div class="detail-grid">
        ${item("CPF", c.cpf)}${item("Telefone", c.telefone)}
        ${item("WhatsApp", c.whatsapp)}${item("E-mail", c.email)}
        ${item("Endereço", c.endereco, true)}
        ${item("Observações", c.observacoes, true)}
        ${item("Cadastrado em", Utils.date(c.criadoEm))}${item("Atualizado em", Utils.date(c.atualizadoEm))}
      </div>`,
      footer: `<button class="btn btn--ghost" data-close>Fechar</button>
               <button class="btn btn--primary" id="detEdit"><i class="fa-solid fa-pen"></i>Editar</button>`,
    });
    UI.$("#detEdit").onclick = () => openForm(id);
  }

  /* ---------- Eventos da página ---------- */
  function mount(root) {
    UI.$("#btnNovoCliente").onclick = () => openForm();

    const search = UI.$("#cliSearch");
    search.addEventListener(
      "input",
      Utils.debounce((e) => {
        state.term = e.target.value;
        state.page = 1;
        App.refresh(true);
      }, 200)
    );

    UI.$("#cliSort").onchange = (e) => {
      const [key, dir] = e.target.value.split(":");
      state.sort = { key, dir };
      App.refresh();
    };

    root.addEventListener("click", (e) => {
      const th = e.target.closest("[data-sort]");
      if (th) {
        const key = th.dataset.sort;
        state.sort = { key, dir: state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc" };
        return App.refresh();
      }

      const nav = e.target.closest("[data-page-nav]");
      if (nav) {
        state.page = Number(nav.dataset.pageNav);
        return App.refresh();
      }

      const view = e.target.closest("[data-view]");
      if (view) return openDetail(view.dataset.view);

      const edit = e.target.closest("[data-edit]");
      if (edit) return openForm(edit.dataset.edit);

      const del = e.target.closest("[data-del]");
      if (del) {
        const c = DB.clientes.find(del.dataset.del);
        return UI.confirm({
          message: `Deseja realmente excluir o cliente “${c.nome}”? Esta ação não pode ser desfeita.`,
          onConfirm: () =>
            UI.withLoading(() => {
              DB.clientes.remove(c.id);
              UI.toast("Cliente excluído.", "info");
              App.refresh();
            }),
        });
      }
    });
  }

  const setTerm = (term) => {
    state.term = term;
    state.page = 1;
  };

  return { render, mount, setTerm };
})();
