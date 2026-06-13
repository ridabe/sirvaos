// Etapa 2 / Frente B (B8) — Camada de dados do painel de logs de WhatsApp.
// Lê public.whatsapp_messages (RLS já restringe a owner/admin do tenant).
import { supabase } from "../lib/supabase";

export interface WhatsappLogRow {
  id: string;
  to_phone: string;
  message: string;
  context: string;
  status: "queued" | "sent" | "failed";
  delivery_status: string | null; // sent | delivered | read | failed
  error: string | null;
  provider_message_id: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export async function fetchWhatsappLogs(
  tenantId: string,
  opts?: { limit?: number },
): Promise<WhatsappLogRow[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select(
      "id,to_phone,message,context,status,delivery_status,error,provider_message_id,delivered_at,read_at,created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (error) throw new Error(error.message);
  return (data ?? []) as WhatsappLogRow[];
}

export const WHATSAPP_CONTEXT_LABEL: Record<string, string> = {
  custom: "Avulso",
  announcement: "Comunicado",
  worship_reminder: "Lembrete (louvor)",
  worship_confirmation: "Confirmação de escala",
  kids_communication: "Kids",
  event_reminder: "Lembrete de evento",
};
