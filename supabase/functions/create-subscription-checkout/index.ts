import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2?target=deno";
import { createCustomer, createSubscriptionCheckout } from "../_shared/abacatepay.ts";

// Função PÚBLICA chamada pela página de planos.
// Coleta os dados da igreja (mesmos que o Admin Global digita hoje), cria o
// registro em signup_requests e:
//   - plano automático → cria cliente + assinatura na AbacatePay e devolve a URL de checkout
//   - plano manual (Catedral) → registra pedido e envia e-mail ao suporte
// O tenant só é criado depois, pelo webhook (abacatepay-webhook), ao confirmar o pagamento.

type CheckoutRequest = {
  church_name?: string;
  legal_name?: string | null;
  document_number?: string | null;
  contact_name?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  plan_code?: string;
  slug?: string | null;
  coupons?: string[] | null;
};

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

function jsonResponse(status: number, body: unknown, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" }, corsHeaders);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    getDefaultKeyFromJsonEnv(Deno.env.get("SUPABASE_SECRET_KEYS")) ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    null;
  if (!supabaseUrl || !secretKey) {
    return jsonResponse(500, { error: "missing_env" }, corsHeaders);
  }

  let payload: CheckoutRequest;
  try {
    payload = (await req.json()) as CheckoutRequest;
  } catch {
    return jsonResponse(400, { error: "invalid_json" }, corsHeaders);
  }

  const churchName = String(payload.church_name ?? "").trim();
  const contactEmail = String(payload.contact_email ?? "").trim().toLowerCase();
  const planCode = String(payload.plan_code ?? "").trim();

  if (!churchName || !contactEmail || !planCode) {
    return jsonResponse(400, { error: "missing_required_fields" }, corsHeaders);
  }
  if (!isValidEmail(contactEmail)) {
    return jsonResponse(400, { error: "invalid_email" }, corsHeaders);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // 1) Carrega o plano selecionado.
  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("id, code, name, billing_type, abacatepay_product_id, status, is_public")
    .eq("code", planCode)
    .maybeSingle<{
      id: string;
      code: string;
      name: string;
      billing_type: "automatic" | "manual";
      abacatepay_product_id: string | null;
      status: string;
      is_public: boolean;
    }>();

  if (planError) return jsonResponse(500, { error: "plan_lookup_failed" }, corsHeaders);
  if (!plan || plan.status !== "active" || !plan.is_public) {
    return jsonResponse(404, { error: "plan_not_found" }, corsHeaders);
  }

  // 2) Gera um slug único (contra tenants e contra signups pendentes).
  const baseSlug = slugify(payload.slug?.trim() || churchName) || "igreja";
  let slug = baseSlug;
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`.slice(0, 40);
    const { data: takenTenant } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    const { data: takenSignup } = await admin
      .from("signup_requests")
      .select("id")
      .eq("slug", candidate)
      .in("status", ["pending_payment", "manual_pending", "paid"])
      .maybeSingle();
    if (!takenTenant && !takenSignup) {
      slug = candidate;
      break;
    }
  }

  const isManual = plan.billing_type === "manual";

  // 3) Cria o registro de cadastro (ponte).
  const { data: signup, error: signupError } = await admin
    .from("signup_requests")
    .insert({
      status: isManual ? "manual_pending" : "pending_payment",
      church_name: churchName,
      slug,
      legal_name: payload.legal_name ?? null,
      document_number: payload.document_number ?? null,
      contact_name: payload.contact_name ?? null,
      contact_email: contactEmail,
      contact_phone: payload.contact_phone ?? null,
      plan_id: plan.id,
      plan_code: plan.code,
    })
    .select("id")
    .single<{ id: string }>();

  if (signupError || !signup) {
    return jsonResponse(500, { error: "signup_create_failed", details: signupError?.message }, corsHeaders);
  }

  const requestId = signup.id;
  await admin.from("signup_requests").update({ external_id: requestId }).eq("id", requestId);

  // 4a) Caminho manual (Catedral): avisa o suporte e encerra.
  if (isManual) {
    const supportEmail = (Deno.env.get("SUPPORT_EMAIL") ?? "suporte@sirvaos.com.br").trim();
    const emailResult = await sendSupportRequestEmail({
      to: supportEmail,
      planName: plan.name,
      churchName,
      contactName: payload.contact_name ?? null,
      contactEmail,
      contactPhone: payload.contact_phone ?? null,
      documentNumber: payload.document_number ?? null,
      legalName: payload.legal_name ?? null,
      requestId,
    });
    return jsonResponse(
      200,
      { mode: "manual", request_id: requestId, email_sent: emailResult.sent, email_error: emailResult.error },
      corsHeaders,
    );
  }

  // 4b) Caminho automático: precisa do product_id configurado.
  if (!plan.abacatepay_product_id) {
    await admin
      .from("signup_requests")
      .update({ status: "failed", error_message: "plan_not_configured_product_id" })
      .eq("id", requestId);
    return jsonResponse(500, { error: "plan_not_configured" }, corsHeaders);
  }

  // Cria/recupera o cliente na AbacatePay (único por taxId/e-mail).
  const customerRes = await createCustomer({
    email: contactEmail,
    name: payload.contact_name ?? churchName,
    cellphone: payload.contact_phone ?? null,
    taxId: payload.document_number ?? null,
    metadata: { signup_request_id: requestId, slug },
  });
  if (!customerRes.success || !customerRes.data?.id) {
    await admin
      .from("signup_requests")
      .update({ status: "failed", error_message: `customer:${customerRes.error}` })
      .eq("id", requestId);
    return jsonResponse(502, { error: "abacatepay_customer_failed", details: customerRes.error }, corsHeaders);
  }
  const customerId = customerRes.data.id;

  const appUrl = (Deno.env.get("APP_URL") ?? "https://app.sirvaos.com.br").trim().replace(/\/+$/, "");
  const checkoutRes = await createSubscriptionCheckout({
    productId: plan.abacatepay_product_id,
    customerId,
    externalId: requestId,
    completionUrl: `${appUrl}/assinatura/sucesso?req=${requestId}`,
    returnUrl: `${appUrl}/planos`,
    coupons: Array.isArray(payload.coupons) ? payload.coupons : null,
    metadata: { signup_request_id: requestId, plan_code: plan.code, slug },
  });
  if (!checkoutRes.success || !checkoutRes.data?.url) {
    await admin
      .from("signup_requests")
      .update({ status: "failed", abacatepay_customer_id: customerId, error_message: `checkout:${checkoutRes.error}` })
      .eq("id", requestId);
    return jsonResponse(502, { error: "abacatepay_checkout_failed", details: checkoutRes.error }, corsHeaders);
  }

  await admin
    .from("signup_requests")
    .update({ abacatepay_customer_id: customerId, abacatepay_billing_id: checkoutRes.data.id })
    .eq("id", requestId);

  return jsonResponse(
    200,
    { mode: "checkout", request_id: requestId, url: checkoutRes.data.url },
    corsHeaders,
  );
});

// ── E-mail ao suporte para o plano manual (Catedral) ─────────────────────────
async function sendSupportRequestEmail(params: {
  to: string;
  planName: string;
  churchName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  documentNumber: string | null;
  legalName: string | null;
  requestId: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return { sent: false, error: "missing_resend_api_key" };
  const fromEmail = Deno.env.get("EMAIL_FROM") ?? "noreply@sirvaos.com.br";

  const esc = (v: string | null) =>
    String(v ?? "—")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const html = `
    <h2>Novo pedido de plano ${esc(params.planName)} (liberação manual)</h2>
    <p>Um cliente solicitou o plano <strong>${esc(params.planName)}</strong> pela página de planos.
    Esse plano não é automático — provisione o acesso manualmente no Admin Global.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
      <tr><td><strong>Igreja</strong></td><td>${esc(params.churchName)}</td></tr>
      <tr><td><strong>Responsável</strong></td><td>${esc(params.contactName)}</td></tr>
      <tr><td><strong>E-mail</strong></td><td>${esc(params.contactEmail)}</td></tr>
      <tr><td><strong>Telefone</strong></td><td>${esc(params.contactPhone)}</td></tr>
      <tr><td><strong>Documento</strong></td><td>${esc(params.documentNumber)}</td></tr>
      <tr><td><strong>Razão social</strong></td><td>${esc(params.legalName)}</td></tr>
      <tr><td><strong>ID do pedido</strong></td><td>${esc(params.requestId)}</td></tr>
    </table>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `SirvaOS <${fromEmail}>`,
        to: [params.to],
        reply_to: params.contactEmail,
        subject: `Pedido de plano ${params.planName} — ${params.churchName}`,
        html,
      }),
    });
    if (res.ok) return { sent: true, error: null };
    const body = await res.text().catch(() => "");
    return { sent: false, error: `resend_${res.status}:${body.slice(0, 180)}` };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "resend_failed" };
  }
}
