drop policy if exists "Bible school classes can be read by authorized tenant members" on public.bible_school_classes;
create policy "Bible school classes can be read by authorized tenant members"
on public.bible_school_classes
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_classes.tenant_id
          and bct.class_id = bible_school_classes.id
          and bst.member_id = app_private.current_member_id()
      )
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_students bss
          on bss.id = bse.student_id
         and bss.tenant_id = bse.tenant_id
        where bse.tenant_id = bible_school_classes.tenant_id
          and bse.class_id = bible_school_classes.id
          and bss.member_id = app_private.current_member_id()
          and bse.status = 'active'
      )
    )
  )
);

drop policy if exists "Bible school classes can be managed by module admins" on public.bible_school_classes;
create policy "Bible school classes can be inserted by module admins or teachers"
on public.bible_school_classes
for insert
to authenticated
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_teachers bst
        where bst.tenant_id = app_private.current_tenant_id()
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy "Bible school classes can be updated by module admins or class teachers"
on public.bible_school_classes
for update
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_classes.tenant_id
          and bct.class_id = bible_school_classes.id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_classes.tenant_id
          and bct.class_id = bible_school_classes.id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy "Bible school classes can be deleted by module admins or class teachers"
on public.bible_school_classes
for delete
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_classes.tenant_id
          and bct.class_id = bible_school_classes.id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school class teachers can be managed by module admins" on public.bible_school_class_teachers;
create policy "Bible school class teachers can be inserted by module admins or self teacher"
on public.bible_school_class_teachers
for insert
to authenticated
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_teachers bst
        where bst.tenant_id = bible_school_class_teachers.tenant_id
          and bst.id = bible_school_class_teachers.teacher_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy "Bible school class teachers can be deleted by module admins or self teacher"
on public.bible_school_class_teachers
for delete
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_teachers bst
        where bst.tenant_id = bible_school_class_teachers.tenant_id
          and bst.id = bible_school_class_teachers.teacher_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school sessions can be read by authorized users" on public.bible_school_sessions;
create policy "Bible school sessions can be read by authorized users"
on public.bible_school_sessions
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_sessions.tenant_id
          and bct.class_id = bible_school_sessions.class_id
          and bst.member_id = app_private.current_member_id()
      )
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_students bss
          on bss.id = bse.student_id
         and bss.tenant_id = bse.tenant_id
        where bse.tenant_id = bible_school_sessions.tenant_id
          and bse.class_id = bible_school_sessions.class_id
          and bss.member_id = app_private.current_member_id()
          and bse.status = 'active'
      )
    )
  )
);

drop policy if exists "Bible school sessions can be managed by module admins or teachers" on public.bible_school_sessions;
create policy "Bible school sessions can be managed by module admins or class teachers"
on public.bible_school_sessions
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_sessions.tenant_id
          and bct.class_id = bible_school_sessions.class_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_sessions.tenant_id
          and bct.class_id = bible_school_sessions.class_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school materials can be read by authorized users" on public.bible_school_materials;
create policy "Bible school materials can be read by authorized users"
on public.bible_school_materials
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_materials.tenant_id
          and bct.class_id = bible_school_materials.class_id
          and bst.member_id = app_private.current_member_id()
      )
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_students bss
          on bss.id = bse.student_id
         and bss.tenant_id = bse.tenant_id
        where bse.tenant_id = bible_school_materials.tenant_id
          and bse.class_id = bible_school_materials.class_id
          and bss.member_id = app_private.current_member_id()
          and bse.status = 'active'
      )
    )
  )
);

drop policy if exists "Bible school materials can be managed by module admins or teachers" on public.bible_school_materials;
create policy "Bible school materials can be managed by module admins or class teachers"
on public.bible_school_materials
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_materials.tenant_id
          and bct.class_id = bible_school_materials.class_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_materials.tenant_id
          and bct.class_id = bible_school_materials.class_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school attendance can be managed by module admins or teachers" on public.bible_school_attendance;
create policy "Bible school attendance can be managed by module admins or class teachers"
on public.bible_school_attendance
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_sessions bss
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bss.tenant_id
         and bct.class_id = bss.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bss.tenant_id = bible_school_attendance.tenant_id
          and bss.id = bible_school_attendance.session_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_sessions bss
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bss.tenant_id
         and bct.class_id = bss.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bss.tenant_id = bible_school_attendance.tenant_id
          and bss.id = bible_school_attendance.session_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school students can be read by authorized users" on public.bible_school_students;
create policy "Bible school students can be read by authorized users"
on public.bible_school_students
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or member_id = app_private.current_member_id()
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bse.tenant_id
         and bct.class_id = bse.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bse.tenant_id = bible_school_students.tenant_id
          and bse.student_id = bible_school_students.id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

drop policy if exists "Bible school enrollments can be read by authorized users" on public.bible_school_enrollments;
create policy "Bible school enrollments can be read by authorized users"
on public.bible_school_enrollments
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.is_module_enabled('bible-school')
    and (
      app_private.can_manage_module('bible-school')
      or exists (
        select 1
        from public.bible_school_students bss
        where bss.tenant_id = bible_school_enrollments.tenant_id
          and bss.id = bible_school_enrollments.student_id
          and bss.member_id = app_private.current_member_id()
      )
      or exists (
        select 1
        from public.bible_school_class_teachers bct
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bct.tenant_id = bible_school_enrollments.tenant_id
          and bct.class_id = bible_school_enrollments.class_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

