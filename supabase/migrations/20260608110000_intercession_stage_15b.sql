-- ============================================================
-- Etapa 15b — Intercessão: moderação, histórico e configuração
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Coluna de moderação em prayer_requests
--    moderation_status: null = sem moderação ativa no tenant
--    'pending_review' = aguardando aprovação do admin
--    'approved'       = aprovado, visível para distribuição
--    'rejected'       = rejeitado, não distribuído
-- ----------------------------------------------------------------
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS moderation_status text
    CHECK (moderation_status IN ('pending_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS moderated_by_profile_id uuid
    REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- ----------------------------------------------------------------
-- 2. Configuração de moderação por tenant
--    Armazenada em tenant_settings (chave/valor genérico)
--    Se a tabela não existir, usaremos app_config-style em prayer_requests
--    → Adicionamos coluna em tenants para feature flags simples
--    Usaremos uma tabela dedicada de configuração por módulo
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_module_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  module_code text        NOT NULL,
  key         text        NOT NULL,
  value       text        NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_code, key)
);

ALTER TABLE public.tenant_module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage module settings" ON public.tenant_module_settings;
CREATE POLICY "Admins manage module settings"
  ON public.tenant_module_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = tenant_module_settings.tenant_id
        AND p.tenant_role IN ('owner', 'admin')
        AND p.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_module_admins tma
      JOIN public.platform_modules pm ON pm.id = tma.module_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE tma.tenant_id = tenant_module_settings.tenant_id
        AND pm.code = tenant_module_settings.module_code
        AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = tenant_module_settings.tenant_id
        AND p.tenant_role IN ('owner', 'admin')
        AND p.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_module_admins tma
      JOIN public.platform_modules pm ON pm.id = tma.module_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE tma.tenant_id = tenant_module_settings.tenant_id
        AND pm.code = tenant_module_settings.module_code
        AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_module_settings TO authenticated;

-- ----------------------------------------------------------------
-- 3. Índice adicional para relatórios por período
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS prayer_requests_tenant_created_idx
  ON public.prayer_requests (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prayer_assignments_completed_idx
  ON public.prayer_assignments (tenant_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- ----------------------------------------------------------------
-- 4. Policy de moderação: admin pode atualizar moderation_status
--    (a policy "Intercession admins update requests" já cobre UPDATE,
--     apenas garantimos que a coluna pode ser escrita)
-- ----------------------------------------------------------------
-- Nenhuma alteração adicional necessária — já coberto pela policy existente.
