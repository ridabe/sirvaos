import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  message_html: string | null;
  published_at: string;
  tenant_id: string;
}

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
}

interface TenantRow {
  name: string;
  contact_phone?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'NOT_AUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { announcement_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { announcement_id } = body;
  if (!announcement_id) {
    return new Response(JSON.stringify({ error: 'announcement_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verificar autenticação do chamador
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'NOT_AUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar comunicado
  const { data: announcement, error: annError } = await supabase
    .from('tenant_announcements')
    .select('id, title, message, message_html, published_at, tenant_id')
    .eq('id', announcement_id)
    .single<AnnouncementRow>();

  if (annError || !announcement) {
    return new Response(JSON.stringify({ error: 'Announcement not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar nome do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_phone')
    .eq('id', announcement.tenant_id)
    .single<TenantRow>();

  // Buscar todos os membros ativos com e-mail
  const { data: members } = await supabase
    .from('members')
    .select('id, name, email')
    .eq('tenant_id', announcement.tenant_id)
    .eq('status', 'active')
    .not('email', 'is', null)
    .returns<MemberRow[]>();

  if (!members || members.length === 0) {
    return new Response(JSON.stringify({ error: 'NO_RECIPIENTS', sent: 0, failed: 0 }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fromEmail = Deno.env.get('EMAIL_FROM') ?? 'noreply@sirvaos.com.br';
  const fromName = tenant?.name ?? 'SirvaOS';
  const publishedDate = new Date(announcement.published_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    if (!member.email) continue;

    const emailHtml = buildEmailHtml({
      memberName: member.name,
      tenantName: fromName,
      tenantPhone: tenant?.contact_phone ?? null,
      announcementTitle: announcement.title,
      publishedDate,
      messageHtml: announcement.message_html,
      messagePlain: announcement.message,
    });

    try {
      const res = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [member.email],
          subject: `📢 ${announcement.title}`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

function buildEmailHtml(params: {
  memberName: string;
  tenantName: string;
  tenantPhone: string | null;
  announcementTitle: string;
  publishedDate: string;
  messageHtml: string | null;
  messagePlain: string;
}): string {
  const { memberName, tenantName, tenantPhone, announcementTitle, publishedDate, messageHtml, messagePlain } = params;
  const safeRich = sanitizeRichHtml(messageHtml);
  const safePlain = messagePlain ? escapeHtml(messagePlain) : '';
  const bodyHtml = safeRich || (safePlain ? `<p style="margin:0;">${safePlain.replace(/\n/g, '<br/>')}</p>` : '');
  const contactPhone = (tenantPhone ?? '').trim();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(announcementTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 0 14px;">
              <p style="margin:0 0 6px;font-size:16px;color:#374151;">Olá, <strong>${escapeHtml(memberName)}</strong>!</p>
              <p style="margin:0;font-size:14px;color:#6b7280;">A administração de <strong>${escapeHtml(tenantName)}</strong> publicou um comunicado:</p>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse:separate;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:6px 22px 0;background:#6d28d9;">
                    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#e9d5ff;">
                      📢 Comunicado
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 22px 10px;background:#6d28d9;">
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3;">
                      ${escapeHtml(announcementTitle)}
                    </h1>
                    <p style="margin:8px 0 0;font-size:12px;color:#c4b5fd;">Publicado em ${escapeHtml(publishedDate)}</p>
                  </td>
                </tr>
                ${bodyHtml ? `
                <tr>
                  <td style="padding:20px 22px 18px;">
                    <div style="font-size:15px;line-height:1.7;color:#374151;">
                      ${bodyHtml}
                    </div>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:14px 22px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:12px;color:#6b7280;">
                          <strong style="color:#111827;">${escapeHtml(tenantName)}</strong>
                        </td>
                        ${contactPhone ? `<td align="right" style="font-size:12px;color:#6b7280;">☎ ${escapeHtml(contactPhone)}</td>` : '<td></td>'}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Este e-mail foi enviado pela administração de ${escapeHtml(tenantName)} via SirvaOS.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sanitizeRichHtml(input: string | null): string {
  const html = String(input ?? '').trim();
  if (!html) return '';

  const withoutDanger = html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/\s*>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\shref\s*=\s*(["'])(?!https?:\/\/|mailto:)[\s\S]*?\1/gi, '');

  return withoutDanger
    .replace(/<(?!\/?(p|br|strong|em|u|ul|ol|li|a|span)\b)[^>]*>/gi, '')
    .replace(/<\/(?!p|br|strong|em|u|ul|ol|li|a|span\b)[^>]*>/gi, '')
    .trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
