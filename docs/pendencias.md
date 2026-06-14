# Pendências SirvaOS — Melhorias por Módulo

Documento gerado em 2026-06-02 com base na análise do código e roadmap.
Cada item deve ser implementado em ordem de prioridade, marcado como concluído quando entregue.

---

## Prioridade Alta

### [x] P1 — Comprovantes Financeiros no Portal do Membro
> Feito 2026-06-13: RPC `my_financial_contributions()` (security definer, só as próprias) + aba "Minhas Contribuições" no MemberPortal com lista e modal de comprovante (imprimir). Migration `20260613100000`.

**Módulo:** Financeiro  
**Problema:** O roadmap (Etapa 7) prevê "Comprovantes para membros", mas o MemberPortal.tsx não tem nenhuma seção financeira. O membro não consegue ver seus registros de dízimo/oferta.  
**O que fazer:**
- Adicionar seção "Financeiro" no MemberPortal com listagem das transações vinculadas ao `member_id` do usuário logado
- Exibir: data, categoria, valor, tipo (receita/despesa), descrição
- Modal de comprovante individual (detalhe formatado, opção de imprimir/PDF simples)
- RLS já existe — apenas garantir que a query filtre por `member_id = auth.uid()` via perfil

---

### [x] P2 — Comunicados do Kids: WhatsApp + E-mail
> Feito: WhatsApp via `send-whatsapp` (context `kids_communication`). E-mail (2026-06-13): Edge Function `send-kids-communication-emails` (Resend) + opção "E-mail" no `sent_via` (constraint estendido, migration `20260613110000`) + branch no handler.

**Módulo:** Kids  
**Problema:** A funcionalidade de comunicar pais é o diferencial do módulo Kids descrito no roadmap. O sistema salva o registro em `kids_communications`, mas não existe Edge Function para envio real. Os pais não recebem nada.  
**O que fazer:**
- Criar Edge Function `send-kids-communication-emails` (modelo igual às demais: Resend API)
- Template HTML: nome da criança, título do comunicado, mensagem, assinatura do tenant
- Destinatários: responsáveis cadastrados em `kids_guardians` com e-mail (ou via perfil do membro vinculado)
- Adicionar botão "Enviar por e-mail" no modal de comunicados do Kids no ClientAdmin
- Gerar link WhatsApp (`wa.me`) para cada responsável com número cadastrado

---

## Prioridade Média

### [x] P3 — Exportação PDF de Relatórios
**Módulos:** Financeiro, Escola Bíblica, Kids (frequência)  
**Problema:** O roadmap (Etapa 10) pede exportação CSV/PDF. CSV está implementado para membros/famílias/eventos/financeiro/auditoria, mas PDF não existe em nenhum módulo.  
**O que fazer:**
- Implementar geração de PDF client-side com `@react-pdf/renderer` ou `jsPDF`
- Prioridade de implementação:
  1. Relatório financeiro por período (receitas, despesas, saldo, por categoria)
  2. Lista de frequência da Escola Bíblica por turma/período
  3. Lista de frequência do Kids por turma/período
- Botão "Exportar PDF" ao lado do CSV já existente

---

### [x] P4 — Validação de Turma Vigente na Escola Bíblica (Portal do Membro)
**Módulo:** Escola Bíblica  
**Problema:** O portal do membro libera acesso à Escola Bíblica se houver qualquer enrollment, sem checar se a turma está ativa/vigente. Um aluno de turma encerrada ainda vê o módulo.  
**O que fazer:**
- Na query de enrollments do MemberPortal, adicionar join com `bible_school_classes` filtrando `status = 'active'` (ou equivalente de turma vigente)
- Se nenhuma turma ativa → esconder seção da Escola Bíblica no portal
- Revisar também o acesso a materiais: só exibir materiais de turmas onde o aluno está matriculado e a turma está ativa

---

### [x] P5 — Métricas de Engajamento Cross-Módulo no Admin Global
**Módulo:** Admin Global (Etapa 10)  
**Problema:** O dashboard executivo do Admin Global mostra métricas de tenants (quantidade, planos), mas não KPIs cruzados entre módulos. O roadmap pede "métricas de engajamento".  
**O que fazer:**
- Adicionar cards no dashboard do Admin Global por tenant selecionado:
  - Total de membros ativos
  - Total de eventos nos últimos 30 dias
  - Taxa de confirmação de escalas (louvor)
  - Total de lançamentos financeiros do mês
  - Total de crianças cadastradas (Kids)
  - Total de alunos matriculados (Escola Bíblica)
- Adicionar no ClientAdmin uma aba/seção "Resumo de Engajamento" com os mesmos KPIs para o tenant

---

## Prioridade Baixa

### [x] P6 — WhatsApp Automático (Z-API)
> Feito: integração Z-API (não Twilio). Edge Function `send-whatsapp` (envio), `whatsapp-webhook` (status de entrega), `send-event-reminders` (lembrete 24h via pg_cron). Usado em Comunicados, Escala de Louvor e Kids. Logs em `whatsapp_messages` + painel (aba WhatsApp). Detalhes na Fase 2 do roadmap (Frente B).

**Módulos:** Louvor, Eventos, Comunicados, Kids  
**Problema:** Todos os módulos geram link `wa.me` manual. O roadmap prevê envio automático via WhatsApp Business.  
**O que fazer:**
- Avaliar integração com Twilio (WhatsApp Business API) ou Z-API
- Criar Edge Function genérica `send-whatsapp-message`
- Substituir progressivamente os links wa.me por envio real nos modais de notificação
- Manter links wa.me como fallback

---

### [x] P7 — Mídias Sociais multi-plataforma
> Feito 2026-06-13: suporte a Instagram e Spotify além do YouTube. Detecção de plataforma pela URL no ClientAdmin (`detectSocialChannel`), constraint estendido (migration `20260613120000`), e render por plataforma no MemberPortal (YouTube=feed, Spotify=embed iframe, Instagram=link). *(Instagram usa link direto; embed oficial exige token da Meta — evolução futura.)*

**Módulo:** Mídias Sociais  
**Problema:** Atualmente só suporta YouTube (canal e playlist). O módulo foi desenhado para ser multi-plataforma.  
**O que fazer:**
- Adicionar suporte a Instagram (embed de perfil/posts via oEmbed)
- Adicionar suporte a Spotify (embed de playlist/podcast)
- Atualizar o CRUD no ClientAdmin para identificar a plataforma pela URL
- Atualizar a seção do MemberPortal para renderizar o player/embed correto por plataforma

---

## Bloqueado — Depende do App Mobile (Etapa 15)

### [  ] P8 — Push Notifications (todos os módulos)
**Problema:** Louvor, Eventos e Comunicados têm botão "Push notification" com badge "Em breve". Requer app mobile.  
**O que fazer (quando app estiver pronto):**
- Integrar Firebase Cloud Messaging (FCM) ou Expo Push Notifications
- Criar Edge Function `send-push-notification`
- Registrar device tokens dos membros ao fazer login no app
- Substituir os placeholders pelos botões funcionais nos modais de notificação

---

## Etapa 15 — App Mobile (Não Iniciado)

**Stack:** React Native + Expo  
**Funcionalidades previstas:**
- Login + seleção de tenant
- Home do membro
- Minhas escalas (Louvor)
- Próximos eventos
- Comunicados
- Kids (responsável vê filhos, recebe alertas)
- Escola Bíblica (aluno vê materiais, frequência)
- Perfil
- Push notifications (desbloqueia P8)

---

## Ordem de Execução Sugerida

1. P1 — Comprovantes financeiros no portal
2. P2 — Edge Function Kids (e-mail para pais)
3. P3 — Exportação PDF
4. P4 — Validação turma vigente Escola Bíblica
5. P5 — Métricas de engajamento
6. P6 — WhatsApp Business API
7. P7 — Mídias Sociais multi-plataforma
8. P8 — Push notifications (após Etapa 15)
9. Etapa 15 — App Mobile
