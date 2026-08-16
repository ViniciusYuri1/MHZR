/* ==========================================================================
   supabase-client.js — Instancia o cliente Supabase (window.SB).
   A sessão fica em sessionStorage: sobrevive a recarregamentos, mas expira
   ao fechar a aba (mesmo comportamento da versão anterior do sistema).
   ========================================================================== */

(function (global) {
  "use strict";

  const cfg = global.SUPABASE_CONFIG || {};
  const configured =
    cfg.url && cfg.anonKey &&
    cfg.url.indexOf("COLE_AQUI") === -1 &&
    cfg.anonKey.indexOf("COLE_AQUI") === -1;

  if (!configured) {
    global.SB = null;
    console.error(
      "[Supabase] Não configurado. Edite js/supabase-config.js com a URL e a anon key do projeto."
    );
    return;
  }

  if (!global.supabase || !global.supabase.createClient) {
    global.SB = null;
    console.error("[Supabase] Biblioteca supabase-js não carregou (verifique a conexão/CDN).");
    return;
  }

  global.SB = global.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: {
      storage: global.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
})(window);
