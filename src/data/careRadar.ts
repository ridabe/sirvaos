// Frente C — Cuidado Pastoral: camada de dados (radar + tarefas).
import { supabase } from "../lib/supabase";

export type CareBand = "green" | "yellow" | "red";
export type CareTaskStatus = "open" | "in_progress" | "done" | "dismissed";

export interface CareRadarRow {
  member_id: string;
  name: string;
  phone: string | null;
  whatsapp_opt_in: boolean;
  last_activity: string | null; // ISO date
  weeks_since: number | null;
  score: number;
  band: CareBand;
  signals: Record<string, string>;
  has_open_task: boolean;
}

export interface CareTaskRow {
  id: string;
  member_id: string;
  reason: string | null;
  status: CareTaskStatus;
  note: string | null;
  assigned_profile_id: string | null;
  created_at: string;
  resolved_at: string | null;
  members: { name: string; phone: string | null } | null;
}

export async function fetchCareRadar(tenantId: string, weeks = 4): Promise<CareRadarRow[]> {
  const { data, error } = await supabase.rpc("member_care_radar", { p_tenant_id: tenantId, p_weeks: weeks });
  if (error) throw new Error(error.message);
  return (data ?? []) as CareRadarRow[];
}

export async function createCareTask(params: {
  tenantId: string;
  memberId: string;
  reason?: string | null;
  assignedProfileId?: string | null;
}): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const createdBy = sessionData?.session?.user?.id ?? null;
  const { error } = await supabase.from("care_tasks").insert({
    tenant_id: params.tenantId,
    member_id: params.memberId,
    reason: params.reason ?? null,
    assigned_profile_id: params.assignedProfileId ?? null,
    status: "open",
    created_by: createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function fetchCareTasks(tenantId: string): Promise<CareTaskRow[]> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select("id, member_id, reason, status, note, assigned_profile_id, created_at, resolved_at, members:member_id(name, phone)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<CareTaskRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateCareTask(id: string, patch: { status?: CareTaskStatus; note?: string }): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.note !== undefined) update.note = patch.note;
  if (patch.status) {
    update.status = patch.status;
    if (patch.status === "done" || patch.status === "dismissed") {
      update.resolved_at = new Date().toISOString();
      const { data: sessionData } = await supabase.auth.getSession();
      update.resolved_by = sessionData?.session?.user?.id ?? null;
    } else {
      update.resolved_at = null;
      update.resolved_by = null;
    }
  }
  const { error } = await supabase.from("care_tasks").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function assignCareTask(id: string, profileId: string | null): Promise<void> {
  const { error } = await supabase.from("care_tasks").update({ assigned_profile_id: profileId }).eq("id", id);
  if (error) throw new Error(error.message);
}

// Tarefas designadas ao usuário logado (RLS retorna só as próprias). Usado no portal do líder.
export async function fetchMyCareTasks(): Promise<CareTaskRow[]> {
  const { data, error } = await supabase
    .from("care_tasks")
    .select("id, member_id, reason, status, note, assigned_profile_id, created_at, resolved_at, members:member_id(name, phone)")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .returns<CareTaskRow[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const CARE_SIGNAL_LABEL: Record<string, string> = {
  louvor: "Louvor",
  escola_biblica: "Escola Bíblica",
  kids: "Kids",
  intercessao: "Intercessão",
  historico: "Histórico",
};
