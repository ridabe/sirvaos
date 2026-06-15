# Plano — Assinaturas & Onboarding automatizado (AbacatePay)

> Data: 2026-06-15
> Status: planejamento aprovado para iniciar o **backend**. Telas (frontend) só depois que o Ricardo enviar as sugestões de UI.
> Decisões tomadas: (1) backend em **Supabase Edge Functions**; (2) **realinhar** a tabela `plans` para os 4 produtos reais; (3) cadastro self-service **assina já, sem trial gratuito** — o trial de 30 dias continua sendo ferramenta manual do Admin Global.

---

## 1. Objetivo

Hoje um cliente novo (igreja/tenant) é criado **manualmente** pelo Admin Global, que dá 30 dias de acesso grátis (`tenants.trial_*`). Queremos um fluxo **automatizado e self-service**:

1. Visitante acessa a página de planos no site.
2. Escolhe um plano → preenche os dados que hoje o Admin Global digita (igreja + contato + documento).
3. É redirecionado ao **AbacatePay** para assinar (cartão, cobrança recorrente).
4. Ao confirmar o pagamento, o **webhook** provisiona o tenant + o acesso do admin **automaticamente** (mesma lógica de hoje, mas disparada pela API).
5. **Catedral** é exceção: não é automático. Gera um pedido enviado ao e-mail de suporte e nós liberamos manualmente (como é feito hoje).

A flag de trial de 30 dias **permanece** — apenas deixa de ser o caminho padrão do cadastro; vira uma cortesia que o Admin Global ativa/remove quando quiser.

---

## 2. O que já existe (levantamento)

- **`plans`** (`20260531011625_admin_global_foundation.sql`): `id, code, name, description, monthly_price_cents, status, max_members, max_admins, sort_order`. Seed atual: `starter / growth / enterprise` (todos com preço 0). RLS: só admin global gerencia.
- **`tenants`**: `plan_id`, dados da igreja (`name, slug, legal_name, document_number, contact_name, contact_email, contact_phone`), `status` (`active|suspended|configuring`), tema. Trial: `trial_enabled, trial_started_at, trial_ends_at, trial_dismissed_at` (`20260610120000_tenant_trial_30_days.sql`).
- **`tenant_modules`**: módulos contratados por tenant.
- **Edge Function `provision-tenant-admin`**: cria o usuário (auth) + `profiles` (owner) + e-mail de acesso. **Hoje exige login de admin global** (`super_admin/operations`). Precisaremos de um caminho interno (service-role) para o webhook reutilizar essa lógica.
- **Fluxo de onboarding** documentado em `docs/fluxos-modulos.md` §1.
- **`.env.local`**: já tem `API_ABACATE_URL` e `API_ABACATE_API_KEY`. ⚠️ **Não** há os `product_id` dos planos no env — guardaremos no banco (`plans.abacatepay_product_id`), que é mais limpo e versionável. Falta criar o **webhook** no painel AbacatePay e a **URL + secret** no sistema.
- **Artes** já prontas em `img/`: `sirvaos_plano_basico.png`, `sirvaos_plano_essencial.png`, `sirvaos_plano_ultra.png`, `sirvaos_plano_catedral.png`.

### Produtos no AbacatePay (do print do painel)

| Plano (code)        | Produto (label)     | Preço/mês | `abacatepay_product_id` (prefixo)  | Cobrança   |
|---------------------|---------------------|-----------|------------------------------------|------------|
| `starter` (Básico)  | `sirvaos_starter`   | R$ 69,00  | `prod_Efzjtrmk...`                 | automática |
| `essencial`         | `sirvaos_essencial` | R$ 89,00  | `prod_DhtsNKYc...`                 | automática |
| `ultra`             | `sirvaos_ultra`     | R$ 119,00 | `prod_2BbUsjJq...`                 | automática |
| `catedral`          | `sirvaos_catedral`  | R$ 249,00 | `prod_RabEd3HG...`                 | **manual** |

> Os IDs completos precisam ser copiados do painel (`app.abacatepay.com/products`) na Etapa 0. Cada produto **deve ter `cycle = MONTHLY`** configurado no AbacatePay (pré-requisito de assinatura).

---

## 3. Como a API do AbacatePay se encaixa (resumo da doc)

- Base URL `https://api.abacatepay.com/v2`, auth `Bearer <API_KEY>`. Resposta padrão `{ data, error, success }`.
- **Assinatura** = `POST /subscriptions/create` com `items: [{ id: <product_id>, quantity: 1 }]`, `customerId`, `externalId` (nossa referência), `completionUrl`, `methods: ["CARD"]`. Retorna `data.url` → redirecionamos o cliente. Assinatura aceita **1 produto** e **só CARD**; o ciclo vem do produto.
- **Cliente**: `POST /customers/create` (nome, e-mail, celular, CPF/CNPJ) → `customerId` para pré-preencher o checkout.
- **Webhook**: cadastrado no painel, recebe `POST` com `{ id, event, apiVersion, devMode, data }`. Eventos relevantes:
  - `subscription.completed` → **assinatura ativada** (gatilho de provisionamento).
  - `subscription.renewed` → cobrança recorrente paga (renova período).
  - `subscription.cancelled` → assinatura cancelada.
- **Segurança do webhook (2 camadas):** (1) `?webhookSecret=` na URL; (2) assinatura **HMAC-SHA256** no header `X-Webhook-Signature` validada com a chave pública da AbacatePay. Responder `200` só após processar; processar cada evento **uma única vez** (idempotência).
- **Dev mode**: webhooks/checkouts em modo teste recebem eventos simulados — usaremos para o teste ponta-a-ponta antes de produção.

---

## 4. Arquitetura proposta

### 4.1 Mudanças de banco (migrations)

**a) `plans` — realinhar para os 4 produtos reais**
- Adicionar colunas: `abacatepay_product_id text`, `billing_type text not null default 'automatic'` (check `automatic|manual`), `cycle text default 'MONTHLY'`, `is_public boolean default true` (controla aparição na página de planos).
- Re-seed: definir preços reais (6900 / 8900 / 11900 / 24900 centavos), `code` = `starter|essencial|ultra|catedral`, `catedral.billing_type='manual'`, e gravar os `abacatepay_product_id`. Arquivar/remover `growth` e `enterprise` (sem apagar tenants — `plan_id` é `on delete set null`, mas faremos só archive p/ segurança).

**b) `tenants` — campos de assinatura** (mantendo `trial_*`)
- `subscription_status text default 'none'` (`none|pending|active|past_due|cancelled`)
- `abacatepay_customer_id text`, `abacatepay_subscription_id text` (id do billing/assinatura)
- `subscription_started_at timestamptz`, `current_period_end timestamptz`
- `billing_type text` (espelha o do plano no momento da contratação)

**c) Nova tabela `signup_requests`** — ponte entre o cadastro e a confirmação do pagamento (o tenant só nasce **depois** do pagamento)
- `id uuid pk`, `status text` (`pending_payment|paid|provisioned|manual_pending|failed|expired`)
- Dados coletados: `church_name, slug, legal_name, document_number, contact_name, contact_email, contact_phone, plan_id, requested_modules text[]`
- Integração: `abacatepay_customer_id`, `abacatepay_billing_id`, `external_id` (= `signup_requests.id`), `tenant_id` (preenchido após provisionar)
- `created_at, updated_at`. RLS: escrita só via service-role (Edge Functions); leitura para admin global.

**d) Nova tabela `subscription_events`** — log + idempotência do webhook
- `id uuid pk`, `abacatepay_event_id text unique` (o `id` do payload, ex. `log_...`), `event text`, `tenant_id uuid null`, `signup_request_id uuid null`, `payload jsonb`, `processed_at timestamptz`. A unicidade de `abacatepay_event_id` garante processamento único.

### 4.2 Edge Functions (novas)

**1) `create-subscription-checkout`** (pública — chamada pela página de planos)
- Entrada: dados da igreja/contato + `plan_code`.
- Valida plano (existe, público) e disponibilidade do `slug`.
- **Se `billing_type = 'manual'` (Catedral):** cria `signup_requests` com status `manual_pending`, envia e-mail ao **suporte** (Resend) com os dados do pedido, retorna `{ mode: 'manual' }`.
- **Se automático:** cria cliente no AbacatePay (`/customers/create`), cria `signup_requests` (`pending_payment`), chama `/subscriptions/create` (`externalId = signup_requests.id`, `completionUrl = <app>/assinatura/sucesso`, `methods:['CARD']`), salva `abacatepay_billing_id`, retorna `{ url }` para redirecionar.

**2) `abacatepay-webhook`** (pública — recebe eventos)
- Valida `?webhookSecret=` **e** HMAC `X-Webhook-Signature`. Lê o body **raw** (sem parse estrito).
- Idempotência: tenta inserir em `subscription_events` pelo `id` do evento; se já existe, responde `200` e sai.
- `subscription.completed`: localiza `signup_requests` pelo `externalId` → **provisiona**: cria `tenants` (status `active`, `plan_id`, campos de assinatura), cria `tenant_modules` conforme o plano, e cria o admin (mesma lógica do `provision-tenant-admin`, via service-role) + e-mail de primeiro acesso. Marca `signup_requests.status='provisioned'` e grava `tenant_id`.
- `subscription.renewed`: atualiza `current_period_end`, mantém `active`.
- `subscription.cancelled`: `subscription_status='cancelled'` (definir período de carência antes de suspender o acesso — sugestão: suspender no fim do `current_period_end`).
- Sempre responder `200` após processar.

**3) Refator `provision-tenant-admin`** — extrair a lógica de criação de usuário/owner para um módulo compartilhado (`_shared/provisioning.ts`) usado por **dois** chamadores: a UI do admin global (com checagem de papel) e o webhook (com service-role). Evita duplicação.

### 4.3 Frontend (fase posterior — aguardar sugestões do Ricardo)
- Página pública de planos (`/planos` ou `/assinar`): 4 cards usando as artes de `img/`, com preço e CTA. Catedral com CTA "Falar com o time / Solicitar".
- Formulário de cadastro (igreja + contato + CPF/CNPJ + slug sugerido) → chama `create-subscription-checkout` → redireciona para `data.url` (ou tela de "pedido enviado" no caso Catedral).
- Página de sucesso (`completionUrl`): "Pagamento confirmado, estamos preparando seu painel — enviamos o acesso para seu e-mail."
- Admin Global: aba para ver `signup_requests` (pendentes/manuais) e ainda ativar/remover o trial de 30 dias.

---

## 5. Etapas de desenvolvimento (ordem de execução)

**Backend primeiro:**

- **Etapa 0 — Setup & credenciais**
  - Copiar os `product_id` completos dos 4 produtos do painel AbacatePay.
  - Confirmar `cycle = MONTHLY` em cada produto.
  - Gerar `ABACATEPAY_WEBHOOK_SECRET`; adicionar secrets no Supabase (`ABACATEPAY_API_KEY`, `ABACATEPAY_API_URL`, `ABACATEPAY_WEBHOOK_SECRET`) e confirmar no Vercel.

- **Etapa 1 — Migrations**: realinhar `plans` (4 planos + `abacatepay_product_id` + `billing_type`), campos de assinatura em `tenants`, tabelas `signup_requests` e `subscription_events` (+ RLS).

- **Etapa 2 — `create-subscription-checkout`** + helper `_shared/abacatepay.ts` (cliente HTTP: customers, subscriptions).

- **Etapa 3 — `abacatepay-webhook`** + refator do provisionamento compartilhado + idempotência. Tratar `completed/renewed/cancelled`.

- **Etapa 4 — Caminho Catedral (manual)**: e-mail ao suporte + visibilidade dos pedidos manuais no Admin Global.

- **Etapa 5 — Registro do webhook + teste ponta-a-ponta** em **dev mode** (assinar → webhook → tenant criado → e-mail de acesso). Validar idempotência (reenvio do mesmo evento).

**Depois (com as sugestões de UI do Ricardo):**

- **Etapa 6 — Telas**: página de planos + formulário + página de sucesso, usando as artes.
- **Etapa 7 — Cleanup & docs**: migrar tenants de teste/trial, atualizar `docs/fluxos-modulos.md` (§1) e `docs/roadmap-etapas.md`.

---

## 6. Pontos de atenção / decisões pendentes

- **Assinatura só aceita CARD** (PIX não é suportado em recorrência pela AbacatePay). A página de planos deve deixar isso claro.
- **CPF/CNPJ** é necessário para criar o cliente no AbacatePay (`taxId`) — já temos `tenants.document_number`; coletar no formulário.
- **Provisionamento idempotente**: garantir que reenvios de webhook não criem tenant/usuário duplicado (chave única em `subscription_events` + checagem de `signup_requests.status`).
- **Carência no cancelamento**: definir se acesso cai imediatamente ou no fim do período pago (sugestão: fim do período).
- **`slug` único**: validar no momento do cadastro e de novo no provisionamento (corrida entre dois cadastros).
- **Reconciliação**: criar um job/botão para reprocessar `signup_requests` presos em `pending_payment` (ex.: webhook perdido) consultando o status do billing na API.
