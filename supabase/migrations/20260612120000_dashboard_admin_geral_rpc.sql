-- Etapa 2 / Frente A (A2) — RPC consolidada do painel do Pastor / Admin Geral.
-- Devolve, em uma única chamada, todos os KPIs do dashboard "Saúde da Igreja".
-- Contrato de saída: ver docs/etapa-2-A1-dashboard-pastor-contratos.md (tipo AdminGeralDashboard).
-- Segurança: security invoker (herda RLS do usuário) + checagem explícita de papel.

create or replace function public.dashboard_admin_geral(p_tenant_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tz            text := 'America/Sao_Paulo';   -- fixo por ora; futuro: coluna em tenants
  v_now           timestamptz := now();
  v_local_now     timestamp;
  v_mstart        timestamptz;
  v_active        int := 0;
  v_new           int := 0;
  v_visitor       int := 0;
  v_inprocess     int := 0;
  v_finance_on    boolean;
  v_worship_on    boolean;
  v_income        numeric(12,2) := 0;
  v_expense       numeric(12,2) := 0;
  v_finance       jsonb := null;
  v_events        jsonb := '[]'::jsonb;
  v_pending_count int := 0;
  v_pending       jsonb := '[]'::jsonb;
  v_month_label   text;
  v_allowed       boolean;
begin
  -- 1. Autorização: super admin global OU owner/admin do próprio tenant.
  select (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.global_role in ('super_admin', 'operations')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tenant_id = p_tenant_id
        and p.tenant_role in ('owner', 'admin')
    )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Acesso negado ao painel do tenant %', p_tenant_id
      using errcode = '42501';
  end if;

  -- 2. Mês de referência no fuso do tenant.
  v_local_now := v_now at time zone v_tz;
  v_mstart    := date_trunc('month', v_local_now) at time zone v_tz;
  v_month_label :=
    (array['janeiro','fevereiro','março','abril','maio','junho',
           'julho','agosto','setembro','outubro','novembro','dezembro']
    )[extract(month from v_local_now)::int]
    || '/' || extract(year from v_local_now)::text;

  -- 3. KPIs de membros (C1–C4).
  select
    count(*) filter (where status_v2 = 'active'),
    count(*) filter (where created_at >= v_mstart),
    count(*) filter (where status_v2 = 'visitor'),
    count(*) filter (where status_v2 = 'in_process')
  into v_active, v_new, v_visitor, v_inprocess
  from public.members
  where tenant_id = p_tenant_id;

  -- 4. Módulos ativos do tenant.
  v_finance_on := exists (
    select 1 from public.tenant_modules tm
    join public.platform_modules pm on pm.id = tm.module_id
    where tm.tenant_id = p_tenant_id and pm.code = 'financial' and tm.status = 'active'
  );
  v_worship_on := exists (
    select 1 from public.tenant_modules tm
    join public.platform_modules pm on pm.id = tm.module_id
    where tm.tenant_id = p_tenant_id and pm.code = 'worship' and tm.status = 'active'
  );

  -- 5. Resumo financeiro do mês (C5) — só se módulo ativo.
  if v_finance_on then
    select
      coalesce(sum(amount) filter (where type = 'income'), 0),
      coalesce(sum(amount) filter (where type = 'expense'), 0)
    into v_income, v_expense
    from public.financial_transactions
    where tenant_id = p_tenant_id
      and date >= (v_mstart at time zone v_tz)::date;

    v_finance := jsonb_build_object(
      'income',     v_income,
      'expense',    v_expense,
      'balance',    v_income - v_expense,
      'monthLabel', v_month_label
    );
  end if;

  -- 6. Próximos eventos (C6) — união de eventos gerais e de louvor publicados.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', id, 'title', title, 'eventDate', starts_at,
               'location', location, 'source', source
             ) order by starts_at
           ), '[]'::jsonb)
  into v_events
  from (
    select id, title, event_date as starts_at, location, 'tenant_event' as source
      from public.tenant_events
      where tenant_id = p_tenant_id and event_date >= v_now
    union all
    select id, title, starts_at, location, 'worship_event' as source
      from public.worship_events
      where tenant_id = p_tenant_id and starts_at >= v_now and status = 'published'
    order by starts_at asc
    limit 5
  ) u;

  -- 7. Escalas aguardando confirmação (C7) — só se módulo louvor ativo.
  if v_worship_on then
    select count(*)
    into v_pending_count
    from public.worship_assignments wa
    join public.worship_events we on we.id = wa.event_id
    where wa.tenant_id = p_tenant_id
      and wa.status = 'pending'
      and we.starts_at >= v_now;

    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'assignmentId', wa_id, 'eventId', ev_id, 'eventTitle', ev_title,
                 'startsAt', starts_at, 'memberName', member_name, 'roleName', role_name
               ) order by starts_at
             ), '[]'::jsonb)
    into v_pending
    from (
      select wa.id as wa_id, we.id as ev_id, we.title as ev_title,
             we.starts_at, m.name as member_name, wa.role_name
      from public.worship_assignments wa
      join public.worship_events we on we.id = wa.event_id
      join public.members m on m.id = wa.member_id
      where wa.tenant_id = p_tenant_id
        and wa.status = 'pending'
        and we.starts_at >= v_now
      order by we.starts_at asc
      limit 5
    ) p;
  end if;

  -- 8. Monta o contrato AdminGeralDashboard.
  return jsonb_build_object(
    'kpis', jsonb_build_object(
      'activeMembers', jsonb_build_object('value', v_active, 'label', 'Membros ativos'),
      'newThisMonth',  jsonb_build_object(
        'value', v_new, 'label', 'Novos no mês',
        'trendLabel', case when v_new > 0 then '+' || v_new || ' este mês' else 'sem novos este mês' end,
        'trendDir',   case when v_new > 0 then 'up' else 'flat' end
      ),
      'visitors',  jsonb_build_object('value', v_visitor,   'label', 'Visitantes'),
      'inProcess', jsonb_build_object('value', v_inprocess, 'label', 'Em processo')
    ),
    'finance', v_finance,
    'upcomingEvents', v_events,
    'pendingAssignments', jsonb_build_object('count', v_pending_count, 'items', v_pending),
    'careAlerts', jsonb_build_object('coldMembersCount', 0, 'enabled', false),
    'generatedAt', v_now
  );
end;
$$;

grant execute on function public.dashboard_admin_geral(uuid) to authenticated;

comment on function public.dashboard_admin_geral(uuid) is
  'Etapa 2/A2: KPIs consolidados do painel do Pastor/Admin Geral. Ver docs/etapa-2-A1-dashboard-pastor-contratos.md';
