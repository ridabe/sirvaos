create table if not exists public.worship_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_id uuid not null references public.worship_events (id) on delete cascade,
  subject text not null default 'Sua escala de louvor',
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'partial_failed', 'failed')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists worship_email_campaigns_event_idx
on public.worship_email_campaigns (event_id, created_at desc);

create table if not exists public.worship_email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.worship_email_campaigns (id) on delete cascade,
  assignment_id uuid not null references public.worship_assignments (id) on delete cascade,
  member_name text not null,
  member_email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz
);

create index if not exists worship_email_campaign_recipients_campaign_idx
on public.worship_email_campaign_recipients (campaign_id);

alter table public.worship_email_campaigns enable row level security;
alter table public.worship_email_campaign_recipients enable row level security;

drop policy if exists "Worship admins can manage email campaigns" on public.worship_email_campaigns;
create policy "Worship admins can manage email campaigns"
on public.worship_email_campaigns
for all
to authenticated
using (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
)
with check (
  app_private.is_global_admin()
  or (
    tenant_id = app_private.current_tenant_id()
    and app_private.can_manage_module('worship')
  )
);

drop policy if exists "Worship admins can manage campaign recipients" on public.worship_email_campaign_recipients;
create policy "Worship admins can manage campaign recipients"
on public.worship_email_campaign_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.worship_email_campaigns c
    where c.id = campaign_id
      and (
        app_private.is_global_admin()
        or (
          c.tenant_id = app_private.current_tenant_id()
          and app_private.can_manage_module('worship')
        )
      )
  )
);

create or replace function public.create_worship_email_campaign(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_tenant_id uuid;
  v_recipient_count integer;
begin
  select we.tenant_id into v_tenant_id
  from public.worship_events we
  where we.id = p_event_id
    and (
      app_private.is_global_admin()
      or we.tenant_id = app_private.current_tenant_id()
    );

  if v_tenant_id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not (app_private.is_global_admin() or app_private.can_manage_module('worship')) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select count(*) into v_recipient_count
  from public.worship_assignments wa
  join public.members m on m.id = wa.member_id
  where wa.event_id = p_event_id
    and m.email is not null
    and trim(m.email) != '';

  if v_recipient_count = 0 then
    raise exception 'NO_RECIPIENTS';
  end if;

  insert into public.worship_email_campaigns (tenant_id, event_id, recipient_count)
  values (v_tenant_id, p_event_id, v_recipient_count)
  returning id into v_campaign_id;

  insert into public.worship_email_campaign_recipients
    (campaign_id, assignment_id, member_name, member_email)
  select
    v_campaign_id,
    wa.id,
    m.name,
    lower(trim(m.email))
  from public.worship_assignments wa
  join public.members m on m.id = wa.member_id
  where wa.event_id = p_event_id
    and m.email is not null
    and trim(m.email) != '';

  return v_campaign_id;
end;
$$;

create or replace function public.get_worship_email_campaigns(p_event_id uuid)
returns table (
  campaign_id uuid,
  subject text,
  status text,
  recipient_count integer,
  sent_count integer,
  failed_count integer,
  created_at timestamptz,
  finished_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.subject,
    c.status,
    c.recipient_count,
    c.sent_count,
    c.failed_count,
    c.created_at,
    c.finished_at
  from public.worship_email_campaigns c
  join public.worship_events we on we.id = c.event_id
  where c.event_id = p_event_id
    and (
      app_private.is_global_admin()
      or (
        we.tenant_id = app_private.current_tenant_id()
        and app_private.can_manage_module('worship')
      )
    )
  order by c.created_at desc;
$$;

create or replace function public.get_worship_email_campaign_recipients(p_campaign_id uuid)
returns table (
  recipient_id uuid,
  member_name text,
  member_email text,
  status text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.member_name,
    r.member_email,
    r.status,
    r.provider_message_id,
    r.error_message,
    r.sent_at
  from public.worship_email_campaign_recipients r
  join public.worship_email_campaigns c on c.id = r.campaign_id
  join public.worship_events we on we.id = c.event_id
  where r.campaign_id = p_campaign_id
    and (
      app_private.is_global_admin()
      or (
        we.tenant_id = app_private.current_tenant_id()
        and app_private.can_manage_module('worship')
      )
    )
  order by r.member_name;
$$;

grant execute on function public.create_worship_email_campaign(uuid) to authenticated;
grant execute on function public.get_worship_email_campaigns(uuid) to authenticated;
grant execute on function public.get_worship_email_campaign_recipients(uuid) to authenticated;
grant select, insert, update, delete on public.worship_email_campaigns to authenticated;
grant select, insert, update, delete on public.worship_email_campaign_recipients to authenticated;
