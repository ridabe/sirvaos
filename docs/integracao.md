# Arquitetura de Integração — Primeira Igreja

> **Documento:** Arquitetura de Integração (Visão Não-Técnica)  
> **Versão:** 1.0  
> **Data:** Maio de 2026  
> **Status:** Rascunho para apresentação à Diretoria

---

## Como o sistema se conecta — visão simplificada

Imagine o sistema como um **grande prédio com vários andares**. Cada andar é um ministério. Mas todos os andares compartilham o mesmo elevador, a mesma recepção e o mesmo sistema de segurança. A liderança da igreja tem acesso ao telhado, de onde enxerga todos os andares ao mesmo tempo.

O sistema é construído dessa forma: **módulos independentes, mas profundamente conectados**.

---

## Os três pilares da integração

### 1. Base de Cadastro Unificada (O "Registro Central")

Todo membro da igreja é cadastrado **uma única vez** no sistema. A partir desse cadastro central, ele pode ser vinculado a quantos ministérios participar.

Isso significa que:
- Não há duplicidade de informação
- Quando um dado é atualizado (endereço, telefone, estado civil), a mudança reflete em todos os módulos automaticamente
- O histórico completo do membro fica em um só lugar: batismo, membresia, ministérios, contribuições, cursos

### 2. Agendas e Eventos Integrados (O "Calendário Único")

Cada módulo pode criar seus próprios eventos — cultos, ensaios, reuniões, mutirões. Todos esses eventos alimentam um **calendário central** da igreja, acessível pela liderança.

Isso permite que a direção da igreja:
- Evite conflitos de agenda entre ministérios
- Tenha uma visão de tudo o que acontece na Primeira Igreja em uma única tela
- Planeje campanhas e datas especiais sem sobrepor atividades já agendadas

### 3. Comunicação Centralizada (As "Notificações Inteligentes")

O sistema sabe quem é quem. Isso permite que as comunicações sejam **direcionadas e relevantes**:

- Um músico do Ministério de Louvor recebe notificações apenas sobre escalas e ensaios
- Um pai do Ministério Kids recebe avisos sobre o calendário infantil
- A liderança recebe alertas consolidados sobre toda a igreja
- Comunicados gerais da Primeira Igreja chegam a todos os membros ao mesmo tempo

---

## Perfis de Acesso — Quem vê o quê

O sistema tem um sistema de permissões em camadas. Ninguém vê mais do que precisa, e ninguém fica de fora do que é seu.

```
┌─────────────────────────────────────────────────────┐
│              ADMINISTRADOR GERAL                    │
│  Acesso completo a todos os módulos e relatórios   │
│  Gestão de usuários e permissões                   │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┼──────────────┐
     │             │              │
     ▼             ▼              ▼
┌─────────┐  ┌─────────┐   ┌─────────┐
│  Adm.   │  │  Adm.   │   │  Adm.   │
│ Módulo A│  │ Módulo B│   │ Módulo C│
│(Louvor) │  │(Finanças│   │ (Kids)  │
└────┬────┘  └────┬────┘   └────┬────┘
     │             │              │
     ▼             ▼              ▼
┌─────────────────────────────────────────────────────┐
│                   MEMBROS                           │
│       Acesso via App — apenas ao que lhes diz       │
│       respeito (escalas, eventos, comunicados)      │
└─────────────────────────────────────────────────────┘
```

---

## O App do Membro — A Porta de Entrada

O aplicativo mobile (previsto para desenvolvimento futuro) será a interface principal dos membros da Primeira Igreja com o sistema. Ele não é um app separado — é uma **janela do sistema**, acessando os mesmos dados em tempo real.

**O membro abre o app e vê:**
- Seus próximos compromissos (escalas, eventos, reuniões)
- Notificações dos ministérios em que participa
- Histórico de contribuições e comprovantes
- Comunicados gerais da Primeira Igreja
- Informações do seu perfil de membro

**O que o app NÃO tem:**
- Acesso a dados de outros membros
- Capacidade de alterar informações administrativas
- Visão de dados de outros ministérios dos quais não participa

---

## Módulo do Ministério de Louvor — O Caso de Uso Piloto

O módulo de louvor já existente serve como prova de conceito ideal para a integração. O processo será:

**Passo 1 — Mapeamento:** Identificar quais dados do sistema atual precisam migrar para o sistema unificado.

**Passo 2 — Migração:** Transferir cadastros de músicos e histórico de escalas para a base unificada.

**Passo 3 — Integração:** Conectar o módulo ao calendário central, ao perfil dos membros e ao sistema de notificações.

**Passo 4 — App:** Habilitar o acesso dos músicos pelo app mobile (visualização de escalas e eventos).

**Resultado esperado:** Um músico que antes precisava consultar o WhatsApp do grupo para saber se estava escalado, agora abre o app, vê a escala atualizada em tempo real, e recebe uma notificação automática dias antes do evento.

---

## Como a integração cresce com a igreja

O sistema é pensado para escalar de forma planejada e sem risco:

| Fase | O que acontece |
|---|---|
| **Fase 1** | Sistema base + módulos prioritários + integração do Louvor |
| **Fase 2** | Expansão para mais 10-15 ministérios + lançamento do app mobile |
| **Fase 3** | Todos os ministérios integrados + relatórios executivos + integrações externas |

Em nenhuma fase é necessário "parar tudo e reconstruir". O sistema cresce de forma orgânica, módulo por módulo, mantendo o que já funciona e adicionando o novo.

---

## Segurança e Privacidade dos Dados

Todos os dados dos membros são tratados com total respeito e privacidade:

- Cada usuário acessa apenas o que tem permissão
- Os dados ficam armazenados em servidores seguros (nuvem com backup)
- Informações financeiras têm camada extra de proteção
- Nenhum dado é compartilhado com terceiros sem autorização da liderança
- O sistema pode ser configurado para cumprir as exigências da LGPD (Lei Geral de Proteção de Dados)

---

*Voltar para: [Visão Geral](./visao-geral.md) | [Módulos](./modulos.md)*
