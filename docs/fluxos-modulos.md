# Fluxos dos Módulos — SirvaOS (Documento Vivo)

> **Documento:** Catálogo de Fluxos por Módulo
> **Produto:** SirvaOS
> **Status:** Documento vivo — **DEVE ser atualizado sempre que um fluxo for criado ou alterado.**
> **Última atualização:** 2026-06-13
> **Para que serve:** fonte única para (1) entender qualquer fluxo de qualquer módulo, (2) gerar tutoriais de uso para clientes, (3) onboarding de novos desenvolvedores.

---

## Como usar e manter este documento

- Cada módulo descreve: **propósito**, **quem usa**, **onde inicia**, **passo a passo**, **integrações** (tabelas, Edge Functions, RLS, provedores externos), **onde termina** e **observações**.
- Sempre que criar/alterar um fluxo, **atualize a seção do módulo correspondente e a data no topo**.
- Convenção de origem→destino: cada fluxo deixa claro o **gatilho** (quem/o quê inicia) e o **resultado final** (estado persistido, mensagem enviada, etc.).

### Glossário rápido
- **Tenant** = igreja contratante (isolada por `tenant_id`).
- **Papéis:** `super_admin`/`operations` (Admin Global da plataforma) · `owner`/`admin` (admin da igreja) · **admin de módulo** (líder de um ministério, via `tenant_module_admins`) · `member` (membro).
- **Helpers de permissão (Postgres, `app_private.*`):** `current_tenant_id()`, `current_member_id()`, `is_global_admin()`, `is_tenant_admin()`, `can_manage_members()`, `can_manage_module(code)`, `can_read_worship()`, `is_module_enabled(code)`.
- **Provedores externos:** Resend (e-mail), Z-API (WhatsApp), Supabase Storage (arquivos/logos).

---

## 0. Base transversal (vale para todos os módulos)

**Multi-tenant + White-label**
- Toda tabela operacional tem `tenant_id`; o isolamento é garantido por **RLS** (Row Level Security) usando `app_private.current_tenant_id()`.
- A igreja personaliza logo/cores/nome (módulo Identidade) — aplicado no tema do app.

**Modularidade**
- Módulos são ativados por tenant em `tenant_modules` (status `active|inactive|suspended|configuring`).
- O menu lateral e as ações só aparecem quando `is_module_enabled(code)` é verdadeiro e o papel do usuário permite. Códigos: `members`, `events`, `announcements`, `social_media`, `worship`, `financial`, `intercession`, `kids`, `bible-school`.

**Auditoria**
- Ações sensíveis chamam `app_private.audit_log(...)` → `audit_logs`.

---

## 1. Provisionamento de Igreja (Onboarding)

**Propósito:** criar uma nova igreja (tenant) na plataforma e dar o primeiro acesso ao pastor/admin.

**Quem usa:** Admin Global (super_admin/operations).

**Onde inicia:** Painel **Admin Global** (`/admin-global`, página `AdminGlobalAccess.tsx`).

**Passo a passo:**
1. Admin Global cadastra a igreja → cria linha em `tenants` (status `em configuração`), define plano (`plans`) e módulos contratados (`tenant_modules`).
2. Provisiona o admin da igreja → Edge Function **`provision-tenant-admin`** cria o usuário (auth) + `profiles` com `tenant_id` e `tenant_role = owner`.
3. Gera token de primeiro acesso → `first_access_tokens`. O pastor recebe e-mail de boas-vindas (template em `docs/email-boas-vindas-cliente.html`).
4. Primeiro acesso → Edge Function **`first-access`** valida o token (`first_access_attempts`), ativa a conta e força troca de senha.
5. Trial: `tenants.trial_*` controla período de teste (migration `tenant_trial_30_days`).

**Integrações:** `tenants`, `plans`, `platform_modules`, `tenant_modules`, `profiles`, `first_access_tokens`, Edge Functions `provision-tenant-admin`, `first-access`, `create-global-admin`.

**Onde termina:** pastor logado no **Admin Cliente** da sua igreja, com módulos ativos visíveis.

---

## 2. Autenticação e Roteamento por papel

**Propósito:** levar cada usuário ao ambiente certo após o login.

**Onde inicia:** tela de login (Supabase Auth).

**Passo a passo (`src/lib/accessRouting.ts`):**
1. Login → busca `profiles` (`global_role`, `tenant_id`, `tenant_role`, `status`).
2. Se `status != active` → bloqueia.
3. Se `global_role` ∈ {super_admin, operations} → **/admin-global**.
4. Senão, se tem `tenant_id` → ambiente da igreja: **Admin Cliente** (`/admin-cliente`) para owner/admin/admin de módulo, **Portal do Membro** (`/membro`) para membro.
5. Sem `tenant_id` → erro (usuário sem igreja).

**Integrações:** `profiles`, Supabase Auth.

**Onde termina:** usuário no painel/portal correspondente ao seu papel.

---

## 3. Dashboards por papel — "Saúde da Igreja" / "Meu Ministério" / "Minha Jornada" *(Etapa 2 — NOVO)*

**Propósito:** cada papel abre o sistema e vê de imediato o que importa para ele.

**Quem usa / onde inicia:** ao entrar na aba **Visão geral** do Admin Cliente (ou no Portal do Membro).

**Fluxos:**

**3.1 Painel do Pastor/Admin Geral ("Saúde da Igreja")**
- Início: owner/admin abre "Visão geral".
- Front (`src/components/DashboardSaudeIgreja.tsx`) chama a RPC **`dashboard_admin_geral(tenant_id)`**.
- A RPC (security invoker, valida papel) devolve em 1 chamada: membros ativos, novos no mês, visitantes, em processo, resumo financeiro do mês (só se módulo `financial` ativo), próximos eventos (união `tenant_events` + `worship_events`), escalas pendentes de confirmação (só se `worship` ativo) e o teaser "Radar de Cuidado Pastoral" (placeholder Frente C).
- Fim: cartões renderizados; cada cartão tem ação/atalho.
- Contrato detalhado: `docs/roadmap-etapas.md (Apêndice A1)`.

**3.2 Painel do Líder de Módulo (Louvor) ("Meu Ministério")**
- Início: usuário que é **admin do módulo worship** (e não é admin do tenant) abre "Visão geral".
- Front (`DashboardMeuMinisterio.tsx`) → RPC **`dashboard_lider_louvor()`** (autoriza por `can_manage_module('worship')`).
- Mostra próximos eventos do louvor com confirmados/pendentes, total de pendências e integrantes escalados.

**3.3 Painel do Membro ("Minha Jornada")**
- Início: membro abre o Portal.
- RPC **`dashboard_membro()`** (usa `current_member_id`): minhas escalas, próximos eventos, comunicados e jornada (placeholder). Fonte consolidada reaproveitável pelo app mobile.

**Integrações:** RPCs `dashboard_admin_geral`, `dashboard_lider_louvor`, `dashboard_membro`; tabelas `members`, `financial_transactions`, `tenant_events`, `worship_events`, `worship_assignments`, `tenant_announcements`, `tenant_modules`.

**Onde termina:** painel inicial por papel renderizado.

---

## 4. Membresia

**Propósito:** registro central de todos os membros da igreja.

**Quem usa:** owner/admin e Secretaria (admin de módulo `members` ou cargo "Secretaria").

**Onde inicia:** aba **Membros** do Admin Cliente.

**Passo a passo:**
1. Cadastrar/editar membro → `members` (nome, contato, `status_v2` ∈ `active|inactive|visitor|in_process`, telefone, `whatsapp_opt_in`).
2. Vincular **cargos** (`member_roles` → catálogo `catalog_roles`) e **ministérios** (`member_ministries` → `catalog_ministries`, com flag `is_admin`). Marcar `is_admin` num ministério com módulo dá acesso admin àquele módulo.
3. Vincular **dependentes/família** (`families`, `family_members`).
4. Histórico (batismo, integração, disciplina) → `member_history`.
5. Conceder acesso admin de módulo → `tenant_module_admins`.

**Regras/RLS:** escrita exige `can_manage_members()` **e** `tenant_id = current_tenant_id()`. Um membro pode editar **o próprio** cadastro (policy `members_self_update`) — mas **não** vincular cargos.

**Integrações:** `members`, `member_roles`, `member_ministries`, `families`, `family_members`, `member_history`, `tenant_module_admins`, catálogos `catalog_roles`/`catalog_ministries`. Exportação CSV/PDF.

**Onde termina:** membro salvo e visível em listas, dashboards e demais módulos (escala, Kids, etc.).

---

## 5. Famílias

**Propósito:** agrupar membros e dependentes de uma mesma família.

**Onde inicia:** aba **Famílias** (ou pelo cadastro do membro).

**Passo a passo:** criar família (`families`) → vincular membros existentes ou dependentes avulsos (`family_members`, com `relationship` e `is_primary`).

**Integrações:** `families`, `family_members`, `members`. Alimenta o módulo Kids (responsáveis) e o Portal do Membro.

**Onde termina:** vínculos familiares disponíveis para Kids e relatórios.

---

## 6. Louvor / Escalas

**Propósito:** organizar eventos de culto/ensaio, montar escalas e obter confirmação dos músicos.

**Quem usa:** Líder do Louvor (admin do módulo `worship`) e owner/admin.

**Onde inicia:** aba **Louvor** do Admin Cliente.

**Passo a passo:**
1. Criar **evento** de louvor → `worship_events` (`event_type` service/rehearsal/meeting; `status` draft→published; `starts_at`, local).
2. Definir **funções** (`worship_roles`: vocal/instrumento/técnica/liderança).
3. **Adicionar escalados** → `worship_assignments` (member + função; `status` pending). Dados sensíveis de outros escalados ficam restritos (RLS `restrict_worship_assignment_visibility`).
4. (Opcional) **Repertório**: músicas do catálogo (`catalog_songs`) vinculadas ao evento (`worship_event_songs` / `tenant_event_songs`).
5. **Notificar a escala** (modal "Enviar escala"):
   - **E-mail:** cria campanha (`create_worship_email_campaign` → `worship_email_campaigns`/`_recipients`) e dispara Edge Function **`send-worship-assignment-emails`** (Resend).
   - **WhatsApp (NOVO):** botão **"Confirmar via WhatsApp"** (todos) ou **"WhatsApp"** por escalado → Edge Function **`send-whatsapp`** (context `worship_confirmation`). Mensagem com evento+função+data e link do portal.
6. **Membro confirma/recusa** no Portal do Membro → atualiza `worship_assignments.status` (confirmed/declined, com `responded_at`/`decline_reason`).
7. **Lembrete automático 24h antes (NOVO):** job `pg_cron` → Edge Function **`send-event-reminders`** envia WhatsApp aos escalados de cultos publicados nas próximas 24h e marca `worship_events.reminder_sent_at` (context `worship_reminder`).
8. Visualização em **lista** ou **calendário** mensal.

**Integrações:** `worship_events`, `worship_assignments`, `worship_roles`, `catalog_songs`, `worship_event_songs`, `tenant_event_songs`, `worship_email_campaigns(_recipients)`; Edge Functions `send-worship-assignment-emails`, `send-whatsapp`, `send-event-reminders`; RLS `can_read_worship`/`can_manage_module('worship')`; `whatsapp_messages` (log). Base reutilizada do antigo **ToNaEscala**.

**Onde termina:** escalados confirmados/recusados; histórico de participação por integrante; lembretes entregues.

---

## 7. Financeiro

**Propósito:** gestão de dízimos/ofertas, receitas e despesas.

**Quem usa:** Tesoureiro (admin do módulo `financial`) e owner/admin.

**Onde inicia:** aba **Financeiro**.

**Passo a passo:**
1. Definir **categorias** (`financial_categories`).
2. Lançar **transações** (`financial_transactions`: `type` income/expense, valor, `payment_method` cash/pix/transfer/card/check/other, data, categoria, opcionalmente `member_id` para dízimo identificado).
3. **Relatórios** por período (receitas, despesas, saldo, por categoria) → exportação CSV/PDF.
4. Saldo do mês alimenta o **Painel do Pastor** (cartão Financeiro).

**Integrações:** `financial_categories`, `financial_transactions`, `members` (dízimo identificado), dashboard.

**Onde termina:** relatório financeiro do período + saldo no painel. O **membro vê as próprias contribuições** no Portal (aba "Minhas Contribuições") via RPC `my_financial_contributions()` (security definer, só as do próprio `member_id`), com modal de comprovante imprimível (P1).

---

## 8. Kids / Infantil

**Propósito:** gestão do ministério infantil com segurança (check-in por QR) e comunicação com os pais.

**Quem usa:** Coordenação Kids (admin do módulo `kids`); pais (responsáveis) no Portal.

**Onde inicia:** aba **Kids**.

**Passo a passo:**
1. **Turmas** por faixa etária (`kids_groups`).
2. **Crianças** (`kids_children`) e **responsáveis** (`kids_guardians`: `phone` próprio e/ou `member_id` vinculado, `is_primary`).
3. **Check-in por QR (segurança):**
   - Gera passe → RPC **`create_kids_checkin_pass`** (`kids_checkin_passes`, token curto).
   - No culto, leitura → RPC **`consume_kids_checkin_pass`** registra presença (`kids_attendance`).
   - Pais veem seus filhos via **`get_my_kids_children`**.
4. **Atividades/calendário** (`kids_activities`).
5. **Comunicado aos pais** (modal "Novo comunicado"): registra em `kids_communications` (canal `sent_via`: system/whatsapp/email/both); dependendo do canal:
   - **WhatsApp** → Edge Function **`send-whatsapp`** (context `kids_communication`), telefone do responsável (`kids_guardians.phone` → senão do **membro vinculado**).
   - **E-mail** → Edge Function **`send-kids-communication-emails`** (Resend), e-mail do membro vinculado ao responsável (P2).

**Integrações:** `kids_groups`, `kids_children`, `kids_guardians`, `kids_attendance`, `kids_activities`, `kids_communications`, `kids_checkin_passes`; RPCs `create_kids_checkin_pass`/`consume_kids_checkin_pass`/`get_my_kids_children`; Edge Function `send-whatsapp`; `whatsapp_messages`.

**Onde termina:** presença registrada com segurança; pais notificados.

---

## 9. Escola Bíblica

**Propósito:** gestão de turmas, professores, frequência, materiais e notas da EBD.

**Quem usa:** Coordenação da Escola Bíblica (admin do módulo `bible-school`); alunos no Portal.

**Onde inicia:** aba **Escola Bíblica**.

**Passo a passo:**
1. **Turmas** (`bible_school_classes`, com status ativo/encerrada) e **professores** (`bible_school_teachers`, `bible_school_class_teachers`).
2. **Alunos** (`bible_school_students`) e **matrículas** (`bible_school_enrollments`).
3. **Aulas/sessões** (`bible_school_sessions`) e **frequência** (`bible_school_attendance`).
4. **Materiais** (`bible_school_materials`, arquivos no Storage) e **notas** (`bible_school_grades`).
5. Portal do Membro só libera EBD se houver matrícula em **turma ativa** (pendência P4 resolvida).

**Integrações:** tabelas `bible_school_*`, Supabase Storage (materiais), Portal do Membro. Exportação de frequência (CSV/PDF).

**Onde termina:** frequência/notas registradas; materiais disponíveis ao aluno.

---

## 10. Eventos (gerais da igreja)

**Propósito:** calendário central de eventos da igreja (fora as escalas de louvor).

**Onde inicia:** aba **Eventos**.

**Passo a passo:**
1. Criar evento → `tenant_events` (título, descrição rica, local, `event_date`, banner no Storage).
2. **Notificar membros** (modal): Edge Function **`send-event-emails`** (Resend) e/ou push (`send-push`). Log em `event_notifications_log`.
3. Eventos futuros aparecem no Painel do Pastor e no Portal do Membro.

**Integrações:** `tenant_events`, Storage (banners), Edge Functions `send-event-emails`, `send-push`, `event_notifications_log`. *(B6 hoje cobre lembrete de louvor; `tenant_events.reminder_sent_at` já existe para estender lembrete a eventos gerais.)*

**Onde termina:** evento publicado e divulgado.

---

## 11. Comunicados

**Propósito:** mensagens gerais da liderança para a comunidade.

**Onde inicia:** aba **Comunicados**.

**Passo a passo:**
1. Criar comunicado → `tenant_announcements` (título, mensagem, `message_html`, `published_at`).
2. **Notificar membros** (modal "Notificar"):
   - **E-mail:** Edge Function **`send-announcement-emails`** (Resend).
   - **WhatsApp (NOVO):** "Enviar automático" → Edge Function **`send-whatsapp`** (context `announcement`) para membros ativos com `whatsapp_opt_in` + telefone; ou "Abrir manual" (`wa.me`).
   - **Push:** "em breve".
   - Log em `announcement_notifications_log` (channel email/whatsapp) e em `whatsapp_messages`.

**Integrações:** `tenant_announcements`, Edge Functions `send-announcement-emails`, `send-whatsapp`, `announcement_notifications_log`, `whatsapp_messages`.

**Onde termina:** comunicado publicado e entregue nos canais escolhidos.

---

## 12. Intercessão / Oração

**Propósito:** receber pedidos de oração e distribuí-los aos intercessores.

**Onde inicia:** Portal do Membro (pedido) e aba **Intercessão** (gestão).

**Passo a passo:**
1. Membro envia pedido → `prayer_requests` (status aberto).
2. Coordenação distribui aos intercessores → `prayer_assignments`.
3. Trigger **`app_private.prayer_assignments_sync_request_status`** / **`recompute_prayer_request_status`** mantém o status do pedido sincronizado conforme as atribuições são tratadas.
4. O solicitante acompanha o próprio pedido (RLS por `member_id`).

**Integrações:** `prayer_requests`, `prayer_assignments`, triggers de sincronização de status.

**Onde termina:** pedido atendido/orado, status atualizado automaticamente.

---

## 13. Mídias Sociais

**Propósito:** centralizar canais e conteúdos da igreja em **múltiplas plataformas** (YouTube, Instagram, Spotify).

**Onde inicia:** aba **Mídias Sociais**.

**Passo a passo:** ao cadastrar um canal, a URL é analisada por `detectSocialChannel` que identifica a **plataforma** e o tipo (`platform` ∈ youtube/instagram/spotify; `channel_type` ∈ channel/playlist/profile/post/embed). Render por plataforma no Portal:
- **YouTube** → Edge Function **`fetch-youtube-feed`** busca os vídeos recentes; abre em modal.
- **Spotify** → embed oficial (`iframe open.spotify.com/embed/{tipo}/{id}`).
- **Instagram** → link direto para o perfil/post (embed oficial exige token da Meta — evolução futura, P7).

**Integrações:** `social_media_channels` (constraints estendidos para 3 plataformas), Edge Function `fetch-youtube-feed`.

**Onde termina:** conteúdo das redes da igreja disponível aos membros no Portal/app.

---

## 14. WhatsApp (transversal) *(Etapa 2 — NOVO)*

**Propósito:** canal de mensageria via **Z-API** usado por vários módulos (comunicados, escala, Kids, lembretes).

**Onde inicia:** acionado por outros módulos (envio) ou pela Z-API (callbacks de status).

**Fluxos:**

**14.1 Envio (server-side)**
- Gatilho: botões nos módulos → `src/lib/whatsappService.ts` (`sendWhatsapp`) → Edge Function **`send-whatsapp`**.
- A função autoriza (owner/admin do tenant **ou** admin de módulo), normaliza telefone BR (+55), chama o endpoint `send-text` da Z-API (header `Client-Token`), e registra cada envio em **`whatsapp_messages`** (status sent/failed, `provider_message_id`, contexto).
- Secrets (Supabase): `ZAPI_URL`, `ZAPI_CLIENT_TOKEN`.

**14.2 Lembrete agendado** — ver Louvor §6.7 (`send-event-reminders` + `pg_cron`).

**14.3 Status de entrega (webhook)**
- Gatilho: Z-API chama a Edge Function **`whatsapp-webhook`** (pública).
- Trata `MessageStatusCallback` (SENT/RECEIVED/READ) e `DeliveryCallback` (com `error` em falha) → atualiza `whatsapp_messages.delivery_status`/`delivered_at`/`read_at`/`error` por `provider_message_id`.
- **Config necessária:** no painel Z-API, apontar "Ao enviar" e "Status da mensagem" para `…/functions/v1/whatsapp-webhook`.

**14.4 Painel de logs (B8)** — aba **WhatsApp** (só admin) → `WhatsappLogs.tsx`/`whatsappLogs.ts` lê `whatsapp_messages` com filtros e status de entrega.

**Consentimento (LGPD):** `members.whatsapp_opt_in` (default true, permite opt-out).

**Integrações:** `whatsapp_messages`, Edge Functions `send-whatsapp`, `whatsapp-webhook`, `send-event-reminders`; provedor Z-API; `pg_cron`/`pg_net`.

**Onde termina:** mensagem entregue/lida com status visível no painel.

---

## 15. Identidade Visual / White-label

**Propósito:** cada igreja com sua marca.

**Onde inicia:** aba **Identidade** (admin do tenant).

**Passo a passo:** upload de logo (Storage `tenant-logos`), cores (primária/secundária/destaque), nome público, favicon → tema aplicado por tenant (`tenant_theme_extended`).

**Integrações:** `tenants` (campos de tema), Storage `tenant-logos`.

**Onde termina:** app exibido com a marca da igreja.

---

## 16. Usuários e Permissões

**Propósito:** gerenciar quem acessa e com qual papel.

**Onde inicia:** aba **Usuários** (só owner/admin).

**Passo a passo:** convidar/gerenciar usuários (`profiles`), definir `tenant_role`, conceder admin de módulo (`tenant_module_admins`). RBAC com escopo por tenant.

**Integrações:** `profiles`, `tenant_module_admins`, catálogos de cargos/ministérios.

**Onde termina:** usuário com acesso correto ao seu escopo.

---

## 17. Política & LGPD

**Propósito:** termos, consentimentos e conformidade.

**Onde inicia:** aba **Política & LGPD** e aceites no primeiro acesso/portal.

**Passo a passo:** políticas do sistema (`system_policies`) e do tenant (`tenant_policies`); aceite do usuário (`user_policy_acceptances`); consentimentos (`lgpd_consents`), incluindo opt-in de WhatsApp; registro de erros (`app_error_logs`).

**Integrações:** `system_policies`, `tenant_policies`, `user_policy_acceptances`, `lgpd_consents`.

**Onde termina:** consentimentos registrados; conformidade auditável.

---

## 18. Cuidado Pastoral *(Frente C — NOVO)*

**Propósito:** transformar dados em ação de cuidado — detectar membros que estão se afastando e gerar tarefas para a liderança agir (com 1 clique no WhatsApp).

**Quem usa:** owner/admin (radar + gestão de tarefas) e **líderes designados** (veem/resolvem suas tarefas no Portal).

**Onde inicia:** aba **Cuidado** do Admin Cliente (e card "Radar de Cuidado Pastoral" no painel do Pastor).

**Passo a passo:**
1. **Radar (score de engajamento):** RPC **`member_care_radar(tenant_id, weeks=4)`** cruza sinais de participação de cada membro ativo: último culto servido (Louvor `confirmed`), última presença na EBD (`present`), última vez que trouxe o filho (Kids), último pedido de oração (Intercessão) e último marco (`member_history`).
   - **last_activity** = data do sinal mais recente; **score 0–100** = recência (0–60) + amplitude de canais nos últimos 90 dias (0–40); faixa 🟢≥60 / 🟡30–59 / 🔴<30.
   - **Afastado** = membro ativo sem nenhum sinal há mais de N semanas (padrão 4). Recém-cadastrados não entram.
2. **Tarefa de cuidado:** o admin cria uma `care_tasks` para o membro afastado e **designa um responsável** (líder/diácono).
3. **Ação:** botão **WhatsApp** abre conversa com mensagem de cuidado pronta (`wa.me`, toque pessoal). O responsável marca **em andamento → concluída**.
4. **Visão do líder:** o responsável vê "Tarefas de cuidado" no **Portal do Membro** (RLS entrega só as designadas a ele) e resolve por lá.
5. O **painel do Pastor** mostra o número real de afastados, linkando para a aba Cuidado.

**Integrações:** RPC `member_care_radar`; tabela `care_tasks` (RLS: admin gerencia, designado vê/atualiza a sua); sinais de `worship_assignments`/`worship_events`, `bible_school_attendance`, `kids_attendance`/`kids_guardians`, `prayer_requests`, `member_history`; WhatsApp (`wa.me`).

**Onde termina:** membro contatado, tarefa concluída; menos "ovelhas" se perdem.

> **Limitação atual:** não há registro de presença em **culto geral** — o score mede os 5 canais acima. Um check-in de culto (futuro) tornaria o radar muito mais preciso.

---

## Apêndice — Edge Functions (resumo)

| Função | Papel no fluxo |
|---|---|
| `provision-tenant-admin` | Cria admin da igreja no onboarding |
| `first-access` | Valida token e ativa primeiro acesso |
| `create-global-admin` | Cria admin global da plataforma |
| `send-announcement-emails` | E-mail de comunicados (Resend) |
| `send-event-emails` | E-mail de eventos (Resend) |
| `send-worship-assignment-emails` | E-mail de escala do louvor (Resend) |
| `send-push` | Notificação push |
| `fetch-youtube-feed` | Importa vídeos do YouTube |
| `send-whatsapp` | Envio WhatsApp (Z-API) — comunicados, escala, Kids |
| `whatsapp-webhook` | Recebe status de entrega da Z-API |
| `send-event-reminders` | Lembrete 24h (cron) da escala de louvor |
| `send-kids-communication-emails` | E-mail de comunicado do Kids (Resend) |

## Apêndice — Histórico de atualizações deste documento

| Data | O que mudou |
|------|-------------|
| 2026-06-13 | Criação. Mapeados todos os módulos atuais + novidades da Etapa 2 (dashboards por papel e integração WhatsApp/Z-API: envio, webhook de status, lembrete 24h, painel de logs). |
| 2026-06-13 | Pendências P1/P2/P7 concluídas: comprovantes financeiros no Portal do Membro (Financeiro), e-mail de comunicado do Kids (Kids), e Mídias Sociais multi-plataforma (YouTube/Instagram/Spotify). |
| 2026-06-13 | **Frente C — Cuidado Pastoral** entregue (MVP): radar de afastamento (RPC `member_care_radar`), tabela `care_tasks`, aba Cuidado no admin, tarefas do líder no portal, e card real no painel do Pastor. Nova seção 18. |
