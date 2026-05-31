-- ── Activate worship (now fully functional — Etapa 6) ───────────────────────
update public.platform_modules
set status = 'active'
where code = 'worship';

-- ── Ensure 'financial' module exists and is active ───────────────────────────
-- Use upsert so this is safe whether 'financial' already exists or not.
insert into public.platform_modules (code, name, description, status, icon_name, sort_order)
values (
  'financial',
  'Financeiro',
  'Gestão de dízimos, ofertas, receitas, despesas, categorias e relatórios financeiros.',
  'active',
  'Wallet',
  50
)
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  status      = 'active',
  icon_name   = excluded.icon_name,
  sort_order  = excluded.sort_order;

-- ── Remove legacy 'finance' entry (seeded by foundation migration as beta) ───
-- Tenant_modules rows for 'finance' are cascade-deleted (no tenant should have
-- it active since the module was never built while it carried that code).
delete from public.platform_modules where code = 'finance';

-- ── financial_categories ─────────────────────────────────────────────────────
create table if not exists public.financial_categories (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants (id) on delete cascade,
  name       text not null,
  type       text not null default 'both'
               check (type in ('income', 'expense', 'both')),
  color      text,
  is_system  boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint financial_categories_name_not_blank check (length(btrim(name)) >= 2)
);

-- tenant_id null = sistema; tenant-specific entries coexist per tenant
create unique index if not exists financial_categories_tenant_name_unique
on public.financial_categories (
  coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);

create index if not exists financial_categories_tenant_idx
on public.financial_categories (tenant_id);

-- ── financial_transactions ───────────────────────────────────────────────────
create table if not exists public.financial_transactions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  type           text not null check (type in ('income', 'expense')),
  amount         numeric(12, 2) not null check (amount > 0),
  description    text not null,
  date           date not null default current_date,
  payment_method text not null default 'other'
                   check (payment_method in ('cash', 'pix', 'transfer', 'card', 'check', 'other')),
  category_id    uuid references public.financial_categories (id) on delete set null,
  member_id      uuid references public.members (id) on delete set null,
  notes          text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint financial_transactions_description_not_blank check (length(btrim(description)) >= 2)
);

create index if not exists financial_transactions_tenant_date_idx
on public.financial_transactions (tenant_id, date desc);

create index if not exists financial_transactions_tenant_type_idx
on public.financial_transactions (tenant_id, type);

create index if not exists financial_transactions_tenant_member_idx
on public.financial_transactions (tenant_id, member_id);

drop trigger if exists set_financial_transactions_updated_at on public.financial_transactions;
create trigger set_financial_transactions_updated_at
before update on public.financial_transactions
for each row execute function public.set_updated_at();

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.financial_categories  enable row level security;
alter table public.financial_transactions enable row level security;

-- categories: system rows (tenant_id is null) are visible to any active tenant user
-- tenant-specific rows are visible only to the financial module admin of that tenant
drop policy if exists "Financial categories readable by tenant financial users" on public.financial_categories;
create policy "Financial categories readable by tenant financial users"
on public.financial_categories
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.tenant_id is not null
    )
  )
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
);

drop policy if exists "Tenant financial admins can manage categories" on public.financial_categories;
create policy "Tenant financial admins can manage categories"
on public.financial_categories
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
);

drop policy if exists "Tenant financial admins can read transactions" on public.financial_transactions;
create policy "Tenant financial admins can read transactions"
on public.financial_transactions
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
);

drop policy if exists "Tenant financial admins can manage transactions" on public.financial_transactions;
create policy "Tenant financial admins can manage transactions"
on public.financial_transactions
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('financial')
  )
);

-- ── Grants ───────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.financial_categories  to authenticated;
grant select, insert, update, delete on public.financial_transactions to authenticated;

-- ── System seed categories ───────────────────────────────────────────────────
insert into public.financial_categories (tenant_id, name, type, color, is_system, sort_order)
values
  (null, 'Dízimos',                'income',  '#2f8a5f', true,  10),
  (null, 'Ofertas',                'income',  '#087c7a', true,  20),
  (null, 'Doações',                'income',  '#00a7c4', true,  30),
  (null, 'Outras receitas',        'income',  '#5a8a2f', true,  40),
  (null, 'Aluguel de espaço',      'income',  '#7a6e2f', true,  50),
  (null, 'Salários / Honorários',  'expense', '#c23b3b', true,  60),
  (null, 'Aluguel / Infraestrutura','expense','#c98a13', true,  70),
  (null, 'Missões',                'expense', '#8a5a2f', true,  80),
  (null, 'Equipamentos',           'expense', '#5a2f8a', true,  90),
  (null, 'Manutenção',             'expense', '#2f5a8a', true, 100),
  (null, 'Eventos',                'expense', '#8a2f5a', true, 110),
  (null, 'Outras despesas',        'expense', '#6b7280', true, 120)
on conflict (
  coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
) do nothing;
