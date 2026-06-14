-- Pendência P2 — permite o canal 'email' no comunicado do Kids.
alter table public.kids_communications drop constraint if exists kids_communications_sent_via_check;
alter table public.kids_communications
  add constraint kids_communications_sent_via_check
  check (sent_via in ('system', 'whatsapp', 'email', 'both'));
