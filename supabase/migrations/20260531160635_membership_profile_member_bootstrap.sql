create or replace function app_private.ensure_current_profile_member()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  created_member_id uuid;
begin
  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null or current_profile.tenant_id is null then
    return null;
  end if;

  if current_profile.member_id is not null then
    return current_profile.member_id;
  end if;

  insert into public.members (
    tenant_id,
    name,
    email,
    phone,
    status,
    status_v2,
    ministry,
    notes
  )
  values (
    current_profile.tenant_id,
    coalesce(nullif(current_profile.full_name, ''), current_profile.email),
    current_profile.email,
    null,
    'active',
    'active',
    null,
    null
  )
  returning id into created_member_id;

  update public.profiles
  set member_id = created_member_id
  where id = current_profile.id
    and member_id is null;

  return created_member_id;
end;
$$;

grant execute on function app_private.ensure_current_profile_member() to authenticated;
