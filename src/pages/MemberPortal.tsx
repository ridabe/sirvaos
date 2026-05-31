import {
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Music,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

type MemberAssignment = {
  id: string;
  event_id: string;
  member_id: string;
  role_id: string | null;
  role_name: string | null;
  arrival_at: string | null;
  status: "pending" | "confirmed" | "declined" | "standby";
  decline_reason: string | null;
  notes: string | null;
  worship_events: {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    notes: string | null;
  } | null;
  worship_roles: { name: string } | null;
};

type MemberProfile = {
  id: string;
  full_name: string | null;
  email: string;
  tenant_id: string | null;
  member_id: string | null;
  status: string;
};

export function MemberPortal() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionStatus, setActionStatus] = useState<Record<string, "loading" | "done">>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void loadPortalData(data.session.user.id);
      }
    });
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setLoginStatus("error");
      setLoginMessage("Informe e-mail e senha.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoginStatus("error");
      setLoginMessage("E-mail ou senha inválidos.");
      return;
    }

    setLoginStatus("success");
    await loadPortalData(data.user.id);
  }

  async function loadPortalData(userId: string) {
    setLoadStatus("loading");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, tenant_id, member_id, status")
      .eq("id", userId)
      .single<MemberProfile>();

    if (profileError || !profileData) {
      setLoadStatus("error");
      return;
    }

    setProfile(profileData);

    if (!profileData.member_id || !profileData.tenant_id) {
      setAssignments([]);
      setLoadStatus("ready");
      return;
    }

    const { data: assignmentsData } = await supabase
      .from("worship_assignments")
      .select(
        "id, event_id, member_id, role_id, role_name, arrival_at, status, decline_reason, notes, worship_events (id, title, event_type, starts_at, ends_at, location, notes), worship_roles (name)",
      )
      .eq("member_id", profileData.member_id)
      .eq("tenant_id", profileData.tenant_id)
      .order("event_id", { ascending: true })
      .returns<MemberAssignment[]>();

    const sorted = (assignmentsData ?? []).sort((a, b) => {
      const dateA = a.worship_events?.starts_at ?? "";
      const dateB = b.worship_events?.starts_at ?? "";
      return dateA.localeCompare(dateB);
    });

    setAssignments(sorted);
    setLoadStatus("ready");
  }

  async function confirmAssignment(assignmentId: string) {
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "loading" }));

    const { error } = await supabase
      .from("worship_assignments")
      .update({ status: "confirmed", responded_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: "confirmed", decline_reason: null } : a)),
      );
    }
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "done" }));
  }

  async function declineAssignment(assignmentId: string) {
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "loading" }));

    const reason = declineReason.trim() || null;
    const { error } = await supabase
      .from("worship_assignments")
      .update({ status: "declined", decline_reason: reason, responded_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: "declined", decline_reason: reason } : a)),
      );
    }
    setDecliningId(null);
    setDeclineReason("");
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "done" }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setAssignments([]);
    setLoadStatus("idle");
    setLoginStatus("idle");
  }

  function eventTypeLabel(type: string) {
    if (type === "service") return "Culto";
    if (type === "rehearsal") return "Ensaio";
    if (type === "meeting") return "Reunião";
    return "Evento";
  }

  function statusLabel(status: MemberAssignment["status"]) {
    if (status === "confirmed") return "Confirmado";
    if (status === "declined") return "Recusado";
    if (status === "standby") return "Apoio";
    return "Aguardando";
  }

  const upcomingAssignments = assignments.filter((a) => {
    const starts = a.worship_events?.starts_at;
    if (!starts) return false;
    return new Date(starts) >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  const pastAssignments = assignments.filter((a) => {
    const starts = a.worship_events?.starts_at;
    if (!starts) return true;
    return new Date(starts) < new Date(new Date().setHours(0, 0, 0, 0));
  });

  if (loadStatus === "idle" || loginStatus === "idle" || loginStatus === "loading") {
    if (!profile) {
      return (
        <div className="member-portal-shell">
          <div className="member-portal-login-card">
            <div className="member-portal-brand">
              <Music size={28} />
              <div>
                <strong>Portal do Membro</strong>
                <span>Confirme sua participação nas escalas</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="member-portal-form">
              <TextField
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                icon={<Mail size={18} />}
              />
              <div className="member-portal-password-wrap">
                <TextField
                  label="Senha"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  icon={<LockKeyhole size={18} />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      <ChevronDown size={16} />
                    </button>
                  }
                />
              </div>

              {loginMessage ? (
                <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
              ) : null}

              <Button type="submit" disabled={loginStatus === "loading"}>
                {loginStatus === "loading" ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      );
    }
  }

  if (loadStatus === "loading") {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-loading">Carregando suas escalas...</div>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-loading">Erro ao carregar dados. Tente novamente.</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-login-card">
          <div className="member-portal-brand">
            <Music size={28} />
            <div>
              <strong>Portal do Membro</strong>
              <span>Confirme sua participação nas escalas</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="member-portal-form">
            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
            />
            <div className="member-portal-password-wrap">
              <TextField
                label="Senha"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                icon={<LockKeyhole size={18} />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    <ChevronDown size={16} />
                  </button>
                }
              />
            </div>

            {loginMessage ? (
              <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
            ) : null}

            <Button type="submit" disabled={loginStatus === "loading"}>
              {loginStatus === "loading" ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="member-portal-shell">
      <header className="member-portal-header">
        <div className="member-portal-brand">
          <Music size={22} />
          <div>
            <strong>Portal do Membro</strong>
            <span>{profile.full_name ?? profile.email}</span>
          </div>
        </div>
        <button type="button" className="member-portal-signout" onClick={() => void handleSignOut()}>
          <LogOut size={16} />
          Sair
        </button>
      </header>

      <main className="member-portal-main">
        {upcomingAssignments.length === 0 && pastAssignments.length === 0 ? (
          <div className="member-portal-empty">
            <CalendarCheck size={40} />
            <strong>Nenhuma escala encontrada</strong>
            <span>Você ainda não foi escalado em nenhum evento de louvor.</span>
          </div>
        ) : null}

        {upcomingAssignments.length > 0 ? (
          <section className="member-portal-section">
            <h2>Próximas escalas</h2>
            <div className="member-portal-cards">
              {upcomingAssignments.map((assignment) => {
                const evt = assignment.worship_events;
                if (!evt) return null;
                const role = assignment.worship_roles?.name ?? assignment.role_name ?? "Função não definida";
                const isLoading = actionStatus[assignment.id] === "loading";
                const isDeclining = decliningId === assignment.id;
                return (
                  <article key={assignment.id} className={`member-portal-card ${assignment.status}`}>
                    <div className="member-portal-card-head">
                      <div>
                        <span className="member-portal-event-type">{eventTypeLabel(evt.event_type)}</span>
                        <strong>{evt.title}</strong>
                      </div>
                      <em className={`member-portal-status ${assignment.status}`}>
                        {statusLabel(assignment.status)}
                      </em>
                    </div>

                    <div className="member-portal-card-meta">
                      <div>
                        <CalendarCheck size={14} />
                        <span>
                          {new Date(evt.starts_at).toLocaleString("pt-BR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {evt.location ? (
                        <div>
                          <MapPin size={14} />
                          <span>{evt.location}</span>
                        </div>
                      ) : null}
                      {assignment.arrival_at ? (
                        <div>
                          <Clock3 size={14} />
                          <span>
                            Chegar às{" "}
                            {new Date(assignment.arrival_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="member-portal-card-role">
                      <Music size={14} />
                      <strong>{role}</strong>
                    </div>

                    {assignment.notes ? (
                      <p className="member-portal-card-notes">{assignment.notes}</p>
                    ) : null}

                    {assignment.decline_reason ? (
                      <p className="member-portal-card-notes muted">Motivo: {assignment.decline_reason}</p>
                    ) : null}

                    {isDeclining ? (
                      <div className="member-portal-decline-form">
                        <textarea
                          className="catalog-input catalog-textarea"
                          placeholder="Motivo da recusa (opcional)"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={2}
                        />
                        <div className="member-portal-decline-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setDecliningId(null); setDeclineReason(""); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void declineAssignment(assignment.id)}
                            disabled={isLoading}
                          >
                            Confirmar recusa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="member-portal-card-actions">
                        {assignment.status !== "confirmed" ? (
                          <Button
                            type="button"
                            icon={<Check size={15} />}
                            onClick={() => void confirmAssignment(assignment.id)}
                            disabled={isLoading}
                          >
                            Confirmar presença
                          </Button>
                        ) : null}
                        {assignment.status !== "declined" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            icon={<X size={15} />}
                            onClick={() => setDecliningId(assignment.id)}
                            disabled={isLoading}
                          >
                            Recusar
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {pastAssignments.length > 0 ? (
          <section className="member-portal-section">
            <h2>Histórico</h2>
            <div className="member-portal-history">
              {pastAssignments.map((assignment) => {
                const evt = assignment.worship_events;
                if (!evt) return null;
                const role = assignment.worship_roles?.name ?? assignment.role_name ?? "Função";
                return (
                  <div key={assignment.id} className="member-portal-history-row">
                    <div>
                      <strong>{evt.title}</strong>
                      <small>
                        {new Date(evt.starts_at).toLocaleDateString("pt-BR")} · {role}
                      </small>
                    </div>
                    <em className={`member-portal-status ${assignment.status}`}>
                      {statusLabel(assignment.status)}
                    </em>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
