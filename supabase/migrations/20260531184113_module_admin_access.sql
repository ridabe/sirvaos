create table if not exists public.tenant_module_admins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module_id uuid not null references public.platform_modules (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tenant_module_admins_subject_check check (profile_id is not null or member_id is not null)
);

create unique index if not exists tenant_module_admins_profile_unique
on public.tenant_module_admins (tenant_id, module_id, profile_id)
where profile_id is not null;

create unique index if not exists tenant_module_admins_member_unique
on public.tenant_module_admins (tenant_id, module_id, member_id)
where member_id is not null;

create index if not exists tenant_module_admins_tenant_member_idx
on public.tenant_module_admins (tenant_id, member_id);

create index if not exists tenant_module_admins_tenant_profile_idx
on public.tenant_module_admins (tenant_id, profile_id);

alter table public.tenant_module_admins enable row level security;

create or replace function app_private.can_manage_module(module_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or exists (
      select 1
      from public.profiles p
      join public.tenant_module_admins tma
        on tma.tenant_id = p.tenant_id
       and (
         tma.profile_id = p.id
         or (p.member_id is not null and tma.member_id = p.member_id)
       )
      join public.platform_modules pm
        on pm.id = tma.module_id
      join public.tenant_modules tm
        on tm.tenant_id = tma.tenant_id
       and tm.module_id = tma.module_id
       and tm.status = 'active'
      where p.id = auth.uid()
        and p.status = 'active'
        and p.tenant_id is not null
        and pm.code = module_code
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
    or app_private.is_secretaria_admin()
    or app_private.can_manage_module('members');
$$;

drop policy if exists "Tenant members can read module admins" on public.tenant_module_admins;
create policy "Tenant members can read module admins"
on public.tenant_module_admins
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage module admins" on public.tenant_module_admins;
create policy "Tenant admins can manage module admins"
on public.tenant_module_admins
for all
to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.is_tenant_admin())
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.is_tenant_admin())
);

drop policy if exists "Tenant admins can manage tenant events" on public.tenant_events;
create policy "Tenant authorized can manage tenant events"
on public.tenant_events
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('calendar')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('calendar')
  )
);

drop policy if exists "Tenant admins can manage tenant announcements" on public.tenant_announcements;
create policy "Tenant authorized can manage tenant announcements"
on public.tenant_announcements
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('announcements')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('announcements')
  )
);

grant execute on function app_private.can_manage_module(text) to authenticated;
grant select, insert, update, delete on public.tenant_module_admins to authenticated;
