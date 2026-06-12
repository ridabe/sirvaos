-- Etapa 2 / Frente B (B7) — Status de entrega real do WhatsApp (callbacks Z-API).
-- "sent" = aceito pela Z-API. As colunas abaixo refletem a entrega de fato.

alter table public.whatsapp_messages
  add column if not exists delivery_status text,   -- sent | delivered | read | failed
  add column if not exists delivered_at   timestamptz,
  add column if not exists read_at        timestamptz,
  add column if not exists last_status_raw text,    -- status cru do callback (SENT/RECEIVED/READ/...)
  add column if not exists last_status_at  timestamptz;

comment on column public.whatsapp_messages.delivery_status is
  'Status de entrega derivado dos callbacks Z-API: sent, delivered, read, failed.';
