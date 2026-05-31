do $$
begin
  alter table public.tenants add column header_color text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.tenants add column sidebar_color text;
exception
  when duplicate_column then null;
end $$;

do $$
begin
  alter table public.tenants add column footer_color text;
exception
  when duplicate_column then null;
end $$;

update public.tenants
set header_color = primary_color
where header_color is null;

update public.tenants
set sidebar_color = primary_color
where sidebar_color is null;

update public.tenants
set footer_color = primary_color
where footer_color is null;

alter table public.tenants alter column header_color set default '#087C7A';
alter table public.tenants alter column header_color set not null;

alter table public.tenants alter column sidebar_color set default '#087C7A';
alter table public.tenants alter column sidebar_color set not null;

alter table public.tenants alter column footer_color set default '#087C7A';
alter table public.tenants alter column footer_color set not null;

do $$
begin
  alter table public.tenants add constraint tenants_header_color_format check (header_color ~ '^#[0-9A-Fa-f]{6}$');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.tenants add constraint tenants_sidebar_color_format check (sidebar_color ~ '^#[0-9A-Fa-f]{6}$');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.tenants add constraint tenants_footer_color_format check (footer_color ~ '^#[0-9A-Fa-f]{6}$');
exception
  when duplicate_object then null;
end $$;

