// Etapa 2 / Frente A (A6) — Painel "Minha Jornada" do membro (portal/app).
// Consome a RPC dashboard_membro via fetchMembroDashboard.
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, Clock3, Compass, Music, RefreshCw, XCircle } from "lucide-react";
import { fetchMembroDashboard, type AssignmentStatus, type MembroDashboard } from "../data/dashboardMembro";

const AZUL = "#1A2744";
const OURO = "#F5C842";
const VERDE = "#1f9d6b";
const VERMELHO = "#d4543a";
const MUTED = "#6b7280";
const LINHA = "#e6e8ee";

type LoadState = "idle" | "loading" | "ready" | "error";

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(16,22,38,.04)", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL, marginBottom: 10 }}>
      {icon}
      <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: MUTED, fontWeight: 700 }}>{children}</span>
    </div>
  );
}

function statusBadge(status: AssignmentStatus) {
  const map: Record<AssignmentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    confirmed: { label: "Confirmado", color: VERDE, bg: "#eafaf2", icon: <CheckCircle2 size={13} /> },
    pending: { label: "Pendente", color: "#c98a00", bg: "#fff7e6", icon: <Clock3 size={13} /> },
    declined: { label: "Recusado", color: VERMELHO, bg: "#fdeee9", icon: <XCircle size={13} /> },
    standby: { label: "Reserva", color: MUTED, bg: "#f1f3f7", icon: <Clock3 size={13} /> },
  };
  const s = map[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: s.color, background: s.bg, borderRadius: 6, padding: "2px 8px", fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.icon} {s.label}
    </span>
  );
}

export function DashboardMinhaJornada() {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<MembroDashboard | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      setData(await fetchMembroDashboard());
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
      setState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (state === "loading" || state === "idle") {
    return (
      <Card style={{ textAlign: "center", color: MUTED }}>
        <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando sua jornada…
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card style={{ borderColor: "#f3c9bc", background: "#fdeee9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: VERMELHO, fontWeight: 700 }}>
          <AlertTriangle size={18} /> Não foi possível carregar
        </div>
        <div style={{ fontSize: 13.5, color: MUTED, marginTop: 6 }}>{error}</div>
        <button type="button" onClick={() => void load()} style={{ marginTop: 10, background: AZUL, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>
          Tentar novamente
        </button>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Minhas escalas */}
      <Card>
        <SectionTitle icon={<Music size={18} color={OURO} />}>Minhas escalas</SectionTitle>
        {data.myAssignments.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>Você não está escalado para nenhum evento futuro.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.myAssignments.map((a) => (
              <div key={a.assignmentId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: `1px solid ${LINHA}`, paddingBottom: 10 }}>
                <div>
                  <strong style={{ color: AZUL }}>{a.eventTitle}</strong>
                  <div style={{ fontSize: 12.5, color: MUTED }}>
                    {new Date(a.startsAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {a.roleName ? ` · ${a.roleName}` : ""}
                  </div>
                </div>
                {statusBadge(a.status)}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Próximos eventos */}
      <Card>
        <SectionTitle icon={<CalendarDays size={18} />}>Próximos eventos</SectionTitle>
        {data.upcomingEvents.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>Nenhum evento futuro.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.upcomingEvents.map((ev) => (
              <div key={ev.id} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13.5 }}>
                <time style={{ color: AZUL, fontWeight: 700, minWidth: 84 }}>
                  {new Date(ev.eventDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </time>
                <div>
                  <strong style={{ color: AZUL }}>{ev.title}</strong>
                  <span style={{ color: MUTED }}>{ev.location ? ` · ${ev.location}` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Comunicados */}
      <Card>
        <SectionTitle icon={<Bell size={18} />}>Comunicados</SectionTitle>
        {data.announcements.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>Sem comunicados recentes.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.announcements.map((an) => (
              <div key={an.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong style={{ color: AZUL }}>{an.title}</strong>
                  <time style={{ color: MUTED, fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(an.publishedAt).toLocaleDateString("pt-BR")}
                  </time>
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                  {an.message.length > 140 ? `${an.message.slice(0, 140)}…` : an.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Minha jornada (placeholder — Frente E) */}
      {!data.journey.enabled ? (
        <Card style={{ background: "#fffdf5", borderColor: "rgba(245,200,66,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL }}>
            <Compass size={18} color={OURO} />
            <strong>Em breve: Minha Jornada</strong>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
            Aqui você vai acompanhar seus passos na igreja — batismo, discipulado, cursos e próximos passos.
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export default DashboardMinhaJornada;
