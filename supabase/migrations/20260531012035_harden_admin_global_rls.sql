create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Profiles can read themselves" on public.profiles;
drop policy if exists "Global admins can manage profiles" on public.profiles;
drop policy if exists "Profiles can read themselves or global admins can read" on public.profiles;

create policy "Profiles can read themselves or global admins can read"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or app_private.is_global_admin());

drop policy if exists "Global admins can insert profiles" on public.profiles;
create policy "Global admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (app_private.is_global_admin());

drop policy if exists "Global admins can update profiles" on public.profiles;
create policy "Global admins can update profiles"
on public.profiles
for update
to authenticated
using (app_private.is_global_admin())
with check (app_private.is_global_admin());

drop policy if exists "Global admins can delete profiles" on public.profiles;
create policy "Global admins can delete profiles"
on public.profiles
for delete
to authenticated
using (app_private.is_global_admin());
