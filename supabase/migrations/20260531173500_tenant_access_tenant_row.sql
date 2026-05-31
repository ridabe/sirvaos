alter table public.tenants enable row level security;

drop policy if exists "Tenant members can read their tenant" on public.tenants;
create policy "Tenant members can read their tenant"
on public.tenants
for select
to authenticated
using (
  app_private.is_global_admin()
  or id = app_private.current_tenant_id()
);

drop policy if exists "Tenant admins can update their tenant" on public.tenants;
create policy "Tenant admins can update their tenant"
on public.tenants
for update
to authenticated
using (
  app_private.is_global_admin()
  or (id = app_private.current_tenant_id() and app_private.is_tenant_admin())
)
with check (
  app_private.is_global_admin()
  or (id = app_private.current_tenant_id() and app_private.is_tenant_admin())
);

alter table public.tenant_modules enable row level security;

drop policy if exists "Tenant members can read tenant modules" on public.tenant_modules;
create policy "Tenant members can read tenant modules"
on public.tenant_modules
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id = app_private.current_tenant_id()
);

