# SPEC do Produto — SirvaOS

> **Documento:** Especificação do Produto e Arquitetura Funcional  
> **Produto:** SirvaOS  
> **Versão:** 0.1  
> **Data:** Maio de 2026  
> **Status:** Rascunho técnico-funcional

---

## 1. Visão Geral

O **SirvaOS** é uma plataforma SaaS multi-tenant para gerenciamento de igrejas, ministérios, membros, escalas, eventos, comunicação, finanças e operações administrativas.

O produto terá duas camadas principais:

1. **Admin Global SirvaOS**
   - Ambiente interno da empresa/plataforma SirvaOS.
   - Usado para gerenciar clientes/igrejas, planos, módulos contratados, identidade base do produto, configurações globais, suporte, auditoria e métricas da plataforma.
   - Terá identidade visual própria do SirvaOS, ainda a ser criada.

2. **Ambiente do Cliente/Igreja**
   - Ambiente administrativo de cada igreja contratante.
   - A igreja poderá configurar sua marca: logo, cores, nome exibido, domínio/subdomínio e módulos ativos.
   - Cada cliente opera em isolamento lógico, com seus próprios usuários, membros, módulos, permissões e dados.

Além do painel web, o SirvaOS prevê **apps Android/iOS para membros**, que poderão ser organizados por módulo, permitindo que membros acessem informações persistentes relacionadas aos ministérios dos quais participam.

---

## 2. Objetivos do SPEC

Este documento define a estrutura inicial do produto para orientar:

- Modelagem funcional.
- Arquitetura multi-tenant.
- Separação entre administração global e administração do cliente.
- Organização dos módulos.
- Personalização visual por cliente.
- Apps móveis por módulo.
- Perfis de acesso.
- Requisitos mínimos para MVP e evolução.

---

## 3. Princípios do Produto

### 3.1 Multi-Tenant por Design

Cada igreja será um **tenant** independente.

Cada tenant terá:

- Dados isolados.
- Identidade visual própria.
- Usuários próprios.
- Módulos contratados/ativados.
- Permissões próprias.
- Subdomínio ou domínio próprio.
- Configurações específicas de comunicação, calendário e operação.

### 3.2 White-Label para Clientes

O ambiente do cliente deve poder assumir a identidade visual da igreja.

Configurável pelo Admin do Cliente:

- Logo principal.
- Logo reduzida/ícone.
- Favicon.
- Cor primária.
- Cor secundária.
- Cor de destaque.
- Nome público da igreja.
- Nome exibido da plataforma para aquele tenant.
- Nomenclatura de menus, quando aplicável.
- Imagens institucionais.
- Dados de contato da igreja.

Importante: a personalização do cliente não altera a identidade interna do **Admin Global SirvaOS**.

### 3.3 Modularidade

O sistema será composto por módulos independentes, mas conectados por entidades comuns:

- Pessoas/membros.
- Usuários.
- Permissões.
- Agenda/eventos.
- Notificações.
- Arquivos.
- Auditoria.
- Relatórios.

Cada módulo poderá ser ativado ou desativado por cliente.

### 3.4 Apps por Módulo

Cada módulo poderá expor uma experiência mobile própria para membros.

Exemplos:

- App/área mobile do Louvor.
- App/área mobile do Kids.
- App/área mobile de Escola Bíblica.
- App/área mobile de Pequenos Grupos.
- App/área mobile de Voluntários/Ação Social.

A decisão técnica futura pode seguir uma destas abordagens:

1. **App único com módulos internos**
   - Um app SirvaOS/white-label por igreja.
   - O membro acessa os módulos nos quais participa.
   - Mais simples de manter.

2. **Apps separados por módulo**
   - Cada módulo pode ter app Android/iOS próprio.
   - Útil quando o módulo tem experiência muito específica.
   - Exige mais governança, publicação e manutenção.

3. **Modelo híbrido recomendado**
   - Uma base mobile compartilhada.
   - Capacidade de publicar experiências separadas por módulo quando houver necessidade comercial ou operacional.
   - Os dados e autenticação continuam centralizados.

---

## 4. Áreas do Sistema

## 4.1 Admin Global SirvaOS

Área interna da plataforma, acessível apenas pela equipe SirvaOS.

### Funções principais

- Criar, editar, suspender e excluir clientes/tenants.
- Configurar planos comerciais.
- Ativar/desativar módulos por cliente.
- Gerenciar limites de uso por plano.
- Acompanhar métricas globais.
- Gerenciar identidade visual institucional do SirvaOS.
- Gerenciar catálogo global de módulos.
- Gerenciar templates base de módulos.
- Acompanhar logs e auditorias globais.
- Acessar ferramentas de suporte.
- Configurar integrações globais.
- Gerenciar versões do sistema.
- Gerenciar publicação/configuração de apps móveis.

### Identidade visual

O Admin Global terá visual próprio do SirvaOS:

- Logo SirvaOS.
- Paleta institucional SirvaOS.
- Tipografia e componentes próprios.
- Sem interferência da identidade visual dos clientes.

### Perfis do Admin Global

| Perfil | Descrição |
|---|---|
| Super Admin SirvaOS | Acesso total à plataforma global |
| Operações | Gestão de tenants, módulos e suporte |
| Suporte | Acesso controlado a dados técnicos e chamados |
| Financeiro SirvaOS | Planos, cobrança, status comercial |
| Auditor Global | Leitura de logs e eventos críticos |

---

## 4.2 Admin do Cliente/Igreja

Área administrativa da igreja contratante.

### Funções principais

- Configurar identidade visual da igreja.
- Gerenciar usuários da igreja.
- Gerenciar membros.
- Ativar configurações dos módulos contratados.
- Definir administradores de módulos.
- Gerenciar permissões internas.
- Acompanhar calendário consolidado.
- Criar comunicados gerais.
- Acompanhar relatórios.
- Consultar auditoria do próprio tenant.

### Identidade visual

O painel do cliente deve carregar o tema configurado pela igreja:

- Logo do cliente.
- Cores do cliente.
- Nome do cliente.
- Menus e termos customizados, quando permitido.

### Perfis do Cliente

| Perfil | Descrição |
|---|---|
| Admin Geral da Igreja | Acesso completo ao tenant |
| Admin Administrativo | Gestão operacional do tenant |
| Admin Financeiro | Acesso aos módulos e relatórios financeiros |
| Admin de Módulo | Gestão de um módulo específico |
| Colaborador | Acesso limitado a rotinas delegadas |
| Membro | Acesso ao app/portal apenas aos próprios dados e módulos |

---

## 4.3 Admin de Módulo

Cada módulo pode ter um ou mais administradores.

O Admin de Módulo pode:

- Gerenciar dados do módulo.
- Vincular membros ao módulo.
- Criar eventos e escalas.
- Enviar comunicados segmentados.
- Acompanhar frequência e engajamento.
- Gerar relatórios do módulo.
- Configurar funções e equipes internas do módulo.

O Admin de Módulo não pode:

- Acessar dados de outros módulos sem permissão.
- Alterar configurações globais da igreja.
- Ativar módulos contratados.
- Alterar dados financeiros sensíveis, salvo se o módulo permitir e o perfil autorizar.

---

## 4.4 App/Portal do Membro

O membro acessa informações relacionadas a ele.

### Primeiro acesso de membros

O cadastro de membro e o acesso autenticado sÃ£o conceitos separados:

- `members` representa a pessoa cadastrada na igreja.
- `profiles` representa um usuÃ¡rio autenticÃ¡vel no SirvaOS.
- `tenant_module_admins` pode conceder permissÃµes administrativas ao `member_id` antes mesmo de existir um `profile`.

Fluxo definido:

1. Admin da igreja cadastra ou atualiza o membro com e-mail.
2. Admin pode deixar o membro como comum ou atribuir mÃ³dulos administrativos ao `member_id`.
3. O membro abre a tela do sistema/app, informa o e-mail e marca `Primeiro acesso`.
4. O backend valida se o e-mail existe em um membro ativo, vinculado a um tenant ativo.
5. Se o membro possuir data de nascimento cadastrada, o primeiro acesso exige a confirmaÃ§Ã£o dessa data.
6. O backend gera um token curto de ativaÃ§Ã£o, com expiraÃ§Ã£o e uso Ãºnico.
7. O membro cria a senha.
8. O sistema cria ou ativa o `profile`, vinculado ao `member_id`, com `tenant_role = member` por padrÃ£o.
9. O acesso passa a seguir as regras normais:
   - membro comum vai para o portal/app do membro;
   - membro com permissÃ£o em `tenant_module_admins` acessa o admin do(s) mÃ³dulo(s);
   - `owner`/`admin` do tenant acessa o admin do cliente;
   - admin global acessa o admin global.

Regras de seguranÃ§a:

- NÃ£o criar senha no cadastro administrativo do membro.
- NÃ£o expor service role no frontend.
- Criar usuÃ¡rio Auth apenas em ambiente server-side controlado.
- Normalizar e-mail em lowercase.
- Bloquear primeiro acesso quando houver mais de um membro ativo com o mesmo e-mail.
- Registrar tentativas e aplicar rate limit por e-mail/IP.
- NÃ£o permitir recriaÃ§Ã£o de senha pelo fluxo de primeiro acesso quando o perfil jÃ¡ estiver ativo.
- Usar fluxo separado de recuperaÃ§Ã£o de senha para usuÃ¡rios que esquecerem a senha.
- Registrar auditoria quando o primeiro acesso for concluÃ­do.

### Recursos comuns

- Login seguro.
- Perfil pessoal.
- Ministérios/módulos em que participa.
- Próximos compromissos.
- Escalas.
- Eventos.
- Comunicados.
- Notificações push.
- Confirmação de presença.
- Histórico pessoal permitido.
- Documentos/comprovantes, quando aplicável.

### Regras de privacidade

O membro não deve acessar:

- Dados privados de outros membros.
- Dados administrativos da igreja.
- Dados financeiros globais.
- Módulos dos quais não participa, salvo conteúdo público.

---

## 5. Módulos do Produto

Os módulos seguem o PRD do SirvaOS e serão gerenciados pelo Admin Global no catálogo da plataforma.

Cada cliente poderá ter um conjunto próprio de módulos ativos.

### 5.1 Módulos Core

Obrigatórios para todos os tenants:

- Autenticação e usuários.
- Cadastro unificado de pessoas.
- Permissões.
- Configuração do tenant.
- Tema/white-label.
- Notificações.
- Calendário central.
- Auditoria.
- Arquivos/anexos.

### 5.2 Módulos Prioritários

- Membresia.
- Financeiro.
- Louvor.
- Kids.
- Escola Bíblica.
- ONGs e Ação Social.

### 5.3 Módulos de Expansão

- Jovens.
- Ministério Feminino.
- Ministério Masculino.
- Casais.
- Intercessão/Oração.
- Recepção/Acolhimento.
- Comunicação.
- Patrimônio.
- Eventos Gerais.
- Pequenos Grupos/Células.
- Diaconia.
- Missões.
- Ensino/Discipulado.
- Cursos e Treinamentos.

### 5.4 Módulos de Longo Prazo

- Biblioteca.
- Estúdio/Mídia.
- Portal do Membro consolidado.
- Relatórios Executivos.
- Integração com ERP.

---

## 6. Estrutura Funcional de um Módulo

Todo módulo deve seguir uma estrutura comum.

### Campos/configurações de módulo

- Identificador global do módulo.
- Nome padrão.
- Nome customizado pelo tenant.
- Descrição.
- Ícone.
- Status global: ativo, beta, depreciado.
- Status no tenant: ativo, inativo, contratado, suspenso.
- Permissões disponíveis.
- Recursos mobile disponíveis.
- Integrações permitidas.
- Tipo de dados que o módulo gerencia.

### Recursos mínimos por módulo

- Dashboard do módulo.
- Lista de participantes.
- Funções internas.
- Eventos/agenda.
- Escalas ou atribuições, quando aplicável.
- Comunicados.
- Relatórios.
- Configurações.
- Logs de atividade.

### Recursos mobile por módulo

Cada módulo pode definir quais informações aparecem para membros:

- Próximas escalas.
- Confirmação de presença.
- Materiais.
- Comunicados.
- Histórico pessoal.
- Dados de dependentes, quando aplicável.
- Check-in/check-out, quando aplicável.
- Notificações específicas.

---

## 7. Personalização Visual por Cliente

### 7.1 Entidade Tenant Theme

Cada cliente terá uma configuração visual persistida.

Campos sugeridos:

- `tenant_id`
- `display_name`
- `system_alias`
- `logo_main_url`
- `logo_compact_url`
- `favicon_url`
- `primary_color`
- `secondary_color`
- `accent_color`
- `background_color`
- `text_color`
- `button_radius`
- `font_family`
- `custom_domain`
- `subdomain`
- `menu_overrides`
- `module_name_overrides`

### 7.2 Aplicação do tema

O tema deve ser carregado:

- No painel web do cliente.
- No portal/app do membro.
- Nas páginas públicas do tenant, se existirem.
- Nos e-mails transacionais do tenant.
- Em PDFs e relatórios exportados, quando aplicável.

### 7.3 Restrições

O sistema deve validar:

- Contraste mínimo.
- Formato e peso dos arquivos.
- Cores válidas.
- Uso de imagens seguras.
- Fallback para tema padrão caso algo esteja inválido.

---

## 8. Multi-Tenancy e Isolamento de Dados

### 8.1 Tenant

Tenant representa uma igreja/cliente.

Campos sugeridos:

- `id`
- `name`
- `slug`
- `legal_name`
- `document`
- `status`
- `plan_id`
- `created_at`
- `updated_at`
- `suspended_at`
- `deleted_at`

### 8.2 Estratégia de isolamento

Todo dado operacional deve possuir `tenant_id`.

O sistema deve garantir que:

- Usuários de um tenant não acessem dados de outro tenant.
- Admins de módulo não acessem módulos de outro tenant.
- Consultas sejam sempre filtradas por tenant.
- Logs registrem ações com `tenant_id`, `user_id` e contexto.

Estratégias possíveis:

- Banco único com `tenant_id` e Row-Level Security.
- Schemas separados por tenant.
- Banco separado para tenants enterprise.

Para MVP, recomenda-se **banco único com isolamento forte por `tenant_id` e políticas de acesso**, desde que a tecnologia escolhida suporte isso com segurança.

---

## 9. Permissões e Acesso

### 9.1 Hierarquia Global

1. Super Admin SirvaOS.
2. Operador SirvaOS.
3. Admin Geral do Cliente.
4. Admin de Módulo.
5. Colaborador.
6. Membro.

### 9.2 Modelo recomendado

Usar RBAC com escopo.

Exemplos de escopo:

- Global.
- Tenant.
- Módulo.
- Grupo/equipe.
- Próprio usuário.

Exemplo:

- `tenant.members.read`
- `tenant.members.write`
- `module.louvor.schedule.manage`
- `module.kids.children.read`
- `module.finance.reports.read`
- `global.tenants.manage`

---

## 10. Entidades Centrais

### 10.1 Core

- Tenant.
- Plano.
- Módulo.
- TenantModule.
- Usuário.
- Pessoa/Membro.
- Perfil/Papel.
- Permissão.
- Tema do Tenant.
- Arquivo.
- Notificação.
- Evento.
- Log de Auditoria.

### 10.2 Pessoas e Membresia

- Pessoa.
- Membro.
- Visitante.
- Dependente.
- Família.
- Endereço.
- Contato.
- Status de membresia.
- Histórico de membresia.
- Vínculo com ministérios.

### 10.3 Operação Ministerial

- Ministério/Módulo.
- Equipe.
- Função.
- Participante.
- Escala.
- Evento.
- Confirmação.
- Frequência.
- Comunicado.

### 10.4 Apps Mobile

- AppConfig.
- ModuleMobileConfig.
- Device.
- PushToken.
- AppSession.
- MobileFeatureFlag.
- AppRelease.

---

## 11. Apps Android/iOS por Módulo

### 11.1 Conceito

O SirvaOS deve permitir que módulos tenham experiências mobile específicas.

Cada app ou área mobile deve consumir os mesmos dados centrais do tenant.

Exemplo:

- O módulo de Louvor pode exibir escalas, ensaios, repertório e confirmação.
- O módulo Kids pode exibir comunicados aos pais, check-in, turmas e eventos.
- O módulo Financeiro pode exibir comprovantes e histórico pessoal de contribuições.
- O módulo Escola Bíblica pode exibir aulas, materiais e frequência.

### 11.2 Diretrizes técnicas

Mesmo que existam apps separados, eles devem compartilhar:

- Autenticação.
- API.
- Design system base.
- Sistema de temas.
- Push notifications.
- Controle de permissões.
- Observabilidade.
- Configuração por tenant.

### 11.3 Publicação

Modelos possíveis:

1. **App SirvaOS oficial**
   - Mais rápido para MVP.
   - O usuário seleciona ou entra pelo tenant.

2. **App white-label por igreja**
   - Publicado com nome e marca da igreja.
   - Maior valor comercial.
   - Mais complexo operacionalmente.

3. **App por módulo**
   - Publicado para necessidades específicas.
   - Deve ser usado com critério para evitar fragmentação.

Recomendação inicial:

- MVP com app único modular.
- Evoluir para apps white-label ou por módulo usando a mesma base técnica.

---

## 12. Fluxos Principais

### 12.1 Onboarding de Cliente

1. Super Admin SirvaOS cria o tenant.
2. Define plano contratado.
3. Ativa módulos iniciais.
4. Configura subdomínio.
5. Cria primeiro Admin Geral da igreja.
6. Admin Geral recebe convite.
7. Admin Geral configura logo, cores e dados da igreja.
8. Admin Geral convida líderes de módulo.
9. Líderes configuram seus módulos.
10. Membros são importados ou cadastrados.

### 12.2 Configuração de Marca do Cliente

1. Admin Geral acessa configurações.
2. Faz upload da logo.
3. Define cores.
4. Visualiza prévia.
5. Sistema valida contraste e formatos.
6. Admin salva.
7. Tema passa a ser aplicado no painel, portal, app e comunicações.

### 12.3 Ativação de Módulo

1. Admin Global ativa módulo para o tenant.
2. Admin Geral da igreja visualiza módulo disponível.
3. Admin Geral nomeia Admin de Módulo.
4. Admin de Módulo configura funções, equipes e participantes.
5. Membros passam a visualizar informações no app/portal, conforme permissão.

### 12.4 Escala de Ministério

1. Admin de Módulo cria evento.
2. Seleciona participantes e funções.
3. Publica escala.
4. Sistema notifica membros.
5. Membros confirmam presença pelo app.
6. Admin acompanha confirmações.
7. Após o evento, frequência e histórico são registrados.

---

## 13. Requisitos Funcionais

### 13.1 Admin Global

- Gerenciar tenants.
- Gerenciar planos.
- Gerenciar catálogo de módulos.
- Ativar/desativar módulos por tenant.
- Gerenciar equipe interna SirvaOS.
- Visualizar métricas globais.
- Acessar logs globais.
- Gerenciar identidade institucional SirvaOS.
- Configurar integrações globais.

### 13.2 Admin do Cliente

- Configurar marca do tenant.
- Gerenciar usuários.
- Gerenciar membros.
- Gerenciar módulos ativos.
- Gerenciar permissões.
- Acessar calendário consolidado.
- Enviar comunicados gerais.
- Acessar relatórios.
- Consultar auditoria do tenant.

### 13.3 Módulos

- Cada módulo deve ter CRUD próprio de suas entidades.
- Cada módulo deve respeitar permissões.
- Cada módulo deve integrar com pessoas/membros.
- Cada módulo deve integrar com eventos/calendário quando aplicável.
- Cada módulo deve expor dados mobile quando configurado.

### 13.4 Mobile

- Login do membro.
- Listagem de módulos disponíveis para o membro.
- Notificações.
- Eventos e escalas.
- Confirmações.
- Histórico pessoal.
- Conteúdos persistentes do módulo.

---

## 14. Requisitos Não-Funcionais

### Segurança

- HTTPS obrigatório.
- Senhas com hash seguro.
- 2FA para perfis administrativos.
- Rate limiting em autenticação.
- Auditoria de ações críticas.
- Isolamento por tenant.
- Proteção extra para dados financeiros e sensíveis.

### LGPD

- Consentimento explícito.
- Política de privacidade por tenant.
- Exportação de dados do membro.
- Anonimização/exclusão mediante solicitação autorizada.
- Log de acesso a dados sensíveis.

### Performance

- Painel web com carregamento inicial abaixo de 2 segundos em condições comuns.
- APIs críticas com resposta abaixo de 500ms no percentil 95.
- App mobile com navegação fluida.

### Disponibilidade

- Backup automático diário.
- Retenção mínima de 30 dias.
- Monitoramento de erros.
- Logs centralizados.
- Plano de recuperação.

---

## 15. MVP Recomendado

### Entrega 1 — Plataforma Base

- Admin Global SirvaOS.
- Cadastro de tenants.
- Cadastro de usuários.
- Autenticação.
- RBAC inicial.
- Configuração de tema por tenant.
- Catálogo de módulos.
- Ativação de módulos por tenant.

### Entrega 2 — Cliente/Igreja

- Painel Admin do Cliente.
- Cadastro unificado de membros.
- Módulo de Membresia.
- Calendário central.
- Notificações básicas.

### Entrega 3 — Primeiro Módulo Operacional

- Módulo de Louvor.
- Equipes/funções.
- Eventos.
- Escalas.
- Confirmação de presença.
- Visualização mobile inicial.

### Entrega 4 — Expansão Inicial

- Financeiro.
- Kids.
- Escola Bíblica.
- App mobile modular ou PWA inicial.

---

## 16. Fora do Escopo Inicial

- Marketplace de módulos.
- Publicação automatizada de dezenas de apps separados.
- ERP contábil completo.
- Rede social interna.
- Streaming.
- E-commerce.
- Internacionalização completa.
- Customização de código por cliente.

---

## 17. Decisões Pendentes

Antes da implementação, ainda será necessário decidir:

- Stack web.
- Stack mobile.
- Banco de dados.
- Estratégia final de isolamento multi-tenant.
- Modelo de publicação dos apps.
- Identidade visual oficial SirvaOS.
- Domínio oficial.
- Política comercial de planos e módulos.
- Nível de white-label disponível por plano.
- Se haverá PWA antes dos apps nativos.

---

## 18. Glossário

| Termo | Definição |
|---|---|
| SirvaOS | Plataforma SaaS de gestão para igrejas |
| Tenant | Cliente/igreja dentro da plataforma |
| Admin Global | Administração interna da plataforma SirvaOS |
| Admin do Cliente | Administração da igreja contratante |
| Módulo | Unidade funcional do sistema, geralmente associada a ministério ou área |
| White-label | Personalização da plataforma com identidade do cliente |
| App por módulo | Experiência mobile específica para um módulo |
| RBAC | Controle de acesso baseado em papéis |
| LGPD | Lei Geral de Proteção de Dados |

---

## 19. Direção de Produto

O SirvaOS deve ser percebido como:

- Uma plataforma séria e confiável para liderança.
- Simples o suficiente para líderes ministeriais usarem sem fricção.
- Acessível para membros pelo celular.
- Flexível para igrejas diferentes.
- Modular para crescer com cada cliente.
- Seguro para armazenar dados pessoais, ministeriais e financeiros.

Slogan base:

> **SirvaOS: organize para servir melhor.**
