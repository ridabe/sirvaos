insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

alter table storage.objects enable row level security;

drop policy if exists "Public can read tenant logos" on storage.objects;
create policy "Public can read tenant logos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'tenant-logos');

drop policy if exists "Tenant admins can manage their own tenant logos" on storage.objects;
create policy "Tenant admins can manage their own tenant logos"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'tenant-logos'
  and (
    app_private.is_global_admin()
    or (
      app_private.is_tenant_admin()
      and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
      and split_part(name, '/', 2)::uuid = app_private.current_tenant_id()
    )
  )
)
with check (
  bucket_id = 'tenant-logos'
  and (
    app_private.is_global_admin()
    or (
      app_private.is_tenant_admin()
      and split_part(name, '/', 2) ~ '^[0-9a-fA-F-]{36}$'
      and split_part(name, '/', 2)::uuid = app_private.current_tenant_id()
    )
  )
);

