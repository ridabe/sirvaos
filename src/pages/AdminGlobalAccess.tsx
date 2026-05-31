import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  PackageCheck,
  Search,
  ShieldCheck,
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

type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  contact_email: string | null;
  created_at: string;
  plans: {
    name: string;
    code: string;
  } | null;
  tenant_modules: Array<{
    status: "active" | "inactive" | "suspended" | "configuring";
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

type AdminDashboardData = {
  tenants: TenantRecord[];
  auditLogs: AuditLogRecord[];
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

export function AdminGlobalAccess() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [profile, setProfile] = useState<GlobalProfile | null>(null);
  const [dataStatus, setDataStatus] = useState<LoadStatus>("idle");
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
            name,
            slug,
            status,
            contact_email,
            created_at,
            plans (name, code),
            tenant_modules (
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
      getTableCount("tenants"),
      getTenantStatusCount("active"),
      getTenantStatusCount("suspended"),
      getTenantStatusCount("configuring"),
      getTableCount("plans"),
      getTableCount("platform_modules"),
    ]);

    if (tenantsResult.error || auditLogsResult.error) {
      setDataStatus("error");
      return;
    }

    setDashboardData({
      tenants: tenantsResult.data ?? [],
      auditLogs: auditLogsResult.data ?? [],
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
            <Button icon={<Building2 size={18} />}>Novo tenant</Button>
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
                          <em className={tenant.status}>{statusLabels[tenant.status]}</em>
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
