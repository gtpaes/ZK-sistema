/** theme.js — Preferência local de tema (light/dark) */
const Theme = (() => {
  const STORAGE_KEY = "zk_theme";
  const getStoredTheme = () => localStorage.getItem(STORAGE_KEY);
  const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const updateButton = (theme) => {
    const btn = document.querySelector("#btnTheme");
    if (!btn) return;
    btn.innerHTML = `<i class="fa-solid fa-${theme === "dark" ? "sun" : "moon"}"></i>`;
  };

  const apply = (theme) => {
    const finalTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = finalTheme;
    updateButton(finalTheme);
    try {
      localStorage.setItem(STORAGE_KEY, finalTheme);
    } catch (err) {
      console.warn("Não foi possível salvar a preferência de tema.", err.message);
    }
    return finalTheme;
  };

  const init = () => {
    const stored = getStoredTheme();
    const theme = stored === "dark" || stored === "light" ? stored : getSystemTheme();
    return apply(theme);
  };

  const toggle = () => apply(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

  return {
    init,
    toggle,
    apply,
    current: () => document.documentElement.dataset.theme || "light",
  };
})();
