do $$
begin
  create type public.bible_school_staff_role as enum ('admin', 'teacher');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.bible_school_enrollment_status as enum ('active', 'inactive');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.bible_school_attendance_status as enum ('present', 'absent', 'excused');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.bible_school_material_kind as enum ('link', 'file', 'text');
exception
  when duplicate_object then null;
end $$;

create or replace function app_private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member_id from public.profiles where id = auth.uid();
$$;

create or replace function app_private.is_module_enabled(module_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_modules tm
    join public.platform_modules pm on pm.id = tm.module_id
    where tm.tenant_id = app_private.current_tenant_id()
      and tm.status = 'active'
      and pm.code = module_code
      and pm.status <> 'deprecated'
  );
$$;

create table if not exists public.bible_school_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bible_school_classes_tenant_id_idx on public.bible_school_classes (tenant_id);

drop trigger if exists set_bible_school_classes_updated_at on public.bible_school_classes;
create trigger set_bible_school_classes_updated_at
before update on public.bible_school_classes
for each row execute function public.set_updated_at();

create table if not exists public.bible_school_teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role public.bible_school_staff_role not null default 'teacher',
  created_at timestamptz not null default now(),
  constraint bible_school_teachers_unique unique (tenant_id, member_id)
);

create index if not exists bible_school_teachers_tenant_id_idx on public.bible_school_teachers (tenant_id);
create index if not exists bible_school_teachers_member_id_idx on public.bible_school_teachers (tenant_id, member_id);

create table if not exists public.bible_school_class_teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  class_id uuid not null references public.bible_school_classes (id) on delete cascade,
  teacher_id uuid not null references public.bible_school_teachers (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint bible_school_class_teachers_unique unique (tenant_id, class_id, teacher_id)
);

create index if not exists bible_school_class_teachers_class_id_idx on public.bible_school_class_teachers (tenant_id, class_id);

create table if not exists public.bible_school_students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bible_school_students_tenant_id_idx on public.bible_school_students (tenant_id);
create index if not exists bible_school_students_member_id_idx on public.bible_school_students (tenant_id, member_id);
create unique index if not exists bible_school_students_member_unique
on public.bible_school_students (tenant_id, member_id)
where member_id is not null;

create table if not exists public.bible_school_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  class_id uuid not null references public.bible_school_classes (id) on delete cascade,
  student_id uuid not null references public.bible_school_students (id) on delete cascade,
  status public.bible_school_enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  constraint bible_school_enrollments_unique unique (tenant_id, class_id, student_id)
);

create index if not exists bible_school_enrollments_class_id_idx on public.bible_school_enrollments (tenant_id, class_id);
create index if not exists bible_school_enrollments_student_id_idx on public.bible_school_enrollments (tenant_id, student_id);

create table if not exists public.bible_school_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  class_id uuid not null references public.bible_school_classes (id) on delete cascade,
  session_date date not null,
  topic text,
  notes text,
  created_at timestamptz not null default now(),
  constraint bible_school_sessions_unique unique (tenant_id, class_id, session_date)
);

create index if not exists bible_school_sessions_class_id_idx on public.bible_school_sessions (tenant_id, class_id);

create table if not exists public.bible_school_attendance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  session_id uuid not null references public.bible_school_sessions (id) on delete cascade,
  enrollment_id uuid not null references public.bible_school_enrollments (id) on delete cascade,
  status public.bible_school_attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  constraint bible_school_attendance_unique unique (tenant_id, session_id, enrollment_id)
);

create index if not exists bible_school_attendance_session_id_idx on public.bible_school_attendance (tenant_id, session_id);
create index if not exists bible_school_attendance_enrollment_id_idx on public.bible_school_attendance (tenant_id, enrollment_id);

create table if not exists public.bible_school_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  class_id uuid not null references public.bible_school_classes (id) on delete cascade,
  title text not null,
  kind public.bible_school_material_kind not null default 'link',
  url text,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists bible_school_materials_class_id_idx on public.bible_school_materials (tenant_id, class_id);

create table if not exists public.bible_school_grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  enrollment_id uuid not null references public.bible_school_enrollments (id) on delete cascade,
  title text not null,
  score numeric,
  max_score numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bible_school_grades_enrollment_id_idx on public.bible_school_grades (tenant_id, enrollment_id);

alter table public.bible_school_classes enable row level security;
alter table public.bible_school_teachers enable row level security;
alter table public.bible_school_class_teachers enable row level security;
alter table public.bible_school_students enable row level security;
alter table public.bible_school_enrollments enable row level security;
alter table public.bible_school_sessions enable row level security;
alter table public.bible_school_attendance enable row level security;
alter table public.bible_school_materials enable row level security;
alter table public.bible_school_grades enable row level security;

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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_classes.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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
create policy "Bible school classes can be managed by module admins"
on public.bible_school_classes
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

drop policy if exists "Bible school teachers can be read by module members" on public.bible_school_teachers;
create policy "Bible school teachers can be read by module members"
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

drop policy if exists "Bible school teachers can be managed by module admins" on public.bible_school_teachers;
create policy "Bible school teachers can be managed by module admins"
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

drop policy if exists "Bible school class teachers can be read by authorized tenant members" on public.bible_school_class_teachers;
create policy "Bible school class teachers can be read by authorized tenant members"
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

drop policy if exists "Bible school class teachers can be managed by module admins" on public.bible_school_class_teachers;
create policy "Bible school class teachers can be managed by module admins"
on public.bible_school_class_teachers
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
    )
  )
);

drop policy if exists "Bible school students can be managed by module admins" on public.bible_school_students;
create policy "Bible school students can be managed by module admins"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_enrollments.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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

drop policy if exists "Bible school enrollments can be managed by module admins" on public.bible_school_enrollments;
create policy "Bible school enrollments can be managed by module admins"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_sessions.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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
create policy "Bible school sessions can be managed by module admins or teachers"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_sessions.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_sessions.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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

drop policy if exists "Bible school attendance can be read by authorized users" on public.bible_school_attendance;
create policy "Bible school attendance can be read by authorized users"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_attendance.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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

drop policy if exists "Bible school attendance can be managed by module admins or teachers" on public.bible_school_attendance;
create policy "Bible school attendance can be managed by module admins or teachers"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_attendance.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_materials.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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
create policy "Bible school materials can be managed by module admins or teachers"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_materials.tenant_id
          and bst_all.member_id = app_private.current_member_id()
      )
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

drop policy if exists "Bible school grades can be read by authorized users" on public.bible_school_grades;
create policy "Bible school grades can be read by authorized users"
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
        join public.bible_school_sessions bses
          on bses.tenant_id = bse.tenant_id
         and bses.class_id = bse.class_id
        join public.bible_school_class_teachers bct
          on bct.tenant_id = bses.tenant_id
         and bct.class_id = bses.class_id
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

drop policy if exists "Bible school grades can be managed by module admins or teachers" on public.bible_school_grades;
create policy "Bible school grades can be managed by module admins or teachers"
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_grades.tenant_id
          and bst_all.member_id = app_private.current_member_id()
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
        from public.bible_school_teachers bst_all
        where bst_all.tenant_id = bible_school_grades.tenant_id
          and bst_all.member_id = app_private.current_member_id()
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

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_member_id() to authenticated;
grant execute on function app_private.is_module_enabled(text) to authenticated;
grant select, insert, update, delete on public.bible_school_classes to authenticated;
grant select, insert, update, delete on public.bible_school_teachers to authenticated;
grant select, insert, update, delete on public.bible_school_class_teachers to authenticated;
grant select, insert, update, delete on public.bible_school_students to authenticated;
grant select, insert, update, delete on public.bible_school_enrollments to authenticated;
grant select, insert, update, delete on public.bible_school_sessions to authenticated;
grant select, insert, update, delete on public.bible_school_attendance to authenticated;
grant select, insert, update, delete on public.bible_school_materials to authenticated;
grant select, insert, update, delete on public.bible_school_grades to authenticated;

update public.platform_modules
set status = 'active',
    icon_name = 'BookOpen',
    description = coalesce(description, 'Turmas, professores, alunos, frequência, materiais e notas.')
where code = 'bible-school'
  and status <> 'active';
