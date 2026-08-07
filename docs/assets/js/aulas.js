/** aulas.js — Professores, turmas/alunos, mensalidades e agenda (calendário) */

const Aulas = (() => {
  const state = { tab: "alunos", term: "", cal: { ano: new Date().getFullYear(), mes: new Date().getMonth() }, prof: "" };
  const NIVEIS = ["Iniciante", "Intermediário", "Avançado"];
  const HORARIOS = ["07:00", "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "19:00"];
  const STATUS_AULA = ["Agendada", "Realizada", "Cancelada"];

  const corStatus = (s) =>
    s === "Realizada" ? "success" : s === "Cancelada" ? "danger" : s === "Agendada" ? "info" : "";

  /* ---------- Render ---------- */
  function render() {
    const alunos = Utils.search(DB.alunos.all(), state.term, ["nome", "professor", "nivel"]);
    const professores = DB.professores.all();
    const turmas = DB.turmas.all();
    const mensal = alunos.reduce((s, a) => s + (Number(a.mensalidade) || 0), 0);

    return `
      <div class="page-actions">
        <div class="stat-strip" style="flex:1;margin:0">
          <div class="mini-stat"><i class="fa-solid fa-person-swimming"></i><div><strong>${DB.alunos.count()}</strong><small>Alunos ativos</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-chalkboard-user"></i><div><strong>${professores.length}</strong><small>Professores</small></div></div>
          <div class="mini-stat"><i class="fa-solid fa-money-check-dollar"></i><div><strong>${Utils.money(mensal)}</strong><small>Mensalidades/mês</small></div></div>
        </div>
        <button class="btn btn--ghost" id="btnNovoProf"><i class="fa-solid fa-user-tie"></i>Novo professor</button>
        <button class="btn btn--ghost" id="btnNovaTurma"><i class="fa-solid fa-calendar-days"></i>Nova turma</button>
        <button class="btn btn--primary" id="btnNovoAluno"><i class="fa-solid fa-plus"></i>Novo aluno</button>
      </div>

      <div class="tabs">
        ${["alunos", "turmas", "professores", "agenda"].map((t) => `<button class="tab ${state.tab === t ? "is-active" : ""}" data-tab="${t}">${t === "agenda" ? "Agenda" : t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
      </div>

      <div class="card">
        ${state.tab === "alunos" ? `
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="aulaSearch" type="search" placeholder="Buscar aluno..." value="${Utils.escape(state.term)}" />
          </div>
        </div>` : state.tab === "agenda" ? `
        <div class="toolbar">
          <div class="search"><i class="fa-solid fa-magnifying-glass"></i>
            <input id="agendaSearch" type="search" placeholder="Filtrar por aluno ou professor..." value="${Utils.escape(state.term)}" />
          </div>
          <select id="agendaProf">
            <option value="">Todos os professores</option>
            ${professores.map((p) => `<option ${state.prof === p.nome ? "selected" : ""}>${Utils.escape(p.nome)}</option>`).join("")}
          </select>
          <button class="btn btn--primary" id="btnNovaAula"><i class="fa-solid fa-plus"></i>Marcar aula</button>
        </div>` : ""}
        <div class="table-wrap">${state.tab === "agenda" ? calendario() : tabela(alunos, turmas, professores)}</div>
      </div>`;
  }

  /* ---------- Calendário ---------- */
  function calendario() {
    const { ano, mes } = state.cal;
    const primeiro = new Date(ano, mes, 1);
    const primeiroSemana = primeiro.getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const nomeMes = primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const hoje = new Date();
    const hj = hoje.getFullYear() === ano && hoje.getMonth() === mes ? hoje.getDate() : 0;

    const agenda = DB.aulas.all().filter((a) => {
      if (!a.data) return false;
      const d = new Date(a.data.slice(0, 10) + "T12:00:00");
      if (d.getFullYear() !== ano || d.getMonth() !== mes) return false;
      if (state.prof && a.professor !== state.prof) return false;
      if (state.term && !`${a.aluno} ${a.professor}`.toLowerCase().includes(state.term.toLowerCase())) return false;
      return true;
    });

    const porDia = {};
    agenda.forEach((a) => {
      const dia = new Date(a.data.slice(0, 10) + "T12:00:00").getDate();
      (porDia[dia] = porDia[dia] || []).push(a);
    });

    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    let html = `<div class="cal-head">
        <button class="icon-btn" data-calnav="-1"><i class="fa-solid fa-chevron-left"></i></button>
        <strong>${nomeMes}</strong>
        <button class="icon-btn" data-calnav="1"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="cal-grid cal-grid--head">${dias.map((d) => `<div class="cal-cell cal-cell--head">${d}</div>`).join("")}</div>
      <div class="cal-grid">`;

    for (let i = 0; i < primeiroSemana; i++) html += `<div class="cal-cell is-muted"></div>`;
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const aulas = porDia[dia] || [];
      const cell = `
        <div class="cal-cell ${hj === dia ? "is-today" : ""}">
          <div class="cal-num">${dia}</div>
          ${aulas.slice(0, 3).map((a) => `
            <div class="cal-aula cal-aula--${corStatus(a.status)}" data-aula="${a.id}" title="${Utils.escape(a.aluno)} — ${a.horario}">
              ${Utils.escape(a.horario)} ${Utils.escape(a.aluno)}
            </div>`).join("")}
          ${aulas.length > 3 ? `<div class="cal-more">+${aulas.length - 3} mais</div>` : ""}
        </div>`;
      html += cell;
    }
    html += `</div>`;
    return html;
  }

  function abrirAula(id) {
    const a = id ? DB.aulas.find(id) : {};
    const alunos = Utils.sort(DB.alunos.all(), "nome");
    const profs = Utils.sort(DB.professores.all(), "nome");
    const v = (k) => Utils.escape(a[k] ?? "");

    UI.openModal({
      title: id ? "Editar aula" : "Marcar aula",
      body: `
        <form id="aulaForm" class="form-grid">
          <div class="field col-2"><label>Aluno *</label>
            <select name="aluno"><option value="">Selecione...</option>${alunos.map((al) => `<option ${a.aluno === al.nome ? "selected" : ""}>${Utils.escape(al.nome)}</option>`).join("")}</select>
            <span class="error" data-err="aluno"></span>
          </div>
          <div class="field"><label>Professor *</label>
            <select name="professor"><option value="">Selecione...</option>${profs.map((p) => `<option ${a.professor === p.nome ? "selected" : ""}>${Utils.escape(p.nome)}</option>`).join("")}</select>
            <span class="error" data-err="professor"></span>
          </div>
          <div class="field"><label>Data</label><input name="data" type="date" value="${v("data") || Utils.today()}" /></div>
          <div class="field"><label>Horário</label>
            <select name="horario">${HORARIOS.map((h) => `<option ${a.horario === h ? "selected" : ""}>${h}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Status</label>
            <select name="status">${STATUS_AULA.map((s) => `<option ${a.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          </div>
          <div class="field col-2"><label>Observações</label><textarea name="obs">${v("obs")}</textarea></div>
        </form>`,
footer: `<button class="btn btn--ghost" data-close>Cancelar</button>
               ${id ? `<button class="btn btn--danger" id="aulaDel" style="margin-right:auto"><i class="fa-solid fa-trash"></i>Excluir</button>` : ""}
               <button class="btn btn--primary" id="aulaSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });

    const delBtn = UI.$("#aulaDel");
    if (delBtn) delBtn.onclick = () => {
      UI.confirm({
        title: "Excluir aula",
        message: `Excluir a aula de ${a.aluno || ""} em ${Utils.date(a.data)} às ${a.horario || ""}?`,
        confirmText: "Excluir",
        tone: "danger",
        onConfirm: () => UI.withLoading(() => {
          DB.aulas.remove(id);
          UI.closeModal();
          UI.toast("Aula excluída.", "info");
          App.refresh();
        }),
      });
    };

    UI.$("#aulaSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#aulaForm")).entries());
      const errs = {};
      if (!d.aluno) errs.aluno = "Selecione o aluno.";
      if (!d.professor) errs.professor = "Selecione o professor.";
      document.querySelectorAll("#aulaForm .error").forEach((e) => (e.textContent = errs[e.dataset.err] || ""));
      if (Object.keys(errs).length) return;
      UI.withLoading(() => {
        id ? DB.aulas.update(id, d) : DB.aulas.insert(d);
        UI.closeModal();
        UI.toast(id ? "Aula atualizada!" : "Aula agendada!");
        App.refresh();
      });
    };
  }

  function tabela(alunos, turmas, professores) {
    if (state.tab === "professores")
      return `<table class="table">
        <thead><tr><th>Professor</th><th>Telefone</th><th>Especialidade</th><th style="text-align:right">Ações</th></tr></thead>
        <tbody>${professores.length ? professores.map((p) => `
          <tr><td><strong>${Utils.escape(p.nome)}</strong></td><td>${Utils.escape(p.telefone || "—")}</td><td>${Utils.escape(p.especialidade || "—")}</td>
          <td><div class="row-actions"><button class="icon-btn btn--sm" data-delprof="${p.id}" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("")
          : `<tr><td colspan="4">${UI.empty("fa-chalkboard-user", "Nenhum professor", "Cadastre a equipe de instrutores.")}</td></tr>`}</tbody></table>`;

    if (state.tab === "turmas")
      return `<table class="table">
        <thead><tr><th>Turma</th><th>Professor</th><th>Dias</th><th>Horário</th><th>Alunos</th><th style="text-align:right">Ações</th></tr></thead>
        <tbody>${turmas.length ? turmas.map((t) => `
          <tr><td><strong>${Utils.escape(t.nome)}</strong></td><td>${Utils.escape(t.professor || "—")}</td><td>${Utils.escape(t.dias || "—")}</td><td>${Utils.escape(t.horario || "—")}</td>
          <td>${DB.alunos.where((a) => a.turma === t.nome).length}</td>
          <td><div class="row-actions"><button class="icon-btn btn--sm" data-delturma="${t.id}" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("")
          : `<tr><td colspan="6">${UI.empty("fa-calendar-days", "Nenhuma turma", "Crie turmas para organizar as aulas.")}</td></tr>`}</tbody></table>`;

    return `<table class="table">
      <thead><tr><th>Aluno</th><th>Turma</th><th>Nível</th><th>Mensalidade</th><th>Situação</th><th style="text-align:right">Ações</th></tr></thead>
      <tbody>${alunos.length ? alunos.map((a) => `
        <tr>
          <td><div class="cli-cell"><span class="cli-avatar">${Utils.initials(a.nome)}</span><div><strong>${Utils.escape(a.nome)}</strong><small>${Utils.escape(a.telefone || "—")}</small></div></div></td>
          <td>${Utils.escape(a.turma || "—")}</td>
          <td>${Utils.escape(a.nivel || "—")}</td>
          <td>${Utils.money(a.mensalidade)}</td>
          <td><span class="badge badge--${a.pago ? "success" : "warn"}">${a.pago ? "Em dia" : "Pendente"}</span></td>
          <td><div class="row-actions">
            ${a.pago
              ? `<button class="icon-btn btn--sm" data-cancelarpagar="${a.id}" data-tip="Cancelar pagamento" style="width:32px;height:32px"><i class="fa-solid fa-xmark"></i></button>`
              : `<button class="icon-btn btn--sm" data-pagar="${a.id}" data-tip="Registrar mensalidade" style="width:32px;height:32px"><i class="fa-solid fa-hand-holding-dollar"></i></button>`}
            <button class="icon-btn btn--sm" data-delaluno="${a.id}" style="width:32px;height:32px"><i class="fa-solid fa-trash"></i></button>
          </div></td>
        </tr>`).join("")
        : `<tr><td colspan="6">${UI.empty("fa-person-swimming", "Nenhum aluno", "Matricule alunos para acompanhar mensalidades.")}</td></tr>`}</tbody></table>`;
  }

  /* ---------- Formulários ---------- */
  function formAluno() {
    const turmas = DB.turmas.all();
    UI.openModal({
      title: "Novo aluno",
      body: `<form id="alForm" class="form-grid">
        <div class="field col-2"><label>Nome *</label><input name="nome" /><span class="error" data-err="nome"></span></div>
        <div class="field"><label>Telefone</label><input name="telefone" data-mask="phone" /></div>
        <div class="field"><label>Nível</label><select name="nivel">${NIVEIS.map((n) => `<option>${n}</option>`).join("")}</select></div>
        <div class="field"><label>Turma</label><select name="turma"><option value="">Sem turma</option>${turmas.map((t) => `<option>${Utils.escape(t.nome)}</option>`).join("")}</select></div>
        <div class="field"><label>Mensalidade</label><input name="mensalidade" type="number" min="0" step="0.01" value="250" /></div>
      </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="alSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });
    UI.$("#alSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#alForm")).entries());
      if (!d.nome.trim()) { UI.$("#alForm .error").textContent = "Informe o nome."; return; }
      d.mensalidade = Number(d.mensalidade) || 0;
      d.pago = false;
      UI.withLoading(() => { DB.alunos.insert(d); UI.closeModal(); UI.toast("Aluno matriculado!"); App.refresh(); });
    };
  }

  function formProfessor() {
    UI.openModal({
      title: "Novo professor",
      size: 520,
      body: `<form id="profForm" class="form-grid">
        <div class="field col-2"><label>Nome *</label><input name="nome" /><span class="error" data-err="nome"></span></div>
        <div class="field"><label>Telefone</label><input name="telefone" data-mask="phone" /></div>
        <div class="field"><label>Especialidade</label><input name="especialidade" placeholder="Surf iniciante, dropknee..." /></div>
      </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="profSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });
    UI.$("#profSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#profForm")).entries());
      if (!d.nome.trim()) { UI.$("#profForm .error").textContent = "Informe o nome."; return; }
      UI.withLoading(() => { DB.professores.insert(d); UI.closeModal(); UI.toast("Professor cadastrado!"); App.refresh(); });
    };
  }

  function formTurma() {
    const profs = DB.professores.all();
    UI.openModal({
      title: "Nova turma",
      size: 520,
      body: `<form id="turmaForm" class="form-grid">
        <div class="field col-2"><label>Nome da turma *</label><input name="nome" placeholder="Turma Manhã — Iniciantes" /><span class="error" data-err="nome"></span></div>
        <div class="field"><label>Professor</label><select name="professor"><option value="">—</option>${profs.map((p) => `<option>${Utils.escape(p.nome)}</option>`).join("")}</select></div>
        <div class="field"><label>Dias</label><input name="dias" placeholder="Ter e Qui" /></div>
        <div class="field col-2"><label>Horário</label><input name="horario" placeholder="07h00 às 09h00" /></div>
      </form>`,
      footer: `<button class="btn btn--ghost" data-close>Cancelar</button><button class="btn btn--primary" id="turmaSave"><i class="fa-solid fa-floppy-disk"></i>Salvar</button>`,
    });
    UI.$("#turmaSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#turmaForm")).entries());
      if (!d.nome.trim()) { UI.$("#turmaForm .error").textContent = "Informe o nome da turma."; return; }
      UI.withLoading(() => { DB.turmas.insert(d); UI.closeModal(); UI.toast("Turma criada!"); App.refresh(); });
    };
  }

  function pagar(a) {
    DB.alunos.update(a.id, { pago: true, ultimoPagamento: new Date().toISOString() });
    DB.financeiro.insert({ tipo: "entrada", categoria: "Mensalidade", descricao: `Mensalidade — ${a.nome}`, valor: Number(a.mensalidade) || 0, data: new Date().toISOString(), origem: "aula", alunoId: a.id });
  }

  function cancelarPagamento(a) {
    DB.financeiro.where((f) => f.origem === "aula" && f.alunoId === a.id)
      .forEach((f) => DB.financeiro.remove(f.id));
    DB.alunos.update(a.id, { pago: false, ultimoPagamento: null });
  }

  function mount(root) {
    UI.$("#btnNovoAluno").onclick = formAluno;
    UI.$("#btnNovoProf").onclick = formProfessor;
    UI.$("#btnNovaTurma").onclick = formTurma;
    const s = UI.$("#aulaSearch");
    if (s) s.addEventListener("input", Utils.debounce((e) => { state.term = e.target.value; App.refresh(true); }, 300));

    root.addEventListener("input", (e) => {
      if (e.target.dataset.mask === "phone") e.target.value = Utils.maskPhone(e.target.value);
      if (e.target.id === "agendaSearch") { state.term = e.target.value; App.refresh(true); }
    });

    root.addEventListener("change", (e) => {
      if (e.target.id === "agendaProf") { state.prof = e.target.value; App.refresh(); }
    });

    root.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) { state.tab = tab.dataset.tab; return App.refresh(); }

      const calnav = e.target.closest("[data-calnav]");
      if (calnav) {
        const d = new Date(state.cal.ano, state.cal.mes + Number(calnav.dataset.calnav), 1);
        state.cal = { ano: d.getFullYear(), mes: d.getMonth() };
        return App.refresh();
      }
      const btnAula = e.target.closest("#btnNovaAula");
      if (btnAula) return abrirAula();
      const aula = e.target.closest("[data-aula]");
      if (aula) return abrirAula(aula.dataset.aula);

      const pagarBtn = e.target.closest("[data-pagar]");
      if (pagarBtn) {
        const a = DB.alunos.find(pagarBtn.dataset.pagar);
        return UI.withLoading(() => {
          pagar(a);
          UI.toast("Mensalidade registrada!");
          App.refresh();
        });
      }
      const cancelar = e.target.closest("[data-cancelarpagar]");
      if (cancelar) {
        const a = DB.alunos.find(cancelar.dataset.cancelarpagar);
return UI.confirm({
          message: `Cancelar o pagamento da mensalidade de ${a.nome}? O lançamento no Financeiro será removido e o status voltará para pendente.`,
          tone: "danger",
          onConfirm: () => UI.withLoading(() => {
            cancelarPagamento(a);
            UI.toast("Pagamento cancelado.", "info");
            App.refresh();
          }),
        });
      }
      const da = e.target.closest("[data-delaluno]");
      if (da) return UI.confirm({ message: "Excluir este aluno?", tone: "danger", onConfirm: () => UI.withLoading(() => { DB.alunos.remove(da.dataset.delaluno); UI.toast("Aluno excluído.", "info"); App.refresh(); }) });
      const dp = e.target.closest("[data-delprof]");
      if (dp) return UI.confirm({ message: "Excluir este professor?", tone: "danger", onConfirm: () => UI.withLoading(() => { DB.professores.remove(dp.dataset.delprof); UI.toast("Professor excluído.", "info"); App.refresh(); }) });
      const dt = e.target.closest("[data-delturma]");
      if (dt) return UI.confirm({ message: "Excluir esta turma?", tone: "danger", onConfirm: () => UI.withLoading(() => { DB.turmas.remove(dt.dataset.delturma); UI.toast("Turma excluída.", "info"); App.refresh(); }) });
    });
  }

  return { render, mount };
})();
