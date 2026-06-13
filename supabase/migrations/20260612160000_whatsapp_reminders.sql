-- Etapa 2 / Frente B (B6) — Lembrete automático 24h antes (WhatsApp).
-- Controle de "já enviei o lembrete" + extensões para agendamento.
-- O agendamento (cron.schedule) é criado fora do versionamento para não expor a
-- service_role key no repositório (ver doc etapa-2, seção B6).

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.worship_events
  add column if not exists reminder_sent_at timestamptz;
alter table public.tenant_events
  add column if not exists reminder_sent_at timestamptz;

comment on column public.worship_events.reminder_sent_at is
  'Etapa 2/B6: quando o lembrete automático (24h antes) foi enviado. NULL = ainda não enviado.';
