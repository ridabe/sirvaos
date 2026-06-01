-- ============================================================
-- Etapa 11 – Produção e Escala
-- Monitoramento de erros, LGPD, termos por tenant
-- ============================================================

-- ── 1. Políticas por tenant (termos de uso + privacidade) ──────────────────

CREATE TABLE IF NOT EXISTS tenant_policies (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  terms_text    text        NOT NULL DEFAULT '',
  privacy_text  text        NOT NULL DEFAULT '',
  version       integer     NOT NULL DEFAULT 1,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- ── 2. Aceites de política pelos usuários ─────────────────────────────────

CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  policy_version  integer     NOT NULL DEFAULT 1,
  accepted_at     timestamptz NOT NULL DEFAULT now(),
  ip_address      text,
  UNIQUE(user_id, tenant_id, policy_version)
);

-- ── 3. Consentimentos LGPD ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lgpd_consents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 'data_processing' | 'marketing' | 'data_deletion_request'
  consent_type  text        NOT NULL,
  granted       boolean     NOT NULL DEFAULT true,
  consented_at  timestamptz NOT NULL DEFAULT now(),
  ip_address    text,
  notes         text,
  UNIQUE(user_id, tenant_id, consent_type)
);

-- ── 4. Log de erros da aplicação ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_error_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type     text        NOT NULL,
  error_message  text        NOT NULL,
  error_stack    text,
  context        jsonb,
  url            text,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE tenant_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_policy_acceptances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd_consents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_error_logs           ENABLE ROW LEVEL SECURITY;

-- tenant_policies: admin do tenant gerencia; membros do mesmo tenant veem
CREATE POLICY "tenant_admin_manage_policies" ON tenant_policies
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "tenant_members_view_policies" ON tenant_policies
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- super_admin vê tudo
CREATE POLICY "super_admin_view_policies" ON tenant_policies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

-- user_policy_acceptances: usuário insere/lê os próprios; admin do tenant vê do seu tenant
CREATE POLICY "own_acceptance_read" ON user_policy_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_acceptance_insert" ON user_policy_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_admin_view_acceptances" ON user_policy_acceptances
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- lgpd_consents: usuário gerencia seus próprios; admin do tenant vê do seu tenant
CREATE POLICY "own_lgpd_read" ON lgpd_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_lgpd_write" ON lgpd_consents
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_admin_view_lgpd" ON lgpd_consents
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- app_error_logs: qualquer um (mesmo anônimo) pode inserir; super_admin lê tudo
CREATE POLICY "anyone_insert_error_log" ON app_error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "super_admin_view_error_logs" ON app_error_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role IN ('super_admin', 'operations'))
  );

-- ── 6. Função helper: registrar aceite de política ────────────────────────

CREATE OR REPLACE FUNCTION accept_tenant_policy(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version integer;
BEGIN
  SELECT COALESCE(version, 1) INTO v_version
  FROM tenant_policies
  WHERE tenant_id = p_tenant_id;

  IF v_version IS NULL THEN
    v_version := 1;
  END IF;

  INSERT INTO user_policy_acceptances (user_id, tenant_id, policy_version)
  VALUES (auth.uid(), p_tenant_id, v_version)
  ON CONFLICT (user_id, tenant_id, policy_version) DO NOTHING;
END;
$$;

-- ── 7. Registrar 'policies' como tab no catálogo (informativo) ─────────────
-- (não é um módulo separado, apenas config interna do tenant)
