-- Renomeia registros de auditoria que ainda usam "Tenant" como termo visível ao usuário.
-- Todos os novos registros já usarão "Cliente" conforme atualização do código-fonte.

UPDATE public.audit_logs SET
  action      = REPLACE(action,      'Tenant ·', 'Cliente ·'),
  entity_type = REPLACE(entity_type, 'Tenant',   'Cliente')
WHERE action LIKE 'Tenant%' OR entity_type LIKE 'Tenant%';
