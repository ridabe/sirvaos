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
- Integrantes.
- Funções/instrumentos.
- Eventos de culto/ensaio.
- Escalas.
- Confirmação de presença.
- Notificações (poderao ser enviadas para o app caso o membro que faça parte do ministerio de louvor este logado, ou tambem pelo whatzapp do participante).
- Histórico de participação.
- Calendario estilo google para visualizar escalas e eventos do ministerio.

Este módulo valida o fluxo operacional real.


## Etapa 7 - Financeiro, Kids e Escola Bíblica

Objetivo: expandir os módulos prioritários.

### Financeiro

- Dízimos/ofertas.
- Receitas/despesas.
- Categorias.
- Relatórios.
- Comprovantes para membros.
- Dash completo financeiro

### Kids
A ideia desta area/modulo e que o Lider do ministerio Infantil tenha acesso a esta area como admi. O modulo fucnionara da seguinte forma:
Quando os pais forem deixar suas criancas na escolinha/area infantil durante o culto, a crianca devra ter um cadastro(vinculado ao cadastro de embro, caso os pais nao sejam membros criar apenas o cadastro da clranca sem vinculo de membro). Os pais irao ter o aplicativo no seu celular(Modulo futuro), sempre que os proefessores da escooinha precisarm chamar o pai da crianca, pelo sistema eles conseguirao enviar uma mensagem para os responsveis que deixaram a crianca, Essa comunicação podera ser feita entre comunicação entre o sistema e o app que estaralogado com os responsaveis pela crianca, ou caso nao te ham o app, podera ter a opçao de enviar uma mensagem para o whatzapp do responsavel cadastrado na hora que deixou a crianca.
O moduloDevera ter estas funcionalidades:
- Crianças (Cadastro).
- Responsáveis.
- Turmas.
- Presença.
- Comunicados aos pais.
- Atividades

### Escola Bíblica

- Turmas.
- Professores.
- Alunos.(podera ser adicionado da lista de mebros do tenant, ou adicionados avulsos)
- Frequência.
- Materiais.
- Notas

## Etapa 8 - Relatórios e Auditoria

Objetivo: maturidade administrativa.

- Dashboard executivo.
- Relatórios por módulo.
- Exportação CSV/PDF.
- Logs de atividade.
- Auditoria de dados sensíveis.
- Métricas de engajamento.

## Etapa 9 - Produção e Escala

Objetivo: preparar para clientes reais.

- Monitoramento de erros.
- LGPD.
- Termos/política por tenant.
- Documentação técnica.

## Etapa 10 - App Mobile / Portal do Membro

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