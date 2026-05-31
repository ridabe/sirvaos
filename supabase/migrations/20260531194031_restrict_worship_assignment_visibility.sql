drop policy if exists "Tenant worship readers can read assignments" on public.worship_assignments;
create policy "Tenant worship readers can read assignments"
on public.worship_assignments
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and (
      app_private.can_manage_module('worship')
      or member_id = (
        select p.member_id
        from public.profiles p
        where p.id = auth.uid()
      )
    )
  )
);
