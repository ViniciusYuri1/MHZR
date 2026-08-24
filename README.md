# GestãoMHZR — Sistema de Gestão de Tarefas

CRM interno de tarefas, equipe e financeiro (boletos/contratos) com portal para
empresas clientes. Front-end estático (HTML + CSS + JS puro) com banco de dados
e autenticação no **Supabase**.

## Arquitetura

- `index.html` — login e cadastro de empresa cliente (Supabase Auth).
- `app.html` — aplicação (dashboard, tarefas, kanban, equipe, financeiro, portal…).
- `js/data.js` — camada de dados: em `DB.init()` tudo que o usuário pode ver é
  carregado do Supabase para um cache em memória; leituras são síncronas e cada
  alteração é enviada ao servidor em segundo plano.
- `js/supabase-config.js` — URL + anon key do projeto (preencher, ver abaixo).
- `supabase/migrations/` — schema do banco (tabelas, RLS, RPCs, seed).

Papéis: `admin` e `employee` (equipe interna) e `company` (portal da empresa,
vê somente os próprios boletos/contrato). A segurança é garantida por policies
RLS no banco — não apenas pela interface.

## Configuração (uma vez)

1. **Criar o projeto** em [supabase.com](https://supabase.com) (org da equipe →
   New project). Guarde a senha do banco.
2. **Aplicar a migration**: Dashboard → SQL Editor → cole o conteúdo de
   `supabase/migrations/20260816120000_init_sistema_gestao.sql` → Run.
3. **Desativar confirmação de e-mail** (o cadastro do portal loga direto):
   Dashboard → Authentication → Sign In / Providers → Email → desmarque
   **Confirm email** → Save.
4. **Preencher `js/supabase-config.js`** com a URL e a chave **anon public**
   (Dashboard → Settings → API). A anon key é pública por design; quem manda é
   a RLS.
5. Abrir `index.html` e entrar com o admin inicial:
   **murillo@empresa.com / admin123** — e **trocar a senha imediatamente** em
   Configurações → Meu Perfil.

## Migrando dados da versão antiga (localStorage)

No navegador que tinha os dados reais, logue como admin e use
Configurações → Banco de Dados → **“Enviar dados antigos deste navegador”**.
Isso envia empresas, boletos, equipes e tarefas. Usuários não são migrados —
recadastre-os na tela Equipe (defina novas senhas) e os acessos de portal na
tela Financeiro → Empresas → botão de chave.

## Regras de banco

- Nunca edite uma migration já aplicada — crie uma nova
  (`supabase/migrations/AAAA MM DD HHMMSS_descricao.sql`, timestamp real).
- Tabelas novas precisam de GRANT + policies RLS (use a migration inicial como
  modelo).
