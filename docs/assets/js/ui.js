/** ui.js — componentes de interface reutilizáveis: modal, toast, confirm, loading, tabela */

const UI = (() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const modal = $("#modal");

  /* ---------- Modal ---------- */
  function openModal({ title, body, footer = "", size = 680 }) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;
    $("#modalFoot").innerHTML = footer;
    $(".modal__box").style.width = `min(${size}px, calc(100% - 32px))`;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  /* ---------- Toast ---------- */
  const ICONS = { success: "fa-check", error: "fa-xmark", warn: "fa-triangle-exclamation", info: "fa-circle-info" };

  function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.innerHTML = `<i class="fa-solid ${ICONS[type]}"></i><span>${Utils.escape(message)}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      el.addEventListener("animationend", () => el.remove());
    }, 3200);
  }

  /* ---------- Confirmação ---------- */
  function confirm({ title = "Confirmar ação", message, confirmText = "Confirmar", onConfirm, tone = "confirm" }) {
    const destructive = tone === "danger";
    const btnClass = destructive ? "btn--danger" : "btn--success";
    const icon = destructive ? "" : '<i class="fa-solid fa-check"></i>';
    openModal({
      title,
      size: 460,
      body: `<p style="font-size:14px;line-height:1.6;color:var(--text-muted)">${Utils.escape(message)}</p>`,
      footer: `
        <button class="btn btn--ghost" data-close>Cancelar</button>
        <button class="btn ${btnClass}" id="confirmYes">${icon}${confirmText}</button>`,
    });
    $("#confirmYes").onclick = () => {
      closeModal();
      onConfirm();
    };
  }

  /* ---------- Loading ---------- */
  const loading = (on) => $("#loader").classList.toggle("is-on", on);

  /** Simula processamento para dar feedback visual em ações */
  const withLoading = (fn, ms = 260) => {
    loading(true);
    setTimeout(() => {
      loading(false);
      fn();
    }, ms);
  };

  /* ---------- Tabela ---------- */
  function tableHead(columns, sort) {
    return `<tr>${columns
      .map((c) => {
        if (!c.key) return `<th style="${c.style || ""}">${c.label}</th>`;
        const icon = sort.key === c.key
          ? `<i class="fa-solid fa-arrow-${sort.dir === "asc" ? "up" : "down"}" style="opacity:1"></i>`
          : `<i class="fa-solid fa-sort"></i>`;
        return `<th data-sort="${c.key}" style="${c.style || ""}">${c.label}${icon}</th>`;
      })
      .join("")}</tr>`;
  }

  function pagination(total, page, perPage) {
    const pages = Math.max(1, Math.ceil(total / perPage));
    const from = total ? (page - 1) * perPage + 1 : 0;
    const to = Math.min(page * perPage, total);
    let btns = "";
    for (let p = 1; p <= pages; p++) {
      if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - page) > 1) {
        if (p === 3) btns += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
        continue;
      }
      btns += `<button class="page-btn ${p === page ? "is-active" : ""}" data-page-nav="${p}">${p}</button>`;
    }
    return `
      <div class="pagination">
        <span class="info">Mostrando ${from}–${to} de ${total} registro(s)</span>
        <button class="page-btn" data-page-nav="${page - 1}" ${page === 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i></button>
        ${btns}
        <button class="page-btn" data-page-nav="${page + 1}" ${page >= pages ? "disabled" : ""}><i class="fa-solid fa-chevron-right"></i></button>
      </div>`;
  }

  const empty = (icon, title, hint) => `
    <div class="empty"><i class="fa-solid ${icon}"></i>
      <h3 style="color:var(--text);font-size:15px;margin-bottom:4px">${title}</h3>
      <p style="font-size:13px">${hint}</p>
    </div>`;

  return { $, openModal, closeModal, toast, confirm, loading, withLoading, tableHead, pagination, empty };
})();
