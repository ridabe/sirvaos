# Checklist de configuração — AbacatePay (Etapas 0 e 5)

> Backend já implementado (Etapas 1–3). Estes são os passos que dependem de você
> (painel AbacatePay + secrets do Supabase). Depois disso, fazemos o teste em dev mode.

## 1. Secrets no Supabase (Edge Functions)

Defina no projeto Supabase (Dashboard → Project Settings → Edge Functions → Secrets,
ou `supabase secrets set ...`):

| Secret                      | Valor                                                                 |
|-----------------------------|-----------------------------------------------------------------------|
| `ABACATEPAY_API_URL`        | `https://api.abacate.com.br/v2` (mesmo do `.env.local`)               |
| `ABACATEPAY_API_KEY`        | sua API key do AbacatePay (mesma do `.env.local`)                     |
| `ABACATEPAY_WEBHOOK_SECRET` | um segredo forte que você gera (usado na query `?webhookSecret=`)      |
| `INTERNAL_FUNCTION_SECRET`  | um segredo forte (webhook → provision-tenant-admin, chamada interna)   |
| `SUPPORT_EMAIL`             | e-mail que recebe pedidos do plano Catedral (ex.: `suporte@sirvaos.com.br`) |
| `APP_URL`                   | URL do app (ex.: `https://app.sirvaos.com.br`) — já usado em outras funções |

> `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` já existem.

## 2. Product IDs dos planos (Etapa 0)

Copie os IDs completos em `app.abacatepay.com/produtos` e rode no SQL do Supabase
(confirme antes que cada produto tem **cycle = MONTHLY**):

```sql
update public.plans set abacatepay_product_id = 'prod_Efzjtrmk...COLE_AQUI' where code = 'starter';
update public.plans set abacatepay_product_id = 'prod_DhtsNKYc...COLE_AQUI' where code = 'essencial';
update public.plans set abacatepay_product_id = 'prod_2BbUsjJq...COLE_AQUI' where code = 'ultra';
-- catedral é manual; product_id é opcional (não usamos no fluxo automático):
update public.plans set abacatepay_product_id = 'prod_RabEd3HG...COLE_AQUI' where code = 'catedral';
```

> Confira também os **valores** que coloquei na migration (starter R$69, essencial R$89,
> ultra R$119, catedral R$249) e os limites `max_members`/`max_admins` — ajuste se a
> regra comercial for outra.

## 3. Deploy (após secrets e IDs)

```bash
supabase db push                                   # aplica a migration
supabase functions deploy create-subscription-checkout
supabase functions deploy abacatepay-webhook
supabase functions deploy provision-tenant-admin   # redeploy: ganhou o bypass interno
```

URLs resultantes:
- Checkout:  `https://<project-ref>.supabase.co/functions/v1/create-subscription-checkout`
- Webhook:   `https://<project-ref>.supabase.co/functions/v1/abacatepay-webhook?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`

## 4. Cadastrar o webhook no AbacatePay (Etapa 5)

No painel → Webhooks → Criar:
- **Nome:** SirvaOS assinaturas
- **URL:** a URL do webhook acima (com `?webhookSecret=...`)
- **Eventos:** `subscription.completed`, `subscription.renewed`, `subscription.cancelled`
- Crie primeiro em **Dev mode** para testar.

## 5. Teste ponta-a-ponta (dev mode)

1. `POST` em `create-subscription-checkout` com um plano automático (ex.: `starter`) e dados de teste.
2. Abrir a `url` retornada e concluir o pagamento de teste.
3. Conferir: webhook recebido → `subscription_events` com `processed_at` → `tenants` criado (status `active`) → e-mail de acesso enviado ao contato.
4. Reenviar o mesmo evento e confirmar que **não** duplica (idempotência).
5. Plano `catedral`: confirmar que cai no caminho manual e o e-mail chega ao `SUPPORT_EMAIL`.

## Pendente para a fase de telas (com suas sugestões)
- Página pública de planos + formulário + página de sucesso (`/assinatura/sucesso`).
- Aba no Admin Global para listar `signup_requests` (pendentes/manuais) e provisionar Catedral.
- Atualizar `docs/fluxos-modulos.md` (§1) com o fluxo automatizado.
