# A1 — Dashboard do Pastor / Admin Geral · Contratos de Dados e Queries

> **Documento:** Especificação da tarefa A1 (Frente A — Dashboard por papel)
> **Produto:** SirvaOS
> **Versão:** 0.1
> **Data:** 2026-06-12
> **Status:** Em andamento
> **Relacionado:** [etapa-2-diferenciacao.md](./etapa-2-diferenciacao.md)

---

## 1. Objetivo da A1

Definir **a estrutura de dados de cada cartão** do painel inicial do perfil **Admin Geral / Pastor** ("Saúde da Igreja"): o que cada KPI significa, o **contrato de tipos** (TypeScript) que o front consome e a **query/fonte** exata no banco. Esta spec é o contrato entre back (Supabase) e front (React) — implementação vem nas tarefas A2+.

Hoje o painel consome dados fictícios em `src/data/clientDashboard.ts`. A A1 substitui isso por contratos reais, multi-tenant.

---

## 2. Premissas e padrões

- **Escopo de tenant:** todo dado é do tenant do usuário logado. RLS já garante isolamento, mas as queries devem filtrar explicitamente por `tenant_id` para clareza e performance.
- **Resolução de papel:** segue o padrão de `src/lib/accessRouting.ts` (`profiles.global_role`, `profiles.tenant_id`, `profiles.tenant_role`). O painel do Pastor é exibido para `tenant_role in ('owner','admin')`.
- **Status de membro:** usar a coluna **`status_v2`** (enum: `active | inactive | visitor | in_process`). A coluna `status` (text) é legada.
- **Fuso/mês:** "mês atual" = `date_trunc('month', now())` no fuso do tenant (assumir `America/Sao_Paulo` por padrão até haver config por tenant).
- **Estratégia recomendada:** **uma única RPC** (`dashboard_admin_geral`) que devolve todos os KPIs em um JSON — 1 ida ao banco em vez de 8. As queries por cartão (seção 5) ficam documentadas como fonte da verdade de cada número e como fallback.

---

## 3. Contrato TypeScript do painel

```ts
// src/data/dashboardAdminGeral.ts
export type TrendDir = "up" | "down" | "flat";

export interface KpiCard {
  value: number;
  label: string;
  trendLabel?: string;   // ex.: "+36 este mês"
  trendDir?: TrendDir;
}

export interface FinanceSummary {
  income: number;        // receitas do mês (R$)
  expense: number;       // despesas do mês (R$)
  balance: number;       // income - expense
  monthLabel: string;    // ex.: "junho/2026"
}

export interface UpcomingEvent {
  id: string;
  title: string;
  eventDate: string;     // ISO
  location: string | null;
  source: "tenant_event" | "worship_event";
}

export interface PendingAssignment {
  assignmentId: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;      // ISO
  memberName: string;
  roleName: string | null;
}

export interface CareAlertSummary {
  coldMembersCount: number;   // placeholder Frente C; retorna 0 por ora
  enabled: boolean;           // false até a Frente C
}

export interface AdminGeralDashboard {
  kpis: {
    activeMembers: KpiCard;
    newThisMonth: KpiCard;
    visitors: KpiCard;
    inProcess: KpiCard;     // "em processo" (rumo a batismo/membresia)
  };
  finance: FinanceSummary;
  upcomingEvents: UpcomingEvent[];     // próximos 5
  pendingAssignments: {
    count: number;
    items: PendingAssignment[];        // próximas 5
  };
  careAlerts: CareAlertSummary;
  generatedAt: string;                 // ISO
}
```

---

## 4. Cartões do painel (definição funcional)

| # | Cartão | Tipo | Fonte | Pergunta que responde |
|---|--------|------|-------|------------------------|
| C1 | Membros ativos | KPI | `members.status_v2='active'` | "Qual o tamanho real da igreja?" |
| C2 | Novos no mês | KPI | `members.created_at` no mês | "Estamos crescendo?" |
| C3 | Visitantes | KPI | `members.status_v2='visitor'` | "Quantos visitantes em acompanhamento?" |
| C4 | Em processo | KPI | `members.status_v2='in_process'` | "Quantos a caminho da membresia/batismo?" |
| C5 | Resumo financeiro do mês | Bloco | `financial_transactions` no mês | "Como está o caixa este mês?" |
| C6 | Próximos eventos | Lista | `tenant_events` + `worship_events` | "O que vem aí na agenda?" |
| C7 | Escalas aguardando confirmação | Lista+contador | `worship_assignments.status='pending'` | "O que precisa de ação agora?" |
| C8 | Alertas de cuidado | KPI (placeholder) | Frente C (futuro) | "Alguma ovelha se afastando?" |
| C9 | Atalhos rápidos | Estático | — | "Ações de 1 clique." |

Estados: cada cartão trata **loading**, **vazio** (com CTA — ex.: "Cadastre seu primeiro membro") e **erro**.

---

## 5. Queries por cartão (fonte da verdade)

> Notação: `:tenant` = `tenant_id` do usuário logado; `:mstart` = `date_trunc('month', now() at time zone 'America/Sao_Paulo')`.

### C1 — Membros ativos
```sql
select count(*) from public.members
where tenant_id = :tenant and status_v2 = 'active';
```
supabase-js:
```ts
supabase.from("members").select("*", { count: "exact", head: true })
  .eq("tenant_id", tenantId).eq("status_v2", "active");
```

### C2 — Novos no mês
```sql
select count(*) from public.members
where tenant_id = :tenant and created_at >= :mstart;
```
`trendLabel = "+N este mês"`, `trendDir = N>0 ? "up" : "flat"`.

### C3 — Visitantes  /  C4 — Em processo
```sql
select count(*) from public.members
where tenant_id = :tenant and status_v2 = 'visitor';   -- C3
-- e 'in_process' para C4
```

### C5 — Resumo financeiro do mês
```sql
select
  coalesce(sum(amount) filter (where type = 'income'), 0)  as income,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as expense
from public.financial_transactions
where tenant_id = :tenant and date >= :mstart::date;
-- balance = income - expense (calculado na RPC)
```
> Visível só se o módulo Financeiro estiver ativo no tenant (`tenant_modules`/`tenant_feature_flags`). Se inativo, ocultar C5.

### C6 — Próximos eventos (próximos 5)
União de eventos gerais e de culto/louvor:
```sql
select id, title, event_date as starts_at, location, 'tenant_event' as source
  from public.tenant_events
  where tenant_id = :tenant and event_date >= now()
union all
select id, title, starts_at, location, 'worship_event' as source
  from public.worship_events
  where tenant_id = :tenant and starts_at >= now() and status = 'published'
order by starts_at asc
limit 5;
```

### C7 — Escalas aguardando confirmação (contador + próximas 5)
```sql
-- contador
select count(*) from public.worship_assignments wa
  join public.worship_events we on we.id = wa.event_id
  where wa.tenant_id = :tenant and wa.status = 'pending' and we.starts_at >= now();

-- itens (próximas 5)
select wa.id as assignment_id, we.id as event_id, we.title as event_title,
       we.starts_at, m.name as member_name, wa.role_name
  from public.worship_assignments wa
  join public.worship_events we on we.id = wa.event_id
  join public.members m on m.id = wa.member_id
  where wa.tenant_id = :tenant and wa.status = 'pending' and we.starts_at >= now()
  order by we.starts_at asc
  limit 5;
```
> Visível só se o módulo Louvor estiver ativo.

### C8 — Alertas de cuidado (placeholder)
Retorna `{ coldMembersCount: 0, enabled: false }` até a Frente C. O cartão renderiza um teaser ("Em breve: radar de cuidado pastoral") quando `enabled=false`.

### C9 — Atalhos rápidos
Estático no front: Novo membro · Novo evento · Comunicado geral · Nova escala. Exibir cada atalho só se o módulo correspondente estiver ativo e o papel tiver permissão.

---

## 6. RPC consolidada (recomendada para A2)

Assinatura proposta — devolve o JSON inteiro do painel em uma chamada:

```sql
create or replace function public.dashboard_admin_geral(p_tenant_id uuid)
returns jsonb
language plpgsql
security invoker            -- respeita RLS do usuário
set search_path = public
as $$
declare
  v_mstart timestamptz := date_trunc('month', now() at time zone 'America/Sao_Paulo');
  -- ... agrega C1..C7 e monta jsonb conforme o contrato da seção 3
begin
  -- (implementação na tarefa A2)
  return '{}'::jsonb;
end;
$$;
```
Front:
```ts
const { data } = await supabase.rpc("dashboard_admin_geral", { p_tenant_id: tenantId });
// data tipado como AdminGeralDashboard
```

**Decisões para A2:**
- `security invoker` para herdar a RLS do usuário (não vazar entre tenants).
- Validar no início que `auth.uid()` pertence a `p_tenant_id` com papel `owner/admin` (senão, `raise exception`).
- Respeitar módulos ativos: campos de Financeiro/Louvor vêm `null` quando o módulo está desativado, e o front oculta o cartão.

---

## 7. Checklist de saída da A1

- `[x]` Cartões do painel do Pastor definidos (C1–C9).
- `[x]` Contrato TypeScript (`AdminGeralDashboard`) fechado.
- `[x]` Query/fonte de cada KPI documentada e validada contra o schema real.
- `[x]` Estratégia de acesso definida (RPC consolidada `security invoker`).
- `[ ]` **Validar status_v2** e módulos ativos em um tenant real antes de implementar (passo inicial da A2).
- `[ ]` Revisão de Ricardo sobre quais cartões entram no MVP do painel.

---

## 8. Aberto para decisão

1. **MVP do painel:** entra tudo (C1–C9) ou começamos só com C1–C2, C5, C6, C7?
2. **Frequência/tendência:** vale um KPI de frequência de culto agora? Hoje não há tabela de presença de culto geral (só Kids e Escola Bíblica têm `attendance`). Pode ficar para a Frente C.
3. **Config de fuso por tenant:** assumir `America/Sao_Paulo` fixo por ora? (recomendo sim, com campo futuro em `tenants`.)
```
