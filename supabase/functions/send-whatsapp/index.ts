// Etapa 2 / Frente B — Edge Function de envio de WhatsApp via Z-API.
// A doc da Z-API exige que o envio parta do servidor (nunca do frontend).
//
// Segredos necessários (supabase secrets set ...):
//   ZAPI_URL          -> endpoint send-text completo da instância
//                        ex: https://api.z-api.io/instances/<ID>/token/<TOKEN>/send-text
//   ZAPI_CLIENT_TOKEN -> "Token de segurança da conta" (header Client-Token). Obrigatório se
//                        a opção estiver ativada no painel Z-API (recomendado).
//
// Payload aceito (POST, JSON):
//   { "tenant_id": "uuid", "context": "custom|announcement|worship_reminder|...",
//     "context_id": "uuid?", "recipients": [{ "phone": "5511999999999", "message": "..." }] }
//
// Retorno: { sent, failed, results: [{ phone, status, providerMessageId?, error? }] }
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  phone: string;
  message: string;
}
interface Payload {
  tenant_id: string;
  context?: string;
  context_id?: string | null;
  recipients: Recipient[];
}

const VALID_CONTEXTS = new Set([
  'custom', 'announcement', 'worship_reminder', 'worship_confirmation',
  'kids_communication', 'event_reminder',
]);

// Normaliza telefone para o formato Z-API: DDI+DDD+numero, só dígitos (ex: 5511999999999).
function normalizePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // já tem DDI 55 (12 ou 13 dígitos)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  // DDD + numero (10 ou 11 dígitos) -> prefixa 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // fallback: retorna como está se tiver tamanho plausível
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

  const zapiUrl = Deno.env.get('ZAPI_URL');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
  if (!zapiUrl) {
    return json({ error: 'ZAPI_URL not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'NOT_AUTHORIZED' }, 401);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { tenant_id, recipients } = payload;
  const context = payload.context && VALID_CONTEXTS.has(payload.context) ? payload.context : 'custom';
  if (!tenant_id || !Array.isArray(recipients) || recipients.length === 0) {
    return json({ error: 'tenant_id e recipients são obrigatórios' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Autenticação + autorização: o chamador precisa ser owner/admin do tenant (ou super admin).
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'NOT_AUTHORIZED' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await admin
    .from('profiles')
    .select('tenant_id, tenant_role, global_role, member_id')
    .eq('id', user.id)
    .single<{ tenant_id: string | null; tenant_role: string | null; global_role: string | null; member_id: string | null }>();

  const isGlobalAdmin = profile?.global_role === 'super_admin' || profile?.global_role === 'operations';
  const isTenantAdmin =
    profile?.tenant_id === tenant_id && (profile?.tenant_role === 'owner' || profile?.tenant_role === 'admin');

  let authorized = isGlobalAdmin || isTenantAdmin;
  // Admin de módulo do mesmo tenant também pode enviar (ex.: líder do Kids/Louvor).
  if (!authorized && profile?.tenant_id === tenant_id) {
    const orFilter = [`profile_id.eq.${user.id}`, profile?.member_id ? `member_id.eq.${profile.member_id}` : null]
      .filter(Boolean)
      .join(',');
    const { count } = await admin
      .from('tenant_module_admins')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .or(orFilter);
    authorized = (count ?? 0) > 0;
  }
  if (!authorized) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ phone: string; status: string; providerMessageId?: string; error?: string }> = [];

  for (const r of recipients) {
    const phone = normalizePhone(r.phone);
    const message = (r.message ?? '').trim();
    if (!phone || !message) {
      failed++;
      results.push({ phone: r.phone, status: 'failed', error: 'phone ou message inválido' });
      await admin.from('whatsapp_messages').insert({
        tenant_id, to_phone: r.phone, message, context, context_id: payload.context_id ?? null,
        status: 'failed', error: 'phone ou message inválido', created_by: user.id,
      });
      continue;
    }

    try {
      const res = await fetch(zapiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken ? { 'Client-Token': clientToken } : {}),
        },
        body: JSON.stringify({ phone, message }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.messageId || data.zaapId || data.id)) {
        sent++;
        const providerMessageId = data.messageId ?? data.id ?? data.zaapId;
        results.push({ phone, status: 'sent', providerMessageId });
        await admin.from('whatsapp_messages').insert({
          tenant_id, to_phone: phone, message, context, context_id: payload.context_id ?? null,
          status: 'sent', provider_message_id: providerMessageId, created_by: user.id,
        });
      } else {
        failed++;
        const err = typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`;
        results.push({ phone, status: 'failed', error: err });
        await admin.from('whatsapp_messages').insert({
          tenant_id, to_phone: phone, message, context, context_id: payload.context_id ?? null,
          status: 'failed', error: err, created_by: user.id,
        });
      }
    } catch (e) {
      failed++;
      const err = e instanceof Error ? e.message : 'erro de rede';
      results.push({ phone, status: 'failed', error: err });
      await admin.from('whatsapp_messages').insert({
        tenant_id, to_phone: phone, message, context, context_id: payload.context_id ?? null,
        status: 'failed', error: err, created_by: user.id,
      });
    }
  }

  return json({ sent, failed, results });
});
