do $$
begin
  create type public.tenant_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add column tenant_id uuid references public.tenants (id) on delete set null;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.profiles add column tenant_role public.tenant_role not null default 'member';
exception
  when duplicate_column then null;
end $$;

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);
create index if not exists profiles_tenant_role_idx on public.profiles (tenant_role);

create or replace function app_private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function app_private.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and tenant_id is not null
      and (tenant_role in ('owner', 'admin') or tenant_role is null)
  );
$$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text not null default 'active',
  ministry text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  message text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.tenant_events enable row level security;
alter table public.tenant_announcements enable row level security;

-- Tenant profile visibility for authenticated tenant members
drop policy if exists "Tenant profiles can read tenant members" on public.profiles;
create policy "Tenant profiles can read tenant members"
  on public.profiles
  for select
  to authenticated
  using (tenant_id = app_private.current_tenant_id());

drop policy if exists "Tenant admins can insert tenant profiles" on public.profiles;
create policy "Tenant admins can insert tenant profiles"
  on public.profiles
  for insert
  to authenticated
  with check (
    tenant_id = app_private.current_tenant_id()
    and (app_private.is_tenant_admin() or app_private.is_global_admin())
  );

drop policy if exists "Tenant admins can update tenant profiles" on public.profiles;
create policy "Tenant admins can update tenant profiles"
  on public.profiles
  for update
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    and (app_private.is_tenant_admin() or app_private.is_global_admin())
  )
  with check (
    tenant_id = app_private.current_tenant_id()
    and (app_private.is_tenant_admin() or app_private.is_global_admin())
  );

drop policy if exists "Tenant members can read members" on public.members;
create policy "Tenant members can read members"
  on public.members
  for select
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

drop policy if exists "Tenant admins can manage members" on public.members;
create policy "Tenant admins can manage members"
  on public.members
  for all
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  )
  with check (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

drop policy if exists "Tenant members can read tenant events" on public.tenant_events;
create policy "Tenant members can read tenant events"
  on public.tenant_events
  for select
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

drop policy if exists "Tenant admins can manage tenant events" on public.tenant_events;
create policy "Tenant admins can manage tenant events"
  on public.tenant_events
  for all
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  )
  with check (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

drop policy if exists "Tenant members can read tenant announcements" on public.tenant_announcements;
create policy "Tenant members can read tenant announcements"
  on public.tenant_announcements
  for select
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

drop policy if exists "Tenant admins can manage tenant announcements" on public.tenant_announcements;
create policy "Tenant admins can manage tenant announcements"
  on public.tenant_announcements
  for all
  to authenticated
  using (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  )
  with check (
    tenant_id = app_private.current_tenant_id()
    or app_private.is_global_admin()
  );

grant usage on schema public to authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_tenant_id() to authenticated;
grant execute on function app_private.is_tenant_admin() to authenticated;
grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.tenant_events to authenticated;
grant select, insert, update, delete on public.tenant_announcements to authenticated;
grant select on public.profiles to authenticated;
