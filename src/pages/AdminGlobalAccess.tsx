import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Edit3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
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
};

type PlatformModuleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "beta" | "deprecated";
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
  };
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
  const [tenantForm, setTenantForm] = useState<TenantFormState>(emptyTenantForm);
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [tenantSaveStatus, setTenantSaveStatus] = useState<LoginStatus>("idle");
  const [tenantSaveMessage, setTenantSaveMessage] = useState("");
  const [selectedModulesTenantId, setSelectedModulesTenantId] = useState<string | null>(null);
  const [moduleConfig, setModuleConfig] = useState<ModuleConfigState>({});
  const [moduleSaveStatus, setModuleSaveStatus] = useState<LoginStatus>("idle");
  const [moduleSaveMessage, setModuleSaveMessage] = useState("");

  const selectedModulesTenant = useMemo(() => {
    if (!dashboardData || !selectedModulesTenantId) {
      return null;
    }

    return dashboardData.tenants.find((tenant) => tenant.id === selectedModulesTenantId) ?? null;
  }, [dashboardData, selectedModulesTenantId]);

  const filteredTenants = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return dashboardData.tenants;
    }

    return dashboardData.tenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.contact_email ?? "", tenant.plans?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [dashboardData, searchTerm]);

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
        .select("id, name, code")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .returns<PlanRecord[]>(),
      supabase
        .from("platform_modules")
        .select("id, code, name, description, status")
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

    setDashboardData({
      tenants: tenantsResult.data ?? [],
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
            <button className="active" type="button">
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button type="button">
              <Building2 size={18} />
              Clientes
            </button>
            <button type="button">
              <PackageCheck size={18} />
              Módulos
            </button>
            <button type="button">
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
              <h1>Operação da plataforma</h1>
              <p>Clientes, planos e módulos controlados em uma visão central.</p>
            </div>
            <Button icon={<Plus size={18} />} onClick={openCreateTenantForm}>
              Novo tenant
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
              {isTenantFormOpen ? (
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
                        {dashboardData.plans.map((plan) => (
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

              {selectedModulesTenant ? (
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
                  <PackageCheck size={20} />
                  <span>Módulos</span>
                  <strong>{dashboardData.counts.modules}</strong>
                  <small>{dashboardData.counts.suspendedTenants} tenants suspensos</small>
                </article>
              </div>

              <div className="global-admin-grid">
                <section className="global-panel tenants-panel" aria-labelledby="tenants-title">
                  <div className="global-panel-heading">
                    <div>
                      <span>Clientes/Igrejas</span>
                      <h2 id="tenants-title">Tenants cadastrados</h2>
                    </div>
                    <label className="tenant-search">
                      <Search size={17} />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar tenant"
                      />
                    </label>
                  </div>

                  <div className="tenant-table">
                    <div className="tenant-table-head">
                      <span>Igreja</span>
                      <span>Plano</span>
                      <span>Módulos</span>
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
                          <div className="tenant-row-actions">
                            <em className={tenant.status}>{statusLabels[tenant.status]}</em>
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
