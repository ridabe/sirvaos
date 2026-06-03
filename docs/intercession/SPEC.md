# SPEC Técnica — Módulo de Intercessão (Etapa 15)

## Banco de Dados

### Tabelas

#### `prayer_requests`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| member_id | uuid FK members, nullable | NULL se anônimo ou sem vínculo |
| profile_id | uuid FK profiles, nullable | Para envio de push; NULL se anônimo |
| is_anonymous | boolean | Se true, nome não é exposto; sistema mantém IDs |
| content | text (5–1000) | Texto do pedido |
| status | enum | `new` → `assigned` → `interceding` → `done` |
| source | enum | `portal` \| `app` |
| created_at / updated_at | timestamptz | |

#### `prayer_assignments`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK tenants | |
| prayer_request_id | uuid FK prayer_requests | |
| assigned_member_id | uuid FK members | Intercessor |
| assigned_profile_id | uuid FK profiles, nullable | Para push ao intercessor |
| assigned_by_profile_id | uuid FK profiles, nullable | Admin que atribuiu |
| assigned_at | timestamptz | |
| status | enum | `pending` → `interceding` → `done` \| `cancelled` |
| started_at | timestamptz | Quando marcou "intercedendo" |
| completed_at | timestamptz | Quando marcou "concluído" |

### Seed
- `catalog_roles`: registro sistema (tenant_id = NULL) com name = "Intercessor"
- `catalog_ministries`: registro sistema (tenant_id = NULL) com name = "Intercessão"

### RLS
- **Admin tenant / Admin módulo**: SELECT/UPDATE em prayer_requests; SELECT/INSERT/UPDATE em prayer_assignments
- **Intercessor** (membro com assignment ativo): SELECT em prayer_requests atribuídos; SELECT/UPDATE em próprios prayer_assignments
- **Solicitante não-anônimo**: SELECT em próprios prayer_requests

---

## Edge Functions

### `send-push` (existente)
Reutilizada para notificações. Chamada com `module_code: 'intercession'`.

Cenários de disparo:
1. Assignment criado → push ao intercessor: "Você recebeu um pedido de oração"
2. Assignment → `interceding` → push ao solicitante: "Estão orando pelo seu pedido"
3. Assignment → `done` → push ao solicitante: "Oramos pelo seu pedido"

Todos os pushs são disparados diretamente do frontend via `supabase.functions.invoke('send-push', ...)` após a mutação de status, com verificação de `is_anonymous` e `profile_id` antes de enviar.

---

## Frontend — ClientAdmin (tab Intercessão)

### Visibilidade
- Tab exibida quando `tenant_modules.status = 'active'` para `code = 'intercession'`
- Permissão: `tenant_role in ('owner','admin')` OU admin do módulo `intercession`

### Componentes

#### Lista de Pedidos
- Ordenação: `new` e `assigned` no topo → `interceding` → `done` no final
- Colunas: data, preview do pedido (truncado), status badge, intercessor atribuído, ações
- Filtro por status
- Pedidos anônimos: exibe "Anônimo" no lugar do nome

#### Painel de Distribuição
- Botão "Distribuir todos" — modal de confirmação → chama lógica de atribuição aleatória
- Por pedido: botão "Atribuir" → dropdown com membros do ministério Intercessão

#### Lógica de Atribuição Aleatória
Client-side em TypeScript:
1. Busca todos pedidos `new`
2. Busca todos membros do ministério "Intercessão" do tenant
3. Shuffle Fisher-Yates na lista de intercessores
4. Distribui round-robin: pedido[i] → intercessores[i % len]
5. Insere em `prayer_assignments` em batch
6. Atualiza `prayer_requests.status = 'assigned'` em batch
7. Envia push a cada intercessor

---

## Frontend — MemberPortal

### Seção "Pedido de Oração" (todos os membros)
- Formulário: textarea do pedido + checkbox "Enviar anonimamente"
- Se anônimo: exibe aviso "Você não receberá atualizações pois seu nome não será associado ao pedido"
- Histórico dos próprios pedidos com status visual

### Seção "Minha Intercessão" (apenas membros do ministério Intercessão)
- Lista de pedidos atribuídos (status `pending` ou `interceding`)
- Card por pedido: conteúdo, data, status badge
- Pedido anônimo: exibe "Pedido anônimo" no lugar do nome
- Botão "Começar a interceder" → muda assignment para `interceding` + dispara push ao solicitante
- Botão "Conclui a intercessão" → muda assignment para `done` + muda request para `done` + dispara push ao solicitante

### Notificações Visuais
- Badge na seção "Minha Intercessão" com contagem de pedidos pendentes
- Na seção "Meu Pedido": badge de status por pedido (novo / sendo intercedido / intercedido)

---

## Estados de Status (referência visual)

| Status request | Badge | Cor |
|---|---|---|
| new | Novo | azul |
| assigned | Atribuído | amarelo |
| interceding | Em Intercessão | laranja |
| done | Intercedido | verde |

| Status assignment | Significado |
|---|---|
| pending | Atribuído, intercessor ainda não começou |
| interceding | Intercessor marcou que está intercedendo |
| done | Intercessão concluída |
| cancelled | Admin cancelou / reatribuiu |
