/**
 * anexos.js — Componentes reutilizáveis de anexos para ordens de serviço e confecções:
 *  • Quadrantes da prancha (marcação visual de danos / detalhes)
 *  • Upload de várias fotos (miniaturas + remoção), salvas como dataURL comprimido
 *  • Documento de impressão padronizado (recibo de oficina)
 */

const Anexos = (() => {
  const QUADRANTES = [
      { id: "bico-esq", label: "Bico esquerdo", x: 30, y: 12 },
      { id: "bico-dir", label: "Bico direito", x: 70, y: 12 },
      { id: "borda-esq", label: "Borda esquerda", x: 22, y: 50 },
    { id: "centro", label: "Centro", x: 50, y: 50 },
    { id: "borda-dir", label: "Borda direita", x: 78, y: 50 },
    { id: "rabeta-esq", label: "Rabeta esquerda", x: 30, y: 88 },
    { id: "rabeta-dir", label: "Rabeta direita", x: 70, y: 88 },
  ];

  const label = (id) => QUADRANTES.find((q) => q.id === id)?.label || id;

  /* ---------- Quadrantes ---------- */
  function quadrantes(marcados = [], readonly = false) {
    return `
      <div class="board-map ${readonly ? "is-readonly" : ""}">
        <div class="board-shape">
          <span class="board-line"></span>
          ${QUADRANTES.map((q) => `
            <button type="button" class="board-dot ${marcados.includes(q.id) ? "is-on" : ""}"
              data-quad="${q.id}" style="left:${q.x}%;top:${q.y}%" ${readonly ? "disabled" : ""}
              title="${q.label}"><i class="fa-solid fa-location-dot"></i></button>`).join("")}
        </div>
        <ul class="board-legend">
          ${QUADRANTES.map((q) => `<li class="${marcados.includes(q.id) ? "is-on" : ""}" data-quadleg="${q.id}">${q.label}</li>`).join("")}
        </ul>
      </div>`;
  }

  const quadrantesTexto = (marcados = []) =>
    marcados.length ? marcados.map(label).join(", ") : "Nenhum quadrante marcado";

  /* ---------- Fotos ---------- */
  function fotos(list = [], readonly = false) {
    return `
      <div class="photo-box">
        ${readonly ? "" : `
        <label class="photo-add">
          <i class="fa-solid fa-camera"></i><span>Adicionar fotos</span>
          <input type="file" accept="image/*" multiple data-photo-input hidden />
        </label>`}
        <div class="photo-grid" data-photo-grid>
          ${list.map((src, i) => `
            <figure class="photo-thumb">
              <img src="${src}" alt="Foto ${i + 1}" />
              ${readonly ? "" : `<button type="button" class="photo-rm" data-photo-rm="${i}"><i class="fa-solid fa-xmark"></i></button>`}
            </figure>`).join("") || `<p class="photo-empty">Nenhuma foto anexada.</p>`}
        </div>
      </div>`;
  }

  /** Redimensiona/comprime a imagem para caber com folga no LocalStorage */
  function comprimir(file, max = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Liga os componentes dentro de um container.
   * @param {HTMLElement} scope container (ex.: o formulário do modal)
   * @param {{quadrantes:string[], fotos:string[]}} model objeto mutado in-place
   */
  function mount(scope, model) {
    model.quadrantes = model.quadrantes || [];
    model.fotos = model.fotos || [];

    const repintaLegenda = () => {
      scope.querySelectorAll("[data-quadleg]").forEach((li) =>
        li.classList.toggle("is-on", model.quadrantes.includes(li.dataset.quadleg))
      );
    };

    const repintaFotos = () => {
      const grid = scope.querySelector("[data-photo-grid]");
      if (!grid) return;
      grid.innerHTML = model.fotos.length
        ? model.fotos.map((src, i) => `
            <figure class="photo-thumb">
              <img src="${src}" alt="Foto ${i + 1}" />
              <button type="button" class="photo-rm" data-photo-rm="${i}"><i class="fa-solid fa-xmark"></i></button>
            </figure>`).join("")
        : `<p class="photo-empty">Nenhuma foto anexada.</p>`;
    };

    scope.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-quad]");
      if (dot) {
        e.preventDefault();
        const id = dot.dataset.quad;
        model.quadrantes = model.quadrantes.includes(id)
          ? model.quadrantes.filter((q) => q !== id)
          : [...model.quadrantes, id];
        dot.classList.toggle("is-on");
        return repintaLegenda();
      }
      const rm = e.target.closest("[data-photo-rm]");
      if (rm) {
        e.preventDefault();
        model.fotos.splice(Number(rm.dataset.photoRm), 1);
        repintaFotos();
      }
    });

    const input = scope.querySelector("[data-photo-input]");
    if (input)
      input.addEventListener("change", async (e) => {
        const files = [...e.target.files];
        e.target.value = "";
        for (const f of files) {
          try {
            model.fotos.push(await comprimir(f));
          } catch {
            UI.toast(`Não foi possível ler “${f.name}”.`, "error");
          }
        }
        repintaFotos();
      });

    return model;
  }

  /* ---------- Impressão ---------- */
  const CSS = `
    *{box-sizing:border-box} body{font-family:system-ui,Segoe UI,sans-serif;color:#12212e;padding:26px;margin:0}
    h1{font-size:19px;margin:0} .doc-head{display:flex;justify-content:space-between;align-items:flex-start;
      border-bottom:2px solid #12212e;padding-bottom:10px;margin-bottom:16px}
    .doc-head small{color:#5a6b78;font-size:12px}
    .doc-num{text-align:right;font-size:13px}
    .doc-num strong{display:block;font-size:20px}
    .doc-sec{margin-bottom:16px;page-break-inside:avoid}
    .doc-sec h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#5a6b78;margin:0 0 6px}
    .doc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;font-size:13px}
    .doc-grid small{display:block;color:#5a6b78;font-size:11px}
    .doc-box{border:1px solid #d7dee4;border-radius:8px;padding:10px;font-size:13px;line-height:1.6}
    .doc-photos{display:flex;flex-wrap:wrap;gap:8px}
    .doc-photos img{width:150px;height:110px;object-fit:cover;border:1px solid #d7dee4;border-radius:6px}
    .doc-total{display:flex;justify-content:space-between;font-size:16px;font-weight:700;
      border-top:2px solid #12212e;padding-top:8px;margin-top:8px}
    .doc-sign{display:flex;gap:40px;margin-top:46px}
    .doc-sign div{flex:1;border-top:1px solid #12212e;padding-top:6px;font-size:12px;text-align:center;color:#5a6b78}
    .doc-foot{margin-top:22px;font-size:11px;color:#5a6b78;text-align:center}
  `;

  function print(title, html) {
    const w = window.open("", "_blank", "width=820,height=900");
    w.document.write(`<html><head><title>${title}</title><style>${CSS}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  return { QUADRANTES, label, quadrantes, quadrantesTexto, fotos, mount, print, comprimir };
})();
