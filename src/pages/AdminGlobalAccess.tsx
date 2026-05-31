import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Edit3,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

type GlobalProfile = {
  global_role: "super_admin" | "operations" | "support" | null;
  status: "active" | "invited" | "suspended";
};

type TenantStatus = "active" | "suspended" | "configuring";
type TenantModuleStatus = "active" | "inactive" | "suspended" | "configuring";

type TenantRecord = {
  id: string;
  plan_id: string | null;
  name: string;
  slug: string;
  legal_name: string | null;
  document_number: string | null;
  contact_name: string | null;
  status: TenantStatus;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  created_at: string;
  plans: {
    name: string;
    code: string;
  } | null;
  tenant_modules: Array<{
    module_id: string;
    status: TenantModuleStatus;
    platform_modules: {
      name: string;
      code: string;
    } | null;
  }>;
  members_total?: number;
  members_active?: number;
};

type TenantMemberMetric = {
  tenant_id: string;
  total_members: number;
  active_members: number;
};

type TenantFeatureFlagRecord = {
  tenant_id: string;
  flag_key: string;
  enabled: boolean;
  payload: Record<string, unknown>;
};

type TenantFeatureFlagFormRow = {
  flag_key: string;
  enabled: boolean;
  payloadText: string;
};

type AuditLogRecord = {
  id: number;
  action: string;
  entity_type: string;
  created_at: string;
};

type PlanRecord = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthly_price_cents: number;
  status: PlanStatus;
  max_members: number | null;
  max_admins: number | null;
  sort_order: number;
};

type PlatformModuleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "beta" | "deprecated";
  icon_name: string | null;
  sort_order: number;
};

type TenantFormState = {
  id: string | null;
  name: string;
  slug: string;
  legal_name: string;
  document_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  plan_id: string;
  status: TenantStatus;
  primary_color: string;
  accent_color: string;
};

type ModuleConfigState = Record<string, TenantModuleStatus>;

type AdminDashboardData = {
  tenants: TenantRecord[];
  auditLogs: AuditLogRecord[];
  plans: PlanRecord[];
  modules: PlatformModuleRecord[];
  counts: {
    tenants: number;
    activeTenants: number;
    suspendedTenants: number;
    configuringTenants: number;
    plans: number;
    modules: number;
    membersTotal: number;
    membersActive: number;
  };
};

type AdminSection = "dashboard" | "clients" | "plans" | "modules";
type PlanStatus = "active" | "archived";

type PlanFormState = {
  id: string | null;
  name: string;
  code: string;
  description: string;
  monthly_price_cents: string;
  status: PlanStatus;
  max_members: string;
  max_admins: string;
  sort_order: string;
};

type PlatformModuleFormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  status: PlatformModuleRecord["status"];
  icon_name: string;
  sort_order: string;
};

const allowedGlobalRoles = new Set(["super_admin", "operations"]);

const statusLabels: Record<TenantStatus, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  configuring: "Em configuração",
};

const emptyTenantForm: TenantFormState = {
  id: null,
  name: "",
  slug: "",
  legal_name: "",
  document_number: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  plan_id: "",
  status: "configuring",
  primary_color: "#087C7A",
  accent_color: "#00A7C4",
};

const emptyPlanForm: PlanFormState = {
  id: null,
  name: "",
  code: "",
  description: "",
  monthly_price_cents: "0",
  status: "active",
  max_members: "",
  max_admins: "",
  sort_order: "0",
};

const emptyModuleForm: PlatformModuleFormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  status: "active",
  icon_name: "",
  sort_order: "0",
};

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminGlobalAccess() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [profile, setProfile] = useState<GlobalProfile | null>(null);
  const [dataStatus, setDataStatus] = useState<LoadStatus>("idle");
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [tenantForm, setTenantForm] = useState<TenantFormState>(emptyTenantForm);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [tenantSaveStatus, setTenantSaveStatus] = useState<LoginStatus>("idle");
  const [tenantSaveMessage, setTenantSaveMessage] = useState("");
  const [selectedModulesTenantId, setSelectedModulesTenantId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfigState>({});
  const [moduleSaveStatus, setModuleSaveStatus] = useState<LoginStatus>("idle");
  const [moduleSaveMessage, setModuleSaveMessage] = useState("");
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [planSaveStatus, setPlanSaveStatus] = useState<LoginStatus>("idle");
  const [planSaveMessage, setPlanSaveMessage] = useState("");
  const [moduleForm, setModuleForm] = useState<PlatformModuleFormState>(emptyModuleForm);
  const [isModuleFormOpen, setIsModuleFormOpen] = useState(false);
  const [catalogModuleSaveStatus, setCatalogModuleSaveStatus] = useState<LoginStatus>("idle");
  const [catalogModuleSaveMessage, setCatalogModuleSaveMessage] = useState("");

  const [tenantLogoUploadStatus, setTenantLogoUploadStatus] = useState<LoginStatus>("idle");
  const [tenantLogoUploadMessage, setTenantLogoUploadMessage] = useState("");

  const [tenantFeatureFlags, setTenantFeatureFlags] = useState<TenantFeatureFlagFormRow[]>([]);
  const [tenantFeatureFlagsStatus, setTenantFeatureFlagsStatus] = useState<LoadStatus>("idle");
  const [tenantFeatureFlagsSaveStatus, setTenantFeatureFlagsSaveStatus] = useState<LoginStatus>("idle");
  const [tenantFeatureFlagsMessage, setTenantFeatureFlagsMessage] = useState("");

  const [tenantAdminEmail, setTenantAdminEmail] = useState("");
  const [tenantAdminName, setTenantAdminName] = useState("");
  const [tenantAdminRole, setTenantAdminRole] = useState<"owner" | "admin">("owner");
  const [tenantAdminProvisionStatus, setTenantAdminProvisionStatus] = useState<LoginStatus>("idle");
  const [tenantAdminProvisionMessage, setTenantAdminProvisionMessage] = useState("");
  const [tenantAdminTemporaryPassword, setTenantAdminTemporaryPassword] = useState<string | null>(null);

  const selectedModulesTenant = useMemo(() => {
    if (!dashboardData || !selectedModulesTenantId) {
      return null;
    }

    return dashboardData.tenants.find((tenant) => tenant.id === selectedModulesTenantId) ?? null;
  }, [dashboardData, selectedModulesTenantId]);

  const selectedTenant = useMemo(() => {
    if (!dashboardData || !selectedTenantId) {
      return null;
    }

    return dashboardData.tenants.find((tenant) => tenant.id === selectedTenantId) ?? null;
  }, [dashboardData, selectedTenantId]);

  const filteredTenants = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();

    return dashboardData.tenants.filter((tenant) => {
      if (statusFilter !== "all" && tenant.status !== statusFilter) {
        return false;
      }

      if (planFilter !== "all" && tenant.plan_id !== planFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        tenant.name,
        tenant.slug,
        tenant.contact_email ?? "",
        tenant.plans?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [dashboardData, searchTerm, statusFilter, planFilter]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        return;
      }

      const authorizedProfile = await getAuthorizedProfile(data.user.id);

      if (authorizedProfile) {
        setProfile(authorizedProfile);
        setLoginStatus("success");
        void loadDashboardData();
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      setTenantFeatureFlags([]);
      setTenantFeatureFlagsStatus("idle");
      setTenantFeatureFlagsSaveStatus("idle");
      setTenantFeatureFlagsMessage("");
      setTenantAdminTemporaryPassword(null);
      setTenantAdminProvisionStatus("idle");
      setTenantAdminProvisionMessage("");
      setTenantLogoUploadStatus("idle");
      setTenantLogoUploadMessage("");
      return;
    }

    void loadTenantFeatureFlags(selectedTenantId);
  }, [selectedTenantId]);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setLoginStatus("loading");
    setLoginMessage("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoginStatus("error");
      setLoginMessage("Acesso negado. Confira e-mail, senha e liberação do usuário global.");
      return;
    }

    const authorizedProfile = await getAuthorizedProfile(authData.user.id);

    if (!authorizedProfile) {
      await supabase.auth.signOut();
      setLoginStatus("error");
      setLoginMessage("Usuário autenticado, mas sem permissão para o Admin Global.");
      return;
    }

    setProfile(authorizedProfile);
    setLoginStatus("success");
    setLoginMessage("");
    await loadDashboardData();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setDashboardData(null);
    setLoginStatus("idle");
  }

  async function getAuthorizedProfile(userId: string) {
    const { data: userProfile, error } = await supabase
      .from("profiles")
      .select("global_role, status")
      .eq("id", userId)
      .single<GlobalProfile>();

    if (
      error ||
      !userProfile ||
      userProfile.status !== "active" ||
      !userProfile.global_role ||
      !allowedGlobalRoles.has(userProfile.global_role)
    ) {
      return null;
    }

    return userProfile;
  }

  async function getTableCount(table: "tenants" | "plans" | "platform_modules") {
    const { count, error } = await supabase.from(table).select("id", {
      count: "exact",
      head: true,
    });

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async function getTenantStatusCount(status: TenantStatus) {
    const { count, error } = await supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("status", status);

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  async function loadDashboardData() {
    setDataStatus("loading");

    const [
      tenantsResult,
      auditLogsResult,
      plansResult,
      modulesResult,
      tenantCount,
      activeTenants,
      suspendedTenants,
      configuringTenants,
      plansCount,
      modulesCount,
    ] = await Promise.all([
      supabase
        .from("tenants")
        .select(
          `
            id,
            plan_id,
            name,
            slug,
            legal_name,
            document_number,
            contact_name,
            status,
            contact_email,
            contact_phone,
            logo_url,
            primary_color,
            accent_color,
            created_at,
            plans (name, code),
            tenant_modules (
              module_id,
              status,
              platform_modules (name, code)
            )
          `,
        )
        .order("created_at", { ascending: false })
        .limit(25)
        .returns<TenantRecord[]>(),
      supabase
        .from("audit_logs")
        .select("id, action, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<AuditLogRecord[]>(),
      supabase
        .from("plans")
        .select(
          "id, name, code, description, monthly_price_cents, status, max_members, max_admins, sort_order"
        )
        .order("sort_order", { ascending: true })
        .returns<PlanRecord[]>(),
      supabase
        .from("platform_modules")
        .select("id, code, name, description, status, icon_name, sort_order")
        .order("sort_order", { ascending: true })
        .returns<PlatformModuleRecord[]>(),
      getTableCount("tenants"),
      getTenantStatusCount("active"),
      getTenantStatusCount("suspended"),
      getTenantStatusCount("configuring"),
      getTableCount("plans"),
      getTableCount("platform_modules"),
    ]);

    if (tenantsResult.error || auditLogsResult.error || plansResult.error || modulesResult.error) {
      setDataStatus("error");
      return;
    }

    const tenants = tenantsResult.data ?? [];
    const tenantIds = tenants.map((tenant) => tenant.id);

    const tenantMetricsResult = tenantIds.length
      ? await supabase
          .from("tenant_member_metrics")
          .select("tenant_id, total_members, active_members")
          .in("tenant_id", tenantIds)
          .returns<TenantMemberMetric[]>()
      : { data: [], error: null };

    if (tenantMetricsResult.error) {
      setDataStatus("error");
      return;
    }

    const metricByTenantId = (tenantMetricsResult.data ?? []).reduce<Record<string, TenantMemberMetric>>(
      (acc, row) => {
        acc[row.tenant_id] = row;
        return acc;
      },
      {},
    );

    const tenantsWithMetrics = tenants.map((tenant) => {
      const metric = metricByTenantId[tenant.id];
      return {
        ...tenant,
        members_total: metric?.total_members ?? 0,
        members_active: metric?.active_members ?? 0,
      };
    });

    const membersTotal = tenantsWithMetrics.reduce((sum, tenant) => sum + (tenant.members_total ?? 0), 0);
    const membersActive = tenantsWithMetrics.reduce((sum, tenant) => sum + (tenant.members_active ?? 0), 0);

    setDashboardData({
      tenants: tenantsWithMetrics,
      auditLogs: auditLogsResult.data ?? [],
      plans: plansResult.data ?? [],
      modules: modulesResult.data ?? [],
      counts: {
        tenants: tenantCount,
        activeTenants,
        suspendedTenants,
        configuringTenants,
        plans: plansCount,
        modules: modulesCount,
        membersTotal,
        membersActive,
      },
    });
    setDataStatus("ready");
  }

  function openCreateTenantForm() {
    setTenantForm(emptyTenantForm);
    setTenantSaveStatus("idle");
    setTenantSaveMessage("");
    setIsTenantFormOpen(true);
  }

  function openEditTenantForm(tenant: TenantRecord) {
    setTenantForm({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      legal_name: tenant.legal_name ?? "",
      document_number: tenant.document_number ?? "",
      contact_name: tenant.contact_name ?? "",
      contact_email: tenant.contact_email ?? "",
      contact_phone: tenant.contact_phone ?? "",
      plan_id: tenant.plan_id ?? "",
      status: tenant.status,
      primary_color: tenant.primary_color,
      accent_color: tenant.accent_color,
    });
    setTenantSaveStatus("idle");
    setTenantSaveMessage("");
    setIsTenantFormOpen(true);
  }

  function updateTenantForm(field: keyof TenantFormState, value: string) {
    setTenantForm((current) => {
      if (field === "name" && !current.id) {
        return {
          ...current,
          name: value,
          slug: current.slug ? current.slug : createSlug(value),
        };
      }

      if (field === "slug") {
        return {
          ...current,
          slug: createSlug(value),
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function openCreatePlanForm() {
    setPlanForm(emptyPlanForm);
    setPlanSaveStatus("idle");
    setPlanSaveMessage("");
    setIsPlanFormOpen(true);
  }

  function openEditPlanForm(plan: PlanRecord) {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description ?? "",
      monthly_price_cents: String(plan.monthly_price_cents ?? 0),
      status: plan.status,
      max_members: plan.max_members ? String(plan.max_members) : "",
      max_admins: plan.max_admins ? String(plan.max_admins) : "",
      sort_order: String(plan.sort_order ?? 0),
    });
    setPlanSaveStatus("idle");
    setPlanSaveMessage("");
    setIsPlanFormOpen(true);
  }

  function updatePlanForm(field: keyof PlanFormState, value: string) {
    setPlanForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanSaveStatus("loading");
    setPlanSaveMessage("");

    if (!planForm.name.trim() || !planForm.code.trim()) {
      setPlanSaveStatus("error");
      setPlanSaveMessage("Informe nome e código do plano.");
      return;
    }

    const payload = {
      name: planForm.name.trim(),
      code: planForm.code.trim(),
      description: planForm.description.trim() || null,
      monthly_price_cents: Number(planForm.monthly_price_cents) || 0,
      status: planForm.status,
      max_members: planForm.max_members ? Number(planForm.max_members) : null,
      max_admins: planForm.max_admins ? Number(planForm.max_admins) : null,
      sort_order: Number(planForm.sort_order) || 0,
    };

    const planResult = planForm.id
      ? await supabase.from("plans").update(payload).eq("id", planForm.id).select("id").single()
      : await supabase.from("plans").insert(payload).select("id").single();

    if (planResult.error) {
      setPlanSaveStatus("error");
      setPlanSaveMessage("Não foi possível salvar o plano. Verifique dados e código.");
      return;
    }

    setPlanSaveStatus("success");
    setPlanSaveMessage(planForm.id ? "Plano atualizado." : "Plano criado.");
    setIsPlanFormOpen(false);
    setPlanForm(emptyPlanForm);
    await loadDashboardData();
  }

  function openCreateModuleForm() {
    setModuleForm(emptyModuleForm);
    setCatalogModuleSaveStatus("idle");
    setCatalogModuleSaveMessage("");
    setIsModuleFormOpen(true);
  }

  function openEditModuleForm(module: PlatformModuleRecord) {
    setModuleForm({
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description ?? "",
      status: module.status,
      icon_name: module.icon_name ?? "",
      sort_order: String(module.sort_order ?? 0),
    });
    setCatalogModuleSaveStatus("idle");
    setCatalogModuleSaveMessage("");
    setIsModuleFormOpen(true);
  }

  function updateModuleForm(field: keyof PlatformModuleFormState, value: string) {
    setModuleForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleModuleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCatalogModuleSaveStatus("loading");
    setCatalogModuleSaveMessage("");

    if (!moduleForm.name.trim() || !moduleForm.code.trim()) {
      setCatalogModuleSaveStatus("error");
      setCatalogModuleSaveMessage("Informe nome e código do módulo.");
      return;
    }

    const payload = {
      code: moduleForm.code.trim(),
      name: moduleForm.name.trim(),
      description: moduleForm.description.trim() || null,
      status: moduleForm.status,
      icon_name: moduleForm.icon_name.trim() || null,
      sort_order: Number(moduleForm.sort_order) || 0,
    };

    const moduleResult = moduleForm.id
      ? await supabase
          .from("platform_modules")
          .update(payload)
          .eq("id", moduleForm.id)
          .select("id")
          .single()
      : await supabase.from("platform_modules").insert(payload).select("id").single();

    if (moduleResult.error) {
      setCatalogModuleSaveStatus("error");
      setCatalogModuleSaveMessage("Não foi possível salvar o módulo. Verifique os dados.");
      return;
    }

    setCatalogModuleSaveStatus("success");
    setCatalogModuleSaveMessage(moduleForm.id ? "Módulo atualizado." : "Módulo criado.");
    setIsModuleFormOpen(false);
    setModuleForm(emptyModuleForm);
    await loadDashboardData();
  }

  async function handleTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTenantSaveStatus("loading");
    setTenantSaveMessage("");

    const payload = {
      name: tenantForm.name.trim(),
      slug: createSlug(tenantForm.slug || tenantForm.name),
      legal_name: tenantForm.legal_name.trim() || null,
      document_number: tenantForm.document_number.trim() || null,
      contact_name: tenantForm.contact_name.trim() || null,
      contact_email: tenantForm.contact_email.trim() || null,
      contact_phone: tenantForm.contact_phone.trim() || null,
      plan_id: tenantForm.plan_id || null,
      status: tenantForm.status,
      primary_color: tenantForm.primary_color,
      accent_color: tenantForm.accent_color,
    };

    if (!payload.name || !payload.slug) {
      setTenantSaveStatus("error");
      setTenantSaveMessage("Informe nome e slug do tenant.");
      return;
    }

    const tenantResult = tenantForm.id
      ? await supabase.from("tenants").update(payload).eq("id", tenantForm.id).select("id").single()
      : await supabase.from("tenants").insert(payload).select("id").single();

    if (tenantResult.error) {
      setTenantSaveStatus("error");
      setTenantSaveMessage("Não foi possível salvar o tenant. Verifique slug, permissões e dados.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      tenant_id: tenantResult.data.id,
      actor_user_id: userData.user?.id ?? null,
      action: tenantForm.id ? "tenant.updated" : "tenant.created",
      entity_type: "tenant",
      entity_id: tenantResult.data.id,
      metadata: {
        name: payload.name,
        status: payload.status,
      },
    });

    setTenantSaveStatus("success");
    setTenantSaveMessage(tenantForm.id ? "Tenant atualizado." : "Tenant criado.");
    setIsTenantFormOpen(false);
    setTenantForm(emptyTenantForm);
    await loadDashboardData();
  }

  async function loadTenantFeatureFlags(tenantId: string) {
    setTenantFeatureFlagsStatus("loading");
    setTenantFeatureFlagsMessage("");

    const { data, error } = await supabase
      .from("tenant_feature_flags")
      .select("tenant_id, flag_key, enabled, payload")
      .eq("tenant_id", tenantId)
      .order("flag_key", { ascending: true })
      .returns<TenantFeatureFlagRecord[]>();

    if (error) {
      setTenantFeatureFlagsStatus("error");
      setTenantFeatureFlagsMessage("Não foi possível carregar as configurações do tenant.");
      return;
    }

    setTenantFeatureFlags(
      (data ?? []).map((row) => ({
        flag_key: row.flag_key,
        enabled: row.enabled,
        payloadText: JSON.stringify(row.payload ?? {}, null, 2),
      })),
    );
    setTenantFeatureFlagsStatus("ready");
  }

  function updateFeatureFlagRow(index: number, field: keyof TenantFeatureFlagFormRow, value: string | boolean) {
    setTenantFeatureFlags((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function addFeatureFlagRow() {
    setTenantFeatureFlags((current) => [
      ...current,
      {
        flag_key: "",
        enabled: false,
        payloadText: "{}",
      },
    ]);
  }

  function removeFeatureFlagRow(index: number) {
    setTenantFeatureFlags((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSaveFeatureFlags() {
    if (!selectedTenantId) {
      return;
    }

    setTenantFeatureFlagsSaveStatus("loading");
    setTenantFeatureFlagsMessage("");

    const rowsToPersist: Array<{ tenant_id: string; flag_key: string; enabled: boolean; payload: unknown }> = [];

    for (const row of tenantFeatureFlags) {
      const flagKey = row.flag_key.trim();
      if (!flagKey) {
        continue;
      }

      try {
        const parsed = row.payloadText?.trim() ? JSON.parse(row.payloadText) : {};
        rowsToPersist.push({
          tenant_id: selectedTenantId,
          flag_key: flagKey,
          enabled: row.enabled,
          payload: parsed ?? {},
        });
      } catch {
        setTenantFeatureFlagsSaveStatus("error");
        setTenantFeatureFlagsMessage(`Payload inválido no flag "${flagKey}". Use JSON válido.`);
        return;
      }
    }

    const { error } = await supabase.from("tenant_feature_flags").upsert(rowsToPersist, {
      onConflict: "tenant_id,flag_key",
    });

    if (error) {
      setTenantFeatureFlagsSaveStatus("error");
      setTenantFeatureFlagsMessage("Não foi possível salvar as configurações do tenant.");
      return;
    }

    setTenantFeatureFlagsSaveStatus("success");
    setTenantFeatureFlagsMessage("Configurações atualizadas.");
    await loadTenantFeatureFlags(selectedTenantId);
  }

  async function handleTenantLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedTenantId) {
      return;
    }

    setTenantLogoUploadStatus("loading");
    setTenantLogoUploadMessage("");

    const filePath = `tenant-logos/${selectedTenantId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("tenant-logos").upload(filePath, file, {
      upsert: true,
    });

    if (uploadError) {
      setTenantLogoUploadStatus("error");
      const details = uploadError.message ? ` Detalhes: ${uploadError.message}` : "";
      setTenantLogoUploadMessage(
        `Falha ao enviar logo. Verifique se o bucket \`tenant-logos\` existe e se há políticas de acesso para upload.${details}`,
      );
      return;
    }

    const { data } = supabase.storage.from("tenant-logos").getPublicUrl(filePath);
    if (!data.publicUrl) {
      setTenantLogoUploadStatus("error");
      setTenantLogoUploadMessage("Logo enviada, mas não foi possível obter a URL pública.");
      return;
    }

    const { error: tenantUpdateError } = await supabase
      .from("tenants")
      .update({ logo_url: data.publicUrl })
      .eq("id", selectedTenantId);

    if (tenantUpdateError) {
      setTenantLogoUploadStatus("error");
      const details = tenantUpdateError.message ? ` Detalhes: ${tenantUpdateError.message}` : "";
      setTenantLogoUploadMessage(
        `Logo enviada, mas não foi possível atualizar o cadastro do tenant.${details}`,
      );
      return;
    }

    setTenantLogoUploadStatus("success");
    setTenantLogoUploadMessage("Logo enviada com sucesso.");
    await loadDashboardData();
  }

  async function handleRemoveTenantLogo() {
    if (!selectedTenantId) {
      return;
    }

    setTenantLogoUploadStatus("loading");
    setTenantLogoUploadMessage("");

    const { error } = await supabase.from("tenants").update({ logo_url: null }).eq("id", selectedTenantId);
    if (error) {
      setTenantLogoUploadStatus("error");
      setTenantLogoUploadMessage("Não foi possível remover a logo deste tenant.");
      return;
    }

    setTenantLogoUploadStatus("success");
    setTenantLogoUploadMessage("Logo removida.");
    await loadDashboardData();
  }

  async function handleToggleTenantStatus() {
    if (!selectedTenantId || !selectedTenant) {
      return;
    }

    const nextStatus: TenantStatus = selectedTenant.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("tenants").update({ status: nextStatus }).eq("id", selectedTenantId);

    if (error) {
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      tenant_id: selectedTenantId,
      actor_user_id: userData.user?.id ?? null,
      action: "tenant.status.updated",
      entity_type: "tenant",
      entity_id: selectedTenantId,
      metadata: {
        from: selectedTenant.status,
        to: nextStatus,
      },
    });

    await loadDashboardData();
  }

  async function handleProvisionTenantAdmin(action: "create" | "reset") {
    if (!selectedTenantId) {
      return;
    }

    setTenantAdminProvisionStatus("loading");
    setTenantAdminProvisionMessage("");
    setTenantAdminTemporaryPassword(null);

    const email = tenantAdminEmail.trim().toLowerCase();
    if (!email) {
      setTenantAdminProvisionStatus("error");
      setTenantAdminProvisionMessage("Informe o e-mail do admin do tenant.");
      return;
    }

    const { data, error } = await supabase.functions.invoke("provision-tenant-admin", {
      body: {
        tenant_id: selectedTenantId,
        email,
        full_name: tenantAdminName.trim() || null,
        role: tenantAdminRole,
        action,
      },
    });

    if (error || !data?.temporary_password) {
      setTenantAdminProvisionStatus("error");
      const functionErrorMessage = error?.message ? ` Detalhes: ${error.message}` : "";
      const apiErrorMessage =
        !error && data?.error ? ` Detalhes: ${String(data.error)}` : "";
      setTenantAdminProvisionMessage(
        `Não foi possível provisionar o acesso. Verifique permissões, e-mail e configuração da função.${functionErrorMessage}${apiErrorMessage}`,
      );
      return;
    }

    setTenantAdminProvisionStatus("success");
    setTenantAdminProvisionMessage(
      action === "reset" ? "Senha resetada. Envie a senha temporária ao cliente." : "Acesso criado. Envie a senha temporária ao cliente.",
    );
    setTenantAdminTemporaryPassword(String(data.temporary_password));
  }

  function openModulesPanel(tenant: TenantRecord) {
    const currentConfig = tenant.tenant_modules.reduce<ModuleConfigState>((config, module) => {
      config[module.module_id] = module.status;
      return config;
    }, {});

    setSelectedModulesTenantId(tenant.id);
    setModuleConfig(currentConfig);
    setModuleSaveStatus("idle");
    setModuleSaveMessage("");
  }

  function openTenantDetailPanel(tenant: TenantRecord) {
    setSelectedTenantId(tenant.id);
    setSelectedModulesTenantId(tenant.id);
  }

  function clearTenantSelection() {
    setSelectedTenantId(null);
  }

  function updateModuleStatus(moduleId: string, status: TenantModuleStatus) {
    setModuleConfig((current) => ({
      ...current,
      [moduleId]: status,
    }));
  }

  async function handleModulesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedModulesTenant || !dashboardData) {
      return;
    }

    setModuleSaveStatus("loading");
    setModuleSaveMessage("");

    const now = new Date().toISOString();
    const rows = dashboardData.modules.map((module) => {
      const status = moduleConfig[module.id] ?? "inactive";

      return {
        tenant_id: selectedModulesTenant.id,
        module_id: module.id,
        status,
        enabled_at: status === "active" ? now : null,
        configured_at: status === "configuring" || status === "active" ? now : null,
      };
    });

    const { error } = await supabase.from("tenant_modules").upsert(rows, {
      onConflict: "tenant_id,module_id",
    });

    if (error) {
      setModuleSaveStatus("error");
      setModuleSaveMessage("Não foi possível salvar os módulos deste tenant.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      tenant_id: selectedModulesTenant.id,
      actor_user_id: userData.user?.id ?? null,
      action: "tenant.modules.updated",
      entity_type: "tenant_modules",
      entity_id: selectedModulesTenant.id,
      metadata: {
        tenant: selectedModulesTenant.name,
        active_modules: rows.filter((row) => row.status === "active").length,
      },
    });

    setModuleSaveStatus("success");
    setModuleSaveMessage("Módulos atualizados.");
    await loadDashboardData();
  }

  if (profile) {
    return (
      <main className="global-admin-page">
        <aside className="global-admin-sidebar" aria-label="Navegação do Admin Global">
          <a className="global-admin-logo" href="/" aria-label="SirvaOS">
            <img src="/img/icon-sirvaos.svg" alt="" />
            <span>SirvaOS</span>
          </a>

          <nav>
            <button
              className={activeSection === "dashboard" ? "active" : undefined}
              type="button"
              onClick={() => setActiveSection("dashboard")}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              className={activeSection === "clients" ? "active" : undefined}
              type="button"
              onClick={() => setActiveSection("clients")}
            >
              <Building2 size={18} />
              Clientes
            </button>
            <button
              className={activeSection === "modules" ? "active" : undefined}
              type="button"
              onClick={() => setActiveSection("modules")}
            >
              <PackageCheck size={18} />
              Catálogo
            </button>
            <button
              className={activeSection === "plans" ? "active" : undefined}
              type="button"
              onClick={() => setActiveSection("plans")}
            >
              <ShieldCheck size={18} />
              Planos
            </button>
          </nav>

          <button className="global-admin-logout" type="button" onClick={handleSignOut}>
            <LogOut size={18} />
            Sair
          </button>
        </aside>

        <section className="global-admin-content">
          <header className="global-admin-header">
            <div>
              <span>Etapa 2 · Admin Global SirvaOS</span>
              <h1>
                {activeSection === "dashboard" && "Visão geral"}
                {activeSection === "clients" && "Clientes / Tenants"}
                {activeSection === "plans" && "Gestão de planos"}
                {activeSection === "modules" && "Catálogo global de módulos"}
              </h1>
              <p>
                {activeSection === "dashboard" && "Acompanhe saúde do SaaS, auditoria e métricas do Admin Global."}
                {activeSection === "clients" && "Gerencie clientes, contratos e ativação de módulos por tenant."}
                {activeSection === "plans" && "Crie e mantenha o catálogo de planos comerciais do SirvaOS."}
                {activeSection === "modules" && "Configure o catálogo global de módulos e seus metadados."}
              </p>
            </div>
            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                if (activeSection === "clients") {
                  openCreateTenantForm();
                } else if (activeSection === "plans") {
                  openCreatePlanForm();
                } else if (activeSection === "modules") {
                  openCreateModuleForm();
                } else {
                  setActiveSection("clients");
                }
              }}
            >
              {activeSection === "clients"
                ? "Novo tenant"
                : activeSection === "plans"
                ? "Novo plano"
                : activeSection === "modules"
                ? "Novo módulo"
                : "Ver clientes"}
            </Button>
          </header>

          {dataStatus === "loading" ? (
            <div className="admin-state-panel">
              <CircleDashed size={22} />
              <strong>Carregando dados globais...</strong>
            </div>
          ) : null}

          {dataStatus === "error" ? (
            <div className="admin-state-panel error">
              <Bell size={22} />
              <strong>Não foi possível carregar os dados do Admin Global.</strong>
            </div>
          ) : null}

          {dashboardData ? (
            <>
              {activeSection === "clients" && isTenantFormOpen ? (
                <section className="global-panel tenant-form-panel" aria-label="Cadastro de tenant">
                  <div className="global-panel-heading">
                    <div>
                      <span>{tenantForm.id ? "Editar tenant" : "Novo tenant"}</span>
                      <h2>{tenantForm.id ? tenantForm.name : "Cadastrar igreja cliente"}</h2>
                    </div>
                    <button
                      className="panel-icon-button"
                      type="button"
                      aria-label="Fechar formulário"
                      onClick={() => setIsTenantFormOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form className="tenant-form" onSubmit={handleTenantSubmit}>
                    <label>
                      <span>Nome da igreja</span>
                      <input
                        value={tenantForm.name}
                        onChange={(event) => updateTenantForm("name", event.target.value)}
                        placeholder="Primeira Igreja"
                      />
                    </label>
                    <label>
                      <span>Slug</span>
                      <input
                        value={tenantForm.slug}
                        onChange={(event) => updateTenantForm("slug", event.target.value)}
                        placeholder="primeira-igreja"
                      />
                    </label>
                    <label>
                      <span>Razão social</span>
                      <input
                        value={tenantForm.legal_name}
                        onChange={(event) => updateTenantForm("legal_name", event.target.value)}
                        placeholder="Nome jurídico, se houver"
                      />
                    </label>
                    <label>
                      <span>Documento</span>
                      <input
                        value={tenantForm.document_number}
                        onChange={(event) =>
                          updateTenantForm("document_number", event.target.value)
                        }
                        placeholder="CNPJ ou documento"
                      />
                    </label>
                    <label>
                      <span>Contato</span>
                      <input
                        value={tenantForm.contact_name}
                        onChange={(event) => updateTenantForm("contact_name", event.target.value)}
                        placeholder="Responsável"
                      />
                    </label>
                    <label>
                      <span>E-mail</span>
                      <input
                        value={tenantForm.contact_email}
                        onChange={(event) => updateTenantForm("contact_email", event.target.value)}
                        placeholder="contato@igreja.org"
                        type="email"
                      />
                    </label>
                    <label>
                      <span>Telefone</span>
                      <input
                        value={tenantForm.contact_phone}
                        onChange={(event) => updateTenantForm("contact_phone", event.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </label>
                    <label>
                      <span>Plano</span>
                      <select
                        value={tenantForm.plan_id}
                        onChange={(event) => updateTenantForm("plan_id", event.target.value)}
                      >
                        <option value="">Sem plano</option>
                        {dashboardData.plans
                          .filter((plan) => plan.status === "active")
                          .map((plan) => (
                            <option value={plan.id} key={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={tenantForm.status}
                        onChange={(event) =>
                          updateTenantForm("status", event.target.value as TenantStatus)
                        }
                      >
                        <option value="configuring">Em configuração</option>
                        <option value="active">Ativo</option>
                        <option value="suspended">Suspenso</option>
                      </select>
                    </label>
                    <label>
                      <span>Cor primária</span>
                      <input
                        value={tenantForm.primary_color}
                        onChange={(event) => updateTenantForm("primary_color", event.target.value)}
                        type="color"
                      />
                    </label>
                    <label>
                      <span>Cor de destaque</span>
                      <input
                        value={tenantForm.accent_color}
                        onChange={(event) => updateTenantForm("accent_color", event.target.value)}
                        type="color"
                      />
                    </label>

                    <div className="tenant-theme-sample">
                      <span
                        style={{
                          background: tenantForm.primary_color,
                        }}
                      />
                      <span
                        style={{
                          background: tenantForm.accent_color,
                        }}
                      />
                      <strong>{tenantForm.name || "Preview do tenant"}</strong>
                    </div>

                    {tenantSaveMessage ? (
                      <p className={`login-feedback ${tenantSaveStatus}`}>
                        {tenantSaveMessage}
                      </p>
                    ) : null}

                    <div className="tenant-form-actions">
                      <Button
                        type="submit"
                        disabled={tenantSaveStatus === "loading"}
                        icon={<ArrowRight size={18} />}
                      >
                        {tenantSaveStatus === "loading" ? "Salvando..." : "Salvar tenant"}
                      </Button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => setIsTenantFormOpen(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {activeSection === "plans" && isPlanFormOpen ? (
                <section className="global-panel tenant-form-panel" aria-label="Cadastro de plano">
                  <div className="global-panel-heading">
                    <div>
                      <span>{planForm.id ? "Editar plano" : "Novo plano"}</span>
                      <h2>{planForm.id ? planForm.name : "Cadastrar plano comercial"}</h2>
                    </div>
                    <button
                      className="panel-icon-button"
                      type="button"
                      aria-label="Fechar formulário de plano"
                      onClick={() => setIsPlanFormOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form className="tenant-form" onSubmit={handlePlanSubmit}>
                    <label>
                      <span>Nome do plano</span>
                      <input
                        value={planForm.name}
                        onChange={(event) => updatePlanForm("name", event.target.value)}
                        placeholder="Plano Básico"
                      />
                    </label>
                    <label>
                      <span>Código</span>
                      <input
                        value={planForm.code}
                        onChange={(event) => updatePlanForm("code", event.target.value)}
                        placeholder="plano-basico"
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <input
                        value={planForm.description}
                        onChange={(event) => updatePlanForm("description", event.target.value)}
                        placeholder="Módulos essenciais para igrejas pequenas"
                      />
                    </label>
                    <label>
                      <span>Preço mensal (R$)</span>
                      <input
                        value={planForm.monthly_price_cents}
                        onChange={(event) => updatePlanForm("monthly_price_cents", event.target.value)}
                        placeholder="9900"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={planForm.status}
                        onChange={(event) => updatePlanForm("status", event.target.value)}
                      >
                        <option value="active">Ativo</option>
                        <option value="archived">Arquivado</option>
                      </select>
                    </label>
                    <label>
                      <span>Máx. membros</span>
                      <input
                        value={planForm.max_members}
                        onChange={(event) => updatePlanForm("max_members", event.target.value)}
                        placeholder="1000"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      <span>Máx. admins</span>
                      <input
                        value={planForm.max_admins}
                        onChange={(event) => updatePlanForm("max_admins", event.target.value)}
                        placeholder="5"
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      <span>Ordem</span>
                      <input
                        value={planForm.sort_order}
                        onChange={(event) => updatePlanForm("sort_order", event.target.value)}
                        placeholder="0"
                        type="number"
                        min="0"
                      />
                    </label>

                    {planSaveMessage ? (
                      <p className={`login-feedback ${planSaveStatus}`}>
                        {planSaveMessage}
                      </p>
                    ) : null}

                    <div className="tenant-form-actions">
                      <Button
                        type="submit"
                        disabled={planSaveStatus === "loading"}
                        icon={<ArrowRight size={18} />}
                      >
                        {planSaveStatus === "loading" ? "Salvando..." : "Salvar plano"}
                      </Button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => setIsPlanFormOpen(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {activeSection === "modules" && isModuleFormOpen ? (
                <section className="global-panel tenant-form-panel" aria-label="Cadastro de módulo">
                  <div className="global-panel-heading">
                    <div>
                      <span>{moduleForm.id ? "Editar módulo" : "Novo módulo"}</span>
                      <h2>{moduleForm.id ? moduleForm.name : "Cadastrar módulo do catálogo"}</h2>
                    </div>
                    <button
                      className="panel-icon-button"
                      type="button"
                      aria-label="Fechar formulário de módulo"
                      onClick={() => setIsModuleFormOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form className="tenant-form" onSubmit={handleModuleFormSubmit}>
                    <label>
                      <span>Nome do módulo</span>
                      <input
                        value={moduleForm.name}
                        onChange={(event) => updateModuleForm("name", event.target.value)}
                        placeholder="Módulo de Louvor"
                      />
                    </label>
                    <label>
                      <span>Código</span>
                      <input
                        value={moduleForm.code}
                        onChange={(event) => updateModuleForm("code", event.target.value)}
                        placeholder="modulo-louvor"
                      />
                    </label>
                    <label>
                      <span>Descrição</span>
                      <input
                        value={moduleForm.description}
                        onChange={(event) => updateModuleForm("description", event.target.value)}
                        placeholder="Gerencia escalas, integrantes e eventos de louvor"
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={moduleForm.status}
                        onChange={(event) => updateModuleForm("status", event.target.value)}
                      >
                        <option value="active">Ativo</option>
                        <option value="beta">Beta</option>
                        <option value="deprecated">Depreciado</option>
                      </select>
                    </label>
                    <label>
                      <span>Ícone</span>
                      <input
                        value={moduleForm.icon_name}
                        onChange={(event) => updateModuleForm("icon_name", event.target.value)}
                        placeholder="music-note"
                      />
                    </label>
                    <label>
                      <span>Ordem</span>
                      <input
                        value={moduleForm.sort_order}
                        onChange={(event) => updateModuleForm("sort_order", event.target.value)}
                        placeholder="0"
                        type="number"
                        min="0"
                      />
                    </label>

                    {catalogModuleSaveMessage ? (
                      <p className={`login-feedback ${catalogModuleSaveStatus}`}>
                        {catalogModuleSaveMessage}
                      </p>
                    ) : null}

                    <div className="tenant-form-actions">
                      <Button
                        type="submit"
                        disabled={catalogModuleSaveStatus === "loading"}
                        icon={<ArrowRight size={18} />}
                      >
                        {catalogModuleSaveStatus === "loading" ? "Salvando..." : "Salvar módulo"}
                      </Button>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => setIsModuleFormOpen(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {activeSection === "clients" && selectedModulesTenant ? (
                <section
                  className="global-panel tenant-modules-panel"
                  aria-label="Ativação de módulos por tenant"
                >
                  <div className="global-panel-heading">
                    <div>
                      <span>Módulos por tenant</span>
                      <h2>{selectedModulesTenant.name}</h2>
                    </div>
                    <button
                      className="panel-icon-button"
                      type="button"
                      aria-label="Fechar módulos"
                      onClick={() => setSelectedModulesTenantId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form className="tenant-modules-form" onSubmit={handleModulesSubmit}>
                    {dashboardData.modules.map((module) => (
                      <article key={module.id} className="tenant-module-card">
                        <div>
                          <span>{module.status === "beta" ? "Beta" : "Catálogo"}</span>
                          <strong>{module.name}</strong>
                          <small>{module.description ?? module.code}</small>
                        </div>
                        <select
                          value={moduleConfig[module.id] ?? "inactive"}
                          onChange={(event) =>
                            updateModuleStatus(module.id, event.target.value as TenantModuleStatus)
                          }
                        >
                          <option value="inactive">Inativo</option>
                          <option value="configuring">Em configuração</option>
                          <option value="active">Ativo</option>
                          <option value="suspended">Suspenso</option>
                        </select>
                      </article>
                    ))}

                    {moduleSaveMessage ? (
                      <p className={`login-feedback ${moduleSaveStatus}`}>{moduleSaveMessage}</p>
                    ) : null}

                    <div className="tenant-form-actions">
                      <Button
                        type="submit"
                        disabled={moduleSaveStatus === "loading"}
                        icon={<ArrowRight size={18} />}
                      >
                        {moduleSaveStatus === "loading" ? "Salvando..." : "Salvar módulos"}
                      </Button>
                    </div>
                  </form>
                </section>
              ) : null}

              <div className="global-stats">
                <article>
                  <Building2 size={20} />
                  <span>Total de clientes</span>
                  <strong>{dashboardData.counts.tenants}</strong>
                  <small>{dashboardData.counts.activeTenants} ativos</small>
                </article>
                <article>
                  <CheckCircle2 size={20} />
                  <span>Em operação</span>
                  <strong>{dashboardData.counts.activeTenants}</strong>
                  <small>{dashboardData.counts.configuringTenants} em configuração</small>
                </article>
                <article>
                  <ShieldCheck size={20} />
                  <span>Planos</span>
                  <strong>{dashboardData.counts.plans}</strong>
                  <small>Catálogo comercial</small>
                </article>
                <article>
                  <UsersRound size={20} />
                  <span>Membros</span>
                  <strong>{dashboardData.counts.membersTotal}</strong>
                  <small>{dashboardData.counts.membersActive} ativos</small>
                </article>
                <article>
                  <PackageCheck size={20} />
                  <span>Módulos</span>
                  <strong>{dashboardData.counts.modules}</strong>
                  <small>{dashboardData.counts.suspendedTenants} tenants suspensos</small>
                </article>
              </div>

              <div className="global-admin-grid">
                <section
                  className="global-panel tenants-panel"
                  aria-labelledby={
                    activeSection === "dashboard"
                      ? "overview-title"
                      : activeSection === "clients"
                      ? "tenants-title"
                      : activeSection === "plans"
                      ? "plans-title"
                      : "modules-title"
                  }
                >
                  <div className="global-panel-heading">
                    <div>
                      <span>
                        {activeSection === "dashboard"
                          ? "Visão geral"
                          : activeSection === "clients"
                          ? "Clientes/Igrejas"
                          : activeSection === "plans"
                          ? "Planos"
                          : "Catálogo de módulos"}
                      </span>
                      <h2 id={
                        activeSection === "dashboard"
                          ? "overview-title"
                          : activeSection === "clients"
                          ? "tenants-title"
                          : activeSection === "plans"
                          ? "plans-title"
                          : "modules-title"
                      }>
                        {activeSection === "dashboard"
                          ? "Resumo do Admin Global"
                          : activeSection === "clients"
                          ? "Tenants cadastrados"
                          : activeSection === "plans"
                          ? "Catálogo de planos"
                          : "Módulos disponíveis"}
                      </h2>
                    </div>
                    </div>
                  {activeSection === "clients" ? (
                    <>
                      <div className="tenant-filters-row">
                        <div className="tenant-filters">
                          <label className="tenant-filter">
                            <span>Status</span>
                            <select
                              value={statusFilter}
                              onChange={(event) => setStatusFilter(event.target.value as TenantStatus | "all")}
                            >
                              <option value="all">Todos</option>
                              <option value="active">Ativos</option>
                              <option value="configuring">Em configuração</option>
                              <option value="suspended">Suspensos</option>
                            </select>
                          </label>

                          <label className="tenant-filter">
                            <span>Plano</span>
                            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
                              <option value="all">Todos</option>
                              {dashboardData.plans.map((plan) => (
                                <option value={plan.id} key={plan.id}>
                                  {plan.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="tenant-search">
                          <Search size={17} />
                          <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar tenant, slug ou plano"
                          />
                        </label>
                      </div>
                      <div className="tenant-filter-summary">
                        <span>{filteredTenants.length} tenants encontrados</span>
                        <span>
                          {statusFilter !== "all" ? `Status: ${statusFilter}` : "Todos os status"}
                        </span>
                        <span>
                          {planFilter !== "all"
                            ? `Plano: ${dashboardData.plans.find((plan) => plan.id === planFilter)?.name ?? "-"}`
                            : "Todos os planos"}
                        </span>
                      </div>
                    </>
                  ) : null}

                  {activeSection === "dashboard" ? (
                    <div className="tenant-table">
                      <div className="tenant-table-head">
                        <span>Tenant</span>
                        <span>Plano</span>
                        <span>Status</span>
                        <span>Membros</span>
                        <span>Ativos</span>
                      </div>
                      {dashboardData.tenants.slice(0, 5).map((tenant) => (
                        <article key={tenant.id} className="tenant-table-row">
                          <div>
                            <strong>{tenant.name}</strong>
                            <small>{tenant.slug}</small>
                          </div>
                          <span>{tenant.plans?.name ?? "Sem plano"}</span>
                          <span>
                            <em className={tenant.status}>{statusLabels[tenant.status]}</em>
                          </span>
                          <span>
                            {tenant.members_active ?? 0}/{tenant.members_total ?? 0}
                          </span>
                          <span>
                            {tenant.tenant_modules.filter((module) => module.status === "active").length || 0}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : activeSection === "clients" ? (
                    <>
                      <div className="tenant-table">
                        <div className="tenant-table-head">
                        <span>Igreja</span>
                        <span>Plano</span>
                        <span>Módulos</span>
                        <span>Membros</span>
                        <span>Status</span>
                      </div>

                      {filteredTenants.length > 0 ? (
                        filteredTenants.map((tenant) => (
                          <article key={tenant.id} className="tenant-table-row">
                            <div>
                              <strong>{tenant.name}</strong>
                              <small>{tenant.slug}</small>
                            </div>
                            <span>{tenant.plans?.name ?? "Sem plano"}</span>
                            <span>
                              {tenant.tenant_modules.filter((module) => module.status === "active")
                                .length || 0}
                            </span>
                            <span>
                              {tenant.members_active ?? 0}/{tenant.members_total ?? 0}
                            </span>
                            <div className="tenant-row-actions">
                              <em className={tenant.status}>{statusLabels[tenant.status]}</em>
                              <button
                                type="button"
                                aria-label={`Ver detalhes de ${tenant.name}`}
                                onClick={() => openTenantDetailPanel(tenant)}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Configurar módulos de ${tenant.name}`}
                                onClick={() => openModulesPanel(tenant)}
                              >
                                <Settings2 size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Editar ${tenant.name}`}
                                onClick={() => openEditTenantForm(tenant)}
                              >
                                <Edit3 size={16} />
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-admin-state">
                          <Building2 size={22} />
                          <strong>Nenhum tenant encontrado.</strong>
                          <span>Cadastre a primeira igreja no próximo fluxo da Etapa 2.</span>
                        </div>
                      )}
                    </div>

                    {selectedTenant ? (
                      <section className="global-panel tenant-detail-panel" aria-label={`Detalhes do tenant ${selectedTenant.name}`}>
                        <div className="global-panel-heading">
                          <div>
                            <span>Detalhes do tenant</span>
                            <h2>{selectedTenant.name}</h2>
                          </div>
                          <button
                            className="panel-icon-button"
                            type="button"
                            aria-label="Fechar detalhes"
                            onClick={clearTenantSelection}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="tenant-detail-grid">
                          <div className="tenant-detail-summary">
                            <article>
                              <strong>Slug</strong>
                              <span>{selectedTenant.slug}</span>
                            </article>
                            <article>
                              <strong>Plano</strong>
                              <span>{selectedTenant.plans?.name ?? "Sem plano"}</span>
                            </article>
                            <article>
                              <strong>Status</strong>
                              <span>{statusLabels[selectedTenant.status]}</span>
                            </article>
                            <article>
                              <strong>Contato</strong>
                              <span>{selectedTenant.contact_email ?? "-"}</span>
                            </article>
                            <article>
                              <strong>Telefone</strong>
                              <span>{selectedTenant.contact_phone ?? "-"}</span>
                            </article>
                            <article>
                              <strong>Logo</strong>
                              <span className="tenant-logo-preview">
                                {selectedTenant.logo_url ? (
                                  <img src={selectedTenant.logo_url} alt="Logo do tenant" />
                                ) : (
                                  <em className="placeholder">Sem logo</em>
                                )}
                              </span>
                            </article>
                            <article>
                              <strong>Cores</strong>
                              <span className="tenant-color-samples">
                                <em style={{ background: selectedTenant.primary_color }} />
                                <em style={{ background: selectedTenant.accent_color }} />
                                <small>{selectedTenant.primary_color}, {selectedTenant.accent_color}</small>
                              </span>
                            </article>
                            <article>
                              <strong>Módulos ativos</strong>
                              <span>
                                {selectedTenant.tenant_modules.filter((module) => module.status === "active").length || 0}
                              </span>
                            </article>
                            <article>
                              <strong>Em configuração</strong>
                              <span>
                                {selectedTenant.tenant_modules.filter((module) => module.status === "configuring").length || 0}
                              </span>
                            </article>
                            <article>
                              <strong>Principais módulos</strong>
                              <span>
                                {selectedTenant.tenant_modules
                                  .filter((module) => module.status === "active")
                                  .map((module) => module.platform_modules?.name ?? module.module_id)
                                  .filter(Boolean)
                                  .slice(0, 3)
                                  .join(", ") || "Nenhum módulo ativo"}
                              </span>
                            </article>
                          </div>

                          <div className="tenant-detail-actions">
                            <Button onClick={() => openEditTenantForm(selectedTenant)}>
                              Editar tenant
                            </Button>
                            <Button variant="ghost" onClick={() => openModulesPanel(selectedTenant)}>
                              Configurar módulos
                            </Button>
                            <Button variant="secondary" onClick={handleToggleTenantStatus}>
                              {selectedTenant.status === "active" ? "Desativar (suspender)" : "Ativar tenant"}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => window.open("/admin-cliente", "_blank")}
                            >
                              Abrir Admin Cliente
                            </Button>
                          </div>
                        </div>

                        <div className="tenant-detail-sections">
                          <section className="tenant-detail-section" aria-label="Identidade do tenant">
                            <header>
                              <strong>Identidade</strong>
                              <span>Logo e aparência da área do cliente</span>
                            </header>
                            <div className="tenant-detail-section-body">
                              <label className="tenant-file">
                                <span>Enviar logo</span>
                                <input type="file" accept="image/*" onChange={handleTenantLogoUpload} />
                              </label>
                              <div className="tenant-detail-inline-actions">
                                <Button variant="ghost" onClick={handleRemoveTenantLogo} disabled={!selectedTenant.logo_url}>
                                  Remover logo
                                </Button>
                              </div>
                              {tenantLogoUploadMessage ? (
                                <p className={`login-feedback ${tenantLogoUploadStatus}`}>{tenantLogoUploadMessage}</p>
                              ) : null}
                            </div>
                          </section>

                          <section className="tenant-detail-section" aria-label="Configurações do sistema">
                            <header>
                              <strong>Configurações do sistema</strong>
                              <span>Feature flags e parâmetros por tenant</span>
                            </header>
                            <div className="tenant-detail-section-body">
                              {tenantFeatureFlagsStatus === "loading" ? (
                                <p className="tenant-section-hint">Carregando configurações...</p>
                              ) : null}
                              {tenantFeatureFlagsStatus === "error" ? (
                                <p className="login-feedback error">{tenantFeatureFlagsMessage}</p>
                              ) : null}

                              <div className="tenant-flag-actions">
                                <Button variant="ghost" onClick={addFeatureFlagRow}>
                                  Adicionar flag
                                </Button>
                              </div>

                              {tenantFeatureFlags.length > 0 ? (
                                <div className="tenant-flags">
                                  {tenantFeatureFlags.map((row, index) => (
                                    <div key={`${row.flag_key}-${index}`} className="tenant-flag-row">
                                      <input
                                        value={row.flag_key}
                                        onChange={(event) => updateFeatureFlagRow(index, "flag_key", event.target.value)}
                                        placeholder="ex.: modules.members.enabled"
                                      />
                                      <label className="tenant-flag-toggle">
                                        <input
                                          type="checkbox"
                                          checked={row.enabled}
                                          onChange={(event) => updateFeatureFlagRow(index, "enabled", event.target.checked)}
                                        />
                                        <span>Ativo</span>
                                      </label>
                                      <textarea
                                        value={row.payloadText}
                                        onChange={(event) => updateFeatureFlagRow(index, "payloadText", event.target.value)}
                                        rows={4}
                                        spellCheck={false}
                                      />
                                      <button
                                        type="button"
                                        className="panel-icon-button danger"
                                        aria-label="Remover flag da lista"
                                        onClick={() => removeFeatureFlagRow(index)}
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="tenant-section-hint">Nenhuma configuração cadastrada para este tenant.</p>
                              )}

                              {tenantFeatureFlagsMessage ? (
                                <p className={`login-feedback ${tenantFeatureFlagsSaveStatus}`}>{tenantFeatureFlagsMessage}</p>
                              ) : null}

                              <div className="tenant-detail-inline-actions">
                                <Button
                                  type="button"
                                  onClick={handleSaveFeatureFlags}
                                  disabled={tenantFeatureFlagsSaveStatus === "loading"}
                                  icon={<ArrowRight size={18} />}
                                >
                                  {tenantFeatureFlagsSaveStatus === "loading" ? "Salvando..." : "Salvar configurações"}
                                </Button>
                              </div>
                            </div>
                          </section>

                          <section className="tenant-detail-section" aria-label="Acesso administrativo do cliente">
                            <header>
                              <strong>Acesso do cliente</strong>
                              <span>Crie ou resete a senha do admin do tenant</span>
                            </header>
                            <div className="tenant-detail-section-body">
                              <div className="tenant-access-grid">
                                <label>
                                  <span>E-mail do admin</span>
                                  <input
                                    value={tenantAdminEmail}
                                    onChange={(event) => setTenantAdminEmail(event.target.value)}
                                    placeholder="admin@igreja.org"
                                    type="email"
                                  />
                                </label>
                                <label>
                                  <span>Nome</span>
                                  <input
                                    value={tenantAdminName}
                                    onChange={(event) => setTenantAdminName(event.target.value)}
                                    placeholder="Admin da igreja"
                                  />
                                </label>
                                <label>
                                  <span>Papel</span>
                                  <select
                                    value={tenantAdminRole}
                                    onChange={(event) => setTenantAdminRole(event.target.value as "owner" | "admin")}
                                  >
                                    <option value="owner">Owner (admin geral)</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </label>
                              </div>

                              <div className="tenant-detail-inline-actions">
                                <Button
                                  type="button"
                                  onClick={() => handleProvisionTenantAdmin("create")}
                                  disabled={tenantAdminProvisionStatus === "loading"}
                                  icon={<LockKeyhole size={18} />}
                                >
                                  {tenantAdminProvisionStatus === "loading" ? "Gerando..." : "Gerar senha de 1º acesso"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleProvisionTenantAdmin("reset")}
                                  disabled={tenantAdminProvisionStatus === "loading"}
                                >
                                  Resetar senha
                                </Button>
                              </div>

                              {tenantAdminProvisionMessage ? (
                                <p className={`login-feedback ${tenantAdminProvisionStatus}`}>{tenantAdminProvisionMessage}</p>
                              ) : null}

                              {tenantAdminTemporaryPassword ? (
                                <div className="tenant-temp-password" aria-label="Senha temporária">
                                  <strong>Senha temporária</strong>
                                  <code>{tenantAdminTemporaryPassword}</code>
                                  <small>Entregue esta senha ao cliente. Ela deve ser trocada no primeiro acesso.</small>
                                </div>
                              ) : null}
                            </div>
                          </section>
                        </div>
                      </section>
                    ) : null}
                    </>
                  ) : activeSection === "plans" ? (
                    <div className="tenant-table">
                      <div className="tenant-table-head">
                        <span>Nome</span>
                        <span>Código</span>
                        <span>Preço</span>
                        <span>Status</span>
                      </div>
                      {dashboardData.plans.length > 0 ? (
                        dashboardData.plans.map((plan) => (
                          <article key={plan.id} className="tenant-table-row">
                            <div>
                              <strong>{plan.name}</strong>
                              <small>{plan.description ?? plan.code}</small>
                            </div>
                            <span>{plan.code}</span>
                            <span>R$ {Number(plan.monthly_price_cents) / 100}</span>
                            <div className="tenant-row-actions">
                              <em className={plan.status}>
                                {plan.status === "active" ? "Ativo" : "Arquivado"}
                              </em>
                              <button
                                type="button"
                                aria-label={`Editar plano ${plan.name}`}
                                onClick={() => openEditPlanForm(plan)}
                              >
                                <Edit3 size={16} />
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-admin-state">
                          <Building2 size={22} />
                          <strong>Nenhum plano cadastrado.</strong>
                          <span>Crie seu primeiro plano para ofertar aos tenants.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="tenant-table">
                      <div className="tenant-table-head">
                        <span>Nome</span>
                        <span>Código</span>
                        <span>Status</span>
                        <span>Ações</span>
                      </div>
                      {dashboardData.modules.length > 0 ? (
                        dashboardData.modules.map((module) => (
                          <article key={module.id} className="tenant-table-row">
                            <div>
                              <strong>{module.name}</strong>
                              <small>{module.description ?? module.code}</small>
                            </div>
                            <span>{module.code}</span>
                            <span>{module.status}</span>
                            <div className="tenant-row-actions">
                              <button
                                type="button"
                                aria-label={`Editar módulo ${module.name}`}
                                onClick={() => openEditModuleForm(module)}
                              >
                                <Edit3 size={16} />
                              </button>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-admin-state">
                          <Building2 size={22} />
                          <strong>Nenhum módulo no catálogo.</strong>
                          <span>Crie o catálogo global de módulos para ativação por tenant.</span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <aside className="global-panel audit-panel" aria-label="Atividades recentes">
                  <div className="global-panel-heading">
                    <div>
                      <span>Auditoria</span>
                      <h2>Atividades recentes</h2>
                    </div>
                    <Clock3 size={20} />
                  </div>

                  <div className="audit-list">
                    {dashboardData.auditLogs.length > 0 ? (
                      dashboardData.auditLogs.map((log) => (
                        <article key={log.id}>
                          <span>{log.entity_type}</span>
                          <strong>{log.action}</strong>
                          <small>{new Date(log.created_at).toLocaleString("pt-BR")}</small>
                        </article>
                      ))
                    ) : (
                      <div className="empty-admin-state compact">
                        <Clock3 size={22} />
                        <strong>Sem eventos recentes.</strong>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-brand" aria-label="Admin Global SirvaOS">
        <a className="brand-mark" href="/" aria-label="SirvaOS">
          <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
        </a>

        <div className="admin-auth-copy">
          <span className="eyebrow">
            <ShieldCheck size={18} />
            Acesso interno SirvaOS
          </span>
          <h1>Admin Global para operar a plataforma SaaS.</h1>
          <p>
            Esta rota é exclusiva para usuários globais criados por processo controlado.
            Nenhum administrador global é cadastrado por interface pública.
          </p>
        </div>

        <div className="admin-auth-metrics" aria-label="Escopo do Admin Global">
          <article>
            <Building2 size={20} />
            <strong>Tenants</strong>
            <span>Clientes, status e módulos contratados</span>
          </article>
          <article>
            <ShieldCheck size={20} />
            <strong>Permissões</strong>
            <span>Acesso restrito por papel global</span>
          </article>
        </div>
      </section>

      <section className="admin-auth-panel" aria-label="Login do Admin Global">
        <div className="login-card admin-login-card">
          <div className="login-card-header">
            <img src="/img/icon-sirvaos.svg" alt="" />
            <div>
              <span>Admin Global</span>
              <h2>Acessar sistema</h2>
            </div>
          </div>

          <form className="login-form" onSubmit={handleAdminLogin}>
            <TextField
              autoComplete="email"
              icon={<Mail size={18} />}
              label="E-mail global"
              name="email"
              placeholder="admin@sirvaos.com"
              type="email"
            />

            <TextField
              autoComplete="current-password"
              icon={<LockKeyhole size={18} />}
              label="Senha"
              name="password"
              placeholder="Senha do usuário global"
              type="password"
            />

            {loginMessage ? (
              <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
            ) : null}

            <Button
              type="submit"
              className="submit-button"
              disabled={loginStatus === "loading"}
              icon={<ArrowRight size={18} />}
            >
              {loginStatus === "loading" ? "Validando..." : "Entrar no Admin Global"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
