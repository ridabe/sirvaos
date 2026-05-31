create table if not exists public.catalog_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_roles_name_len check (char_length(name) between 2 and 80)
);

create table if not exists public.catalog_ministries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_ministries_name_len check (char_length(name) between 2 and 120)
);

create unique index if not exists catalog_roles_system_name_unique
on public.catalog_roles (lower(name))
where tenant_id is null;

create unique index if not exists catalog_roles_tenant_name_unique
on public.catalog_roles (tenant_id, lower(name))
where tenant_id is not null;

create unique index if not exists catalog_ministries_system_name_unique
on public.catalog_ministries (lower(name))
where tenant_id is null;

create unique index if not exists catalog_ministries_tenant_name_unique
on public.catalog_ministries (tenant_id, lower(name))
where tenant_id is not null;

drop trigger if exists set_catalog_roles_updated_at on public.catalog_roles;
create trigger set_catalog_roles_updated_at
before update on public.catalog_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_catalog_ministries_updated_at on public.catalog_ministries;
create trigger set_catalog_ministries_updated_at
before update on public.catalog_ministries
for each row execute function public.set_updated_at();

alter table public.catalog_roles enable row level security;
alter table public.catalog_ministries enable row level security;

drop policy if exists "Authenticated can read roles catalog" on public.catalog_roles;
create policy "Authenticated can read roles catalog"
on public.catalog_roles
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id is null
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage tenant roles catalog" on public.catalog_roles;
create policy "Tenant admins can manage tenant roles catalog"
on public.catalog_roles
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and app_private.is_tenant_admin()
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and app_private.is_tenant_admin()
  )
);

drop policy if exists "Authenticated can read ministries catalog" on public.catalog_ministries;
create policy "Authenticated can read ministries catalog"
on public.catalog_ministries
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id is null
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage tenant ministries catalog" on public.catalog_ministries;
create policy "Tenant admins can manage tenant ministries catalog"
on public.catalog_ministries
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and app_private.is_tenant_admin()
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and app_private.is_tenant_admin()
  )
);

grant select, insert, update, delete on public.catalog_roles to authenticated;
grant select, insert, update, delete on public.catalog_ministries to authenticated;

insert into public.catalog_roles (tenant_id, name)
values
  (null, 'Membro'),
  (null, 'Líder de ministério'),
  (null, 'Admin'),
  (null, 'Pastor'),
  (null, 'Diácono'),
  (null, 'Presbítero'),
  (null, 'Missionário'),
  (null, 'Obreiro'),
  (null, 'Secretaria'),
  (null, 'Tesoureiro'),
  (null, 'Voluntário'),
  (null, 'Funcionário')
on conflict do nothing;

insert into public.catalog_ministries (tenant_id, name)
values
  (null, 'Ministério de Louvor'),
  (null, 'Ministério de Dança'),
  (null, 'Intercessão / Oração'),
  (null, 'Recepção / Acolhimento'),
  (null, 'Comunicação'),
  (null, 'Mídia / Transmissão'),
  (null, 'Som / Áudio'),
  (null, 'Iluminação'),
  (null, 'Kids / Infantil'),
  (null, 'Berçário'),
  (null, 'Adolescentes'),
  (null, 'Jovens'),
  (null, 'Homens'),
  (null, 'Mulheres'),
  (null, 'Casais'),
  (null, 'Pequenos Grupos / Células'),
  (null, 'Escola Bíblica'),
  (null, 'Ensino / Discipulado'),
  (null, 'Evangelismo'),
  (null, 'Missões'),
  (null, 'Ação Social'),
  (null, 'Diaconia / Serviço'),
  (null, 'Visitação'),
  (null, 'Integração de novos membros'),
  (null, 'Secretaria'),
  (null, 'Patrimônio / Manutenção'),
  (null, 'Tecnologia')
on conflict do nothing;
