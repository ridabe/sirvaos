-- ============================================================
-- Etapa 12 – Módulo de Eventos
-- Agenda institucional da igreja (independente do Louvor)
-- ============================================================

-- ── 1. Expandir tenant_events com novos campos ────────────────────────────────

ALTER TABLE public.tenant_events
  ADD COLUMN IF NOT EXISTS ends_at          timestamptz,
  ADD COLUMN IF NOT EXISTS event_type       text NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS color            text NOT NULL DEFAULT '#6d28d9',
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS cover_image_url  text,
  ADD COLUMN IF NOT EXISTS created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tenant_events
  DROP CONSTRAINT IF EXISTS tenant_events_event_type_check;
ALTER TABLE public.tenant_events
  ADD CONSTRAINT tenant_events_event_type_check CHECK (
    event_type IN ('culto','conferencia','retiro','jovens','infantil','social','outro')
  );

ALTER TABLE public.tenant_events
  DROP CONSTRAINT IF EXISTS tenant_events_status_check;
ALTER TABLE public.tenant_events
  ADD CONSTRAINT tenant_events_status_check CHECK (
    status IN ('rascunho','publicado','cancelado')
  );

CREATE INDEX IF NOT EXISTS idx_tenant_events_tenant_date   ON public.tenant_events(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_tenant_events_tenant_status ON public.tenant_events(tenant_id, status);

-- ── 2. Log de envio de notificações de eventos ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_notifications_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id         uuid        NOT NULL REFERENCES public.tenant_events(id) ON DELETE CASCADE,
  channel          text        NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  recipient_count  integer     NOT NULL DEFAULT 0,
  sent_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            text,
  CONSTRAINT event_notifications_log_channel_check CHECK (
    channel IN ('email','whatsapp','push')
  )
);

ALTER TABLE public.event_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_event_notifications_log_event ON public.event_notifications_log(event_id);

-- Leitura apenas para admins do tenant
CREATE POLICY "Tenant admins read event notifications"
ON public.event_notifications_log FOR SELECT TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (app_private.is_tenant_admin() OR app_private.is_global_admin())
);

-- Escrita para admins e admin do módulo
CREATE POLICY "Tenant authorized insert event notifications"
ON public.event_notifications_log FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('events')
  )
);

GRANT SELECT, INSERT ON public.event_notifications_log TO authenticated;

-- ── 3. Atualizar RLS do tenant_events ────────────────────────────────────────

-- Remove políticas antigas (criadas em etapas anteriores)
DROP POLICY IF EXISTS "Tenant members can read tenant events"         ON public.tenant_events;
DROP POLICY IF EXISTS "Tenant admins can manage tenant events"        ON public.tenant_events;
DROP POLICY IF EXISTS "Tenant authorized can manage tenant events"    ON public.tenant_events;

-- Membros autenticados do tenant veem apenas eventos publicados
-- (admins e gestores do módulo veem todos os status)
CREATE POLICY "Tenant members see published events"
ON public.tenant_events FOR SELECT TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (
    status = 'publicado'
    OR app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('events')
  )
);

-- Admin global, admin tenant ou admin do módulo podem criar/editar/excluir
CREATE POLICY "Tenant authorized manage events"
ON public.tenant_events FOR ALL TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('events')
  )
)
WITH CHECK (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('events')
  )
);

-- ── 4. Registrar módulo events no catálogo global ────────────────────────────

INSERT INTO public.platform_modules (code, name, description, status, icon_name, sort_order)
VALUES (
  'events',
  'Eventos',
  'Agenda institucional da igreja — cultos, conferências, retiros e comunicação em massa para todos os membros.',
  'active',
  'CalendarDays',
  30
)
ON CONFLICT (code) DO UPDATE SET
  name        = excluded.name,
  description = excluded.description,
  status      = excluded.status,
  icon_name   = excluded.icon_name,
  sort_order  = excluded.sort_order;
