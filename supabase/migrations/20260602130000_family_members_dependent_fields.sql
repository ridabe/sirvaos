-- Extend family_members to support non-member dependents (e.g. children without a user account)
-- Adds: id (new PK), name (standalone), date_of_birth, makes member_id optional

-- 1. Add surrogate PK column
do $$ begin
  alter table public.family_members add column id uuid default gen_random_uuid();
exception when duplicate_column then null; end $$;

-- Populate id for existing rows that have null id
update public.family_members set id = gen_random_uuid() where id is null;

-- 2. Add name column (will populate from members join, then set NOT NULL)
do $$ begin
  alter table public.family_members add column name text;
exception when duplicate_column then null; end $$;

-- Populate name from members table for all existing rows
update public.family_members fm
set name = m.name
from public.members m
where fm.member_id = m.id
  and fm.name is null;

-- Fallback: any remaining rows (shouldn't happen but be safe)
update public.family_members set name = 'Membro' where name is null;

-- Now enforce NOT NULL
alter table public.family_members alter column name set not null;

-- 3. Add date_of_birth column (nullable – filled manually or auto from member)
do $$ begin
  alter table public.family_members add column date_of_birth date;
exception when duplicate_column then null; end $$;

-- Backfill from members table
update public.family_members fm
set date_of_birth = m.date_of_birth
from public.members m
where fm.member_id = m.id
  and fm.date_of_birth is null
  and m.date_of_birth is not null;

-- 4. Drop old composite primary key and replace with id
alter table public.family_members drop constraint if exists family_members_pkey;
do $$ begin
  alter table public.family_members add primary key (id);
exception when others then null; end $$;

-- 5. Make member_id nullable so we can store non-member dependents
alter table public.family_members alter column member_id drop not null;

-- 6. Unique index for (family_id, member_id) only where member_id is not null
create unique index if not exists family_members_family_member_unique
  on public.family_members (family_id, member_id)
  where member_id is not null;

-- 7. Index for date_of_birth queries (Kids integration)
create index if not exists family_members_tenant_dob_idx
  on public.family_members (tenant_id, date_of_birth)
  where date_of_birth is not null;
