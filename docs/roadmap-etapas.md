# Roadmap de Desenvolvimento SirvaOS

Este documento é a memória oficial de etapas do projeto. A implementação deve seguir esta ordem, salvo decisão explícita em contrário.

## Etapa 1 - Fundação do Projeto

Objetivo: criar a base visual, documental e técnica inicial.

- Nome, marca e identidade SirvaOS.
- Documentação inicial do produto.
- SPEC do projeto.
- Design system inicial.
- Monorepo/base React.
- Tela inicial e login.

## Etapa 2 - Admin Global SirvaOS

Objetivo: criar a área interna da plataforma.

- Login exclusivo em `/admin-global`.
- Dashboard global.
- Listagem de clientes/igrejas.
- Cadastro de tenant.
- Edição de tenant.
- Status: ativo, suspenso, em configuração.
- Ativação de módulos por cliente.
- Gestão de planos.
- Gestão do catálogo de módulos.

Esta etapa é crucial porque o SirvaOS é um SaaS multi-tenant.

## Etapa 3 - Admin Cliente/Igreja

Objetivo: criar o painel da igreja contratante.

- Dashboard da igreja.
- Configuração de logo e cores.
- Upload de logo.
- Preview do tema.
- Gestão de usuários.
- Gestão de permissões.
- Gestão de membros.
- Visualização dos módulos ativos.
- Eventos (calendário central da igreja — módulo de Eventos).
- Comunicados gerais.

Aqui entra o white-label.

## Etapa 4 - Core Multi-Tenant

Objetivo: garantir isolamento e estrutura real de SaaS.

- Tenant context.
- `tenant_id` em dados operacionais.
- RBAC com escopo.
- Feature flags por tenant.
- Configuração de tema por tenant.
- Módulos ativos por tenant.
- Auditoria.
- Logs.

Esta etapa pode andar junto com backend e banco.
## Etapa 4b - listagens
 - Criar lista de cargos Ex: Membro, Lider de ministerio, Admin, Pastor, Diácono, Presbítero, Funcionário, Missionário...etc
 - Criar lista de Ministerios EX: Ministerio de Louvor, Ministerio de dança, Ministerio de interecessao,(Busque referencias em outras igrejas de tipos de ministerios existentes)
 - Adicionar na base de dados para ficar disponivel para as areas de cadastro do sistema.
 - O usuario podera criar adicionar novos dados a lista porem nao devera ser adicionado na lista do sistema, o que ele adiciona sera apenas para seu tenant.
 - O usuario podera editar os dados que ele adicionou.
 - ao caregar a lista para os usuarios, devera trazer a lista do sistema adicionado com os dados do seu tenant.
## Etapa 5 - Módulo de Membresia

Objetivo: primeiro módulo funcional base.

- Cadastro de membros.
- Status: ativo, inativo, visitante, em processo.
- Dados pessoais.
- Família/dependentes.
- Cargos vinculados. (Caso ele seja um cargo diferente de Membro, deve abrir a opção de adicionar de qual ministerio ele pertence)
- Deve ter a opção de adicionar o membro com admin para ter acesso as areas adminitrativas do ministerio que ele pertence caso este ministerio tenha um modulo criado no sistema. EX.: Se ele for maracado como admin e faça parte do minsterio de Louvor, ele tera acesso a are admin deste modulo e semre que acessar o sistema nao sera logado como membro comum para tera acesso ao menu de admin da area ao qual ele pertença.
- Histórico.
- Filtros e busca.
- Importação futura.

## Etapa 6 - Módulo de Louvor

Objetivo: primeiro módulo operacional com escala.
Acesso: Apenas quem tiver cargo de lider do louvor, Admin geral do tenant
Temos um sistema previamente criado na pasta C:\Projetos\ToNaEscalaWeb, analise o codigo dele e tente usar as mesmas fucnionalidades adaptando ao nosso projeto
- Status: iniciado.
- Base reutilizada do ToNaEscala: o admin cria o evento e a escala antes da resposta do participante; o participante confirma/recusa depois; dados sensiveis de outros escalados nao devem ficar expostos no portal do membro.
- Primeiro corte no SirvaOS:
  - tabelas operacionais para funcoes, eventos e escalados do louvor;
  - RLS por tenant com escrita apenas para Admin global, Admin do tenant ou administrador do modulo `worship`;
  - tela inicial no Admin Cliente para criar eventos de louvor e adicionar escalados;
  - menu lateral deve exibir Louvor apenas quando o modulo estiver ativo e o usuario tiver permissao administrativa.
- Proximos cortes:
  - detalhe completo do evento com edicao/remocao;
  - tela do membro para confirmar/recusar escala com justificativa;
  - calendario mensal estilo Google;
  - notificacoes app/WhatsApp;
  - historico e indicadores por integrante.
- Integrantes.
- Funções/instrumentos.
- Eventos de culto/ensaio.
- Escalas.
- Confirmação de presença.
- Notificações (poderao ser enviadas para o app caso o membro que faça parte do ministerio de louvor este logado, ou tambem pelo whatzapp do participante).
- Histórico de participação.
- Calendario estilo google para visualizar escalas e eventos do ministerio.

Este módulo valida o fluxo operacional real.


## Etapa 7 - Financeiro

Objetivo: expandir os módulos prioritários.

### Financeiro
- Dízimos/ofertas.
- Receitas/despesas.
- Categorias.
- Relatórios.
- Comprovantes para membros.
- Dash completo financeiro

## Etapa 8 -Kids

### Kids
A ideia desta area/modulo e que o Lider do ministerio Infantil tenha acesso a esta area como admin. O modulo fucnionara da seguinte forma:
Quando os pais forem deixar suas criancas na escolinha/area infantil durante o culto, a crianca devra ter um cadastro(vinculado ao cadastro de embro, caso os pais nao sejam membros criar apenas o cadastro da clranca sem vinculo de membro). Os pais irao ter o aplicativo no seu celular(Modulo futuro), sempre que os proefessores da escooinha precisarm chamar o pai da crianca, pelo sistema eles conseguirao enviar uma mensagem para os responsveis que deixaram a crianca, Essa comunicação podera ser feita entre comunicação entre o sistema e o app que estaralogado com os responsaveis pela crianca, ou caso nao te ham o app, podera ter a opçao de enviar uma mensagem para o whatzapp do responsavel cadastrado na hora que deixou a crianca.
O moduloDevera tera estas funcionalidades:
- Crianças (Cadastro). Podera usar o cadastro de FAmiliares que ja temos, caso utilize esta funcionalidade, adicione uma instrução aos administradres.
- Responsáveis.
- Turmas.
- Presença.
- Comunicados aos pais.
- Atividades
- Tias/tios na escala do dia(ADionar quem estara dando a aula para as criaçãs com data, este nome pode vir da lista de mebros que tem o cargo referente a area infantil)
- Adicionar o modulo na tel de admin global para ser liberado para os cliente/tenant
- Adicionar o modulo novo na area de adicionar membros, tanto na tela de admin global quanto no acesso pela admin do cliente
- Adicionar as regras para acesso dos usuarios no menu lateral quando este modulo for liberado para ele

## Etapa 9 - Escola Bíblica

### Escola Bíblica
- cadastros gerais regerentes ao modulo
- Turmas.
- Professores.
- Alunos.(podera ser adicionado da lista de mebros do tenant, ou adicionados avulsos)
- Frequência.
- Materiais.
- Notas
- Links de materias de apoio, como Videos, apostilas
- Adicionar o modulo na tela de admin global para ser liberado para os cliente/tenant
- Adicionar o modulo novo na area de adicionar membros, tanto na tela de admin global quanto no acesso pela admin do cliente
- Adicionar as regras para acesso dos usuarios no menu lateral quando este modulo for liberado para ele
- Os usuarios do portal de membros so terao acesso a area de aulas caso o usuario logado que nao seja admin do sistema ou admin do modulo de Escola Biblica esteja matriculado em alguma turma vigente ou tenha o cargo de professor dentro do sistema. Nestes casos ai sera liberado o modulo de escola biblica no menu apontando para a turma e curso matriculado, Caso seja Admin do tenant ou admin do modulo ou professor ai tera acesso a todas as turmas e materias rgistradas

## Etapa 10 - Relatórios e Auditoria

Objetivo: maturidade administrativa.

- Dashboard executivo.
- Relatórios por módulo.
- Exportação CSV/PDF.
- Logs de atividade com dados e nomes humizados e nao nome de funcoes, tabelas e permissoes.
- Auditoria de dados sensíveis.
- Métricas de engajamento.
- Adicionar o dash para o admin global e para o admin tenant

## Etapa 11 - Produção e Escala

Objetivo: preparar para clientes reais.

- Monitoramento de erros.
- LGPD.
- Termos/política por tenant.
- Documentação técnica.

## Etapa 12 - modulo de eventos

Objetivo: criar agenda de eventos da igreja (nao confundir com eventos da area de louvor) e poder disponibilizar para todos os membros que acessarem o sistema indepenendente de permissoes, todos terao a visao do evento.

- Cadastro de evento.
- Opçãoes de envios por email, whatsapp(para todos os membros da igreja) e push para quem estiver usando ao app(App ainda sera desenvolvido).

## Etapa 13 - modulo de Comunicados

Objetivo: criar comunicados da igreja e poder disponibilizar para todos os membros que acessarem o sistema indepenendente de permissoes, todos terao a visao do comunicado.

- Cadastro de comunicado, tratamento de cores d fonte, negritoetc, na descrição
- Opçãoes de envios por email, whatsapp(para todos os membros da igreja) e push para quem estiver usando ao app(App ainda sera desenvolvido).

## Etapa 14 - modulo de Midias sociais

Objetivo: criar uma area onde o admin da igreja podera vincular com videos/playlist de um canal do youtube, e os videos deste canal devera ser listado neste modulo para que possa ser visto de dentro do sistema por todos os usuaarios do sistema sem necessidade de permissao.

- Cadastro (CRUD) de canal de midia social

## Etapa 15 - Portal do Membro APP mobile

Objetivo: entregar valor para membros.

Com React Native + Expo:

- Login.
- Seleção/acesso ao tenant.
- Home do membro.
- Meus módulos. (que fornecerem dados para o publico geral)
- Minhas escalas.
- Eventos.
- Comunicados.
- Perfil.
- Push notifications.

Começa como app único modular. A arquitetura deve ficar preparada para separar apps por módulo depois.

## Primeira Entrega Real

### MVP 1

- Monorepo.
- Design system.
- Admin Global.
- Cadastro de tenants.
- Admin Cliente.
- Tema white-label.
- Módulo Membresia básico.

### MVP 2

- Módulo Louvor.
- Escalas.
- App mobile inicial.
- Notificações.

## Estado Atual do Projeto

### Concluído ou iniciado

- Etapa 5 está concluída: Módulo de Membresia básico.
- Etapa 6 concluída (2026-05-31): Módulo de Louvor completo — tabelas, RLS, escalas, calendário Google, portal do membro (/membro) com confirmação/recusa, links WhatsApp, indicadores por integrante.
- Etapa 7 concluída (2026-05-31): Módulo Financeiro — tabelas `financial_categories` e `financial_transactions`, RLS por tenant, dashboard, CRUD de lançamentos, categorias, relatórios por período/categoria, comprovantes para membros. Módulos `worship` e `financial` marcados como ativos no catálogo global. Admin Global atualizado com badges de status e filtro de módulos depreciados.
- Pendente: notificações push no app mobile (Etapa 12), integração WhatsApp Business API (melhoria futura).
- Etapa 8 concluída (2026-05-31): Módulo Kids com melhorias em reacao as instruções iniciais
- Etapa 9 concluída (2026-06-01): Módulo Escola Biblica
- Etapa 10 concluída (2026-06-01): Módulo Relatorio e Auditoria
- Etapa 11 concluída (2026-06-01): Produção e Escala — ErrorBoundary global com log no Supabase (`app_error_logs`), LGPD com consentimentos e solicitação de exclusão no portal do membro, termos/política por tenant com versionamento e modal de aceite obrigatório, tab "Política & LGPD" no ClientAdmin, migration `20260604100000_stage_11_production.sql`.
- Etapa 12 concluída (2026-06-01): Módulo de Eventos — migration `20260605100000_events_stage_12.sql` (ALTER tenant_events com event_type/color/status/ends_at, tabela event_notifications_log, módulo `events` no catálogo); tab "Eventos" no ClientAdmin com calendário mensal, lista com status/tipo/cor, formulário completo, modal de notificações (e-mail via Edge Function send-event-emails + link WhatsApp + push em breve); seção "Próximos eventos" no MemberPortal visível para todos os membros sem restrição de permissão.
- Etapa 13 concluída (2026-06-01): Módulo de Comunicados — migration `20260606100000_announcements_stage_13.sql` (coluna message_html em tenant_announcements, tabela announcement_notifications_log, módulo `announcements` no catálogo, RLS atualizado); Edge Function `send-announcement-emails` para envio de e-mail HTML com rich text; ClientAdmin com tab "Comunicados" completo: rich text editor, pré-visualização, modal de notificação (e-mail, WhatsApp, push em breve), edição, exclusão; MemberPortal com seção "Comunicados" visível a todos os membros e modal de leitura completa. "Calendário Central" substituído pelo módulo de Eventos já existente (docs atualizados).


---

# FASE 2 — Diferenciação (Etapa 2)

> Origem: antigo etapa-2-diferenciacao.md (consolidado aqui). Plano vivo das frentes de diferenciação (dashboards por papel, WhatsApp, Cuidado Pastoral, IA, Jornada, etc.).


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
- `[x]` A1 — Definir a estrutura de dados de cada cartão (contratos/queries por KPI). → spec em Apêndice A1 (neste documento). **Decisão:** 9 cartões no MVP; fuso `America/Sao_Paulo` fixo (config por tenant no futuro).
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


---

# APÊNDICE — Contratos da A1 (Dashboard do Pastor)

> Origem: antigo etapa-2-A1-dashboard-pastor-contratos.md (consolidado aqui).


> **Documento:** Especificação da tarefa A1 (Frente A — Dashboard por papel)
> **Produto:** SirvaOS
> **Versão:** 0.1
> **Data:** 2026-06-12
> **Status:** Em andamento
> **Relacionado:** este documento (Fase 2)

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
