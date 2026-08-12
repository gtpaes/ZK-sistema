/**
 * api.js — Cliente HTTP assíncrono para a API do ZK SurfHouse (MongoDB Atlas)
 *
 * A fonte de verdade é o backend Express: http://localhost:5000/api
 * Este arquivo NÃO usa localStorage — tudo passa pelo servidor (MongoDB Atlas).
 *
 * 
 *
 * Exemplos:
 *   await Api.clientes.all()
 *   const c = await Api.clientes.insert({ nome: "Ana" })
 *   await Api.guarderias.pagar(guarderiaId)       // transacional (MongoDB session)
 *   await Api.guarderias.estornar(guarderiaId)    // transacional
 *   await Api.migracao.importar(dump)
 *   await Api.settings.get()  /  Api.settings.set(patch)
 */
const Api = (() => {
  const BASE =
    (typeof window !== "undefined" && window.API_URL) ||
    "https://zk-surfhouse-api.onrender.com/";
  const HEADERS = { "Content-Type": "application/json" };

  /** Envolve fetch; desempacota { success, data, message }; lança em erro. */
  async function request(method, path, body) {
    const opts = {
      method,
      headers: HEADERS,
      credentials: "include",
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (e) {
      const err = new Error(
        "Backend indisponível. Inicie o servidor com: npm run dev"
      );
      err.status = 0;
      err.offline = true;
      throw err;
    }

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { success: res.ok };
    }

    if (!res.ok || data.success === false) {
      const err = new Error(
        (data && (data.message || data.error)) || `Erro ${res.status}`
      );
      err.status = res.status === 200 ? 400 : res.status;
      err.body = data;
      throw err;
    }
    // desempacota data quando presente (arrays/objetos); caso contrário devolve o envelope
    return data && Object.prototype.hasOwnProperty.call(data, "data")
      ? data.data
      : data;
  }

  /** CRUD genérico (GET list, GET :id, POST, PUT, DELETE, count) */
  const crud = (path) => ({
    all: () => request("GET", path),
    find: (id) => request("GET", path + "/" + encodeURIComponent(id)),
    insert: (d) => request("POST", path, d),
    update: (id, d) => request("PUT", path + "/" + encodeURIComponent(id), d),
    remove: (id) => request("DELETE", path + "/" + encodeURIComponent(id)),
    count: async () => (await request("GET", path)).length,
  });

  return {
    base: BASE,
    request,

    health: () => request("GET", "/health"),

    // ----- CRUD de coleções simples -----
    clientes: crud("/clientes"),
    produtos: crud("/produtos"),
    movimentacoes: {
      all: () => request("GET", "/movimentacoes"),
      find: (id) => request("GET", "/movimentacoes/" + encodeURIComponent(id)),
      insert: (d) => request("POST", "/movimentacoes", d),
      remove: (id) => request("DELETE", "/movimentacoes/" + encodeURIComponent(id)),
      count: async () => (await request("GET", "/movimentacoes")).length,
    },
    consertos: {
      ...crud("/consertos"),
      entregar: (id, d = {}) => request("POST", "/consertos/" + encodeURIComponent(id) + "/entregar", d),
      removeFinanceiro: (id) => request("DELETE", "/consertos/" + encodeURIComponent(id) + "/financeiro"),
      reabrir: (id) => request("POST", "/consertos/historico/" + encodeURIComponent(id) + "/reabrir"),
    },
    consertosHistorico: {
      ...crud("/consertos/historico"),
      reabrir: (id) => request("POST", "/consertos/historico/" + encodeURIComponent(id) + "/reabrir"),
    },
    professores: crud("/aulas/professores"),
    alunos: crud("/aulas/alunos"),
    turmas: crud("/aulas/turmas"),
    aulas: crud("/aulas"),
    confeccoes: {
      ...crud("/confeccoes"),
      entregar: (id, d = {}) => request("POST", "/confeccoes/" + encodeURIComponent(id) + "/entregar", d),
      removeFinanceiro: (id) => request("DELETE", "/confeccoes/" + encodeURIComponent(id) + "/financeiro"),
      reabrir: (id) => request("POST", "/confeccoes/historico/" + encodeURIComponent(id) + "/reabrir"),
    },
    confeccoesHistorico: {
      ...crud("/confeccoes/historico"),
      reabrir: (id) => request("POST", "/confeccoes/historico/" + encodeURIComponent(id) + "/reabrir"),
    },
    guarderias: {
      ...crud("/guarderias"),
      pagar: (gid) => request("POST", "/guarderias/pagar", { guarderiaId: gid }),
      estornar: (gid) => request("POST", "/guarderias/estornar", { guarderiaId: gid }),
      removeFinanceiro: (id) => request("DELETE", "/guarderias/" + encodeURIComponent(id) + "/financeiro"),
    },
    guarderiaHistorico: crud("/guarderias/historico"),
    // alias usado por DB.guarderiaHistorico
    historico: crud("/guarderias/historico"),

    // ----- Transacionais / especiais -----
    vendas: {
      ...crud("/vendas"),
      finalizar: (d) => request("POST", "/vendas/finalizar", d),
      estornar: (d) => request("POST", "/vendas/estornar", d),
    },
    financeiro: crud("/financeiro"),

    // ----- Singleton / utilitários -----
    settings: {
      get: () => request("GET", "/configuracoes"),
      set: (d) => request("PUT", "/configuracoes", d),
    },
    migracao: {
      importar: (dump) => request("POST", "/migracao/importar", dump),
    },
  };
})();
