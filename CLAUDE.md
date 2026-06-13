# SirvaOS — Memória do Projeto

SaaS multi-tenant white-label de gestão eclesiástica (igrejas). Stack: React + Vite (web), Expo/React Native (app), Supabase (Postgres + RLS + Edge Functions). Provedores: Resend (e-mail), Z-API (WhatsApp), Supabase Storage.

## ⚠️ Fonte da verdade dos FLUXOS

**Antes de criar, alterar ou explicar qualquer fluxo de um módulo, CONSULTE `docs/fluxos-modulos.md`.**

Esse é o documento vivo com todos os fluxos detalhados de cada módulo (início → fim, integrações, tabelas, Edge Functions, RLS). **Sempre que um fluxo for criado ou alterado, ATUALIZE `docs/fluxos-modulos.md`** (e a data no topo dele). Ele é usado para entender fluxos e para gerar tutoriais de uso para clientes.

## Documentos-chave

- `docs/fluxos-modulos.md` — **fluxos por módulo (consultar/atualizar sempre).**
- `docs/spec-sirvaos.md` — especificação do produto.
- `docs/prd-sirvaos.docx` — PRD.
- `docs/roadmap-etapas.md` — **roadmap único:** etapas de construção (1–15) + Fase 2 de diferenciação (Frentes A–G) + Apêndice A1 (contratos do dashboard do pastor).
- `docs/pendencias.md` — pendências por módulo.
- `docs/identidade-visual.md` — guia visual / tokens de cor.
- `estudo-competitivo-sirvaos.html` (raiz do projeto) — análise competitiva e estratégia.

## Convenções rápidas

- Multi-tenant por `tenant_id` + RLS (`app_private.current_tenant_id()` e helpers de papel).
- Papéis: `super_admin`/`operations` (Admin Global) · `owner`/`admin` (igreja) · admin de módulo (`tenant_module_admins`) · `member`.
- Módulos ativáveis por tenant (`tenant_modules`), códigos: `members`, `events`, `announcements`, `social_media`, `worship`, `financial`, `intercession`, `kids`, `bible-school`.
- Edge Functions ficam em `supabase/functions/`; migrations em `supabase/migrations/`.
- WhatsApp via Z-API: secrets no Supabase (`ZAPI_URL`, `ZAPI_CLIENT_TOKEN`); logs em `whatsapp_messages`.
