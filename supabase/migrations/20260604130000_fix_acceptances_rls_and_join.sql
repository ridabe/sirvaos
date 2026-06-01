-- ── 1. Corrige RLS de user_policy_acceptances (owner + admin) ─────────────

DROP POLICY IF EXISTS "own_acceptance_read"             ON user_policy_acceptances;
DROP POLICY IF EXISTS "own_acceptance_insert"           ON user_policy_acceptances;
DROP POLICY IF EXISTS "tenant_admin_view_acceptances"   ON user_policy_acceptances;

-- Usuário lê/insere seus próprios aceites
CREATE POLICY "own_acceptance_read" ON user_policy_acceptances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_acceptance_insert" ON user_policy_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Owner ou admin do tenant lê todos os aceites do seu tenant
CREATE POLICY "tenant_admin_view_acceptances" ON user_policy_acceptances
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- ── 2. Corrige RLS de lgpd_consents (owner + admin) ──────────────────────

DROP POLICY IF EXISTS "own_lgpd_read"          ON lgpd_consents;
DROP POLICY IF EXISTS "own_lgpd_write"         ON lgpd_consents;
DROP POLICY IF EXISTS "tenant_admin_view_lgpd" ON lgpd_consents;

CREATE POLICY "own_lgpd_read" ON lgpd_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_lgpd_write" ON lgpd_consents
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tenant_admin_view_lgpd" ON lgpd_consents
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- ── 3. FK de user_policy_acceptances.user_id → profiles.id ────────────────
-- Permite que PostgREST faça o join automático com a tabela profiles
-- (profiles.id = auth.users.id, então é safe adicionar a FK)
ALTER TABLE user_policy_acceptances
  ADD CONSTRAINT user_policy_acceptances_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ── 4. FK de lgpd_consents.user_id → profiles.id ─────────────────────────
ALTER TABLE lgpd_consents
  ADD CONSTRAINT lgpd_consents_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
