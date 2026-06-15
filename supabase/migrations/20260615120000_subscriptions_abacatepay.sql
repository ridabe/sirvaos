-- Assinaturas & Onboarding automatizado (AbacatePay)
-- Etapa 1 do plano docs/plano-assinaturas-abacatepay.md
--   (1) Realinha public.plans para os 4 produtos reais + vínculo com AbacatePay
--   (2) Campos de assinatura em public.tenants (mantém trial_*)
--   (3) public.signup_requests  — ponte entre cadastro e confirmação de pagamento
--   (4) public.subscription_events — log + idempotência do webhook

-- ──────────────────────────────────────────────────────────────────────────
-- (1) PLANS
-- ──────────────────────────────────────────────────────────────────────────
alter table public.plans
  add column if not exists abacatepay_product_id text,
  add column if not exists billing_type text not null default 'automatic',
  add column if not exists cycle text not null default 'MONTHLY',
  add column if not exists is_public boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plans_billing_type_check'
  ) then
    alter table public.plans
      add constraint plans_billing_type_check
      check (billing_type in ('automatic', 'manual'));
  end if;
end $$;

create unique index if not exists plans_abacatepay_product_id_key
  on public.plans (abacatepay_product_id)
  where abacatepay_product_id is not null;

comment on column public.plans.abacatepay_product_id is 'ID público do produto no AbacatePay (prod_...). Preencher na Etapa 0.';
comment on column public.plans.billing_type is 'automatic = checkout/assinatura AbacatePay; manual = pedido por e-mail ao suporte (Catedral).';
comment on column public.plans.cycle is 'Ciclo de recorrência do produto no AbacatePay (deve bater com o cadastro lá).';
comment on column public.plans.is_public is 'Aparece na página pública de planos.';

-- Realinhar para os 4 planos reais (preços em centavos).
-- max_members / max_admins: ajuste conforme a regra comercial final.
insert into public.plans (code, name, description, monthly_price_cents, billing_type, max_members, max_admins, sort_order, is_public)
values
  ('starter',   'Starter',   'Plano básico do SirvaOS para igrejas iniciando a gestão digital.',           6900,  'automatic', 300,  3,  10, true),
  ('essencial', 'Essencial', 'Até 1000 membros com os módulos essenciais de gestão.',                      8900,  'automatic', 1000, 5,  20, true),
  ('ultra',     'Ultra',     'Até 2000 membros com painel completo e recursos avançados.',                 11900, 'automatic', 2000, 10, 30, true),
  ('catedral',  'Catedral',  'Acima de 2000 membros, com onboarding e liberação assistida pela equipe.',   24900, 'manual',    null, null, 40, true)
on conflict (code) do update set
  name                = excluded.name,
  description         = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  billing_type        = excluded.billing_type,
  max_members         = excluded.max_members,
  max_admins          = excluded.max_admins,
  sort_order          = excluded.sort_order,
  is_public           = excluded.is_public,
  status              = 'active';

-- Planos antigos sem uso comercial: arquivar e tirar da vitrine (não apaga; tenants mantêm histórico).
update public.plans
   set status = 'archived', is_public = false
 where code in ('growth', 'enterprise');

-- ➜ Etapa 0: cole aqui os product_id COMPLETOS do painel AbacatePay (prefixos do print abaixo):
--   update public.plans set abacatepay_product_id = 'prod_Efzjtrmk...'  where code = 'starter';
--   update public.plans set abacatepay_product_id = 'prod_DhtsNKYc...'  where code = 'essencial';
--   update public.plans set abacatepay_product_id = 'prod_2BbUsjJq...'  where code = 'ultra';
--   update public.plans set abacatepay_product_id = 'prod_RabEd3HG...'  where code = 'catedral';

-- ──────────────────────────────────────────────────────────────────────────
-- (2) TENANTS — campos de assinatura (trial_* permanecem como estão)
-- ──────────────────────────────────────────────────────────────────────────
alter table public.tenants
  add column if not exists subscription_status text not null default 'none',
  add column if not exists billing_type text,
  add column if not exists abacatepay_customer_id text,
  add column if not exists abacatepay_subscription_id text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists current_period_end timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_subscription_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_subscription_status_check
      check (subscription_status in ('none', 'pending', 'active', 'past_due', 'cancelled'));
  end if;
end $$;

create index if not exists tenants_subscription_status_idx on public.tenants (subscription_status);
create index if not exists tenants_abacatepay_subscription_id_idx
  on public.tenants (abacatepay_subscription_id)
  where abacatepay_subscription_id is not null;

comment on column public.tenants.subscription_status is 'none = sem assinatura (ex.: trial manual) · pending · active · past_due · cancelled.';
comment on column public.tenants.billing_type is 'Espelha plans.billing_type no momento da contratação.';

-- ──────────────────────────────────────────────────────────────────────────
-- (3) SIGNUP_REQUESTS — dados do cadastro antes da confirmação do pagamento
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.signup_requests (
  id                     uuid primary key default gen_random_uuid(),
  status                 text not null default 'pending_payment'
                           check (status in ('pending_payment', 'paid', 'provisioned',
                                             'manual_pending', 'failed', 'expired')),
  -- dados da igreja/contato (mesmos campos que o Admin Global digita hoje)
  church_name            text not null,
  slug                   text not null,
  legal_name             text,
  document_number        text,
  contact_name           text,
  contact_email          text not null,
  contact_phone          text,
  plan_id                uuid references public.plans (id) on delete set null,
  plan_code              text,
  requested_modules      text[] not null default '{}',
  -- integração AbacatePay
  abacatepay_customer_id text,
  abacatepay_billing_id  text,
  external_id            text,                -- = id desta linha, enviado como externalId
  -- resultado
  tenant_id              uuid references public.tenants (id) on delete set null,
  error_message          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists signup_requests_status_idx          on public.signup_requests (status);
create index if not exists signup_requests_billing_id_idx       on public.signup_requests (abacatepay_billing_id);
create index if not exists signup_requests_external_id_idx      on public.signup_requests (external_id);
create unique index if not exists signup_requests_slug_pending_key
  on public.signup_requests (slug)
  where status in ('pending_payment', 'manual_pending', 'paid');

drop trigger if exists set_signup_requests_updated_at on public.signup_requests;
create trigger set_signup_requests_updated_at
before update on public.signup_requests
for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- (4) SUBSCRIPTION_EVENTS — log + idempotência (1 linha por evento do webhook)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.subscription_events (
  id                    uuid primary key default gen_random_uuid(),
  abacatepay_event_id   text unique,         -- payload.id (ex.: log_...) → garante processamento único
  event                 text not null,
  tenant_id             uuid references public.tenants (id) on delete set null,
  signup_request_id     uuid references public.signup_requests (id) on delete set null,
  payload               jsonb not null default '{}'::jsonb,
  processed_at          timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists subscription_events_event_idx on public.subscription_events (event);
create index if not exists subscription_events_tenant_idx on public.subscription_events (tenant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- RLS — escrita só via service-role (Edge Functions, que ignoram RLS).
--       Leitura liberada apenas para Admin Global.
-- ──────────────────────────────────────────────────────────────────────────
alter table public.signup_requests     enable row level security;
alter table public.subscription_events enable row level security;

drop policy if exists "Global admins can read signup requests" on public.signup_requests;
create policy "Global admins can read signup requests"
on public.signup_requests
for select
to authenticated
using (app_private.is_global_admin());

drop policy if exists "Global admins can update signup requests" on public.signup_requests;
create policy "Global admins can update signup requests"
on public.signup_requests
for update
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can read subscription events" on public.subscription_events;
create policy "Global admins can read subscription events"
on public.subscription_events
for select
to authenticated
using (app_private.is_global_admin());

grant select, update on public.signup_requests to authenticated;
grant select on public.subscription_events to authenticated;
