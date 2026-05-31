# Supabase - Base Inicial

Este documento registra a configuração inicial do Supabase para o SirvaOS.

## Variáveis Locais

O projeto usa `.env.local` com:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_DB_PASS`

A chave pública é usada no frontend. A senha do banco deve ser usada apenas para operações locais de migration/CLI e nunca deve ser exposta no cliente.

## Migrations Criadas

- `20260531011625_admin_global_foundation.sql`
- `20260531012035_harden_admin_global_rls.sql`

## Estrutura Inicial

Tabelas públicas criadas:

- `profiles`
- `plans`
- `platform_modules`
- `tenants`
- `tenant_modules`
- `audit_logs`

Schema privado:

- `app_private`

Funções sensíveis com `security definer` ficam no schema `app_private`, fora do schema público exposto.

## Dados Iniciais

Planos:

- Starter
- Growth
- Enterprise

Catálogo inicial de módulos:

- Membresia
- Calendário Central
- Comunicados
- Louvor
- Financeiro
- Kids
- Escola Bíblica

## RLS

Todas as tabelas públicas criadas possuem Row Level Security ativo.

O acesso administrativo global depende de `profiles.global_role`:

- `super_admin`
- `operations`

Usuários sem papel global não acessam dados administrativos globais.

## Bootstrap do Primeiro Super Admin

Depois de criar o primeiro usuário pelo Supabase Auth, promova esse usuário no banco com uma operação controlada:

```sql
update public.profiles
set global_role = 'super_admin',
    status = 'active'
where email = 'email-do-admin@dominio.com';
```

Essa operação deve ser feita no SQL Editor do Supabase ou por uma conexão administrativa segura. Não deve existir fluxo público para um usuário se promover a super admin.

## Validações Executadas

- `supabase db push`
- Consulta de verificação:

```sql
select
  (select count(*) from public.plans) as plans,
  (select count(*) from public.platform_modules) as modules,
  (select count(*) from information_schema.tables
   where table_schema = 'public'
     and table_name in ('profiles','plans','platform_modules','tenants','tenant_modules','audit_logs')) as tables;
```

Resultado esperado:

- `plans`: 3
- `modules`: 7
- `tables`: 6

Advisors Supabase:

- `No issues found`
