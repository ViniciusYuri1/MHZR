/* ==========================================================================
   auth.js — Lógica da tela de login / cadastro de empresa
   ========================================================================== */

(function () {
  "use strict";

  if (DB.getCurrentUser()) {
    window.location.href = "app.html";
    return;
  }

  // ── helpers de tela ──────────────────────────────────────────────────────
  const screenLogin    = document.getElementById("screen-login");
  const screenRegister = document.getElementById("screen-register");

  function showLogin() {
    screenLogin.style.display = "";
    screenRegister.style.display = "none";
  }
  function showRegister() {
    screenLogin.style.display = "none";
    screenRegister.style.display = "";
  }

  document.getElementById("btn-go-register").addEventListener("click", (e) => {
    e.preventDefault();
    showRegister();
  });
  document.getElementById("btn-go-login").addEventListener("click", (e) => {
    e.preventDefault();
    showLogin();
  });

  // ── LOGIN ────────────────────────────────────────────────────────────────
  const form       = document.getElementById("login-form");
  const errorBox   = document.getElementById("login-error");
  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const submitBtn  = document.getElementById("login-submit");
  const toggleBtn  = document.getElementById("toggle-pass");
  const rememberInput = { checked: false };

  toggleBtn.addEventListener("click", () => {
    const hide = passInput.type === "password";
    passInput.type = hide ? "text" : "password";
    toggleBtn.textContent = hide ? "Ocultar" : "Mostrar";
  });

  document.getElementById("forgot-link").addEventListener("click", (e) => {
    e.preventDefault();
    const email = prompt("Informe seu e-mail cadastrado para receber as instruções de recuperação de senha:");
    if (email) {
      UI.toast("Se o e-mail existir em nossa base, enviaremos as instruções de recuperação.", "success");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.classList.remove("visible");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Entrando...';

    setTimeout(() => {
      const result = DB.login(emailInput.value.trim(), passInput.value, rememberInput.checked);
      if (!result.ok) {
        errorBox.textContent = result.message;
        errorBox.classList.add("visible");
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar";
        return;
      }
      window.location.href = "app.html";
    }, 450);
  });

  // ── CADASTRO DE EMPRESA ──────────────────────────────────────────────────
  const regForm    = document.getElementById("register-form");
  const regError   = document.getElementById("register-error");
  const regSubmit  = document.getElementById("register-submit");
  const toggleRegBtn = document.getElementById("toggle-reg-pass");
  const regPassInput = document.getElementById("reg-pass");

  toggleRegBtn.addEventListener("click", () => {
    const hide = regPassInput.type === "password";
    regPassInput.type = hide ? "text" : "password";
    toggleRegBtn.textContent = hide ? "Ocultar" : "Mostrar";
  });

  function showRegError(msg) {
    regError.textContent = msg;
    regError.classList.add("visible");
  }

  regForm.addEventListener("submit", (e) => {
    e.preventDefault();
    regError.classList.remove("visible");

    const name  = document.getElementById("reg-name").value.trim();
    const cnpj  = document.getElementById("reg-cnpj").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const pass  = document.getElementById("reg-pass").value;
    const pass2 = document.getElementById("reg-pass2").value;

    if (!name)  return showRegError("Informe a Razão Social da empresa.");
    if (!email) return showRegError("Informe o e-mail de acesso.");
    if (pass.length < 6) return showRegError("A senha deve ter pelo menos 6 caracteres.");
    if (pass !== pass2)  return showRegError("As senhas não coincidem.");

    const existing = DB.Users.list().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return showRegError("Este e-mail já está cadastrado. Faça login.");

    regSubmit.disabled = true;
    regSubmit.innerHTML = '<span class="spinner"></span> Criando acesso...';

    setTimeout(() => {
      try {
        /* Reutiliza empresa existente com o mesmo nome (evita duplicatas) */
        let co = DB.Companies.list().find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (!co) {
          co = DB.Companies.create({
            name,
            cnpj: cnpj || "",
            phone: phone || "",
            status: "ativo",
            contractText: "",
            contractFile: null,
            contractSignedAt: null,
            contractSignedBy: null,
          });
        }

        const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

        DB.Users.create({
          name,
          email,
          password: pass,
          role: "company",
          companyId: co.id,
          team: null,
          position: "Portal Empresa",
          avatar: initials,
          status: "offline",
          permissions: ["boletos:own"],
          performance: 0,
        });

        const result = DB.login(email, pass, false);
        if (!result.ok) {
          showRegError("Cadastro criado, mas não foi possível entrar automaticamente. Faça login.");
          regSubmit.disabled = false;
          regSubmit.textContent = "Criar acesso";
          showLogin();
          return;
        }

        window.location.href = "app.html";
      } catch (err) {
        showRegError("Erro ao criar cadastro. Tente novamente.");
        regSubmit.disabled = false;
        regSubmit.textContent = "Criar acesso";
      }
    }, 500);
  });
})();
