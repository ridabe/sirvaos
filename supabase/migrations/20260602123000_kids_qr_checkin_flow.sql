create table if not exists public.kids_checkin_passes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  child_id uuid not null references public.kids_children (id) on delete cascade,
  guardian_member_id uuid not null references public.members (id) on delete cascade,
  pass_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null default (now() + interval '12 hours'),
  used_at timestamptz,
  used_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint kids_checkin_passes_validity_check check (valid_until > valid_from)
);

create index if not exists kids_checkin_passes_tenant_validity_idx
on public.kids_checkin_passes (tenant_id, valid_until desc);

create index if not exists kids_checkin_passes_child_idx
on public.kids_checkin_passes (child_id, valid_until desc);

create index if not exists kids_checkin_passes_guardian_idx
on public.kids_checkin_passes (guardian_member_id, valid_until desc);

alter table public.kids_checkin_passes enable row level security;

drop policy if exists "Kids admins can read passes" on public.kids_checkin_passes;
create policy "Kids admins can read passes"
on public.kids_checkin_passes
for select
to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Guardians can read own passes" on public.kids_checkin_passes;
create policy "Guardians can read own passes"
on public.kids_checkin_passes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.tenant_id = kids_checkin_passes.tenant_id
      and p.member_id = kids_checkin_passes.guardian_member_id
      and p.status = 'active'
  )
);

drop policy if exists "Guardians can create own passes" on public.kids_checkin_passes;
create policy "Guardians can create own passes"
on public.kids_checkin_passes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.kids_guardians kg
      on kg.tenant_id = kids_checkin_passes.tenant_id
     and kg.child_id = kids_checkin_passes.child_id
     and kg.member_id = p.member_id
    where p.id = (select auth.uid())
      and p.tenant_id = kids_checkin_passes.tenant_id
      and p.member_id = kids_checkin_passes.guardian_member_id
      and p.status = 'active'
  )
);

drop policy if exists "Guardians can delete own active passes" on public.kids_checkin_passes;
create policy "Guardians can delete own active passes"
on public.kids_checkin_passes
for delete
to authenticated
using (
  used_at is null
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.tenant_id = kids_checkin_passes.tenant_id
      and p.member_id = kids_checkin_passes.guardian_member_id
      and p.status = 'active'
  )
);

drop policy if exists "Kids admins can update passes" on public.kids_checkin_passes;
create policy "Kids admins can update passes"
on public.kids_checkin_passes
for update
to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

create or replace function app_private.consume_kids_checkin_pass(
  in_pass_token text,
  in_guardian_name text default null,
  in_notes text default null
)
returns table (
  attendance_id uuid,
  child_id uuid,
  child_name text,
  attendance_date date,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass public.kids_checkin_passes%rowtype;
  v_child public.kids_children%rowtype;
  v_now timestamptz := now();
  v_attendance public.kids_attendance%rowtype;
begin
  if not (
    app_private.is_global_admin()
    or app_private.can_manage_module('kids')
  ) then
    raise exception 'Acesso negado para consumo de QR do Kids';
  end if;

  select *
  into v_pass
  from public.kids_checkin_passes
  where pass_token = in_pass_token
    and used_at is null
    and valid_from <= v_now
    and valid_until >= v_now
  limit 1
  for update;

  if v_pass.id is null then
    raise exception 'QR inválido, expirado ou já utilizado';
  end if;

  if v_pass.tenant_id <> app_private.current_tenant_id() and not app_private.is_global_admin() then
    raise exception 'QR pertence a outro tenant';
  end if;

  select *
  into v_child
  from public.kids_children
  where id = v_pass.child_id
  limit 1;

  insert into public.kids_attendance (
    tenant_id,
    child_id,
    group_id,
    attendance_date,
    checked_in_at,
    guardian_name,
    notes
  )
  values (
    v_pass.tenant_id,
    v_pass.child_id,
    v_child.group_id,
    current_date,
    v_now,
    coalesce(in_guardian_name, (
      select kg.name
      from public.kids_guardians kg
      where kg.tenant_id = v_pass.tenant_id
        and kg.child_id = v_pass.child_id
        and kg.member_id = v_pass.guardian_member_id
      order by kg.is_primary desc, kg.created_at asc
      limit 1
    )),
    in_notes
  )
  on conflict (child_id, attendance_date)
  do update
  set
    checked_in_at = coalesce(public.kids_attendance.checked_in_at, excluded.checked_in_at),
    guardian_name = coalesce(public.kids_attendance.guardian_name, excluded.guardian_name),
    notes = coalesce(public.kids_attendance.notes, excluded.notes)
  returning *
  into v_attendance;

  update public.kids_checkin_passes
  set
    used_at = v_now,
    used_by_profile_id = (select auth.uid())
  where id = v_pass.id;

  return query
  select
    v_attendance.id,
    v_attendance.child_id,
    v_child.name,
    v_attendance.attendance_date,
    v_attendance.checked_in_at;
end;
$$;

grant execute on function app_private.consume_kids_checkin_pass(text, text, text) to authenticated;
grant select, insert, update, delete on public.kids_checkin_passes to authenticated;
