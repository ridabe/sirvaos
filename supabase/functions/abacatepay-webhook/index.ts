import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.106.2?target=deno";

// Webhook do AbacatePay (verify_jwt = false em config.toml).
// Segurança: (1) ?webhookSecret= na query  (2) assinatura HMAC-SHA256 no header
// X-Webhook-Signature. Idempotência por payload.id em public.subscription_events.
// Em subscription.completed, provisiona o tenant + admin reutilizando a Edge
// Function provision-tenant-admin (chamada interna com x-internal-secret).

// Chave pública da AbacatePay para validar o HMAC (docs/webhooks/security).
const ABACATEPAY_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyHmac(rawBody: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  // Compara contra base64 e contra hex (AbacatePay pode enviar em qualquer formato).
  const expectedHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return (
    timingSafeEqual(enc.encode(expectedB64), enc.encode(signature)) ||
    timingSafeEqual(enc.encode(expectedHex), enc.encode(signature))
  );
}

function addMonthsIso(from: Date, frequency: string | null | undefined): string {
  const d = new Date(from.getTime());
  switch ((frequency ?? "MONTHLY").toUpperCase()) {
    case "WEEKLY": d.setDate(d.getDate() + 7); break;
    case "QUARTERLY": d.setMonth(d.getMonth() + 3); break;
    case "SEMIANNUALLY": d.setMonth(d.getMonth() + 6); break;
    case "ANNUALLY": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); // MONTHLY
  }
  return d.toISOString();
}

serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    getDefaultKeyFromJsonEnv(Deno.env.get("SUPABASE_SECRET_KEYS")) ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    null;
  if (!supabaseUrl || !secretKey) return jsonResponse(500, { error: "missing_env" });

  // Autenticação flexível: passa se QUALQUER uma validar —
  //  (a) secret na query (?webhookSecret=)
  //  (b) HMAC assinado com o secret configurado
  //  (c) HMAC assinado com a chave pública da AbacatePay
  const expectedSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET") ?? "";
  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("webhookSecret") ?? "";
  const rawBody = await req.text();
  const signature = req.headers.get("X-Webhook-Signature") ?? "";

  const secretOk = expectedSecret.length > 0 && providedSecret === expectedSecret;
  const hmacSecretOk = await verifyHmac(rawBody, signature, expectedSecret);
  const hmacPublicOk = await verifyHmac(rawBody, signature, ABACATEPAY_PUBLIC_KEY);
  if (!secretOk && !hmacSecretOk && !hmacPublicOk) {
    return jsonResponse(401, {
      error: "unauthorized",
      debug: { has_query_secret: providedSecret.length > 0, has_signature: signature.length > 0 },
    });
  }

  let event: {
    id?: string;
    event?: string;
    devMode?: boolean;
    data?: Record<string, any>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  const eventId = event.id ?? null;
  const eventType = event.event ?? "";
  const data = event.data ?? {};

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // 3) Idempotência: registra o evento; se já existe, não reprocessa.
  if (eventId) {
    const { error: insertErr } = await admin
      .from("subscription_events")
      .insert({ abacatepay_event_id: eventId, event: eventType, payload: event });
    if (insertErr) {
      // 23505 = unique_violation → evento já processado.
      if ((insertErr as { code?: string }).code === "23505") {
        return jsonResponse(200, { ok: true, duplicate: true });
      }
      return jsonResponse(500, { error: "event_log_failed", details: insertErr.message });
    }
  }

  try {
    switch (eventType) {
      case "subscription.completed":
        await handleSubscriptionCompleted(admin, supabaseUrl, secretKey, data, eventId);
        break;
      case "subscription.renewed":
        await handleSubscriptionRenewed(admin, data);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(admin, data);
        break;
      default:
        // Outros eventos só ficam registrados em subscription_events.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler_failed";
    // Não marca processed_at → permite retentativa da AbacatePay.
    return jsonResponse(500, { error: "handler_error", details: message });
  }

  if (eventId) {
    await admin
      .from("subscription_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("abacatepay_event_id", eventId);
  }

  return jsonResponse(200, { ok: true });
});

// ── subscription.completed → provisiona tenant + admin ───────────────────────
async function handleSubscriptionCompleted(
  admin: SupabaseClient,
  supabaseUrl: string,
  serviceKey: string,
  data: Record<string, any>,
  eventId: string | null,
) {
  const subscriptionId: string | null = data?.subscription?.id ?? null;
  const customerId: string | null = data?.customer?.id ?? data?.checkout?.customerId ?? null;
  const billingId: string | null = data?.checkout?.id ?? null;
  const frequency: string | null = data?.subscription?.frequency ?? data?.checkout?.frequency ?? null;
  const externalId: string | null =
    data?.payment?.externalId ?? data?.checkout?.externalId ?? data?.subscription?.externalId ?? null;

  // Localiza o pedido de cadastro (signup_requests).
  let signup = await findSignupRequest(admin, { externalId, billingId, customerId });
  if (!signup) {
    // Sem cadastro vinculado: nada a provisionar (registra e segue).
    return;
  }

  // Já provisionado (idempotência secundária).
  if (signup.status === "provisioned" && signup.tenant_id) {
    if (eventId) {
      await admin
        .from("subscription_events")
        .update({ tenant_id: signup.tenant_id, signup_request_id: signup.id })
        .eq("abacatepay_event_id", eventId);
    }
    return;
  }

  const nowIso = new Date().toISOString();
  const periodEnd = addMonthsIso(new Date(), frequency);

  // 1) Cria o tenant (com tentativa de slug alternativo em caso de colisão).
  let tenantId: string | null = null;
  let slug = signup.slug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateSlug = attempt === 0 ? slug : `${slug}-${attempt + 1}`.slice(0, 40);
    const { data: tenantRow, error: tenantErr } = await admin
      .from("tenants")
      .insert({
        name: signup.church_name,
        slug: candidateSlug,
        legal_name: signup.legal_name,
        document_number: signup.document_number,
        contact_name: signup.contact_name,
        contact_email: signup.contact_email,
        contact_phone: signup.contact_phone,
        plan_id: signup.plan_id,
        status: "active",
        subscription_status: "active",
        billing_type: "automatic",
        abacatepay_customer_id: customerId,
        abacatepay_subscription_id: subscriptionId,
        subscription_started_at: nowIso,
        current_period_end: periodEnd,
      })
      .select("id")
      .single<{ id: string }>();

    if (!tenantErr && tenantRow?.id) {
      tenantId = tenantRow.id;
      slug = candidateSlug;
      break;
    }
    // 23505 = slug duplicado → tenta o próximo sufixo.
    if ((tenantErr as { code?: string } | null)?.code !== "23505") {
      throw new Error(`tenant_insert_failed:${tenantErr?.message}`);
    }
  }
  if (!tenantId) throw new Error("tenant_slug_exhausted");

  // 2) Ativa todos os módulos da plataforma para o tenant.
  const { data: modules } = await admin
    .from("platform_modules")
    .select("id")
    .eq("status", "active");
  if (modules && modules.length > 0) {
    const rows = modules.map((m: { id: string }) => ({
      tenant_id: tenantId,
      module_id: m.id,
      status: "active",
      enabled_at: nowIso,
    }));
    await admin.from("tenant_modules").upsert(rows, { onConflict: "tenant_id,module_id" });
  }

  // 3) Provisiona o admin (owner) reutilizando provision-tenant-admin (chamada interna).
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  const provisionRes = await fetch(`${supabaseUrl}/functions/v1/provision-tenant-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      email: signup.contact_email,
      full_name: signup.contact_name,
      role: "owner",
      action: "create",
    }),
  });

  if (!provisionRes.ok) {
    const body = await provisionRes.text().catch(() => "");
    throw new Error(`provision_failed_${provisionRes.status}:${body.slice(0, 200)}`);
  }

  // 4) Marca o cadastro como provisionado.
  await admin
    .from("signup_requests")
    .update({ status: "provisioned", tenant_id: tenantId, abacatepay_customer_id: customerId })
    .eq("id", signup.id);

  if (eventId) {
    await admin
      .from("subscription_events")
      .update({ tenant_id: tenantId, signup_request_id: signup.id })
      .eq("abacatepay_event_id", eventId);
  }
}

// ── subscription.renewed → renova período ────────────────────────────────────
async function handleSubscriptionRenewed(admin: SupabaseClient, data: Record<string, any>) {
  const subscriptionId: string | null = data?.subscription?.id ?? null;
  if (!subscriptionId) return;
  const frequency: string | null = data?.subscription?.frequency ?? null;
  await admin
    .from("tenants")
    .update({ subscription_status: "active", current_period_end: addMonthsIso(new Date(), frequency) })
    .eq("abacatepay_subscription_id", subscriptionId);
}

// ── subscription.cancelled → marca cancelada (acesso até fim do período) ──────
async function handleSubscriptionCancelled(admin: SupabaseClient, data: Record<string, any>) {
  const subscriptionId: string | null = data?.subscription?.id ?? null;
  if (!subscriptionId) return;
  await admin
    .from("tenants")
    .update({ subscription_status: "cancelled" })
    .eq("abacatepay_subscription_id", subscriptionId);
}

// ── Localiza o signup_request por externalId, billing id ou customer id ──────
async function findSignupRequest(
  admin: SupabaseClient,
  keys: { externalId: string | null; billingId: string | null; customerId: string | null },
): Promise<
  | {
      id: string;
      status: string;
      slug: string;
      church_name: string;
      legal_name: string | null;
      document_number: string | null;
      contact_name: string | null;
      contact_email: string;
      contact_phone: string | null;
      plan_id: string | null;
      tenant_id: string | null;
    }
  | null
> {
  const cols =
    "id, status, slug, church_name, legal_name, document_number, contact_name, contact_email, contact_phone, plan_id, tenant_id";

  // 1) Pelo externalId (= id do signup_request).
  if (keys.externalId) {
    const { data } = await admin.from("signup_requests").select(cols).eq("id", keys.externalId).maybeSingle();
    if (data) return data as any;
    const byExt = await admin.from("signup_requests").select(cols).eq("external_id", keys.externalId).maybeSingle();
    if (byExt.data) return byExt.data as any;
  }
  // 2) Pelo billing id do checkout.
  if (keys.billingId) {
    const { data } = await admin
      .from("signup_requests")
      .select(cols)
      .eq("abacatepay_billing_id", keys.billingId)
      .maybeSingle();
    if (data) return data as any;
  }
  // 3) Pelo customer id (último cadastro pendente desse cliente).
  if (keys.customerId) {
    const { data } = await admin
      .from("signup_requests")
      .select(cols)
      .eq("abacatepay_customer_id", keys.customerId)
      .in("status", ["pending_payment", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as any;
  }
  return null;
}
