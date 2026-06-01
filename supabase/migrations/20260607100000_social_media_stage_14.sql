-- ============================================================
-- Etapa 14 – Módulo de Mídias Sociais (YouTube)
-- Canais e playlists do YouTube vinculados ao tenant
-- ============================================================

-- ── 1. Tabela de canais de mídia social ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.social_media_channels (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  platform         text        NOT NULL DEFAULT 'youtube',
  channel_type     text        NOT NULL DEFAULT 'channel',
  channel_id       text        NOT NULL,
  channel_url      text,
  description      text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_media_channels_platform_check CHECK (platform IN ('youtube')),
  CONSTRAINT social_media_channels_type_check     CHECK (channel_type IN ('channel', 'playlist'))
);

ALTER TABLE public.social_media_channels ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_media_channels_tenant
  ON public.social_media_channels(tenant_id);

-- ── 2. RLS policies ─────────────────────────────────────────────────────────

-- Todos os membros autenticados do tenant visualizam canais ativos
DROP POLICY IF EXISTS "Tenant members see social media channels" ON public.social_media_channels;
CREATE POLICY "Tenant members see social media channels"
ON public.social_media_channels FOR SELECT TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND is_active = true
);

-- Admins e admin do módulo podem ver todos (inclusive inativos)
DROP POLICY IF EXISTS "Tenant admins see all social media channels" ON public.social_media_channels;
CREATE POLICY "Tenant admins see all social media channels"
ON public.social_media_channels FOR SELECT TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('social_media')
  )
);

-- Admin global, admin tenant ou admin do módulo criam/editam/excluem
DROP POLICY IF EXISTS "Tenant authorized manage social media channels" ON public.social_media_channels;
CREATE POLICY "Tenant authorized manage social media channels"
ON public.social_media_channels FOR ALL TO authenticated
USING (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('social_media')
  )
)
WITH CHECK (
  tenant_id = app_private.current_tenant_id()
  AND (
    app_private.is_global_admin()
    OR app_private.is_tenant_admin()
    OR app_private.can_manage_module('social_media')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_media_channels TO authenticated;

-- ── 3. Registrar módulo social_media no catálogo global ─────────────────────

INSERT INTO public.platform_modules (code, name, description, status, icon_name, sort_order)
VALUES (
  'social_media',
  'Mídias Sociais',
  'Vincule canais e playlists do YouTube para que os membros assistam a vídeos da igreja diretamente no sistema.',
  'active',
  'Play',
  40
)
ON CONFLICT (code) DO UPDATE SET
  name        = excluded.name,
  description = excluded.description,
  status      = excluded.status,
  icon_name   = excluded.icon_name,
  sort_order  = excluded.sort_order;
