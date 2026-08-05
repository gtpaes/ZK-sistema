/** app.js — bootstrap, roteador de páginas, tema, busca global e seed de demonstração */

const App = (() => {
  const PAGES = {
    dashboard: { title: "Dashboard", subtitle: "Visão geral da operação", module: () => Dashboard },
    clientes: { title: "Clientes", subtitle: "Base de clientes da loja", module: () => Clientes },
    produtos: { title: "Produtos", subtitle: "Catálogo e preços", module: () => Produtos },
    estoque: { title: "Estoque", subtitle: "Entradas, saídas e alertas", module: () => Estoque },
    vendas: { title: "Vendas", subtitle: "PDV, carrinho e recibos", module: () => Vendas },
    consertos: { title: "Consertos", subtitle: "Ordens de serviço de pranchas", module: () => Consertos },
    aulas: { title: "Aulas", subtitle: "Professores, turmas e mensalidades", module: () => Aulas },
    financeiro: { title: "Financeiro", subtitle: "Fluxo de caixa e despesas", module: () => Financeiro },
    relatorios: { title: "Relatórios", subtitle: "Análises a partir dos dados locais", module: () => Relatorios },
    config: { title: "Configurações", subtitle: "Empresa, tema e banco de dados local", module: () => Config },
  };

  let current = "dashboard";

  /* ---------- Renderização ---------- */
  function render(keepFocus = false) {
    const page = PAGES[current];
    const focused = keepFocus ? document.activeElement?.id : null;
    const caret = keepFocus ? document.activeElement?.selectionStart : null;

    UI.$("#pageTitle").textContent = page.title;
    UI.$("#pageSubtitle").textContent = page.subtitle;

    // Recria o container para descartar listeners antigos (evita duplicação)
    const old = UI.$("#content");
    const fresh = document.createElement("main");
    fresh.className = "content";
    fresh.id = "content";
    fresh.innerHTML = page.module
      ? page.module().render()
      : `<div class="soon"><i class="fa-solid ${page.soon}"></i><h2>Módulo ${page.title}</h2>
         <p style="max-width:420px">Este módulo será construído na próxima etapa do projeto, reutilizando a mesma camada de dados e os componentes já criados.</p></div>`;
    old.replaceWith(fresh);

    page.module?.().mount?.(fresh);

    if (focused) {
      const el = fresh.querySelector(`#${focused}`);
      if (el) {
        el.focus();
        if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret);
      }
    }
  }

  const refresh = (keepFocus = false) => render(keepFocus);

  function navigate(page) {
    if (!PAGES[page]) return;
    current = page;
    document.querySelectorAll(".nav__item").forEach((n) =>
      n.classList.toggle("is-active", n.dataset.page === page)
    );
    closeSidebar();
    render();
  }

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    UI.$("#btnTheme").innerHTML = `<i class="fa-solid fa-${theme === "dark" ? "sun" : "moon"}"></i>`;
    DB.settings.set({ tema: theme });
  }

  const toggleTheme = () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

  /* ---------- Sidebar mobile ---------- */
  const openSidebar = () => {
    UI.$("#sidebar").classList.add("is-open");
    UI.$("#sidebarBackdrop").classList.add("is-on");
  };
  const closeSidebar = () => {
    UI.$("#sidebar").classList.remove("is-open");
    UI.$("#sidebarBackdrop").classList.remove("is-on");
  };

  /* ---------- Identidade ---------- */
  function applySettings() {
    const s = DB.settings.get();
    UI.$("#brandName").textContent = s.empresa;
    UI.$("#userName").textContent = s.admin;
    UI.$("#userRole").textContent = s.cargo;
    UI.$("#userInitials").textContent = Utils.initials(s.empresa);
    document.title = `${s.empresa} — Painel Administrativo`;
  }

  /* ---------- Dados de demonstração (apenas no 1º acesso) ---------- */
  function seed() {
    if (localStorage.getItem("zk_surfhouse:seeded")) return;
    localStorage.setItem("zk_surfhouse:seeded", "1");

    [
      { nome: "Ana Beatriz Souza", cpf: "529.982.247-25", telefone: "(11) 98877-1234", whatsapp: "(11) 98877-1234", email: "ana.souza@email.com", endereco: "Av. Beira Mar, 320 — Maresias", observacoes: "Prefere pranchas 6'2\" fish." },
      { nome: "Caio Ferreira", cpf: "168.995.350-09", telefone: "(11) 99120-8877", whatsapp: "(11) 99120-8877", email: "caio.ferreira@email.com", endereco: "Rua das Ondas, 45 — Camburi", observacoes: "Aluno de aulas semanais." },
      { nome: "Marina Prado", cpf: "875.700.510-73", telefone: "(13) 98123-4455", whatsapp: "", email: "marina.prado@email.com", endereco: "Rua Atlântica, 900 — Guarujá", observacoes: "" },
      { nome: "Rodrigo Lima", cpf: "231.002.999-00", telefone: "(11) 97744-0099", whatsapp: "(11) 97744-0099", email: "rodrigo@email.com", endereco: "Rua do Farol, 12 — Boiçucanga", observacoes: "Cliente desde 2021." },
    ].forEach((c) => DB.clientes.insert(c));

    [
      { nome: "Prancha Fish 6'2\"", categoria: "Pranchas", preco: 3200, quantidade: 4, fornecedor: "Shape Norte", codigo: "PR-001" },
      { nome: "Leash 6ft Premium", categoria: "Leash", preco: 180, quantidade: 3, fornecedor: "SurfGear", codigo: "LS-002" },
      { nome: "Deck Traction Grip", categoria: "Deck", preco: 240, quantidade: 12, fornecedor: "SurfGear", codigo: "DK-003" },
      { nome: "Parafina Tropical", categoria: "Parafina", preco: 25, quantidade: 48, fornecedor: "WaxBrasil", codigo: "PF-004" },
      { nome: "Quilhas Thruster M", categoria: "Quilhas", preco: 420, quantidade: 2, fornecedor: "FinsCo", codigo: "QL-005" },
      { nome: "Camiseta ZK Surf", categoria: "Camisetas", preco: 89, quantidade: 30, fornecedor: "ZK Wear", codigo: "CM-006" },
    ].forEach((p) => DB.produtos.insert(p));

    const dias = (n) => new Date(Date.now() - n * 86400000).toISOString();
    [1200, 340, 890, 0, 1580, 620, 2100].forEach((total, i) =>
      total ? DB.vendas.insert({ data: dias(6 - i), total, itens: [], pagamento: "Pix" }) : null
    );

    const prazo = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    [
      { numero: "OS-1001", cliente: "Ana Beatriz Souza", marca: "Rusty", status: "Em conserto", prazo: prazo(2) },
      { numero: "OS-1002", cliente: "Caio Ferreira", marca: "Al Merrick", status: "Aguardando aprovação", prazo: prazo(-1) },
      { numero: "OS-1003", cliente: "Marina Prado", marca: "Lost", status: "Pronta", prazo: prazo(0) },
      { numero: "OS-1004", cliente: "Rodrigo Lima", marca: "Firewire", status: "Entregue", prazo: prazo(-6) },
    ].forEach((c) => DB.consertos.insert(c));
  }

  /* ---------- Inicialização ---------- */
  function init() {
    seed();
    applySettings();
    applyTheme(DB.settings.get().tema || "light");

    document.querySelectorAll(".nav__item").forEach((item) =>
      item.addEventListener("click", () => navigate(item.dataset.page))
    );
    UI.$("#btnTheme").onclick = toggleTheme;
    UI.$("#btnMenu").onclick = openSidebar;
    UI.$("#sidebarBackdrop").onclick = closeSidebar;

    UI.$("#globalSearch").addEventListener(
      "input",
      Utils.debounce((e) => {
        const term = e.target.value;
        if (!term) return;
        Clientes.setTerm(term);
        if (current !== "clientes") navigate("clientes");
        else refresh();
      }, 300)
    );

    render();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { navigate, refresh, applySettings, applyTheme };
})();

/** Configurações — empresa, tema, exportar/importar/limpar banco local */
const Config = (() => {
  function render() {
    const s = DB.settings.get();
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card__head"><div><h3>Dados da empresa</h3><p>Identidade exibida no painel</p></div></div>
          <div class="card__body">
            <form id="cfgForm" class="form-grid">
              <div class="field col-2"><label>Nome da empresa</label><input name="empresa" value="${Utils.escape(s.empresa)}" /></div>
              <div class="field"><label>Administrador</label><input name="admin" value="${Utils.escape(s.admin)}" /></div>
              <div class="field"><label>Cargo</label><input name="cargo" value="${Utils.escape(s.cargo)}" /></div>
              <div class="field"><label>Estoque mínimo (alerta)</label><input name="estoqueMinimo" type="number" min="0" value="${s.estoqueMinimo}" /></div>
              <div class="field"><label>Tema</label>
                <select name="tema">
                  <option value="light" ${s.tema === "light" ? "selected" : ""}>Claro</option>
                  <option value="dark" ${s.tema === "dark" ? "selected" : ""}>Escuro</option>
                </select>
              </div>
              <div class="col-2"><button type="button" class="btn btn--primary" id="cfgSave"><i class="fa-solid fa-floppy-disk"></i>Salvar configurações</button></div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card__head"><div><h3>Banco de dados local</h3><p>Backup e manutenção</p></div></div>
          <div class="card__body" style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn--ghost" id="cfgExport"><i class="fa-solid fa-file-export"></i>Exportar dados (JSON)</button>
            <button class="btn btn--ghost" id="cfgImport"><i class="fa-solid fa-file-import"></i>Importar dados (JSON)</button>
            <input type="file" id="cfgFile" accept="application/json" hidden />
            <button class="btn btn--danger" id="cfgClear"><i class="fa-solid fa-broom"></i>Limpar banco de dados</button>
            <p style="font-size:12.5px;color:var(--text-muted);line-height:1.6;margin-top:6px">
              Todos os dados ficam no LocalStorage deste navegador. Faça backups periódicos exportando o JSON.
            </p>
          </div>
        </div>
      </div>`;
  }

  function mount() {
    UI.$("#cfgSave").onclick = () => {
      const data = Object.fromEntries(new FormData(UI.$("#cfgForm")).entries());
      DB.settings.set({ ...data, estoqueMinimo: Number(data.estoqueMinimo) });
      App.applySettings();
      App.applyTheme(data.tema);
      UI.toast("Configurações salvas!");
    };

    UI.$("#cfgExport").onclick = () => {
      const blob = new Blob([JSON.stringify(DB.exportAll(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zk-surfhouse-backup-${Utils.today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast("Backup exportado.");
    };

    UI.$("#cfgImport").onclick = () => UI.$("#cfgFile").click();
    UI.$("#cfgFile").onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          DB.importAll(JSON.parse(reader.result));
          App.applySettings();
          UI.toast("Dados importados com sucesso!");
          App.refresh();
        } catch {
          UI.toast("Não foi possível ler o arquivo.", "error");
        }
      };
      reader.readAsText(file);
    };

    UI.$("#cfgClear").onclick = () =>
      UI.confirm({
        title: "Limpar banco de dados",
        message: "Todos os registros locais serão apagados permanentemente. Deseja continuar?",
        confirmText: "Limpar tudo",
        onConfirm: () =>
          UI.withLoading(() => {
            DB.clearAll();
            UI.toast("Banco de dados limpo.", "info");
            App.refresh();
          }),
      });
  }

  return { render, mount };
})();
