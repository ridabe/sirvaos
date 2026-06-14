// Etapa 2 / Frente A (A5) — Painel "Meu Ministério" do líder de Louvor.
// Consome a RPC dashboard_lider_louvor via fetchLiderLouvorDashboard.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock3, Music, RefreshCw, Users2 } from "lucide-react";
import {
  fetchLiderLouvorDashboard,
  type LiderLouvorDashboard,
} from "../data/dashboardLiderLouvor";

const AZUL = "#1A2744";
const OURO = "#F5C842";
const VERDE = "#1f9d6b";
const VERMELHO = "#d4543a";
const MUTED = "#6b7280";
const LINHA = "#e6e8ee";

type LoadState = "idle" | "loading" | "ready" | "error";

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(16,22,38,.04)", ...style }}>
      {children}
    </div>
  );
}

function MiniStat({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: MUTED, fontSize: 13 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color, marginTop: 6, lineHeight: 1 }}>{value.toLocaleString("pt-BR")}</div>
    </Card>
  );
}

export function DashboardMeuMinisterio() {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<LiderLouvorDashboard | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setState("loading");
    setError("");
    try {
      setData(await fetchLiderLouvorDashboard());
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
      <Card style={{ gridColumn: "1 / -1", textAlign: "center", color: MUTED }}>
        <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando seu ministério…
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
        <button type="button" onClick={() => void load()} style={{ marginTop: 10, background: AZUL, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>
          Tentar novamente
        </button>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Music size={22} color={OURO} />
          <h3 style={{ margin: 0, color: AZUL, fontSize: 19 }}>Meu Ministério · Louvor</h3>
        </div>
        <button type="button" onClick={() => void load()} title="Atualizar" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${LINHA}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: MUTED, fontSize: 13 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <MiniStat icon={<Clock3 size={16} />} value={data.pendingCount} label="Confirmações pendentes" color={data.pendingCount > 0 ? "#c98a00" : VERDE} />
        <MiniStat icon={<Users2 size={16} />} value={data.rosterCount} label="Integrantes escalados" color={AZUL} />
        <MiniStat icon={<CalendarCheck size={16} />} value={data.upcomingEvents.length} label="Próximos eventos" color={AZUL} />
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: AZUL, marginBottom: 10 }}>
          <CalendarCheck size={18} />
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: MUTED, fontWeight: 700 }}>Próximos eventos e escalas</span>
        </div>
        {data.upcomingEvents.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>Nenhum evento de louvor agendado. Crie um evento para montar a escala.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.upcomingEvents.map((ev) => (
              <div key={ev.eventId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: `1px solid ${LINHA}`, paddingBottom: 10 }}>
                <div>
                  <strong style={{ color: AZUL }}>{ev.title}</strong>
                  <div style={{ fontSize: 12.5, color: MUTED }}>
                    {new Date(ev.startsAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 12, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: VERDE }}>
                    <CheckCircle2 size={13} /> {ev.confirmed}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#c98a00" }}>
                    <Clock3 size={13} /> {ev.pending}
                  </span>
                  <span style={{ color: MUTED }}>de {ev.totalAssigned} escalados</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default DashboardMeuMinisterio;
