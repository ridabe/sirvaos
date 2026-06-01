-- ============================================================
-- Etapa 13 – Módulo de Comunicados
-- Rich text, log de notificações e módulo no catálogo
-- ============================================================

-- ── 1. Adicionar message_html à tabela existente ─────────────────────────────

ALTER TABLE public.tenant_announcements
  ADD COLUMN IF NOT EXISTS message_html text,
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_announcements_tenant_date
  ON public.tenant_announcements(tenant_id, published_at DESC);

-- ── 2. Log de envio de notificações de comunicados ──────────────────────────

CREATE TABLE IF NOT EXISTS public.announcement_notifications_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  announcement_id  uuid        NOT NULL REFERENCES public.tenant_announcements(id) ON DELETE CASCADE,
  channel          text        NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  recipient_count  integer     NOT NULL DEFAULT 0,
  sent_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            text,
  CONSTRAINT announcement_notifications_log_channel_check CHECK (
    channel IN ('email', 'whatsapp', 'push')
  )
);

ALTER TABLE public.announcement_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_announcement_notifications_log_ann
  ON public.announcement_notifications_log(announcement_id);

-- Admins do tenant lêem o log
DROP POLICY IF EXISTS "Tenant admins read announcement notifications" ON public.announcement_notifications_log;
CREATE POLICY "Tenant admins read announcement notifications"
ON public.announcement_notifications_log FOR SELECT TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (app_private.is_tenant_admin() OR app_private.is_global_admin())
);

-- Admins e admin do módulo podem inserir
DROP POLICY IF EXISTS "Tenant authorized insert announcement notifications" ON public.announcement_notifications_log;
CREATE POLICY "Tenant authorized insert announcement notifications"
ON public.announcement_notifications_log FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('announcements')
  )
);

GRANT SELECT, INSERT ON public.announcement_notifications_log TO authenticated;

-- ── 3. Atualizar RLS de tenant_announcements ─────────────────────────────────

-- Remove políticas antigas criadas na Etapa 3 e no módulo de acesso admin
DROP POLICY IF EXISTS "Tenant members can read tenant announcements"   ON public.tenant_announcements;
DROP POLICY IF EXISTS "Tenant admins can manage tenant announcements"  ON public.tenant_announcements;
DROP POLICY IF EXISTS "Authorized manage tenant announcements"         ON public.tenant_announcements;

-- Todos os membros autenticados do tenant podem ler comunicados
DROP POLICY IF EXISTS "Tenant members see announcements" ON public.tenant_announcements;
CREATE POLICY "Tenant members see announcements"
ON public.tenant_announcements FOR SELECT TO authenticated
USING (tenant_id = app_private.current_tenant_id());

-- Admin global, admin tenant ou admin do módulo criam/editam/excluem
DROP POLICY IF EXISTS "Tenant authorized manage announcements" ON public.tenant_announcements;
CREATE POLICY "Tenant authorized manage announcements"
ON public.tenant_announcements FOR ALL TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('announcements')
  )
)
WITH CHECK (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('announcements')
  )
);

-- ── 4. Registrar módulo announcements no catálogo global ─────────────────────

INSERT INTO public.platform_modules (code, name, description, status, icon_name, sort_order)
VALUES (
  'announcements',
  'Comunicados',
  'Publicação de comunicados gerais da igreja com texto rico — envio por e-mail, WhatsApp e push para todos os membros.',
  'active',
  'Bell',
  35
)
ON CONFLICT (code) DO UPDATE SET
  name        = excluded.name,
  description = excluded.description,
  status      = excluded.status,
  icon_name   = excluded.icon_name,
  sort_order  = excluded.sort_order;
