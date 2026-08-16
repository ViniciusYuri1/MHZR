/* ==========================================================================
   auth.js — Lógica da tela de login / cadastro de empresa (Supabase Auth)
   ========================================================================== */

(function () {
  "use strict";

  // ── aviso de configuração ausente ───────────────────────────────────────
  if (!DB.configured) {
    const box = document.getElementById("login-error");
    if (box) {
      box.textContent = "Sistema não configurado: edite js/supabase-config.js com a URL e a anon key do projeto Supabase.";
      box.classList.add("visible");
    }
  }

  // ── sessão já ativa? vai direto para o app ──────────────────────────────
  DB.init().then((user) => {
    if (user) window.location.href = "app.html";
  });

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

  toggleBtn.addEventListener("click", () => {
    const hide = passInput.type === "password";
    passInput.type = hide ? "text" : "password";
    toggleBtn.textContent = hide ? "Ocultar" : "Mostrar";
  });

  document.getElementById("forgot-link").addEventListener("click", (e) => {
    e.preventDefault();
    UI.toast("Peça ao administrador para redefinir sua senha na tela Equipe.", "success");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("visible");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Entrando...';

    const result = await DB.login(emailInput.value.trim(), passInput.value);
    if (!result.ok) {
      errorBox.textContent = result.message;
      errorBox.classList.add("visible");
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
      return;
    }
    window.location.href = "app.html";
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

  regForm.addEventListener("submit", async (e) => {
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

    regSubmit.disabled = true;
    regSubmit.innerHTML = '<span class="spinner"></span> Criando acesso...';

    const result = await DB.signUpCompany({ name, email, password: pass, cnpj, phone });
    if (!result.ok) {
      showRegError(result.message);
      regSubmit.disabled = false;
      regSubmit.textContent = "Criar acesso";
      if (result.needsConfirm) showLogin();
      return;
    }

    window.location.href = "app.html";
  });
})();
