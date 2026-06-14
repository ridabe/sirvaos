// Pendência P2 — E-mail de comunicado do Kids (Resend).
// Envia o comunicado para os responsáveis (e-mail do membro vinculado ao guardião).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return json({ error: 'RESEND_API_KEY not configured' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'NOT_AUTHORIZED' }, 401);

  let body: { communication_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const communicationId = body.communication_id;
  if (!communicationId) return json({ error: 'communication_id is required' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'NOT_AUTHORIZED' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: comm } = await admin
    .from('kids_communications')
    .select('id, tenant_id, child_id, title, message')
    .eq('id', communicationId)
    .single<{ id: string; tenant_id: string; child_id: string | null; title: string; message: string }>();
  if (!comm) return json({ error: 'Communication not found' }, 404);

  // Autorização mínima: usuário pertence ao tenant do comunicado.
  const { data: profile } = await admin.from('profiles').select('tenant_id').eq('id', user.id)
    .single<{ tenant_id: string | null }>();
  if (!profile || profile.tenant_id !== comm.tenant_id) return json({ error: 'FORBIDDEN' }, 403);

  // Nome da criança (se direcionado) e nome do tenant.
  let childName: string | null = null;
  if (comm.child_id) {
    const { data: child } = await admin.from('kids_children').select('name').eq('id', comm.child_id).single<{ name: string }>();
    childName = child?.name ?? null;
  }
  const { data: tenant } = await admin.from('tenants').select('name').eq('id', comm.tenant_id).single<{ name: string }>();
  const tenantName = tenant?.name ?? 'SirvaOS';

  // Responsáveis: do filho específico ou de todos (comunicado geral).
  let guardiansQuery = admin.from('kids_guardians').select('member_id').eq('tenant_id', comm.tenant_id);
  if (comm.child_id) guardiansQuery = guardiansQuery.eq('child_id', comm.child_id);
  const { data: guardians } = await guardiansQuery.returns<Array<{ member_id: string | null }>>();

  const memberIds = [...new Set((guardians ?? []).map((g) => g.member_id).filter(Boolean))] as string[];
  const { data: members } = memberIds.length
    ? await admin.from('members').select('id, name, email').in('id', memberIds).not('email', 'is', null)
      .returns<Array<{ id: string; name: string; email: string | null }>>()
    : { data: [] as Array<{ id: string; name: string; email: string | null }> };

  const recipients = (members ?? []).filter((m) => m.email);
  if (recipients.length === 0) return json({ error: 'NO_RECIPIENTS', sent: 0, failed: 0 }, 422);

  const fromEmail = Deno.env.get('EMAIL_FROM') ?? 'noreply@sirvaos.com.br';
  let sent = 0;
  let failed = 0;

  for (const m of recipients) {
    const html = buildHtml({ guardianName: m.name, childName, tenantName, title: comm.title, message: comm.message });
    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${tenantName} (Kids) <${fromEmail}>`, to: [m.email], subject: `👶 ${comm.title}`, html }),
      });
      if (res.ok) sent++; else failed++;
    } catch {
      failed++;
    }
  }

  return json({ sent, failed });
});

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildHtml(p: { guardianName: string; childName: string | null; tenantName: string; title: string; message: string }): string {
  const child = p.childName ? `<p style="margin:0 0 10px;font-size:14px;color:#6b7280;">Sobre <strong>${escapeHtml(p.childName)}</strong></p>` : '';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:18px 22px;background:#1A2744;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;color:#F5C842;">👶 MINISTÉRIO KIDS</p>
        <h1 style="margin:6px 0 0;font-size:20px;color:#fff;">${escapeHtml(p.title)}</h1>
      </td></tr>
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 12px;font-size:15px;color:#374151;">Olá, <strong>${escapeHtml(p.guardianName)}</strong>!</p>
        ${child}
        <div style="font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(p.message).replace(/\n/g, '<br/>')}</div>
      </td></tr>
      <tr><td style="padding:14px 22px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        Enviado pela equipe Kids de <strong>${escapeHtml(p.tenantName)}</strong> via SirvaOS.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
