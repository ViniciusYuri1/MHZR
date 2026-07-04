/* ==========================================================================
   auth.js — Lógica da tela de login
   ========================================================================== */

(function () {
  "use strict";

  // A tela de login tem identidade visual própria (cartão claro + aside
  // ilustrado) e não acompanha o tema claro/escuro do app autenticado.

  // Se já existe sessão ativa, vai direto para o app.
  if (DB.getCurrentUser()) {
    window.location.href = "app.html";
    return;
  }

  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("login-error");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const rememberInput = { checked: false }; // sessão sempre temporária
  const submitBtn = document.getElementById("login-submit");
  const togglePassBtn = document.getElementById("toggle-pass");

  togglePassBtn.addEventListener("click", () => {
    const isPassword = passInput.type === "password";
    passInput.type = isPassword ? "text" : "password";
    togglePassBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
  });

  document.querySelectorAll(".demo-account-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      emailInput.value = btn.dataset.email;
      passInput.value = btn.dataset.pass;
      errorBox.classList.remove("visible");
    });
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
})();
