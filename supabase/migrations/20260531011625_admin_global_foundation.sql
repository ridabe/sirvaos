create extension if not exists "pgcrypto";

create schema if not exists app_private;

do $$
begin
  create type public.global_role as enum ('super_admin', 'operations', 'support');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.profile_status as enum ('active', 'invited', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.tenant_status as enum ('active', 'suspended', 'configuring');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.plan_status as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.module_status as enum ('active', 'beta', 'deprecated');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.tenant_module_status as enum ('active', 'inactive', 'suspended', 'configuring');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  global_role public.global_role,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  status public.plan_status not null default 'active',
  max_members integer check (max_members is null or max_members > 0),
  max_admins integer check (max_admins is null or max_admins > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status public.module_status not null default 'active',
  icon_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans (id) on delete set null,
  name text not null,
  slug text not null unique,
  legal_name text,
  document_number text,
  contact_name text,
  contact_email text,
  contact_phone text,
  status public.tenant_status not null default 'configuring',
  logo_url text,
  primary_color text not null default '#087C7A',
  accent_color text not null default '#00A7C4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tenants_primary_color_format check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tenants_accent_color_format check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.tenant_modules (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module_id uuid not null references public.platform_modules (id) on delete cascade,
  status public.tenant_module_status not null default 'configuring',
  enabled_at timestamptz,
  configured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_id)
);

create table if not exists public.audit_logs (
  id bigint primary key generated always as identity,
  tenant_id uuid references public.tenants (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_global_role_idx on public.profiles (global_role);
create index if not exists tenants_plan_id_idx on public.tenants (plan_id);
create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists tenant_modules_module_id_idx on public.tenant_modules (module_id);
create index if not exists tenant_modules_status_idx on public.tenant_modules (status);
create index if not exists audit_logs_tenant_id_created_at_idx on public.audit_logs (tenant_id, created_at desc);
create index if not exists audit_logs_actor_user_id_created_at_idx on public.audit_logs (actor_user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_platform_modules_updated_at on public.platform_modules;
create trigger set_platform_modules_updated_at
before update on public.platform_modules
for each row execute function public.set_updated_at();

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists set_tenant_modules_updated_at on public.tenant_modules;
create trigger set_tenant_modules_updated_at
before update on public.tenant_modules
for each row execute function public.set_updated_at();

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create or replace function app_private.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and global_role in ('super_admin', 'operations')
  );
$$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.platform_modules enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Profiles can read themselves or global admins can read" on public.profiles;
create policy "Profiles can read themselves or global admins can read"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or app_private.is_global_admin());

drop policy if exists "Global admins can insert profiles" on public.profiles;
create policy "Global admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (app_private.is_global_admin());

drop policy if exists "Global admins can update profiles" on public.profiles;
create policy "Global admins can update profiles"
on public.profiles
for update
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can delete profiles" on public.profiles;
create policy "Global admins can delete profiles"
on public.profiles
for delete
to authenticated
using (app_private.is_global_admin());

drop policy if exists "Global admins can manage plans" on public.plans;
create policy "Global admins can manage plans"
on public.plans
for all
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can manage platform modules" on public.platform_modules;
create policy "Global admins can manage platform modules"
on public.platform_modules
for all
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can manage tenants" on public.tenants;
create policy "Global admins can manage tenants"
on public.tenants
for all
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can manage tenant modules" on public.tenant_modules;
create policy "Global admins can manage tenant modules"
on public.tenant_modules
for all
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can read audit logs" on public.audit_logs;
create policy "Global admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (app_private.is_global_admin());

drop policy if exists "Global admins can insert audit logs" on public.audit_logs;
create policy "Global admins can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (app_private.is_global_admin());

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_global_admin() to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.platform_modules to authenticated;
grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.tenant_modules to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

insert into public.plans (code, name, description, monthly_price_cents, max_members, max_admins, sort_order)
values
  ('starter', 'Starter', 'Base para igrejas pequenas iniciando a gestão digital.', 0, 300, 3, 10),
  ('growth', 'Growth', 'Plano para igrejas em crescimento com módulos operacionais.', 0, 1500, 10, 20),
  ('enterprise', 'Enterprise', 'Plano avançado com suporte, auditoria e limites personalizados.', 0, null, null, 30)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  max_members = excluded.max_members,
  max_admins = excluded.max_admins,
  sort_order = excluded.sort_order;

insert into public.platform_modules (code, name, description, status, icon_name, sort_order)
values
  ('members', 'Membresia', 'Cadastro unificado de membros, famílias e vínculos ministeriais.', 'active', 'UsersRound', 10),
  ('calendar', 'Calendário Central', 'Agenda consolidada de cultos, eventos e atividades da igreja.', 'active', 'CalendarDays', 20),
  ('announcements', 'Comunicados', 'Comunicados gerais e notificações básicas para membros.', 'active', 'Bell', 30),
  ('worship', 'Louvor', 'Escalas, integrantes, funções e confirmação de presença.', 'beta', 'Music', 40),
  ('finance', 'Financeiro', 'Dízimos, ofertas, receitas, despesas e relatórios financeiros.', 'beta', 'Wallet', 50),
  ('kids', 'Kids', 'Crianças, responsáveis, turmas, presença e comunicação com pais.', 'beta', 'Baby', 60),
  ('bible-school', 'Escola Bíblica', 'Turmas, professores, alunos, frequência e materiais.', 'beta', 'BookOpen', 70)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  icon_name = excluded.icon_name,
  sort_order = excluded.sort_order;
