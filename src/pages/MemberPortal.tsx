import {
  Baby,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Music,
  Plus,
  QrCode,
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

type KidsGroupRecord = {
  id: string;
  name: string;
};

type KidsChildRecord = {
  id: string;
  tenant_id: string;
  name: string;
  date_of_birth: string | null;
  group_id: string | null;
  allergies: string | null;
  special_needs: string | null;
  notes: string | null;
  is_active: boolean;
  kids_groups: { name: string } | null;
};

type KidsGuardianRecord = {
  id: string;
  child_id: string;
  name: string;
  phone: string | null;
  relationship: "parent" | "grandparent" | "sibling" | "guardian" | "other";
  is_primary: boolean;
};

type KidsCheckinPassRecord = {
  id: string;
  child_id: string;
  pass_token: string;
  valid_from: string;
  valid_until: string;
  used_at: string | null;
  created_at: string;
};

type KidsChildFormState = {
  id: string | null;
  name: string;
  date_of_birth: string;
  group_id: string;
  allergies: string;
  special_needs: string;
  notes: string;
};

const emptyKidsChildForm: KidsChildFormState = {
  id: null,
  name: "",
  date_of_birth: "",
  group_id: "",
  allergies: "",
  special_needs: "",
  notes: "",
};

export function MemberPortal() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [kidsGroups, setKidsGroups] = useState<KidsGroupRecord[]>([]);
  const [kidsChildren, setKidsChildren] = useState<KidsChildRecord[]>([]);
  const [kidsGuardiansByChildId, setKidsGuardiansByChildId] = useState<Record<string, KidsGuardianRecord[]>>({});
  const [kidsPassesByChildId, setKidsPassesByChildId] = useState<Record<string, KidsCheckinPassRecord[]>>({});
  const [kidsForm, setKidsForm] = useState<KidsChildFormState>(emptyKidsChildForm);
  const [isKidsFormOpen, setIsKidsFormOpen] = useState(false);
  const [kidsMessage, setKidsMessage] = useState("");
  const [kidsStatus, setKidsStatus] = useState<LoginStatus>("idle");
  const [selectedPassChildId, setSelectedPassChildId] = useState<string | null>(null);
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
      setKidsGroups([]);
      setKidsChildren([]);
      setKidsGuardiansByChildId({});
      setKidsPassesByChildId({});
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

    const [groupsResult, guardiansResult] = await Promise.all([
      supabase
        .from("kids_groups")
        .select("id, name")
        .eq("tenant_id", profileData.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .returns<KidsGroupRecord[]>(),
      supabase
        .from("kids_guardians")
        .select(
          "id, child_id, name, phone, relationship, is_primary, kids_children (id, tenant_id, name, date_of_birth, group_id, allergies, special_needs, notes, is_active, kids_groups (name))",
        )
        .eq("tenant_id", profileData.tenant_id)
        .eq("member_id", profileData.member_id)
        .returns<
          Array<
            KidsGuardianRecord & {
              kids_children: KidsChildRecord | null;
            }
          >
        >(),
    ]);

    if (!groupsResult.error) {
      setKidsGroups(groupsResult.data ?? []);
    } else {
      setKidsGroups([]);
    }

    const guardianRows = guardiansResult.data ?? [];
    const childById = new Map<string, KidsChildRecord>();
    const guardiansByChild: Record<string, KidsGuardianRecord[]> = {};

    for (const row of guardianRows) {
      if (!row.kids_children) continue;
      childById.set(row.kids_children.id, row.kids_children);
      if (!guardiansByChild[row.child_id]) guardiansByChild[row.child_id] = [];
      guardiansByChild[row.child_id].push({
        id: row.id,
        child_id: row.child_id,
        name: row.name,
        phone: row.phone,
        relationship: row.relationship,
        is_primary: row.is_primary,
      });
    }

    const children = Array.from(childById.values()).sort((a, b) => a.name.localeCompare(b.name));
    setKidsChildren(children);
    setKidsGuardiansByChildId(guardiansByChild);

    if (children.length > 0) {
      const childIds = children.map((c) => c.id);
      const passesResult = await supabase
        .from("kids_checkin_passes")
        .select("id, child_id, pass_token, valid_from, valid_until, used_at, created_at")
        .in("child_id", childIds)
        .order("created_at", { ascending: false })
        .returns<KidsCheckinPassRecord[]>();

      if (!passesResult.error) {
        const grouped = (passesResult.data ?? []).reduce<Record<string, KidsCheckinPassRecord[]>>((acc, pass) => {
          if (!acc[pass.child_id]) acc[pass.child_id] = [];
          acc[pass.child_id].push(pass);
          return acc;
        }, {});
        setKidsPassesByChildId(grouped);
      } else {
        setKidsPassesByChildId({});
      }
    } else {
      setKidsPassesByChildId({});
    }

    setLoadStatus("ready");
  }

  async function handleKidsChildSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.tenant_id || !profile.member_id) return;

    if (!kidsForm.name.trim()) {
      setKidsStatus("error");
      setKidsMessage("Informe o nome da criança.");
      return;
    }

    setKidsStatus("loading");
    setKidsMessage("");

    const payload = {
      tenant_id: profile.tenant_id,
      name: kidsForm.name.trim(),
      date_of_birth: kidsForm.date_of_birth || null,
      group_id: kidsForm.group_id || null,
      allergies: kidsForm.allergies.trim() || null,
      special_needs: kidsForm.special_needs.trim() || null,
      notes: kidsForm.notes.trim() || null,
    };

    if (kidsForm.id) {
      const { error } = await supabase.from("kids_children").update(payload).eq("id", kidsForm.id);
      if (error) {
        setKidsStatus("error");
        setKidsMessage("Não foi possível atualizar a criança.");
        return;
      }
    } else {
      const inserted = await supabase
        .from("kids_children")
        .insert(payload)
        .select("id, name")
        .single<{ id: string; name: string }>();
      if (inserted.error || !inserted.data) {
        setKidsStatus("error");
        setKidsMessage("Não foi possível cadastrar a criança.");
        return;
      }

      const { error: guardianError } = await supabase.from("kids_guardians").insert({
        tenant_id: profile.tenant_id,
        child_id: inserted.data.id,
        member_id: profile.member_id,
        name: profile.full_name?.trim() || profile.email,
        relationship: "parent",
        is_primary: true,
      });
      if (guardianError) {
        setKidsStatus("error");
        setKidsMessage("Criança criada, mas não foi possível vincular o responsável.");
        return;
      }
    }

    setKidsStatus("success");
    setKidsMessage(kidsForm.id ? "Criança atualizada." : "Criança cadastrada.");
    setKidsForm(emptyKidsChildForm);
    setIsKidsFormOpen(false);
    await loadPortalData(profile.id);
  }

  async function generateKidsPass(child: KidsChildRecord) {
    if (!profile?.tenant_id || !profile.member_id) return;
    setKidsStatus("loading");
    setKidsMessage("");

    const { error } = await supabase.rpc("create_kids_checkin_pass", {
      in_child_id: child.id,
      in_valid_hours: 8,
    });

    if (error) {
      setKidsStatus("error");
      setKidsMessage("Não foi possível gerar o QR da criança.");
      return;
    }

    setKidsStatus("success");
    setKidsMessage("QR de check-in gerado.");
    setSelectedPassChildId(child.id);
    await loadPortalData(profile.id);
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

  function formatRelationship(value: KidsGuardianRecord["relationship"]) {
    if (value === "parent") return "Pai/Mãe";
    if (value === "grandparent") return "Avô/Avó";
    if (value === "sibling") return "Irmão/Irmã";
    if (value === "guardian") return "Responsável";
    return "Outro";
  }

  function qrImageUrl(passToken: string) {
    const payload = `kids-pass:${passToken}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
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
        <section className="member-portal-section">
          <div className="member-portal-section-head">
            <h2>Kids</h2>
            <Button
              type="button"
              icon={<Plus size={14} />}
              onClick={() => {
                setKidsForm(emptyKidsChildForm);
                setIsKidsFormOpen(true);
              }}
            >
              Cadastrar criança
            </Button>
          </div>

          {kidsMessage ? <p className={`login-feedback ${kidsStatus}`}>{kidsMessage}</p> : null}

          {kidsChildren.length === 0 ? (
            <div className="member-portal-empty-inline">
              <Baby size={18} />
              <span>Nenhuma criança cadastrada ainda.</span>
            </div>
          ) : (
            <div className="member-portal-cards">
              {kidsChildren.map((child) => {
                const guardians = kidsGuardiansByChildId[child.id] ?? [];
                const activePass = (kidsPassesByChildId[child.id] ?? []).find((pass) => !pass.used_at && new Date(pass.valid_until) >= new Date()) ?? null;
                const showQr = selectedPassChildId === child.id && activePass;
                return (
                  <article key={child.id} className="member-portal-card">
                    <div className="member-portal-card-head">
                      <div>
                        <span className="member-portal-event-type">Criança</span>
                        <strong>{child.name}</strong>
                      </div>
                      <em className="member-portal-status pending">{child.kids_groups?.name ?? "Sem turma"}</em>
                    </div>

                    <div className="member-portal-card-meta">
                      {child.date_of_birth ? (
                        <div>
                          <CalendarCheck size={14} />
                          <span>Nascimento: {new Date(`${child.date_of_birth}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                        </div>
                      ) : null}
                      {child.allergies ? (
                        <div>
                          <X size={14} />
                          <span>Alergias: {child.allergies}</span>
                        </div>
                      ) : null}
                    </div>

                    {guardians.length > 0 ? (
                      <div className="member-portal-guardians">
                        {guardians.map((guardian) => (
                          <small key={guardian.id}>
                            {formatRelationship(guardian.relationship)}: {guardian.name}
                          </small>
                        ))}
                      </div>
                    ) : null}

                    <div className="member-portal-card-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<QrCode size={14} />}
                        onClick={() => void generateKidsPass(child)}
                        disabled={kidsStatus === "loading"}
                      >
                        Gerar QR
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setKidsForm({
                            id: child.id,
                            name: child.name,
                            date_of_birth: child.date_of_birth ?? "",
                            group_id: child.group_id ?? "",
                            allergies: child.allergies ?? "",
                            special_needs: child.special_needs ?? "",
                            notes: child.notes ?? "",
                          });
                          setIsKidsFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>

                    {showQr ? (
                      <div className="member-portal-kids-qr">
                        <img src={qrImageUrl(activePass.pass_token)} alt={`QR de check-in de ${child.name}`} />
                        <small>Válido até {new Date(activePass.valid_until).toLocaleString("pt-BR")}</small>
                        <small>Código fallback: {activePass.pass_token.slice(0, 12)}</small>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

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

      {isKidsFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <Baby size={18} />
              <div>
                <strong>{kidsForm.id ? "Editar criança" : "Cadastrar criança"}</strong>
                <small>Dados visíveis para check-in no módulo Kids.</small>
              </div>
            </div>
            <form className="modal-body" onSubmit={(event) => void handleKidsChildSubmit(event)}>
              <label>
                <span>Nome</span>
                <input
                  className="catalog-input"
                  value={kidsForm.name}
                  onChange={(event) => setKidsForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <div className="modal-grid">
                <label>
                  <span>Data de nascimento</span>
                  <input
                    type="date"
                    className="catalog-input"
                    value={kidsForm.date_of_birth}
                    onChange={(event) => setKidsForm((current) => ({ ...current, date_of_birth: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Turma</span>
                  <select
                    className="catalog-input"
                    value={kidsForm.group_id}
                    onChange={(event) => setKidsForm((current) => ({ ...current, group_id: event.target.value }))}
                  >
                    <option value="">Sem turma</option>
                    {kidsGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Alergias</span>
                <input
                  className="catalog-input"
                  value={kidsForm.allergies}
                  onChange={(event) => setKidsForm((current) => ({ ...current, allergies: event.target.value }))}
                />
              </label>
              <label>
                <span>Necessidades especiais</span>
                <input
                  className="catalog-input"
                  value={kidsForm.special_needs}
                  onChange={(event) => setKidsForm((current) => ({ ...current, special_needs: event.target.value }))}
                />
              </label>
              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  rows={2}
                  value={kidsForm.notes}
                  onChange={(event) => setKidsForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsKidsFormOpen(false);
                    setKidsForm(emptyKidsChildForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={kidsStatus === "loading"}>
                  {kidsStatus === "loading" ? "Salvando..." : kidsForm.id ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
