insert into storage.buckets (id, name, public)
values ('event-banners', 'event-banners', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists event_banners_obj_sel on storage.objects;
create policy event_banners_obj_sel
on storage.objects
for select
to authenticated
using (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
);

drop policy if exists event_banners_obj_ins on storage.objects;
create policy event_banners_obj_ins
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and (
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.can_manage_module('events')
  )
);

drop policy if exists event_banners_obj_upd on storage.objects;
create policy event_banners_obj_upd
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and (
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.can_manage_module('events')
  )
)
with check (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and (
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.can_manage_module('events')
  )
);

drop policy if exists event_banners_obj_del on storage.objects;
create policy event_banners_obj_del
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-banners'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and (
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.can_manage_module('events')
  )
);
