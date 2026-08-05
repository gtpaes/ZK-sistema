/** consertos.js — Ordens de serviço de pranchas (CRUD + status + prazos) */

const Consertos = (() => {
  const STATUS = [
    "Recebida",
    "Em análise",
    "Aguardando aprovação",
    "Em conserto",
    "Pronta",
    "Entregue",
  ];

  const state = {
    term: "",
    status: "",
    page: 1,
    pageHistorico: 1,
    perPage: 8,
  };

  const cor = (s) =>
    s === "Entregue"
      ? "success"
      : s === "Pronta"
        ? "success"
        : s === "Aguardando aprovação"
          ? "warn"
          : s === "Em conserto"
            ? "info"
            : "";

  function filtered() {
    let list = DB.consertos.all();

    if (state.status) {
      list = list.filter((c) => c.status === state.status);
    }

    return Utils.sort(
      Utils.search(list, state.term, ["numero", "cliente", "marca", "descricao"]),
      "criadoEm",
      "desc",
    );
  }

  function prazoCell(c) {
    if (!c.prazo) return "—";

    const d = Utils.daysUntil(c.prazo);

    const finalizado = c.status === "Entregue";

    const tag = finalizado
      ? ""
      : d < 0
        ? `<span class="badge badge--danger">Atrasada</span>`
        : d === 0
          ? `<span class="badge badge--warn">Hoje</span>`
          : `<span class="badge">${d} dia(s)</span>`;

    return `
      ${Utils.date(c.prazo)}
      <br>
      ${tag}
    `;
  }

  function render() {
    const all = DB.consertos.all();

    const ativos = filtered().filter((c) => c.status !== "Entregue");

    const historico = filtered().filter((c) => c.status === "Entregue");

    const pageList = Utils.paginate(ativos, state.page, state.perPage);

    const pageHistorico = Utils.paginate(historico, state.pageHistorico, state.perPage);
    const abertas = all.filter((c) => c.status !== "Entregue").length;
    const atrasadas = all.filter(
      (c) => c.status !== "Entregue" && c.prazo && Utils.daysUntil(c.prazo) < 0,
    ).length;
    return `
<div class="page-actions">
<div class="stat-strip" style="flex:1;margin:0">
<div class="mini-stat">
<i class="fa-solid fa-screwdriver-wrench"></i>
<div>
<strong>${abertas}</strong>
<small>Ordens abertas</small>
</div>
</div>
<div class="mini-stat">
<i class="fa-solid fa-clock"></i>
<div>
<strong>${atrasadas}</strong>
<small>Atrasadas</small>
</div>
</div>
<div class="mini-stat">
<i class="fa-solid fa-check-double"></i>
<div>
<strong>
${all.filter((c) => c.status === "Entregue").length}
</strong>
<small>Entregues</small>
</div>
</div>
</div>
<button class="btn btn--primary" id="btnNovaOS">
<i class="fa-solid fa-plus"></i>
Nova ordem
</button>
</div>
<div class="card">
<div class="toolbar">
<div class="search">
<i class="fa-solid fa-magnifying-glass"></i>
<input
id="osSearch"
type="search"
placeholder="Buscar por OS, cliente ou marca..."
value="${Utils.escape(state.term)}"
/>
</div>
<select id="osStatus">
<option value="">
Todos os status
</option>
${STATUS.map(
  (s) =>
    `
<option
${state.status === s ? "selected" : ""}
>
${s}
</option>
`,
).join("")}
</select>
</div>
<div class="table-wrap">
<table class="table">
<thead>
<tr>
<th>OS</th>
<th>Cliente</th>
<th>Prancha</th>
<th>Status</th>
<th>Prazo</th>
<th>Valor</th>
<th style="text-align:right">Ações</th>
</tr>
</thead>
<tbody>
${
  pageList.length
    ? pageList
        .map(
          (c) => `
<tr>
<td>
<strong>
${Utils.escape(c.numero || "—")}
</strong>
</td>
<td>
${Utils.escape(c.cliente || "—")}
</td>
<td>
${Utils.escape(c.marca || "—")}
<br>
<small style="color:var(--text-muted)">
${Utils.escape(c.descricao || "")}
</small>
</td>
<td>
<span class="badge badge--${cor(c.status)}">
${Utils.escape(c.status || "Recebida")}
</span>
</td>
<td>
${prazoCell(c)}
</td>
<td>
${Utils.money(c.valor)}
</td>
<td>
<div class="row-actions">
<button
class="icon-btn btn--sm"
data-edit="${c.id}"
data-tip="Editar"
style="width:32px;height:32px">
<i class="fa-solid fa-pen"></i>
</button>
<button
class="icon-btn btn--sm"
data-entregar="${c.id}"
data-tip="Confirmar entrega"
style="width:32px;height:32px">
<i class="fa-solid fa-circle-check"></i>
</button>
<button
class="icon-btn btn--sm"
data-del="${c.id}"
data-tip="Excluir"
style="width:32px;height:32px">
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
<td colspan="7">
${UI.empty(
  "fa-screwdriver-wrench",
  "Nenhuma ordem de serviço",
  "Cadastre a primeira OS de conserto.",
)}
</td>
</tr>
`
}
</tbody>
</table>
</div>
${ativos.length ? UI.pagination(ativos.length, state.page, state.perPage) : ""}
</div>
<div class="card" style="margin-top:24px">
<div class="card__head">
<div>
<h3>
Histórico de consertos entregues
</h3>
<p>
Todas as ordens já finalizadas
</p>
</div>
</div>
<div class="table-wrap">
<table class="table">
<thead>
<tr>
<th>OS</th>
<th>Cliente</th>
<th>Prancha</th>
<th>Entrega</th>
<th>Valor</th>
<th style="text-align:right">Ações</th>
</tr>
</thead>
<tbody>
${
  pageHistorico.length
    ? pageHistorico
        .map(
          (c) => `
<tr>
<td>
<strong>
${Utils.escape(c.numero)}
</strong>
</td>
<td>
${Utils.escape(c.cliente)}
</td>
<td>
${Utils.escape(c.marca)}
</td>
<td>
${Utils.date(c.dataEntrega)}
</td>
<td>
${Utils.money(c.valor)}
</td>
<td>
<div class="row-actions">
<button
class="icon-btn btn--sm"
data-view="${c.id}"
data-tip="Visualizar"
style="width:32px;height:32px">

<i class="fa-solid fa-eye"></i>

</button>


<button
class="icon-btn btn--sm"
data-reabrir="${c.id}"
data-tip="Reabrir OS"
style="width:32px;height:32px">

<i class="fa-solid fa-arrow-rotate-left"></i>

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
${UI.empty("fa-box-open", "Nenhum conserto entregue", "Os consertos entregues aparecerão aqui.")}
</td>
</tr>
`
}
</tbody>
</table>
</div>

${historico.length ? UI.pagination(historico.length, state.pageHistorico, state.perPage) : ""}

</div>
</div>
`;
  }

  function openForm(id) {
    const c = id ? DB.consertos.find(id) : {};
    const bloqueado = c.status === "Entregue";
    const clientes = Utils.sort(DB.clientes.all(), "nome");

    const v = (k) => Utils.escape(c[k] ?? "");

    UI.openModal({
      title: id ? `Editar ${c.numero || "ordem"}` : "Nova ordem de serviço",

      body: `


<form id="osForm" class="form-grid">
<div class="field">
<label>Número da OS</label>
<input
name="numero"
value="${v("numero") || "OS-" + (1001 + DB.consertos.count())}"
/>
</div>
<div class="field">

<label>Cliente *</label>
<select name="cliente">
<option value="">
Selecione...
</option>


${clientes
  .map(
    (cl) => `

<option
${c.cliente === cl.nome ? "selected" : ""}
>
${Utils.escape(cl.nome)}
</option>
`,
  )
  .join("")}
</select>
<span class="error" data-err="cliente"></span>
</div>
<div class="field">
<label>Marca / modelo da prancha</label>
<input
name="marca"
value="${v("marca")}"
placeholder="Ex: Rusty 6'0"
>
</div>
<div class="field">
<label>Status</label>
<select name="status">
${STATUS.map(
  (s) => `

<option

${c.status === s ? "selected" : ""}
>
${s}
</option>
`,
).join("")}
</select>
</div>
<div class="field">
<label>Prazo de entrega</label>
<input
name="prazo"
type="date"
value="${v("prazo")}"
>
</div>
<div class="field">
<label>Valor do serviço</label>
<input
name="valor"
type="number"
min="0"
step="0.01"
value="${c.valor ?? ""}"
${bloqueado ? "readonly" : ""}
>
</div>
<div class="field col-2">
<label>
Descrição do reparo
</label>
<textarea
name="descricao"
placeholder="Quebra no bico, delaminação, troca de quilha..."
>${v("descricao")}</textarea>

</div>
</form>

`,

      footer: `

<button class="btn btn--ghost" data-close>
Cancelar
</button>


<button class="btn btn--primary" id="osSave">

<i class="fa-solid fa-floppy-disk"></i>

Salvar

</button>

`,
    });

    UI.$("#osSave").onclick = () => {
      const d = Object.fromEntries(new FormData(UI.$("#osForm")).entries());

      if (!d.cliente) {
        UI.$("#osForm .error").textContent = "Selecione um cliente.";

        return;
      }

      d.valor = Number(d.valor) || 0;

      UI.withLoading(() => {
        

        if (id) {
          DB.consertos.update(id, d);
        } else {
          DB.consertos.insert({
            ...d,

            financeiroGerado: false,

            criadoEm: new Date().toISOString(),
          });
        }

        UI.closeModal();

        UI.toast(id ? "Ordem atualizada!" : "Ordem cadastrada!");

        App.refresh();
      });
    };
  }

 function confirmarEntrega(id) {
const os = DB.consertos.find(id);
if(!os) return;
UI.confirm({
message:
`Confirmar entrega da ${os.numero}?`,
onConfirm:()=>{
const agora = new Date().toISOString();
DB.financeiro.insert({

tipo:"entrada",
categoria:"Conserto",
descricao:`${os.numero} - ${os.cliente}`,
valor:os.valor,
data:agora,
origem:"conserto",
origemId:os.id
});
DB.consertos.update(
os.id,
{
status:"Entregue",
dataEntrega:agora,
financeiroGerado:true
}
);
UI.toast(
"Entrega confirmada!"
);
App.refresh();
}
});

}
  
  function reabrirOS(id){
const os = DB.consertos.find(id);
if(!os)
return;
UI.confirm({
message:
`Reabrir ${os.numero}? O valor será removido do financeiro.`,
onConfirm:()=>{
const movimento =
DB.financeiro
.all()
.find(
f =>
f.origem === "conserto" &&
f.origemId === os.id
);
if(movimento){
DB.financeiro.remove(
movimento.id
);
}
DB.consertos.update(
id,
{
status:"Em conserto",
dataEntrega:null,
financeiroGerado:false
}
);
UI.toast(
"OS voltou para conserto!"
);
App.refresh();
}
});
}

  function visualizar(id) {
    const c = DB.consertos.find(id);

    if (!c) return;

    UI.openModal({
      title: `Detalhes ${c.numero}`,

      body: `


<div class="details">


<p>
<b>Cliente:</b>
${Utils.escape(c.cliente)}
</p>



<p>
<b>Prancha:</b>
${Utils.escape(c.marca)}
</p>



<p>
<b>Status:</b>
${Utils.escape(c.status)}
</p>




<p>
<b>Descrição:</b>
${Utils.escape(c.descricao || "—")}
</p>




<p>
<b>Valor:</b>
${Utils.money(c.valor)}
</p>




<p>
<b>Entrega:</b>
${c.dataEntrega ? Utils.date(c.dataEntrega) : "—"}
</p>


</div>


`,

      footer: `

<button 
class="btn btn--primary"
data-close>

Fechar

</button>

`,
    });
  }

  function mount(root) {
    UI.$("#btnNovaOS").onclick = () => openForm();

    UI.$("#osSearch").addEventListener(
      "input",

      Utils.debounce((e) => {
        state.term = e.target.value;

        state.page = 1;

        App.refresh(true);
      }, 300),
    );

    UI.$("#osStatus").onchange = (e) => {
      state.status = e.target.value;

      state.page = 1;

      App.refresh();
    };

    root.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");

      if (edit) {
        return openForm(edit.dataset.edit);
      }

      const entregar = e.target.closest("[data-entregar]");

      if (entregar) {
        return confirmarEntrega(entregar.dataset.entregar);
      }

      const visualizarBtn = e.target.closest("[data-view]");

      if (visualizarBtn) {
        return visualizar(visualizarBtn.dataset.view);
      }

      const reabrir =
      e.target.closest("[data-reabrir]");


      if(reabrir){

      return reabrirOS(
      reabrir.dataset.reabrir
      );

}

      const del = e.target.closest("[data-del]");

      if (del) {
        return UI.confirm({
          message: "Excluir esta ordem de serviço?",

          onConfirm: () => {
            UI.withLoading(() => {
              DB.consertos.remove(del.dataset.del);

              UI.toast("Ordem excluída.", "info");

              App.refresh();
            });
          },
        });
      }

      const nav = e.target.closest("[data-page-nav]");

    if(nav && !nav.disabled){

    const pagina = Number(nav.dataset.pageNav);

    if(nav.closest(".card").querySelector(".card__head h3")){
        state.pageHistorico = pagina;
    } else {
        state.page = pagina;
    }
    App.refresh();
} 
    });
  }

  return {
    render,

    mount,

    setTerm: (t) => {
      state.term = t;

      state.page = 1;
    },
  };
})();
