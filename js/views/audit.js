/* ==========================================================================
   views/audit.js — Log de auditoria (somente admin)
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  const ACTION_COLORS = {
    "Criação":    { bg: "#e6f4ee", color: "#2d7d52" },
    "Edição":     { bg: "#e8f0fb", color: "#2a5cbd" },
    "Exclusão":   { bg: "#fce8e6", color: "#c0392b" },
    "Assinatura": { bg: "#f0e9fb", color: "#7b2fbe" },
    "Redefinição":{ bg: "#fff3e0", color: "#b06a1a" },
    "Login":      { bg: "#e8f5e9", color: "#388e3c" },
    "Logout":     { bg: "#fafafa", color: "#777" }
  };

  const TYPE_ICONS = {
    "Tarefa":   "✅",
    "Usuário":  "👤",
    "Empresa":  "🏢",
    "Boleto":   "🧾",
    "Contrato": "📄",
    "Sessão":   "🔐",
    "Equipe":   "👥"
  };

  let currentDays = 7;
  let currentSearch = "";

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("pt-BR"),
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    };
  }

  function actionBadge(action) {
    const style = ACTION_COLORS[action] || { bg: "#f0f0f0", color: "#555" };
    return `<span style="background:${style.bg};color:${style.color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;">${action}</span>`;
  }

  function exportCSV(logs) {
    const header = ["Quando", "Autor", "Cargo Autor", "Ação", "Tipo", "Alvo", "Cargo Alvo", "Empresa", "Detalhes"];
    const rows = logs.map((e) => {
      const dt = formatDateTime(e.timestamp);
      return [
        `${dt.date} ${dt.time}`,
        e.authorName,
        e.authorPosition,
        e.action,
        e.type,
        e.targetName,
        e.targetRole || "",
        e.companyName || "Todas",
        e.details || ""
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${currentDays}d_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function groupByDate(logs) {
    const groups = {};
    logs.forEach((e) => {
      const date = new Date(e.timestamp).toLocaleDateString("pt-BR");
      if (!groups[date]) groups[date] = [];
      groups[date].push(e);
    });
    return groups;
  }

  function buildTableRows(logs) {
    if (!logs.length) {
      return `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">Nenhum registro encontrado para o período selecionado.</td></tr>`;
    }

    const groups = groupByDate(logs);
    let html = "";

    Object.keys(groups).forEach((dateLabel) => {
      html += `<tr class="audit-date-row"><td colspan="7">${dateLabel}</td></tr>`;
      groups[dateLabel].forEach((e) => {
        const dt = formatDateTime(e.timestamp);
        const icon = TYPE_ICONS[e.type] || "•";
        html += `
          <tr class="audit-row">
            <td class="audit-time">${dt.time}</td>
            <td>
              <div class="audit-author-name">${UI.escapeHtml(e.authorName)}</div>
              <div class="audit-author-pos">${UI.escapeHtml(e.authorPosition || "")}</div>
            </td>
            <td>${actionBadge(e.action)}</td>
            <td class="audit-type">${icon} ${UI.escapeHtml(e.type)}</td>
            <td class="audit-target">
              <span>${UI.escapeHtml(e.targetName || "—")}</span>
              ${e.details ? `<div class="audit-details">${UI.escapeHtml(e.details)}</div>` : ""}
            </td>
            <td class="audit-role">${UI.escapeHtml(e.targetRole || "—")}</td>
            <td class="audit-company">${UI.escapeHtml(e.companyName || "Todas")}</td>
          </tr>`;
      });
    });

    return html;
  }

  function renderTable(container) {
    const logs = DB.Audit.list({ days: currentDays, search: currentSearch });
    const tbody = container.querySelector("#audit-tbody");
    const countEl = container.querySelector("#audit-count");
    if (tbody) tbody.innerHTML = buildTableRows(logs);
    if (countEl) countEl.textContent = `${logs.length} registro${logs.length !== 1 ? "s" : ""}`;
    container.querySelector("#audit-export").onclick = () => exportCSV(logs);
  }

  function render(container, ctx) {
    container.innerHTML = `
      <div class="page-header" style="align-items:flex-start;">
        <div>
          <h1>Auditoria</h1>
          <p class="page-subtitle">Quem fez, em quem/o quê, em qual empresa e quando.</p>
        </div>
        <div class="page-actions" style="gap:8px;">
          <button class="btn btn-secondary btn-sm" id="audit-export">Exportar CSV (${currentDays}d)</button>
        </div>
      </div>

      <!-- Filtros de período -->
      <div class="audit-filters">
        <div class="audit-period-btns">
          <button class="audit-period-btn ${currentDays === 1  ? "active" : ""}" data-days="1">Hoje (1 dia)</button>
          <button class="audit-period-btn ${currentDays === 7  ? "active" : ""}" data-days="7">7 dias</button>
          <button class="audit-period-btn ${currentDays === 30 ? "active" : ""}" data-days="30">30 dias</button>
          <button class="audit-period-btn ${currentDays === 365 ? "active" : ""}" data-days="365">Tudo</button>
        </div>
        <div class="audit-search-wrap">
          <input type="text" id="audit-search" class="form-control" placeholder="Buscar por autor, alvo, empresa, tipo..." value="${UI.escapeHtml(currentSearch)}" style="width:360px;max-width:100%;" />
        </div>
        <span id="audit-count" class="audit-count-badge">—</span>
      </div>

      <!-- Tabela -->
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem fez</th>
              <th>Ação</th>
              <th>Tipo</th>
              <th>Alvo</th>
              <th>Cargo do alvo</th>
              <th>Empresa</th>
            </tr>
          </thead>
          <tbody id="audit-tbody"></tbody>
        </table>
      </div>
    `;

    renderTable(container);

    container.querySelectorAll(".audit-period-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentDays = parseInt(btn.dataset.days);
        container.querySelectorAll(".audit-period-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        container.querySelector("#audit-export").textContent = `Exportar CSV (${currentDays}d)`;
        renderTable(container);
      });
    });

    let searchTimer;
    container.querySelector("#audit-search").addEventListener("input", (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        renderTable(container);
      }, 220);
    });
  }

  window.Views.audit = function (container, ctx) {
    if (ctx.user.role !== "admin") {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div>Acesso restrito.</div></div>`;
      return;
    }
    render(container, ctx);
  };
})();
