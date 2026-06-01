alter table public.tenant_events
  add column if not exists description_html text;

create index if not exists idx_tenant_events_tenant_date_status
  on public.tenant_events (tenant_id, event_date, status);
