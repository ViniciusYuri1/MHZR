/* ==========================================================================
   views/settings.js — Configurações: perfil, tema, notificações, logo,
   empresa e import/export do banco de dados em Excel.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  function profileSectionHtml(ctx) {
    const user = DB.Users.get(ctx.user.id);
    return `
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h3 class="card-title">Meu Perfil</h3></div>
        <div class="card-pad">
          <div class="flex items-center gap-3" style="margin-bottom:18px;">
            <div class="avatar avatar-lg">${user.avatar}</div>
            <div>
              <div style="font-weight:700;">${UI.escapeHtml(user.name)}</div>
              <div class="text-sm text-muted">${user.role === "admin" ? "Administrador" : "Funcionário"} · ${UI.escapeHtml(user.position || "")}</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nome completo</label>
              <input type="text" class="form-control" id="profile-name" value="${UI.escapeHtml(user.name)}" />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail</label>
              <input type="email" class="form-control" id="profile-email" value="${UI.escapeHtml(user.email)}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nova senha (deixe em branco para manter a atual)</label>
            <input type="password" class="form-control" id="profile-password" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary" id="save-profile">Salvar Perfil</button>
        </div>
      </div>`;
  }

  function appearanceSectionHtml() {
    const settings = DB.Settings.get();
    return `
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h3 class="card-title">Aparência</h3></div>
        <div class="card-pad">
          <div class="form-group">
            <label class="form-label">Tema</label>
            <div class="flex gap-2">
              <button class="btn ${settings.theme === "light" ? "btn-primary" : "btn-secondary"}" id="theme-light">☀️ Claro</button>
              <button class="btn ${settings.theme === "dark" ? "btn-primary" : "btn-secondary"}" id="theme-dark">🌙 Escuro</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function notificationsSectionHtml() {
    const n = DB.Settings.get().notifications;
    return `
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h3 class="card-title">Notificações</h3></div>
        <div class="card-pad flex-col gap-3">
          <label class="checkbox-row"><input type="checkbox" id="notif-email" ${n.email ? "checked" : ""}/> Receber notificações por e-mail</label>
          <label class="checkbox-row"><input type="checkbox" id="notif-push" ${n.push ? "checked" : ""}/> Notificações push no navegador</label>
          <label class="checkbox-row"><input type="checkbox" id="notif-deadline" ${n.deadlineReminder ? "checked" : ""}/> Lembrete de prazos próximos</label>
          <label class="checkbox-row"><input type="checkbox" id="notif-summary" ${n.dailySummary ? "checked" : ""}/> Resumo diário de atividades</label>
          <button class="btn btn-primary" id="save-notifications" style="margin-top:6px; align-self:flex-start;">Salvar Notificações</button>
        </div>
      </div>`;
  }

  function companySectionHtml() {
    const settings = DB.Settings.get();
    return `
      <div class="card" style="margin-bottom:18px;">
        <div class="card-header"><h3 class="card-title">Empresa</h3></div>
        <div class="card-pad">
          <div class="form-group">
            <label class="form-label">Nome da empresa</label>
            <input type="text" class="form-control" id="company-name" value="${UI.escapeHtml(settings.companyName || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Logo</label>
            <div class="flex items-center gap-3">
              <div style="width:56px; height:56px; border-radius:12px; background:var(--bg-hover); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${settings.logo ? `<img src="${settings.logo}" style="width:100%; height:100%; object-fit:cover;" />` : "🏢"}
              </div>
              <input type="file" accept="image/*" id="company-logo-input" />
            </div>
          </div>
          <button class="btn btn-primary" id="save-company">Salvar Empresa</button>
        </div>
      </div>`;
  }

  function databaseSectionHtml() {
    const db = DB.Settings.get();
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Banco de Dados (Excel)</h3></div>
        <div class="card-pad flex-col gap-3">
          <p class="text-sm text-muted">
            Os dados do sistema são mantidos localmente e podem ser exportados para uma planilha Excel
            (.xlsx) como backup, ou importados para restaurar/atualizar usuários, tarefas e equipes.
            Esta camada está preparada para futura substituição por uma API real.
          </p>
          <div class="flex gap-2" style="flex-wrap:wrap;">
            <button class="btn btn-secondary" id="export-excel-btn">⬇️ Exportar para Excel</button>
            <label class="btn btn-secondary" style="cursor:pointer;">
              ⬆️ Importar do Excel
              <input type="file" id="import-excel-input" accept=".xlsx,.xls" style="display:none;" />
            </label>
            <button class="btn btn-ghost" id="reset-data-btn">↺ Restaurar dados de demonstração</button>
          </div>
        </div>
      </div>`;
  }

  function render(container, ctx) {
    const isAdmin = ctx.user.role === "admin";
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Configurações</h1>
          <p class="page-subtitle">Gerencie seu perfil, preferências do sistema${isAdmin ? " e dados da empresa" : ""}.</p>
        </div>
      </div>

      ${profileSectionHtml(ctx)}
      ${appearanceSectionHtml()}
      ${notificationsSectionHtml()}
      ${isAdmin ? companySectionHtml() : ""}
      ${isAdmin ? databaseSectionHtml() : ""}
    `;

    bindEvents(container, ctx);
  }

  function bindEvents(container, ctx) {
    container.querySelector("#save-profile").addEventListener("click", () => {
      const name = container.querySelector("#profile-name").value.trim();
      const email = container.querySelector("#profile-email").value.trim();
      const password = container.querySelector("#profile-password").value.trim();
      if (!name || !email) {
        UI.toast("Preencha nome e e-mail.", "error");
        return;
      }
      const patch = { name, email };
      if (password) patch.password = password;
      DB.Users.update(ctx.user.id, patch);
      UI.toast("Perfil atualizado com sucesso.", "success");
      document.getElementById("user-name").textContent = name;
    });

    container.querySelector("#theme-light").addEventListener("click", () => {
      DB.Settings.update({ theme: "light" });
      UI.applyTheme("light");
      render(container, ctx);
    });
    container.querySelector("#theme-dark").addEventListener("click", () => {
      DB.Settings.update({ theme: "dark" });
      UI.applyTheme("dark");
      render(container, ctx);
    });

    container.querySelector("#save-notifications").addEventListener("click", () => {
      DB.Settings.update({
        notifications: {
          email: container.querySelector("#notif-email").checked,
          push: container.querySelector("#notif-push").checked,
          deadlineReminder: container.querySelector("#notif-deadline").checked,
          dailySummary: container.querySelector("#notif-summary").checked
        }
      });
      UI.toast("Preferências de notificação salvas.", "success");
    });

    if (ctx.user.role === "admin") {
      container.querySelector("#save-company").addEventListener("click", () => {
        DB.Settings.update({ companyName: container.querySelector("#company-name").value.trim() });
        UI.toast("Dados da empresa atualizados.", "success");
      });

      container.querySelector("#company-logo-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          DB.Settings.update({ logo: ev.target.result });
          UI.toast("Logo atualizada.", "success");
          render(container, ctx);
        };
        reader.readAsDataURL(file);
      });

      container.querySelector("#export-excel-btn").addEventListener("click", () => {
        DB.exportToExcel("banco_de_dados_gestao_tarefas.xlsx");
        UI.toast("Exportação concluída. Verifique seus downloads.", "success");
      });

      container.querySelector("#import-excel-input").addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        DB.importFromExcel(file, (result) => {
          UI.toast(result.message, result.ok ? "success" : "error");
          if (result.ok) render(container, ctx);
        });
      });

      container.querySelector("#reset-data-btn").addEventListener("click", () => {
        if (UI.confirmDialog("Isso vai restaurar os dados de demonstração originais e descartar alterações locais. Continuar?")) {
          DB.resetDatabase();
          UI.toast("Dados de demonstração restaurados.", "success");
          render(container, ctx);
        }
      });
    }
  }

  window.Views.settings = function (container, ctx) {
    render(container, ctx);
  };
})();
