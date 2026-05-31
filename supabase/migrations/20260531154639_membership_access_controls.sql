do $$
begin
  alter table public.profiles add column member_id uuid references public.members (id) on delete set null;
exception
  when duplicate_column then null;
end $$;

create index if not exists profiles_member_id_idx on public.profiles (member_id);

create or replace function app_private.ensure_profile_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_member_id uuid;
begin
  if new.tenant_id is not null and new.member_id is null then
    insert into public.members (
      tenant_id,
      name,
      email,
      phone,
      status,
      status_v2,
      ministry,
      notes
    )
    values (
      new.tenant_id,
      coalesce(nullif(new.full_name, ''), new.email),
      new.email,
      null,
      'active',
      'active',
      null,
      null
    )
    returning id into created_member_id;

    new.member_id := created_member_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_profile_member on public.profiles;
create trigger ensure_profile_member
before update of tenant_id, full_name on public.profiles
for each row execute function app_private.ensure_profile_member();

create or replace function app_private.is_secretaria_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.member_ministries mm
      on mm.member_id = p.member_id
     and mm.tenant_id = p.tenant_id
    join public.catalog_ministries cm
      on cm.id = mm.ministry_id
    where p.id = auth.uid()
      and p.status = 'active'
      and p.tenant_id is not null
      and mm.is_admin = true
      and lower(cm.name) like 'secretaria%'
  );
$$;

create or replace function app_private.can_manage_members()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.is_secretaria_admin();
$$;

drop policy if exists "Tenant members can read members" on public.members;
create policy "Tenant members can read members"
on public.members
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage members" on public.members;
create policy "Tenant authorized can manage members"
on public.members
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant members can read member roles" on public.member_roles;
create policy "Tenant members can read member roles"
on public.member_roles
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage member roles" on public.member_roles;
create policy "Tenant authorized can manage member roles"
on public.member_roles
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant members can read member ministries" on public.member_ministries;
create policy "Tenant members can read member ministries"
on public.member_ministries
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage member ministries" on public.member_ministries;
create policy "Tenant authorized can manage member ministries"
on public.member_ministries
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant members can read families" on public.families;
create policy "Tenant members can read families"
on public.families
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage families" on public.families;
create policy "Tenant authorized can manage families"
on public.families
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant members can read family members" on public.family_members;
create policy "Tenant members can read family members"
on public.family_members
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage family members" on public.family_members;
create policy "Tenant authorized can manage family members"
on public.family_members
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant members can read member history" on public.member_history;
create policy "Tenant members can read member history"
on public.member_history
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage member history" on public.member_history;
create policy "Tenant authorized can manage member history"
on public.member_history
for all
to authenticated
using (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
)
with check (
  app_private.can_manage_members()
  and tenant_id = app_private.current_tenant_id()
);

grant execute on function app_private.is_secretaria_admin() to authenticated;
grant execute on function app_private.can_manage_members() to authenticated;

create or replace view public.tenant_member_metrics
with (security_invoker = true)
as
select
  tenant_id,
  count(*)::int as total_members,
  count(*) filter (where status_v2 = 'active')::int as active_members
from public.members
group by tenant_id;

grant select on public.tenant_member_metrics to authenticated;
