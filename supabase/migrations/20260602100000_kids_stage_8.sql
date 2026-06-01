-- ── Register Kids module in platform_modules ─────────────────────────────────
insert into public.platform_modules (code, name, description, status, icon_name, sort_order)
values (
  'kids',
  'Kids / Infantil',
  'Gestão do ministério infantil: crianças, turmas, presença, escala de professores e comunicados aos pais.',
  'active',
  'Baby',
  60
)
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  status      = 'active',
  icon_name   = excluded.icon_name,
  sort_order  = excluded.sort_order;

-- ── kids_groups (turmas) ──────────────────────────────────────────────────────
create table if not exists public.kids_groups (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  name        text not null,
  description text,
  age_min     integer,
  age_max     integer,
  color       text,
  is_active   boolean not null default true,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint kids_groups_name_not_blank check (length(btrim(name)) >= 2)
);

create index if not exists kids_groups_tenant_idx on public.kids_groups (tenant_id);

drop trigger if exists set_kids_groups_updated_at on public.kids_groups;
create trigger set_kids_groups_updated_at
before update on public.kids_groups
for each row execute function public.set_updated_at();

-- ── kids_children (crianças) ──────────────────────────────────────────────────
create table if not exists public.kids_children (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  name            text not null,
  date_of_birth   date,
  group_id        uuid references public.kids_groups (id) on delete set null,
  member_id       uuid references public.members (id) on delete set null,
  allergies       text,
  special_needs   text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint kids_children_name_not_blank check (length(btrim(name)) >= 2)
);

create index if not exists kids_children_tenant_idx on public.kids_children (tenant_id);
create index if not exists kids_children_group_idx  on public.kids_children (tenant_id, group_id);
create index if not exists kids_children_member_idx on public.kids_children (tenant_id, member_id);

drop trigger if exists set_kids_children_updated_at on public.kids_children;
create trigger set_kids_children_updated_at
before update on public.kids_children
for each row execute function public.set_updated_at();

-- ── kids_guardians (responsáveis) ─────────────────────────────────────────────
create table if not exists public.kids_guardians (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  child_id     uuid not null references public.kids_children (id) on delete cascade,
  name         text not null,
  phone        text,
  relationship text not null default 'parent'
                 check (relationship in ('parent', 'grandparent', 'sibling', 'guardian', 'other')),
  member_id    uuid references public.members (id) on delete set null,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint kids_guardians_name_not_blank check (length(btrim(name)) >= 2)
);

create index if not exists kids_guardians_tenant_idx on public.kids_guardians (tenant_id);
create index if not exists kids_guardians_child_idx  on public.kids_guardians (child_id);

-- ── kids_teacher_schedule (escala do dia) ─────────────────────────────────────
create table if not exists public.kids_teacher_schedule (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  schedule_date date not null,
  group_id      uuid references public.kids_groups (id) on delete set null,
  member_id     uuid not null references public.members (id) on delete cascade,
  role_label    text,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists kids_teacher_schedule_tenant_date_idx
on public.kids_teacher_schedule (tenant_id, schedule_date desc);

create index if not exists kids_teacher_schedule_group_idx
on public.kids_teacher_schedule (tenant_id, group_id, schedule_date desc);

-- ── kids_attendance (presença) ────────────────────────────────────────────────
create table if not exists public.kids_attendance (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  child_id        uuid not null references public.kids_children (id) on delete cascade,
  group_id        uuid references public.kids_groups (id) on delete set null,
  attendance_date date not null default current_date,
  checked_in_at   timestamptz,
  checked_out_at  timestamptz,
  guardian_name   text,
  notes           text,
  created_at      timestamptz not null default now(),
  constraint kids_attendance_unique_per_day unique (child_id, attendance_date)
);

create index if not exists kids_attendance_tenant_date_idx
on public.kids_attendance (tenant_id, attendance_date desc);

create index if not exists kids_attendance_child_idx
on public.kids_attendance (child_id, attendance_date desc);

-- ── kids_activities (atividades) ──────────────────────────────────────────────
create table if not exists public.kids_activities (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  group_id        uuid references public.kids_groups (id) on delete set null,
  title           text not null,
  description     text,
  activity_date   date not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint kids_activities_title_not_blank check (length(btrim(title)) >= 2)
);

create index if not exists kids_activities_tenant_date_idx
on public.kids_activities (tenant_id, activity_date desc);

drop trigger if exists set_kids_activities_updated_at on public.kids_activities;
create trigger set_kids_activities_updated_at
before update on public.kids_activities
for each row execute function public.set_updated_at();

-- ── kids_communications (comunicados aos pais) ────────────────────────────────
create table if not exists public.kids_communications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  child_id    uuid references public.kids_children (id) on delete cascade,
  title       text not null,
  message     text not null,
  sent_via    text not null default 'system'
                check (sent_via in ('system', 'whatsapp', 'both')),
  sent_at     timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint kids_communications_title_not_blank check (length(btrim(title)) >= 2)
);

create index if not exists kids_communications_tenant_idx
on public.kids_communications (tenant_id, sent_at desc);

create index if not exists kids_communications_child_idx
on public.kids_communications (child_id, sent_at desc);

-- ── Row-Level Security ────────────────────────────────────────────────────────
alter table public.kids_groups           enable row level security;
alter table public.kids_children         enable row level security;
alter table public.kids_guardians        enable row level security;
alter table public.kids_teacher_schedule enable row level security;
alter table public.kids_attendance       enable row level security;
alter table public.kids_activities       enable row level security;
alter table public.kids_communications   enable row level security;

-- kids_groups
drop policy if exists "Kids admins can read groups" on public.kids_groups;
create policy "Kids admins can read groups"
on public.kids_groups for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage groups" on public.kids_groups;
create policy "Kids admins can manage groups"
on public.kids_groups for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_children
drop policy if exists "Kids admins can read children" on public.kids_children;
create policy "Kids admins can read children"
on public.kids_children for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage children" on public.kids_children;
create policy "Kids admins can manage children"
on public.kids_children for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_guardians
drop policy if exists "Kids admins can read guardians" on public.kids_guardians;
create policy "Kids admins can read guardians"
on public.kids_guardians for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage guardians" on public.kids_guardians;
create policy "Kids admins can manage guardians"
on public.kids_guardians for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_teacher_schedule
drop policy if exists "Kids admins can read teacher schedule" on public.kids_teacher_schedule;
create policy "Kids admins can read teacher schedule"
on public.kids_teacher_schedule for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage teacher schedule" on public.kids_teacher_schedule;
create policy "Kids admins can manage teacher schedule"
on public.kids_teacher_schedule for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_attendance
drop policy if exists "Kids admins can read attendance" on public.kids_attendance;
create policy "Kids admins can read attendance"
on public.kids_attendance for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage attendance" on public.kids_attendance;
create policy "Kids admins can manage attendance"
on public.kids_attendance for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_activities
drop policy if exists "Kids admins can read activities" on public.kids_activities;
create policy "Kids admins can read activities"
on public.kids_activities for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage activities" on public.kids_activities;
create policy "Kids admins can manage activities"
on public.kids_activities for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- kids_communications
drop policy if exists "Kids admins can read communications" on public.kids_communications;
create policy "Kids admins can read communications"
on public.kids_communications for select to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

drop policy if exists "Kids admins can manage communications" on public.kids_communications;
create policy "Kids admins can manage communications"
on public.kids_communications for all to authenticated
using (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
)
with check (
  app_private.is_global_admin()
  or (tenant_id = app_private.current_tenant_id() and app_private.can_manage_module('kids'))
);

-- ── Grants ────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.kids_groups           to authenticated;
grant select, insert, update, delete on public.kids_children         to authenticated;
grant select, insert, update, delete on public.kids_guardians        to authenticated;
grant select, insert, update, delete on public.kids_teacher_schedule to authenticated;
grant select, insert, update, delete on public.kids_attendance       to authenticated;
grant select, insert, update, delete on public.kids_activities       to authenticated;
grant select, insert, update, delete on public.kids_communications   to authenticated;

-- ── System seed groups ────────────────────────────────────────────────────────
-- Note: these are not system-wide seeds (tenant_id can't be null for kids_groups)
-- Each tenant will create their own groups. No seed needed here.
