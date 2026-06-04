-- ============================================================
-- Repertório de eventos + Catálogo de músicas (global + tenant)
-- ============================================================

create table if not exists public.catalog_songs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  title text not null,
  artist text not null,
  genre text not null default 'gospel_contemporaneo',
  source text not null default 'manual' check (source in ('seed','manual','cifraclub')),
  cifraclub_url text,
  youtube_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_songs_title_len check (char_length(btrim(title)) between 1 and 140),
  constraint catalog_songs_artist_len check (char_length(btrim(artist)) between 1 and 140),
  constraint catalog_songs_genre_len check (char_length(btrim(genre)) between 2 and 60)
);

create index if not exists catalog_songs_lookup_idx
on public.catalog_songs (tenant_id, lower(title), lower(artist));

create unique index if not exists catalog_songs_global_unique
on public.catalog_songs (lower(title), lower(artist))
where tenant_id is null;

create unique index if not exists catalog_songs_tenant_unique
on public.catalog_songs (tenant_id, lower(title), lower(artist))
where tenant_id is not null;

drop trigger if exists set_catalog_songs_updated_at on public.catalog_songs;
create trigger set_catalog_songs_updated_at
before update on public.catalog_songs
for each row execute function public.set_updated_at();

alter table public.catalog_songs enable row level security;

drop policy if exists "Authenticated can read songs catalog" on public.catalog_songs;
create policy "Authenticated can read songs catalog"
on public.catalog_songs
for select
to authenticated
using (
  app_private.is_global_admin()
  or tenant_id is null
  or tenant_id = app_private.current_tenant_id()
);

drop policy if exists "Tenant events admins can manage tenant songs catalog" on public.catalog_songs;
create policy "Tenant events admins can manage tenant songs catalog"
on public.catalog_songs
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and (
      app_private.is_tenant_admin()
      or app_private.can_manage_module('events')
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and tenant_id is not null
    and (
      app_private.is_tenant_admin()
      or app_private.can_manage_module('events')
    )
  )
);

create table if not exists public.tenant_event_songs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_id uuid not null references public.tenant_events (id) on delete cascade,
  song_id uuid not null references public.catalog_songs (id) on delete restrict,
  position integer not null default 100,
  key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_event_songs_position_check check (position >= 0)
);

create unique index if not exists tenant_event_songs_event_song_unique
on public.tenant_event_songs (event_id, song_id);

create index if not exists tenant_event_songs_tenant_event_idx
on public.tenant_event_songs (tenant_id, event_id, position);

drop trigger if exists set_tenant_event_songs_updated_at on public.tenant_event_songs;
create trigger set_tenant_event_songs_updated_at
before update on public.tenant_event_songs
for each row execute function public.set_updated_at();

alter table public.tenant_event_songs enable row level security;

drop policy if exists "Tenant authorized read event repertory" on public.tenant_event_songs;
create policy "Tenant authorized read event repertory"
on public.tenant_event_songs
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and (
      app_private.is_tenant_admin()
      or app_private.can_manage_module('events')
    )
  )
);

drop policy if exists "Tenant authorized manage event repertory" on public.tenant_event_songs;
create policy "Tenant authorized manage event repertory"
on public.tenant_event_songs
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and (
      app_private.is_tenant_admin()
      or app_private.can_manage_module('events')
    )
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and (
      app_private.is_tenant_admin()
      or app_private.can_manage_module('events')
    )
  )
);

grant select, insert, update, delete on public.catalog_songs to authenticated;
grant select, insert, update, delete on public.tenant_event_songs to authenticated;

insert into public.catalog_songs (tenant_id, title, artist, genre, source)
values
  (null, 'A Casa É Sua', 'Casa Worship', 'gospel_contemporaneo', 'seed'),
  (null, 'A Ele a Glória', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Aquieta Minh’alma', 'Ministério Zoe', 'gospel_contemporaneo', 'seed'),
  (null, 'Até Que Ele Venha', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Aumenta o Som', 'André Aquino', 'gospel_contemporaneo', 'seed'),
  (null, 'Autor da Vida', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Bondade de Deus', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Boa Parte', 'Heloisa Rosa', 'gospel_contemporaneo', 'seed'),
  (null, 'Caminho no Deserto', 'Soraya Moraes', 'gospel_contemporaneo', 'seed'),
  (null, 'Canção do Apocalipse', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Carta de Amor', 'Davi Sacer', 'gospel_contemporaneo', 'seed'),
  (null, 'Casa do Pai', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Celebrarei', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Chega de Saudade', 'Thalles Roberto', 'gospel_contemporaneo', 'seed'),
  (null, 'Cheios do Espírito', 'Gabriela Rocha', 'gospel_contemporaneo', 'seed'),
  (null, 'Clamo Jesus', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Como É Grande o Meu Deus', 'Soraya Moraes', 'gospel_contemporaneo', 'seed'),
  (null, 'Como Zaqueu', 'Renascer Praise', 'gospel_contemporaneo', 'seed'),
  (null, 'Creio Que Tu És a Cura', 'Gabriela Rocha', 'gospel_contemporaneo', 'seed'),
  (null, 'Deus Proverá', 'Gabriela Gomes', 'gospel_contemporaneo', 'seed'),
  (null, 'Deus Vai Fazer', 'Sarah Farias', 'gospel_contemporaneo', 'seed'),
  (null, 'Digno É o Senhor', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Digno de Tudo', 'Ministério Zoe', 'gospel_contemporaneo', 'seed'),
  (null, 'Diante da Cruz', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Doce Presença', 'Nívea Soares', 'gospel_contemporaneo', 'seed'),
  (null, 'Ele Vem', 'Livres Para Adorar', 'gospel_contemporaneo', 'seed'),
  (null, 'Em Teus Braços', 'Laura Souguellis', 'gospel_contemporaneo', 'seed'),
  (null, 'Eu Navegarei', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Eu Vou Construir', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Eu Sei', 'Marcus Salles', 'gospel_contemporaneo', 'seed'),
  (null, 'Existe Um Lugar', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Faz Chover', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Filho do Deus Vivo', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Galileu', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Graça', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Grandes Coisas', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Grato Sou', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Há Poder no Nome', 'Gabriela Rocha', 'gospel_contemporaneo', 'seed'),
  (null, 'Hosana', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Imensurável', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Incomparável', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Jesus, Em Tua Presença', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Jesus Filho de Deus', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Jesus, Meu Primeiro Amor', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Jesus, Tu És Bom', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Lindo És', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Lugar Secreto', 'Gabriela Rocha', 'gospel_contemporaneo', 'seed'),
  (null, 'Maravilhado', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Me Ama', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Me Atraiu', 'Nívea Soares', 'gospel_contemporaneo', 'seed'),
  (null, 'Me Leva Pra Casa', 'Casa Worship', 'gospel_contemporaneo', 'seed'),
  (null, 'Me Derramar', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Meu Alvo', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Meu Respirar', 'Nívea Soares', 'gospel_contemporaneo', 'seed'),
  (null, 'Minha Porção', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Ninguém Explica Deus', 'Preto no Branco', 'gospel_contemporaneo', 'seed'),
  (null, 'Nível de Adoração', 'Eli Soares', 'gospel_contemporaneo', 'seed'),
  (null, 'Noites Traiçoeiras', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Nada Além do Sangue', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'O Amor de Deus', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Ousado Amor', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Ousado Amor (Acústico)', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Pai Nosso', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Poder Pra Salvar', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Pra Onde Eu Irei', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Pra Sempre', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Preciso de Ti', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Quão Grande É o Meu Deus', 'Chris Tomlin', 'gospel_contemporaneo', 'seed'),
  (null, 'Que Amor É Esse', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Quebro Meu Vaso', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Quem Dizes Que Eu Sou', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Quem Tem O Filho', 'Kleber Lucas', 'gospel_contemporaneo', 'seed'),
  (null, 'Rei do Meu Coração', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Ruja o Leão', 'Casa Worship', 'gospel_contemporaneo', 'seed'),
  (null, 'Santo', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Santo Espírito', 'Laura Souguellis', 'gospel_contemporaneo', 'seed'),
  (null, 'Seja o Centro', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Ser Mudado', 'Isaias Saad', 'gospel_contemporaneo', 'seed'),
  (null, 'Só Tu És Santo', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Só Quero Ver Você', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Sou Casa', 'Casa Worship', 'gospel_contemporaneo', 'seed'),
  (null, 'Te Agradeço', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Teu Amor Não Falha', 'Nívea Soares', 'gospel_contemporaneo', 'seed'),
  (null, 'Teu Reino', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Todavia Me Alegrarei', 'Samuel Messias', 'gospel_contemporaneo', 'seed'),
  (null, 'Tu És', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Tu És Bom', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Tua Graça Me Basta', 'Davi Sacer', 'gospel_contemporaneo', 'seed'),
  (null, 'Tudo o Que Tenho', 'Davi Sacer', 'gospel_contemporaneo', 'seed'),
  (null, 'Uma Coisa', 'Morada', 'gospel_contemporaneo', 'seed'),
  (null, 'Vento Impetuoso', 'Fernandinho', 'gospel_contemporaneo', 'seed'),
  (null, 'Vim Para Adorar-Te', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Vitorioso És', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Yeshua', 'Casa Worship', 'gospel_contemporaneo', 'seed'),
  (null, 'A Ele Seja a Glória', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'A Cruz', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Alegra-te', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Alfa e Ômega', 'Diante do Trono', 'gospel_contemporaneo', 'seed'),
  (null, 'Amor Incondicional', 'Aline Barros', 'gospel_contemporaneo', 'seed'),
  (null, 'Aquilo Que Sou', 'Fernandinho', 'gospel_contemporaneo', 'seed')
on conflict do nothing;
