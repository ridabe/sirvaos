// Etapa 2 / Frente A (A5) — Camada de dados do painel "Meu Ministério" (Louvor).
// Fonte: RPC public.dashboard_lider_louvor (migration 20260612130000).
import { supabase } from "../lib/supabase";

export interface WorshipEventSummary {
  eventId: string;
  title: string;
  startsAt: string; // ISO
  eventType: string;
  totalAssigned: number;
  confirmed: number;
  pending: number;
  declined: number;
}

export interface LiderLouvorDashboard {
  upcomingEvents: WorshipEventSummary[];
  pendingCount: number;
  rosterCount: number;
  generatedAt: string;
}

export async function fetchLiderLouvorDashboard(): Promise<LiderLouvorDashboard> {
  const { data, error } = await supabase.rpc("dashboard_lider_louvor");
  if (error) {
    throw new Error(`Falha ao carregar o painel do louvor: ${error.message}`);
  }
  if (!data) {
    throw new Error("Painel do louvor retornou vazio.");
  }
  return data as LiderLouvorDashboard;
}
