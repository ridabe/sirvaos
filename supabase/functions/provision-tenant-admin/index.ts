import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2?target=deno";

type ProvisionRequest = {
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin";
  action: "create" | "reset" | "resend";
};

function jsonResponse(status: number, body: unknown, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function getDefaultKeyFromJsonEnv(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed?.default;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function generateTemporaryPassword(length = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%*+-_";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" }, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    getDefaultKeyFromJsonEnv(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) ?? Deno.env.get("SUPABASE_ANON_KEY") ?? null;
  const secretKey =
    getDefaultKeyFromJsonEnv(Deno.env.get("SUPABASE_SECRET_KEYS")) ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return jsonResponse(
      500,
      {
        error: "missing_env",
        details: {
          has_url: Boolean(supabaseUrl),
          has_publishable_key: Boolean(publishableKey),
          has_secret_key: Boolean(secretKey),
        },
      },
      corsHeaders,
    );
  }

  const authorization = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(401, { error: "unauthorized" }, corsHeaders);
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("global_role, status")
    .eq("id", authData.user.id)
    .maybeSingle<{ global_role: string | null; status: string }>();

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !profile.global_role ||
    !new Set(["super_admin", "operations"]).has(profile.global_role)
  ) {
    return jsonResponse(403, { error: "forbidden" }, corsHeaders);
  }

  let payload: ProvisionRequest;
  try {
    payload = (await req.json()) as ProvisionRequest;
  } catch {
    return jsonResponse(400, { error: "invalid_json" }, corsHeaders);
  }

  const tenantId = String(payload.tenant_id ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const fullName = payload.full_name ? String(payload.full_name).trim() : null;
  const role = payload.role === "admin" ? "admin" : "owner";
  const action =
    payload.action === "reset" ? "reset" : payload.action === "resend" ? "resend" : "create";

  if (!tenantId || !isUuid(tenantId) || !email) {
    return jsonResponse(400, { error: "invalid_payload" }, corsHeaders);
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Reenvio manual: nao altera a senha, apenas reenvia o material de acesso.
  if (action === "resend") {
    const { data: tenantRow } = await adminClient
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle<{ name: string | null }>();
    const tenantName = tenantRow?.name?.trim() || "sua igreja";

    const { data: profileRow } = await adminClient
      .from("profiles")
      .select("full_name, status")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .maybeSingle<{ full_name: string | null; status: string }>();

    if (!profileRow) {
      return jsonResponse(404, { error: "tenant_admin_not_found" }, corsHeaders);
    }

    const appUrl = (Deno.env.get("APP_URL") ?? "https://app.sirvaos.com").trim().replace(/\/+$/, "");
    let resendSent = false;
    let resendError: string | null = null;
    try {
      const r = await sendAccessEmail({
        to: email,
        fullName: profileRow.full_name ?? fullName,
        tenantName,
        temporaryPassword: "",
        appUrl,
        action: "resend",
      });
      resendSent = r.sent;
      resendError = r.error;
    } catch (error) {
      resendError = error instanceof Error ? error.message : "unknown_email_error";
    }

    return jsonResponse(
      200,
      {
        tenant_id: tenantId,
        email,
        role,
        action: "resend",
        email_sent: resendSent,
        email_error: resendError,
      },
      corsHeaders,
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  let targetUserId: string | null = null;

  const createResult = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? undefined,
      must_change_password: true,
    },
  });

  if (createResult.data?.user?.id) {
    targetUserId = createResult.data.user.id;
  }

  if (!targetUserId) {
    const generateLinkResult = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    targetUserId = generateLinkResult.data?.user?.id ?? null;

    if (!targetUserId) {
      return jsonResponse(
        500,
        {
          error: "user_resolution_failed",
          details: createResult.error?.message ?? generateLinkResult.error?.message ?? null,
        },
        corsHeaders,
      );
    }

    const updateResult = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: temporaryPassword,
      user_metadata: {
        full_name: fullName ?? undefined,
        must_change_password: true,
      },
    });

    if (updateResult.error) {
      return jsonResponse(
        500,
        { error: "user_update_failed", details: updateResult.error.message },
        corsHeaders,
      );
    }
  }

  const updateProfilePayload: Record<string, unknown> = {
    tenant_id: tenantId,
    tenant_role: role,
    status: "active",
    global_role: null,
  };

  if (fullName) {
    updateProfilePayload.full_name = fullName;
  }

  let profileUpdated = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const profileUpdateResult = await adminClient
      .from("profiles")
      .update(updateProfilePayload)
      .eq("id", targetUserId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (!profileUpdateResult.error && profileUpdateResult.data?.id) {
      profileUpdated = true;
      break;
    }

    await sleep(200);
  }

  if (!profileUpdated) {
    return jsonResponse(500, { error: "profile_update_failed" }, corsHeaders);
  }

  // ---- Envio automatico do e-mail de boas-vindas / acesso ----
  let emailSent = false;
  let emailError: string | null = null;

  try {
    const { data: tenantRow } = await adminClient
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle<{ name: string | null }>();

    const tenantName = tenantRow?.name?.trim() || "sua igreja";
    const appUrl = (Deno.env.get("APP_URL") ?? "https://app.sirvaos.com").trim().replace(/\/+$/, "");

    const sendResult = await sendAccessEmail({
      to: email,
      fullName: fullName,
      tenantName,
      temporaryPassword,
      appUrl,
      action,
    });
    emailSent = sendResult.sent;
    emailError = sendResult.error;
  } catch (error) {
    emailSent = false;
    emailError = error instanceof Error ? error.message : "unknown_email_error";
  }

  return jsonResponse(
    200,
    {
      tenant_id: tenantId,
      user_id: targetUserId,
      email,
      role,
      action,
      temporary_password: temporaryPassword,
      email_sent: emailSent,
      email_error: emailError,
    },
    corsHeaders,
  );
});

// ============================================================
// E-mail de acesso (boas-vindas / redefinicao / reenvio) via Resend
// ============================================================

type AccessAction = "create" | "reset" | "resend";

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendAccessEmail(params: {
  to: string;
  fullName: string | null;
  tenantName: string;
  temporaryPassword: string;
  appUrl: string;
  action: AccessAction;
}): Promise<{ sent: boolean; error: string | null }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { sent: false, error: "missing_resend_api_key" };
  }

  const fromEmail = Deno.env.get("EMAIL_FROM") ?? "noreply@sirvaos.com.br";
  const fromName = "SirvaOS";
  const greetingName = params.fullName?.trim() ? params.fullName.trim() : "Ola";

  const subject =
    params.action === "reset"
      ? `Sua senha do SirvaOS foi redefinida — ${params.tenantName}`
      : params.action === "resend"
        ? `Acesso ao SirvaOS — ${params.tenantName}`
        : `Seu acesso ao SirvaOS — ${params.tenantName}`;

  const html = buildAccessEmailHtml({
    userName: greetingName,
    tenantName: params.tenantName,
    accessEmail: params.to,
    temporaryPassword: params.temporaryPassword,
    appUrl: params.appUrl,
    action: params.action,
  });

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [params.to],
        subject,
        html,
      }),
    });

    if (res.ok) {
      return { sent: true, error: null };
    }
    const body = await res.text().catch(() => "");
    return { sent: false, error: `resend_${res.status}:${body.slice(0, 180)}` };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "resend_request_failed" };
  }
}

function buildAccessEmailHtml(params: {
  userName: string;
  tenantName: string;
  accessEmail: string;
  temporaryPassword: string;
  appUrl: string;
  action: AccessAction;
}): string {
  const userName = escapeHtml(params.userName);
  const tenantName = escapeHtml(params.tenantName);
  const accessEmail = escapeHtml(params.accessEmail);
  const tempPass = escapeHtml(params.temporaryPassword);
  const appUrl = escapeHtml(params.appUrl);

  const isReset = params.action === "reset";
  const isResend = params.action === "resend";
  const showPassword = !isResend;
  const showModules = !isReset;

  const heading = isReset
    ? `Ola, ${userName}. Sua senha foi redefinida.`
    : isResend
      ? `Ola, ${userName}! Aqui esta o seu acesso ao SirvaOS.`
      : `Ola, ${userName}! Seja bem-vindo(a). \U0001F44B`;

  const intro = isReset
    ? `Geramos uma nova senha temporaria para o seu acesso ao painel de <strong>${tenantName}</strong> no SirvaOS. Use os dados abaixo para entrar.`
    : isResend
      ? `Reenviamos o material de acesso da igreja <strong>${tenantName}</strong> ao <strong>SirvaOS</strong>. Use os dados abaixo para entrar com a senha que voce ja definiu.`
      : `O acesso da igreja <strong>${tenantName}</strong> ao <strong>SirvaOS</strong> ja esta ativo. A partir de agora voce gerencia membros, ministerios, escalas, eventos, comunicacao e financas em um so lugar. Abaixo estao os seus dados de acesso e um passo a passo para comecar.`;

  const passwordRow = showPassword
    ? `<tr><td style="padding:7px 0;color:#3D4A47;border-top:1px solid #C7E6E1;">Senha temporaria</td><td style="padding:7px 0;border-top:1px solid #C7E6E1;"><span style="display:inline-block;font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#084C4A;background:#ffffff;border:1px solid #BBE3DE;border-radius:6px;padding:5px 10px;letter-spacing:0.5px;">${tempPass}</span></td></tr>`
    : `<tr><td style="padding:7px 0;color:#3D4A47;border-top:1px solid #C7E6E1;">Senha</td><td style="padding:7px 0;font-weight:600;border-top:1px solid #C7E6E1;color:#0E6B68;">A senha que voce ja definiu</td></tr>`;

  const importantBox = showPassword
    ? `<strong>Importante:</strong> no primeiro acesso o sistema vai pedir que voce troque a senha temporaria por uma senha pessoal. Esses dados sao pessoais e intransferiveis — nao os compartilhe.`
    : `<strong>Esqueceu a senha?</strong> Pe&ccedil;a ao administrador da plataforma uma redefini&ccedil;&atilde;o — ele gera uma nova senha tempor&aacute;ria para voce. Seus dados de acesso sao pessoais e intransferiveis.`;

  const modulesBlock = showModules
    ? `
          <tr>
            <td style="padding:26px 30px 6px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#2BB3C0;">O que voce encontra</p>
              <h2 style="margin:0 0 12px;font-size:17px;font-weight:800;color:#084C4A;">Modulos da plataforma</h2>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#3D4A47;">Cada modulo cuida de uma area da igreja e pode ser ativado conforme a sua necessidade. Os modulos iniciais sao:</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:13.5px;line-height:1.55;color:#3D4A47;">
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F3B5 Louvor</strong> — musicos, ensaios, escalas por culto e frequencia.</td></tr>
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F465 Membresia</strong> — cadastro completo, status, historico e carteirinha digital.</td></tr>
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F4B0 Financeiro</strong> — dizimos, ofertas, despesas, orcamento e relatorios.</td></tr>
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F9D2 Kids</strong> — criancas e responsaveis, presenca, turmas e comunicados aos pais.</td></tr>
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F4D6 Escola Biblica</strong> — turmas, professores, frequencia e material didatico.</td></tr>
                <tr><td style="padding:6px 0;border-bottom:1px solid #EEF5F3;"><strong style="color:#0E6B68;">\U0001F91D Acao Social</strong> — beneficiarios, doacoes, voluntarios e relatorios de impacto.</td></tr>
                <tr><td style="padding:6px 0;"><strong style="color:#0E6B68;">⚙️ Administracao Geral</strong> — usuarios, permissoes, modulos ativos e auditoria.</td></tr>
              </table>
              <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#6B7774;">A plataforma continua evoluindo com novos modulos (Jovens, Celulas, Comunicacao, Intercessao, Eventos, Portal do Membro e mais). Consulte o manual de acesso para a descricao completa de cada um.</p>
            </td>
          </tr>`
    : "";

  const footerNote = isReset
    ? `Este e-mail foi enviado automaticamente ao redefinir o acesso de ${tenantName}.`
    : isResend
      ? `Este e-mail foi reenviado a pedido do administrador, com o material de acesso de ${tenantName}.`
      : `Este e-mail foi enviado automaticamente ao ativar o acesso de ${tenantName}.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(isReset ? "Senha redefinida — SirvaOS" : "Acesso ao SirvaOS")}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef3f2;padding:28px 14px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;width:100%;border-collapse:separate;background:#ffffff;border:1px solid #d9e3e0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#084C4A;padding:26px 30px 22px;">
              <p style="margin:0;font-size:25px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;line-height:1;">Sirva<span style="color:#2BB3C0;">OS</span></p>
              <p style="margin:8px 0 0;font-size:12px;font-weight:600;color:#9EDDD9;letter-spacing:0.3px;">organize para servir melhor</p>
            </td>
          </tr>
          <tr><td style="height:4px;background:#2BB3C0;line-height:4px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:30px 30px 6px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#17201F;line-height:1.3;">${heading}</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#3D4A47;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px 6px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#DDF1EE;border:1px solid #BBE3DE;border-radius:12px;">
                <tr><td style="padding:18px 22px 6px;"><p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#0E6B68;">\U0001F511 Seus dados de acesso</p></td></tr>
                <tr>
                  <td style="padding:4px 22px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;color:#17201F;">
                      <tr><td style="padding:7px 0;color:#3D4A47;width:150px;">Endereco do painel</td><td style="padding:7px 0;font-weight:700;"><a href="${appUrl}" style="color:#0E6B68;text-decoration:none;">${appUrl}</a></td></tr>
                      <tr><td style="padding:7px 0;color:#3D4A47;border-top:1px solid #C7E6E1;">E-mail (login)</td><td style="padding:7px 0;font-weight:700;border-top:1px solid #C7E6E1;">${accessEmail}</td></tr>
                      ${passwordRow}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 30px 4px;" align="left">
              <table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="border-radius:10px;background:#0E6B68;"><a href="${appUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Acessar o painel &rarr;</a></td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFF3D8;border:1px solid #E8C877;border-radius:10px;"><tr><td style="padding:12px 16px;font-size:13px;line-height:1.6;color:#8A5A06;">${importantBox}</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px 6px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#2BB3C0;">Primeiros passos</p>
              <h2 style="margin:0 0 12px;font-size:17px;font-weight:800;color:#084C4A;">Como entrar no sistema</h2>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size:14px;line-height:1.6;color:#3D4A47;">
                <tr><td valign="top" style="width:30px;padding:5px 0;"><span style="display:inline-block;width:22px;height:22px;background:#0E6B68;color:#fff;border-radius:6px;text-align:center;line-height:22px;font-size:12px;font-weight:700;">1</span></td><td style="padding:5px 0;">Acesse <a href="${appUrl}" style="color:#0E6B68;font-weight:600;text-decoration:none;">${appUrl}</a> no navegador.</td></tr>
                <tr><td valign="top" style="padding:5px 0;"><span style="display:inline-block;width:22px;height:22px;background:#0E6B68;color:#fff;border-radius:6px;text-align:center;line-height:22px;font-size:12px;font-weight:700;">2</span></td><td style="padding:5px 0;">Informe o <strong>e-mail</strong> e a <strong>sua senha</strong> de acesso.</td></tr>
                <tr><td valign="top" style="padding:5px 0;"><span style="display:inline-block;width:22px;height:22px;background:#0E6B68;color:#fff;border-radius:6px;text-align:center;line-height:22px;font-size:12px;font-weight:700;">3</span></td><td style="padding:5px 0;">Acesse o <strong>painel administrativo</strong> da sua igreja.</td></tr>
                <tr><td valign="top" style="padding:5px 0;"><span style="display:inline-block;width:22px;height:22px;background:#0E6B68;color:#fff;border-radius:6px;text-align:center;line-height:22px;font-size:12px;font-weight:700;">4</span></td><td style="padding:5px 0;">Gerencie os modulos conforme a necessidade da igreja.</td></tr>
              </table>
            </td>
          </tr>${modulesBlock}
          <tr>
            <td style="padding:24px 30px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F7FAF9;border:1px solid #D9E3E0;border-radius:10px;"><tr><td style="padding:14px 18px;font-size:13.5px;line-height:1.6;color:#3D4A47;"><strong style="color:#17201F;">Precisa de ajuda?</strong> E so responder a este e-mail. A equipe SirvaOS apoia voce na implantacao e em qualquer duvida sobre o sistema.</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 30px 28px;border-top:1px solid #EEF5F3;">
              <p style="margin:0;font-size:12px;color:#6B7774;line-height:1.6;"><strong style="color:#084C4A;">Sirva<span style="color:#2BB3C0;">OS</span></strong> — organize para servir melhor.<br/>${footerNote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
