import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';

interface RecipientRow {
  id: string;
  assignment_id: string;
  member_name: string;
  member_email: string;
}

interface EventRow {
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
}

interface AssignmentRow {
  role_name: string | null;
  notes: string | null;
  worship_roles: { name: string } | null;
}

interface WorshipEventSongRow {
  position: number;
  key: string | null;
  notes: string | null;
  catalog_songs: {
    title: string;
    artist: string;
    cifraclub_url: string | null;
    youtube_url: string | null;
  } | null;
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

  const fromEmail = Deno.env.get('EMAIL_FROM') ?? 'noreply@sirvaos.com.br';
  const fromName = Deno.env.get('EMAIL_FROM_NAME') ?? 'SirvaOS';

  let body: { event_id: string; campaign_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { event_id, campaign_id } = body;
  if (!event_id || !campaign_id) {
    return new Response(JSON.stringify({ error: 'event_id and campaign_id are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify caller is authenticated and get their JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'NOT_AUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate campaign exists and is in draft state
  const { data: campaign, error: campaignError } = await supabase
    .from('worship_email_campaigns')
    .select('id, status, event_id, tenant_id')
    .eq('id', campaign_id)
    .eq('event_id', event_id)
    .single();

  if (campaignError || !campaign) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (campaign.status !== 'draft') {
    return new Response(
      JSON.stringify({ error: `Campaign already sent or in progress: ${campaign.status}` }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Fetch event details
  const { data: event } = await supabase
    .from('worship_events')
    .select('title, starts_at, ends_at, location')
    .eq('id', event_id)
    .single<EventRow>();

  if (!event) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: worshipSongsData, error: worshipSongsError } = await supabase
    .from('worship_event_songs')
    .select('position, key, notes, catalog_songs (title, artist, cifraclub_url, youtube_url)')
    .eq('event_id', event_id)
    .order('position', { ascending: true })
    .returns<WorshipEventSongRow[]>();

  const repertoireItems = (worshipSongsError ? [] : (worshipSongsData ?? []))
    .filter((row) => Boolean(row.catalog_songs?.title))
    .map((row, index) => ({
      index: index + 1,
      title: row.catalog_songs!.title,
      artist: row.catalog_songs!.artist,
      key: (row.key ?? '').trim() || null,
      notes: (row.notes ?? '').trim() || null,
      cifraclub_url: row.catalog_songs!.cifraclub_url,
      youtube_url: row.catalog_songs!.youtube_url,
    }));

  const repertoireHtml = buildRepertoireHtml(repertoireItems);

  // Fetch queued recipients
  const { data: recipients } = await supabase
    .from('worship_email_campaign_recipients')
    .select('id, assignment_id, member_name, member_email')
    .eq('campaign_id', campaign_id)
    .eq('status', 'queued')
    .returns<RecipientRow[]>();

  if (!recipients || recipients.length === 0) {
    return new Response(JSON.stringify({ error: 'NO_RECIPIENTS' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mark campaign as sending
  await supabase
    .from('worship_email_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign_id);

  const eventDate = new Date(event.starts_at).toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    // Fetch assignment details for this recipient
    const { data: assignment } = await supabase
      .from('worship_assignments')
      .select('role_name, notes, worship_roles(name)')
      .eq('id', recipient.assignment_id)
      .maybeSingle<AssignmentRow>();

    const roleName =
      assignment?.worship_roles?.name ?? assignment?.role_name ?? 'Integrante';
    const notes = assignment?.notes ?? null;

    const emailHtml = buildEmailHtml({
      memberName: recipient.member_name,
      eventTitle: event.title,
      eventDate,
      location: event.location,
      roleName,
      notes,
      repertoireHtml,
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
          to: [recipient.member_email],
          subject: `Você está na escala: ${event.title}`,
          html: emailHtml,
        }),
      });

      const resData = await res.json() as { id?: string; message?: string };

      if (res.ok && resData.id) {
        await supabase
          .from('worship_email_campaign_recipients')
          .update({ status: 'sent', provider_message_id: resData.id, sent_at: new Date().toISOString() })
          .eq('id', recipient.id);
        sent++;
      } else {
        await supabase
          .from('worship_email_campaign_recipients')
          .update({ status: 'failed', error_message: resData.message ?? 'Unknown error' })
          .eq('id', recipient.id);
        failed++;
      }
    } catch (err) {
      await supabase
        .from('worship_email_campaign_recipients')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', recipient.id);
      failed++;
    }
  }

  const finalStatus = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial_failed';

  await supabase
    .from('worship_email_campaigns')
    .update({
      status: finalStatus,
      sent_count: sent,
      failed_count: failed,
      finished_at: new Date().toISOString(),
    })
    .eq('id', campaign_id);

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
  eventTitle: string;
  eventDate: string;
  location: string | null;
  roleName: string;
  notes: string | null;
  repertoireHtml: string;
}): string {
  const { memberName, eventTitle, eventDate, location, roleName, notes, repertoireHtml } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sua escala de louvor</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:#6d28d9;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">SirvaOS</h1>
              <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">Módulo de Louvor</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Olá, <strong>${escapeHtml(memberName)}</strong>!</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                Você foi escalado(a) para o seguinte evento:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;">
                    <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">Evento</span>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(eventTitle)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">Data e Hora</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(eventDate)}</p>
                  </td>
                </tr>
                ${location ? `
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">Local</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(location)}</p>
                  </td>
                </tr>` : ''}
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">Sua função</span>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#374151;">${escapeHtml(roleName)}</p>
                  </td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding:8px 0;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;">Observações</span>
                    <p style="margin:4px 0 0;font-size:14px;color:#374151;">${escapeHtml(notes)}</p>
                  </td>
                </tr>` : ''}
              </table>

              ${repertoireHtml ? `<div style="margin:0 0 24px;">${repertoireHtml}</div>` : ''}

              <p style="margin:0;font-size:14px;color:#9ca3af;">
                Este e-mail foi enviado automaticamente pelo sistema SirvaOS.
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

function buildRepertoireHtml(items: Array<{
  index: number;
  title: string;
  artist: string;
  key: string | null;
  notes: string | null;
  cifraclub_url: string | null;
  youtube_url: string | null;
}>): string {
  if (!items.length) {
    return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
  <tr>
    <td>
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#111827;">🎵 Repertório</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">Repertório não informado.</p>
    </td>
  </tr>
</table>`.trim();
  }

  const rows = items.map((item) => {
    const metaParts = [
      item.key ? `Tom: <strong>${escapeHtml(item.key)}</strong>` : null,
      item.notes ? escapeHtml(item.notes) : null,
    ].filter(Boolean).join(' · ');

    const links = [
      item.cifraclub_url ? `<a href="${escapeHtml(item.cifraclub_url)}" target="_blank" rel="noreferrer" style="color:#6d28d9;text-decoration:none;">Cifra Club</a>` : null,
      item.youtube_url ? `<a href="${escapeHtml(item.youtube_url)}" target="_blank" rel="noreferrer" style="color:#6d28d9;text-decoration:none;">YouTube</a>` : null,
    ].filter(Boolean).join(' · ');

    return `
<tr>
  <td style="padding:10px 0;border-top:1px solid #f3f4f6;">
    <p style="margin:0;font-size:14px;line-height:1.35;color:#111827;">${item.index}. ${escapeHtml(item.title)} — <span style="color:#6b7280;">${escapeHtml(item.artist)}</span></p>
    ${metaParts ? `<p style="margin:4px 0 0;font-size:12px;line-height:1.45;color:#6b7280;">${metaParts}</p>` : ''}
    ${links ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.45;">${links}</p>` : ''}
  </td>
</tr>`.trim();
  }).join('\n');

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
  <tr>
    <td>
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#111827;">🎵 Repertório</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tbody>
          ${rows}
        </tbody>
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
