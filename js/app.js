/* ==========================================================================
   app.js — Shell da aplicação: autenticação, sidebar (RBAC), topbar,
   roteamento por hash e alternância de tema.
   ========================================================================== */

(function () {
  "use strict";

  const user = DB.requireSession("index.html");
  if (!user) return;

  UI.initThemeFromSettings();

  const ROUTES = [
    { id: "dashboard", label: "Dashboard", icon: "📊", roles: ["admin", "employee"], section: "Principal" },
    { id: "tasks", label: "Tarefas", icon: "✅", roles: ["admin", "employee"], section: "Principal" },
    { id: "kanban", label: "Quadro Kanban", icon: "🗂️", roles: ["admin", "employee"], section: "Principal" },
    { id: "calendar", label: "Calendário", icon: "📅", roles: ["admin", "employee"], section: "Principal" },
    { id: "team", label: "Equipe", icon: "👥", roles: ["admin"], section: "Gestão" },
    { id: "financial", label: "Financeiro", icon: "💰", roles: ["admin"], section: "Gestão" },
    { id: "reports", label: "Relatórios", icon: "📈", roles: ["admin"], section: "Gestão" },
    { id: "audit", label: "Auditoria", icon: "🔍", roles: ["admin"], section: "Sistema" },
    { id: "settings", label: "Configurações", icon: "⚙️", roles: ["admin", "employee"], section: "Sistema" },
    { id: "portal", label: "Meus Boletos", icon: "🧾", roles: ["company"], section: "Portal" }
  ];

  const sidebarNav = document.getElementById("sidebar-nav");
  const viewContent = document.getElementById("view-content");
  const sidebar = document.getElementById("sidebar");

  /* ------------------------------------------------------------------ */
  /* Sidebar (renderizada conforme perfil)                              */
  /* ------------------------------------------------------------------ */

  function renderSidebar(activeRoute) {
    const allowed = ROUTES.filter((r) => r.roles.includes(user.role));
    let html = "";
    let lastSection = null;
    allowed.forEach((r) => {
      if (r.section !== lastSection) {
        html += `<div class="nav-section-title">${r.section}</div>`;
        lastSection = r.section;
      }
      html += `
        <div class="nav-item ${r.id === activeRoute ? "active" : ""}" data-route="${r.id}">
          <span class="nav-icon">${r.icon}</span>
          <span class="nav-label">${r.label}</span>
        </div>`;
    });
    sidebarNav.innerHTML = html;
    sidebarNav.querySelectorAll(".nav-item").forEach((el) => {
      el.addEventListener("click", () => {
        navigate(el.dataset.route);
        if (window.innerWidth <= 900) closeMobileSidebar();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Topbar: usuário, tema, notificações                                */
  /* ------------------------------------------------------------------ */

  function renderUserBox() {
    document.getElementById("user-avatar").textContent = user.avatar || user.name.slice(0, 2).toUpperCase();
    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-role").textContent = user.role === "admin" ? "Administrador" : user.role === "company" ? "Portal Empresa" : "Funcionário";
  }

  function renderNotifications() {
    const tasks = DB.Tasks.list({ assignee: user.role === "admin" ? undefined : user.id });
    const overdue = tasks.filter((t) => DB.Tasks.isOverdue(t));
    const dueSoon = tasks.filter((t) => {
      if (t.status === "concluida") return false;
      const diff = (new Date(t.dueDate) - new Date(DB.todayISO())) / 86400000;
      return diff >= 0 && diff <= 2;
    });

    const panel = document.getElementById("notif-panel");
    const dot = document.getElementById("notif-dot");
    const items = [];

    /* Notificações para admin: empresas com acesso ativo mas sem contrato */
    if (user.role === "admin") {
      const allCompanies = DB.Companies.list();
      const allUsers     = DB.Users.list();
      allCompanies.forEach((co) => {
        const hasPortalUser = allUsers.some((u) => u.role === "company" && u.companyId === co.id);
        const hasCtr = (co.contractText && co.contractText.trim()) || co.contractFile;
        if (hasPortalUser && !hasCtr) {
          items.push(`<div class="notif-item" style="cursor:pointer;" onclick="window.location.hash='#/financial'">🏢 <strong>${UI.escapeHtml(co.name)}</strong> aguarda contrato<div class="notif-time">Acesso ativo sem contrato cadastrado</div></div>`);
        }
      });
    }

    overdue.forEach((t) =>
      items.push(`<div class="notif-item">🔴 <strong>${UI.escapeHtml(t.title)}</strong> está atrasada<div class="notif-time">Prazo: ${UI.formatDate(t.dueDate)}</div></div>`)
    );
    dueSoon.forEach((t) =>
      items.push(`<div class="notif-item">🟡 <strong>${UI.escapeHtml(t.title)}</strong> vence em breve<div class="notif-time">Prazo: ${UI.formatDate(t.dueDate)}</div></div>`)
    );

    dot.style.display = items.length ? "block" : "none";
    panel.innerHTML = items.length
      ? items.join("")
      : `<div class="notif-item">Nenhuma notificação por aqui 🎉</div>`;
  }

  function setThemeIcon(theme) {
    document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  /* ------------------------------------------------------------------ */
  /* Roteamento                                                          */
  /* ------------------------------------------------------------------ */

  const ctx = {
    user,
    navigate,
    UI,
    DB
  };

  function currentRouteFromHash() {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    return hash || "dashboard";
  }

  function navigate(routeId) {
    window.location.hash = "#/" + routeId;
  }

  function renderRoute() {
    let routeId = currentRouteFromHash();

    /* Usuários de empresa só acessam o portal */
    if (user.role === "company" && routeId !== "portal") {
      window.location.hash = "#/portal";
      return;
    }

    const route = ROUTES.find((r) => r.id === routeId);

    if (!route || !route.roles.includes(user.role)) {
      routeId = user.role === "company" ? "portal" : "dashboard";
      window.location.hash = "#/" + routeId;
      return;
    }

    renderSidebar(routeId);
    viewContent.classList.remove("fade-in");
    requestAnimationFrame(() => viewContent.classList.add("fade-in"));

    const renderer = window.Views && window.Views[routeId];
    if (typeof renderer === "function") {
      viewContent.innerHTML = "";
      renderer(viewContent, ctx);
    } else {
      viewContent.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><div>Tela em construção.</div></div>`;
    }

    renderNotifications();
    closeAllDropdowns();
  }

  window.addEventListener("hashchange", renderRoute);

  /* ------------------------------------------------------------------ */
  /* Tema claro/escuro                                                   */
  /* ------------------------------------------------------------------ */

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const current = DB.Settings.get().theme;
    const next = current === "dark" ? "light" : "dark";
    DB.Settings.update({ theme: next });
    UI.applyTheme(next);
    setThemeIcon(next);
  });

  /* ------------------------------------------------------------------ */
  /* Dropdowns (notificações / usuário)                                  */
  /* ------------------------------------------------------------------ */

  function closeAllDropdowns() {
    document.querySelectorAll(".dropdown-panel").forEach((p) => p.classList.remove("open"));
  }

  document.getElementById("notif-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("notif-panel");
    const willOpen = !panel.classList.contains("open");
    closeAllDropdowns();
    if (willOpen) panel.classList.add("open");
  });

  document.getElementById("user-menu-trigger").addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("user-panel");
    const willOpen = !panel.classList.contains("open");
    closeAllDropdowns();
    if (willOpen) panel.classList.add("open");
  });

  document.getElementById("user-panel").querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.route));
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    DB.logout();
    window.location.href = "index.html";
  });

  // Logout automático ao fechar a aba, navegar para outro site ou recarregar a página
  window.addEventListener("pagehide", () => { DB.logout(); });
  window.addEventListener("pageshow", (e) => {
    // Se a página foi restaurada do cache do navegador (bfcache), redireciona para o login
    if (e.persisted && !DB.getCurrentUser()) {
      window.location.href = "index.html";
    }
  });

  document.addEventListener("click", closeAllDropdowns);

  /* ------------------------------------------------------------------ */
  /* Sidebar recolhível                                                  */
  /* ------------------------------------------------------------------ */

  const COLLAPSE_KEY = "sgt_sidebar_collapsed";

  function applyCollapsedState() {
    const collapsed = localStorage.getItem(COLLAPSE_KEY) === "1";
    sidebar.classList.toggle("collapsed", collapsed);
    document.getElementById("collapse-icon").textContent = collapsed ? "⟩⟩" : "⟨⟨";
    document.getElementById("collapse-text").textContent = collapsed ? "" : "Recolher menu";
  }

  document.getElementById("collapse-btn").addEventListener("click", () => {
    const collapsed = localStorage.getItem(COLLAPSE_KEY) === "1";
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    applyCollapsedState();
  });

  const sidebarOverlay = document.getElementById("sidebar-overlay");

  function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("active");
  }

  document.getElementById("mobile-toggle").addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("mobile-open");
    sidebarOverlay.classList.toggle("active", isOpen);
  });

  sidebarOverlay.addEventListener("click", closeMobileSidebar);

  /* ------------------------------------------------------------------ */
  /* Busca global → leva para Tarefas com o termo aplicado               */
  /* ------------------------------------------------------------------ */

  document.getElementById("global-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sessionStorage.setItem("sgt_search_term", e.target.value.trim());
      navigate("tasks");
    }
  });

  /* ------------------------------------------------------------------ */
  /* Responsivo: exibir botão de menu mobile                             */
  /* ------------------------------------------------------------------ */

  function handleResize() {
    document.getElementById("mobile-toggle").style.display = window.innerWidth <= 900 ? "flex" : "none";
  }
  window.addEventListener("resize", handleResize);

  /* ------------------------------------------------------------------ */
  /* Inicialização                                                       */
  /* ------------------------------------------------------------------ */

  renderUserBox();
  setThemeIcon(DB.Settings.get().theme);
  applyCollapsedState();
  handleResize();

  /* Portal de empresa: esconde elementos de topbar irrelevantes */
  if (user.role === "company") {
    const searchWrap = document.getElementById("global-search").closest(".topbar-search");
    if (searchWrap) searchWrap.style.display = "none";
    const notifWrap = document.getElementById("notif-btn").parentElement;
    if (notifWrap) notifWrap.style.display = "none";
    document.getElementById("theme-toggle").style.display = "none";
    const collapseBtn = document.getElementById("collapse-btn");
    if (collapseBtn) collapseBtn.style.display = "none";
  }

  renderRoute();
})();
