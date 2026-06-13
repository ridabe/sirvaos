// Etapa 2 / Frente B (B8) — Painel de logs de WhatsApp por tenant.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  fetchWhatsappLogs,
  WHATSAPP_CONTEXT_LABEL,
  type WhatsappLogRow,
} from "../data/whatsappLogs";

const AZUL = "#1A2744";
const VERDE = "#1f9d6b";
const VERMELHO = "#d4543a";
const MUTED = "#6b7280";
const LINHA = "#e6e8ee";

type LoadState = "idle" | "loading" | "ready" | "error";

// Status de entrega "efetivo": prioriza delivery_status; cai para status base.
function effectiveStatus(row: WhatsappLogRow): { label: string; color: string; bg: string } {
  const d = (row.delivery_status ?? "").toLowerCase();
  if (d === "read") return { label: "Lida", color: "#5a2da6", bg: "#efe7ff" };
  if (d === "delivered") return { label: "Entregue", color: VERDE, bg: "#eafaf2" };
  if (row.status === "failed" || d === "failed") return { label: "Falhou", color: VERMELHO, bg: "#fdeee9" };
  if (row.status === "sent" || d === "sent") return { label: "Enviada", color: "#c98a00", bg: "#fff7e6" };
  return { label: "Na fila", color: MUTED, bg: "#f1f3f7" };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function WhatsappLogs({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<WhatsappLogRow[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contextFilter, setContextFilter] = useState<string>("all");

  async function load() {
    setState("loading");
    setError("");
    try {
      setRows(await fetchWhatsappLogs(tenantId));
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
      setState("error");
    }
  }

  useEffect(() => {
    if (tenantId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (contextFilter !== "all" && r.context !== contextFilter) return false;
      if (statusFilter === "all") return true;
      const eff = effectiveStatus(r).label.toLowerCase();
      if (statusFilter === "failed") return eff === "falhou";
      if (statusFilter === "delivered") return eff === "entregue" || eff === "lida";
      if (statusFilter === "sent") return eff === "enviada";
      return true;
    });
  }, [rows, statusFilter, contextFilter]);

  const totals = useMemo(() => {
    let sent = 0, delivered = 0, failed = 0;
    for (const r of rows) {
      const l = effectiveStatus(r).label;
      if (l === "Falhou") failed++;
      else if (l === "Entregue" || l === "Lida") delivered++;
      else if (l === "Enviada") sent++;
    }
    return { total: rows.length, sent, delivered, failed };
  }, [rows]);

  const inputStyle: React.CSSProperties = { border: `1px solid ${LINHA}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: AZUL, background: "#fff" };

  return (
    <article className="panel full-width">
      <div className="panel-heading">
        <div>
          <span>WhatsApp</span>
          <h4>Logs de envio</h4>
        </div>
        <button type="button" onClick={() => void load()} title="Atualizar" style={{ ...inputStyle, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "6px 0 14px" }}>
        {[
          { k: "Total", v: totals.total, c: AZUL },
          { k: "Enviadas", v: totals.sent, c: "#c98a00" },
          { k: "Entregues/Lidas", v: totals.delivered, c: VERDE },
          { k: "Falhas", v: totals.failed, c: VERMELHO },
        ].map((s) => (
          <div key={s.k} style={{ border: `1px solid ${LINHA}`, borderRadius: 10, padding: "8px 14px", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 12, color: MUTED }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="all">Todos os status</option>
          <option value="sent">Enviadas</option>
          <option value="delivered">Entregues/Lidas</option>
          <option value="failed">Falhas</option>
        </select>
        <select value={contextFilter} onChange={(e) => setContextFilter(e.target.value)} style={inputStyle}>
          <option value="all">Todos os tipos</option>
          {Object.entries(WHATSAPP_CONTEXT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {state === "loading" || state === "idle" ? (
        <p style={{ color: MUTED, fontSize: 14 }}><RefreshCw size={14} /> Carregando logs…</p>
      ) : state === "error" ? (
        <p style={{ color: VERMELHO, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={16} /> {error}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 14 }}>Nenhuma mensagem registrada para este filtro.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: MUTED, borderBottom: `2px solid ${LINHA}` }}>
                <th style={{ padding: "8px 10px" }}>Quando</th>
                <th style={{ padding: "8px 10px" }}>Destino</th>
                <th style={{ padding: "8px 10px" }}>Tipo</th>
                <th style={{ padding: "8px 10px" }}>Status</th>
                <th style={{ padding: "8px 10px" }}>Mensagem / erro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const eff = effectiveStatus(r);
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${LINHA}` }}>
                    <td style={{ padding: "8px 10px", color: MUTED, whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                    <td style={{ padding: "8px 10px", color: AZUL, whiteSpace: "nowrap" }}>{r.to_phone}</td>
                    <td style={{ padding: "8px 10px", color: MUTED }}>{WHATSAPP_CONTEXT_LABEL[r.context] ?? r.context}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ background: eff.bg, color: eff.color, borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {eff.label}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: r.error ? VERMELHO : MUTED, maxWidth: 360 }}>
                      {r.error ? r.error : (r.message.length > 70 ? `${r.message.slice(0, 70)}…` : r.message)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default WhatsappLogs;
