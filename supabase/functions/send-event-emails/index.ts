import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  ends_at: string | null;
  event_type: string;
  tenant_id: string;
}

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
}

interface TenantRow {
  name: string;
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
    .select('id, title, description, location, event_date, ends_at, event_type, tenant_id')
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
    .select('name')
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
      eventTitle: event.title,
      eventDate: eventDateFormatted,
      endsAt: endsAtFormatted,
      location: event.location,
      description: event.description,
      eventType: event.event_type,
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
  eventTitle: string;
  eventDate: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  eventType: string;
}): string {
  const { memberName, tenantName, eventTitle, eventDate, endsAt, location, description, eventType } = params;

  const typeLabels: Record<string, string> = {
    culto: 'Culto', conferencia: 'Conferência', retiro: 'Retiro',
    jovens: 'Jovens', infantil: 'Infantil', social: 'Social', outro: 'Evento',
  };
  const typeLabel = typeLabels[eventType] ?? 'Evento';

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
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:#6d28d9;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${escapeHtml(tenantName)}</h1>
              <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Agenda da Igreja</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Olá, <strong>${escapeHtml(memberName)}</strong>!</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                Você está convidado(a) para o próximo evento:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:11px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">${typeLabel}</span>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(eventTitle)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:11px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">📅 Data e Hora</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                      ${escapeHtml(eventDate)}${endsAt ? ` até ${escapeHtml(endsAt)}` : ''}
                    </p>
                  </td>
                </tr>
                ${location ? `
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:11px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">📍 Local</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(location)}</p>
                  </td>
                </tr>` : ''}
                ${description ? `
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:11px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">ℹ️ Detalhes</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(description)}</p>
                  </td>
                </tr>` : ''}
              </table>

              <p style="margin:0;font-size:14px;color:#9ca3af;">
                Este e-mail foi enviado pela administração de ${escapeHtml(tenantName)} via SirvaOS.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">© SirvaOS · Gestão de igrejas</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
