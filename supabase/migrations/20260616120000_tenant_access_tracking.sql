-- Rastreamento de acessos por cliente (tenant).
-- Conta cada login (web) e guarda a data/hora do último acesso.

alter table public.tenants
  add column if not exists access_count bigint not null default 0;

alter table public.tenants
  add column if not exists last_accessed_at timestamptz;

-- RPC chamada pela área do cliente após um login bem-sucedido.
-- Usa o tenant do perfil do usuário autenticado (não recebe parâmetros),
-- evitando que um usuário registre acesso para outro tenant.
create or replace function public.register_tenant_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id
  from public.profiles
  where id = auth.uid();

  if v_tenant_id is null then
    return;
  end if;

  update public.tenants
  set access_count = access_count + 1,
      last_accessed_at = now()
  where id = v_tenant_id;
end;
$$;

grant execute on function public.register_tenant_access() to authenticated;
