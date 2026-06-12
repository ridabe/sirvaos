-- Etapa 2 / Frente A (A5 + A6) — RPCs dos painéis por papel.
-- A5: dashboard_lider_louvor()  -> painel "Meu Ministério" do líder de Louvor.
-- A6: dashboard_membro()        -> painel "Minha Jornada" do membro (portal/app).
-- Ambas usam os helpers app_private.* e respeitam RLS (security invoker).
-- Spec: docs/etapa-2-A1-dashboard-pastor-contratos.md (mesma família de contratos).

-- ───────────────────────────── A5 — Líder de Louvor ─────────────────────────
create or replace function public.dashboard_lider_louvor()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tenant  uuid := app_private.current_tenant_id();
  v_now     timestamptz := now();
  v_events  jsonb := '[]'::jsonb;
  v_pending int := 0;
  v_roster  int := 0;
begin
  if not app_private.can_manage_module('worship') then
    raise exception 'Acesso negado ao painel de louvor' using errcode = '42501';
  end if;

  -- Próximos eventos de louvor com contagem de escalados por status.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'eventId', id, 'title', title, 'startsAt', starts_at, 'eventType', event_type,
               'totalAssigned', total_assigned, 'confirmed', confirmed,
               'pending', pending, 'declined', declined
             ) order by starts_at
           ), '[]'::jsonb)
  into v_events
  from (
    select we.id, we.title, we.starts_at, we.event_type,
           count(wa.id)                                       as total_assigned,
           count(wa.id) filter (where wa.status = 'confirmed') as confirmed,
           count(wa.id) filter (where wa.status = 'pending')   as pending,
           count(wa.id) filter (where wa.status = 'declined')  as declined
    from public.worship_events we
    left join public.worship_assignments wa on wa.event_id = we.id
    where we.tenant_id = v_tenant
      and we.starts_at >= v_now
      and we.status in ('draft', 'published')
    group by we.id
    order by we.starts_at asc
    limit 5
  ) e;

  -- Total de confirmações pendentes (eventos futuros).
  select count(*)
  into v_pending
  from public.worship_assignments wa
  join public.worship_events we on we.id = wa.event_id
  where wa.tenant_id = v_tenant and wa.status = 'pending' and we.starts_at >= v_now;

  -- Integrantes distintos escalados em eventos futuros.
  select count(distinct wa.member_id)
  into v_roster
  from public.worship_assignments wa
  join public.worship_events we on we.id = wa.event_id
  where wa.tenant_id = v_tenant and we.starts_at >= v_now;

  return jsonb_build_object(
    'upcomingEvents', v_events,
    'pendingCount',   v_pending,
    'rosterCount',    v_roster,
    'generatedAt',    v_now
  );
end;
$$;

grant execute on function public.dashboard_lider_louvor() to authenticated;
comment on function public.dashboard_lider_louvor() is
  'Etapa 2/A5: painel Meu Ministério (Louvor) do líder de módulo.';

-- ───────────────────────────── A6 — Membro ─────────────────────────────────
create or replace function public.dashboard_membro()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member        uuid := app_private.current_member_id();
  v_tenant        uuid := app_private.current_tenant_id();
  v_now           timestamptz := now();
  v_assignments   jsonb := '[]'::jsonb;
  v_events        jsonb := '[]'::jsonb;
  v_announcements jsonb := '[]'::jsonb;
begin
  if v_member is null then
    raise exception 'Usuário não vinculado a um membro' using errcode = '42501';
  end if;

  -- Minhas escalas futuras (confirmar/recusar acontece nas telas do portal).
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'assignmentId', wa.id, 'eventId', we.id, 'eventTitle', we.title,
               'startsAt', we.starts_at, 'roleName', coalesce(wr.name, wa.role_name),
               'status', wa.status
             ) order by we.starts_at
           ), '[]'::jsonb)
  into v_assignments
  from public.worship_assignments wa
  join public.worship_events we on we.id = wa.event_id
  left join public.worship_roles wr on wr.id = wa.role_id
  where wa.member_id = v_member and we.starts_at >= v_now;

  -- Próximos eventos da igreja.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', id, 'title', title, 'eventDate', event_date, 'location', location) order by event_date),
           '[]'::jsonb)
  into v_events
  from (
    select id, title, event_date, location
    from public.tenant_events
    where tenant_id = v_tenant and event_date >= v_now
    order by event_date asc
    limit 5
  ) e;

  -- Comunicados recentes.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', id, 'title', title, 'message', message, 'publishedAt', published_at) order by published_at desc),
           '[]'::jsonb)
  into v_announcements
  from (
    select id, title, message, published_at
    from public.tenant_announcements
    where tenant_id = v_tenant
    order by published_at desc
    limit 5
  ) a;

  return jsonb_build_object(
    'myAssignments', v_assignments,
    'upcomingEvents', v_events,
    'announcements', v_announcements,
    'journey', jsonb_build_object('enabled', false),
    'generatedAt', v_now
  );
end;
$$;

grant execute on function public.dashboard_membro() to authenticated;
comment on function public.dashboard_membro() is
  'Etapa 2/A6: painel Minha Jornada do membro (portal/app).';
