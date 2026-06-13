// Etapa 2 / Frente B (B6) — Lembrete automático 24h antes (escala de Louvor).
// Chamada por um job pg_cron (de hora em hora) com Authorization: Bearer <service_role_key>.
// Busca eventos de louvor publicados que começam nas próximas 24h e ainda não tiveram
// lembrete, envia WhatsApp aos escalados (Z-API) e marca reminder_sent_at.
import { createClient } from 'jsr:@supabase/supabase-js@2';

function normalizePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return null;
}

Deno.serve(async (req) => {
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // Token de disparo do cron. Idealmente mover para o secret CRON_SECRET no Supabase;
  // o fallback abaixo precisa ser idêntico ao usado no agendamento (cron.schedule).
  const cronSecret = Deno.env.get('CRON_SECRET') ?? 'sirva0s-cron-b2f8e1d47a9c4f60';
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${cronSecret}`) {
    return json({ error: 'NOT_AUTHORIZED' }, 401);
  }

  const zapiUrl = Deno.env.get('ZAPI_URL');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
  if (!zapiUrl) return json({ error: 'ZAPI_URL not configured' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const now = new Date();
  const in24 = new Date(now.getTime() + 24 * 3600 * 1000);

  const { data: events } = await admin
    .from('worship_events')
    .select('id, tenant_id, title, starts_at, location')
    .gte('starts_at', now.toISOString())
    .lte('starts_at', in24.toISOString())
    .eq('status', 'published')
    .is('reminder_sent_at', null);

  let eventsProcessed = 0;
  let totalSent = 0;
  let totalFailed = 0;

  for (const ev of events ?? []) {
    const { data: assigns } = await admin
      .from('worship_assignments')
      .select('member_id, role_id, role_name')
      .eq('event_id', ev.id);

    const memberIds = [...new Set((assigns ?? []).map((a) => a.member_id).filter(Boolean))];
    const roleIds = [...new Set((assigns ?? []).map((a) => a.role_id).filter(Boolean))];

    const { data: members } = memberIds.length
      ? await admin.from('members').select('id, name, phone, whatsapp_opt_in').in('id', memberIds)
      : { data: [] as Array<{ id: string; name: string; phone: string | null; whatsapp_opt_in: boolean }> };
    const { data: roles } = roleIds.length
      ? await admin.from('worship_roles').select('id, name').in('id', roleIds)
      : { data: [] as Array<{ id: string; name: string }> };

    const memberMap = new Map((members ?? []).map((m) => [m.id, m]));
    const roleMap = new Map((roles ?? []).map((r) => [r.id, r.name]));
    const date = new Date(ev.starts_at).toLocaleString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });
    const loc = ev.location ? ` em ${ev.location}` : '';

    const seen = new Set<string>();
    for (const a of assigns ?? []) {
      const m = memberMap.get(a.member_id);
      if (!m || m.whatsapp_opt_in === false) continue;
      const phone = normalizePhone(m.phone ?? '');
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);

      const role = (a.role_id ? roleMap.get(a.role_id) : null) ?? a.role_name ?? 'sua função';
      const message = `⏰ *Lembrete*: amanhã você está escalado(a) como *${role}* para "${ev.title}" (${date}${loc}). Se ainda não confirmou, acesse o portal para confirmar sua presença. 🙏`;

      try {
        const res = await fetch(zapiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(clientToken ? { 'Client-Token': clientToken } : {}) },
          body: JSON.stringify({ phone, message }),
        });
        const data = await res.json().catch(() => ({}));
        const ok = res.ok && (data.messageId || data.zaapId || data.id);
        if (ok) totalSent++; else totalFailed++;
        await admin.from('whatsapp_messages').insert({
          tenant_id: ev.tenant_id, to_phone: phone, message, context: 'worship_reminder', context_id: ev.id,
          status: ok ? 'sent' : 'failed',
          provider_message_id: ok ? (data.messageId ?? data.id ?? data.zaapId) : null,
          error: ok ? null : (typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`),
        });
      } catch (e) {
        totalFailed++;
        await admin.from('whatsapp_messages').insert({
          tenant_id: ev.tenant_id, to_phone: phone, message, context: 'worship_reminder', context_id: ev.id,
          status: 'failed', error: e instanceof Error ? e.message : 'erro de rede',
        });
      }
    }

    await admin.from('worship_events').update({ reminder_sent_at: new Date().toISOString() }).eq('id', ev.id);
    eventsProcessed++;
  }

  return json({ eventsProcessed, totalSent, totalFailed });
});
