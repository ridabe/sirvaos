// Etapa 2 / Frente A (A6) — Camada de dados do painel "Minha Jornada" do membro.
// Fonte: RPC public.dashboard_membro (migration 20260612130000).
import { supabase } from "../lib/supabase";

export type AssignmentStatus = "pending" | "confirmed" | "declined" | "standby";

export interface MyAssignment {
  assignmentId: string;
  eventId: string;
  eventTitle: string;
  startsAt: string; // ISO
  roleName: string | null;
  status: AssignmentStatus;
}

export interface MyUpcomingEvent {
  id: string;
  title: string;
  eventDate: string; // ISO
  location: string | null;
}

export interface MyAnnouncement {
  id: string;
  title: string;
  message: string;
  publishedAt: string; // ISO
}

export interface MembroDashboard {
  myAssignments: MyAssignment[];
  upcomingEvents: MyUpcomingEvent[];
  announcements: MyAnnouncement[];
  journey: { enabled: boolean };
  generatedAt: string;
}

export async function fetchMembroDashboard(): Promise<MembroDashboard> {
  const { data, error } = await supabase.rpc("dashboard_membro");
  if (error) {
    throw new Error(`Falha ao carregar sua jornada: ${error.message}`);
  }
  if (!data) {
    throw new Error("Painel do membro retornou vazio.");
  }
  return data as MembroDashboard;
}
