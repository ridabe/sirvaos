-- ============================================================
-- Intercessão — permitir que solicitante leia seus próprios pedidos
-- quando gravados com member_id (ex: app legacy/mobile)
-- ============================================================

DROP POLICY IF EXISTS "Requester reads own requests" ON public.prayer_requests;
CREATE POLICY "Requester reads own requests"
  ON public.prayer_requests FOR SELECT
  USING (
    is_anonymous = false
    AND tenant_id = app_private.current_tenant_id()
    AND (
      profile_id = auth.uid()
      OR member_id = app_private.current_member_id()
    )
  );
