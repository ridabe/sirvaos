-- ============================================================
-- Repertório para eventos do Louvor
-- ============================================================

create table if not exists public.worship_event_songs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_id uuid not null references public.worship_events (id) on delete cascade,
  song_id uuid not null references public.catalog_songs (id) on delete restrict,
  position integer not null default 100,
  key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worship_event_songs_position_check check (position >= 0)
);

create unique index if not exists worship_event_songs_event_song_unique
on public.worship_event_songs (event_id, song_id);

create index if not exists worship_event_songs_tenant_event_idx
on public.worship_event_songs (tenant_id, event_id, position);

drop trigger if exists set_worship_event_songs_updated_at on public.worship_event_songs;
create trigger set_worship_event_songs_updated_at
before update on public.worship_event_songs
for each row execute function public.set_updated_at();

alter table public.worship_event_songs enable row level security;

drop policy if exists "Tenant worship readers can read repertory" on public.worship_event_songs;
create policy "Tenant worship readers can read repertory"
on public.worship_event_songs
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_read_worship()
  )
);

drop policy if exists "Tenant worship admins can manage repertory" on public.worship_event_songs;
create policy "Tenant worship admins can manage repertory"
on public.worship_event_songs
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

grant select, insert, update, delete on public.worship_event_songs to authenticated;

