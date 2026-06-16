-- Item 2 (task 9): enforcement dos limites de membros e administradores por plano.
-- Lê tenants.plan_id → plans.max_members / max_admins. NULL = ilimitado (sem bloqueio).
-- Triggers BEFORE INSERT/UPDATE: bloqueiam apenas NOVOS cadastros acima do limite
-- (tenants já existentes acima do limite não são afetados retroativamente).

-- ── Limite de MEMBROS ────────────────────────────────────────────────────────
create or replace function app_private.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max   integer;
  v_count integer;
begin
  select p.max_members into v_max
  from public.tenants t
  join public.plans p on p.id = t.plan_id
  where t.id = NEW.tenant_id;

  if v_max is null then
    return NEW; -- plano sem limite (ou tenant sem plano)
  end if;

  select count(*) into v_count
  from public.members
  where tenant_id = NEW.tenant_id;

  if v_count >= v_max then
    raise exception
      'Limite de % membros do plano atingido. Faça upgrade para cadastrar mais.', v_max
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_member_limit_trg on public.members;
create trigger enforce_member_limit_trg
before insert on public.members
for each row execute function app_private.enforce_member_limit();

-- ── Limite de ADMINISTRADORES (owner/admin do tenant) ────────────────────────
create or replace function app_private.enforce_admin_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max   integer;
  v_count integer;
begin
  -- Só interessa quando o registro passa a ser owner/admin.
  if NEW.tenant_role is null or NEW.tenant_role not in ('owner', 'admin') then
    return NEW;
  end if;

  -- Em UPDATE sem mudança de papel/tenant, não recontar.
  if TG_OP = 'UPDATE'
     and NEW.tenant_role is not distinct from OLD.tenant_role
     and NEW.tenant_id   is not distinct from OLD.tenant_id then
    return NEW;
  end if;

  if NEW.tenant_id is null then
    return NEW;
  end if;

  select p.max_admins into v_max
  from public.tenants t
  join public.plans p on p.id = t.plan_id
  where t.id = NEW.tenant_id;

  if v_max is null then
    return NEW; -- plano sem limite
  end if;

  select count(*) into v_count
  from public.profiles
  where tenant_id = NEW.tenant_id
    and tenant_role in ('owner', 'admin')
    and id <> NEW.id; -- exclui o próprio registro (no UPDATE)

  if v_count >= v_max then
    raise exception
      'Limite de % administradores do plano atingido. Faça upgrade para adicionar mais.', v_max
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_admin_limit_trg on public.profiles;
create trigger enforce_admin_limit_trg
before insert or update on public.profiles
for each row execute function app_private.enforce_admin_limit();
