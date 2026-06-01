do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename like 'bible_school_%'
  loop
    execute format('drop policy if exists %I on %I.%I;', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.bible_school_classes enable row level security;
alter table public.bible_school_teachers enable row level security;
alter table public.bible_school_class_teachers enable row level security;
alter table public.bible_school_students enable row level security;
alter table public.bible_school_enrollments enable row level security;
alter table public.bible_school_sessions enable row level security;
alter table public.bible_school_attendance enable row level security;
alter table public.bible_school_materials enable row level security;
alter table public.bible_school_grades enable row level security;

create policy bs_classes_sel
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
          and bse.status = 'active'
          and bss.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_classes_ins
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

create policy bs_classes_upd
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

create policy bs_classes_del
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

create policy bs_teachers_sel
on public.bible_school_teachers
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
    )
  )
);

create policy bs_teachers_mgmt
on public.bible_school_teachers
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
);

create policy bs_class_teachers_sel
on public.bible_school_class_teachers
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
        from public.bible_school_teachers bst
        where bst.tenant_id = bible_school_class_teachers.tenant_id
          and bst.id = bible_school_class_teachers.teacher_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_class_teachers_ins
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

create policy bs_class_teachers_del
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

create policy bs_students_sel
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

create policy bs_students_mgmt
on public.bible_school_students
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
);

create policy bs_enroll_sel
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

create policy bs_enroll_mgmt
on public.bible_school_enrollments
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('bible-school')
  )
);

create policy bs_sessions_sel
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
          and bse.status = 'active'
          and bss.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_sessions_mgmt
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

create policy bs_att_sel
on public.bible_school_attendance
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
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_students bstud
          on bstud.id = bse.student_id
         and bstud.tenant_id = bse.tenant_id
        where bse.tenant_id = bible_school_attendance.tenant_id
          and bse.id = bible_school_attendance.enrollment_id
          and bstud.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_att_mgmt
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

create policy bs_materials_sel
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
          and bse.status = 'active'
          and bss.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_materials_mgmt
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

create policy bs_grades_sel
on public.bible_school_grades
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
        from public.bible_school_enrollments bse
        join public.bible_school_students bss
          on bss.id = bse.student_id
         and bss.tenant_id = bse.tenant_id
        where bse.tenant_id = bible_school_grades.tenant_id
          and bse.id = bible_school_grades.enrollment_id
          and bss.member_id = app_private.current_member_id()
      )
      or exists (
        select 1
        from public.bible_school_enrollments bse
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bse.tenant_id
         and bct.class_id = bse.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bse.tenant_id = bible_school_grades.tenant_id
          and bse.id = bible_school_grades.enrollment_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

create policy bs_grades_mgmt
on public.bible_school_grades
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
        from public.bible_school_enrollments bse
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bse.tenant_id
         and bct.class_id = bse.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bse.tenant_id = bible_school_grades.tenant_id
          and bse.id = bible_school_grades.enrollment_id
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
        from public.bible_school_enrollments bse
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bse.tenant_id
         and bct.class_id = bse.class_id
        join public.bible_school_teachers bst
          on bst.id = bct.teacher_id
         and bst.tenant_id = bct.tenant_id
        where bse.tenant_id = bible_school_grades.tenant_id
          and bse.id = bible_school_grades.enrollment_id
          and bst.member_id = app_private.current_member_id()
      )
    )
  )
);

