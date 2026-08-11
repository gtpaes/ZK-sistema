/**
 * storage.js — Camada de dados do ZK SurfHouse (online / MongoDB Atlas)
 * Fonte de verdade: backend via Api (api.js). NÃO usa localStorage.
 * Cache em memória hidratado por DB.init(): leituras SINCRONAS (os renders não
 * mudam); escritas simples atualizam o cache + persistem no backend (fire-
 * and-forget) com ressync em caso de erro; guarderia.pagar/estornar são
 * transacionais (await pelo backend + refresh). Interface do storage original
 * preservada; API nova: DB.init(), DB.refresh(...), DB.<col>.pagar/estornar.
 */
const DB = (() => {
  const COLLECTIONS = [
    "clientes", "produtos", "movimentacoes", "vendas", "consertos",
    "consertosHistorico", "professores", "alunos", "turmas", "aulas",
    "financeiro", "confeccoes", "confeccoesHistorico", "guarderias",
    "guarderiaHistorico",
  ];

  // coleção (cache) -> objeto Api correspondente (api.js)
  const R = {
    clientes: Api.clientes, produtos: Api.produtos, movimentacoes: Api.movimentacoes,
    vendas: Api.vendas, consertos: Api.consertos, consertosHistorico: Api.consertosHistorico,
    professores: Api.professores, alunos: Api.alunos, turmas: Api.turmas, aulas: Api.aulas,
    financeiro: Api.financeiro, confeccoes: Api.confeccoes, confeccoesHistorico: Api.confeccoesHistorico,
    guarderias: Api.guarderias, guarderiaHistorico: Api.guarderiaHistorico,
  };

  const cache = {};
  let settings = { empresa: "ZK SurfHouse", admin: "Administrador", cargo: "Acesso total", tema: "light", estoqueMinimo: 5 };
  let ready = false;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const softToast = (m, t = "error") => { try { if (typeof UI !== "undefined" && UI.toast) UI.toast(m, t); } catch { /* UI ainda nao carregado */ } };

  // Escrita simples: atualiza cache (sync) + persiste no backend (fire-and-forget).
  function persist(name, op, payload) {
    const apiC = R[name];
    if (!apiC) return;
    let p;
    if (op === "insert") p = apiC.insert(payload);
    else if (op === "update") p = apiC.update(payload.id, payload);
    else if (op === "remove") p = apiC.remove(payload.id);
    else return; // bulk "save"
    Promise.resolve(p).catch((e) => {
      console.warn(`[DB] sync falhou (${name}.${op}):`, e.message);
      softToast("Não foi possível salvar no servidor. Dados recarregados do banco.");
      DB.refresh(name);
    });
  }

  function collection(name) {
    const arr = () => (cache[name] = cache[name] || []);
    return {
      all: () => arr(),
      find: (id) => arr().find((r) => r.id === id) || null,
      where: (fn) => arr().filter(fn),
      count: () => arr().length,
      insert(data) {
        const rec = { id: uid(), criadoEm: new Date().toISOString(), ...data };
        arr().push(rec);
        persist(name, "insert", rec);
        return rec;
      },
      update(id, data) {
        const list = arr();
        const i = list.findIndex((r) => r.id === id);
        if (i === -1) return null;
        list[i] = { ...list[i], ...data, atualizadoEm: new Date().toISOString() };
        persist(name, "update", list[i]);
        return list[i];
      },
      remove(id) {
        const list = arr();
        const i = list.findIndex((r) => r.id === id);
        if (i !== -1) { list.splice(i, 1); persist(name, "remove", { id }); }
      },
      save(list) { cache[name] = list || []; return cache[name]; },
    };
  }

  const cols = {};
  COLLECTIONS.forEach((c) => (cols[c] = collection(c)));

    /** Carrega todas as coleções + settings do backend (chamar uma vez no startup). */
  async function init() {
    if (ready) return true;
    await Promise.all(COLS.map((c) => Promise.resolve()
      .then(() => R[c] && R[c].all())
      .then((d) => { cache[c] = Array.isArray(d) ? d : []; })
      .catch((e) => { console.warn(`[DB] carregar ${c}:`, e.message); cache[c] = []; })));
    try { settings = await Api.settings.get(); } catch (e) { console.warn("[DB] settings:", e.message); }
    ready = true;
    return true;
  }

  async function refresh(...names) {
    const list = names.length ? names : COLLECTIONS;
    await Promise.all(list.map((c) => Promise.resolve()
      .then(() => R[c] && R[c].all())
      .then((d) => { cache[c] = Array.isArray(d) ? d : []; })
      .catch((e) => console.warn(`[DB] refresh ${c}:`, e.message))));
    try { settings = await Api.settings.get(); } catch (e) { console.warn("[DB] settings refresh:", e.message); }
    return true;
  }

  const self = {
    uid, init, refresh,
    exportAll() {
      const dump = { exportadoEm: new Date().toISOString(), settings: { ...settings } };
      COLLECTIONS.forEach((c) => (dump[c] = (cache[c] || []).map((r) => {
        const o = { ...r }; delete o._id; delete o.__v; return o;
      })));
      return dump;
    },
    async importAll(dump) {
      if (!dump || typeof dump !== "object") throw new Error("Arquivo invalido");
      const res = await Api.migracao.importar(dump);
      await refresh();
      return res;
    },
    async clearAll() {
      await Promise.all(COLLECTIONS.map(async (c) => {
        cache[c] = [];
        const a = R[c];
        if (a) { try { const list = await a.all(); await Promise.all(list.map((r) => a.remove(r.id))); } catch (e) { console.warn(`[DB] clearAll ${c}:`, e.message); } }
      }));
      try { settings = await Api.settings.get(); } catch (e) { console.warn("[DB] clearAll settings:", e.message); }
      ready = false;
      return true;
    },
    settings: {
      get: () => ({ ...settings }),
      set(patch) {
        settings = { ...settings, ...patch };
        Promise.resolve(Api.settings.set({ ...settings }).catch((e) => {
          console.warn("[DB] settings sync falhou:", e.message);
          softToast("Nao foi possivel salvar as configuracoes no servidor.");
        }));
        return settings;
      },
    },
  };

  COLLECTIONS.forEach((c) => (self[c] = cols[c]));
  // Guarderia: delegacao transacional ao backend (+ refresh do cache)
  self.guarderias.pagar = async (gid) => { await Api.guarderias.pagar(gid); await refresh("guarderias", "guarderiaHistorico", "financeiro"); };
  self.guarderias.estornar = async (gid) => { await Api.guarderias.estornar(gid); await refresh("guarderias", "guarderiaHistorico", "financeiro"); };
  self.guarderias.removeFinanceiro = (id) => Api.guarderias.removeFinanceiro(id);
  return self;
})();