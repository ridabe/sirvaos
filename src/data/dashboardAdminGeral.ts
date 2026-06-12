// Etapa 2 / Frente A — Camada de dados do painel do Pastor / Admin Geral ("Saúde da Igreja").
// Contrato definido em docs/etapa-2-A1-dashboard-pastor-contratos.md.
// Fonte: RPC public.dashboard_admin_geral (migration 20260612120000).
import { supabase } from "../lib/supabase";

export type TrendDir = "up" | "down" | "flat";

export interface KpiCard {
  value: number;
  label: string;
  trendLabel?: string;
  trendDir?: TrendDir;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  monthLabel: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  eventDate: string; // ISO
  location: string | null;
  source: "tenant_event" | "worship_event";
}

export interface PendingAssignment {
  assignmentId: string;
  eventId: string;
  eventTitle: string;
  startsAt: string; // ISO
  memberName: string;
  roleName: string | null;
}

export interface CareAlertSummary {
  coldMembersCount: number;
  enabled: boolean;
}

export interface AdminGeralDashboard {
  kpis: {
    activeMembers: KpiCard;
    newThisMonth: KpiCard;
    visitors: KpiCard;
    inProcess: KpiCard;
  };
  finance: FinanceSummary | null; // null quando o módulo Financeiro está inativo
  upcomingEvents: UpcomingEvent[];
  pendingAssignments: {
    count: number;
    items: PendingAssignment[];
  };
  careAlerts: CareAlertSummary;
  generatedAt: string; // ISO
}

/**
 * Busca os KPIs consolidados do painel do Pastor/Admin Geral em uma única chamada.
 * A RPC valida o papel do usuário (owner/admin do tenant ou super admin) e respeita RLS.
 */
export async function fetchAdminGeralDashboard(
  tenantId: string,
): Promise<AdminGeralDashboard> {
  const { data, error } = await supabase.rpc("dashboard_admin_geral", {
    p_tenant_id: tenantId,
  });

  if (error) {
    throw new Error(`Falha ao carregar o painel da igreja: ${error.message}`);
  }
  if (!data) {
    throw new Error("Painel da igreja retornou vazio.");
  }

  return data as AdminGeralDashboard;
}

// Helper de formatação monetária (R$) para os cartões financeiros.
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
