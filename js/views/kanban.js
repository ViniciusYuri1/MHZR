/* ==========================================================================
   views/kanban.js — Quadro Kanban com colunas Backlog, A Fazer,
   Em Progresso, Revisão e Concluído. Suporta arrastar e soltar (drag and
   drop) com atualização automática de status.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  const COLUMNS = [
    { status: "backlog", label: "Backlog" },
    { status: "nao_iniciada", label: "A Fazer" },
    { status: "em_andamento", label: "Em Progresso" },
    { status: "em_revisao", label: "Revisão" },
    { status: "concluida", label: "Concluído" }
  ];

  const PRIORITY_LABELS = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };

  function cardHtml(task) {
    const assignee = DB.Users.get(task.assignee);
    const overdue = DB.Tasks.isOverdue(task);
    return `
      <div class="kanban-card" draggable="true" data-id="${task.id}">
        <div class="kc-title">${UI.escapeHtml(task.title)}</div>
        <div class="kc-tags">
          ${(task.tags || []).slice(0, 3).map((t) => `<span class="tag-pill">${UI.escapeHtml(t)}</span>`).join("")}
        </div>
        <div class="kc-meta">
          <span class="badge badge-${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
          <div class="avatar avatar-sm" title="${assignee ? UI.escapeHtml(assignee.name) : ""}">${assignee ? assignee.avatar : "?"}</div>
        </div>
        <div class="text-sm ${overdue ? "" : "text-muted"}" style="${overdue ? "color:var(--color-danger); font-weight:700;" : ""}">
          ${overdue ? "⚠️ Atrasada — " : "📅 "}${UI.formatDate(task.dueDate)}
        </div>
      </div>`;
  }

  function render(container, ctx) {
    const tasks = DB.Tasks.list({ assignee: ctx.user.role === "admin" ? undefined : ctx.user.id });

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Quadro Kanban</h1>
          <p class="page-subtitle">Arraste os cartões entre as colunas para atualizar o status automaticamente.</p>
        </div>
        <div class="page-actions">
          ${ctx.user.role === "admin" ? `<button class="btn btn-primary" id="kb-new-task">+ Nova Tarefa</button>` : ""}
        </div>
      </div>

      <div class="kanban-board">
        ${COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <span>${col.label}</span>
              <span class="kanban-count">${colTasks.length}</span>
            </div>
            <div class="kanban-cards" data-status="${col.status}">
              ${colTasks.map(cardHtml).join("")}
            </div>
          </div>`;
        }).join("")}
      </div>
    `;

    bindEvents(container, ctx);
  }

  function bindEvents(container, ctx) {
    const newBtn = container.querySelector("#kb-new-task");
    if (newBtn) {
      newBtn.addEventListener("click", () => {
        window.Views.openTaskModal(ctx, null, () => render(container, ctx));
      });
    }

    container.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.dataset.id);
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", () => {
        window.Views.openTaskModal(ctx, card.dataset.id, () => render(container, ctx));
      });
    });

    container.querySelectorAll(".kanban-cards").forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault();
        column.classList.add("drag-over");
      });
      column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
      column.addEventListener("drop", (e) => {
        e.preventDefault();
        column.classList.remove("drag-over");
        const taskId = e.dataTransfer.getData("text/plain");
        const newStatus = column.dataset.status;
        const task = DB.Tasks.get(taskId);
        if (task && task.status !== newStatus) {
          DB.Tasks.update(taskId, { status: newStatus });
          UI.toast("Status atualizado para " + COLUMNS.find((c) => c.status === newStatus).label, "success");
        }
        render(container, ctx);
      });
    });
  }

  window.Views.kanban = function (container, ctx) {
    render(container, ctx);
  };
})();
