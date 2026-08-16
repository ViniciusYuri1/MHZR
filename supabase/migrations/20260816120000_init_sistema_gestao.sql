-- ============================================================================
-- Sistema de Gestão de Tarefas — migração inicial para Supabase
--
-- Modelo: tabelas-documento (id text + data jsonb) para as entidades de
-- negócio, espelhando os objetos que o front já usa, e uma tabela `profiles`
-- vinculada ao Supabase Auth para papéis e RLS.
--
-- Papéis (profiles.role): 'admin' | 'employee' | 'company'
--   admin/employee = equipe interna ("staff"); company = portal da empresa.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ----------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'company' check (role in ('admin', 'employee', 'company')),
  company_id text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpers de autorização (security definer para não recursionar na RLS)
create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin', 'employee'), false);
$$;

create or replace function public.my_company()
returns text
language sql stable security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- Tabelas-documento
-- ----------------------------------------------------------------------------

create table public.teams (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.companies (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.boletos (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index boletos_company_idx on public.boletos ((data ->> 'companyId'));

create table public.tasks (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index tasks_company_idx on public.tasks ((data ->> 'companyId'));

create table public.activities (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles     for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.teams        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.boletos      for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.activities   for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.audit_log    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

-- Protege campos sensíveis do perfil: só admin altera role/company_id de alguém
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.company_id is distinct from old.company_id)
     and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papel ou empresa de um perfil.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ----------------------------------------------------------------------------
-- GRANTs + RLS
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.companies    enable row level security;
alter table public.boletos      enable row level security;
alter table public.tasks        enable row level security;
alter table public.activities   enable row level security;
alter table public.audit_log    enable row level security;
alter table public.app_settings enable row level security;

-- profiles: staff vê todos; empresa vê o próprio. Update: admin ou o próprio
-- (trigger acima impede escalar role). Insert/delete só via funções definer.
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_staff() or id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

-- teams: leitura staff; escrita admin
create policy teams_select on public.teams for select to authenticated using (public.is_staff());
create policy teams_write  on public.teams for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- companies: staff tudo; empresa lê e atualiza a própria (assinatura de contrato)
create policy companies_select on public.companies for select to authenticated
  using (public.is_staff() or id = public.my_company());
create policy companies_insert on public.companies for insert to authenticated
  with check (public.is_staff());
create policy companies_update on public.companies for update to authenticated
  using (public.is_staff() or id = public.my_company())
  with check (public.is_staff() or id = public.my_company());
create policy companies_delete on public.companies for delete to authenticated
  using (public.is_admin());

-- boletos: staff tudo; empresa lê apenas os próprios
create policy boletos_select on public.boletos for select to authenticated
  using (public.is_staff() or (data ->> 'companyId') = public.my_company());
create policy boletos_write on public.boletos for insert to authenticated with check (public.is_staff());
create policy boletos_update on public.boletos for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy boletos_delete on public.boletos for delete to authenticated using (public.is_staff());

-- tasks: staff tudo; empresa lê tarefas vinculadas a ela
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_staff() or (data ->> 'companyId') = public.my_company());
create policy tasks_write  on public.tasks for insert to authenticated with check (public.is_staff());
create policy tasks_update on public.tasks for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy tasks_delete on public.tasks for delete to authenticated using (public.is_staff());

-- activities: leitura staff; qualquer autenticado insere (ações geram log)
create policy activities_select on public.activities for select to authenticated using (public.is_staff());
create policy activities_insert on public.activities for insert to authenticated with check (true);
create policy activities_delete on public.activities for delete to authenticated using (public.is_staff());

-- audit_log: leitura/limpeza admin; qualquer autenticado insere
create policy audit_select on public.audit_log for select to authenticated using (public.is_admin());
create policy audit_insert on public.audit_log for insert to authenticated with check (true);
create policy audit_delete on public.audit_log for delete to authenticated using (public.is_admin());

-- app_settings: leitura autenticados; escrita staff
create policy settings_select on public.app_settings for select to authenticated using (true);
create policy settings_write  on public.app_settings for insert to authenticated with check (public.is_staff());
create policy settings_update on public.app_settings for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- Criação de usuários no GoTrue via SQL (uso interno das RPCs e do seed)
-- ----------------------------------------------------------------------------

create or replace function public.create_auth_user_internal(p_email text, p_password text, p_meta jsonb)
returns uuid
language plpgsql security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Este e-mail já está cadastrado.';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, coalesce(p_meta, '{}'::jsonb), now(), now(),
    '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    now(), now(), now()
  );

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: signUp público cria perfil (sempre como 'company' — cadastro do
-- portal). Funcionários/admins são criados apenas pela RPC admin_create_user.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, role, data)
  values (
    new.id, 'company',
    jsonb_build_object(
      'name', v_name,
      'email', new.email,
      'position', 'Portal Empresa',
      'avatar', upper(left(v_name, 2)),
      'status', 'offline',
      'permissions', jsonb_build_array('boletos:own'),
      'performance', 0,
      'createdAt', to_char(now(), 'YYYY-MM-DD')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RPCs de administração de usuários
-- ----------------------------------------------------------------------------

-- Admin cria funcionário/admin/acesso de empresa com senha definida
create or replace function public.admin_create_user(
  p_email text, p_password text, p_role text, p_data jsonb
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem criar usuários.';
  end if;
  if p_role not in ('admin', 'employee', 'company') then
    raise exception 'Papel inválido: %', p_role;
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'A senha deve ter pelo menos 6 caracteres.';
  end if;

  v_id := public.create_auth_user_internal(p_email, p_password, coalesce(p_data, '{}'::jsonb));

  update public.profiles
     set role       = p_role,
         company_id = nullif(p_data ->> 'companyId', ''),
         data       = (coalesce(p_data, '{}'::jsonb) - 'companyId' - 'password')
                        || jsonb_build_object('email', lower(p_email))
   where id = v_id;

  return v_id;
end;
$$;

-- Admin (ou o próprio usuário) troca e-mail e/ou senha
create or replace function public.admin_update_user_credentials(
  p_user_id uuid, p_email text default null, p_password text default null
)
returns void
language plpgsql security definer
set search_path = public, auth, extensions
as $$
begin
  if not (public.is_admin() or p_user_id = auth.uid()) then
    raise exception 'Sem permissão para alterar credenciais deste usuário.';
  end if;

  if p_password is not null then
    if length(p_password) < 6 then
      raise exception 'A senha deve ter pelo menos 6 caracteres.';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = p_user_id;
  end if;

  if p_email is not null then
    if exists (select 1 from auth.users where lower(email) = lower(p_email) and id <> p_user_id) then
      raise exception 'Este e-mail já está em uso por outro usuário.';
    end if;
    update auth.users
       set email = lower(p_email), updated_at = now()
     where id = p_user_id;
    update auth.identities
       set identity_data = identity_data || jsonb_build_object('email', lower(p_email)),
           updated_at = now()
     where user_id = p_user_id and provider = 'email';
    update public.profiles
       set data = data || jsonb_build_object('email', lower(p_email))
     where id = p_user_id;
  end if;
end;
$$;

-- Admin exclui usuário (perfil sai em cascata)
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem excluir usuários.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode excluir o próprio usuário.';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- Cadastro do portal: empresa recém-registrada cria/reaproveita a empresa
-- e vincula o próprio perfil a ela
create or replace function public.register_company(
  p_name text, p_cnpj text default '', p_phone text default '', p_email text default ''
)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_co_id text;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar autenticado.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Informe a razão social.';
  end if;

  select id into v_co_id
    from public.companies
   where lower(trim(data ->> 'name')) = lower(trim(p_name))
   limit 1;

  if v_co_id is null then
    v_co_id := 'co_' || replace(gen_random_uuid()::text, '-', '');
    insert into public.companies (id, data) values (
      v_co_id,
      jsonb_build_object(
        'id', v_co_id, 'name', trim(p_name), 'cnpj', coalesce(p_cnpj, ''),
        'contact', '', 'email', coalesce(p_email, ''), 'phone', coalesce(p_phone, ''),
        'status', 'ativo', 'since', to_char(now(), 'YYYY-MM-DD'),
        'contractText', '', 'contractFile', null,
        'contractSignedAt', null, 'contractSignedBy', null
      )
    );
  end if;

  update public.profiles set company_id = v_co_id where id = auth.uid();
  return v_co_id;
end;
$$;

-- Permissões de execução: nada para anon; RPCs de negócio para authenticated;
-- a interna de criação de usuário não é exposta a ninguém via API.
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.create_auth_user_internal(text, text, jsonb) from authenticated;
grant execute on function public.app_role(), public.is_admin(), public.is_staff(), public.my_company() to authenticated;
grant execute on function public.admin_create_user(text, text, text, jsonb) to authenticated;
grant execute on function public.admin_update_user_credentials(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.register_company(text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Seed: configurações, empresas atendidas, equipe e o primeiro administrador
-- ----------------------------------------------------------------------------

insert into public.app_settings (id, data) values (
  'main',
  '{"companyName": "Minha Empresa", "logo": "", "notifications": {"email": true, "push": true, "deadlineReminder": true, "dailySummary": false}}'::jsonb
);

insert into public.companies (id, data) values
  ('co_1', '{"id":"co_1","name":"Panobianco dos Casa","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_2', '{"id":"co_2","name":"Panobianco Alvarenga","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_3', '{"id":"co_3","name":"Panobianco Raposo","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_4', '{"id":"co_4","name":"Panobianco Castelo","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_5', '{"id":"co_5","name":"Panobianco Riberão","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_6', '{"id":"co_6","name":"Power Pedal","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_7', '{"id":"co_7","name":"Hype Jump","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}'),
  ('co_8', '{"id":"co_8","name":"Vita Spinning","cnpj":"","contact":"","email":"","phone":"","status":"ativo","since":"","contractText":"","contractFile":null,"contractSignedAt":null,"contractSignedBy":null}');

do $$
declare
  v_admin uuid;
begin
  -- Primeiro admin (Murillo). TROQUE A SENHA após o primeiro login!
  v_admin := public.create_auth_user_internal(
    'murillo@empresa.com', 'admin123', '{"name": "Murillo"}'::jsonb
  );

  update public.profiles
     set role = 'admin',
         data = jsonb_build_object(
           'name', 'Murillo', 'email', 'murillo@empresa.com',
           'position', 'Administrador', 'avatar', 'MU', 'status', 'offline',
           'permissions', jsonb_build_array('all'), 'performance', 95,
           'team', 'team_1', 'createdAt', to_char(now(), 'YYYY-MM-DD')
         )
   where id = v_admin;

  insert into public.teams (id, data) values (
    'team_1',
    jsonb_build_object('id', 'team_1', 'name', 'Equipe Principal', 'lead', v_admin::text, 'color', '#7c3aed')
  );
end;
$$;
