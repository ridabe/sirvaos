// Etapa 2 / Frente B (B7) — Webhook de status da Z-API.
// Recebe os callbacks "MessageStatusCallback" (SENT/RECEIVED/READ/PLAYED) e
// "DeliveryCallback" (confirmação de envio, com `error` em caso de falha) e
// atualiza public.whatsapp_messages pelo provider_message_id.
//
// Configurar no painel Z-API (Webhooks): apontar "Ao enviar" e "Status da mensagem"
// para:  https://<PROJ>.supabase.co/functions/v1/whatsapp-webhook
// Deploy com verify_jwt=false (a Z-API não envia JWT do Supabase).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ value: false, error: 'invalid json' }, 400);
  }

  // Validação leve: o instanceId do callback precisa bater com a instância configurada.
  const zapiUrl = Deno.env.get('ZAPI_URL') ?? '';
  const expectedInstance = zapiUrl.match(/instances\/([^/]+)\//)?.[1];
  if (expectedInstance && body.instanceId && body.instanceId !== expectedInstance) {
    return json({ value: false, error: 'instance mismatch' }, 403);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const nowIso = new Date().toISOString();
  const type = String(body.type ?? '');

  try {
    if (type === 'DeliveryCallback') {
      const id = (body.messageId ?? body.zaapId) as string | undefined;
      if (id) {
        if (body.error) {
          await admin.from('whatsapp_messages')
            .update({ status: 'failed', error: String(body.error), delivery_status: 'failed', last_status_raw: 'DeliveryError', last_status_at: nowIso })
            .eq('provider_message_id', id);
        } else {
          await admin.from('whatsapp_messages')
            .update({ last_status_raw: 'DeliveryCallback', last_status_at: nowIso })
            .eq('provider_message_id', id);
        }
      }
    } else if (type === 'MessageStatusCallback') {
      const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
      const status = String(body.status ?? '').toUpperCase();
      const patch: Record<string, unknown> = { last_status_raw: status, last_status_at: nowIso };
      if (status === 'RECEIVED') {
        patch.delivery_status = 'delivered';
        patch.delivered_at = nowIso;
      } else if (status === 'READ' || status === 'READ_BY_ME' || status === 'PLAYED') {
        patch.delivery_status = 'read';
        patch.read_at = nowIso;
      } else if (status === 'SENT') {
        patch.delivery_status = 'sent';
      }
      for (const id of ids) {
        await admin.from('whatsapp_messages').update(patch).eq('provider_message_id', id);
      }
    }
  } catch (_) {
    // Nunca quebra o callback — sempre 200 para a Z-API não reenfileirar.
  }

  return json({ value: true });
});
