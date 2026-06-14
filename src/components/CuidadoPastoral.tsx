// Frente C — Painel de Cuidado Pastoral (radar de afastamento + tarefas de cuidado).
import { useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, HeartPulse, MessageCircle, RefreshCw, UserCheck } from "lucide-react";
import {
  assignCareTask,
  CARE_SIGNAL_LABEL,
  createCareTask,
  fetchCareRadar,
  fetchCareTasks,
  updateCareTask,
  type CareRadarRow,
  type CareTaskRow,
} from "../data/careRadar";
import { openWhatsapp } from "../lib/whatsappService";

const AZUL = "#1A2744";
const VERDE = "#1f9d6b";
const VERMELHO = "#d4543a";
const AMARELO = "#c98a00";
const MUTED = "#6b7280";
const LINHA = "#e6e8ee";

type LoadState = "idle" | "loading" | "ready" | "error";

function bandStyle(band: string): { color: string; bg: string; label: string } {
  if (band === "green") return { color: VERDE, bg: "#eafaf2", label: "Saudável" };
  if (band === "yellow") return { color: AMARELO, bg: "#fff7e6", label: "Atenção" };
  return { color: VERMELHO, bg: "#fdeee9", label: "Afastado" };
}

function careMessage(name: string): string {
  return `Olá ${name}, tudo bem? Sentimos sua falta e queremos saber como você está. Conte com a gente! 🙏`;
}

export function CuidadoPastoral({ tenantId, users = [] }: { tenantId: string; users?: Array<{ id: string; name: string }> }) {
  const [state, setState] = useState<LoadState>("idle");
  const [radar, setRadar] = useState<CareRadarRow[]>([]);
  const [tasks, setTasks] = useState<CareTaskRow[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string>("");

  async function load() {
    setState("loading");
    setError("");
    try {
      const [r, t] = await Promise.all([fetchCareRadar(tenantId, 4), fetchCareTasks(tenantId)]);
      setRadar(r);
      setTasks(t);
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

  async function handleCreateTask(row: CareRadarRow) {
    setBusyId(row.member_id);
    try {
      await createCareTask({ tenantId, memberId: row.member_id, reason: `Sem contato há ${row.weeks_since ?? "—"} semanas` });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar tarefa.");
    } finally {
      setBusyId("");
    }
  }

  async function handleTaskStatus(task: CareTaskRow, status: CareTaskRow["status"]) {
    setBusyId(task.id);
    try {
      await updateCareTask(task.id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar tarefa.");
    } finally {
      setBusyId("");
    }
  }

  const openTasks = tasks.filter((t) => t.status === "open" || t.status === "in_progress");

  return (
    <article className="panel full-width">
      <div className="panel-heading">
        <div>
          <span>Cuidado Pastoral</span>
          <h4>Radar de afastamento</h4>
        </div>
        <button type="button" onClick={() => void load()} title="Atualizar"
          style={{ border: `1px solid ${LINHA}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: MUTED, fontSize: 13, background: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <p style={{ color: MUTED, fontSize: 13.5, marginTop: 4 }}>
        Membros ativos sem nenhum sinal de participação (louvor, escola bíblica, kids, intercessão, histórico) há mais de 4 semanas. Quanto menor o score, maior a atenção.
      </p>

      {state === "loading" || state === "idle" ? (
        <p style={{ color: MUTED, fontSize: 14 }}><RefreshCw size={14} /> Carregando radar…</p>
      ) : state === "error" ? (
        <p style={{ color: VERMELHO, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={16} /> {error}</p>
      ) : (
        <>
          {/* Tarefas de cuidado em aberto */}
          {openTasks.length > 0 ? (
            <div style={{ margin: "10px 0 18px" }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: MUTED, fontWeight: 700, marginBottom: 8 }}>
                Tarefas de cuidado em aberto ({openTasks.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {openTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fffdf5", border: `1px solid ${LINHA}`, borderRadius: 10, padding: "10px 14px" }}>
                    <div>
                      <strong style={{ color: AZUL }}>{t.members?.name ?? "Membro"}</strong>
                      <div style={{ fontSize: 12.5, color: MUTED }}>{t.reason ?? "Tarefa de cuidado"} · {t.status === "in_progress" ? "em andamento" : "aberta"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {users.length > 0 ? (
                        <select
                          value={t.assigned_profile_id ?? ""}
                          disabled={busyId === t.id}
                          onChange={async (e) => { setBusyId(t.id); try { await assignCareTask(t.id, e.target.value || null); await load(); } finally { setBusyId(""); } }}
                          style={{ border: `1px solid ${LINHA}`, borderRadius: 8, padding: "5px 8px", fontSize: 12, color: AZUL, background: "#fff" }}
                          title="Designar responsável"
                        >
                          <option value="">Sem responsável</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      ) : null}
                      {t.members?.phone ? (
                        <button type="button" onClick={() => openWhatsapp(t.members!.phone!, careMessage(t.members?.name ?? ""))}
                          style={btn("#25d366")}><MessageCircle size={14} /> WhatsApp</button>
                      ) : null}
                      {t.status === "open" ? (
                        <button type="button" disabled={busyId === t.id} onClick={() => void handleTaskStatus(t, "in_progress")} style={btn(AZUL)}>Iniciar</button>
                      ) : null}
                      <button type="button" disabled={busyId === t.id} onClick={() => void handleTaskStatus(t, "done")} style={btn(VERDE)}><UserCheck size={14} /> Concluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Radar */}
          {radar.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: VERDE, fontSize: 14, padding: "8px 0" }}>
              <HeartPulse size={18} /> Ninguém afastado no momento. 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {radar.map((row) => {
                const b = bandStyle(row.band);
                const sigs = Object.keys(row.signals ?? {});
                return (
                  <div key={row.member_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: AZUL }}>{row.name}</strong>
                        <span style={{ background: b.bg, color: b.color, borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{b.label} · {row.score}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: MUTED }}>
                        {row.last_activity
                          ? `Último sinal: ${new Date(row.last_activity + "T12:00:00").toLocaleDateString("pt-BR")} (${row.weeks_since} sem.)`
                          : "Nenhum sinal registrado"}
                        {sigs.length > 0 ? ` · ${sigs.map((s) => CARE_SIGNAL_LABEL[s] ?? s).join(", ")}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {row.phone ? (
                        <button type="button" onClick={() => openWhatsapp(row.phone!, careMessage(row.name))} style={btn("#25d366")}><MessageCircle size={14} /> WhatsApp</button>
                      ) : null}
                      {row.has_open_task ? (
                        <span style={{ fontSize: 12, color: MUTED, alignSelf: "center" }}>tarefa criada</span>
                      ) : (
                        <button type="button" disabled={busyId === row.member_id} onClick={() => void handleCreateTask(row)} style={btn(AZUL)}>Criar tarefa</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </article>
  );
}

function btn(bg: string): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
}

export default CuidadoPastoral;
