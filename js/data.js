/* ==========================================================================
   data.js — Camada de dados do Sistema de Gestão de Tarefas
   Banco de dados: simulado em localStorage (runtime) com import/export
   para planilhas Excel (.xlsx) via SheetJS, preparado para futura troca
   por uma API real (ver objeto DB.api no final do arquivo).
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "sgt_database_v1";
  const SESSION_KEY = "sgt_session";

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function uid(prefix) {
    return (
      (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function todayISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.toISOString().slice(0, 10);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ------------------------------------------------------------------ */
  /* Seed: Empresas e Boletos                                           */
  /* ------------------------------------------------------------------ */

  function seedCompanies() {
    return [
      { id: "co_1", name: "Empresa Alpha Ltda",  cnpj: "12.345.678/0001-90", contact: "João Silva",  email: "joao@alpha.com.br",  phone: "(11) 99999-0001", status: "ativo", since: "2024-01", contractText: "", contractFile: null, contractSignedAt: null, contractSignedBy: null },
      { id: "co_2", name: "Beta Soluções ME",    cnpj: "98.765.432/0001-10", contact: "Maria Souza", email: "maria@beta.com.br",   phone: "(21) 98888-0002", status: "ativo", since: "2024-03", contractText: "", contractFile: null, contractSignedAt: null, contractSignedBy: null },
      { id: "co_3", name: "Gama Tecnologia SA",  cnpj: "11.222.333/0001-44", contact: "Pedro Lima",  email: "pedro@gama.com.br",   phone: "(31) 97777-0003", status: "ativo", since: "2025-06", contractText: "", contractFile: null, contractSignedAt: null, contractSignedBy: null }
    ];
  }

  function seedBoletos() {
    function ym(off) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    function md(off, day) { return `${ym(off)}-${String(day).padStart(2, "0")}`; }
    const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    function ml(ymStr) { const [y, m] = ymStr.split("-"); return `${MONTHS[+m - 1]}/${y}`; }
    return [
      { id:"bol_1",  companyId:"co_1", description:`Mensalidade ${ml(ym(-2))}`, amount:2500, dueDate:md(-2,10), paidDate:md(-2, 9), month:ym(-2), status:"pago",    notes:"" },
      { id:"bol_2",  companyId:"co_2", description:`Mensalidade ${ml(ym(-2))}`, amount:1800, dueDate:md(-2,15), paidDate:md(-2,14), month:ym(-2), status:"pago",    notes:"" },
      { id:"bol_3",  companyId:"co_3", description:`Mensalidade ${ml(ym(-2))}`, amount:3200, dueDate:md(-2,20), paidDate:md(-2,19), month:ym(-2), status:"pago",    notes:"" },
      { id:"bol_4",  companyId:"co_1", description:`Mensalidade ${ml(ym(-1))}`, amount:2500, dueDate:md(-1,10), paidDate:md(-1,12), month:ym(-1), status:"pago",    notes:"Pago com 2 dias de atraso" },
      { id:"bol_5",  companyId:"co_2", description:`Mensalidade ${ml(ym(-1))}`, amount:1800, dueDate:md(-1,15), paidDate:null,      month:ym(-1), status:"vencido", notes:"" },
      { id:"bol_6",  companyId:"co_3", description:`Mensalidade ${ml(ym(-1))}`, amount:3200, dueDate:md(-1,20), paidDate:md(-1,19), month:ym(-1), status:"pago",    notes:"" },
      { id:"bol_7",  companyId:"co_1", description:`Mensalidade ${ml(ym( 0))}`, amount:2500, dueDate:md( 0,10), paidDate:md( 0, 9), month:ym( 0), status:"pago",    notes:"" },
      { id:"bol_8",  companyId:"co_2", description:`Mensalidade ${ml(ym( 0))}`, amount:1800, dueDate:md( 0,15), paidDate:null,      month:ym( 0), status:"vencido", notes:"" },
      { id:"bol_9",  companyId:"co_3", description:`Mensalidade ${ml(ym( 0))}`, amount:3200, dueDate:md( 0,25), paidDate:null,      month:ym( 0), status:"pendente",notes:"" },
      { id:"bol_10", companyId:"co_1", description:`Mensalidade ${ml(ym( 1))}`, amount:2500, dueDate:md( 1,10), paidDate:null,      month:ym( 1), status:"pendente",notes:"" },
      { id:"bol_11", companyId:"co_2", description:`Mensalidade ${ml(ym( 1))}`, amount:1800, dueDate:md( 1,15), paidDate:null,      month:ym( 1), status:"pendente",notes:"" },
      { id:"bol_12", companyId:"co_3", description:`Mensalidade ${ml(ym( 1))}`, amount:3200, dueDate:md( 1,20), paidDate:null,      month:ym( 1), status:"pendente",notes:"" }
    ];
  }

  /* ------------------------------------------------------------------ */
  /* Seed inicial do banco de dados                                     */
  /* ------------------------------------------------------------------ */

  function seedDatabase() {
    const teams = [
      { id: "team_1", name: "Equipe Principal", lead: "user_1", color: "#cc785c" }
    ];

    const users = [
      {
        id: "user_1",
        name: "Murillo",
        email: "murillo@empresa.com",
        password: "admin123",
        role: "admin",
        team: "team_1",
        position: "Administrador",
        status: "online",
        avatar: "MU",
        permissions: ["all"],
        performance: 95,
        createdAt: todayISO(-120)
      },
      {
        id: "user_2",
        name: "Gustavo",
        email: "gustavo@empresa.com",
        password: "123456",
        role: "employee",
        team: "team_1",
        position: "Desenvolvedor",
        status: "online",
        avatar: "GU",
        permissions: ["tasks:own"],
        performance: 88,
        createdAt: todayISO(-100)
      },
      {
        id: "user_3",
        name: "Larissa",
        email: "larissa@empresa.com",
        password: "123456",
        role: "employee",
        team: "team_1",
        position: "Designer & Marketing",
        status: "online",
        avatar: "LA",
        permissions: ["tasks:own"],
        performance: 90,
        createdAt: todayISO(-100)
      },
      /* Usuários do portal de empresas (acesso somente a boletos) */
      { id:"user_co1", name:"Empresa Alpha Ltda", email:"acesso@alpha.com.br", password:"alpha@2026", role:"company", companyId:"co_1", team:null, position:"Portal Empresa", avatar:"AL", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() },
      { id:"user_co2", name:"Beta Soluções ME",   email:"acesso@beta.com.br",  password:"beta@2026",  role:"company", companyId:"co_2", team:null, position:"Portal Empresa", avatar:"BS", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() },
      { id:"user_co3", name:"Gama Tecnologia SA", email:"acesso@gama.com.br",  password:"gama@2026",  role:"company", companyId:"co_3", team:null, position:"Portal Empresa", avatar:"GT", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() }
    ];

    const taskSeeds = [
      {
        title: "Definir escopo da Sprint 14",
        description: "Levantar requisitos com stakeholders e fechar backlog priorizado.",
        assignee: "user_2",
        priority: "alta",
        status: "concluida",
        startOffset: -10,
        dueOffset: -3,
        tags: ["planejamento", "sprint"],
        checklist: [
          { text: "Reunião com stakeholders", done: true },
          { text: "Priorizar backlog", done: true },
          { text: "Validar com diretoria", done: true }
        ],
        timeLogged: 6
      },
      {
        title: "Redesenhar tela de checkout",
        description: "Aplicar novo design system no fluxo de checkout do app mobile.",
        assignee: "user_3",
        priority: "alta",
        status: "em_andamento",
        startOffset: -5,
        dueOffset: 2,
        tags: ["design", "mobile"],
        checklist: [
          { text: "Wireframes", done: true },
          { text: "Protótipo navegável", done: true },
          { text: "Testes de usabilidade", done: false }
        ],
        timeLogged: 9
      },
      {
        title: "Implementar autenticação 2FA",
        description: "Adicionar verificação em duas etapas para login de usuários.",
        assignee: "user_2",
        priority: "urgente",
        status: "em_andamento",
        startOffset: -4,
        dueOffset: 1,
        tags: ["backend", "segurança"],
        checklist: [
          { text: "Escolher provedor de SMS/Email", done: true },
          { text: "Implementar geração de código", done: false },
          { text: "Testes de integração", done: false }
        ],
        timeLogged: 5
      },
      {
        title: "Campanha de lançamento Q3",
        description: "Planejar e executar campanha multicanal para o lançamento do produto.",
        assignee: "user_3",
        priority: "media",
        status: "em_revisao",
        startOffset: -8,
        dueOffset: -1,
        tags: ["marketing", "campanha"],
        checklist: [
          { text: "Definir personas", done: true },
          { text: "Criar materiais gráficos", done: true },
          { text: "Aprovação final", done: false }
        ],
        timeLogged: 12
      },
      {
        title: "Relatório de métricas mensais",
        description: "Consolidar métricas de marketing do último mês para apresentação.",
        assignee: "user_3",
        priority: "baixa",
        status: "nao_iniciada",
        startOffset: 0,
        dueOffset: 5,
        tags: ["relatório"],
        checklist: [],
        timeLogged: 0
      },
      {
        title: "Corrigir bug no cálculo de frete",
        description: "Valores de frete divergentes para CEPs do Nordeste.",
        assignee: "user_2",
        priority: "urgente",
        status: "nao_iniciada",
        startOffset: 0,
        dueOffset: -2,
        tags: ["bug", "backend"],
        checklist: [
          { text: "Reproduzir o bug", done: false },
          { text: "Corrigir cálculo", done: false }
        ],
        timeLogged: 1
      },
      {
        title: "Criar protótipo do dashboard analítico",
        description: "Protótipo de alta fidelidade para o novo módulo de analytics.",
        assignee: "user_3",
        priority: "media",
        status: "em_andamento",
        startOffset: -3,
        dueOffset: 6,
        tags: ["design", "analytics"],
        checklist: [
          { text: "Wireframes", done: true },
          { text: "UI Kit", done: false }
        ],
        timeLogged: 4
      },
      {
        title: "Revisão de contrato com fornecedor",
        description: "Revisar cláusulas contratuais antes da renovação anual.",
        assignee: "user_1",
        priority: "media",
        status: "concluida",
        startOffset: -15,
        dueOffset: -10,
        tags: ["jurídico"],
        checklist: [],
        timeLogged: 3
      },
      {
        title: "Atualizar documentação da API",
        description: "Documentar novos endpoints criados no último sprint.",
        assignee: "user_2",
        priority: "baixa",
        status: "em_revisao",
        startOffset: -6,
        dueOffset: 3,
        tags: ["documentação", "backend"],
        checklist: [{ text: "Revisar endpoints", done: true }],
        timeLogged: 2
      },
      {
        title: "Planejar posts redes sociais",
        description: "Calendário editorial para as próximas duas semanas.",
        assignee: "user_3",
        priority: "baixa",
        status: "concluida",
        startOffset: -7,
        dueOffset: -4,
        tags: ["marketing", "social"],
        checklist: [],
        timeLogged: 5
      },
      {
        title: "Auditoria de acessibilidade",
        description: "Avaliar conformidade WCAG no site institucional.",
        assignee: "user_3",
        priority: "media",
        status: "nao_iniciada",
        startOffset: 1,
        dueOffset: 10,
        tags: ["design", "qualidade"],
        checklist: [],
        timeLogged: 0
      },
      {
        title: "Treinamento de onboarding",
        description: "Criar trilha de treinamento para novos colaboradores.",
        assignee: "user_2",
        priority: "media",
        status: "em_andamento",
        startOffset: -2,
        dueOffset: 8,
        tags: ["rh", "treinamento"],
        checklist: [{ text: "Roteiro do treinamento", done: true }],
        timeLogged: 3
      }
    ];

    const tasks = taskSeeds.map((t, idx) => ({
      id: "task_" + (idx + 1),
      title: t.title,
      description: t.description,
      assignee: t.assignee,
      priority: t.priority,
      status: t.status,
      startDate: todayISO(t.startOffset),
      dueDate: todayISO(t.dueOffset),
      tags: t.tags,
      checklist: t.checklist,
      comments: [],
      attachments: [],
      timeLogged: t.timeLogged,
      archived: false,
      createdAt: todayISO(t.startOffset - 1),
      updatedAt: todayISO(t.startOffset)
    }));

    const activities = [
      { id: uid("act"), user: "user_2", text: "concluiu a tarefa Definir escopo da Sprint 14", date: todayISO(-3) },
      { id: uid("act"), user: "user_3", text: "atualizou o status de Redesenhar tela de checkout", date: todayISO(-1) },
      { id: uid("act"), user: "user_2", text: "comentou em Implementar autenticação 2FA", date: todayISO(0) },
      { id: uid("act"), user: "user_3", text: "moveu Campanha de lançamento Q3 para Em revisão", date: todayISO(-1) },
      { id: uid("act"), user: "user_1", text: "criou a equipe Equipe Principal", date: todayISO(-100) }
    ];

    const settings = {
      companyName: "Minha Empresa",
      logo: "",
      theme: "light",
      notifications: {
        email: true,
        push: true,
        deadlineReminder: true,
        dailySummary: false
      }
    };

    const companies = seedCompanies();
    const boletos   = seedBoletos();

    return { users, teams, tasks, activities, settings, companies, boletos, meta: { version: 1, lastSync: null } };
  }

  /* ------------------------------------------------------------------ */
  /* Persistência (localStorage = "banco de dados" em runtime)          */
  /* ------------------------------------------------------------------ */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const fresh = seedDatabase();
        save(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      let dirty = false;
      if (!parsed.companies) { parsed.companies = seedCompanies(); dirty = true; }
      if (!parsed.boletos)   { parsed.boletos   = seedBoletos();   dirty = true; }
      /* Migração v2: garantir usuários do portal de empresas por ID.
         Roda sempre que schemaVersion < 2, independente do conteúdo. */
      const schemaVer = (parsed.meta && parsed.meta.schemaVersion) || 1;
      if (schemaVer < 2) {
        var coSeeds = [
          { id:"user_co1", name:"Empresa Alpha Ltda", email:"acesso@alpha.com.br", password:"alpha@2026", role:"company", companyId:"co_1", team:null, position:"Portal Empresa", avatar:"AL", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() },
          { id:"user_co2", name:"Beta Soluções ME",   email:"acesso@beta.com.br",  password:"beta@2026",  role:"company", companyId:"co_2", team:null, position:"Portal Empresa", avatar:"BS", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() },
          { id:"user_co3", name:"Gama Tecnologia SA", email:"acesso@gama.com.br",  password:"gama@2026",  role:"company", companyId:"co_3", team:null, position:"Portal Empresa", avatar:"GT", status:"offline", permissions:["boletos:own"], performance:0, createdAt:todayISO() }
        ];
        coSeeds.forEach(function(cu) {
          var idx = parsed.users.findIndex(function(u) { return u.id === cu.id; });
          if (idx >= 0) {
            /* Atualiza email/senha se usuário existir com credenciais antigas */
            parsed.users[idx].email    = cu.email;
            parsed.users[idx].password = cu.password;
            parsed.users[idx].role     = cu.role;
            parsed.users[idx].companyId = cu.companyId;
          } else {
            parsed.users.push(cu);
          }
        });
        if (!parsed.meta) parsed.meta = {};
        parsed.meta.schemaVersion = 2;
        dirty = true;
      }
      /* Migração v3: adicionar campos de contrato às empresas existentes */
      const schemaVer3 = (parsed.meta && parsed.meta.schemaVersion) || 1;
      if (schemaVer3 < 3) {
        (parsed.companies || []).forEach(function(co) {
          if (!('contractText'     in co)) co.contractText     = "";
          if (!('contractFile'     in co)) co.contractFile     = null;
          if (!('contractSignedAt' in co)) co.contractSignedAt = null;
          if (!('contractSignedBy' in co)) co.contractSignedBy = null;
        });
        if (!parsed.meta) parsed.meta = {};
        parsed.meta.schemaVersion = 3;
        dirty = true;
      }
      if (dirty) save(parsed);
      return parsed;
    } catch (e) {
      console.error("Falha ao carregar banco de dados, recriando seed.", e);
      const fresh = seedDatabase();
      save(fresh);
      return fresh;
    }
  }

  function save(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  let db = load();

  function persist() {
    save(db);
  }

  /* ------------------------------------------------------------------ */
  /* Sessão / Autenticação                                              */
  /* ------------------------------------------------------------------ */

  function login(email, password, remember) {
    const user = db.users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
    );
    if (!user) return { ok: false, message: "E-mail ou senha inválidos." };

    user.status = "online";
    persist();

    const session = { userId: user.id, loggedAt: new Date().toISOString() };
    // Sessão sempre em sessionStorage — expira ao fechar a aba ou sair da página
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: sanitizeUser(user) };
  }

  function logout() {
    const session = getSession();
    if (session) {
      const user = db.users.find((u) => u.id === session.userId);
      if (user) {
        user.status = "offline";
        persist();
      }
    }
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const user = db.users.find((u) => u.id === session.userId);
    return user ? sanitizeUser(user) : null;
  }

  function sanitizeUser(user) {
    const copy = clone(user);
    delete copy.password;
    return copy;
  }

  function isAdmin(user) {
    return !!user && user.role === "admin";
  }

  function requireSession(redirectTo) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = redirectTo || "index.html";
      return null;
    }
    return user;
  }

  /* ------------------------------------------------------------------ */
  /* CRUD: Usuários                                                      */
  /* ------------------------------------------------------------------ */

  const Users = {
    list() {
      return clone(db.users).map(sanitizeUser);
    },
    get(id) {
      const u = db.users.find((x) => x.id === id);
      return u ? sanitizeUser(u) : null;
    },
    create(data) {
      const user = Object.assign(
        {
          id: uid("user"),
          status: "offline",
          permissions: data.role === "admin" ? ["all"] : ["tasks:own"],
          performance: 0,
          createdAt: todayISO()
        },
        data
      );
      db.users.push(user);
      persist();
      return sanitizeUser(user);
    },
    update(id, patch) {
      const user = db.users.find((u) => u.id === id);
      if (!user) return null;
      Object.assign(user, patch);
      persist();
      return sanitizeUser(user);
    },
    remove(id) {
      db.users = db.users.filter((u) => u.id !== id);
      persist();
      return true;
    }
  };

  /* ------------------------------------------------------------------ */
  /* CRUD: Equipes                                                       */
  /* ------------------------------------------------------------------ */

  const Teams = {
    list() {
      return clone(db.teams);
    },
    get(id) {
      return clone(db.teams.find((t) => t.id === id)) || null;
    },
    create(data) {
      const team = Object.assign({ id: uid("team"), color: "#cc785c" }, data);
      db.teams.push(team);
      persist();
      return clone(team);
    },
    update(id, patch) {
      const team = db.teams.find((t) => t.id === id);
      if (!team) return null;
      Object.assign(team, patch);
      persist();
      return clone(team);
    },
    remove(id) {
      db.teams = db.teams.filter((t) => t.id !== id);
      persist();
      return true;
    },
    members(id) {
      return db.users.filter((u) => u.team === id).map(sanitizeUser);
    }
  };

  /* ------------------------------------------------------------------ */
  /* CRUD: Empresas (clientes atendidos)                                */
  /* ------------------------------------------------------------------ */

  const Companies = {
    list() { return clone(db.companies || []); },
    get(id) { return clone((db.companies || []).find((c) => c.id === id)) || null; },
    create(data) {
      const co = Object.assign({ id: uid("co"), status: "ativo" }, data);
      db.companies = db.companies || [];
      db.companies.push(co);
      persist();
      return clone(co);
    },
    update(id, patch) {
      const co = (db.companies || []).find((c) => c.id === id);
      if (!co) return null;
      Object.assign(co, patch);
      persist();
      return clone(co);
    },
    remove(id) {
      db.companies = (db.companies || []).filter((c) => c.id !== id);
      persist();
      return true;
    },
    signContract(id, signerName) {
      const co = (db.companies || []).find((c) => c.id === id);
      if (!co) return null;
      co.contractSignedAt = new Date().toISOString();
      co.contractSignedBy = signerName;
      persist();
      return clone(co);
    },
    resetContractSign(id) {
      const co = (db.companies || []).find((c) => c.id === id);
      if (!co) return null;
      co.contractSignedAt = null;
      co.contractSignedBy = null;
      persist();
      return clone(co);
    }
  };

  /* ------------------------------------------------------------------ */
  /* CRUD: Boletos                                                       */
  /* ------------------------------------------------------------------ */

  const Boletos = {
    list(filter) {
      let list = clone(db.boletos || []);
      if (filter) {
        if (filter.companyId) list = list.filter((b) => b.companyId === filter.companyId);
        if (filter.month)     list = list.filter((b) => b.month === filter.month);
        if (filter.status)    list = list.filter((b) => b.status === filter.status);
      }
      return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    },
    get(id) { return clone((db.boletos || []).find((b) => b.id === id)) || null; },
    create(data) {
      const bol = Object.assign({ id: uid("bol"), paidDate: null, notes: "", status: "pendente" }, data);
      db.boletos = db.boletos || [];
      db.boletos.push(bol);
      persist();
      return clone(bol);
    },
    update(id, patch) {
      const bol = (db.boletos || []).find((b) => b.id === id);
      if (!bol) return null;
      Object.assign(bol, patch);
      persist();
      return clone(bol);
    },
    remove(id) {
      db.boletos = (db.boletos || []).filter((b) => b.id !== id);
      persist();
      return true;
    }
  };

  /* ------------------------------------------------------------------ */
  /* CRUD: Tarefas                                                       */
  /* ------------------------------------------------------------------ */

  const Tasks = {
    list(filter) {
      let list = clone(db.tasks);
      if (filter) {
        if (filter.assignee) list = list.filter((t) => t.assignee === filter.assignee);
        if (filter.includeArchived !== true) list = list.filter((t) => !t.archived);
      }
      return list;
    },
    get(id) {
      return clone(db.tasks.find((t) => t.id === id)) || null;
    },
    create(data) {
      const task = Object.assign(
        {
          id: uid("task"),
          tags: [],
          checklist: [],
          comments: [],
          attachments: [],
          timeLogged: 0,
          archived: false,
          createdAt: todayISO(),
          updatedAt: todayISO()
        },
        data
      );
      db.tasks.push(task);
      logActivity(getCurrentUser()?.id, `criou a tarefa "${task.title}"`);
      persist();
      return clone(task);
    },
    update(id, patch) {
      const task = db.tasks.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, patch, { updatedAt: todayISO() });
      persist();
      return clone(task);
    },
    remove(id) {
      db.tasks = db.tasks.filter((t) => t.id !== id);
      persist();
      return true;
    },
    duplicate(id) {
      const original = db.tasks.find((t) => t.id === id);
      if (!original) return null;
      const copy = clone(original);
      copy.id = uid("task");
      copy.title = original.title + " (cópia)";
      copy.status = "nao_iniciada";
      copy.createdAt = todayISO();
      copy.updatedAt = todayISO();
      db.tasks.push(copy);
      persist();
      return clone(copy);
    },
    archive(id, archived) {
      const task = db.tasks.find((t) => t.id === id);
      if (!task) return null;
      task.archived = archived !== false;
      persist();
      return clone(task);
    },
    addComment(id, author, text) {
      const task = db.tasks.find((t) => t.id === id);
      if (!task) return null;
      task.comments.push({ id: uid("cmt"), author, text, date: new Date().toISOString() });
      persist();
      return clone(task);
    },
    isOverdue(task) {
      if (task.status === "concluida") return false;
      return task.dueDate < todayISO();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Atividades recentes                                                 */
  /* ------------------------------------------------------------------ */

  function logActivity(userId, text) {
    if (!userId) return;
    db.activities = db.activities || [];
    db.activities.unshift({ id: uid("act"), user: userId, text, date: todayISO() });
    db.activities = db.activities.slice(0, 50);
  }

  const Activities = {
    list(limit) {
      return clone((db.activities || []).slice(0, limit || 10));
    }
  };

  /* ------------------------------------------------------------------ */
  /* Configurações                                                       */
  /* ------------------------------------------------------------------ */

  const Settings = {
    get() {
      return clone(db.settings);
    },
    update(patch) {
      db.settings = Object.assign({}, db.settings, patch);
      persist();
      return clone(db.settings);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Indicadores / Estatísticas                                          */
  /* ------------------------------------------------------------------ */

  const Stats = {
    overview() {
      const tasks = db.tasks.filter((t) => !t.archived);
      const total = tasks.length;
      const concluded = tasks.filter((t) => t.status === "concluida").length;
      const inProgress = tasks.filter((t) => t.status === "em_andamento").length;
      const overdue = tasks.filter((t) => Tasks.isOverdue(t)).length;
      const activeUsers = db.users.filter((u) => u.status !== "offline").length;
      const productivity = total ? Math.round((concluded / total) * 100) : 0;
      return { total, concluded, inProgress, overdue, activeUsers, productivity };
    },
    tasksByStatus() {
      const statuses = ["backlog", "nao_iniciada", "em_andamento", "em_revisao", "concluida"];
      const tasks = db.tasks.filter((t) => !t.archived);
      return statuses.map((s) => ({
        status: s,
        count: tasks.filter((t) => t.status === s).length
      }));
    },
    tasksByPriority() {
      const priorities = ["baixa", "media", "alta", "urgente"];
      const tasks = db.tasks.filter((t) => !t.archived);
      return priorities.map((p) => ({
        priority: p,
        count: tasks.filter((t) => t.priority === p).length
      }));
    },
    tasksPerUser() {
      return db.users.map((u) => {
        const userTasks = db.tasks.filter((t) => t.assignee === u.id && !t.archived);
        const concluded = userTasks.filter((t) => t.status === "concluida").length;
        return {
          userId: u.id,
          name: u.name,
          total: userTasks.length,
          concluded,
          onTime: userTasks.filter((t) => t.status === "concluida" && t.dueDate >= t.updatedAt).length,
          hours: userTasks.reduce((sum, t) => sum + (t.timeLogged || 0), 0)
        };
      });
    },
    weeklyCompletion() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = todayISO(-i);
        const count = db.tasks.filter((t) => t.status === "concluida" && t.updatedAt === date).length;
        days.push({ date, count });
      }
      return days;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Export / Import — Banco de dados em Excel (.xlsx)                  */
  /* Usa SheetJS (carregado via CDN em settings/relatórios)             */
  /* ------------------------------------------------------------------ */

  function buildWorkbook() {
    const XLSX = global.XLSX;
    if (!XLSX) throw new Error("Biblioteca SheetJS (XLSX) não carregada.");

    const wb = XLSX.utils.book_new();

    const usersSheet = db.users.map((u) => ({
      ID: u.id,
      Nome: u.name,
      Email: u.email,
      Cargo: u.position,
      Equipe: (db.teams.find((t) => t.id === u.team) || {}).name || "",
      Perfil: u.role === "admin" ? "Administrador" : "Funcionário",
      Status: u.status,
      Desempenho: u.performance
    }));

    const tasksSheet = db.tasks.map((t) => ({
      ID: t.id,
      Titulo: t.title,
      Descricao: t.description,
      Responsavel: (db.users.find((u) => u.id === t.assignee) || {}).name || "",
      Prioridade: t.priority,
      Status: t.status,
      DataInicio: t.startDate,
      DataPrazo: t.dueDate,
      Tags: (t.tags || []).join(", "),
      HorasRegistradas: t.timeLogged,
      Arquivada: t.archived ? "Sim" : "Não"
    }));

    const teamsSheet = db.teams.map((tm) => ({
      ID: tm.id,
      Nome: tm.name,
      Lider: (db.users.find((u) => u.id === tm.lead) || {}).name || "",
      Membros: db.users.filter((u) => u.team === tm.id).length
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), "Usuarios");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksSheet), "Tarefas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamsSheet), "Equipes");

    return wb;
  }

  function exportToExcel(filename) {
    const XLSX = global.XLSX;
    if (!XLSX) {
      alert("Biblioteca de exportação (SheetJS) ainda não carregou. Verifique sua conexão e tente novamente.");
      return;
    }
    const wb = buildWorkbook();
    XLSX.writeFile(wb, filename || "banco_de_dados.xlsx");
    db.meta.lastSync = new Date().toISOString();
    persist();
  }

  function importFromExcel(file, callback) {
    const XLSX = global.XLSX;
    if (!XLSX) {
      callback && callback({ ok: false, message: "Biblioteca SheetJS não carregada." });
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        if (workbook.Sheets["Tarefas"]) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Tarefas"]);
          rows.forEach((row) => {
            const existing = db.tasks.find((t) => t.id === row.ID);
            const assigneeUser = db.users.find((u) => u.name === row.Responsavel);
            const payload = {
              title: row.Titulo,
              description: row.Descricao,
              assignee: assigneeUser ? assigneeUser.id : (existing ? existing.assignee : null),
              priority: row.Prioridade,
              status: row.Status,
              startDate: row.DataInicio,
              dueDate: row.DataPrazo,
              tags: row.Tags ? String(row.Tags).split(",").map((s) => s.trim()) : [],
              timeLogged: Number(row.HorasRegistradas) || 0,
              archived: row.Arquivada === "Sim"
            };
            if (existing) {
              Object.assign(existing, payload, { updatedAt: todayISO() });
            } else {
              db.tasks.push(
                Object.assign(
                  {
                    id: row.ID || uid("task"),
                    checklist: [],
                    comments: [],
                    attachments: [],
                    createdAt: todayISO(),
                    updatedAt: todayISO()
                  },
                  payload
                )
              );
            }
          });
        }

        db.meta.lastSync = new Date().toISOString();
        persist();
        callback && callback({ ok: true, message: "Importação concluída com sucesso." });
      } catch (err) {
        console.error(err);
        callback && callback({ ok: false, message: "Erro ao importar planilha: " + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* ------------------------------------------------------------------ */
  /* Camada preparada para futura integração com API real                */
  /* Basta substituir as implementações de cada método mantendo a        */
  /* mesma assinatura (Promises) para plugar um backend HTTP real.       */
  /* ------------------------------------------------------------------ */

  const api = {
    baseUrl: null, // ex: "https://api.minhaempresa.com/v1"
    async request(path, options) {
      // Quando um backend real existir, este método fará fetch(baseUrl + path, options)
      console.warn("[DB.api] Backend real não configurado. Operação simulada localmente.", path, options);
      return Promise.resolve(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Reset (utilitário de desenvolvimento)                               */
  /* ------------------------------------------------------------------ */

  function resetDatabase() {
    db = seedDatabase();
    persist();
  }

  /* ------------------------------------------------------------------ */
  /* Exposição pública                                                    */
  /* ------------------------------------------------------------------ */

  global.DB = {
    uid,
    todayISO,
    login,
    logout,
    getSession,
    getCurrentUser,
    isAdmin,
    requireSession,
    Users,
    Teams,
    Companies,
    Boletos,
    Tasks,
    Activities,
    Settings,
    Stats,
    exportToExcel,
    importFromExcel,
    resetDatabase,
    api
  };
})(window);
