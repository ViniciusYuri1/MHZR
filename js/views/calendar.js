/* ==========================================================================
   views/calendar.js — Calendário com visualização por Dia, Semana e Mês,
   exibindo entregas, eventos e prazos das tarefas.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  let state = { mode: "month", refDate: new Date() };

  function isoOf(date) {
    return date.toISOString().slice(0, 10);
  }

  function tasksForScope(ctx) {
    return DB.Tasks.list({ assignee: DB.canManageTasks(ctx.user) ? undefined : ctx.user.id });
  }

  function pillHtml(task) {
    const overdue = DB.Tasks.isOverdue(task);
    const cls = task.status === "concluida" ? "done" : overdue ? "overdue" : "";
    return `<div class="cal-event-pill ${cls}" data-id="${task.id}" title="${UI.escapeHtml(task.title)}">${UI.escapeHtml(task.title)}</div>`;
  }

  function monthView(ctx) {
    const ref = state.refDate;
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const tasks = tasksForScope(ctx);
    const todayStr = DB.todayISO();

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1;
      cells.push({ day, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, outside: false, iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length, outside: true });
    }

    const cellsHtml = cells
      .map((c) => {
        if (c.outside) return `<div class="calendar-day-cell outside"><div class="day-number">${c.day}</div></div>`;
        const dayTasks = tasks.filter((t) => t.dueDate === c.iso);
        const isToday = c.iso === todayStr;
        return `
        <div class="calendar-day-cell ${isToday ? "today" : ""}">
          <div class="day-number">${c.day}</div>
          ${dayTasks.slice(0, 3).map(pillHtml).join("")}
          ${dayTasks.length > 3 ? `<div class="text-sm text-muted">+${dayTasks.length - 3} mais</div>` : ""}
        </div>`;
      })
      .join("");

    return `
      <div class="calendar-month-grid">
        ${WEEKDAYS.map((w) => `<div class="cal-weekday">${w}</div>`).join("")}
        ${cellsHtml}
      </div>`;
  }

  function weekView(ctx) {
    const ref = new Date(state.refDate);
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay());
    const tasks = tasksForScope(ctx);
    const todayStr = DB.todayISO();

    let html = `<div class="calendar-month-grid">`;
    html += WEEKDAYS.map((w) => `<div class="cal-weekday">${w}</div>`).join("");
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const iso = isoOf(date);
      const dayTasks = tasks.filter((t) => t.dueDate === iso);
      html += `
        <div class="calendar-day-cell ${iso === todayStr ? "today" : ""}" style="min-height:160px;">
          <div class="day-number">${date.getDate()}</div>
          ${dayTasks.map(pillHtml).join("")}
        </div>`;
    }
    html += `</div>`;
    return html;
  }

  function dayView(ctx) {
    const iso = isoOf(state.refDate);
    const tasks = tasksForScope(ctx).filter((t) => t.dueDate === iso);
    if (!tasks.length) {
      return `<div class="card card-pad"><div class="empty-state"><div class="empty-icon">📭</div>Nenhuma entrega ou prazo para este dia.</div></div>`;
    }
    return `
      <div class="card">
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prioridade</th><th>Status</th></tr></thead>
            <tbody>
              ${tasks
                .map((t) => {
                  const u = DB.Users.get(t.assignee);
                  return `
                <tr data-id="${t.id}" style="cursor:pointer;">
                  <td style="font-weight:700;">${UI.escapeHtml(t.title)}</td>
                  <td>${u ? UI.escapeHtml(u.name) : "—"}</td>
                  <td><span class="badge badge-${t.priority}">${t.priority}</span></td>
                  <td><span class="badge badge-${t.status}">${t.status}</span></td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function rangeLabel() {
    const ref = state.refDate;
    if (state.mode === "month") {
      return ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    if (state.mode === "week") {
      const start = new Date(ref);
      start.setDate(ref.getDate() - ref.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("pt-BR")} – ${end.toLocaleDateString("pt-BR")}`;
    }
    return ref.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function shift(amount) {
    const ref = new Date(state.refDate);
    if (state.mode === "month") ref.setMonth(ref.getMonth() + amount);
    else if (state.mode === "week") ref.setDate(ref.getDate() + amount * 7);
    else ref.setDate(ref.getDate() + amount);
    state.refDate = ref;
  }

  function render(container, ctx) {
    let body = "";
    if (state.mode === "month") body = monthView(ctx);
    else if (state.mode === "week") body = weekView(ctx);
    else body = dayView(ctx);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Calendário</h1>
          <p class="page-subtitle">Visualize entregas, eventos e prazos das tarefas.</p>
        </div>
      </div>

      <div class="calendar-toolbar">
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" id="cal-prev">‹</button>
          <button class="btn btn-secondary btn-sm" id="cal-today">Hoje</button>
          <button class="btn btn-secondary btn-sm" id="cal-next">›</button>
          <strong style="text-transform:capitalize; margin-left:8px;">${rangeLabel()}</strong>
        </div>
        <div class="flex gap-2">
          <button class="btn ${state.mode === "day" ? "btn-primary" : "btn-secondary"} btn-sm" data-mode="day">Dia</button>
          <button class="btn ${state.mode === "week" ? "btn-primary" : "btn-secondary"} btn-sm" data-mode="week">Semana</button>
          <button class="btn ${state.mode === "month" ? "btn-primary" : "btn-secondary"} btn-sm" data-mode="month">Mês</button>
        </div>
      </div>

      ${body}
    `;

    bindEvents(container, ctx);
  }

  function bindEvents(container, ctx) {
    container.querySelector("#cal-prev").addEventListener("click", () => { shift(-1); render(container, ctx); });
    container.querySelector("#cal-next").addEventListener("click", () => { shift(1); render(container, ctx); });
    container.querySelector("#cal-today").addEventListener("click", () => { state.refDate = new Date(); render(container, ctx); });

    container.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        render(container, ctx);
      });
    });

    container.querySelectorAll("[data-id]").forEach((el) => {
      el.addEventListener("click", () => {
        window.Views.openTaskModal(ctx, el.dataset.id, () => render(container, ctx));
      });
    });
  }

  window.Views.calendar = function (container, ctx) {
    render(container, ctx);
  };
})();
