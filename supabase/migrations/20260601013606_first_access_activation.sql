create table if not exists public.first_access_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  request_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists first_access_tokens_member_idx
on public.first_access_tokens (tenant_id, member_id, created_at desc);

create index if not exists first_access_tokens_email_idx
on public.first_access_tokens (lower(email), created_at desc);

create index if not exists first_access_tokens_active_idx
on public.first_access_tokens (token_hash, expires_at)
where used_at is null;

create table if not exists public.first_access_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tenant_id uuid references public.tenants (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  request_ip text,
  action text not null check (action in ('start', 'complete')),
  result text not null,
  created_at timestamptz not null default now()
);

create index if not exists first_access_attempts_email_recent_idx
on public.first_access_attempts (lower(email), created_at desc);

create index if not exists first_access_attempts_ip_recent_idx
on public.first_access_attempts (request_ip, created_at desc);

alter table public.first_access_tokens enable row level security;
alter table public.first_access_attempts enable row level security;

revoke all on public.first_access_tokens from anon, authenticated;
revoke all on public.first_access_attempts from anon, authenticated;

comment on table public.first_access_tokens is
  'Tokens curtos de primeiro acesso para transformar members cadastrados em profiles autenticaveis.';

comment on table public.first_access_attempts is
  'Registro de tentativas do fluxo de primeiro acesso para rate limit e auditoria operacional.';
