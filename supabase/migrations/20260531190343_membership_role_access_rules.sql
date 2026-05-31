create or replace function app_private.is_secretaria_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      join public.member_ministries mm
        on mm.member_id = p.member_id
       and mm.tenant_id = p.tenant_id
      join public.catalog_ministries cm
        on cm.id = mm.ministry_id
      where p.id = auth.uid()
        and p.status = 'active'
        and p.tenant_id is not null
        and mm.is_admin = true
        and translate(lower(cm.name), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like 'secretari%'
    )
    or exists (
      select 1
      from public.profiles p
      join public.member_roles mr
        on mr.member_id = p.member_id
       and mr.tenant_id = p.tenant_id
      join public.catalog_roles cr
        on cr.id = mr.role_id
      where p.id = auth.uid()
        and p.status = 'active'
        and p.tenant_id is not null
        and translate(lower(cr.name), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like 'secretari%'
    );
$$;

create or replace function app_private.can_manage_members()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_global_admin()
    or app_private.is_tenant_admin()
    or app_private.is_secretaria_admin()
    or app_private.can_manage_module('members');
$$;

grant execute on function app_private.is_secretaria_admin() to authenticated;
grant execute on function app_private.can_manage_members() to authenticated;
