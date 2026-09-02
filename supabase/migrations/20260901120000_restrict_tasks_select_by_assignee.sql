-- ============================================================================
-- Restringe a visibilidade de tarefas no banco (RLS), não só no client.
--
-- Antes, tasks_select liberava a tabela inteira para qualquer is_staff()
-- (admin OU employee) — inclusive o "Funcionário 2" (employee com a
-- permissão extra "tasks:manage"). A tela já filtra por responsável no
-- front, mas qualquer employee autenticado conseguia ler todas as tarefas
-- direto da API (ex.: DevTools), pois a política do banco não impedia.
--
-- Agora só o admin vê todas as tarefas; funcionários (comuns e
-- "Funcionário 2") só veem tarefas em que são o responsável (assignee);
-- o portal da empresa continua vendo as tarefas vinculadas à própria
-- empresa. Isso espelha exatamente a regra já aplicada no client
-- (DB.canSeeAllTasks em js/data.js).
-- ============================================================================

drop policy if exists tasks_select on public.tasks;

create policy tasks_select on public.tasks for select to authenticated
  using (
    public.is_admin()
    or (data ->> 'assignee') = auth.uid()::text
    or (data ->> 'companyId') = public.my_company()
  );
