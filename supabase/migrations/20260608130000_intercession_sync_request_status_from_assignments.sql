-- ============================================================
-- Intercessão — sincroniza prayer_requests.status a partir do status
-- da atribuição (prayer_assignments). Isso garante que quando o
-- intercessor iniciar/finalizar a oração, o solicitante e admins
-- vejam o status atualizado sem depender de UPDATE direto em prayer_requests.
-- ============================================================

create or replace function app_private.recompute_prayer_request_status(p_prayer_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_status text;
begin
  if p_prayer_request_id is null then
    return;
  end if;

  select
    case
      when exists (
        select 1
        from public.prayer_assignments pa
        where pa.prayer_request_id = p_prayer_request_id
          and pa.status = 'interceding'
      ) then 'interceding'
      when exists (
        select 1
        from public.prayer_assignments pa
        where pa.prayer_request_id = p_prayer_request_id
          and pa.status = 'done'
      ) then 'done'
      when exists (
        select 1
        from public.prayer_assignments pa
        where pa.prayer_request_id = p_prayer_request_id
          and pa.status = 'pending'
      ) then 'assigned'
      else 'new'
    end
  into v_new_status;

  update public.prayer_requests pr
     set status = v_new_status
   where pr.id = p_prayer_request_id
     and pr.status is distinct from v_new_status;
end;
$$;

create or replace function app_private.prayer_assignments_sync_request_status()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if tg_op = 'INSERT' then
    perform app_private.recompute_prayer_request_status(new.prayer_request_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    perform app_private.recompute_prayer_request_status(new.prayer_request_id);
    if new.prayer_request_id is distinct from old.prayer_request_id then
      perform app_private.recompute_prayer_request_status(old.prayer_request_id);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform app_private.recompute_prayer_request_status(old.prayer_request_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_prayer_assignments_sync_request_status on public.prayer_assignments;
create trigger trg_prayer_assignments_sync_request_status
after insert or update of status or delete on public.prayer_assignments
for each row
execute function app_private.prayer_assignments_sync_request_status();
