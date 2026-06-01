-- Corrige RLS de tenant_policies para aceitar 'owner' e 'admin'

DROP POLICY IF EXISTS "tenant_admin_manage_policies" ON tenant_policies;
DROP POLICY IF EXISTS "tenant_members_view_policies" ON tenant_policies;
DROP POLICY IF EXISTS "super_admin_view_policies" ON tenant_policies;

-- Escrita: owner ou admin do tenant
CREATE POLICY "tenant_admin_manage_policies" ON tenant_policies
  FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT tenant_role FROM profiles WHERE id = auth.uid()) IN ('owner', 'admin')
  );

-- Leitura: qualquer membro do tenant (para o footer e o modal de aceite)
CREATE POLICY "tenant_members_view_policies" ON tenant_policies
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Leitura: super_admin global vê tudo
CREATE POLICY "super_admin_view_policies" ON tenant_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND global_role IN ('super_admin', 'operations')
    )
  );
