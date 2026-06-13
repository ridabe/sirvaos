# Documentação — SirvaOS

> **Projeto:** SirvaOS — SaaS multi-tenant white-label de gestão eclesiástica
> **Última atualização:** 2026-06-13

Esta pasta foi organizada para ter **uma fonte por assunto** (sem duplicações). Para entender qualquer fluxo de módulo, comece por `fluxos-modulos.md`.

## Índice

| Documento | O que é | Status |
|---|---|---|
| [fluxos-modulos.md](./fluxos-modulos.md) | **Fonte da verdade dos fluxos** de cada módulo (início→fim, integrações). Consultar e atualizar sempre que um fluxo mudar. | Vivo |
| [spec-sirvaos.md](./spec-sirvaos.md) | Especificação funcional e arquitetura do produto. | Vivo |
| [prd-sirvaos.docx](./prd-sirvaos.docx) | PRD — requisitos de produto. | Vivo |
| [roadmap-etapas.md](./roadmap-etapas.md) | **Roadmap único:** etapas de construção (1–15) + Fase 2 de diferenciação (Frentes A–G) + Apêndice A1. | Vivo |
| [pendencias.md](./pendencias.md) | Pendências/melhorias por módulo. | Vivo |
| [identidade-visual.md](./identidade-visual.md) | Guia visual: paleta, tokens de cor, direção. | Referência |
| [apresentacao-diretoria.md](./apresentacao-diretoria.md) | Resumo executivo (histórico, mai/2026). | Histórico |
| [Manual-Acesso-SirvaOS.pdf](./Manual-Acesso-SirvaOS.pdf) | Manual de acesso para clientes. | Cliente |
| [email-boas-vindas-cliente.html](./email-boas-vindas-cliente.html) | Template do e-mail de boas-vindas (onboarding). | Asset |
| [roteiros/](./roteiros/) | Roteiros de vídeos explicativos (louvor, intercessão). | Asset |
| [visual/](./visual/) | Logos, paletas e brand boards. | Asset |

## Convenções

- **Antes de criar/alterar/explicar um fluxo:** consultar `fluxos-modulos.md` (regra também registrada no `CLAUDE.md` da raiz).
- **Ao mudar um fluxo:** atualizar `fluxos-modulos.md` (e a data no topo dele).
- Multi-tenant por `tenant_id` + RLS; módulos ativáveis por `tenant_modules`. Detalhes em `fluxos-modulos.md` §0.

## Histórico de organização

- 2026-06-13 — Pasta reorganizada: consolidados os arquivos de etapa/fase em `roadmap-etapas.md`; removidos redundantes/defasados (`supabase.md`, `integracao.md`, `modulos.md`, `visao-geral.md`, `apresentacao-diretoria.pdf`, `preview-email-reenvio.html` e os docs por-módulo de Intercessão); roteiros movidos para `roteiros/`.
