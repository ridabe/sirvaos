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
  Users2,
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
  member_id?: string | null;
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
  status_v2?: "active" | "inactive" | "visitor" | "in_process";
  date_of_birth?: string | null;
  document_number?: string | null;
  address_line1?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
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

type CatalogItemRecord = {
  id: string;
  tenant_id: string | null;
  name: string;
};

type MemberRoleRecord = {
  tenant_id: string;
  member_id: string;
  role_id: string;
  catalog_roles: { name: string } | null;
};

type MemberMinistryRecord = {
  tenant_id: string;
  member_id: string;
  ministry_id: string;
  is_admin: boolean;
  catalog_ministries: { name: string } | null;
};

type TenantUserRecord = {
  id: string;
  full_name: string | null;
  email: string;
  tenant_role: TenantRole | null;
  status: "active" | "invited" | "suspended";
};

type FamilyRecord = {
  id: string;
  tenant_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FamilyMemberRecord = {
  tenant_id: string;
  family_id: string;
  member_id: string;
  relationship: string;
  is_primary: boolean;
  members: { name: string; email: string | null } | null;
};

type MemberHistoryRecord = {
  id: string;
  tenant_id: string;
  member_id: string;
  event_type: string;
  notes: string | null;
  occurred_at: string;
};

type ClientDashboardData = {
  profile: TenantProfile;
  tenant: TenantRecord;
  members: MemberRecord[];
  memberRoleIdsByMemberId: Record<string, string[]>;
  memberMinistriesByMemberId: Record<string, Array<{ ministry_id: string; name: string; is_admin: boolean }>>;
  families: FamilyRecord[];
  familyMembersByFamilyId: Record<string, Array<{ member_id: string; name: string; relationship: string; is_primary: boolean }>>;
  events: EventRecord[];
  announcements: AnnouncementRecord[];
  users: TenantUserRecord[];
  modules: TenantModuleRecord[];
  catalogRoles: CatalogItemRecord[];
  catalogMinistries: CatalogItemRecord[];
};

type MemberFormState = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "visitor" | "in_process";
  date_of_birth: string;
  document_number: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  notes: string;
  roleIds: string[];
  ministries: Array<{ ministry_id: string; is_admin: boolean }>;
};

type FamilyFormState = {
  id: string;
  tenant_id: string;
  name: string;
  notes: string;
  members: Array<{ member_id: string; relationship: string; is_primary: boolean }>;
};
type EventFormState = Omit<EventRecord, "created_at"> & { tenant_id: string };
type AnnouncementFormState = Omit<AnnouncementRecord, "created_at"> & { tenant_id: string };
type ThemeFormState = {
  logo_url: string;
  primary_color: string;
  accent_color: string;
};

type UserEditState = {
  full_name: string | null;
  tenant_role: TenantRole;
  status: "active" | "invited" | "suspended";
};

const emptyMemberForm: MemberFormState = {
  id: "",
  name: "",
  email: "",
  phone: "",
  status: "active",
  date_of_birth: "",
  document_number: "",
  address_line1: "",
  address_city: "",
  address_state: "",
  address_postal_code: "",
  notes: "",
  tenant_id: "",
  roleIds: [],
  ministries: [],
};

const emptyFamilyForm: FamilyFormState = {
  id: "",
  tenant_id: "",
  name: "",
  notes: "",
  members: [],
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
    member_id: "member-1",
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
  memberRoleIdsByMemberId: {
    "member-1": ["role-sys-2"],
  },
  memberMinistriesByMemberId: {
    "member-1": [{ ministry_id: "min-sys-1", name: "Ministério de Louvor", is_admin: true }],
  },
  families: [
    {
      id: "family-1",
      tenant_id: "demo-tenant",
      name: "Família Souza",
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  familyMembersByFamilyId: {
    "family-1": [
      { member_id: "member-1", name: "Mariana Souza", relationship: "self", is_primary: true },
      { member_id: "member-2", name: "Paulo Alves", relationship: "spouse", is_primary: false },
    ],
  },
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
  catalogRoles: [
    { id: "role-sys-1", tenant_id: null, name: "Membro" },
    { id: "role-sys-2", tenant_id: null, name: "Líder de ministério" },
    { id: "role-tenant-1", tenant_id: "demo-tenant", name: "Líder de célula" },
  ],
  catalogMinistries: [
    { id: "min-sys-1", tenant_id: null, name: "Ministério de Louvor" },
    { id: "min-sys-2", tenant_id: null, name: "Intercessão / Oração" },
    { id: "min-tenant-1", tenant_id: "demo-tenant", name: "Ministério de Artes" },
  ],
};

const clientTabs = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "members", label: "Membros", icon: UsersRound },
  { key: "families", label: "Famílias", icon: Users2 },
  { key: "events", label: "Calendário", icon: CalendarCheck },
  { key: "notices", label: "Comunicados", icon: Bell },
  { key: "lists", label: "Listagens", icon: Edit3 },
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
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | MemberFormState["status"]>("all");
  const [memberForm, setMemberForm] = useState<MemberFormState>(emptyMemberForm);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberSaveStatus, setMemberSaveStatus] = useState<LoginStatus>("idle");
  const [memberSaveMessage, setMemberSaveMessage] = useState("");
  const [memberHistory, setMemberHistory] = useState<MemberHistoryRecord[]>([]);
  const [memberHistoryStatus, setMemberHistoryStatus] = useState<LoadStatus>("idle");
  const [memberHistoryDraftType, setMemberHistoryDraftType] = useState("");
  const [memberHistoryDraftNotes, setMemberHistoryDraftNotes] = useState("");
  const [familyForm, setFamilyForm] = useState<FamilyFormState>(emptyFamilyForm);
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [familySaveStatus, setFamilySaveStatus] = useState<LoginStatus>("idle");
  const [familySaveMessage, setFamilySaveMessage] = useState("");
  const [familyMemberPickerId, setFamilyMemberPickerId] = useState("");
  const [familyMemberRelationship, setFamilyMemberRelationship] = useState("other");
  const [familyMemberPrimary, setFamilyMemberPrimary] = useState(false);
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
  const [catalogRoleDraft, setCatalogRoleDraft] = useState("");
  const [catalogMinistryDraft, setCatalogMinistryDraft] = useState("");
  const [catalogEdits, setCatalogEdits] = useState<Record<string, string>>({});
  const [catalogSaveStatus, setCatalogSaveStatus] = useState<LoginStatus>("idle");
  const [catalogSaveMessage, setCatalogSaveMessage] = useState("");
  const [ministryPickerId, setMinistryPickerId] = useState("");

  const isTenantAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.tenant_role === "owner" || profile.tenant_role === "admin";
  }, [profile]);

  const isSecretariaAdmin = useMemo(() => {
    if (!profile?.member_id || !clientData) {
      return false;
    }

    const memberships = clientData.memberMinistriesByMemberId[profile.member_id] ?? [];
    return memberships.some((item) => item.is_admin && item.name.toLowerCase().startsWith("secretaria"));
  }, [clientData, profile?.member_id]);

  const canManageMembers = isTenantAdmin || isSecretariaAdmin;

  const catalogRoleNameById = useMemo(() => {
    const items = clientData?.catalogRoles ?? [];
    return items.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [clientData?.catalogRoles]);

  const catalogMinistryNameById = useMemo(() => {
    const items = clientData?.catalogMinistries ?? [];
    return items.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [clientData?.catalogMinistries]);

  const memberSummaryById = useMemo(() => {
    if (!clientData) {
      return {};
    }

    const roles = clientData.memberRoleIdsByMemberId;
    const ministries = clientData.memberMinistriesByMemberId;

    return clientData.members.reduce<Record<string, string>>((acc, member) => {
      const roleNames = (roles[member.id] ?? [])
        .map((id) => catalogRoleNameById[id])
        .filter(Boolean);

      const ministryNames = (ministries[member.id] ?? []).map((item) =>
        item.is_admin ? `${item.name} (Admin)` : item.name,
      );

      const parts = [...ministryNames, ...roleNames].filter(Boolean);
      acc[member.id] = parts.length ? parts.join(" · ") : member.email ?? "Sem vínculos";
      return acc;
    }, {});
  }, [catalogRoleNameById, clientData, clientData?.members, clientData?.memberMinistriesByMemberId, clientData?.memberRoleIdsByMemberId]);

  const filteredMembers = useMemo(() => {
    if (!clientData) {
      return [];
    }

    const term = memberSearchTerm.trim().toLowerCase();
    return clientData.members.filter((member) => {
      const status = (member.status_v2 ?? member.status) as MemberFormState["status"];
      if (memberStatusFilter !== "all" && status !== memberStatusFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [member.name, member.email ?? "", member.phone ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [clientData, memberSearchTerm, memberStatusFilter]);

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
      .select("id, full_name, email, tenant_id, tenant_role, member_id, status, avatar_url")
      .eq("id", userId)
      .single<TenantProfile>();

    if (profileResult.error || !profileResult.data) {
      setDataStatus("error");
      setLoginMessage("Não foi possível carregar seu perfil.");
      return null;
    }

    let currentProfile = profileResult.data;
    if (!currentProfile.tenant_id || currentProfile.status !== "active") {
      setDataStatus("error");
      setLoginMessage("Este usuário não está autorizado como cliente ou está inativo.");
      return null;
    }

    if (!currentProfile.member_id) {
      await supabase.rpc("ensure_current_profile_member");
      const refreshedProfileResult = await supabase
        .from("profiles")
        .select("id, full_name, email, tenant_id, tenant_role, member_id, status, avatar_url")
        .eq("id", userId)
        .single<TenantProfile>();

      if (!refreshedProfileResult.error && refreshedProfileResult.data) {
        currentProfile = refreshedProfileResult.data;
      }
    }

    const tenantId = currentProfile.tenant_id;

    const [
      tenantResult,
      membersResult,
      memberRolesResult,
      memberMinistriesResult,
      familiesResult,
      familyMembersResult,
      eventsResult,
      announcementsResult,
      usersResult,
      modulesResult,
      catalogRolesResult,
      catalogMinistriesResult,
    ] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, slug, logo_url, primary_color, accent_color")
          .eq("id", tenantId)
          .single<TenantRecord>(),
        supabase
          .from("members")
          .select(
            "id, name, email, phone, status, status_v2, date_of_birth, document_number, address_line1, address_city, address_state, address_postal_code, ministry, notes, created_at",
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .returns<MemberRecord[]>(),
        supabase
          .from("member_roles")
          .select("tenant_id, member_id, role_id, catalog_roles (name)")
          .eq("tenant_id", tenantId)
          .returns<MemberRoleRecord[]>(),
        supabase
          .from("member_ministries")
          .select("tenant_id, member_id, ministry_id, is_admin, catalog_ministries (name)")
          .eq("tenant_id", tenantId)
          .returns<MemberMinistryRecord[]>(),
        supabase
          .from("families")
          .select("id, tenant_id, name, notes, created_at, updated_at")
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true })
          .returns<FamilyRecord[]>(),
        supabase
          .from("family_members")
          .select("tenant_id, family_id, member_id, relationship, is_primary, members (name, email)")
          .eq("tenant_id", tenantId)
          .returns<FamilyMemberRecord[]>(),
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
        supabase
          .from("catalog_roles")
          .select("id, tenant_id, name")
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order("name", { ascending: true })
          .returns<CatalogItemRecord[]>(),
        supabase
          .from("catalog_ministries")
          .select("id, tenant_id, name")
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order("name", { ascending: true })
          .returns<CatalogItemRecord[]>(),
      ]);

    if (
      tenantResult.error ||
      membersResult.error ||
      memberRolesResult.error ||
      memberMinistriesResult.error ||
      familiesResult.error ||
      familyMembersResult.error ||
      eventsResult.error ||
      announcementsResult.error ||
      usersResult.error ||
      modulesResult.error ||
      catalogRolesResult.error ||
      catalogMinistriesResult.error
    ) {
      setDataStatus("error");
      setLoginMessage("Erro ao carregar dados do tenant.");
      return null;
    }

    const modules = (modulesResult.data ?? [])
      .flatMap((item) => {
        const embedded = (item as { platform_modules?: unknown }).platform_modules;
        if (!embedded) {
          return [];
        }
        return Array.isArray(embedded) ? (embedded as TenantModuleRecord[]) : ([embedded] as TenantModuleRecord[]);
      })
      .filter((module): module is TenantModuleRecord => Boolean(module?.id && module?.code));

    const memberRoleIdsByMemberId = (memberRolesResult.data ?? []).reduce<Record<string, string[]>>(
      (acc, row) => {
        if (!acc[row.member_id]) {
          acc[row.member_id] = [];
        }
        acc[row.member_id].push(row.role_id);
        return acc;
      },
      {},
    );

    const memberMinistriesByMemberId = (memberMinistriesResult.data ?? []).reduce<
      Record<string, Array<{ ministry_id: string; name: string; is_admin: boolean }>>
    >((acc, row) => {
      if (!acc[row.member_id]) {
        acc[row.member_id] = [];
      }
      acc[row.member_id].push({
        ministry_id: row.ministry_id,
        name: row.catalog_ministries?.name ?? "Ministério",
        is_admin: row.is_admin,
      });
      return acc;
    }, {});

    const familyMembersByFamilyId = (familyMembersResult.data ?? []).reduce<
      Record<string, Array<{ member_id: string; name: string; relationship: string; is_primary: boolean }>>
    >((acc, row) => {
      if (!acc[row.family_id]) {
        acc[row.family_id] = [];
      }
      acc[row.family_id].push({
        member_id: row.member_id,
        name: row.members?.name ?? "Membro",
        relationship: row.relationship,
        is_primary: row.is_primary,
      });
      return acc;
    }, {});

    setClientData({
      profile: currentProfile,
      tenant: tenantResult.data,
      members: membersResult.data ?? [],
      memberRoleIdsByMemberId,
      memberMinistriesByMemberId,
      families: familiesResult.data ?? [],
      familyMembersByFamilyId,
      events: eventsResult.data ?? [],
      announcements: announcementsResult.data ?? [],
      users: usersResult.data ?? [],
      modules,
      catalogRoles: catalogRolesResult.data ?? [],
      catalogMinistries: catalogMinistriesResult.data ?? [],
    });

    setThemeForm({
      logo_url: tenantResult.data.logo_url ?? "",
      primary_color: tenantResult.data.primary_color,
      accent_color: tenantResult.data.accent_color,
    });

    setDataStatus("ready");
    return currentProfile;
  }

  function handleCatalogEditChange(itemId: string, value: string) {
    setCatalogEdits((current) => ({ ...current, [itemId]: value }));
  }

  async function handleAddCatalogItem(kind: "roles" | "ministries") {
    if (!clientData || !profile || !isTenantAdmin) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const draft = kind === "roles" ? catalogRoleDraft : catalogMinistryDraft;
    const name = draft.trim();

    if (name.length < 2) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Informe um nome válido.");
      return;
    }

    setCatalogSaveStatus("loading");
    setCatalogSaveMessage("");

    if (demoMode) {
      const newItem: CatalogItemRecord = {
        id: `${kind}-${Date.now()}`,
        tenant_id: tenantId,
        name,
      };

      setClientData((current) => {
        if (!current) return current;
        if (kind === "roles") {
          return { ...current, catalogRoles: [...current.catalogRoles, newItem].sort((a, b) => a.name.localeCompare(b.name)) };
        }
        return {
          ...current,
          catalogMinistries: [...current.catalogMinistries, newItem].sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

      if (kind === "roles") {
        setCatalogRoleDraft("");
      } else {
        setCatalogMinistryDraft("");
      }

      setCatalogSaveStatus("success");
      setCatalogSaveMessage("Item adicionado ao seu tenant.");
      return;
    }

    const table = kind === "roles" ? "catalog_roles" : "catalog_ministries";
    const { error } = await supabase.from(table).insert({ tenant_id: tenantId, name });

    if (error) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Não foi possível adicionar o item.");
      return;
    }

    if (kind === "roles") {
      setCatalogRoleDraft("");
    } else {
      setCatalogMinistryDraft("");
    }

    setCatalogSaveStatus("success");
    setCatalogSaveMessage("Item adicionado ao seu tenant.");
    await loadClientData(profile.id);
  }

  async function handleSaveCatalogItem(kind: "roles" | "ministries", item: CatalogItemRecord) {
    if (!clientData || !profile || !isTenantAdmin) {
      return;
    }

    if (!item.tenant_id) {
      return;
    }

    const tenantId = clientData.tenant.id;
    if (item.tenant_id !== tenantId) {
      return;
    }

    const name = String(catalogEdits[item.id] ?? item.name).trim();
    if (name.length < 2) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Informe um nome válido.");
      return;
    }

    setCatalogSaveStatus("loading");
    setCatalogSaveMessage("");

    if (demoMode) {
      setClientData((current) => {
        if (!current) return current;
        if (kind === "roles") {
          return {
            ...current,
            catalogRoles: current.catalogRoles
              .map((row) => (row.id === item.id ? { ...row, name } : row))
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        }
        return {
          ...current,
          catalogMinistries: current.catalogMinistries
            .map((row) => (row.id === item.id ? { ...row, name } : row))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

      setCatalogSaveStatus("success");
      setCatalogSaveMessage("Item atualizado.");
      return;
    }

    const table = kind === "roles" ? "catalog_roles" : "catalog_ministries";
    const { error } = await supabase.from(table).update({ name }).eq("id", item.id);

    if (error) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Não foi possível atualizar o item.");
      return;
    }

    setCatalogSaveStatus("success");
    setCatalogSaveMessage("Item atualizado.");
    await loadClientData(profile.id);
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
    if (demoMode) {
      window.location.assign("/");
      return;
    }

    await supabase.auth.signOut();
    setClientData(null);
    setProfile(null);
    setLoginStatus("idle");
    setDataStatus("idle");
  }

  function openCreateMemberForm() {
    if (!canManageMembers) {
      return;
    }

    setMemberForm({ ...emptyMemberForm, tenant_id: clientData?.tenant.id ?? "" });
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setMemberHistory([]);
    setMemberHistoryStatus("idle");
    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    setMinistryPickerId("");
    setIsMemberFormOpen(true);
  }

  function openEditMemberForm(member: MemberRecord) {
    if (!canManageMembers) {
      return;
    }

    const memberId = member.id;
    const roleIds = clientData?.memberRoleIdsByMemberId[memberId] ?? [];
    const ministries =
      clientData?.memberMinistriesByMemberId[memberId]?.map((item) => ({
        ministry_id: item.ministry_id,
        is_admin: item.is_admin,
      })) ?? [];

    setMemberForm({
      id: member.id,
      tenant_id: clientData?.tenant.id ?? "",
      name: member.name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      status: (member.status_v2 ?? member.status) as MemberFormState["status"],
      date_of_birth: member.date_of_birth ?? "",
      document_number: member.document_number ?? "",
      address_line1: member.address_line1 ?? "",
      address_city: member.address_city ?? "",
      address_state: member.address_state ?? "",
      address_postal_code: member.address_postal_code ?? "",
      notes: member.notes ?? "",
      roleIds,
      ministries,
    });
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setMemberHistory([]);
    setMemberHistoryStatus("idle");
    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    setMinistryPickerId("");
    setIsMemberFormOpen(true);
    void loadMemberHistory(member.id);
  }

  function updateMemberForm(field: keyof MemberFormState, value: string) {
    setMemberForm((current) => ({ ...current, [field]: value }));
  }

  function toggleMemberRole(roleId: string) {
    setMemberForm((current) => {
      const exists = current.roleIds.includes(roleId);
      return {
        ...current,
        roleIds: exists ? current.roleIds.filter((id) => id !== roleId) : [...current.roleIds, roleId],
      };
    });
  }

  function addMemberMinistry(ministryId: string) {
    if (!ministryId) return;
    setMemberForm((current) => {
      if (current.ministries.some((item) => item.ministry_id === ministryId)) {
        return current;
      }
      return { ...current, ministries: [...current.ministries, { ministry_id: ministryId, is_admin: false }] };
    });
    setMinistryPickerId("");
  }

  function removeMemberMinistry(ministryId: string) {
    setMemberForm((current) => ({
      ...current,
      ministries: current.ministries.filter((item) => item.ministry_id !== ministryId),
    }));
  }

  function setMemberMinistryAdmin(ministryId: string, isAdmin: boolean) {
    setMemberForm((current) => ({
      ...current,
      ministries: current.ministries.map((item) =>
        item.ministry_id === ministryId ? { ...item, is_admin: isAdmin } : item,
      ),
    }));
  }

  async function loadMemberHistory(memberId: string) {
    if (!clientData || !memberId) {
      return;
    }

    if (demoMode) {
      setMemberHistory([]);
      setMemberHistoryStatus("ready");
      return;
    }

    setMemberHistoryStatus("loading");
    const { data, error } = await supabase
      .from("member_history")
      .select("id, tenant_id, member_id, event_type, notes, occurred_at")
      .eq("tenant_id", clientData.tenant.id)
      .eq("member_id", memberId)
      .order("occurred_at", { ascending: false })
      .limit(20)
      .returns<MemberHistoryRecord[]>();

    if (error) {
      setMemberHistoryStatus("error");
      return;
    }

    setMemberHistory(data ?? []);
    setMemberHistoryStatus("ready");
  }

  async function handleAddMemberHistory() {
    if (!clientData || !profile || !canManageMembers || !memberForm.id) {
      return;
    }

    const eventType = memberHistoryDraftType.trim();
    if (eventType.length < 3) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Informe um tipo de histórico válido.");
      return;
    }

    if (demoMode) {
      const now = new Date().toISOString();
      setMemberHistory((current) => [
        {
          id: `history-${Date.now()}`,
          tenant_id: clientData.tenant.id,
          member_id: memberForm.id,
          event_type: eventType,
          notes: memberHistoryDraftNotes.trim() || null,
          occurred_at: now,
        },
        ...current,
      ]);
      setMemberHistoryDraftType("");
      setMemberHistoryDraftNotes("");
      return;
    }

    const { error } = await supabase.from("member_history").insert({
      tenant_id: clientData.tenant.id,
      member_id: memberForm.id,
      event_type: eventType,
      notes: memberHistoryDraftNotes.trim() || null,
    });

    if (error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Não foi possível salvar o histórico.");
      return;
    }

    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    await loadMemberHistory(memberForm.id);
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

    if (!clientData) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Tenant não carregado.");
      return;
    }

    const payload = {
      id: memberForm.id || undefined,
      tenant_id: clientData.tenant.id,
      name: memberForm.name.trim(),
      email: memberForm.email.trim() || null,
      phone: memberForm.phone.trim() || null,
      status: memberForm.status,
      status_v2: memberForm.status,
      date_of_birth: memberForm.date_of_birth || null,
      document_number: memberForm.document_number.trim() || null,
      address_line1: memberForm.address_line1.trim() || null,
      address_city: memberForm.address_city.trim() || null,
      address_state: memberForm.address_state.trim() || null,
      address_postal_code: memberForm.address_postal_code.trim() || null,
      notes: memberForm.notes.trim() || null,
    };

    if (demoMode) {
      const now = new Date().toISOString();
      const memberId = memberForm.id || `member-${Date.now()}`;
      const memberRow: MemberRecord = {
        id: memberId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        status: payload.status,
        status_v2: payload.status_v2,
        date_of_birth: payload.date_of_birth,
        document_number: payload.document_number,
        address_line1: payload.address_line1,
        address_city: payload.address_city,
        address_state: payload.address_state,
        address_postal_code: payload.address_postal_code,
        ministry: null,
        notes: payload.notes,
        created_at: now,
      };

      setClientData((current) => {
        if (!current) return current;
        const nextMembers = memberForm.id
          ? current.members.map((row) => (row.id === memberId ? { ...row, ...memberRow } : row))
          : [memberRow, ...current.members];
        return {
          ...current,
          members: nextMembers,
          memberRoleIdsByMemberId: { ...current.memberRoleIdsByMemberId, [memberId]: [...memberForm.roleIds] },
          memberMinistriesByMemberId: {
            ...current.memberMinistriesByMemberId,
            [memberId]: memberForm.ministries.map((item) => ({
              ministry_id: item.ministry_id,
              name:
                current.catalogMinistries.find((m) => m.id === item.ministry_id)?.name ??
                "Ministério",
              is_admin: item.is_admin,
            })),
          },
        };
      });

      setMemberSaveStatus("success");
      setMemberSaveMessage(memberForm.id ? "Membro atualizado." : "Membro criado.");
      setIsMemberFormOpen(false);
      setMemberForm({ ...emptyMemberForm, tenant_id: clientData.tenant.id });
      return;
    }

    const memberResult = memberForm.id
      ? await supabase.from("members").update(payload).eq("id", memberForm.id).select("id").single<{ id: string }>()
      : await supabase.from("members").insert(payload).select("id").single<{ id: string }>();

    if (memberResult.error || !memberResult.data) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Não foi possível salvar o membro.");
      return;
    }

    const memberId = memberResult.data.id;

    const [deleteRolesResult, deleteMinistriesResult] = await Promise.all([
      supabase.from("member_roles").delete().eq("member_id", memberId),
      supabase.from("member_ministries").delete().eq("member_id", memberId),
    ]);

    if (deleteRolesResult.error || deleteMinistriesResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível atualizar cargos/ministérios.");
      return;
    }

    const roleRows = memberForm.roleIds.map((roleId) => ({
      tenant_id: clientData.tenant.id,
      member_id: memberId,
      role_id: roleId,
    }));

    const ministryRows = memberForm.ministries.map((item) => ({
      tenant_id: clientData.tenant.id,
      member_id: memberId,
      ministry_id: item.ministry_id,
      is_admin: item.is_admin,
    }));

    const [insertRolesResult, insertMinistriesResult] = await Promise.all([
      roleRows.length ? supabase.from("member_roles").insert(roleRows) : Promise.resolve({ error: null }),
      ministryRows.length ? supabase.from("member_ministries").insert(ministryRows) : Promise.resolve({ error: null }),
    ]);

    if ("error" in insertRolesResult && insertRolesResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível vincular cargos.");
      return;
    }

    if ("error" in insertMinistriesResult && insertMinistriesResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível vincular ministérios.");
      return;
    }

    setMemberSaveStatus("success");
    setMemberSaveMessage(memberForm.id ? "Membro atualizado." : "Membro criado.");
    setIsMemberFormOpen(false);
    setMemberForm({ ...emptyMemberForm, tenant_id: clientData.tenant.id });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!memberId || !profile || !canManageMembers) {
      return;
    }

    const { error } = await supabase.from("members").delete().eq("id", memberId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openCreateFamilyForm() {
    if (!canManageMembers) {
      return;
    }

    setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData?.tenant.id ?? "" });
    setFamilySaveStatus("idle");
    setFamilySaveMessage("");
    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
    setIsFamilyFormOpen(true);
  }

  function openEditFamilyForm(family: FamilyRecord) {
    if (!canManageMembers || !clientData) {
      return;
    }

    const members = clientData.familyMembersByFamilyId[family.id] ?? [];
    setFamilyForm({
      id: family.id,
      tenant_id: clientData.tenant.id,
      name: family.name,
      notes: family.notes ?? "",
      members: members.map((item) => ({
        member_id: item.member_id,
        relationship: item.relationship,
        is_primary: item.is_primary,
      })),
    });
    setFamilySaveStatus("idle");
    setFamilySaveMessage("");
    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
    setIsFamilyFormOpen(true);
  }

  function addFamilyMemberToForm() {
    if (!familyMemberPickerId) {
      return;
    }

    setFamilyForm((current) => {
      if (current.members.some((item) => item.member_id === familyMemberPickerId)) {
        return current;
      }

      const nextMember = {
        member_id: familyMemberPickerId,
        relationship: familyMemberRelationship,
        is_primary: familyMemberPrimary,
      };

      const nextMembers = familyMemberPrimary
        ? current.members.map((item) => ({ ...item, is_primary: false })).concat(nextMember)
        : current.members.concat(nextMember);

      return { ...current, members: nextMembers };
    });

    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
  }

  function updateFamilyMember(memberId: string, next: Partial<{ relationship: string; is_primary: boolean }>) {
    setFamilyForm((current) => {
      const nextMembers = current.members.map((item) => {
        if (item.member_id !== memberId) {
          return item;
        }
        return { ...item, ...next };
      });

      const shouldPrimary = next.is_primary === true;
      return {
        ...current,
        members: shouldPrimary ? nextMembers.map((item) => ({ ...item, is_primary: item.member_id === memberId })) : nextMembers,
      };
    });
  }

  function removeFamilyMember(memberId: string) {
    setFamilyForm((current) => ({ ...current, members: current.members.filter((item) => item.member_id !== memberId) }));
  }

  async function handleFamilySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !clientData || !canManageMembers) {
      return;
    }

    const name = familyForm.name.trim();
    if (name.length < 2) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Informe um nome de família válido.");
      return;
    }

    setFamilySaveStatus("loading");
    setFamilySaveMessage("");

    if (demoMode) {
      const now = new Date().toISOString();
      const familyId = familyForm.id || `family-${Date.now()}`;
      const familyRow: FamilyRecord = {
        id: familyId,
        tenant_id: clientData.tenant.id,
        name,
        notes: familyForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      setClientData((current) => {
        if (!current) return current;
        const families = familyForm.id
          ? current.families.map((row) => (row.id === familyId ? { ...row, ...familyRow } : row))
          : [...current.families, familyRow].sort((a, b) => a.name.localeCompare(b.name));

        const familyMembersByFamilyId = {
          ...current.familyMembersByFamilyId,
          [familyId]: familyForm.members.map((item) => ({
            member_id: item.member_id,
            name: current.members.find((m) => m.id === item.member_id)?.name ?? "Membro",
            relationship: item.relationship,
            is_primary: item.is_primary,
          })),
        };

        return { ...current, families, familyMembersByFamilyId };
      });

      setFamilySaveStatus("success");
      setFamilySaveMessage(familyForm.id ? "Família atualizada." : "Família criada.");
      setIsFamilyFormOpen(false);
      setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData.tenant.id });
      return;
    }

    const payload = {
      tenant_id: clientData.tenant.id,
      name,
      notes: familyForm.notes.trim() || null,
    };

    const familyResult = familyForm.id
      ? await supabase.from("families").update(payload).eq("id", familyForm.id).select("id").single<{ id: string }>()
      : await supabase.from("families").insert(payload).select("id").single<{ id: string }>();

    if (familyResult.error || !familyResult.data) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Não foi possível salvar a família.");
      return;
    }

    const familyId = familyResult.data.id;
    const deleteResult = await supabase.from("family_members").delete().eq("family_id", familyId);
    if (deleteResult.error) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Família salva, mas não foi possível atualizar dependentes.");
      return;
    }

    const familyMembersRows = familyForm.members.map((item) => ({
      tenant_id: clientData.tenant.id,
      family_id: familyId,
      member_id: item.member_id,
      relationship: item.relationship,
      is_primary: item.is_primary,
    }));

    if (familyMembersRows.length) {
      const insertResult = await supabase.from("family_members").insert(familyMembersRows);
      if (insertResult.error) {
        setFamilySaveStatus("error");
        setFamilySaveMessage("Família salva, mas não foi possível vincular dependentes.");
        return;
      }
    }

    setFamilySaveStatus("success");
    setFamilySaveMessage(familyForm.id ? "Família atualizada." : "Família criada.");
    setIsFamilyFormOpen(false);
    setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData.tenant.id });
    await loadClientData(profile.id);
  }

  async function handleDeleteFamily(familyId: string) {
    if (!profile || !canManageMembers) {
      return;
    }

    const { error } = await supabase.from("families").delete().eq("id", familyId);
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
      <main>
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
            <h1>
              {activeTab === "overview"
                ? "Painel da igreja"
                : activeTab === "members"
                ? "Gestão de membros"
                : activeTab === "families"
                ? "Famílias e dependentes"
                : activeTab === "events"
                ? "Calendário central"
                : activeTab === "notices"
                ? "Comunicados gerais"
                : activeTab === "lists"
                ? "Listagens do tenant"
                : activeTab === "theme"
                ? "Identidade visual"
                : "Gestão de usuários"}
            </h1>
            <p>
              {activeTab === "overview"
                ? "Acompanhe membros, eventos, módulos ativos e o tema white-label do tenant."
                : activeTab === "members"
                ? "Gerencie o cadastro básico dos membros da igreja." 
                : activeTab === "families"
                ? "Organize famílias, dependentes e vínculos principais para atendimento e acompanhamento."
                : activeTab === "events"
                ? "Planeje os eventos e cultos do calendário central." 
                : activeTab === "notices"
                ? "Publique comunicados gerais para o tenant." 
                : activeTab === "lists"
                ? "Gerencie cargos e ministérios visíveis no seu tenant, mantendo a lista base do sistema."
                : activeTab === "theme"
                ? "Atualize logo, cores e visual do painel da igreja." 
                : "Gerencie usuários e permissões do tenant."}
            </p>
          </div>
          {activeTab === "members" || activeTab === "families" || activeTab === "events" || activeTab === "notices" ? (
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                if (activeTab === "members") openCreateMemberForm();
                if (activeTab === "families") openCreateFamilyForm();
                if (activeTab === "events") openCreateEventForm();
                if (activeTab === "notices") openCreateAnnouncementForm();
              }}
              disabled={activeTab === "members" || activeTab === "families" ? !canManageMembers : !isTenantAdmin}
            >
              {activeTab === "members"
                ? "Novo membro"
                : activeTab === "families"
                ? "Nova família"
                : activeTab === "events"
                ? "Novo evento"
                : "Novo comunicado"}
            </Button>
          ) : null}
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
                        <small>{memberSummaryById[member.id] ?? member.email ?? "Sem vínculos"}</small>
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
                {canManageMembers ? (
                  <button type="button" onClick={openCreateMemberForm}>Novo membro</button>
                ) : null}
              </div>

              <div className="member-list">
                <div className="member-filters">
                  <input
                    className="catalog-input"
                    placeholder="Buscar por nome, e-mail ou telefone"
                    value={memberSearchTerm}
                    onChange={(event) => setMemberSearchTerm(event.target.value)}
                  />
                  <select
                    className="catalog-input"
                    value={memberStatusFilter}
                    onChange={(event) => setMemberStatusFilter(event.target.value as typeof memberStatusFilter)}
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="visitor">Visitante</option>
                    <option value="in_process">Em processo</option>
                  </select>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="catalog-empty">Nenhum membro encontrado para os filtros informados.</div>
                ) : null}

                {filteredMembers.map((member) => {
                  const status = (member.status_v2 ?? member.status) as MemberFormState["status"];
                  return (
                    <div key={member.id} className="member-row">
                      <span>{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{memberSummaryById[member.id] ?? member.email ?? "Sem vínculos"}</small>
                      </div>
                      <em className={status === "active" ? "success" : "warning"}>{status}</em>
                      {canManageMembers ? (
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
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === "families" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Famílias</span>
                  <h4>Família e dependentes</h4>
                </div>
                {canManageMembers ? <button type="button" onClick={openCreateFamilyForm}>Nova família</button> : null}
              </div>

              <div className="member-list">
                {clientData.families.length === 0 ? (
                  <div className="catalog-empty">Nenhuma família cadastrada ainda.</div>
                ) : null}

                {clientData.families.map((family) => {
                  const familyMembers = clientData.familyMembersByFamilyId[family.id] ?? [];
                  const primary = familyMembers.find((item) => item.is_primary);
                  const subtitleParts = [
                    primary ? `Principal: ${primary.name}` : null,
                    familyMembers.length ? `${familyMembers.length} pessoas` : "Sem dependentes",
                  ].filter(Boolean);

                  return (
                    <div key={family.id} className="member-row">
                      <span>{family.name.slice(0, 1)}</span>
                      <div>
                        <strong>{family.name}</strong>
                        <small>{subtitleParts.join(" · ")}</small>
                      </div>
                      <em className={familyMembers.length > 0 ? "success" : "warning"}>
                        {familyMembers.length > 0 ? "com vínculos" : "pendente"}
                      </em>
                      {canManageMembers ? (
                        <div className="member-actions">
                          <button type="button" onClick={() => openEditFamilyForm(family)}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDeleteFamily(family.id)}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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

          {activeTab === "lists" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Listagens</span>
                  <h4>Cargos e ministérios</h4>
                </div>
              </div>

              {catalogSaveMessage ? (
                <p className={`login-feedback ${catalogSaveStatus}`}>{catalogSaveMessage}</p>
              ) : null}

              <div className="catalog-grid">
                <section className="catalog-panel" aria-label="Lista de cargos">
                  <div className="catalog-header">
                    <strong>Cargos</strong>
                    <small>Use nos cadastros do seu tenant. A base do sistema é compartilhada.</small>
                  </div>

                  {isTenantAdmin ? (
                    <div className="catalog-add">
                      <input
                        className="catalog-input"
                        placeholder="Adicionar cargo do tenant"
                        value={catalogRoleDraft}
                        onChange={(event) => setCatalogRoleDraft(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={catalogSaveStatus === "loading"}
                        onClick={() => handleAddCatalogItem("roles")}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ) : null}

                  <div className="catalog-group">
                    <span className="catalog-label">Base do sistema</span>
                    <div className="catalog-list">
                      {clientData.catalogRoles
                        .filter((item) => item.tenant_id === null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row system">
                            <span>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="catalog-group">
                    <span className="catalog-label">Do seu tenant</span>
                    <div className="catalog-list">
                      {clientData.catalogRoles.filter((item) => item.tenant_id !== null).length === 0 ? (
                        <div className="catalog-empty">Nenhum cargo personalizado ainda.</div>
                      ) : null}
                      {clientData.catalogRoles
                        .filter((item) => item.tenant_id !== null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row">
                            <input
                              className="catalog-input"
                              value={catalogEdits[item.id] ?? item.name}
                              onChange={(event) => handleCatalogEditChange(item.id, event.target.value)}
                              disabled={!isTenantAdmin}
                            />
                            {isTenantAdmin ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={catalogSaveStatus === "loading"}
                                onClick={() => handleSaveCatalogItem("roles", item)}
                              >
                                Salvar
                              </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </section>

                <section className="catalog-panel" aria-label="Lista de ministérios">
                  <div className="catalog-header">
                    <strong>Ministérios</strong>
                    <small>Base de referência + itens do seu tenant para manter a nomenclatura local.</small>
                  </div>

                  {isTenantAdmin ? (
                    <div className="catalog-add">
                      <input
                        className="catalog-input"
                        placeholder="Adicionar ministério do tenant"
                        value={catalogMinistryDraft}
                        onChange={(event) => setCatalogMinistryDraft(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={catalogSaveStatus === "loading"}
                        onClick={() => handleAddCatalogItem("ministries")}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ) : null}

                  <div className="catalog-group">
                    <span className="catalog-label">Base do sistema</span>
                    <div className="catalog-list">
                      {clientData.catalogMinistries
                        .filter((item) => item.tenant_id === null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row system">
                            <span>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="catalog-group">
                    <span className="catalog-label">Do seu tenant</span>
                    <div className="catalog-list">
                      {clientData.catalogMinistries.filter((item) => item.tenant_id !== null).length === 0 ? (
                        <div className="catalog-empty">Nenhum ministério personalizado ainda.</div>
                      ) : null}
                      {clientData.catalogMinistries
                        .filter((item) => item.tenant_id !== null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row">
                            <input
                              className="catalog-input"
                              value={catalogEdits[item.id] ?? item.name}
                              onChange={(event) => handleCatalogEditChange(item.id, event.target.value)}
                              disabled={!isTenantAdmin}
                            />
                            {isTenantAdmin ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={catalogSaveStatus === "loading"}
                                onClick={() => handleSaveCatalogItem("ministries", item)}
                              >
                                Salvar
                              </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
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
                          value={edit.tenant_role ?? "member"}
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

      {isFamilyFormOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cadastro de família">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span>Membresia</span>
                <h2>{familyForm.id ? "Editar família" : "Nova família"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsFamilyFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleFamilySubmit}>
              <label>
                <span>Nome da família</span>
                <input
                  className="catalog-input"
                  placeholder="Ex.: Família Silva"
                  value={familyForm.name}
                  onChange={(event) => setFamilyForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  placeholder="Observações internas (opcional)"
                  value={familyForm.notes}
                  onChange={(event) => setFamilyForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                />
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Dependentes</strong>
                  <small>Vincule membros do tenant a esta família e marque o responsável principal.</small>
                </div>

                <div className="family-add-grid">
                  <select
                    className="catalog-input"
                    value={familyMemberPickerId}
                    onChange={(event) => setFamilyMemberPickerId(event.target.value)}
                  >
                    <option value="">Selecionar membro</option>
                    {clientData.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="catalog-input"
                    value={familyMemberRelationship}
                    onChange={(event) => setFamilyMemberRelationship(event.target.value)}
                  >
                    <option value="self">Titular</option>
                    <option value="spouse">Cônjuge</option>
                    <option value="child">Filho(a)</option>
                    <option value="parent">Pai/Mãe</option>
                    <option value="guardian">Responsável</option>
                    <option value="sibling">Irmão(ã)</option>
                    <option value="other">Outro</option>
                  </select>

                  <label className="family-primary">
                    <input
                      type="checkbox"
                      checked={familyMemberPrimary}
                      onChange={(event) => setFamilyMemberPrimary(event.target.checked)}
                    />
                    <span>Principal</span>
                  </label>

                  <Button type="button" variant="secondary" onClick={addFamilyMemberToForm}>
                    Adicionar
                  </Button>
                </div>

                <div className="catalog-list">
                  {familyForm.members.length === 0 ? (
                    <div className="catalog-empty">Nenhum membro vinculado ainda.</div>
                  ) : null}

                  {familyForm.members.map((item) => {
                    const member = clientData.members.find((row) => row.id === item.member_id);
                    return (
                      <div key={item.member_id} className="ministry-row">
                        <div className="family-row-content">
                          <strong>{member?.name ?? "Membro"}</strong>
                          <select
                            className="catalog-input"
                            value={item.relationship}
                            onChange={(event) => updateFamilyMember(item.member_id, { relationship: event.target.value })}
                          >
                            <option value="self">Titular</option>
                            <option value="spouse">Cônjuge</option>
                            <option value="child">Filho(a)</option>
                            <option value="parent">Pai/Mãe</option>
                            <option value="guardian">Responsável</option>
                            <option value="sibling">Irmão(ã)</option>
                            <option value="other">Outro</option>
                          </select>
                          <label className="ministry-admin">
                            <input
                              type="checkbox"
                              checked={item.is_primary}
                              onChange={(event) => updateFamilyMember(item.member_id, { is_primary: event.target.checked })}
                            />
                            <span>Principal</span>
                          </label>
                        </div>
                        <button type="button" onClick={() => removeFamilyMember(item.member_id)} aria-label="Remover">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {familySaveMessage ? <p className={`login-feedback ${familySaveStatus}`}>{familySaveMessage}</p> : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setIsFamilyFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={familySaveStatus === "loading"} icon={<CheckCircle2 size={18} />}>
                  {familySaveStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMemberFormOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cadastro de membro">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span>Membresia</span>
                <h2>{memberForm.id ? "Editar membro" : "Novo membro"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsMemberFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleMemberSubmit}>
              <TextField
                icon={<UsersRound size={18} />}
                label="Nome completo"
                placeholder="Nome do membro"
                type="text"
                value={memberForm.name}
                onChange={(event) => updateMemberForm("name", event.target.value)}
              />

              <div className="modal-grid">
                <TextField
                  icon={<Mail size={18} />}
                  label="E-mail"
                  placeholder="email@dominio.com"
                  type="email"
                  value={memberForm.email}
                  onChange={(event) => updateMemberForm("email", event.target.value)}
                />
                <TextField
                  icon={<Clock3 size={18} />}
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  type="text"
                  value={memberForm.phone}
                  onChange={(event) => updateMemberForm("phone", event.target.value)}
                />
              </div>

              <label>
                <span>Status</span>
                <select
                  className="catalog-input"
                  value={memberForm.status}
                  onChange={(event) => updateMemberForm("status", event.target.value as MemberFormState["status"])}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="visitor">Visitante</option>
                  <option value="in_process">Em processo</option>
                </select>
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Dados pessoais</strong>
                  <small>Informações de contato e cadastro (opcionais).</small>
                </div>

                <div className="modal-grid">
                  <label>
                    <span>Data de nascimento</span>
                    <input
                      className="catalog-input"
                      type="date"
                      value={memberForm.date_of_birth}
                      onChange={(event) => updateMemberForm("date_of_birth", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Documento</span>
                    <input
                      className="catalog-input"
                      placeholder="CPF/RG (opcional)"
                      value={memberForm.document_number}
                      onChange={(event) => updateMemberForm("document_number", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  <span>Endereço</span>
                  <input
                    className="catalog-input"
                    placeholder="Rua, número, bairro"
                    value={memberForm.address_line1}
                    onChange={(event) => updateMemberForm("address_line1", event.target.value)}
                  />
                </label>

                <div className="modal-grid">
                  <label>
                    <span>Cidade</span>
                    <input
                      className="catalog-input"
                      placeholder="Cidade"
                      value={memberForm.address_city}
                      onChange={(event) => updateMemberForm("address_city", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Estado</span>
                    <input
                      className="catalog-input"
                      placeholder="UF"
                      value={memberForm.address_state}
                      onChange={(event) => updateMemberForm("address_state", event.target.value)}
                    />
                  </label>
                </div>

                <label>
                  <span>CEP</span>
                  <input
                    className="catalog-input"
                    placeholder="00000-000"
                    value={memberForm.address_postal_code}
                    onChange={(event) => updateMemberForm("address_postal_code", event.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  placeholder="Anotações internas (opcional)"
                  value={memberForm.notes}
                  onChange={(event) => updateMemberForm("notes", event.target.value)}
                  rows={3}
                />
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Cargos</strong>
                  <small>Vínculos de função no tenant (base do sistema + lista do seu tenant).</small>
                </div>
                <div className="check-grid">
                  {clientData.catalogRoles.map((role) => (
                    <label key={role.id} className="check-row">
                      <input
                        type="checkbox"
                        checked={memberForm.roleIds.includes(role.id)}
                        onChange={() => toggleMemberRole(role.id)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Ministérios</strong>
                  <small>
                    Marque Admin para permitir acesso administrativo ao módulo do ministério quando existir.
                  </small>
                </div>

                <div className="catalog-add">
                  <select
                    className="catalog-input"
                    value={ministryPickerId}
                    onChange={(event) => setMinistryPickerId(event.target.value)}
                  >
                    <option value="">Selecionar ministério</option>
                    {clientData.catalogMinistries.map((ministry) => (
                      <option key={ministry.id} value={ministry.id}>
                        {ministry.name}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" onClick={() => addMemberMinistry(ministryPickerId)}>
                    Adicionar
                  </Button>
                </div>

                <div className="catalog-list">
                  {memberForm.ministries.length === 0 ? (
                    <div className="catalog-empty">Nenhum ministério vinculado ainda.</div>
                  ) : null}
                  {memberForm.ministries.map((item) => (
                    <div key={item.ministry_id} className="ministry-row">
                      <div>
                        <strong>{catalogMinistryNameById[item.ministry_id] ?? "Ministério"}</strong>
                        <label className="ministry-admin">
                          <input
                            type="checkbox"
                            checked={item.is_admin}
                            onChange={(event) => setMemberMinistryAdmin(item.ministry_id, event.target.checked)}
                          />
                          <span>Admin</span>
                        </label>
                      </div>
                      <button type="button" onClick={() => removeMemberMinistry(item.ministry_id)} aria-label="Remover">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {memberForm.id ? (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <strong>Histórico</strong>
                    <small>Registros internos para acompanhamento (ex.: batismo, integração, atendimento).</small>
                  </div>

                  {memberHistoryStatus === "loading" ? (
                    <div className="catalog-empty">Carregando histórico...</div>
                  ) : memberHistoryStatus === "error" ? (
                    <div className="catalog-empty">Não foi possível carregar o histórico.</div>
                  ) : memberHistory.length === 0 ? (
                    <div className="catalog-empty">Nenhum registro ainda.</div>
                  ) : (
                    <div className="catalog-list">
                      {memberHistory.map((item) => (
                        <div key={item.id} className="catalog-row system">
                          <span>
                            <strong>{item.event_type}</strong>{" "}
                            <small>{new Date(item.occurred_at).toLocaleDateString("pt-BR")}</small>
                          </span>
                          {item.notes ? <small>{item.notes}</small> : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="catalog-add">
                    <input
                      className="catalog-input"
                      placeholder="Tipo (ex.: Batismo, Integração, Atendimento)"
                      value={memberHistoryDraftType}
                      onChange={(event) => setMemberHistoryDraftType(event.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddMemberHistory}>
                      Adicionar
                    </Button>
                  </div>
                  <textarea
                    className="catalog-input catalog-textarea"
                    placeholder="Observações (opcional)"
                    value={memberHistoryDraftNotes}
                    onChange={(event) => setMemberHistoryDraftNotes(event.target.value)}
                    rows={2}
                  />
                </div>
              ) : null}

              {memberSaveMessage ? <p className={`login-feedback ${memberSaveStatus}`}>{memberSaveMessage}</p> : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setIsMemberFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={memberSaveStatus === "loading"} icon={<CheckCircle2 size={18} />}>
                  {memberSaveStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
