import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

type TenantRole = "owner" | "admin" | "member";

type TenantProfile = {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  tenant_role: TenantRole | null;
  status: "active" | "invited" | "suspended";
  avatar_url: string | null;
};

type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
};

type MemberRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  ministry: string | null;
  notes: string | null;
  created_at: string;
};

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  created_at: string;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  published_at: string;
  created_at: string;
};

type TenantModuleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "beta" | "deprecated";
};

type TenantUserRecord = {
  id: string;
  full_name: string | null;
  email: string;
  tenant_role: TenantRole | null;
  status: "active" | "invited" | "suspended";
};

type ClientDashboardData = {
  profile: TenantProfile;
  tenant: TenantRecord;
  members: MemberRecord[];
  events: EventRecord[];
  announcements: AnnouncementRecord[];
  users: TenantUserRecord[];
  modules: TenantModuleRecord[];
};

type MemberFormState = Omit<MemberRecord, "created_at"> & { tenant_id: string };
type EventFormState = Omit<EventRecord, "created_at"> & { tenant_id: string };
type AnnouncementFormState = Omit<AnnouncementRecord, "created_at"> & { tenant_id: string };
type ThemeFormState = {
  logo_url: string;
  primary_color: string;
  accent_color: string;
};

type UserEditState = {
  full_name: string | null;
  tenant_role: TenantRole | null;
  status: "active" | "invited" | "suspended";
};

const emptyMemberForm: MemberFormState = {
  id: "",
  name: "",
  email: "",
  phone: "",
  status: "active",
  ministry: "",
  notes: "",
  tenant_id: "",
};

const emptyEventForm: EventFormState = {
  id: "",
  title: "",
  description: "",
  location: "",
  event_date: "",
  tenant_id: "",
};

const emptyAnnouncementForm: AnnouncementFormState = {
  id: "",
  title: "",
  message: "",
  published_at: new Date().toISOString(),
  tenant_id: "",
};

const emptyThemeForm: ThemeFormState = {
  logo_url: "",
  primary_color: "#087C7A",
  accent_color: "#00A7C4",
};

const sampleClientDashboardData: ClientDashboardData = {
  profile: {
    id: "demo-profile",
    email: "demo@igreja.org",
    full_name: "Admin Demo",
    tenant_id: "demo-tenant",
    tenant_role: "owner",
    status: "active",
    avatar_url: null,
  },
  tenant: {
    id: "demo-tenant",
    name: "Igreja Demo",
    slug: "igreja-demo",
    logo_url: "/img/icon-sirvaos.svg",
    primary_color: "#087C7A",
    accent_color: "#00A7C4",
  },
  members: [
    {
      id: "member-1",
      name: "Mariana Souza",
      email: "mariana@igreja.org",
      phone: "(11) 99999-0001",
      status: "active",
      ministry: "Louvor",
      notes: "Líder de célula",
      created_at: new Date().toISOString(),
    },
    {
      id: "member-2",
      name: "Paulo Alves",
      email: "paulo@igreja.org",
      phone: "(11) 99999-0002",
      status: "active",
      ministry: "Recepção",
      notes: "Voluntário de plantão",
      created_at: new Date().toISOString(),
    },
  ],
  events: [
    {
      id: "event-1",
      title: "Culto Dominical",
      description: "Adoração, palavra e comunhão.",
      location: "Templo principal",
      event_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    },
    {
      id: "event-2",
      title: "Ensaio de Louvor",
      description: "Preparação para o culto.",
      location: "Sala Multiuso",
      event_date: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    },
  ],
  announcements: [
    {
      id: "announce-1",
      title: "Culto Especial",
      message: "Não perca o culto especial de domingo com convidados.",
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  users: [
    {
      id: "user-1",
      full_name: "Eduardo Lima",
      email: "eduardo@igreja.org",
      tenant_role: "admin",
      status: "active",
    },
    {
      id: "user-2",
      full_name: "Patrícia Melo",
      email: "patricia@igreja.org",
      tenant_role: "member",
      status: "active",
    },
  ],
  modules: [
    {
      id: "module-1",
      code: "membros",
      name: "Membros",
      description: "Gestão de membros e ministérios.",
      status: "active",
    },
    {
      id: "module-2",
      code: "eventos",
      name: "Eventos",
      description: "Calendário e programação de cultos.",
      status: "active",
    },
    {
      id: "module-3",
      code: "comunicados",
      name: "Comunicados",
      description: "Notícias e avisos para a comunidade.",
      status: "beta",
    },
  ],
};

const clientTabs = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "members", label: "Membros", icon: UsersRound },
  { key: "events", label: "Calendário", icon: CalendarCheck },
  { key: "notices", label: "Comunicados", icon: Bell },
  { key: "theme", label: "Identidade", icon: Palette },
  { key: "users", label: "Usuários", icon: ShieldCheck },
] as const;

type ClientTab = (typeof clientTabs)[number]["key"];

type ClientAdminProps = {
  demoMode?: boolean;
};

export function ClientAdmin({ demoMode = false }: ClientAdminProps) {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [dataStatus, setDataStatus] = useState<LoadStatus>("idle");
  const [clientData, setClientData] = useState<ClientDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>("overview");
  const [memberForm, setMemberForm] = useState<MemberFormState>(emptyMemberForm);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberSaveStatus, setMemberSaveStatus] = useState<LoginStatus>("idle");
  const [memberSaveMessage, setMemberSaveMessage] = useState("");
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventSaveStatus, setEventSaveStatus] = useState<LoginStatus>("idle");
  const [eventSaveMessage, setEventSaveMessage] = useState("");
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(emptyAnnouncementForm);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState<LoginStatus>("idle");
  const [announcementSaveMessage, setAnnouncementSaveMessage] = useState("");
  const [themeForm, setThemeForm] = useState<ThemeFormState>(emptyThemeForm);
  const [themeSaveStatus, setThemeSaveStatus] = useState<LoginStatus>("idle");
  const [themeSaveMessage, setThemeSaveMessage] = useState("");
  const [logoUploadStatus, setLogoUploadStatus] = useState<LoginStatus>("idle");
  const [logoUploadMessage, setLogoUploadMessage] = useState("");
  const [userEdits, setUserEdits] = useState<Record<string, UserEditState>>({});
  const [userSaveStatus, setUserSaveStatus] = useState<Record<string, LoginStatus>>({});
  const [userSaveMessage, setUserSaveMessage] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<TenantProfile | null>(null);

  const isTenantAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.tenant_role !== "member" || profile.tenant_role === null;
  }, [profile]);

  const activeModules = clientData?.modules ?? [];
  const memberCount = clientData?.members.length ?? 0;
  const eventCount = clientData?.events.length ?? 0;
  const announcementCount = clientData?.announcements.length ?? 0;

  useEffect(() => {
    if (demoMode) {
      setClientData(sampleClientDashboardData);
      setThemeForm({
        logo_url: sampleClientDashboardData.tenant.logo_url ?? "",
        primary_color: sampleClientDashboardData.tenant.primary_color,
        accent_color: sampleClientDashboardData.tenant.accent_color,
      });
      setProfile(sampleClientDashboardData.profile);
      setDataStatus("ready");
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        return;
      }

      const currentProfile = await loadClientData(data.user.id);
      if (currentProfile) {
        setProfile(currentProfile);
      }
    });
  }, [demoMode]);

  async function loadClientData(userId: string) {
    setDataStatus("loading");
    setLoginMessage("");

    const profileResult = await supabase
      .from("profiles")
      .select("id, full_name, email, tenant_id, tenant_role, status, avatar_url")
      .eq("id", userId)
      .single<TenantProfile>();

    if (profileResult.error || !profileResult.data) {
      setDataStatus("error");
      setLoginMessage("Não foi possível carregar seu perfil.");
      return null;
    }

    const currentProfile = profileResult.data;
    if (!currentProfile.tenant_id || currentProfile.status !== "active") {
      setDataStatus("error");
      setLoginMessage("Este usuário não está autorizado como cliente ou está inativo.");
      return null;
    }

    const tenantId = currentProfile.tenant_id;

    const [tenantResult, membersResult, eventsResult, announcementsResult, usersResult, modulesResult] =
      await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, slug, logo_url, primary_color, accent_color")
          .eq("id", tenantId)
          .single<TenantRecord>(),
        supabase
          .from("members")
          .select("id, name, email, phone, status, ministry, notes, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .returns<MemberRecord[]>(),
        supabase
          .from("tenant_events")
          .select("id, title, description, location, event_date, created_at")
          .eq("tenant_id", tenantId)
          .order("event_date", { ascending: true })
          .returns<EventRecord[]>(),
        supabase
          .from("tenant_announcements")
          .select("id, title, message, published_at, created_at")
          .eq("tenant_id", tenantId)
          .order("published_at", { ascending: false })
          .returns<AnnouncementRecord[]>(),
        supabase
          .from("profiles")
          .select("id, full_name, email, tenant_role, status")
          .eq("tenant_id", tenantId)
          .returns<TenantUserRecord[]>(),
        supabase
          .from("tenant_modules")
          .select("status, platform_modules (id, code, name, description, status)")
          .eq("tenant_id", tenantId)
          .eq("status", "active"),
      ]);

    if (
      tenantResult.error ||
      membersResult.error ||
      eventsResult.error ||
      announcementsResult.error ||
      usersResult.error ||
      modulesResult.error
    ) {
      setDataStatus("error");
      setLoginMessage("Erro ao carregar dados do tenant.");
      return null;
    }

    const modules = (modulesResult.data ?? []).map((item) => item.platform_modules) as TenantModuleRecord[];

    setClientData({
      profile: currentProfile,
      tenant: tenantResult.data,
      members: membersResult.data ?? [],
      events: eventsResult.data ?? [],
      announcements: announcementsResult.data ?? [],
      users: usersResult.data ?? [],
      modules,
    });

    setThemeForm({
      logo_url: tenantResult.data.logo_url ?? "",
      primary_color: tenantResult.data.primary_color,
      accent_color: tenantResult.data.accent_color,
    });

    setDataStatus("ready");
    return currentProfile;
  }

  async function handleClientLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoginStatus("error");
      setLoginMessage("Falha no login. Verifique e-mail e senha.");
      return;
    }

    const currentProfile = await loadClientData(data.user.id);
    if (currentProfile) {
      setProfile(currentProfile);
      setLoginStatus("success");
    } else {
      setLoginStatus("error");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setClientData(null);
    setProfile(null);
    setLoginStatus("idle");
    setDataStatus("idle");
  }

  function openCreateMemberForm() {
    setMemberForm({ ...emptyMemberForm, tenant_id: clientData?.tenant.id ?? "" });
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setIsMemberFormOpen(true);
  }

  function openEditMemberForm(member: MemberRecord) {
    setMemberForm({ ...member, tenant_id: clientData?.tenant.id ?? "" });
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setIsMemberFormOpen(true);
  }

  function updateMemberForm(field: keyof MemberFormState, value: string) {
    setMemberForm((current) => ({ ...current, [field]: value }));
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberSaveStatus("loading");
    setMemberSaveMessage("");

    if (!memberForm.name.trim()) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Informe o nome do membro.");
      return;
    }

    const payload = {
      id: memberForm.id || undefined,
      tenant_id: clientData?.tenant.id,
      name: memberForm.name.trim(),
      email: memberForm.email?.trim() || null,
      phone: memberForm.phone?.trim() || null,
      status: memberForm.status,
      ministry: memberForm.ministry?.trim() || null,
      notes: memberForm.notes?.trim() || null,
    };

    const result = memberForm.id
      ? await supabase.from("members").update(payload).eq("id", memberForm.id)
      : await supabase.from("members").insert(payload);

    if (result.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Não foi possível salvar o membro.");
      return;
    }

    setMemberSaveStatus("success");
    setMemberSaveMessage(memberForm.id ? "Membro atualizado." : "Membro criado.");
    setIsMemberFormOpen(false);
    setMemberForm({ ...emptyMemberForm, tenant_id: clientData?.tenant.id ?? "" });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!memberId || !profile) {
      return;
    }

    const { error } = await supabase.from("members").delete().eq("id", memberId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openCreateEventForm() {
    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setIsEventFormOpen(true);
  }

  function openEditEventForm(eventRecord: EventRecord) {
    setEventForm({ ...eventRecord, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setIsEventFormOpen(true);
  }

  function updateEventForm(field: keyof EventFormState, value: string) {
    setEventForm((current) => ({ ...current, [field]: value }));
  }

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEventSaveStatus("loading");
    setEventSaveMessage("");

    if (!eventForm.title.trim() || !eventForm.event_date.trim()) {
      setEventSaveStatus("error");
      setEventSaveMessage("Informe título e data do evento.");
      return;
    }

    const payload = {
      id: eventForm.id || undefined,
      tenant_id: clientData?.tenant.id,
      title: eventForm.title.trim(),
      description: eventForm.description?.trim() || null,
      location: eventForm.location?.trim() || null,
      event_date: eventForm.event_date,
    };

    const result = eventForm.id
      ? await supabase.from("tenant_events").update(payload).eq("id", eventForm.id)
      : await supabase.from("tenant_events").insert(payload);

    if (result.error) {
      setEventSaveStatus("error");
      setEventSaveMessage("Não foi possível salvar o evento.");
      return;
    }

    setEventSaveStatus("success");
    setEventSaveMessage(eventForm.id ? "Evento atualizado." : "Evento criado.");
    setIsEventFormOpen(false);
    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!eventId || !profile) {
      return;
    }

    const { error } = await supabase.from("tenant_events").delete().eq("id", eventId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openCreateAnnouncementForm() {
    setAnnouncementForm({
      ...emptyAnnouncementForm,
      tenant_id: clientData?.tenant.id ?? "",
      published_at: new Date().toISOString(),
    });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
  }

  function openEditAnnouncementForm(announcement: AnnouncementRecord) {
    setAnnouncementForm({
      ...announcement,
      tenant_id: clientData?.tenant.id ?? "",
    });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
  }

  function updateAnnouncementForm(field: keyof AnnouncementFormState, value: string) {
    setAnnouncementForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncementSaveStatus("loading");
    setAnnouncementSaveMessage("");

    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Informe título e mensagem.");
      return;
    }

    const payload = {
      id: announcementForm.id || undefined,
      tenant_id: clientData?.tenant.id,
      title: announcementForm.title.trim(),
      message: announcementForm.message.trim(),
      published_at: announcementForm.published_at || new Date().toISOString(),
    };

    const result = announcementForm.id
      ? await supabase.from("tenant_announcements").update(payload).eq("id", announcementForm.id)
      : await supabase.from("tenant_announcements").insert(payload);

    if (result.error) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Não foi possível salvar o comunicado.");
      return;
    }

    setAnnouncementSaveStatus("success");
    setAnnouncementSaveMessage(announcementForm.id ? "Comunicado atualizado." : "Comunicado criado.");
    setIsAnnouncementFormOpen(false);
    setAnnouncementForm({ ...emptyAnnouncementForm, tenant_id: clientData?.tenant.id ?? "" });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  function updateThemeForm(field: keyof ThemeFormState, value: string) {
    setThemeForm((current) => ({ ...current, [field]: value }));
  }

  async function handleThemeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setThemeSaveStatus("loading");
    setThemeSaveMessage("");

    const payload = {
      logo_url: themeForm.logo_url || null,
      primary_color: themeForm.primary_color,
      accent_color: themeForm.accent_color,
    };

    const result = await supabase
      .from("tenants")
      .update(payload)
      .eq("id", clientData?.tenant.id);

    if (result.error) {
      setThemeSaveStatus("error");
      setThemeSaveMessage("Não foi possível salvar o tema do cliente.");
      return;
    }

    setThemeSaveStatus("success");
    setThemeSaveMessage("Tema atualizado.");
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !clientData?.tenant.id) {
      return;
    }

    setLogoUploadStatus("loading");
    setLogoUploadMessage("");

    const filePath = `tenant-logos/${clientData.tenant.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tenant-logos").upload(filePath, file, {
      upsert: true,
    });

    if (uploadError) {
      setLogoUploadStatus("error");
      setLogoUploadMessage(
        "Falha ao enviar logo. Verifique se o bucket `tenant-logos` existe no Supabase Storage.",
      );
      return;
    }

    const { data } = supabase.storage.from("tenant-logos").getPublicUrl(filePath);
    if (!data.publicUrl) {
      setLogoUploadStatus("error");
      setLogoUploadMessage("Logo enviada, mas não foi possível obter a URL pública.");
      return;
    }

    setThemeForm((current) => ({ ...current, logo_url: data.publicUrl }));
    setLogoUploadStatus("success");
    setLogoUploadMessage("Logo enviada com sucesso.");
  }

  function handleUserFieldChange(userId: string, field: keyof UserEditState, value: string) {
    setUserEdits((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      } as UserEditState,
    }));
  }

  async function handleSaveUser(userId: string) {
    const edit = userEdits[userId];
    if (!edit || !profile) {
      return;
    }

    setUserSaveStatus((current) => ({ ...current, [userId]: "loading" }));
    setUserSaveMessage((current) => ({ ...current, [userId]: "" }));

    const payload = {
      full_name: edit.full_name?.trim() || null,
      tenant_role: edit.tenant_role || null,
      status: edit.status,
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

    if (error) {
      setUserSaveStatus((current) => ({ ...current, [userId]: "error" }));
      setUserSaveMessage((current) => ({
        ...current,
        [userId]: "Não foi possível atualizar o usuário.",
      }));
      return;
    }

    setUserSaveStatus((current) => ({ ...current, [userId]: "success" }));
    setUserSaveMessage((current) => ({
      ...current,
      [userId]: "Usuário atualizado.",
    }));
    await loadClientData(profile.id);
  }

  const tenant = clientData?.tenant;

  if (!tenant || dataStatus === "error") {
    return (
      <main className="client-admin-page">
        <section className="admin-auth-page">
          <div className="admin-auth-brand">
            <a className="brand-mark" href="/" aria-label="SirvaOS">
              <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
            </a>
            <div className="admin-auth-copy">
              <span className="eyebrow">
                <ShieldCheck size={18} />
                Admin Cliente / Igreja
              </span>
              <h1>Acesso ao painel da igreja</h1>
              <p>Faça login com seu usuário de tenant para acessar a gestão do cliente.</p>
            </div>
          </div>

          <section className="admin-auth-panel">
            <form className="login-form" onSubmit={handleClientLogin}>
              <TextField
                autoComplete="email"
                icon={<Mail size={18} />}
                label="E-mail"
                name="email"
                placeholder="admin@igreja.org"
                type="email"
              />
              <TextField
                autoComplete="current-password"
                endIcon={
                  <button type="button" aria-label="Mostrar senha">
                    <Eye size={18} />
                  </button>
                }
                icon={<LockKeyhole size={18} />}
                label="Senha"
                name="password"
                placeholder="Sua senha"
                type="password"
              />
              {loginMessage ? <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p> : null}
              <Button type="submit" disabled={loginStatus === "loading"} icon={<ArrowRight size={18} />}>
                {loginStatus === "loading" ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="client-admin-page">
      <aside className="client-admin-sidebar" aria-label="Navegação do Admin Cliente">
        <div className="client-brand">
          <span>{tenant.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{tenant.name}</strong>
            <small>{tenant.slug}</small>
          </div>
        </div>

        <nav>
          {clientTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "active" : undefined}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <button className="global-admin-logout" type="button" onClick={handleSignOut}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <section className="global-admin-content">
        <header className="global-admin-header">
          <div>
            <span>Etapa 3 · Admin Cliente/Igreja</span>
            <h1>{activeTab === "overview" ? "Painel da igreja" : activeTab === "members" ? "Gestão de membros" : activeTab === "events" ? "Calendário central" : activeTab === "notices" ? "Comunicados gerais" : activeTab === "theme" ? "Identidade visual" : "Gestão de usuários"}</h1>
            <p>
              {activeTab === "overview"
                ? "Acompanhe membros, eventos, módulos ativos e o tema white-label do tenant."
                : activeTab === "members"
                ? "Gerencie o cadastro básico dos membros da igreja." 
                : activeTab === "events"
                ? "Planeje os eventos e cultos do calendário central." 
                : activeTab === "notices"
                ? "Publique comunicados gerais para o tenant." 
                : activeTab === "theme"
                ? "Atualize logo, cores e visual do painel da igreja." 
                : "Gerencie usuários e permissões do tenant."}
            </p>
          </div>
          <Button
            icon={<Plus size={18} />}
            onClick={() => {
              if (activeTab === "members") openCreateMemberForm();
              if (activeTab === "events") openCreateEventForm();
              if (activeTab === "notices") openCreateAnnouncementForm();
            }}
            disabled={!isTenantAdmin || !(activeTab === "members" || activeTab === "events" || activeTab === "notices")}
          >
            {activeTab === "members"
              ? "Novo membro"
              : activeTab === "events"
              ? "Novo evento"
              : activeTab === "notices"
              ? "Novo comunicado"
              : ""}
          </Button>
        </header>

        <div className="client-stats">
          <article>
            <span>Membros</span>
            <strong>{memberCount}</strong>
            <small>Membros ativos e cadastrados</small>
          </article>
          <article>
            <span>Eventos</span>
            <strong>{eventCount}</strong>
            <small>Próximos itens no calendário</small>
          </article>
          <article>
            <span>Comunicados</span>
            <strong>{announcementCount}</strong>
            <small>Mensagens para o tenant</small>
          </article>
          <article>
            <span>Módulos ativos</span>
            <strong>{activeModules.length}</strong>
            <small>Funcionalidades disponíveis</small>
          </article>
        </div>

        <div className="dashboard-grid">
          {activeTab === "overview" ? (
            <>
              <article className="panel members-panel">
                <div className="panel-heading">
                  <div>
                    <span>Membros</span>
                    <h4>Visão rápida</h4>
                  </div>
                  <button type="button" onClick={() => setActiveTab("members")}>Ver todos</button>
                </div>

                <div className="member-list">
                  {clientData.members.slice(0, 4).map((member) => (
                    <div key={member.id} className="member-row">
                      <span>{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.ministry || member.email || "Sem grupo definido"}</small>
                      </div>
                      <em className={member.status === "active" ? "success" : "warning"}>{member.status}</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <span>Calendário central</span>
                    <h4>Próximos eventos</h4>
                  </div>
                  <CalendarCheck size={20} />
                </div>

                <div className="event-list">
                  {clientData.events.slice(0, 4).map((item) => (
                    <div key={item.id}>
                      <time>{new Date(item.event_date).toLocaleDateString("pt-BR")}</time>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.location || item.description || "Sem local definido"}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <span>Notificações</span>
                    <h4>Últimos comunicados</h4>
                  </div>
                  <Bell size={20} />
                </div>

                <div className="notification-list">
                  {clientData.announcements.slice(0, 4).map((item) => (
                    <div key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{new Date(item.published_at).toLocaleDateString("pt-BR")}</small>
                      </div>
                      <em>Publicado</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel theme-panel">
                <div className="panel-heading">
                  <div>
                    <span>White-label</span>
                    <h4>Visual do tenant</h4>
                  </div>
                  <Palette size={20} />
                </div>

                <div className="theme-preview">
                  <span className="church-logo">{tenant.name.slice(0, 2).toUpperCase()}</span>
                  <div className="theme-swatches" aria-label="Cores do cliente">
                    <span style={{ background: themeForm.primary_color }} />
                    <span style={{ background: themeForm.accent_color }} />
                    <span style={{ background: themeForm.logo_url ? "#333" : "#ddd" }} />
                  </div>
                </div>
              </article>
            </>
          ) : null}

          {activeTab === "members" ? (
            <article className="panel members-panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Membros</span>
                  <h4>Lista de membros cadastrados</h4>
                </div>
                {isTenantAdmin ? (
                  <button type="button" onClick={openCreateMemberForm}>Novo membro</button>
                ) : null}
              </div>

              <div className="member-list">
                {clientData.members.map((member) => (
                  <div key={member.id} className="member-row">
                    <span>{member.name.slice(0, 1)}</span>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.ministry || member.email || "Sem grupo definido"}</small>
                    </div>
                    <em className={member.status === "active" ? "success" : "warning"}>{member.status}</em>
                    {isTenantAdmin ? (
                      <div className="member-actions">
                        <button type="button" onClick={() => openEditMemberForm(member)}>
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => handleDeleteMember(member.id)}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "events" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Calendário central</span>
                  <h4>Eventos da igreja</h4>
                </div>
                {isTenantAdmin ? (
                  <button type="button" onClick={openCreateEventForm}>Novo evento</button>
                ) : null}
              </div>

              <div className="event-list">
                {clientData.events.map((item) => (
                  <div key={item.id}>
                    <time>{new Date(item.event_date).toLocaleDateString("pt-BR")}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.location || item.description || "Sem local definido"}</small>
                    </div>
                    {isTenantAdmin ? (
                      <div className="member-actions">
                        <button type="button" onClick={() => openEditEventForm(item)}>
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => handleDeleteEvent(item.id)}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "notices" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Comunicados gerais</span>
                  <h4>Mensagens para membros</h4>
                </div>
                {isTenantAdmin ? (
                  <button type="button" onClick={openCreateAnnouncementForm}>Novo comunicado</button>
                ) : null}
              </div>

              <div className="notification-list">
                {clientData.announcements.map((item) => (
                  <div key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{new Date(item.published_at).toLocaleDateString("pt-BR")}</small>
                    </div>
                    {isTenantAdmin ? (
                      <div className="member-actions">
                        <button type="button" onClick={() => openEditAnnouncementForm(item)}>
                          <Edit3 size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "theme" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Identidade visual</span>
                  <h4>Logo, cores e preview</h4>
                </div>
              </div>

              <form className="tenant-form" onSubmit={handleThemeSubmit}>
                <label>
                  <span>Logo da igreja</span>
                  <div className="logo-picker">
                    {themeForm.logo_url ? (
                      <img src={themeForm.logo_url} alt="Logo do tenant" />
                    ) : (
                      <span className="logo-placeholder">Sem logo</span>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                </label>
                <label>
                  <span>Cor primária</span>
                  <input
                    type="color"
                    value={themeForm.primary_color}
                    onChange={(event) => updateThemeForm("primary_color", event.target.value)}
                  />
                </label>
                <label>
                  <span>Cor de destaque</span>
                  <input
                    type="color"
                    value={themeForm.accent_color}
                    onChange={(event) => updateThemeForm("accent_color", event.target.value)}
                  />
                </label>

                {logoUploadMessage ? (
                  <p className={`login-feedback ${logoUploadStatus}`}>{logoUploadMessage}</p>
                ) : null}
                {themeSaveMessage ? (
                  <p className={`login-feedback ${themeSaveStatus}`}>{themeSaveMessage}</p>
                ) : null}

                <div className="tenant-form-actions">
                  <Button type="submit" disabled={themeSaveStatus === "loading"} icon={<ArrowRight size={18} />}>
                    {themeSaveStatus === "loading" ? "Salvando..." : "Salvar identidade"}
                  </Button>
                </div>
              </form>
            </article>
          ) : null}

          {activeTab === "users" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Usuários</span>
                  <h4>Perfis e permissões do tenant</h4>
                </div>
              </div>

              <div className="member-list">
                {clientData.users.map((user) => {
                  const edit = userEdits[user.id] ?? {
                    full_name: user.full_name,
                    tenant_role: user.tenant_role ?? "member",
                    status: user.status,
                  };
                  return (
                    <div key={user.id} className="member-row">
                      <span>{user.full_name?.slice(0, 1) ?? user.email.slice(0, 1)}</span>
                      <div>
                        <strong>{user.full_name || user.email}</strong>
                        <small>{user.email}</small>
                      </div>
                      <div className="user-edit-row">
                        <select
                          value={edit.tenant_role}
                          onChange={(event) => handleUserFieldChange(user.id, "tenant_role", event.target.value)}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Membro</option>
                        </select>
                        <select
                          value={edit.status}
                          onChange={(event) => handleUserFieldChange(user.id, "status", event.target.value)}
                        >
                          <option value="active">Ativo</option>
                          <option value="invited">Convidado</option>
                          <option value="suspended">Suspenso</option>
                        </select>
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={userSaveStatus[user.id] === "loading"}
                          onClick={() => handleSaveUser(user.id)}
                        >
                          Salvar
                        </Button>
                      </div>
                      {userSaveMessage[user.id] ? (
                        <small className={`login-feedback ${userSaveStatus[user.id]}`}>
                          {userSaveMessage[user.id]}
                        </small>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}
