-- Pendência P1 — Comprovantes financeiros no Portal do Membro.
-- O membro não tem acesso de leitura à tabela financeira (RLS admin-only).
-- Esta RPC (security definer) devolve SOMENTE as transações vinculadas ao
-- próprio membro logado (member_id = current_member_id()).

create or replace function public.my_financial_contributions()
returns table (
  id             uuid,
  date           date,
  type           text,
  amount         numeric(12,2),
  description    text,
  payment_method text,
  category_name  text,
  created_at     timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.date, t.type, t.amount, t.description, t.payment_method,
         c.name as category_name, t.created_at
  from public.financial_transactions t
  left join public.financial_categories c on c.id = t.category_id
  where t.member_id = app_private.current_member_id()
    and app_private.current_member_id() is not null
  order by t.date desc, t.created_at desc;
$$;

grant execute on function public.my_financial_contributions() to authenticated;

comment on function public.my_financial_contributions() is
  'P1: contribuições/lançamentos financeiros do próprio membro logado (comprovantes no portal).';
