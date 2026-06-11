-- Fix: policies were using split_part(name, '/', 2) to extract the tenant UUID,
-- but the storage path is {tenantId}/logo, so the UUID is at position 1, not 2.
-- Position 2 returned "logo", which never matched the UUID regex, blocking all uploads.

DROP POLICY IF EXISTS "Admins can insert tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tenant logos" ON storage.objects;

CREATE POLICY "Admins can insert tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (
    app_private.is_global_admin()
    OR (
      app_private.is_tenant_admin()
      AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      AND split_part(name, '/', 1)::uuid = app_private.current_tenant_id()
    )
  )
);

CREATE POLICY "Admins can update tenant logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-logos'
  AND (
    app_private.is_global_admin()
    OR (
      app_private.is_tenant_admin()
      AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      AND split_part(name, '/', 1)::uuid = app_private.current_tenant_id()
    )
  )
)
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND (
    app_private.is_global_admin()
    OR (
      app_private.is_tenant_admin()
      AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      AND split_part(name, '/', 1)::uuid = app_private.current_tenant_id()
    )
  )
);

CREATE POLICY "Admins can delete tenant logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-logos'
  AND (
    app_private.is_global_admin()
    OR (
      app_private.is_tenant_admin()
      AND split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      AND split_part(name, '/', 1)::uuid = app_private.current_tenant_id()
    )
  )
);
