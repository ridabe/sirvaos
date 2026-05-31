-- platform_modules contém apenas metadados públicos do catálogo (nome, código,
-- descrição, ícone). Não há dados sensíveis — qualquer usuário autenticado com
-- um tenant ativo precisa ler esta tabela para que o sidebar do admin-cliente
-- consiga resolver quais módulos estão ativos via JOIN em tenant_modules.

drop policy if exists "Authenticated users can read platform modules" on public.platform_modules;
create policy "Authenticated users can read platform modules"
on public.platform_modules
for select
to authenticated
using (true);
