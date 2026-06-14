// Etapa 2 / Frente A — Painel inicial do Pastor / Admin Geral ("Saúde da Igreja").
// Consome a RPC dashboard_admin_geral via fetchAdminGeralDashboard.
// Spec: docs/etapa-2-A1-dashboard-pastor-contratos.md
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  HeartPulse,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users2,
  Wallet,
} from "lucide-react";
import {
  fetchAdminGeralDashboard,
  formatBRL,
  type AdminGeralDashboard,
} from "../data/dashboardAdminGeral";
import { fetchCareRadar } from "../data/careRadar";

const AZUL = "#1A2744";
const OURO = "#F5C842";
const VERDE = "#1f9d6b";
const VERMELHO = "#d4543a";
const MUTED = "#6b7280";
const LINHA = "#e6e8ee";

type LoadState = "idle" | "loading" | "ready" | "error";

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${LINHA}`,
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(16,22,38,.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function KpiTile({
  icon,
  value,
  label,
  trendLabel,
  trendDir,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  trendLabel?: string;
  trendDir?: "up" | "down" | "flat";
}) {
  const trendColor = trendDir === "up" ? VERDE : trendDir === "down" ? VERMELHO : MUTED;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: AZUL }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "rgba(26,39,68,.08)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: AZUL, marginTop: 8, lineHeight: 1 }}>
        {value.toLocaleString("pt-BR")}
      </div>
      {trendLabel ? (
        <div style={{ fontSize: 12.5, color: trendColor, marginTop: 6, fontWeight: 600 }}>
          {trendLabel}
        </div>
      ) : null}
    </Card>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: MUTED, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13.5, color: MUTED, padding: "6px 0" }}>{children}</div>;
}

export function DashboardSaudeIgreja({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<AdminGeralDashboard | null>(null);
  const [error, setError] = useState<string>("");
  const [coldCount, setColdCount] = useState<number | null>(null);

  async function load() {
    setState("loading");
    setError("");
    try {
      const result = await fetchAdminGeralDashboard(tenantId);
      setData(result);
      try {
        const radar = await fetchCareRadar(tenantId, 4);
        setColdCount(radar.length);
      } catch {
        setColdCount(null);
      }
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar o painel.");
      setState("error");
    }
  }

  useEffect(() => {
    if (tenantId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (state === "loading" || state === "idle") {
    return (
      <Card style={{ gridColumn: "1 / -1", textAlign: "center", color: MUTED }}>
        <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando a saúde da igreja…
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card style={{ gridColumn: "1 / -1", borderColor: "#f3c9bc", background: "#fdeee9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: VERMELHO, fontWeight: 700 }}>
          <AlertTriangle size={18} /> Não foi possível carregar o painel
        </div>
        <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6 }}>{error}</div>
        <button
          type="button"
          onClick={() => void load()}
          style={{ marginTop: 10, background: AZUL, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
        >
          Tentar novamente
        </button>
      </Card>
    );
  }

  if (!data) return null;

  const { kpis, finance, upcomingEvents, pendingAssignments } = data;

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HeartPulse size={22} color={OURO} />
          <h3 style={{ margin: 0, color: AZUL, fontSize: 19 }}>Saúde da Igreja</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          title="Atualizar"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${LINHA}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: MUTED, fontSize: 13 }}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <KpiTile icon={<Users2 size={18} />} value={kpis.activeMembers.value} label={kpis.activeMembers.label} />
        <KpiTile icon={<UserPlus size={18} />} value={kpis.newThisMonth.value} label={kpis.newThisMonth.label} trendLabel={kpis.newThisMonth.trendLabel} trendDir={kpis.newThisMonth.trendDir} />
        <KpiTile icon={<UserCheck size={18} />} value={kpis.visitors.value} label={kpis.visitors.label} />
        <KpiTile icon={<TrendingUp size={18} />} value={kpis.inProcess.value} label={kpis.inProcess.label} />
      </div>

      {/* Linha: financeiro + escalas pendentes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Financeiro */}
        {finance ? (
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL, marginBottom: 4 }}>
              <Wallet size={18} />
              <SectionTitle>Financeiro · {finance.monthLabel}</SectionTitle>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: MUTED }}>Receitas</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: VERDE }}>{formatBRL(finance.income)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: MUTED }}>Despesas</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: VERMELHO }}>{formatBRL(finance.expense)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: MUTED }}>Saldo</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: finance.balance >= 0 ? AZUL : VERMELHO }}>{formatBRL(finance.balance)}</div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Escalas aguardando confirmação */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionTitle>Escalas aguardando confirmação</SectionTitle>
            {pendingAssignments.count > 0 ? (
              <span style={{ background: OURO, color: AZUL, borderRadius: 999, padding: "2px 10px", fontWeight: 800, fontSize: 12 }}>
                {pendingAssignments.count}
              </span>
            ) : null}
          </div>
          {pendingAssignments.items.length === 0 ? (
            <EmptyHint>Tudo certo — nenhuma confirmação pendente. 🎉</EmptyHint>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {pendingAssignments.items.map((a) => (
                <div key={a.assignmentId} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5 }}>
                  <div>
                    <strong style={{ color: AZUL }}>{a.memberName}</strong>
                    <span style={{ color: MUTED }}>{a.roleName ? ` · ${a.roleName}` : ""}</span>
                    <div style={{ color: MUTED, fontSize: 12 }}>{a.eventTitle}</div>
                  </div>
                  <time style={{ color: MUTED, fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(a.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Próximos eventos */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL }}>
          <CalendarCheck size={18} />
          <SectionTitle>Próximos eventos</SectionTitle>
        </div>
        {upcomingEvents.length === 0 ? (
          <EmptyHint>Nenhum evento futuro cadastrado.</EmptyHint>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {upcomingEvents.map((ev) => (
              <div key={`${ev.source}-${ev.id}`} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13.5 }}>
                <time style={{ color: AZUL, fontWeight: 700, minWidth: 84 }}>
                  {new Date(ev.eventDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
                <div>
                  <strong style={{ color: AZUL }}>{ev.title}</strong>
                  <span style={{ color: MUTED }}>{ev.location ? ` · ${ev.location}` : ""}</span>
                  {ev.source === "worship_event" ? (
                    <span style={{ marginLeft: 8, fontSize: 11, background: "rgba(245,200,66,.25)", color: "#8a6d00", borderRadius: 5, padding: "1px 7px" }}>louvor</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cuidado pastoral (Frente C) */}
      <Card style={coldCount && coldCount > 0
        ? { background: "#fdeee9", borderColor: "rgba(212,84,58,.4)" }
        : { background: "#fffdf5", borderColor: "rgba(245,200,66,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL }}>
            <HeartPulse size={18} color={coldCount && coldCount > 0 ? VERMELHO : OURO} />
            <strong>Radar de Cuidado Pastoral</strong>
          </div>
          {coldCount !== null ? (
            <span style={{ fontSize: 22, fontWeight: 800, color: coldCount > 0 ? VERMELHO : VERDE }}>{coldCount}</span>
          ) : null}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          {coldCount === null
            ? "Membros que estão se afastando aparecem aqui."
            : coldCount > 0
              ? `${coldCount} membro(s) ativo(s) sem participação há mais de 4 semanas. Abra a aba "Cuidado" para agir.`
              : "Ninguém afastado no momento. 🎉"}
        </div>
      </Card>
    </div>
  );
}

export default DashboardSaudeIgreja;
      