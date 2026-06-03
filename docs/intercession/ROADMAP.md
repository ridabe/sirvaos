# Roadmap — Módulo de Intercessão (Etapa 15)

## Status Geral: Em andamento

---

## Etapa 15-A — Banco de Dados ✅ CONCLUÍDA
- [x] Migration `20260608100000_intercession_stage_15.sql`
- [x] Tabelas `prayer_requests` e `prayer_assignments`
- [x] RLS completo (admin módulo, intercessor, solicitante)
- [x] Seed sistema: cargo "Intercessor" + ministério "Intercessão"
- [x] Módulo `intercession` em `platform_modules`

---

## Etapa 15-B — ClientAdmin: Tab Intercessão ✅ CONCLUÍDA
- [ ] Tab "Intercessão" no ClientAdmin (visibilidade por módulo ativo)
- [ ] Lista de pedidos com ordenação correta (new → assigned/interceding → done)
- [ ] Badge de status colorido por estado
- [ ] Visualização de pedido (modal ou inline expand)
- [ ] Filtro por status

---

## Etapa 15-C — Distribuição de Pedidos ✅ CONCLUÍDA
- [x] Botão "Distribuir todos aleatoriamente" com modal de confirmação
- [x] Lógica round-robin aleatório client-side (Fisher-Yates)
- [x] Atribuição direta por pedido (select de membro do ministério)
- [x] Batch insert em `prayer_assignments`
- [x] Atualização de status em `prayer_requests`
- [x] Push ao intercessor após atribuição

---

## Etapa 15-D — MemberPortal: Fazer Pedido ✅ CONCLUÍDA
- [x] Seção "Pedido de Oração" visível para todos os membros
- [x] Formulário com textarea + opção anônimo
- [x] Aviso ao marcar anônimo sobre ausência de notificações
- [x] Histórico dos próprios pedidos com status visual
- [x] Badge de status (novo / sendo intercedido / intercedido)

---

## Etapa 15-E — MemberPortal: Área do Intercessor ✅ CONCLUÍDA
- [x] Seção "Minha Intercessão" visível apenas para membros do ministério Intercessão
- [x] Lista de pedidos atribuídos (pending + interceding)
- [x] Card com conteúdo do pedido (anônimo mostra "Pedido anônimo")
- [x] Botão "Começar a interceder" → atualiza assignment + push ao solicitante
- [x] Botão "Conclui a intercessão" → atualiza assignment + request + push ao solicitante
- [x] Badge com contagem de pedidos pendentes

---

## Etapa 15-F — Notificações Push ✅ CONCLUÍDA (integrada nas etapas C/D/E)
- [x] Push ao intercessor quando pedido é atribuído
- [x] Push ao solicitante quando intercessão começa
- [x] Push ao solicitante quando intercessão conclui
- [x] Sem push para pedidos anônimos (verificação de profile_id)
- [x] Badge visual no portal independente de push

---

## Etapa 15-G — Moderação, Histórico, Relatório e Admin Global ✅ CONCLUÍDA
- [x] Migration: moderation_status, moderation_notes, tenant_module_settings
- [x] Sub-view Moderação: toggle por tenant, fila de aprovação/rejeição
- [x] Sub-view Histórico: intercessões por membro com barra de progresso
- [x] Sub-view Relatório: pedidos por período, taxa de conclusão, KPIs
- [x] Dashboard expandido: 8 cards de stats
- [x] Admin Global: card "Pedidos de Oração" no painel de engajamento global
- [x] Módulo intercession no catálogo global (automático via platform_modules)

---

## Etapas Futuras
- Integração com app mobile (Etapa 10 — app)
- Recebimento de pedidos via app (source = 'app')
- Exportação PDF/CSV do relatório de pedidos
