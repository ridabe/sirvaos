// Cliente HTTP compartilhado da AbacatePay (Edge Functions).
// Lê credenciais dos secrets do Supabase. Aceita os nomes ABACATEPAY_* e,
// como fallback, os nomes usados no .env.local (API_ABACATE_*).
//
// Docs: https://docs.abacatepay.com  (base URL e /v2 já vêm no secret de URL)

type AbacateResponse<T> = { data: T | null; error: string | null; success: boolean };

function getEnv(...names: string[]): string | null {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function getBaseUrl(): string {
  // Ex.: "https://api.abacate.com.br/v2" (o secret já inclui o /v2).
  const raw = getEnv("ABACATEPAY_API_URL", "API_ABACATE_URL") ?? "https://api.abacatepay.com/v2";
  return raw.replace(/\/+$/, "");
}

function getApiKey(): string | null {
  return getEnv("ABACATEPAY_API_KEY", "API_ABACATE_API_KEY");
}

async function request<T>(path: string, body: unknown): Promise<AbacateResponse<T>> {
  const apiKey = getApiKey();
  if (!apiKey) return { data: null, error: "missing_abacatepay_api_key", success: false };

  const url = `${getBaseUrl()}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text().catch(() => "");
    let parsed: AbacateResponse<T> | null = null;
    try {
      parsed = text ? (JSON.parse(text) as AbacateResponse<T>) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const msg = parsed?.error ?? `http_${res.status}:${text.slice(0, 200)}`;
      return { data: null, error: msg, success: false };
    }
    if (parsed) return parsed;
    return { data: null, error: `unexpected_response:${text.slice(0, 200)}`, success: false };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "abacatepay_request_failed",
      success: false,
    };
  }
}

// ── Clientes ────────────────────────────────────────────────────────────────
export type AbacateCustomer = {
  id: string;
  email: string;
  name?: string;
  cellphone?: string;
  taxId?: string;
};

export async function createCustomer(input: {
  email: string;
  name?: string | null;
  cellphone?: string | null;
  taxId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AbacateResponse<AbacateCustomer>> {
  // Campos no nível raiz (o endpoint /customers/create NÃO usa wrapper "data").
  const body: Record<string, unknown> = { email: input.email };
  if (input.name) body.name = input.name;
  if (input.cellphone) body.cellphone = input.cellphone;
  if (input.taxId) body.taxId = input.taxId;
  if (input.metadata) body.metadata = input.metadata;
  // Cliente é único por taxId: a API devolve o registro existente se já houver.
  return await request<AbacateCustomer>("/customers/create", body);
}

// ── Assinaturas (Checkout de assinatura) ─────────────────────────────────────
export type AbacateBilling = {
  id: string;
  url: string;
  status: string;
  amount?: number;
  externalId?: string | null;
  customerId?: string | null;
};

export async function createSubscriptionCheckout(input: {
  productId: string;
  customerId?: string | null;
  externalId?: string | null;
  completionUrl?: string | null;
  returnUrl?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AbacateResponse<AbacateBilling>> {
  const body: Record<string, unknown> = {
    items: [{ id: input.productId, quantity: 1 }],
    methods: ["CARD"], // assinaturas só aceitam CARD
  };
  if (input.customerId) body.customerId = input.customerId;
  if (input.externalId) body.externalId = input.externalId;
  if (input.completionUrl) body.completionUrl = input.completionUrl;
  if (input.returnUrl) body.returnUrl = input.returnUrl;
  if (input.metadata) body.metadata = input.metadata;
  return await request<AbacateBilling>("/subscriptions/create", body);
}
