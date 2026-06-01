insert into storage.buckets (id, name, public)
values ('bible-school-materials', 'bible-school-materials', false)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists bsm_obj_sel on storage.objects;
create policy bsm_obj_sel
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bible-school-materials'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and app_private.is_module_enabled('bible-school')
  and (
    app_private.is_global_admin()
    or app_private.can_manage_module('bible-school')
    or exists (
      select 1
      from public.bible_school_class_teachers bct
      join public.bible_school_teachers bst
        on bst.id = bct.teacher_id
       and bst.tenant_id = bct.tenant_id
      where bct.tenant_id = app_private.current_tenant_id()
        and bct.class_id = ((storage.foldername(name))[2])::uuid
        and bst.member_id = app_private.current_member_id()
    )
    or exists (
      select 1
      from public.bible_school_enrollments bse
      join public.bible_school_students bss
        on bss.id = bse.student_id
       and bss.tenant_id = bse.tenant_id
      where bse.tenant_id = app_private.current_tenant_id()
        and bse.class_id = ((storage.foldername(name))[2])::uuid
        and bse.status = 'active'
        and bss.member_id = app_private.current_member_id()
    )
  )
);

drop policy if exists bsm_obj_ins on storage.objects;
create policy bsm_obj_ins
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bible-school-materials'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and app_private.is_module_enabled('bible-school')
  and (
    app_private.is_global_admin()
    or app_private.can_manage_module('bible-school')
    or exists (
      select 1
      from public.bible_school_class_teachers bct
      join public.bible_school_teachers bst
        on bst.id = bct.teacher_id
       and bst.tenant_id = bct.tenant_id
      where bct.tenant_id = app_private.current_tenant_id()
        and bct.class_id = ((storage.foldername(name))[2])::uuid
        and bst.member_id = app_private.current_member_id()
    )
  )
);

drop policy if exists bsm_obj_upd on storage.objects;
create policy bsm_obj_upd
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bible-school-materials'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and app_private.is_module_enabled('bible-school')
  and (
    app_private.is_global_admin()
    or app_private.can_manage_module('bible-school')
    or exists (
      select 1
      from public.bible_school_class_teachers bct
      join public.bible_school_teachers bst
        on bst.id = bct.teacher_id
       and bst.tenant_id = bct.tenant_id
      where bct.tenant_id = app_private.current_tenant_id()
        and bct.class_id = ((storage.foldername(name))[2])::uuid
        and bst.member_id = app_private.current_member_id()
    )
  )
)
with check (
  bucket_id = 'bible-school-materials'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and app_private.is_module_enabled('bible-school')
  and (
    app_private.is_global_admin()
    or app_private.can_manage_module('bible-school')
    or exists (
      select 1
      from public.bible_school_class_teachers bct
      join public.bible_school_teachers bst
        on bst.id = bct.teacher_id
       and bst.tenant_id = bct.tenant_id
      where bct.tenant_id = app_private.current_tenant_id()
        and bct.class_id = ((storage.foldername(name))[2])::uuid
        and bst.member_id = app_private.current_member_id()
    )
  )
);

drop policy if exists bsm_obj_del on storage.objects;
create policy bsm_obj_del
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bible-school-materials'
  and (storage.foldername(name))[1] = app_private.current_tenant_id()::text
  and app_private.is_module_enabled('bible-school')
  and (
    app_private.is_global_admin()
    or app_private.can_manage_module('bible-school')
    or exists (
      select 1
      from public.bible_school_class_teachers bct
      join public.bible_school_teachers bst
        on bst.id = bct.teacher_id
       and bst.tenant_id = bct.tenant_id
      where bct.tenant_id = app_private.current_tenant_id()
        and bct.class_id = ((storage.foldername(name))[2])::uuid
        and bst.member_id = app_private.current_member_id()
    )
  )
);

