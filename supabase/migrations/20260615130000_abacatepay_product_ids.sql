-- Etapa 0: vincula cada plano ao seu produto no AbacatePay.
-- (IDs copiados do painel app.abacatepay.com/produtos — produtos com cycle MONTHLY.)

update public.plans set abacatepay_product_id = 'prod_EfzjtrmkTh5Gg1Y1FmDXgP0G' where code = 'starter';
update public.plans set abacatepay_product_id = 'prod_DhtsNKYcZncjDpHXeCrRrnn5' where code = 'essencial';
update public.plans set abacatepay_product_id = 'prod_2BbUsjJqANd6LTWZTcMCCcXK' where code = 'ultra';
update public.plans set abacatepay_product_id = 'prod_RabEd3HGqL6QJrD0LCWEnDKM' where code = 'catedral';
