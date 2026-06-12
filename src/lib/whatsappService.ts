// Etapa 2 / Frente B (WhatsApp-first) — serviço cliente.
// Fase 1: links wa.me (abre o WhatsApp do usuário, sem credenciais).
// Fase 2: invoca a Edge Function send-whatsapp (envio automatizado via Z-API).
import { supabase } from "./supabase";

export type WhatsappContext =
  | "custom"
  | "announcement"
  | "worship_reminder"
  | "worship_confirmation"
  | "kids_communication"
  | "event_reminder";

export interface WhatsappRecipient {
  phone: string;
  message: string;
}

export interface SendWhatsappResult {
  sent: number;
  failed: number;
  results: Array<{ phone: string; status: string; providerMessageId?: string; error?: string }>;
}

// ── Fase 1 — link wa.me ──────────────────────────────────────────────────────
/** Normaliza para dígitos com DDI 55 (Brasil). Retorna "" se inválido. */
export function normalizeBrPhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  return "";
}

/** Monta um link wa.me com a mensagem pré-preenchida. */
export function buildWaMeLink(phone: string, message: string): string {
  const normalized = normalizeBrPhone(phone);
  const text = encodeURIComponent(message);
  return normalized
    ? `https://wa.me/${normalized}?text=${text}`
    : `https://wa.me/?text=${text}`;
}

/** Abre o WhatsApp (nova aba) com a mensagem pronta. */
export function openWhatsapp(phone: string, message: string): void {
  window.open(buildWaMeLink(phone, message), "_blank", "noopener,noreferrer");
}

// ── Fase 2 — envio automatizado via Edge Function ────────────────────────────
/**
 * Dispara o envio de mensagens WhatsApp pela Edge Function send-whatsapp.
 * Requer que o usuário logado seja owner/admin do tenant.
 */
export async function sendWhatsapp(params: {
  tenantId: string;
  recipients: WhatsappRecipient[];
  context?: WhatsappContext;
  contextId?: string | null;
}): Promise<SendWhatsappResult> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: {
      tenant_id: params.tenantId,
      context: params.context ?? "custom",
      context_id: params.contextId ?? null,
      recipients: params.recipients,
    },
  });

  if (error) {
    throw new Error(`Falha ao enviar WhatsApp: ${error.message}`);
  }
  return data as SendWhatsappResult;
}
