# PRD — Módulo de Intercessão (Etapa 15)

## Visão Geral

O módulo de Intercessão permite que membros façam pedidos de oração (via portal web ou app mobile futuro) e que o ministério de Intercessão da igreja gerencie, distribua e acompanhe esses pedidos até sua conclusão.

## Problema

Igrejas recebem pedidos de oração por canais informais (WhatsApp, papel, verbal), sem rastreamento, sem garantia de que alguém intercedeu e sem retorno ao solicitante.

## Solução

Um fluxo digital estruturado: pedido → atribuição → intercessão → confirmação, com notificações automáticas ao solicitante em cada etapa.

---

## Personas

| Persona | Papel | Acesso |
|---|---|---|
| **Solicitante** | Qualquer membro (ou anônimo via app) | Faz pedido, acompanha status |
| **Intercessor** | Membro do ministério Intercessão | Recebe pedidos atribuídos, marca intercessão |
| **Admin Intercessão** | Admin do módulo intercession | Vê todos os pedidos, distribui, acompanha painel |

---

## Fluxo Principal

```
1. Solicitante faz pedido (portal/app)
   └── Pode marcar como anônimo → não recebe notificações, nome não exposto

2. Admin do ministério vê pedidos com status "novo"
   └── Distribui: aleatório (um pedido → um intercessor aleatório)
                  OU direto (seleciona intercessor específico)
   └── Pedido passa para status "atribuído"

3. Intercessor recebe pedido em seu portal
   └── Marca "Começar a interceder" → status "intercedendo"
   └── Solicitante recebe push/badge: "Estão orando pelo seu pedido"
   └── Admin vê pedido como "em intercessão"

4. Intercessor conclui
   └── Marca "Intercedi" → status "concluído"
   └── Solicitante recebe push/badge: "Oramos pelo seu pedido"
   └── Admin vê pedido como "concluído"

5. Ordenação da lista (admin e intercessor)
   └── Topo: novos (sem intercessor)
   └── Meio: atribuídos e em intercessão
   └── Final: concluídos
```

---

## Regras de Negócio

- **Qualquer membro ativo** pode fazer pedido (portal + app)
- **Anonimato**: sistema guarda member_id internamente mas não exibe nome a admin/intercessor; solicitante é avisado que não receberá notificações
- **1 pedido → 1 intercessor**: cada pedido é atribuído a exatamente um intercessor por vez
- **1 intercessor → N pedidos**: um intercessor pode ter múltiplos pedidos simultâneos
- **Distribuição aleatória**: distribui todos os pedidos `new` de uma vez, cada um para um intercessor diferente (round-robin aleatório entre membros do ministério)
- **Cargo/Ministério automático**: cargo "Intercessor" e ministério "Intercessão" criados automaticamente no sistema (seed)
- **Notificações**: push via Expo (sistema existente) + badge visual no portal

---

## Fora de Escopo (Etapa 15)

- Integração com app mobile (app ainda não existe; módulo prepara o backend)
- Histórico de intercessões por membro
- Relatórios de pedidos por período
- Moderação de conteúdo dos pedidos
