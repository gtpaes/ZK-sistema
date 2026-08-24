/** app.js — bootstrap, roteador de páginas, tema, busca global  */

const App = (() => {
  const PAGES = {
    dashboard: { title: "Dashboard", subtitle: "Visão geral da operação", module: () => Dashboard },
    clientes: { title: "Clientes", subtitle: "Base de clientes da loja", module: () => Clientes },
    produtos: { title: "Produtos", subtitle: "Catálogo e preços", module: () => Produtos },
    estoque: { title: "Estoque", subtitle: "Entradas, saídas e alertas", module: () => Estoque },
    vendas: { title: "Vendas", subtitle: "PDV, carrinho e recibos", module: () => Vendas },
    consertos: { title: "Consertos", subtitle: "Ordens de serviço de pranchas", module: () => Consertos },
    confeccao: { title: "Confecção", subtitle: "Pranchas sob encomenda", module: () => Confeccao },
    aulas: { title: "Aulas", subtitle: "Professores, turmas e mensalidades", module: () => Aulas },
    guarderia: { title: "Guarderia", subtitle: "Contratos de guarda de pranchas", module: () => Guarderia },

    financeiro: { title: "Financeiro", subtitle: "Fluxo de caixa e despesas", module: () => Financeiro },
    relatorios: { title: "Relatórios", subtitle: "Análises a partir dos dados locais", module: () => Relatorios },
    config: { title: "Configurações", subtitle: "Empresa, tema e banco de dados local", module: () => Config },
  };

  let current = "dashboard";

  /* ---------- Mobile: prepara tabelas para exibição em cards ----------
     Copia o texto dos <th> para data-label de cada <td>. O CSS de
     responsive.css transforma as linhas em blocos verticais no celular,
     usando esses rótulos. No desktop nada muda. */
  function enhanceTables(root) {
    root.querySelectorAll("table").forEach((tb) => {
      const heads = [...tb.querySelectorAll("thead th")].map((th) => th.textContent.trim());
      tb.querySelectorAll("tbody tr").forEach((tr) => {
        // Linhas de estado vazio (colspan) não recebem rótulos
        if (tr.querySelector("[colspan]")) return;
        [...tr.children].forEach((td, i) => {
          const label = heads[i];
          if (label && !td.dataset.label) td.dataset.label = label;
        });
      });
    });
  }

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

    // Mobile: rotula células das tabelas para o modo "cards" (ver responsive.css)
    if (window.matchMedia("(max-width: 768px)").matches) enhanceTables(fresh);

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
    // Sincroniza o destaque na barra inferior (mobile)
    document.querySelectorAll(".bottom-nav [data-page]").forEach((n) =>
      n.classList.toggle("is-active", n.dataset.page === page)
    );
    closeSidebar();
    render();
  }

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    const finalTheme = Theme.apply(theme);
    UI.$("#btnTheme").innerHTML = `<i class="fa-solid fa-${finalTheme === "dark" ? "sun" : "moon"}"></i>`;
  }

  const toggleTheme = () => Theme.toggle();

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


    /* ---------- Inicialização ---------- */
  async function init() {
    UI.loading(true);
    Theme.init();

    try {
      await DB.init(); // carrega o cache do backend (MongoDB Atlas)
    } catch (e) {
      console.warn("[App] falha ao carregar dados do backend:", e.message);
      UI.toast("Não foi possível conectar ao backend. Mostrando dados locais.", "warn");
    }

    try {
      await Auth.me();
    } catch (err) {
      window.location.href = "login.html";
      return;
    }

    applySettings();
    applyTheme();

    document.querySelectorAll(".nav__item").forEach((item) =>
      item.addEventListener("click", () => navigate(item.dataset.page))
    );
    UI.$("#btnTheme").onclick = toggleTheme;
    UI.$("#btnMenu").onclick = openSidebar;
    UI.$("#sidebarBackdrop").onclick = closeSidebar;

    // Barra de navegação inferior (mobile): páginas rápidas + abrir menu completo
    document.querySelectorAll(".bottom-nav [data-page]").forEach((item) =>
      item.addEventListener("click", () => navigate(item.dataset.page))
    );
    const bnMenu = UI.$("#bnMenu");
    if (bnMenu) bnMenu.onclick = openSidebar;

    // Quando o refresh em segundo plano do cache local termina,
    // atualiza a tela silenciosamente com os dados frescos do Atlas.
    window.addEventListener("db:refreshed", () => {
      applySettings();
      refresh(true);
    });

    const logoutBtn = UI.$("#btnLogout");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        UI.loading(true);
        Promise.resolve(Auth.logout())
          .catch(() => {})
          .finally(() => {
            window.location.href = "login.html";
          });
      };
    }

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

    UI.loading(false);
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
              <div class="field col-2"><label>Estoque mínimo (alerta)</label><input name="estoqueMinimo" type="number" min="0" value="${s.estoqueMinimo}" /></div>
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
        UI.$("#cfgFile").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      UI.loading(true);
      try {
        const dump = JSON.parse(await file.text());
        const res = await DB.importAll(dump);
        App.applySettings();
        UI.toast(res.message || "Dados importados com sucesso!");
        App.refresh();
      } catch (err) {
        console.error(err);
        UI.toast(err.message || "Não foi possível importar os dados.", "error");
      } finally {
        UI.loading(false);
        e.target.value = "";
      }
    };

        UI.$("#cfgClear").onclick = () =>
      UI.confirm({
        title: "Limpar banco de dados",
        message: "Todos os registros serão apagados permanentemente do servidor. Deseja continuar?",
        confirmText: "Limpar tudo",
        tone: "danger",
        onConfirm: async () => {
          UI.loading(true);
          try {
            await DB.clearAll();
            UI.toast("Banco de dados limpo.", "info");
            App.refresh();
          } finally {
            UI.loading(false);
          }
        },
      });
  }

  return { render, mount };
})();
