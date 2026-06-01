create or replace function app_private.create_kids_checkin_pass(
  in_child_id uuid,
  in_valid_hours integer default 8
)
returns table (
  id uuid,
  child_id uuid,
  pass_token text,
  valid_from timestamptz,
  valid_until timestamptz,
  used_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_child public.kids_children%rowtype;
  v_pass public.kids_checkin_passes%rowtype;
  v_valid_hours integer := greatest(1, least(coalesce(in_valid_hours, 8), 24));
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
  limit 1;

  if v_profile.id is null or v_profile.tenant_id is null or v_profile.member_id is null then
    raise exception 'Perfil de membro inválido para gerar QR do Kids';
  end if;

  select *
  into v_child
  from public.kids_children kc
  where kc.id = in_child_id
    and kc.tenant_id = v_profile.tenant_id
    and kc.is_active = true
  limit 1;

  if v_child.id is null then
    raise exception 'Criança não encontrada para este tenant';
  end if;

  if not exists (
    select 1
    from public.kids_guardians kg
    where kg.tenant_id = v_profile.tenant_id
      and kg.child_id = v_child.id
      and kg.member_id = v_profile.member_id
  ) then
    raise exception 'Responsável não vinculado a esta criança';
  end if;

  update public.kids_checkin_passes
  set used_at = now()
  where kids_checkin_passes.tenant_id = v_profile.tenant_id
    and kids_checkin_passes.child_id = v_child.id
    and kids_checkin_passes.guardian_member_id = v_profile.member_id
    and kids_checkin_passes.used_at is null
    and kids_checkin_passes.valid_until >= now();

  insert into public.kids_checkin_passes (
    tenant_id,
    child_id,
    guardian_member_id,
    valid_until
  )
  values (
    v_profile.tenant_id,
    v_child.id,
    v_profile.member_id,
    now() + make_interval(hours => v_valid_hours)
  )
  returning *
  into v_pass;

  return query
  select
    v_pass.id,
    v_pass.child_id,
    v_pass.pass_token,
    v_pass.valid_from,
    v_pass.valid_until,
    v_pass.used_at,
    v_pass.created_at;
end;
$$;

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
  v_pass_token text := replace(trim(coalesce(in_pass_token, '')), 'kids-pass:', '');
begin
  if not (
    app_private.is_global_admin()
    or app_private.can_manage_module('kids')
  ) then
    raise exception 'Acesso negado para consumo de QR do Kids';
  end if;

  select *
  into v_pass
  from public.kids_checkin_passes kcp
  where kcp.pass_token = v_pass_token
    and kcp.used_at is null
    and kcp.valid_from <= v_now
    and kcp.valid_until >= v_now
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
  from public.kids_children kc
  where kc.id = v_pass.child_id
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
  on conflict on constraint kids_attendance_unique_per_day
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
  where kids_checkin_passes.id = v_pass.id;

  insert into public.audit_logs (
    tenant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_pass.tenant_id,
    (select auth.uid()),
    'kids.qr_checkin.consume',
    'kids_attendance',
    v_attendance.id::text,
    jsonb_build_object(
      'child_id', v_child.id,
      'child_name', v_child.name,
      'pass_id', v_pass.id,
      'checkin_source', 'qr'
    )
  );

  return query
  select
    v_attendance.id,
    v_attendance.child_id,
    v_child.name,
    v_attendance.attendance_date,
    v_attendance.checked_in_at;
end;
$$;

create or replace function public.create_kids_checkin_pass(
  in_child_id uuid,
  in_valid_hours integer default 8
)
returns table (
  id uuid,
  child_id uuid,
  pass_token text,
  valid_from timestamptz,
  valid_until timestamptz,
  used_at timestamptz,
  created_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  select *
  from app_private.create_kids_checkin_pass(in_child_id, in_valid_hours);
$$;

create or replace function public.consume_kids_checkin_pass(
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
language sql
security invoker
set search_path = public
as $$
  select *
  from app_private.consume_kids_checkin_pass(in_pass_token, in_guardian_name, in_notes);
$$;

grant execute on function app_private.create_kids_checkin_pass(uuid, integer) to authenticated;
grant execute on function app_private.consume_kids_checkin_pass(text, text, text) to authenticated;
grant execute on function public.create_kids_checkin_pass(uuid, integer) to authenticated;
grant execute on function public.consume_kids_checkin_pass(text, text, text) to authenticated;
