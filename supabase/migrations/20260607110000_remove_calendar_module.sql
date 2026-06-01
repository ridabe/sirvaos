-- Remove o módulo "Calendário Central" (code = 'calendar') do catálogo.
-- tenant_modules referencia platform_modules via FK com ON DELETE CASCADE,
-- portanto registros associados em tenant_modules são removidos automaticamente.
DELETE FROM public.platform_modules WHERE code = 'calendar';
