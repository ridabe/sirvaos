-- Seed de tenant de teste e perfil de usuário para o Admin Cliente
--
-- Execute este SQL após a criação do usuário de autenticação no Supabase
-- com o e-mail tenant-admin@sirvaos.test.

insert into public.tenants (id, name, slug, primary_color, accent_color, status)
values (
  '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4',
  'Igreja Teste',
  'igreja-teste',
  '#087C7A',
  '#00A7C4',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  status = excluded.status,
  updated_at = now();

insert into public.profiles (id, email, full_name, tenant_id, tenant_role, status)
values (
  '1f0d60bf-869b-4b53-b0db-e1555582af56',
  'tenant-admin@sirvaos.test',
  'Tenant Admin',
  '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4',
  'owner',
  'active'
)
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  tenant_id = excluded.tenant_id,
  tenant_role = excluded.tenant_role,
  status = excluded.status,
  updated_at = now();

insert into public.tenant_modules (tenant_id, module_id, status)
select
  '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4',
  id,
  'active'
from public.platform_modules
where code in ('members', 'calendar', 'announcements')
on conflict (tenant_id, module_id) do update set
  status = excluded.status,
  updated_at = now();

insert into public.members (id, tenant_id, name, email, phone, status, ministry, notes)
values
  ('0a1d0e1c-f7b2-4d76-91fb-bfa8619de9d2', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Maria Silva', 'maria@igreja-teste.org', '+55 11 91234-5678', 'active', 'Ministério de Louvor', 'Líder do grupo de louvor.'),
  ('fef6d4df-92b2-4a0f-8ba5-5b7edd65ae44', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'João Pereira', 'joao@igreja-teste.org', '+55 11 99876-5432', 'active', 'Ministério Infantil', 'Coordenador das turmas kids.'),
  ('c55df1b0-2f48-4d18-a4df-3c1d5e9c72b7', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Ana Souza', 'ana@igreja-teste.org', '+55 11 98765-4321', 'active', 'Ministério de Recreação', 'Voluntária do acolhimento.')
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  status = excluded.status,
  ministry = excluded.ministry,
  notes = excluded.notes;

insert into public.tenant_events (id, tenant_id, title, description, location, event_date)
values
  ('bee7c2c0-82e8-4d65-88db-1ac6e8e62840', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Culto de Adoração', 'Culto semanal com louvor, oração e mensagem pastoral.', 'Auditório Principal', '2026-06-05T19:00:00Z'),
  ('04d5f2bf-5084-4d3d-a0b6-494fa5e281ef', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Ensaio de Louvor', 'Ensaio do ministério de louvor para o domingo.', 'Sala de Música', '2026-06-03T18:30:00Z'),
  ('c8b9493a-6b28-49d8-9ed0-e2d210f09ca3', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Reunião de Ministério Infantil', 'Planejamento e formação de equipe para o ministério infantil.', 'Sala 204', '2026-06-04T17:00:00Z')
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  event_date = excluded.event_date;

insert into public.tenant_announcements (id, tenant_id, title, message, published_at)
values
  ('7d5ef2b9-5f88-443e-8ce5-9b2de97829a4', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Bem-vindos ao SirvaOS', 'A Igreja Teste está iniciando a gestão no SirvaOS hoje. Se bem-vindos ao painel de administração!', '2026-05-31T10:00:00Z'),
  ('049be5f0-30d2-4c51-8e07-857e6d1a5ab9', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Ensaio de louvor nesta quinta', 'Não esqueça de confirmar presença no ensaio de quinta-feira às 18h30 na Sala de Música.', '2026-05-31T14:00:00Z'),
  ('b3f0c4ec-4f96-47fd-84a3-1710eb7c5d18', '7caa5019-f0e4-4b68-9ee7-2b8e5cb0d8b4', 'Reunião de voluntários', 'Voluntários do ministério infantil e louvor se reúnem neste sábado às 16h.', '2026-06-01T09:00:00Z')
on conflict (id) do update set
  tenant_id = excluded.tenant_id,
  title = excluded.title,
  message = excluded.message,
  published_at = excluded.published_at;
