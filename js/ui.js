/* ==========================================================================
   ui.js — Utilitários de interface compartilhados (toast, modais, helpers)
   ========================================================================== */

(function (global) {
  "use strict";

  function ensureToastContainer() {
    let el = document.getElementById("toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-container";
      document.body.appendChild(el);
    }
    return el;
  }

  function toast(message, type, duration) {
    const container = ensureToastContainer();
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .25s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
    }, duration || 3200);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  function initThemeFromSettings() {
    try {
      const settings = global.DB ? global.DB.Settings.get() : null;
      applyTheme(settings ? settings.theme : "light");
    } catch (e) {
      applyTheme("light");
    }
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function formatDateTime(isoDateTime) {
    const d = new Date(isoDateTime);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function confirmDialog(message) {
    return window.confirm(message);
  }

  /* Abre um arquivo (PDF/imagem) armazenado como data-URL via Blob URL,
     que funciona em todos os navegadores modernos sem ser bloqueado. */
  function openAttachment(att) {
    if (!att || !att.data) { toast("Nenhum arquivo disponível.", "error"); return; }
    try {
      const parts   = att.data.split(",");
      const mime    = parts[0].match(/:(.*?);/)[1];
      const bin     = atob(parts[1]);
      const buf     = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
      const win     = window.open(blobUrl, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = blobUrl; a.download = att.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) {
      toast("Não foi possível abrir o arquivo.", "error");
    }
  }

  /* Modal genérico controlado por id de overlay já presente no DOM */
  function openModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.add("open");
  }
  function closeModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.remove("open");
  }

  /* Modal dinâmico: injetado sob demanda, reaproveitado entre telas */
  function showModal(html, opts) {
    let overlay = document.getElementById("dynamic-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "dynamic-modal";
      overlay.className = "modal-overlay";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) hideModal();
      });
    }
    overlay.innerHTML = `<div class="modal-box ${opts && opts.large ? "modal-lg" : ""}">${html}</div>`;
    requestAnimationFrame(() => overlay.classList.add("open"));
    return overlay;
  }
  function hideModal() {
    const overlay = document.getElementById("dynamic-modal");
    if (overlay) overlay.classList.remove("open");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
  });

  global.UI = {
    toast,
    applyTheme,
    initThemeFromSettings,
    escapeHtml,
    formatDate,
    formatDateTime,
    confirmDialog,
    openModal,
    closeModal,
    showModal,
    hideModal,
    openAttachment
  };
})(window);
