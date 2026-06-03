-- ============================================================
-- Etapa 15 — Módulo de Intercessão
-- ============================================================
-- Tabelas: prayer_requests, prayer_assignments
-- Seed: cargo "Intercessor" + ministério "Intercessão" (system-wide)
-- Módulo: intercession em platform_modules
-- Trigger: seed automático para novos tenants via provision
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Módulo intercession em platform_modules
-- ----------------------------------------------------------------
INSERT INTO public.platform_modules (code, name, description, sort_order, status)
VALUES (
  'intercession',
  'Intercessão',
  'Recebimento e gestão de pedidos de oração. Admins distribuem pedidos a intercessores; membros acompanham o status.',
  50,
  'active'
)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- ----------------------------------------------------------------
-- 2. Seed sistema: cargo "Intercessor" e ministério "Intercessão"
--    (tenant_id IS NULL = registro de sistema, disponível para todos)
-- ----------------------------------------------------------------
INSERT INTO public.catalog_roles (tenant_id, name)
VALUES (NULL, 'Intercessor')
ON CONFLICT DO NOTHING;

INSERT INTO public.catalog_ministries (tenant_id, name)
VALUES (NULL, 'Intercessão')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 3. Tabela prayer_requests
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  -- NULL quando anônimo; sistema mantém o id mas não expõe o nome
  member_id     uuid        REFERENCES public.members (id) ON DELETE SET NULL,
  -- profile_id para envio de push ao solicitante (NULL se anônimo)
  profile_id    uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  is_anonymous  boolean     NOT NULL DEFAULT false,
  content       text        NOT NULL CHECK (char_length(content) BETWEEN 5 AND 1000),
  status        text        NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'assigned', 'interceding', 'done')),
  source        text        NOT NULL DEFAULT 'portal'
                            CHECK (source IN ('portal', 'app')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayer_requests_tenant_status_idx
  ON public.prayer_requests (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS prayer_requests_tenant_member_idx
  ON public.prayer_requests (tenant_id, member_id);

DROP TRIGGER IF EXISTS set_prayer_requests_updated_at ON public.prayer_requests;
CREATE TRIGGER set_prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 4. Tabela prayer_assignments
--    Um pedido → um intercessor (1-to-1); pedido pode ser reatribuído
--    somente se o anterior cancelar (status = 'cancelled')
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prayer_assignments (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  prayer_request_id    uuid        NOT NULL REFERENCES public.prayer_requests (id) ON DELETE CASCADE,
  -- membro intercessor que recebe o pedido
  assigned_member_id   uuid        NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  -- profile do intercessor para push notifications
  assigned_profile_id  uuid        REFERENCES public.profiles (id) ON DELETE SET NULL,
  -- admin que fez a atribuição
  assigned_by_profile_id uuid      REFERENCES public.profiles (id) ON DELETE SET NULL,
  assigned_at          timestamptz NOT NULL DEFAULT now(),
  status               text        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'interceding', 'done', 'cancelled')),
  started_at           timestamptz,
  completed_at         timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayer_assignments_request_idx
  ON public.prayer_assignments (prayer_request_id, status);

CREATE INDEX IF NOT EXISTS prayer_assignments_member_status_idx
  ON public.prayer_assignments (tenant_id, assigned_member_id, status);

DROP TRIGGER IF EXISTS set_prayer_assignments_updated_at ON public.prayer_assignments;
CREATE TRIGGER set_prayer_assignments_updated_at
  BEFORE UPDATE ON public.prayer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 5. RLS — prayer_requests
-- ----------------------------------------------------------------
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Admins do tenant (owner/admin) e admins do módulo intercession veem todos
DROP POLICY IF EXISTS "Intercession admins read all requests" ON public.prayer_requests;
CREATE POLICY "Intercession admins read all requests"
  ON public.prayer_requests FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
    AND (
      -- owner/admin do tenant
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND tenant_id = prayer_requests.tenant_id
          AND tenant_role IN ('owner', 'admin')
      )
      OR
      -- admin do módulo intercession
      EXISTS (
        SELECT 1 FROM public.tenant_module_admins tma
        JOIN public.platform_modules pm ON pm.id = tma.module_id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE tma.tenant_id = prayer_requests.tenant_id
          AND pm.code = 'intercession'
          AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
      )
    )
  );

-- Membro intercessor do ministério vê pedidos atribuídos a ele
DROP POLICY IF EXISTS "Intercessor reads assigned requests" ON public.prayer_requests;
CREATE POLICY "Intercessor reads assigned requests"
  ON public.prayer_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.prayer_assignments pa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE pa.prayer_request_id = prayer_requests.id
        AND pa.assigned_member_id = p.member_id
        AND pa.status IN ('pending', 'interceding')
        AND p.status = 'active'
    )
  );

-- Solicitante não-anônimo vê seus próprios pedidos
DROP POLICY IF EXISTS "Requester reads own requests" ON public.prayer_requests;
CREATE POLICY "Requester reads own requests"
  ON public.prayer_requests FOR SELECT
  USING (
    is_anonymous = false
    AND profile_id = auth.uid()
  );

-- Qualquer membro ativo do tenant pode inserir pedido
DROP POLICY IF EXISTS "Members can create prayer requests" ON public.prayer_requests;
CREATE POLICY "Members can create prayer requests"
  ON public.prayer_requests FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

-- Apenas admins do tenant/módulo podem atualizar status
DROP POLICY IF EXISTS "Intercession admins update requests" ON public.prayer_requests;
CREATE POLICY "Intercession admins update requests"
  ON public.prayer_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = prayer_requests.tenant_id
        AND p.tenant_role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_module_admins tma
      JOIN public.platform_modules pm ON pm.id = tma.module_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE tma.tenant_id = prayer_requests.tenant_id
        AND pm.code = 'intercession'
        AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
    )
  );

-- ----------------------------------------------------------------
-- 6. RLS — prayer_assignments
-- ----------------------------------------------------------------
ALTER TABLE public.prayer_assignments ENABLE ROW LEVEL SECURITY;

-- Admins do tenant/módulo veem todas as atribuições
DROP POLICY IF EXISTS "Intercession admins read assignments" ON public.prayer_assignments;
CREATE POLICY "Intercession admins read assignments"
  ON public.prayer_assignments FOR SELECT
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND tenant_id = prayer_assignments.tenant_id
          AND tenant_role IN ('owner', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.tenant_module_admins tma
        JOIN public.platform_modules pm ON pm.id = tma.module_id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE tma.tenant_id = prayer_assignments.tenant_id
          AND pm.code = 'intercession'
          AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
      )
    )
  );

-- Intercessor vê seus próprios assignments
DROP POLICY IF EXISTS "Intercessor reads own assignments" ON public.prayer_assignments;
CREATE POLICY "Intercessor reads own assignments"
  ON public.prayer_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.member_id = prayer_assignments.assigned_member_id
        AND p.status = 'active'
    )
  );

-- Admins criam atribuições
DROP POLICY IF EXISTS "Intercession admins create assignments" ON public.prayer_assignments;
CREATE POLICY "Intercession admins create assignments"
  ON public.prayer_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = prayer_assignments.tenant_id
        AND p.tenant_role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_module_admins tma
      JOIN public.platform_modules pm ON pm.id = tma.module_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE tma.tenant_id = prayer_assignments.tenant_id
        AND pm.code = 'intercession'
        AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
    )
  );

-- Intercessor atualiza seu próprio assignment (marcar interceding/done)
-- Admins também podem atualizar (ex: cancelar)
DROP POLICY IF EXISTS "Intercessor and admins update assignments" ON public.prayer_assignments;
CREATE POLICY "Intercessor and admins update assignments"
  ON public.prayer_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.member_id = prayer_assignments.assigned_member_id
        AND p.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = prayer_assignments.tenant_id
        AND p.tenant_role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_module_admins tma
      JOIN public.platform_modules pm ON pm.id = tma.module_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE tma.tenant_id = prayer_assignments.tenant_id
        AND pm.code = 'intercession'
        AND (tma.profile_id = auth.uid() OR tma.member_id = p.member_id)
    )
  );

-- ----------------------------------------------------------------
-- 7. Grants
-- ----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.prayer_requests    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.prayer_assignments TO authenticated;
