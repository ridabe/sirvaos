insert into storage.buckets (id, name, public)
values ('tenant-logos', 'tenant-logos', true)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;
