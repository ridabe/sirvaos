-- Frente C — Cuidado Pastoral inteligente.
-- Tabela de tarefas de cuidado + RPC de radar (score de engajamento / afastamento).

-- ── Tarefas de cuidado ──────────────────────────────────────────────────────
create table if not exists public.care_tasks (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  member_id           uuid not null references public.members (id) on delete cascade,
  assigned_profile_id uuid references public.profiles (id) on delete set null,
  assigned_member_id  uuid references public.members (id) on delete set null,
  reason              text,
  status              text not null default 'open'
                        check (status in ('open', 'in_progress', 'done', 'dismissed')),
  note                text,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by         uuid references public.profiles (id) on delete set null
);

create index if not exists care_tasks_tenant_status_idx on public.care_tasks (tenant_id, status);
create index if not exists care_tasks_member_idx on public.care_tasks (member_id);

alter table public.care_tasks enable row level security;

-- Admin do tenant (ou global) gerencia tudo.
drop policy if exists care_tasks_admin_all on public.care_tasks;
create policy care_tasks_admin_all on public.care_tasks
  for all
  using (app_private.is_global_admin() or (tenant_id = app_private.current_tenant_id() and app_private.is_tenant_admin()))
  with check (app_private.is_global_admin() or (tenant_id = app_private.current_tenant_id() and app_private.is_tenant_admin()));

-- Líder designado vê e atualiza as próprias tarefas.
drop policy if exists care_tasks_assignee_select on public.care_tasks;
create policy care_tasks_assignee_select on public.care_tasks
  for select
  using (
    tenant_id = app_private.current_tenant_id()
    and (assigned_profile_id = auth.uid()
         or (assigned_member_id is not null and assigned_member_id = app_private.current_member_id()))
  );

drop policy if exists care_tasks_assignee_update on public.care_tasks;
create policy care_tasks_assignee_update on public.care_tasks
  for update
  using (
    tenant_id = app_private.current_tenant_id()
    and (assigned_profile_id = auth.uid()
         or (assigned_member_id is not null and assigned_member_id = app_private.current_member_id()))
  )
  with check (
    tenant_id = app_private.current_tenant_id()
    and (assigned_profile_id = auth.uid()
         or (assigned_member_id is not null and assigned_member_id = app_private.current_member_id()))
  );

comment on table public.care_tasks is 'Frente C: tarefas de cuidado pastoral geradas a partir do radar de afastamento.';

-- ── Radar de cuidado (score de engajamento) ────────────────────────────────
create or replace function public.member_care_radar(p_tenant_id uuid, p_weeks int default 4)
returns table (
  member_id        uuid,
  name             text,
  phone            text,
  whatsapp_opt_in  boolean,
  last_activity    date,
  weeks_since      int,
  score            int,
  band             text,
  signals          jsonb,
  has_open_task    boolean
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_allowed boolean;
  v_today   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_cutoff  date;
begin
  select (app_private.is_global_admin()
          or (p_tenant_id = app_private.current_tenant_id() and app_private.is_tenant_admin()))
    into v_allowed;
  if not v_allowed then
    raise exception 'Acesso negado ao radar de cuidado' using errcode = '42501';
  end if;

  v_cutoff := v_today - (p_weeks * 7);

  return query
  with
  w as (
    select wa.member_id as mid, max(we.starts_at::date) as d
    from public.worship_assignments wa
    join public.worship_events we on we.id = wa.event_id
    where wa.tenant_id = p_tenant_id and wa.status = 'confirmed' and we.starts_at <= now()
    group by wa.member_id
  ),
  eb as (
    select s.member_id as mid, max(ses.session_date) as d
    from public.bible_school_attendance att
    join public.bible_school_enrollments enr on enr.id = att.enrollment_id
    join public.bible_school_students s on s.id = enr.student_id
    join public.bible_school_sessions ses on ses.id = att.session_id
    where att.tenant_id = p_tenant_id and att.status = 'present' and s.member_id is not null
    group by s.member_id
  ),
  k as (
    select g.member_id as mid, max(ka.attendance_date) as d
    from public.kids_attendance ka
    join public.kids_guardians g on g.child_id = ka.child_id
    where ka.tenant_id = p_tenant_id and g.member_id is not null
    group by g.member_id
  ),
  pr as (
    select member_id as mid, max(created_at::date) as d
    from public.prayer_requests
    where tenant_id = p_tenant_id and member_id is not null
    group by member_id
  ),
  mh as (
    select member_id as mid, max(occurred_at::date) as d
    from public.member_history
    where tenant_id = p_tenant_id
    group by member_id
  ),
  agg as (
    select m.id as mid, m.name, m.phone, m.whatsapp_opt_in, m.created_at::date as created_d,
      nullif(greatest(
        coalesce(w.d, '-infinity'::date), coalesce(eb.d, '-infinity'::date),
        coalesce(k.d, '-infinity'::date), coalesce(pr.d, '-infinity'::date),
        coalesce(mh.d, '-infinity'::date)
      ), '-infinity'::date) as last_act,
      ( (case when w.d  >= v_today - 90 then 1 else 0 end)
      + (case when eb.d >= v_today - 90 then 1 else 0 end)
      + (case when k.d  >= v_today - 90 then 1 else 0 end)
      + (case when pr.d >= v_today - 90 then 1 else 0 end)
      + (case when mh.d >= v_today - 90 then 1 else 0 end) ) as channels_90d,
      jsonb_strip_nulls(jsonb_build_object(
        'louvor', w.d, 'escola_biblica', eb.d, 'kids', k.d, 'intercessao', pr.d, 'historico', mh.d
      )) as signals
    from public.members m
    left join w  on w.mid  = m.id
    left join eb on eb.mid = m.id
    left join k  on k.mid  = m.id
    left join pr on pr.mid = m.id
    left join mh on mh.mid = m.id
    where m.tenant_id = p_tenant_id and m.status_v2 = 'active'
  )
  select
    a.mid, a.name, a.phone, a.whatsapp_opt_in,
    a.last_act as last_activity,
    case when a.last_act is null then null else (v_today - a.last_act) / 7 end as weeks_since,
    sc.score,
    case when sc.score >= 60 then 'green' when sc.score >= 30 then 'yellow' else 'red' end as band,
    a.signals,
    exists (select 1 from public.care_tasks ct where ct.member_id = a.mid and ct.status in ('open', 'in_progress')) as has_open_task
  from agg a
  cross join lateral (
    select greatest(0, least(100,
      greatest(0, 60 - (floor((v_today - coalesce(a.last_act, a.created_d)) / 7.0)::int) * 5)
      + least(40, a.channels_90d * 10)
    ))::int as score
  ) sc
  where a.created_d <= v_cutoff
    and (a.last_act is null or a.last_act < v_cutoff)
  order by sc.score asc, a.last_act asc nulls first;
end;
$$;

grant execute on function public.member_care_radar(uuid, int) to authenticated;
comment on function public.member_care_radar(uuid, int) is
  'Frente C: membros ativos sem sinal de engajamento há mais de p_weeks semanas, com score 0-100.';
