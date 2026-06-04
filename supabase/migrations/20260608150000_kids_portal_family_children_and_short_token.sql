drop policy if exists "Tenant members can read kids groups" on public.kids_groups;
create policy "Tenant members can read kids groups"
on public.kids_groups
for select
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Guardians can read own kids guardians" on public.kids_guardians;
create policy "Guardians can read own kids guardians"
on public.kids_guardians
for select
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and member_id = app_private.current_member_id()
);

drop policy if exists "Guardians can manage own kids guardians" on public.kids_guardians;
create policy "Guardians can manage own kids guardians"
on public.kids_guardians
for all
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and member_id = app_private.current_member_id()
)
with check (
  tenant_id = app_private.current_tenant_id()
  and member_id = app_private.current_member_id()
);

drop policy if exists "Guardians can read own kids children" on public.kids_children;
create policy "Guardians can read own kids children"
on public.kids_children
for select
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and exists (
    select 1
    from public.kids_guardians kg
    where kg.tenant_id = kids_children.tenant_id
      and kg.child_id = kids_children.id
      and kg.member_id = app_private.current_member_id()
  )
);

drop policy if exists "Family can read enrolled kids children" on public.kids_children;
create policy "Family can read enrolled kids children"
on public.kids_children
for select
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and kids_children.group_id is not null
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.tenant_id = kids_children.tenant_id
      and p.member_id is not null
  )
  and exists (
    select 1
    from public.family_members fm_me
    join public.family_members fm_child
      on fm_child.family_id = fm_me.family_id
     and fm_child.tenant_id = fm_me.tenant_id
    where fm_me.tenant_id = kids_children.tenant_id
      and fm_me.member_id = app_private.current_member_id()
      and fm_child.member_id is null
      and fm_child.date_of_birth is not null
      and age(current_date, fm_child.date_of_birth) < interval '13 years'
      and lower(btrim(fm_child.name)) = lower(btrim(kids_children.name))
      and fm_child.date_of_birth = kids_children.date_of_birth
  )
);

drop policy if exists "Tenant members can create kids children" on public.kids_children;
create policy "Tenant members can create kids children"
on public.kids_children
for insert
to authenticated
with check (
  tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Guardians can update own kids children" on public.kids_children;
create policy "Guardians can update own kids children"
on public.kids_children
for update
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and exists (
    select 1
    from public.kids_guardians kg
    where kg.tenant_id = kids_children.tenant_id
      and kg.child_id = kids_children.id
      and kg.member_id = app_private.current_member_id()
  )
)
with check (
  tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Guardians can delete own kids children" on public.kids_children;
create policy "Guardians can delete own kids children"
on public.kids_children
for delete
to authenticated
using (
  tenant_id = app_private.current_tenant_id()
  and exists (
    select 1
    from public.kids_guardians kg
    where kg.tenant_id = kids_children.tenant_id
      and kg.child_id = kids_children.id
      and kg.member_id = app_private.current_member_id()
  )
);

create or replace function app_private.get_my_kids_children()
returns table (
  id uuid,
  tenant_id uuid,
  name text,
  date_of_birth date,
  group_id uuid,
  allergies text,
  special_needs text,
  notes text,
  is_active boolean,
  group_name text,
  source text
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select *
  into v_profile
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
  limit 1;

  if v_profile.id is null or v_profile.tenant_id is null or v_profile.member_id is null then
    return;
  end if;

  return query
  with base as (
    select
      kc.*,
      kg.id as guardian_link_id,
      kg.member_id as guardian_member_id
    from public.kids_children kc
    left join public.kids_guardians kg
      on kg.tenant_id = kc.tenant_id
     and kg.child_id = kc.id
     and kg.member_id = v_profile.member_id
    where kc.tenant_id = v_profile.tenant_id
      and kc.is_active = true
  ),
  family_enrolled as (
    select b.id
    from base b
    where b.guardian_link_id is null
      and b.group_id is not null
      and exists (
        select 1
        from public.family_members fm_me
        join public.family_members fm_child
          on fm_child.family_id = fm_me.family_id
         and fm_child.tenant_id = fm_me.tenant_id
        where fm_me.tenant_id = v_profile.tenant_id
          and fm_me.member_id = v_profile.member_id
          and fm_child.member_id is null
          and fm_child.date_of_birth is not null
          and age(current_date, fm_child.date_of_birth) < interval '13 years'
          and lower(btrim(fm_child.name)) = lower(btrim(b.name))
          and fm_child.date_of_birth = b.date_of_birth
      )
  )
  select
    b.id,
    b.tenant_id,
    b.name,
    b.date_of_birth,
    b.group_id,
    b.allergies,
    b.special_needs,
    b.notes,
    b.is_active,
    g.name as group_name,
    case when b.guardian_link_id is not null then 'guardian' else 'family' end as source
  from base b
  left join public.kids_groups g
    on g.id = b.group_id
  where b.guardian_link_id is not null
     or exists (select 1 from family_enrolled fe where fe.id = b.id)
  order by b.name asc;
end;
$$;

create or replace function public.get_my_kids_children()
returns table (
  id uuid,
  tenant_id uuid,
  name text,
  date_of_birth date,
  group_id uuid,
  allergies text,
  special_needs text,
  notes text,
  is_active boolean,
  group_name text,
  source text
)
language sql
security invoker
set search_path = public
as $$
  select * from app_private.get_my_kids_children();
$$;

grant execute on function app_private.get_my_kids_children() to authenticated;
grant execute on function public.get_my_kids_children() to authenticated;

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
set search_path = public, app_private
as $$
declare
  v_profile public.profiles%rowtype;
  v_child public.kids_children%rowtype;
  v_pass public.kids_checkin_passes%rowtype;
  v_valid_hours integer := greatest(1, least(coalesce(in_valid_hours, 8), 24));
  v_is_family_allowed boolean := false;
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
    select exists (
      select 1
      from public.family_members fm_me
      join public.family_members fm_child
        on fm_child.family_id = fm_me.family_id
       and fm_child.tenant_id = fm_me.tenant_id
      where fm_me.tenant_id = v_profile.tenant_id
        and fm_me.member_id = v_profile.member_id
        and fm_child.member_id is null
        and fm_child.date_of_birth is not null
        and age(current_date, fm_child.date_of_birth) < interval '13 years'
        and lower(btrim(fm_child.name)) = lower(btrim(v_child.name))
        and fm_child.date_of_birth = v_child.date_of_birth
    )
    into v_is_family_allowed;

    if not v_is_family_allowed then
      raise exception 'Responsável não vinculado a esta criança';
    end if;

    insert into public.kids_guardians (
      tenant_id,
      child_id,
      name,
      phone,
      relationship,
      member_id,
      is_primary
    )
    select
      v_profile.tenant_id,
      v_child.id,
      coalesce(nullif(btrim(v_profile.full_name), ''), v_profile.email),
      null,
      'parent',
      v_profile.member_id,
      not exists (
        select 1
        from public.kids_guardians kg
        where kg.tenant_id = v_profile.tenant_id
          and kg.child_id = v_child.id
      )
    where not exists (
      select 1
      from public.kids_guardians kg
      where kg.tenant_id = v_profile.tenant_id
        and kg.child_id = v_child.id
        and kg.member_id = v_profile.member_id
    );
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
set search_path = public, app_private
as $$
declare
  v_pass public.kids_checkin_passes%rowtype;
  v_child public.kids_children%rowtype;
  v_now timestamptz := now();
  v_attendance public.kids_attendance%rowtype;
  v_token_raw text := replace(trim(coalesce(in_pass_token, '')), 'kids-pass:', '');
  v_pass_token text;
begin
  if not (
    app_private.is_global_admin()
    or app_private.can_manage_module('kids')
  ) then
    raise exception 'Acesso negado para consumo de QR do Kids';
  end if;

  v_pass_token := lower(replace(replace(trim(v_token_raw), '-', ''), ' ', ''));
  if length(v_pass_token) = 0 then
    raise exception 'QR inválido, expirado ou já utilizado';
  end if;

  if length(v_pass_token) = 6 then
    select *
    into v_pass
    from public.kids_checkin_passes kcp
    where kcp.pass_token like v_pass_token || '%'
      and kcp.used_at is null
      and kcp.valid_from <= v_now
      and kcp.valid_until >= v_now
    order by kcp.created_at desc
    limit 1
    for update;
  else
    select *
    into v_pass
    from public.kids_checkin_passes kcp
    where kcp.pass_token = v_pass_token
      and kcp.used_at is null
      and kcp.valid_from <= v_now
      and kcp.valid_until >= v_now
    limit 1
    for update;
  end if;

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
