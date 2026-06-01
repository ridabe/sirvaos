alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_sel on public.audit_logs;
create policy audit_logs_sel
on public.audit_logs
for select
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and (
      app_private.is_tenant_admin()
      or exists (
        select 1
        from public.profiles p
        join public.tenant_module_admins tma
          on tma.tenant_id = p.tenant_id
         and (
           tma.profile_id = p.id
           or (p.member_id is not null and tma.member_id = p.member_id)
         )
        where p.id = auth.uid()
          and p.status = 'active'
          and p.tenant_id is not null
      )
    )
  )
);

revoke insert on public.audit_logs from authenticated;

create or replace function app_private.audit_log(
  action text,
  entity_type text,
  entity_id text default null,
  metadata jsonb default '{}'::jsonb,
  tenant_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_tenant_id uuid;
  inserted_id bigint;
begin
  resolved_tenant_id := coalesce(tenant_id, app_private.current_tenant_id());

  if not app_private.is_global_admin() then
    if resolved_tenant_id is null or resolved_tenant_id <> app_private.current_tenant_id() then
      raise exception 'tenant_id inválido para auditoria';
    end if;
  end if;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    resolved_tenant_id,
    auth.uid(),
    action,
    entity_type,
    entity_id,
    coalesce(metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.audit_log(
  action text,
  entity_type text,
  entity_id text default null,
  metadata jsonb default '{}'::jsonb,
  tenant_id uuid default null
)
returns bigint
language sql
volatile
set search_path = public
as $$
  select app_private.audit_log(action, entity_type, entity_id, metadata, tenant_id);
$$;

grant execute on function public.audit_log(text, text, text, jsonb, uuid) to authenticated;
