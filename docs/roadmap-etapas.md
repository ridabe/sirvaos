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
- Calendário central.
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

## Etapa 5 - Módulo de Membresia

Objetivo: primeiro módulo funcional base.

- Cadastro de membros.
- Status: ativo, inativo, visitante, em processo.
- Dados pessoais.
- Família/dependentes.
- Ministérios vinculados.
- Histórico.
- Filtros e busca.
- Importação futura.

## Etapa 6 - Módulo de Louvor

Objetivo: primeiro módulo operacional com escala.

- Integrantes.
- Funções/instrumentos.
- Eventos de culto/ensaio.
- Escalas.
- Confirmação de presença.
- Notificações.
- Histórico de participação.

Este módulo valida o fluxo operacional real.

## Etapa 7 - App Mobile / Portal do Membro

Objetivo: entregar valor para membros.

Com React Native + Expo:

- Login.
- Seleção/acesso ao tenant.
- Home do membro.
- Meus módulos.
- Minhas escalas.
- Eventos.
- Comunicados.
- Perfil.
- Confirmação de presença.
- Push notifications.

Começa como app único modular. A arquitetura deve ficar preparada para separar apps por módulo depois.

## Etapa 8 - Financeiro, Kids e Escola Bíblica

Objetivo: expandir os módulos prioritários.

### Financeiro

- Dízimos/ofertas.
- Receitas/despesas.
- Categorias.
- Relatórios.
- Comprovantes para membros.

### Kids

- Crianças.
- Responsáveis.
- Turmas.
- Presença.
- Comunicados aos pais.

### Escola Bíblica

- Turmas.
- Professores.
- Alunos.
- Frequência.
- Materiais.

## Etapa 9 - Relatórios e Auditoria

Objetivo: maturidade administrativa.

- Dashboard executivo.
- Relatórios por módulo.
- Exportação CSV/PDF.
- Logs de atividade.
- Auditoria de dados sensíveis.
- Métricas de engajamento.

## Etapa 10 - Produção e Escala

Objetivo: preparar para clientes reais.

- Deploy.
- CI/CD.
- Backup.
- Observabilidade.
- Monitoramento de erros.
- LGPD.
- Termos/política por tenant.
- Domínio/subdomínio.
- Testes automatizados.
- Documentação técnica.

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

- Etapa 1 está parcialmente concluída: documentação, identidade visual, assets de marca, base React/Vite, design system inicial, tela inicial/login e push para o repositório.
- Etapa 2 está em andamento: existe uma prévia visual do Admin Global com cards de tenants, a rota exclusiva `/admin-global` já usa Supabase Auth com validação de papel global, a base Supabase inicial foi criada, e o primeiro dashboard interno com métricas, auditoria e listagem de tenants já consulta dados reais do Supabase.
- Etapa 3 foi iniciada antes da Etapa 2 completa: existe uma primeira fundação visual do Admin Cliente/Igreja com dashboard, membros, calendário, notificações e preview white-label.

### Próxima etapa lógica

A próxima etapa continua sendo a **Etapa 2 - Admin Global SirvaOS**, agora avançando da fundação de banco/login para as telas reais de dashboard global, listagem de tenants, cadastro/edição de tenants, planos e catálogo de módulos.

### Próximas ações recomendadas para a Etapa 2

1. Evoluir a estrutura de navegação interna após login do Admin Global.
2. Refinar dashboard global com métricas SaaS reais adicionais.
3. Evoluir listagem de tenants/clientes usando Supabase.
4. Criar formulário de cadastro/edição de tenant.
5. Criar estados de tenant: ativo, suspenso e em configuração.
6. Criar tela de módulos ativos por tenant.
7. Criar gestão de planos.
8. Criar gestão do catálogo global de módulos.
