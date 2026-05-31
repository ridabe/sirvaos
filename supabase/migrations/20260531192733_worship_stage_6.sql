create table if not exists public.worship_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  role_type text not null default 'instrument' check (role_type in ('vocal', 'instrument', 'technical', 'leadership', 'other')),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worship_roles_name_not_blank check (length(btrim(name)) >= 2)
);

create unique index if not exists worship_roles_tenant_name_unique
on public.worship_roles (tenant_id, lower(name));

create index if not exists worship_roles_tenant_active_idx
on public.worship_roles (tenant_id, is_active, sort_order);

create table if not exists public.worship_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  event_type text not null default 'service' check (event_type in ('service', 'rehearsal', 'meeting', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worship_events_title_not_blank check (length(btrim(title)) >= 2),
  constraint worship_events_ends_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists worship_events_tenant_starts_idx
on public.worship_events (tenant_id, starts_at);

create index if not exists worship_events_tenant_status_idx
on public.worship_events (tenant_id, status);

create table if not exists public.worship_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_id uuid not null references public.worship_events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role_id uuid references public.worship_roles (id) on delete set null,
  role_name text,
  arrival_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'standby')),
  viewed_at timestamptz,
  responded_at timestamptz,
  decline_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worship_assignments_role_present check (role_id is not null or length(btrim(coalesce(role_name, ''))) >= 2)
);

create unique index if not exists worship_assignments_event_member_role_unique
on public.worship_assignments (event_id, member_id, coalesce(role_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(coalesce(role_name, '')));

create index if not exists worship_assignments_tenant_event_idx
on public.worship_assignments (tenant_id, event_id);

create index if not exists worship_assignments_tenant_member_idx
on public.worship_assignments (tenant_id, member_id);

drop trigger if exists set_worship_roles_updated_at on public.worship_roles;
create trigger set_worship_roles_updated_at
before update on public.worship_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_worship_events_updated_at on public.worship_events;
create trigger set_worship_events_updated_at
before update on public.worship_events
for each row execute function public.set_updated_at();

drop trigger if exists set_worship_assignments_updated_at on public.worship_assignments;
create trigger set_worship_assignments_updated_at
before update on public.worship_assignments
for each row execute function public.set_updated_at();

alter table public.worship_roles enable row level security;
alter table public.worship_events enable row level security;
alter table public.worship_assignments enable row level security;

create or replace function app_private.can_read_worship()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.can_manage_module('worship')
    or exists (
      select 1
      from public.profiles p
      join public.tenant_modules tm
        on tm.tenant_id = p.tenant_id
      join public.platform_modules pm
        on pm.id = tm.module_id
      where p.id = auth.uid()
        and p.status = 'active'
        and p.tenant_id is not null
        and tm.status = 'active'
        and pm.code = 'worship'
    );
$$;

drop policy if exists "Tenant worship readers can read roles" on public.worship_roles;
create policy "Tenant worship readers can read roles"
on public.worship_roles
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_read_worship()
  )
);

drop policy if exists "Tenant worship admins can manage roles" on public.worship_roles;
create policy "Tenant worship admins can manage roles"
on public.worship_roles
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
);

drop policy if exists "Tenant worship readers can read events" on public.worship_events;
create policy "Tenant worship readers can read events"
on public.worship_events
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_read_worship()
  )
);

drop policy if exists "Tenant worship admins can manage events" on public.worship_events;
create policy "Tenant worship admins can manage events"
on public.worship_events
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
);

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

drop policy if exists "Tenant worship admins can manage assignments" on public.worship_assignments;
create policy "Tenant worship admins can manage assignments"
on public.worship_assignments
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
);

insert into public.worship_roles (tenant_id, name, role_type, sort_order)
select t.id, seed.name, seed.role_type, seed.sort_order
from public.tenants t
cross join (
  values
    ('Lider de louvor', 'leadership', 10),
    ('Vocal', 'vocal', 20),
    ('Violao', 'instrument', 30),
    ('Guitarra', 'instrument', 40),
    ('Teclado', 'instrument', 50),
    ('Baixo', 'instrument', 60),
    ('Bateria', 'instrument', 70),
    ('Som', 'technical', 80),
    ('Multimidia', 'technical', 90)
) as seed(name, role_type, sort_order)
where exists (
  select 1
  from public.tenant_modules tm
  join public.platform_modules pm on pm.id = tm.module_id
  where tm.tenant_id = t.id
    and tm.status = 'active'
    and pm.code = 'worship'
)
on conflict (tenant_id, lower(name)) do nothing;

grant execute on function app_private.can_read_worship() to authenticated;
grant select, insert, update, delete on public.worship_roles to authenticated;
grant select, insert, update, delete on public.worship_events to authenticated;
grant select, insert, update, delete on public.worship_assignments to authenticated;
