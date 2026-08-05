/**
 * storage.js — Camada de acesso a dados (LocalStorage)
 * Repositório genérico reutilizado por TODOS os módulos do sistema.
 */

const DB = (() => {
  const PREFIX = "zk_surfhouse:";

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return value;
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /** Cria um repositório CRUD para uma coleção. */
  const collection = (name) => ({
    all: () => read(name, []),
    find: (id) => read(name, []).find((r) => r.id === id) || null,
    where: (fn) => read(name, []).filter(fn),
    insert(data) {
      const list = read(name, []);
      const record = { id: uid(), criadoEm: new Date().toISOString(), ...data };
      list.push(record);
      write(name, list);
      return record;
    },
    update(id, data) {
      const list = read(name, []);
      const i = list.findIndex((r) => r.id === id);
      if (i === -1) return null;
      list[i] = { ...list[i], ...data, atualizadoEm: new Date().toISOString() };
      write(name, list);
      return list[i];
    },
    remove(id) {
      write(name, read(name, []).filter((r) => r.id !== id));
    },
    save(list) {
      return write(name, list);
    },
    count: () => read(name, []).length,
  });

  const settings = {
    get: () =>
      read("settings", {
        empresa: "ZK SurfHouse",
        admin: "Administrador",
        cargo: "Acesso total",
        tema: "light",
        estoqueMinimo: 5,
      }),
    set(patch) {
      return write("settings", { ...settings.get(), ...patch });
    },
  };

  const COLLECTIONS = [
    "clientes", "produtos", "movimentacoes", "vendas",
    "consertos", "professores", "alunos", "turmas", "financeiro",
  ];

  return {
    uid,
    settings,
    clientes: collection("clientes"),
    produtos: collection("produtos"),
    movimentacoes: collection("movimentacoes"),
    vendas: collection("vendas"),
    consertos: collection("consertos"),
    professores: collection("professores"),
    alunos: collection("alunos"),
    turmas: collection("turmas"),
    financeiro: collection("financeiro"),

    exportAll() {
      const dump = { exportadoEm: new Date().toISOString(), settings: settings.get() };
      COLLECTIONS.forEach((c) => (dump[c] = read(c, [])));
      return dump;
    },
    importAll(dump) {
      if (!dump || typeof dump !== "object") throw new Error("Arquivo inválido");
      COLLECTIONS.forEach((c) => Array.isArray(dump[c]) && write(c, dump[c]));
      if (dump.settings) write("settings", dump.settings);
    },
    clearAll() {
      COLLECTIONS.forEach((c) => write(c, []));
    },
  };
})();
