-- Etapa 2 / Frente B (WhatsApp-first) — Fundação.
-- B2: consentimento de WhatsApp por membro (LGPD).
-- B4/B8: tabela de log de mensagens enviadas via provedor (Z-API).

-- ── B2: opt-in de WhatsApp no cadastro de membros ───────────────────────────
alter table public.members
  add column if not exists whatsapp_opt_in boolean not null default true;

comment on column public.members.whatsapp_opt_in is
  'Consentimento do membro para receber mensagens transacionais via WhatsApp (LGPD). Default true; permite opt-out.';

-- ── B4/B8: log de mensagens WhatsApp ────────────────────────────────────────
create table if not exists public.whatsapp_messages (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  to_phone            text not null,
  message             text not null,
  context             text not null default 'custom'
                        check (context in ('custom', 'announcement', 'worship_reminder',
                                           'worship_confirmation', 'kids_communication', 'event_reminder')),
  context_id          uuid,
  status              text not null default 'queued'
                        check (status in ('queued', 'sent', 'failed')),
  provider            text not null default 'z-api',
  provider_message_id text,
  error               text,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists whatsapp_messages_tenant_created_idx
  on public.whatsapp_messages (tenant_id, created_at desc);

alter table public.whatsapp_messages enable row level security;

-- Leitura: admins do tenant (owner/admin) ou super admin global. Escrita: service role (Edge Function).
drop policy if exists whatsapp_messages_select on public.whatsapp_messages;
create policy whatsapp_messages_select
  on public.whatsapp_messages
  for select
  using (
    app_private.is_global_admin()
    or (
      tenant_id = app_private.current_tenant_id()
      and app_private.is_tenant_admin()
    )
  );

comment on table public.whatsapp_messages is
  'Etapa 2/B4: registro de mensagens WhatsApp enviadas via provedor. Inserções pela Edge Function (service role).';
