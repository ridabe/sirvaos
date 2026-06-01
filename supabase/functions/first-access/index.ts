import { createClient } from "npm:@supabase/supabase-js@2.106.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FirstAccessAction = "start" | "complete";

type FirstAccessPayload = {
  action?: FirstAccessAction;
  email?: string;
  dateOfBirth?: string;
  token?: string;
  password?: string;
};

type MemberRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  status: string;
  status_v2: string;
  date_of_birth: string | null;
  tenants: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  tenant_role: "owner" | "admin" | "member";
  member_id: string | null;
  status: "active" | "invited" | "suspended";
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getRequestIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createToken() {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const encoded = btoa(String.fromCharCode(...random))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `${crypto.randomUUID()}.${encoded}`;
}

function isStrongEnoughPassword(password: string) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

async function logAttempt(
  action: FirstAccessAction,
  result: string,
  email: string,
  req: Request,
  member?: Pick<MemberRow, "id" | "tenant_id"> | null,
) {
  await admin.from("first_access_attempts").insert({
    email,
    tenant_id: member?.tenant_id ?? null,
    member_id: member?.id ?? null,
    request_ip: getRequestIp(req),
    action,
    result,
  });
}

async function isRateLimited(email: string, req: Request) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const ip = getRequestIp(req);

  const { count: emailCount } = await admin
    .from("first_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if ((emailCount ?? 0) >= 5) {
    return true;
  }

  if (!ip) {
    return false;
  }

  const { count: ipCount } = await admin
    .from("first_access_attempts")
    .select("id", { count: "exact", head: true })
    .eq("request_ip", ip)
    .gte("created_at", since);

  return (ipCount ?? 0) >= 20;
}

async function findEligibleMember(email: string) {
  const { data, error } = await admin
    .from("members")
    .select("id, tenant_id, name, email, status, status_v2, date_of_birth, tenants!inner(id, name, slug, status)")
    .ilike("email", email)
    .in("status_v2", ["active"])
    .returns<MemberRow[]>();

  if (error) {
    throw error;
  }

  const activeMembers = (data ?? []).filter((member) => member.tenants?.status === "active");

  if (activeMembers.length !== 1) {
    return {
      member: null,
      reason: activeMembers.length > 1 ? "duplicate_member_email" : "member_not_found",
    };
  }

  return { member: activeMembers[0], reason: null };
}

async function findProfileForMember(member: MemberRow, email: string) {
  const { data: byMember } = await admin
    .from("profiles")
    .select("id, email, full_name, tenant_id, tenant_role, member_id, status")
    .eq("member_id", member.id)
    .maybeSingle<ProfileRow>();

  if (byMember) {
    return byMember;
  }

  const { data: byEmail } = await admin
    .from("profiles")
    .select("id, email, full_name, tenant_id, tenant_role, member_id, status")
    .ilike("email", email)
    .maybeSingle<ProfileRow>();

  return byEmail ?? null;
}

async function startFirstAccess(payload: FirstAccessPayload, req: Request) {
  const email = normalizeEmail(payload.email);

  if (!email || !email.includes("@")) {
    return json({ ok: false, code: "invalid_email", message: "Informe um e-mail válido." }, 400);
  }

  if (await isRateLimited(email, req)) {
    await logAttempt("start", "rate_limited", email, req);
    return json({
      ok: false,
      code: "rate_limited",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    }, 429);
  }

  const { member, reason } = await findEligibleMember(email);
  if (!member) {
    await logAttempt("start", reason ?? "member_not_found", email, req);
    return json({
      ok: false,
      code: reason,
      message:
        reason === "duplicate_member_email"
          ? "Encontramos mais de um cadastro com este e-mail. Procure a secretaria da igreja."
          : "Não encontramos um membro ativo com este e-mail.",
    }, 404);
  }

  if (member.date_of_birth && !payload.dateOfBirth) {
    await logAttempt("start", "birth_date_required", email, req, member);
    return json({
      ok: true,
      code: "birth_date_required",
      requiresBirthDate: true,
      message: "Confirme sua data de nascimento para continuar.",
    });
  }

  if (member.date_of_birth && payload.dateOfBirth !== member.date_of_birth) {
    await logAttempt("start", "birth_date_mismatch", email, req, member);
    return json({
      ok: false,
      code: "invalid_member_data",
      message: "Os dados informados não conferem com o cadastro.",
    }, 403);
  }

  const existingProfile = await findProfileForMember(member, email);
  if (existingProfile?.status === "active") {
    await logAttempt("start", "already_active", email, req, member);
    return json({
      ok: true,
      code: "already_active",
      alreadyActive: true,
      message: "Este acesso já foi ativado. Entre com sua senha.",
    });
  }

  if (existingProfile?.status === "suspended") {
    await logAttempt("start", "profile_suspended", email, req, member);
    return json({
      ok: false,
      code: "profile_suspended",
      message: "Este acesso está suspenso. Procure a administração da igreja.",
    }, 403);
  }

  const token = createToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await admin
    .from("first_access_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("tenant_id", member.tenant_id)
    .eq("member_id", member.id)
    .is("used_at", null);

  const { error: tokenError } = await admin.from("first_access_tokens").insert({
    tenant_id: member.tenant_id,
    member_id: member.id,
    email,
    token_hash: tokenHash,
    expires_at: expiresAt,
    request_ip: getRequestIp(req),
    user_agent: req.headers.get("user-agent"),
  });

  if (tokenError) {
    throw tokenError;
  }

  await logAttempt("start", "token_created", email, req, member);

  return json({
    ok: true,
    code: "token_created",
    activationToken: token,
    expiresAt,
    memberName: member.name,
    tenantName: member.tenants?.name ?? "Igreja",
    message: "Cadastro localizado. Crie sua senha para ativar o acesso.",
  });
}

async function completeFirstAccess(payload: FirstAccessPayload, req: Request) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password ?? "");
  const token = String(payload.token ?? "");

  if (!email || !token || !password) {
    return json({ ok: false, code: "missing_fields", message: "Informe e-mail, token e senha." }, 400);
  }

  if (!isStrongEnoughPassword(password)) {
    return json({
      ok: false,
      code: "weak_password",
      message: "A senha precisa ter pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números.",
    }, 400);
  }

  if (await isRateLimited(email, req)) {
    await logAttempt("complete", "rate_limited", email, req);
    return json({
      ok: false,
      code: "rate_limited",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    }, 429);
  }

  const tokenHash = await sha256(token);
  const { data: tokenRow, error: tokenError } = await admin
    .from("first_access_tokens")
    .select("id, tenant_id, member_id, email, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (tokenError) {
    throw tokenError;
  }

  if (!tokenRow || normalizeEmail(tokenRow.email) !== email) {
    await logAttempt("complete", "invalid_token", email, req);
    return json({
      ok: false,
      code: "invalid_token",
      message: "O código de primeiro acesso expirou ou é inválido.",
    }, 403);
  }

  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, tenant_id, name, email, status, status_v2, date_of_birth, tenants!inner(id, name, slug, status)")
    .eq("id", tokenRow.member_id)
    .single<MemberRow>();

  if (memberError || !member || member.tenants?.status !== "active" || member.status_v2 !== "active") {
    await logAttempt("complete", "member_not_active", email, req);
    return json({
      ok: false,
      code: "member_not_active",
      message: "O cadastro de membro não está ativo.",
    }, 403);
  }

  const existingProfile = await findProfileForMember(member, email);
  if (existingProfile?.status === "active") {
    await logAttempt("complete", "already_active", email, req, member);
    return json({
      ok: true,
      code: "already_active",
      alreadyActive: true,
      message: "Este acesso já foi ativado. Entre com sua senha.",
    });
  }

  if (existingProfile?.status === "suspended") {
    await logAttempt("complete", "profile_suspended", email, req, member);
    return json({
      ok: false,
      code: "profile_suspended",
      message: "Este acesso está suspenso. Procure a administração da igreja.",
    }, 403);
  }

  let authUserId = existingProfile?.id ?? null;

  if (authUserId) {
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: {
        first_access_completed_at: new Date().toISOString(),
        member_id: member.id,
        tenant_id: member.tenant_id,
      },
    });

    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_access_completed_at: new Date().toISOString(),
        member_id: member.id,
        tenant_id: member.tenant_id,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error("Auth user was not created");
    }

    authUserId = data.user.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: authUserId,
      email,
      full_name: existingProfile?.full_name ?? member.name,
      tenant_id: member.tenant_id,
      tenant_role: existingProfile?.tenant_role ?? "member",
      member_id: member.id,
      status: "active",
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  await admin
    .from("first_access_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  await admin.from("audit_logs").insert({
    tenant_id: member.tenant_id,
    actor_user_id: authUserId,
    action: "auth.first_access.complete",
    entity_type: "profiles",
    entity_id: authUserId,
    metadata: {
      member_id: member.id,
      email,
      source: "first_access",
    },
  });

  await logAttempt("complete", "activated", email, req, member);

  return json({
    ok: true,
    code: "activated",
    message: "Senha criada. Seu acesso foi ativado.",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, code: "server_not_configured", message: "Função não configurada." }, 500);
  }

  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed", message: "Método não permitido." }, 405);
  }

  try {
    const payload = (await req.json()) as FirstAccessPayload;

    if (payload.action === "start") {
      return await startFirstAccess(payload, req);
    }

    if (payload.action === "complete") {
      return await completeFirstAccess(payload, req);
    }

    return json({ ok: false, code: "invalid_action", message: "Ação inválida." }, 400);
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      code: "unexpected_error",
      message: "Não foi possível concluir o primeiro acesso agora.",
    }, 500);
  }
});
