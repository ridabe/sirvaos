import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2?target=deno";

type ProvisionRequest = {
  tenant_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin";
  action: "create" | "reset";
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
  const action = payload.action === "reset" ? "reset" : "create";

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

  return jsonResponse(
    200,
    {
      tenant_id: tenantId,
      user_id: targetUserId,
      email,
      role,
      action,
      temporary_password: temporaryPassword,
    },
    corsHeaders,
  );
});
