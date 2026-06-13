# Etapa 2 — Diferenciação e Alavancagem do SirvaOS

> **Documento:** Plano de Melhorias — Etapa 2 (vivo, atualizado continuamente)
> **Produto:** SirvaOS
> **Versão:** 0.1
> **Data de criação:** 2026-06-12
> **Status:** Em construção
> **Base:** [estudo-competitivo-sirvaos.html](../estudo-competitivo-sirvaos.html)

---

## 0. Como usar este documento

Este é um documento **vivo**. Cada frente de trabalho tem um bloco próprio com escopo, decisões, tarefas e status. Atualizamos aqui à medida que avançamos. Convenção de status das tarefas:

- `[ ]` pendente · `[~]` em andamento · `[x]` concluído · `[!]` bloqueado

**Ordem de ataque desta etapa (definida com Ricardo):**

1. 🟢 **Dashboard por papel** — em andamento
2. 🟢 **WhatsApp-first** — em andamento
3. ⚪ Cuidado Pastoral inteligente — próximo
4. ⚪ Copiloto de IA da liderança — backlog
5. ⚪ Jornada do Membro / discipulado — backlog
6. ⚪ Escala inteligente — backlog
7. ⚪ Gateway de doação + campanhas com meta — backlog

---

## 1. Tese da Etapa 2

> Parar de "parecer mais um app de igreja" e assumir a identidade de **"o sistema operacional da igreja"** — a camada de gestão inteligente que **libera a liderança para pastorear pessoas, não planilhas**.

Os dois primeiros golpes foram escolhidos por serem **alto impacto e baixo custo relativo**, aproveitando o que o SirvaOS já tem:

- **Dashboard por papel** traduz visualmente o diferencial (cada usuário vê o que importa para ele) e ataca direto o feedback "está muito padrão".
- **WhatsApp-first** entrega o maior ganho de engajamento real no menor esforço, no canal que o brasileiro realmente abre — e já estava previsto no roadmap original.

---

## 2. Frente A — Dashboard por papel `[~]`

### 2.1 Problema
Hoje o SirvaOS tende a mostrar telas/menus genéricos. Um sistema "padrão" joga dados na tela; um sistema referência mostra **a próxima ação certa** para cada perfil. Pastor, líder de ministério e membro têm necessidades completamente diferentes ao abrir o sistema.

### 2.2 Objetivo
Ao logar, cada usuário cai em um **painel inicial desenhado para o seu papel**, respondendo em 1 tela: *"o que está acontecendo e o que eu faço agora?"*.

### 2.3 Escopo por perfil

**Admin Geral / Pastor — "Saúde da Igreja"**
- Cartões de topo (KPIs): membros ativos, novos no mês, visitantes, frequência tendência, saldo financeiro do mês.
- Alertas de cuidado (preparando terreno para a Frente C): nº de membros "esfriando".
- Resumo financeiro do mês (receitas x despesas) com link para o módulo.
- Próximos eventos da igreja e escalas que ainda precisam de confirmação.
- Atalhos rápidos: novo membro, novo evento, comunicado geral.

**Admin de Módulo / Líder de Ministério — "Meu Ministério"**
- Escopo restrito ao(s) módulo(s) que administra.
- Próximos eventos/escalas do ministério e pendências de confirmação.
- Integrantes do ministério e status (ativos, faltantes).
- Atalho: criar evento/escala, enviar comunicado ao time.

**Membro — "Minha Jornada"** (no app/portal)
- Minhas próximas escalas (com confirmar/recusar).
- Meus eventos e comunicados.
- Minhas contribuições / comprovantes (quando liberado).
- Minha trilha/jornada (placeholder para a Frente E).

### 2.4 Decisões de design
- Mobile-first; visual humano e caloroso (pessoas, não tabelas frias).
- Reaproveitar o design-system existente (`src/design-system`).
- Renderização condicional pelo papel via RBAC já existente (Admin Global, Admin tenant, Admin de módulo, Membro) + módulos ativos do tenant.
- Cada cartão é "burro" e plugável: consome um hook/endpoint próprio para evoluir sem reescrever o painel.

### 2.5 Tarefas
- `[x]` A1 — Definir a estrutura de dados de cada cartão (contratos/queries por KPI). → spec em [etapa-2-A1-dashboard-pastor-contratos.md](./etapa-2-A1-dashboard-pastor-contratos.md). **Decisão:** 9 cartões no MVP; fuso `America/Sao_Paulo` fixo (config por tenant no futuro).
- `[x]` A2 — RPC `dashboard_admin_geral` **aplicada no Supabase** (projeto `gaqkjsnomkdaghvwerlb`) e validada contra dados reais. Camada de dados `src/data/dashboardAdminGeral.ts` e componente `src/components/DashboardSaudeIgreja.tsx` criados e plugados no topo da aba "Visão geral" do `ClientAdmin` (só para owner/admin). Mudanças commitadas por Ricardo.
  - Nota: o "truncamento" detectado num typecheck inicial era uma cópia defasada do shell sandbox — o arquivo real está íntegro. Recomendado rodar `npm run build`/`tsc` localmente para confirmação final.
- `[x]` A3 — Papel efetivo resolvido no client (owner/admin via `tenant_role`; líder de louvor via mapas `moduleAdminModuleIdsBy*` + módulo `worship`) e nas RPCs (helpers `app_private.current_tenant_id/current_member_id/can_manage_module`). Módulos ativos checados por `tenant_modules.status='active'`.
- `[x]` A4 — Painel **Pastor/Admin Geral** — `DashboardSaudeIgreja` (RPC `dashboard_admin_geral`). **Correção:** código do módulo financeiro era `financial` (não `finance`) — RPC corrigida e reaplicada.
- `[x]` A5 — Painel **Líder de Módulo (Louvor)** — `DashboardMeuMinisterio` + RPC `dashboard_lider_louvor` (migration `20260612130000`). Mostra próximos eventos com confirmados/pendentes, total de pendências e integrantes. Plugado no `ClientAdmin` para líder de louvor que não é admin do tenant.
- `[x]` A6 — Painel **Membro** — RPC `dashboard_membro` + `DashboardMinhaJornada` (escalas, eventos, comunicados, jornada placeholder). O portal web já tinha home rica, então no web foi adicionado só o gancho "Minha Jornada"; a RPC/componente servem de fonte consolidada (inclusive para o app mobile).
- `[ ]` A7 — Estados vazios com CTA ("cadastre seu primeiro membro"). *(parcial: componentes já tratam vazio/erro/loading)*
- `[ ]` A8 — Revisão de UX/cópia e teste com dados reais de um tenant. *(pendente: `npm run build` local + smoke test logado em cada papel)*

### 2.6 Métrica de sucesso
Tempo até a primeira ação após login ↓ · % de usuários que executam uma ação a partir do dashboard ↑.

### 2.7 Log de decisões
- 2026-06-12 — Frente priorizada como item 1 da Etapa 2.

---

## 3. Frente B — WhatsApp-first `[~]`

### 3.1 Problema
Notificações push de app têm baixíssima abertura. Líderes empurram avisos que ninguém vê. O canal que o brasileiro realmente abre é o **WhatsApp** — e nenhum concorrente direto o usa de forma nativa e automatizada.

### 3.2 Objetivo
Tornar o WhatsApp o canal principal de **escalas, lembretes, confirmações e comunicados**, com automações que rodam sozinhas.

### 3.3 Escopo (incremental)

**Fase 1 — Saída assistida (rápida, sem API oficial)**
- Gerar link `wa.me` pré-preenchido para comunicados/escala (modelo já usado no Kids).
- Botão "Enviar por WhatsApp" nos comunicados e na escala.

**Fase 2 — Envio automatizado (API oficial / provedor)**
- Confirmação de escala: mensagem com botões responder *Confirmo / Não posso*.
- Lembrete automático 24h antes do evento/escala.
- Comunicados gerais e do Kids para responsáveis.
- Comprovante de doação (quando o gateway existir).

**Fase 3 — Two-way**
- Resposta do membro no WhatsApp atualiza o status da escala no sistema.

### 3.4 Decisões técnicas (a definir)
- `[ ]` Escolher provedor: API oficial do WhatsApp Cloud (Meta) vs. provedor BR (ex.: Z-API, Twilio, gateway nacional). Avaliar custo por mensagem, aprovação de templates e two-way.
- Mensagens transacionais exigem **templates aprovados** — mapear os templates necessários (confirmação de escala, lembrete, comunicado, comprovante).
- Opt-in/opt-out por membro (LGPD): campo de consentimento no cadastro.
- Edge Function de envio (mesmo padrão das funções de e-mail/Resend já existentes).
- Número da igreja vs. número da plataforma (decisão de white-label).

### 3.5 Tarefas
- `[x]` B1 — Provedor decidido: **Z-API** (instância já criada por Ricardo). Endpoint `send-text`, header `Client-Token`, body `{phone, message}`.
- `[x]` B2 — Consentimento `members.whatsapp_opt_in` (default true, opt-out) — migration `20260612140000`. *(Falta expor toggle na tela de cadastro.)*
- `[x]` B3 — `wa.me` (`src/lib/whatsappService.ts`) **e envio automático real** no modal "Notificar membros" dos comunicados (`ClientAdmin`): botão **"Enviar automático"** dispara via Edge Function para membros ativos com `whatsapp_opt_in` + telefone; **"Abrir manual"** mantém o `wa.me`. Registra em `announcement_notifications_log` (channel `whatsapp`).
- `[x]` B4 — Edge Function `send-whatsapp` **criada e deployada** (Supabase, v1 ACTIVE) + tabela `whatsapp_messages` para registro. Autoriza owner/admin do tenant; normaliza telefone BR; loga sent/failed. **Pendente:** setar segredos `ZAPI_URL` e `ZAPI_CLIENT_TOKEN` no Supabase.
- `[x]` B5 — **Confirmação de escala por WhatsApp**: no modal "Enviar escala" do Louvor (`ClientAdmin`), botão **"Confirmar via WhatsApp"** envia a cada escalado com telefone uma mensagem com evento + função + data e link do portal para confirmar (`send-whatsapp`, context `worship_confirmation`). Mostra contagem "Com WhatsApp" e feedback de enviados/falhos. *(Resposta two-way — confirmar respondendo no WhatsApp — fica para a evolução do B7.)*
- `[x]` B6 — **Lembrete 24h automático**: Edge Function `send-event-reminders` (verify_jwt=false, protegida por token de cron) + job `pg_cron` `whatsapp-worship-reminders` (de hora em hora) via `pg_net`. Busca cultos publicados nas próximas 24h sem lembrete, envia aos escalados (context `worship_reminder`) e marca `worship_events.reminder_sent_at`. Migration `20260612160000`. Testado: 200 OK (0 eventos na janela). ⚠️ Token do cron é fallback no código — mover para o secret `CRON_SECRET`.
- `[~]` B7 — **Webhook de status** `whatsapp-webhook` criado e deployado (verify_jwt=false). Recebe `MessageStatusCallback` (SENT/RECEIVED/READ) e `DeliveryCallback` (com `error` em falha) e atualiza `whatsapp_messages.delivery_status`/`delivered_at`/`read_at`/`error` (migration `20260612150000`). **Falta:** configurar as URLs no painel Z-API. *(Two-way de resposta de escala fica para depois.)*
- `[x]` B8 — **Painel de logs**: aba "WhatsApp" no `ClientAdmin` (só admin) — `src/components/WhatsappLogs.tsx` + `src/data/whatsappLogs.ts`. Totais, filtros (status/tipo) e tabela com status de entrega (usa `delivery_status` quando o webhook B7 estiver ativo).

### 3.6 Métrica de sucesso
Taxa de confirmação de escala ↑ · tempo médio até confirmação ↓ · % de comunicados lidos ↑.

### 3.7 Log de decisões
- 2026-06-12 — Frente priorizada como item 2 da Etapa 2. Estratégia incremental: começar pelo `wa.me` (Fase 1) enquanto se decide o provedor da Fase 2.
- 2026-06-12 — Provedor: **Z-API**. Credenciais da instância em `.env.local` (`ZAPI_URL`). B1–B4 entregues; Edge Function deployada. Falta setar segredos no Supabase e obter o **Client-Token** (token de segurança da conta) se ativado no painel.
- 2026-06-12 — `ZAPI_CLIENT_TOKEN` obtido; segredos `ZAPI_URL`/`ZAPI_CLIENT_TOKEN` cadastrados no Supabase (pelo painel). Botão de envio automático ligado nos comunicados (B3) para teste real. Sandbox sem rede externa — teste deve rodar pela Edge Function via app.
- 2026-06-12 — Diagnóstico do 403 ao vincular cargos: **não é bug** — usuário logado era nível "membro"; RLS correto (cargos exigem admin). Para gerenciar/enviar é preciso owner/admin.
- 2026-06-12 — **Comunicado do Kids agora envia WhatsApp de verdade** (resolve pendência P2): `handleKidsCommunicationSubmit` chama `send-whatsapp`, resolvendo o telefone do responsável (`kids_guardians.phone` ou membro vinculado). Edge Function `send-whatsapp` v3: autorização ampliada para **admins de módulo** (não só owner/admin).
- 2026-06-12 — B5 entregue: confirmação de escala do Louvor por WhatsApp (botão no modal de envio da escala), reaproveitando `send-whatsapp` (context `worship_confirmation`). Botões por escalado também passaram a enviar via API (antes eram `wa.me`).
- 2026-06-12 — B8 entregue: aba "WhatsApp" com painel de logs (`whatsapp_messages`). B6 entregue: lembrete 24h via `send-event-reminders` + `pg_cron` (hora em hora). Descoberto que a service key injetada é o novo formato `sb_secret_…` (≠ JWT do `.env.local`); por isso o cron usa um token próprio (`CRON_SECRET`/fallback no código).
- 2026-06-12 — Teste do Kids: Z-API retornou `sent` + `messageId`, mas não entregou. Constatado que `sent` = aceito/enfileirado, não entregue. Construído webhook de status (B7) para capturar entrega real e motivo de falha. **Configurar URLs no painel Z-API:** `https://gaqkjsnomkdaghvwerlb.supabase.co/functions/v1/whatsapp-webhook` (em "Ao enviar" e "Status da mensagem"). Hipótese a checar: envio para o **mesmo número** conectado à instância (envio para si mesmo).

### 3.8 Como configurar os segredos da Z-API (necessário para envio real)

Os segredos **não** ficam no `.env.local` (o frontend não envia WhatsApp; quem envia é a Edge Function). Setar no Supabase:

```
supabase secrets set ZAPI_URL="https://api.z-api.io/instances/<ID>/token/<TOKEN>/send-text"
supabase secrets set ZAPI_CLIENT_TOKEN="<token de seguranca da conta>"
```

- `ZAPI_URL` = a mesma URL `send-text` do `.env.local`.
- `ZAPI_CLIENT_TOKEN` = "Token de segurança da conta" no painel Z-API (menu Segurança). Se a opção estiver desativada, o `Client-Token` não é exigido — mas é **recomendado ativar**.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` já são injetados automaticamente nas Edge Functions.

---

## 4. Backlog priorizado (próximas frentes)

| # | Frente | Por que importa | Pré-requisito |
|---|--------|-----------------|----------------|
| C | Cuidado Pastoral inteligente | Score de engajamento + alerta de quem "esfriou" + tarefa de cuidado. Diferencial nº1. | Dados de frequência/escala consolidados |
| D | Copiloto de IA da liderança | Perguntas em linguagem natural + geração de escala/relatório/devocional. Espaço 100% em branco. | Modelo de dados maduro |
| E | Jornada do Membro / discipulado | Membresia plana → funil espiritual com etapas. | Membresia estável |
| F | Escala inteligente | Auto-sugestão equilibrando frequência/conflitos. Aproveita motor ToNaEscala. | Módulo Louvor consolidado |
| G | Gateway de doação + campanhas com meta | Fecha a maior lacuna vs. concorrentes; taxa < 3,78% da líder. | Decisão de gateway/PSP |

---

## 5. Pendências herdadas (Etapa 1) que apoiam a Etapa 2

- `[ ]` Comprovantes financeiros no Portal do Membro (alimenta o painel do Membro).
- `[ ]` Comunicado do Kids por e-mail/WhatsApp (alimenta a Frente B).

---

## 6. Histórico de atualizações

| Data | Atualização |
|------|-------------|
| 2026-06-12 | Criação do documento. Frentes A (dashboard por papel) e B (WhatsApp-first) abertas e detalhadas. |
| 2026-06-12 | A1 iniciada: contratos e queries do painel do Pastor/Admin Geral especificados a partir do schema real (doc próprio). |
| 2026-06-12 | A1 concluída (9 cartões, fuso SP fixo). A2 iniciada: RPC `dashboard_admin_geral` (migration) + `src/data/dashboardAdminGeral.ts` criados. Falta aplicar a migration e montar a UI. |
| 2026-06-12 | A2 concluída: RPC aplicada e validada no Supabase; componente `DashboardSaudeIgreja` criado e plugado no `ClientAdmin`. Detectado bloqueio pré-existente: `ClientAdmin.tsx` e `accessRouting.ts` truncados no working tree (impede build) — pendente Ricardo. |
| 2026-06-12 | Falso alarme do truncamento esclarecido (cópia defasada do sandbox; arquivo real íntegro). Corrigido código do módulo financeiro (`finance`→`financial`) na RPC da A2. A4/A5/A6 concluídas: RPCs `dashboard_lider_louvor` e `dashboard_membro` aplicadas; componentes `DashboardMeuMinisterio` e `DashboardMinhaJornada` criados; gating por papel no `ClientAdmin` e gancho "Minha Jornada" no portal. Arquivos novos passam no typecheck. |
