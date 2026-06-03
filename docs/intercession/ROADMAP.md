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

## Etapa 15-B — ClientAdmin: Tab Intercessão 🔲 PRÓXIMA
- [ ] Tab "Intercessão" no ClientAdmin (visibilidade por módulo ativo)
- [ ] Lista de pedidos com ordenação correta (new → assigned/interceding → done)
- [ ] Badge de status colorido por estado
- [ ] Visualização de pedido (modal ou inline expand)
- [ ] Filtro por status

---

## Etapa 15-C — Distribuição de Pedidos 🔲
- [ ] Botão "Distribuir todos aleatoriamente" com modal de confirmação
- [ ] Lógica round-robin aleatório client-side (Fisher-Yates)
- [ ] Atribuição direta por pedido (select de membro do ministério)
- [ ] Batch insert em `prayer_assignments`
- [ ] Atualização de status em `prayer_requests`
- [ ] Push ao intercessor após atribuição

---

## Etapa 15-D — MemberPortal: Fazer Pedido 🔲
- [ ] Seção "Pedido de Oração" visível para todos os membros
- [ ] Formulário com textarea + opção anônimo
- [ ] Aviso ao marcar anônimo sobre ausência de notificações
- [ ] Histórico dos próprios pedidos com status visual
- [ ] Badge de status (novo / sendo intercedido / intercedido)

---

## Etapa 15-E — MemberPortal: Área do Intercessor 🔲
- [ ] Seção "Minha Intercessão" visível apenas para membros do ministério Intercessão
- [ ] Lista de pedidos atribuídos (pending + interceding)
- [ ] Card com conteúdo do pedido (anônimo mostra "Pedido anônimo")
- [ ] Botão "Começar a interceder" → atualiza assignment + push ao solicitante
- [ ] Botão "Conclui a intercessão" → atualiza assignment + request + push ao solicitante
- [ ] Badge com contagem de pedidos pendentes

---

## Etapa 15-F — Notificações Push 🔲
- [ ] Push ao intercessor quando pedido é atribuído: "Você recebeu um pedido de oração"
- [ ] Push ao solicitante quando intercessão começa: "Estão orando pelo seu pedido"
- [ ] Push ao solicitante quando intercessão conclui: "Oramos pelo seu pedido"
- [ ] Sem push para pedidos anônimos (verificação de profile_id)
- [ ] Badge visual no portal independente de push

---

## Etapas Futuras (fora do escopo 15)
- Integração com app mobile (Etapa 10 — app)
- Recebimento de pedidos via app (source = 'app')
- Histórico de intercessões por membro intercessor
- Relatório: pedidos por período, taxa de conclusão
- Moderação / aprovação de pedidos antes de distribuir
