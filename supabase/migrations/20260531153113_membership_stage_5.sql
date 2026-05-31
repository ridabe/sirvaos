do $$
begin
  create type public.member_status as enum ('active', 'inactive', 'visitor', 'in_process');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.family_relationship as enum ('self', 'spouse', 'child', 'parent', 'guardian', 'sibling', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.members add column updated_at timestamptz not null default now();
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column date_of_birth date;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column document_number text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column address_line1 text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column address_city text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column address_state text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column address_postal_code text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.members add column status_v2 public.member_status;
exception
  when duplicate_column then null;
end $$;

update public.members
set status_v2 = case
  when status in ('active', 'inactive', 'visitor', 'in_process') then status::public.member_status
  else 'active'::public.member_status
end
where status_v2 is null;

alter table public.members
  alter column status_v2 set default 'active',
  alter column status_v2 set not null;

do $$
begin
  alter table public.members add constraint members_status_sync check (status = status_v2::text);
exception
  when duplicate_object then null;
end $$;

create index if not exists members_tenant_id_status_idx on public.members (tenant_id, status_v2);
create index if not exists members_tenant_id_name_idx on public.members (tenant_id, name);

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create table if not exists public.member_roles (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role_id uuid not null references public.catalog_roles (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (member_id, role_id)
);

create table if not exists public.member_ministries (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  ministry_id uuid not null references public.catalog_ministries (id) on delete restrict,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, ministry_id)
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint families_name_len check (char_length(name) between 2 and 120)
);

create table if not exists public.family_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  relationship public.family_relationship not null default 'other',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (family_id, member_id)
);

create table if not exists public.member_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  event_type text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint member_history_event_type_len check (char_length(event_type) between 3 and 80)
);

create index if not exists member_roles_tenant_member_idx on public.member_roles (tenant_id, member_id);
create index if not exists member_ministries_tenant_member_idx on public.member_ministries (tenant_id, member_id);
create index if not exists families_tenant_id_name_idx on public.families (tenant_id, name);
create index if not exists family_members_tenant_family_idx on public.family_members (tenant_id, family_id);
create index if not exists member_history_tenant_member_occurred_idx on public.member_history (tenant_id, member_id, occurred_at desc);

drop trigger if exists set_families_updated_at on public.families;
create trigger set_families_updated_at
before update on public.families
for each row execute function public.set_updated_at();

alter table public.member_roles enable row level security;
alter table public.member_ministries enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.member_history enable row level security;

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
create policy "Tenant admins can manage member roles"
on public.member_roles
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
create policy "Tenant admins can manage member ministries"
on public.member_ministries
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
create policy "Tenant admins can manage families"
on public.families
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
create policy "Tenant admins can manage family members"
on public.family_members
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
create policy "Tenant admins can manage member history"
on public.member_history
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

grant select, insert, update, delete on public.member_roles to authenticated;
grant select, insert, update, delete on public.member_ministries to authenticated;
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.member_history to authenticated;
