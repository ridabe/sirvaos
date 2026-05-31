create table if not exists public.tenant_feature_flags (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, flag_key),
  constraint tenant_feature_flags_key_format check (flag_key ~ '^[a-z0-9][a-z0-9_.:-]*$')
);

create index if not exists tenant_feature_flags_tenant_id_idx on public.tenant_feature_flags (tenant_id);

drop trigger if exists set_tenant_feature_flags_updated_at on public.tenant_feature_flags;
create trigger set_tenant_feature_flags_updated_at
before update on public.tenant_feature_flags
for each row execute function public.set_updated_at();

alter table public.tenant_feature_flags enable row level security;

drop policy if exists "Tenant members can read feature flags" on public.tenant_feature_flags;
create policy "Tenant members can read feature flags"
on public.tenant_feature_flags
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can manage feature flags" on public.tenant_feature_flags;
create policy "Tenant admins can manage feature flags"
on public.tenant_feature_flags
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_tenant_admin()
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_tenant_admin()
  )
);

grant select, insert, update, delete on public.tenant_feature_flags to authenticated;
