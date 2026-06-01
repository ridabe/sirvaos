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
- Eventos (substitui Calendário Central)
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

O Admin Global não deve ser criado por tela pública.

A estratégia oficial do projeto é criar o usuário por processo controlado server-side/local, usando a Admin API do Supabase com `service_role`, e depois promover o perfil para `super_admin`.

Script disponível:

```bash
npm run admin:create-global
```

No Windows, se `npm` ou `node` não estiverem no `PATH`, use o helper PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create-global-admin.ps1
```

Variáveis necessárias para executar o script:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GLOBAL_ADMIN_EMAIL=admin@sirvaos.com
GLOBAL_ADMIN_PASSWORD=senha-forte
GLOBAL_ADMIN_NAME=Admin Global SirvaOS
```

O `SUPABASE_SERVICE_ROLE_KEY` nunca deve ir para o frontend, GitHub, bundle Vite ou variáveis `NEXT_PUBLIC_*`.

Como alternativa, depois de criar o primeiro usuário pelo painel de Auth do Supabase, promova esse usuário no banco com uma operação controlada:

```sql
update public.profiles
set global_role = 'super_admin',
    status = 'active'
where email = 'email-do-admin@dominio.com';
```

Essa operação deve ser feita no SQL Editor do Supabase ou por uma conexão administrativa segura.

Evite inserir diretamente na tabela `auth.users`, porque o Supabase Auth gerencia hash de senha, confirmação, identidades e metadados próprios. Para criação programática, use a Admin API em ambiente confiável.

## Primeiro acesso de membros

O fluxo de primeiro acesso usa uma Edge Function pÃºblica (`first-access`) para validar membros cadastrados antes de criar senha. A funÃ§Ã£o roda server-side com `SUPABASE_SERVICE_ROLE_KEY` e nunca expÃµe essa chave no frontend.

Deploy esperado:

```bash
npm run sb -- functions deploy first-access --project-ref <project-ref> --no-verify-jwt --use-api
```

Regras do endpoint:

- `action = start`: valida e-mail do membro, tenant ativo, status ativo, data de nascimento quando existir, rate limit e cria token curto.
- `action = complete`: valida token, cria/atualiza o usuÃ¡rio Auth com senha, vincula `profiles.member_id`, ativa o perfil e registra auditoria.
- Se o perfil jÃ¡ estiver ativo, o endpoint nÃ£o recria senha e orienta login normal.

## Rota do Admin Global

A rota web exclusiva do Admin Global é:

```text
/admin-global
```

Ela autentica pelo Supabase Auth e, após o login, consulta `profiles.global_role`.

Papéis aceitos:

- `super_admin`
- `operations`

Usuários autenticados sem papel global ativo são desconectados e não acessam o Admin Global.

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
