/* ==========================================================================
   views/portal.js — Portal da Empresa: visão exclusiva para usuários com
   role "company". Exige assinatura digital do contrato antes de exibir boletos.
   ========================================================================== */

(function () {
  "use strict";
  window.Views = window.Views || {};

  const STATUS_CFG = {
    pago:      { label: "Pago",      badge: "badge-concluida",    icon: "✅" },
    pendente:  { label: "Pendente",  badge: "badge-em_andamento", icon: "⏳" },
    vencido:   { label: "Vencido",   badge: "badge-urgente",      icon: "⚠️" },
    cancelado: { label: "Cancelado", badge: "badge-backlog",       icon: "🚫" }
  };

  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  function brl(v) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
  }

  function monthLabel(ym) {
    if (!ym) return "";
    const [y, m] = ym.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y}`;
  }

  function currentYM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthOptions(selected, boletos) {
    const months = [...new Set(boletos.map((b) => b.month))].sort();
    if (!months.length) return "";
    return months.map((ym) =>
      `<option value="${ym}" ${ym === selected ? "selected" : ""}>${monthLabel(ym)}</option>`
    ).join("");
  }

  function fmtDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  /* ---- estado interno de filtro ---- */
  let filterMonth = currentYM();

  /* ================================================================= */
  /* TELA DE ASSINATURA DO CONTRATO                                     */
  /* ================================================================= */

  function renderContractScreen(container, ctx, company) {
    const initials  = company.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    const hasFile   = !!(company.contractFile && company.contractFile.data);
    const hasText   = !!(company.contractText && company.contractText.trim());

    const fileBlock = hasFile ? `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--bg-soft,#f9f7f3);border:1px solid var(--border-color);border-radius:10px;margin-bottom:20px;">
        <span style="font-size:22px;">📎</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:14px;">${UI.escapeHtml(company.contractFile.name)}</div>
          <div class="text-sm text-muted">Arquivo do contrato em anexo</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-open-file">Abrir contrato</button>
      </div>` : "";

    const textBlock = hasText ? `
      <div style="background:var(--bg-soft,#f9f7f3);border:1px solid var(--border-color);border-radius:8px;padding:24px;max-height:340px;overflow-y:auto;font-size:14px;line-height:1.9;white-space:pre-wrap;font-family:inherit;margin-bottom:24px;">${UI.escapeHtml(company.contractText)}</div>` : "";

    container.innerHTML = `
      <div style="max-width:820px;margin:0 auto;">

        <!-- cabeçalho -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
          <div style="width:52px;height:52px;background:var(--color-primary);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;flex-shrink:0;">
            ${initials}
          </div>
          <div>
            <h1 style="margin:0;line-height:1.1;">${UI.escapeHtml(company.name)}</h1>
            <p class="page-subtitle" style="margin:4px 0 0;">Para acessar seus boletos, leia e assine o contrato abaixo.</p>
          </div>
        </div>

        <!-- aviso -->
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--color-warning-light,#fff8e1);border:1px solid var(--color-warning,#f59e0b);border-radius:10px;margin-bottom:20px;font-size:13px;font-weight:600;color:var(--color-warning,#b45309);">
          ⚠️ Leia o contrato na íntegra antes de assinar. Após a assinatura, você terá acesso aos boletos da sua empresa.
        </div>

        <!-- card do contrato -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header">
            <h3 class="card-title">📄 Contrato de Prestação de Serviços</h3>
          </div>
          <div class="card-pad">
            ${fileBlock}
            ${textBlock}

            <div class="form-group">
              <label class="form-label" for="sign-name">✍️ Assinatura digital — Digite seu nome completo *</label>
              <input type="text" class="form-control" id="sign-name" placeholder="Ex: João Silva" style="font-size:15px;letter-spacing:.3px;" autocomplete="off" />
              <div class="text-sm text-muted" style="margin-top:4px;">Seu nome será registrado como assinatura digital com data e hora.</div>
            </div>

            <label class="checkbox-row" style="margin:18px 0 24px;font-size:14px;align-items:flex-start;gap:10px;">
              <input type="checkbox" id="sign-agree" style="margin-top:3px;flex-shrink:0;" />
              <span>Li e estou de acordo com todos os termos e condições do Contrato de Prestação de Serviços${hasFile ? " (incluindo o arquivo anexado)" : ""}, reconhecendo este ato como uma assinatura eletrônica válida.</span>
            </label>

            <button class="btn btn-primary" id="btn-sign" style="width:100%;padding:14px 0;font-size:16px;font-weight:700;" disabled>
              ✍️ Assinar Contrato e Acessar Boletos
            </button>
          </div>
        </div>

        <p class="text-sm text-muted" style="text-align:center;">
          Dúvidas sobre o contrato? Entre em contato com a equipe responsável pela sua conta.
        </p>
      </div>`;

    const openFileBtn = container.querySelector("#btn-open-file");
    if (openFileBtn) {
      openFileBtn.addEventListener("click", () => UI.openAttachment(company.contractFile));
    }

    const nameInput  = container.querySelector("#sign-name");
    const agreeCheck = container.querySelector("#sign-agree");
    const signBtn    = container.querySelector("#btn-sign");

    function checkReady() {
      signBtn.disabled = !nameInput.value.trim() || !agreeCheck.checked;
    }
    nameInput.addEventListener("input", checkReady);
    agreeCheck.addEventListener("change", checkReady);

    signBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name || !agreeCheck.checked) return;
      signBtn.disabled = true;
      signBtn.textContent = "Registrando assinatura...";
      DB.Companies.signContract(company.id, name);
      UI.toast("Contrato assinado com sucesso! Bem-vindo ao portal.", "success");
      window.Views.portal(container, ctx);
    });
  }

  /* ================================================================= */
  /* MODAL: VER CONTRATO ASSINADO                                       */
  /* ================================================================= */

  function openContractViewModal(company) {
    const hasFile = !!(company.contractFile && company.contractFile.data);
    const hasText = !!(company.contractText && company.contractText.trim());

    const html = `
      <div class="modal-header">
        <h3>📄 Contrato — ${UI.escapeHtml(company.name)}</h3>
        <button class="modal-close" id="cv-close">✕</button>
      </div>
      <div class="modal-body">
        ${hasFile ? `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-soft,#f9f7f3);border:1px solid var(--border-color);border-radius:8px;margin-bottom:14px;">
          <span style="font-size:20px;">📎</span>
          <span class="text-sm" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.escapeHtml(company.contractFile.name)}</span>
          <button class="btn btn-primary btn-sm" id="cv-open-file">Abrir arquivo</button>
        </div>` : ""}
        ${hasText ? `<div style="background:var(--bg-soft,#f9f7f3);border:1px solid var(--border-color);border-radius:8px;padding:20px;max-height:320px;overflow-y:auto;font-size:13px;line-height:1.8;white-space:pre-wrap;margin-bottom:14px;">${UI.escapeHtml(company.contractText)}</div>` : ""}
        <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--color-success-light,#dcfce7);border-radius:8px;font-size:13px;font-weight:600;color:var(--color-success,#16a34a);">
          ✅ Assinado por <strong>${UI.escapeHtml(company.contractSignedBy || "")}</strong> em ${fmtDateTime(company.contractSignedAt)}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="cv-ok">Fechar</button>
      </div>`;

    const overlay = UI.showModal(html);
    overlay.querySelector("#cv-close").addEventListener("click", UI.hideModal);
    overlay.querySelector("#cv-ok").addEventListener("click", UI.hideModal);

    const openFileBtn = overlay.querySelector("#cv-open-file");
    if (openFileBtn) {
      openFileBtn.addEventListener("click", () => UI.openAttachment(company.contractFile));
    }
  }

  /* ================================================================= */
  /* PORTAL PRINCIPAL (BOLETOS)                                         */
  /* ================================================================= */

  window.Views.portal = function (container, ctx) {
    const company = ctx.user.companyId ? DB.Companies.get(ctx.user.companyId) : null;

    /* Portão de contrato: se existe texto e ainda não foi assinado → tela de assinatura */
    if (company && company.contractText && company.contractText.trim() && !company.contractSignedAt) {
      renderContractScreen(container, ctx, company);
      return;
    }

    const allBoletos = DB.Boletos.list({ companyId: ctx.user.companyId });
    const today      = DB.todayISO();

    /* ---- filtro ---- */
    if (!allBoletos.some((b) => b.month === filterMonth)) {
      filterMonth = allBoletos.length ? allBoletos[allBoletos.length - 1].month : currentYM();
    }
    const filtered = allBoletos.filter((b) => !filterMonth || b.month === filterMonth);
    const hasMonthFilter = allBoletos.length > 0;

    /* ---- linhas da tabela ---- */
    const rows = filtered.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--text-muted);">Nenhum boleto neste período.</td></tr>`
      : filtered.map((b) => {
          const cfg    = STATUS_CFG[b.status] || STATUS_CFG.pendente;
          const overdue = b.status === "pendente" && b.dueDate < today;
          return `<tr>
            <td>
              <div style="font-weight:600;">${UI.escapeHtml(b.description)}</div>
              <div class="text-sm text-muted">${monthLabel(b.month)}</div>
            </td>
            <td style="font-weight:700;color:var(--color-primary);font-size:1.05rem;">${brl(b.amount)}</td>
            <td class="text-sm" style="${overdue ? "color:var(--color-danger);font-weight:600;" : ""}">${UI.formatDate(b.dueDate)}${overdue ? " ⚠️" : ""}</td>
            <td class="text-sm">${b.paidDate ? UI.formatDate(b.paidDate) : "—"}</td>
            <td><span class="badge ${cfg.badge}">${cfg.icon} ${cfg.label}</span></td>
            <td>
              ${b.attachment
                ? `<button class="btn btn-secondary btn-sm" data-open-att="${b.id}">📎 Ver boleto</button>`
                : `<span class="text-sm text-muted">—</span>`}
            </td>
          </tr>`;
        }).join("");

    const initials = company
      ? company.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
      : "EM";

    const hasSignedContract = company && company.contractText && company.contractSignedAt;

    container.innerHTML = `
      <!-- cabeçalho da empresa -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap;">
        <div style="width:52px;height:52px;background:var(--color-primary);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;flex-shrink:0;">
          ${initials}
        </div>
        <div style="flex:1;min-width:180px;">
          <h1 style="margin:0;line-height:1.1;">${UI.escapeHtml(company ? company.name : ctx.user.name)}</h1>
          <p class="page-subtitle" style="margin:4px 0 0;">Portal de Boletos — acesso exclusivo à sua conta</p>
        </div>
        ${hasSignedContract ? `
        <button class="btn btn-secondary" id="btn-view-contract" style="flex-shrink:0;">
          📄 Ver Contrato Assinado
        </button>` : ""}
      </div>

      <!-- tabela de boletos -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:10px;">
          <h3 class="card-title">Boletos</h3>
          ${hasMonthFilter ? `
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted">Período:</label>
            <select class="form-control" id="portal-month" style="width:auto;min-width:160px;">
              <option value="">Todos os períodos</option>
              ${monthOptions(filterMonth, allBoletos)}
            </select>
          </div>` : ""}
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Arquivo</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <p class="text-sm text-muted" style="margin-top:18px;text-align:center;">
        Dúvidas sobre cobranças? Entre em contato com a equipe responsável pela sua conta.
      </p>`;

    /* ---- eventos ---- */
    const monthSel = container.querySelector("#portal-month");
    if (monthSel) {
      monthSel.addEventListener("change", (e) => {
        filterMonth = e.target.value;
        window.Views.portal(container, ctx);
      });
    }

    const contractBtn = container.querySelector("#btn-view-contract");
    if (contractBtn) {
      contractBtn.addEventListener("click", () => openContractViewModal(company));
    }

    container.querySelectorAll("[data-open-att]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const b = DB.Boletos.get(btn.dataset.openAtt);
        if (b && b.attachment) UI.openAttachment(b.attachment);
        else UI.toast("Arquivo não disponível.", "error");
      });
    });
  };
})();
