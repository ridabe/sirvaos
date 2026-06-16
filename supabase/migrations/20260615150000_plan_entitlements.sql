-- Item 2: regras por plano (entitlements)
-- Mapeia cada plano aos módulos liberados e às feature flags (ex.: WhatsApp).
-- O webhook usa essas tabelas para provisionar APENAS o que o plano dá.
-- Enforcement de módulos já vem de RLS (app_private.is_module_enabled).

-- ── Módulos por plano ────────────────────────────────────────────────────────
create table if not exists public.plan_modules (
  plan_code   text not null references public.plans (code) on delete cascade,
  module_code text not null references public.platform_modules (code) on delete cascade,
  primary key (plan_code, module_code)
);

comment on table public.plan_modules is 'Módulos liberados em cada plano (usado no provisionamento automático).';

-- ── Feature flags por plano ──────────────────────────────────────────────────
create table if not exists public.plan_feature_flags (
  plan_code text not null references public.plans (code) on delete cascade,
  flag_key  text not null,
  enabled   boolean not null default true,
  primary key (plan_code, flag_key),
  constraint plan_feature_flags_key_format check (flag_key ~ '^[a-z0-9][a-z0-9_.:-]*$')
);

comment on table public.plan_feature_flags is 'Feature flags aplicadas ao tenant ao contratar o plano (ex.: whatsapp).';

-- RLS: leitura pública (catálogo de planos); escrita só admin global.
alter table public.plan_modules        enable row level security;
alter table public.plan_feature_flags  enable row level security;

drop policy if exists "Anyone can read plan modules" on public.plan_modules;
create policy "Anyone can read plan modules"
on public.plan_modules for select to anon, authenticated using (true);

drop policy if exists "Global admins manage plan modules" on public.plan_modules;
create policy "Global admins manage plan modules"
on public.plan_modules for all to authenticated
using (app_private.is_global_admin()) with check (app_private.is_global_admin());

drop policy if exists "Anyone can read plan feature flags" on public.plan_feature_flags;
create policy "Anyone can read plan feature flags"
on public.plan_feature_flags for select to anon, authenticated using (true);

drop policy if exists "Global admins manage plan feature flags" on public.plan_feature_flags;
create policy "Global admins manage plan feature flags"
on public.plan_feature_flags for all to authenticated
using (app_private.is_global_admin()) with check (app_private.is_global_admin());

grant select on public.plan_modules to anon, authenticated;
grant insert, update, delete on public.plan_modules to authenticated;
grant select on public.plan_feature_flags to anon, authenticated;
grant insert, update, delete on public.plan_feature_flags to authenticated;

-- ── Seed: módulos por plano ──────────────────────────────────────────────────
-- Básico (starter): gestão essencial, sem louvor/intercessão/kids/redes sociais.
-- Essencial: + louvor, intercessão, kids.
-- Ultra: + redes sociais (todos os módulos).
-- Catedral: todos os módulos.
insert into public.plan_modules (plan_code, module_code) values
  -- starter
  ('starter','members'),('starter','events'),('starter','announcements'),
  ('starter','financial'),('starter','bible-school'),
  -- essencial (tudo do starter + worship, intercession, kids)
  ('essencial','members'),('essencial','events'),('essencial','announcements'),
  ('essencial','financial'),('essencial','bible-school'),
  ('essencial','worship'),('essencial','intercession'),('essencial','kids'),
  -- ultra (todos)
  ('ultra','members'),('ultra','events'),('ultra','announcements'),
  ('ultra','financial'),('ultra','bible-school'),('ultra','worship'),
  ('ultra','intercession'),('ultra','kids'),('ultra','social_media'),
  -- catedral (todos)
  ('catedral','members'),('catedral','events'),('catedral','announcements'),
  ('catedral','financial'),('catedral','bible-school'),('catedral','worship'),
  ('catedral','intercession'),('catedral','kids'),('catedral','social_media')
on conflict do nothing;

-- ── Seed: feature flags por plano ────────────────────────────────────────────
-- whatsapp: desabilitado explicitamente no Básico; habilitado nos demais.
-- (enforcement bloqueia só quando a flag existe e está enabled=false → não quebra
--  tenants antigos, que não têm a flag.)
insert into public.plan_feature_flags (plan_code, flag_key, enabled) values
  ('starter','whatsapp',false),
  ('essencial','whatsapp',true),
  ('ultra','whatsapp',true),
  ('catedral','whatsapp',true)
on conflict (plan_code, flag_key) do update set enabled = excluded.enabled;
