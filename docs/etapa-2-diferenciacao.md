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
- `[x]` A2 — RPC `dashboard_admin_geral` **aplicada no Supabase** (projeto `gaqkjsnomkdaghvwerlb`) e validada contra dados reais. Camada de dados `src/data/dashboardAdminGeral.ts` e componente `src/components/DashboardSaudeIgreja.tsx` criados e plugados no topo da aba "Visão geral" do `ClientAdmin` (só para owner/admin). Arquivos novos passam no typecheck.
  - ⚠️ **Bloqueio pré-existente (não relacionado):** o working tree tem arquivos truncados/corrompidos — `src/pages/ClientAdmin.tsx` termina cortado (~317 linhas a menos que o HEAD do git) e `src/lib/accessRouting.ts` está incompleto. Isso impede o build do projeto inteiro. Precisa ser resolvido por Ricardo (restaurar do git ou recuperar o save) antes de testar a tela.
- `[ ]` A3 — Resolver o "papel efetivo" do usuário logado + módulos ativos do tenant.
- `[ ]` A4 — Painel **Pastor/Admin Geral** (KPIs + financeiro + eventos + atalhos).
- `[ ]` A5 — Painel **Líder de Módulo** (escopo do ministério).
- `[ ]` A6 — Painel **Membro** no portal/app (escalas + eventos + jornada placeholder).
- `[ ]` A7 — Estados vazios com CTA ("cadastre seu primeiro membro").
- `[ ]` A8 — Revisão de UX/cópia e teste com dados reais de um tenant.

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
- `[ ]` B1 — Spike: comparar provedores (custo, templates, two-way, LGPD) e decidir.
- `[ ]` B2 — Campo de telefone + consentimento WhatsApp no cadastro de membros/responsáveis.
- `[ ]` B3 — Fase 1: botões `wa.me` em comunicados e escalas (entrega rápida).
- `[ ]` B4 — Edge Function `send-whatsapp` genérica + fila/registro de envios.
- `[ ]` B5 — Template + automação de **confirmação de escala**.
- `[ ]` B6 — Template + **lembrete 24h** (job agendado).
- `[ ]` B7 — Webhook de recebimento (two-way) atualizando status da escala.
- `[ ]` B8 — Painel de logs de mensagens (entregue/lido/respondido) por tenant.

### 3.6 Métrica de sucesso
Taxa de confirmação de escala ↑ · tempo médio até confirmação ↓ · % de comunicados lidos ↑.

### 3.7 Log de decisões
- 2026-06-12 — Frente priorizada como item 2 da Etapa 2. Estratégia incremental: começar pelo `wa.me` (Fase 1) enquanto se decide o provedor da Fase 2.

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
