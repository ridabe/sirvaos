-- Teste grátis de 30 dias para tenants (clientes)
-- trial_enabled: on/off do teste
-- trial_started_at / trial_ends_at: janela do teste (30 dias a partir da ativação)
-- trial_dismissed_at: admin global dispensou o aviso de expiração (decidiu manter acesso)

alter table public.tenants
  add column if not exists trial_enabled boolean not null default false,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_dismissed_at timestamptz;

create index if not exists tenants_trial_ends_at_idx
  on public.tenants (trial_ends_at)
  where trial_enabled;

comment on column public.tenants.trial_enabled is 'Teste grátis de 30 dias ativo para este cliente';
comment on column public.tenants.trial_started_at is 'Início do teste grátis';
comment on column public.tenants.trial_ends_at is 'Fim do teste grátis (início + 30 dias)';
comment on column public.tenants.trial_dismissed_at is 'Quando o admin global dispensou o aviso de expiração';
