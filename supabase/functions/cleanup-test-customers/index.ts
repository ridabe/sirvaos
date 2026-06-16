import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Função desativada. Era um utilitário de uso único para limpeza de clientes de
// teste na AbacatePay (já concluída). Mantida como stub inofensivo; pode ser
// removida pelo painel do Supabase (Edge Functions → cleanup-test-customers → Delete).

serve(() =>
  new Response(JSON.stringify({ status: "disabled", message: "Função de limpeza desativada." }), {
    status: 410,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
);
