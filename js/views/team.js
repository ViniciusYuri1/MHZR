/* ==========================================================================
   views/team.js — Gestão da Equipe (somente Administrador): usuários,
   equipes, permissões, status online e indicador de desempenho.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  function statusDot(status) {
    const map = { online: "dot-online", away: "dot-away", offline: "dot-offline" };
    const labels = { online: "Online", away: "Ausente", offline: "Offline" };
    return `<span class="dot ${map[status] || "dot-offline"}"></span> <span class="text-sm text-muted">${labels[status] || "Offline"}</span>`;
  }

  function performanceColor(value) {
    if (value >= 85) return "var(--color-success)";
    if (value >= 60) return "var(--color-warning)";
    return "var(--color-danger)";
  }

  function teamsSectionHtml(ctx) {
    const teams = DB.Teams.list();
    return `
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <h3 class="card-title">Equipes</h3>
          <button class="btn btn-secondary btn-sm" id="btn-new-team">+ Nova Equipe</button>
        </div>
        <div class="card-pad" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:14px;">
          ${teams
            .map((t) => {
              const members = DB.Teams.members(t.id);
              const lead = DB.Users.get(t.lead);
              return `
              <div class="card" style="border-left:4px solid ${t.color};">
                <div class="card-pad">
                  <div class="flex items-center justify-between">
                    <strong>${UI.escapeHtml(t.name)}</strong>
                    <button class="btn btn-ghost btn-sm" data-delete-team="${t.id}">🗑️</button>
                  </div>
                  <div class="text-sm text-muted" style="margin-top:6px;">Líder: ${lead ? UI.escapeHtml(lead.name) : "—"}</div>
                  <div class="text-sm text-muted">${members.length} membro(s)</div>
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  function usersSectionHtml(ctx) {
    const users = DB.Users.list().filter((u) => u.role !== "company");
    const teams = DB.Teams.list();

    const rows = users
      .map((u) => {
        const team = teams.find((t) => t.id === u.team);
        return `
        <tr>
          <td>
            <div class="flex items-center gap-2">
              <div class="avatar avatar-sm">${u.avatar}</div>
              <div>
                <div style="font-weight:700;">${UI.escapeHtml(u.name)}</div>
                <div class="text-sm text-muted">${UI.escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td class="text-sm">${UI.escapeHtml(u.position || "—")}</td>
          <td class="text-sm">${team ? UI.escapeHtml(team.name) : "—"}</td>
          <td>${statusDot(u.status)}</td>
          <td><span class="badge ${u.role === "admin" ? "badge-urgente" : "badge-em_andamento"}">${u.role === "admin" ? "Administrador" : "Funcionário"}</span></td>
          <td style="min-width:140px;">
            <div class="flex items-center gap-2">
              <div class="progress-bar" style="flex:1;"><div class="progress-bar-fill" style="width:${u.performance}%; background:${performanceColor(u.performance)};"></div></div>
              <span class="text-sm">${u.performance}%</span>
            </div>
          </td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" data-edit-user="${u.id}">✏️</button>
              ${u.id !== ctx.user.id ? `<button class="btn btn-ghost btn-sm" data-delete-user="${u.id}">🗑️</button>` : ""}
            </div>
          </td>
        </tr>`;
      })
      .join("");

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Funcionários</h3>
          <button class="btn btn-primary btn-sm" id="btn-new-user">+ Novo Usuário</button>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr><th>Usuário</th><th>Cargo</th><th>Equipe</th><th>Status</th><th>Perfil</th><th>Desempenho</th><th></th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  function render(container, ctx) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Gestão da Equipe</h1>
          <p class="page-subtitle">Gerencie usuários, equipes, permissões e acompanhe o desempenho.</p>
        </div>
      </div>
      ${teamsSectionHtml(ctx)}
      ${usersSectionHtml(ctx)}
    `;
    bindEvents(container, ctx);
  }

  function openUserModal(ctx, userId, onSaved) {
    const user = userId ? DB.Users.get(userId) : null;
    const teams = DB.Teams.list();
    const isNew = !user;

    const html = `
      <div class="modal-header">
        <h3>${isNew ? "Novo Usuário" : "Editar Usuário"}</h3>
        <button class="modal-close" id="um-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome completo</label>
          <input type="text" class="form-control" id="um-name" value="${user ? UI.escapeHtml(user.name) : ""}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input type="email" class="form-control" id="um-email" value="${user ? UI.escapeHtml(user.email) : ""}" />
          </div>
          <div class="form-group">
            <label class="form-label">Senha</label>
            <input type="text" class="form-control" id="um-password" placeholder="${isNew ? "Defina uma senha" : "Deixe em branco para manter"}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cargo</label>
            <input type="text" class="form-control" id="um-position" value="${user ? UI.escapeHtml(user.position || "") : ""}" />
          </div>
          <div class="form-group">
            <label class="form-label">Equipe</label>
            <select class="form-control" id="um-team">
              ${teams.map((t) => `<option value="${t.id}" ${user && user.team === t.id ? "selected" : ""}>${UI.escapeHtml(t.name)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Perfil de acesso</label>
          <select class="form-control" id="um-role">
            <option value="employee" ${user && user.role === "employee" ? "selected" : ""}>Funcionário</option>
            <option value="admin" ${user && user.role === "admin" ? "selected" : ""}>Administrador</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Permissões adicionais</label>
          <div class="flex-col gap-2">
            <label class="checkbox-row"><input type="checkbox" id="perm-tasks-all" ${user && (user.permissions || []).includes("tasks:all") ? "checked" : ""}/> Visualizar todas as tarefas</label>
            <label class="checkbox-row"><input type="checkbox" id="perm-reports" ${user && (user.permissions || []).includes("reports") ? "checked" : ""}/> Gerar relatórios</label>
            <label class="checkbox-row"><input type="checkbox" id="perm-manage-users" ${user && (user.permissions || []).includes("users:manage") ? "checked" : ""}/> Gerenciar usuários</label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="um-cancel">Cancelar</button>
        <button class="btn btn-primary" id="um-save">${isNew ? "Criar Usuário" : "Salvar Alterações"}</button>
      </div>
    `;

    const overlay = UI.showModal(html);
    overlay.querySelector("#um-close").addEventListener("click", UI.hideModal);
    overlay.querySelector("#um-cancel").addEventListener("click", UI.hideModal);

    overlay.querySelector("#um-save").addEventListener("click", async () => {
      const name = overlay.querySelector("#um-name").value.trim();
      const email = overlay.querySelector("#um-email").value.trim();
      if (!name || !email) {
        UI.toast("Preencha nome e e-mail.", "error");
        return;
      }
      const role = overlay.querySelector("#um-role").value;
      const permissions = [role === "admin" ? "all" : "tasks:own"];
      if (overlay.querySelector("#perm-tasks-all").checked) permissions.push("tasks:all");
      if (overlay.querySelector("#perm-reports").checked) permissions.push("reports");
      if (overlay.querySelector("#perm-manage-users").checked) permissions.push("users:manage");

      const payload = {
        name,
        email,
        position: overlay.querySelector("#um-position").value.trim(),
        team: overlay.querySelector("#um-team").value,
        role,
        permissions,
        avatar: name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
      };
      const password = overlay.querySelector("#um-password").value.trim();
      if (password) payload.password = password;

      const saveBtn = overlay.querySelector("#um-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "Salvando...";

      let result;
      if (isNew) {
        if (!password) {
          UI.toast("Defina uma senha para o novo usuário.", "error");
          saveBtn.disabled = false;
          saveBtn.textContent = "Criar Usuário";
          return;
        }
        result = await DB.Users.create(Object.assign({ status: "offline", performance: 0 }, payload));
      } else {
        result = await DB.Users.update(user.id, payload);
      }

      if (!result.ok) {
        UI.toast(result.message || "Não foi possível salvar o usuário.", "error");
        saveBtn.disabled = false;
        saveBtn.textContent = isNew ? "Criar Usuário" : "Salvar Alterações";
        return;
      }
      UI.toast(isNew ? "Usuário criado com sucesso." : "Usuário atualizado com sucesso.", "success");
      UI.hideModal();
      if (onSaved) onSaved();
    });
  }

  function openTeamModal(ctx, onSaved) {
    const users = DB.Users.list();
    const html = `
      <div class="modal-header">
        <h3>Nova Equipe</h3>
        <button class="modal-close" id="tm2-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome da equipe</label>
          <input type="text" class="form-control" id="team-name" placeholder="Ex: Atendimento" />
        </div>
        <div class="form-group">
          <label class="form-label">Líder</label>
          <select class="form-control" id="team-lead">
            ${users.map((u) => `<option value="${u.id}">${UI.escapeHtml(u.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Cor de identificação</label>
          <input type="color" class="form-control" id="team-color" value="#cc785c" style="height:42px; padding:4px;" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="tm2-cancel">Cancelar</button>
        <button class="btn btn-primary" id="tm2-save">Criar Equipe</button>
      </div>
    `;
    const overlay = UI.showModal(html);
    overlay.querySelector("#tm2-close").addEventListener("click", UI.hideModal);
    overlay.querySelector("#tm2-cancel").addEventListener("click", UI.hideModal);
    overlay.querySelector("#tm2-save").addEventListener("click", () => {
      const name = overlay.querySelector("#team-name").value.trim();
      if (!name) {
        UI.toast("Informe o nome da equipe.", "error");
        return;
      }
      DB.Teams.create({
        name,
        lead: overlay.querySelector("#team-lead").value,
        color: overlay.querySelector("#team-color").value
      });
      UI.toast("Equipe criada com sucesso.", "success");
      UI.hideModal();
      if (onSaved) onSaved();
    });
  }

  function bindEvents(container, ctx) {
    const reRender = () => render(container, ctx);

    container.querySelector("#btn-new-user").addEventListener("click", () => openUserModal(ctx, null, reRender));
    container.querySelector("#btn-new-team").addEventListener("click", () => openTeamModal(ctx, reRender));

    container.querySelectorAll("[data-edit-user]").forEach((btn) => {
      btn.addEventListener("click", () => openUserModal(ctx, btn.dataset.editUser, reRender));
    });
    container.querySelectorAll("[data-delete-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (UI.confirmDialog("Tem certeza que deseja excluir este usuário?")) {
          const result = await DB.Users.remove(btn.dataset.deleteUser);
          if (!result.ok) {
            UI.toast(result.message || "Não foi possível excluir o usuário.", "error");
            return;
          }
          UI.toast("Usuário excluído.", "success");
          reRender();
        }
      });
    });
    container.querySelectorAll("[data-delete-team]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (UI.confirmDialog("Tem certeza que deseja excluir esta equipe?")) {
          DB.Teams.remove(btn.dataset.deleteTeam);
          UI.toast("Equipe excluída.", "success");
          reRender();
        }
      });
    });
  }

  window.Views.team = function (container, ctx) {
    render(container, ctx);
  };
})();
