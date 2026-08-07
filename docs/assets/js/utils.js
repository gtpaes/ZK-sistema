/** utils.js — funções puras reutilizáveis (formatação, máscaras, ordenação, busca) */

const Utils = {
  money: (v) =>
    (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),

  date: (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—"),

  dateInput: (d = new Date()) => new Date(d).toISOString().slice(0, 10),

  today: () => new Date().toISOString().slice(0, 10),

  isSameDay: (iso, ref = new Date()) =>
    !!iso && new Date(iso).toDateString() === ref.toDateString(),

  isSameMonth: (iso, ref = new Date()) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  },

  daysUntil: (iso) => {
    if (!iso) return null;
    const a = new Date(iso).setHours(0, 0, 0, 0);
    const b = new Date().setHours(0, 0, 0, 0);
    return Math.round((a - b) / 86400000);
  },

  initials: (nome = "") =>
    nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?",

  maskCPF: (v) =>
    v.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2"),

  maskPhone: (v) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  },

  validCPF: (v) => {
    const c = v.replace(/\D/g, "");
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const calc = (len) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
  },

  validEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),

  onlyDigits: (v = "") => v.replace(/\D/g, ""),

  /** Busca textual em múltiplos campos */
  search: (list, term, fields) => {

  const normalize = (text = "") =>
    String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const words = normalize(term)
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return list;

  return list.filter(item => {

    const texto = fields
      .map(f => normalize(item[f]))
      .join(" ");

    return words.every(word => texto.includes(word));

  });

},

  /** Ordenação genérica (string, número ou data) */
  sort: (list, key, dir = "asc") => {
    const factor = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const x = a[key] ?? "", y = b[key] ?? "";
      if (typeof x === "number" && typeof y === "number") return (x - y) * factor;
      return String(x).localeCompare(String(y), "pt-BR", { numeric: true }) * factor;
    });
  },

  paginate: (list, page, perPage) => list.slice((page - 1) * perPage, page * perPage),

  debounce: (fn, delay = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  },

  escape: (v = "") =>
    String(v).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    ),
};
