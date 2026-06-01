import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  description_html?: string | null;
  location: string | null;
  event_date: string;
  ends_at: string | null;
  event_type: string;
  tenant_id: string;
  cover_image_url?: string | null;
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

  let body: { event_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { event_id } = body;
  if (!event_id) {
    return new Response(JSON.stringify({ error: 'event_id is required' }), {
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

  // Buscar evento
  const { data: event, error: eventError } = await supabase
    .from('tenant_events')
    .select('id, title, description, description_html, location, event_date, ends_at, event_type, tenant_id, cover_image_url')
    .eq('id', event_id)
    .single<EventRow>();

  if (eventError || !event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Buscar nome do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_phone')
    .eq('id', event.tenant_id)
    .single<TenantRow>();

  // Buscar todos os membros ativos com e-mail
  const { data: members } = await supabase
    .from('members')
    .select('id, name, email')
    .eq('tenant_id', event.tenant_id)
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

  const eventDateFormatted = new Date(event.event_date).toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const endsAtFormatted = event.ends_at
    ? new Date(event.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    : null;

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    if (!member.email) continue;

    const emailHtml = buildEmailHtml({
      memberName: member.name,
      tenantName: fromName,
      tenantPhone: tenant?.contact_phone ?? null,
      eventTitle: event.title,
      eventDate: eventDateFormatted,
      endsAt: endsAtFormatted,
      location: event.location,
      description: event.description,
      descriptionHtml: event.description_html ?? null,
      bannerUrl: resolveEventBannerUrl(supabaseUrl, event.cover_image_url ?? null),
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
          subject: `📅 ${event.title} — ${new Date(event.event_date).toLocaleDateString('pt-BR')}`,
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
  eventTitle: string;
  eventDate: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  descriptionHtml: string | null;
  bannerUrl: string | null;
}): string {
  const { memberName, tenantName, tenantPhone, eventTitle, eventDate, endsAt, location, description, descriptionHtml, bannerUrl } = params;
  const safeRich = sanitizeRichHtml(descriptionHtml);
  const safePlain = description ? escapeHtml(description) : '';
  const detailsHtml = safeRich || (safePlain ? `<p style="margin:0;">${safePlain}</p>` : '');
  const contactPhone = (tenantPhone ?? '').trim();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(eventTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="padding:0 0 14px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Olá, <strong>${escapeHtml(memberName)}</strong>!</p>
              <p style="margin:0;font-size:15px;color:#6b7280;">
                Confira os detalhes do próximo evento:
              </p>
            </td>
          </tr>
          <tr>
            <td>
              ${buildEventCardHtml({
                tenantName,
                tenantPhone: contactPhone || null,
                eventTitle,
                eventDate,
                endsAt,
                location,
                detailsHtml,
                bannerUrl,
              })}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Este e-mail foi enviado pela administração de ${escapeHtml(tenantName)} via SirvaOS.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function resolveEventBannerUrl(supabaseUrl: string, value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/event-banners/${value}`;
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

  const strippedUnknownTags = withoutDanger
    .replace(/<(?!\/?(p|br|strong|em|u|ul|ol|li|a)\b)[^>]*>/gi, '')
    .replace(/<\/(?!p|br|strong|em|u|ul|ol|li|a\b)[^>]*>/gi, '');

  return strippedUnknownTags.trim();
}

function buildEventCardHtml(params: {
  tenantName: string;
  tenantPhone: string | null;
  eventTitle: string;
  eventDate: string;
  endsAt: string | null;
  location: string | null;
  detailsHtml: string;
  bannerUrl: string | null;
}): string {
  const { tenantName, tenantPhone, eventTitle, eventDate, endsAt, location, detailsHtml, bannerUrl } = params;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
  ${bannerUrl ? `
  <tr>
    <td style="padding:0;">
      <img src="${escapeHtml(bannerUrl)}" alt="${escapeHtml(eventTitle)}" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
    </td>
  </tr>` : ''}
  <tr>
    <td style="padding:22px 22px 16px;">
      <div style="font-size:22px;line-height:1.25;font-weight:800;color:#111827;margin:0 0 8px;">
        ${escapeHtml(eventTitle)}
      </div>
      <div style="font-size:13px;line-height:1.4;color:#6b7280;">
        <div style="margin:0 0 4px;">📅 ${escapeHtml(eventDate)}${endsAt ? ` até ${escapeHtml(endsAt)}` : ''}</div>
        ${location ? `<div style="margin:0;">📍 ${escapeHtml(location)}</div>` : ''}
      </div>
    </td>
  </tr>
  ${detailsHtml ? `
  <tr>
    <td style="padding:0 22px 18px;">
      <div style="font-size:14px;line-height:1.6;color:#374151;">
        ${detailsHtml}
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
          ${tenantPhone ? `<td align="right" style="font-size:12px;color:#6b7280;">☎ ${escapeHtml(tenantPhone)}</td>` : `<td></td>`}
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
