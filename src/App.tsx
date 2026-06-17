import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarCheck,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Button,
  FeatureItem,
  StatusBadge,
  TextField,
} from "./design-system/components";
import { calendarItems, clientStats, memberRows, notificationItems } from "./data/clientDashboard";
import { features, modules, tenantCards } from "./data/landing";
import { resolvePostLoginPath } from "./lib/accessRouting";
import { PolicyFooter } from "./components/PolicyFooter";
import { supabase } from "./lib/supabase";
import { AdminGlobalAccess } from "./pages/AdminGlobalAccess";
import { ClientAdmin } from "./pages/ClientAdmin";
import { MemberPortal } from "./pages/MemberPortal";
import { Produto } from "./pages/Produto";
import { Planos } from "./pages/Planos";
import { AssinaturaSucesso } from "./pages/AssinaturaSucesso";
import { Ebooks } from "./pages/Ebooks";
import { EbooksAdmin } from "./pages/EbooksAdmin";

type LandingLoginStatus = "idle" | "loading" | "success" | "error";
type LoginMode = "login" | "first-access";
type FirstAccessStep = "identify" | "password";

type LandingProfile = {
  global_role: "super_admin" | "operations" | "support" | null;
  tenant_id: string | null;
  status: "active" | "invited" | "suspended";
};

type FirstAccessStartResponse = {
  ok: boolean;
  code: string;
  message: string;
  activationToken?: string;
  memberName?: string;
  tenantName?: string;
  requiresBirthDate?: boolean;
  alreadyActive?: boolean;
};

type FirstAccessCompleteResponse = {
  ok: boolean;
  code: string;
  message: string;
  alreadyActive?: boolean;
};

type FirstAccessErrorResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
};

function extractFunctionErrorMessage(error: unknown) {
  const anyError = error as {
    message?: unknown;
    status?: unknown;
    cause?: { status?: unknown } | unknown;
    context?: {
      status?: unknown;
      body?: unknown;
    };
  };

  const contextStatus =
    anyError?.context?.status ??
    anyError?.status ??
    (typeof anyError?.cause === "object" && anyError.cause ? (anyError.cause as { status?: unknown }).status : undefined);
  const contextBody = anyError?.context?.body;
  const status =
    typeof contextStatus === "number"
      ? contextStatus
      : typeof contextStatus === "string"
        ? Number(contextStatus)
        : null;

  const statusFallback =
    typeof status === "number" && !Number.isNaN(status)
      ? `Não foi possível concluir o primeiro acesso (status ${status}).`
      : null;

  if (typeof contextBody === "string" && contextBody.trim()) {
    const trimmedBody = contextBody.trim();
    if (trimmedBody === "{" || trimmedBody === "}" || trimmedBody === "{}") {
      return statusFallback;
    }
    try {
      const parsed = JSON.parse(contextBody) as { message?: unknown };
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
      return contextBody;
    } catch {
      return contextBody;
    }
  }

  if (contextBody && typeof contextBody === "object") {
    const bodyObj = contextBody as { message?: unknown };
    if (typeof bodyObj.message === "string" && bodyObj.message.trim()) {
      return bodyObj.message;
    }
    try {
      return JSON.stringify(contextBody);
    } catch {
      return statusFallback;
    }
  }

  if (typeof anyError?.message === "string" && anyError.message.trim()) {
    if (anyError.message === "Edge Function returned a non-2xx status code") {
      return statusFallback ?? anyError.message;
    }
    return anyError.message;
  }

  return statusFallback;
}

function isStrongEnoughPassword(password: string) {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

async function invokeFirstAccessDirect(body: Record<string, unknown>) {
  const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const apikey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!supabaseUrl || !apikey) {
    return { ok: false, status: 0, data: null as FirstAccessErrorResponse | null };
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/first-access`, {
    method: "POST",
    headers: {
      apikey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data: FirstAccessErrorResponse | null = null;
  try {
    data = (await res.json()) as FirstAccessErrorResponse;
  } catch {
    data = null;
  }

  return { ok: res.ok, status: res.status, data };
}

export function App() {
  const [loginStatus, setLoginStatus] = useState<LandingLoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [firstAccessStep, setFirstAccessStep] = useState<FirstAccessStep>("identify");
  const [firstAccessEmail, setFirstAccessEmail] = useState("");
  const [firstAccessBirthDate, setFirstAccessBirthDate] = useState("");
  const [firstAccessRequiresBirthDate, setFirstAccessRequiresBirthDate] = useState(false);
  const [firstAccessToken, setFirstAccessToken] = useState("");
  const [firstAccessContext, setFirstAccessContext] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showLogin ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLogin]);

  useEffect(() => {
    if (!showLogin) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowLogin(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLogin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("email") || params.has("password")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (window.location.pathname === "/admin-global") {
    return <AdminGlobalAccess />;
  }

  if (window.location.pathname === "/admin-cliente") {
    return <ClientAdmin />;
  }

  if (window.location.pathname === "/membro") {
    return <MemberPortal />;
  }

  if (window.location.pathname === "/produto") {
    return <Produto />;
  }

  if (window.location.pathname === "/planos") {
    return <Planos />;
  }

  if (window.location.pathname === "/assinatura/sucesso") {
    return <AssinaturaSucesso />;
  }

  if (
    window.location.pathname === "/ebooks" ||
    window.location.pathname === "/ebooks/"
  ) {
    return <Ebooks />;
  }

  if (
    window.location.pathname === "/ebooks/admin" ||
    window.location.pathname === "/ebooks/admin/"
  ) {
    return <EbooksAdmin />;
  }

  /* Faz login pelo Supabase sem enviar credenciais via query string. */
  async function handleLandingLogin(event: FormEvent<HTMLFormElement>) {
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

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoginStatus("error");
      setLoginMessage("Falha no login. Verifique e-mail e senha.");
      return;
    }

    try {
      window.location.assign(await resolvePostLoginPath(authData.user!.id));
      return;
    } catch (error) {
      setLoginStatus("error");
      setLoginMessage(error instanceof Error ? error.message : "Não foi possível direcionar o acesso.");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("global_role, tenant_id, status")
      .eq("id", authData.user!.id)
      .single<LandingProfile>();

    if (profileError || !profileData) {
      setLoginStatus("error");
      setLoginMessage("Login efetuado, mas não foi possível carregar o perfil do usuário.");
      return;
    }

    if (profileData!.status !== "active") {
      await supabase.auth.signOut();
      setLoginStatus("error");
      setLoginMessage("Usuário inativo ou sem liberação.");
      return;
    }

    if (profileData!.global_role === "super_admin" || profileData!.global_role === "operations") {
      window.location.assign("/admin-global");
      return;
    }

    if (!profileData!.tenant_id) {
      await supabase.auth.signOut();
      setLoginStatus("error");
      setLoginMessage("Usuário autenticado, mas sem Igreja associada.");
      return;
    }

    window.location.assign("/admin-cliente");
  }

  async function handleFirstAccessStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("firstAccessEmail") ?? "").trim().toLowerCase();
    const dateOfBirth = String(formData.get("dateOfBirth") ?? "");

    const { data, error } = await supabase.functions.invoke<FirstAccessStartResponse>("first-access", {
      body: {
        action: "start",
        email,
        dateOfBirth: dateOfBirth || undefined,
      },
    });

    if (error || !data) {
      setLoginStatus("error");
      setLoginMessage(extractFunctionErrorMessage(error) ?? "Não foi possível iniciar o primeiro acesso agora.");
      return;
    }

    if (data.alreadyActive) {
      setLoginStatus("error");
      setLoginMessage(data.message);
      setLoginMode("login");
      setFirstAccessStep("identify");
      return;
    }

    if (data.requiresBirthDate) {
      setLoginStatus("idle");
      setFirstAccessEmail(email);
      setFirstAccessRequiresBirthDate(true);
      setLoginMessage(data.message);
      return;
    }

    if (!data.ok || !data.activationToken) {
      setLoginStatus("error");
      setLoginMessage(data.message || "Não foi possível localizar seu cadastro.");
      return;
    }

    setLoginStatus("success");
    setFirstAccessEmail(email);
    setFirstAccessToken(data.activationToken);
    setFirstAccessContext(`${data.memberName ?? "Membro"} - ${data.tenantName ?? "Igreja"}`);
    setFirstAccessStep("password");
    setLoginMessage(data.message);
  }

  async function handleFirstAccessComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("newPassword") ?? "");
    const passwordConfirm = String(formData.get("newPasswordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setLoginStatus("error");
      setLoginMessage("As senhas não conferem.");
      return;
    }

    if (!firstAccessEmail.trim() || !firstAccessToken.trim()) {
      setLoginStatus("error");
      setLoginMessage("Código de primeiro acesso ausente. Reinicie o primeiro acesso informando seu e-mail novamente.");
      setFirstAccessStep("identify");
      return;
    }

    if (!isStrongEnoughPassword(password)) {
      setLoginStatus("error");
      setLoginMessage("A senha precisa ter pelo menos 8 caracteres, com letras maiúsculas, minúsculas e números.");
      return;
    }

    const email = firstAccessEmail.trim().toLowerCase();
    const token = firstAccessToken.trim();

    const { data, error } = await supabase.functions.invoke<FirstAccessCompleteResponse>("first-access", {
      body: {
        action: "complete",
        email,
        token,
        password,
      },
    });

    if (error || !data || !data.ok) {
      const direct = await invokeFirstAccessDirect({
        action: "complete",
        email,
        token,
        password,
      });

      setLoginStatus("error");
      setLoginMessage(
        data?.message ??
          direct.data?.message ??
          extractFunctionErrorMessage(error) ??
          (direct.status ? `Não foi possível concluir o primeiro acesso (status ${direct.status}).` : null) ??
          "Não foi possível concluir o primeiro acesso.",
      );
      return;
    }

    if (data.alreadyActive) {
      setLoginStatus("error");
      setLoginMessage(data.message);
      setLoginMode("login");
      setFirstAccessStep("identify");
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: firstAccessEmail,
      password,
    });

    if (authError || !authData.user) {
      setLoginStatus("error");
      setLoginMessage(`Senha criada, mas não foi possível entrar. ${authError?.message ?? ""}`.trim());
      setLoginMode("login");
      setFirstAccessStep("identify");
      return;
    }

    window.location.assign(await resolvePostLoginPath(authData.user.id));
  }

  return (
    <main className="home-shell">
      <header className="home-nav">
        <a className="home-logo" href="/" aria-label="SirvaOS">
          <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
        </a>
        <nav className="home-nav-links" aria-label="Navegação principal">
          <a href="#produto">
            <Layers3 size={17} />
            Produto
          </a>
          <a href="/planos">
            <Sparkles size={17} />
            Planos
          </a>
        </nav>
        <div className="home-nav-actions">
          <button type="button" className="home-login-btn" onClick={() => setShowLogin(true)}>
            <ArrowRight size={17} />
            Entrar
          </button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-hero-title">
        <span className="eyebrow">
          <ShieldCheck size={18} />
          Plataforma operacional para igrejas e ministérios
        </span>
        <h1 id="home-hero-title">
          Gestão completa<br />da sua igreja.
        </h1>
        <p>
          Membros, ministérios, agenda, escalas e comunicados em um fluxo único —
          com aplicativo para os membros. Cada igreja opera com sua marca, seus
          módulos e seus dados.
        </p>
        <div className="home-hero-actions">
          <a className="primary-button" href="/planos">
            <Sparkles size={18} />
            Ver planos
          </a>
          <button type="button" className="secondary-button" onClick={() => setShowLogin(true)}>
            <ArrowRight size={18} />
            Entrar no painel
          </button>
        </div>
        <div className="trust-row" aria-label="Pilares do SirvaOS">
          {["Multi-tenant", "White-label por igreja", "Permissões por perfil"].map((item) => (
            <span key={item}>
              <Check size={16} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="home-showcase" aria-label="Prévia do sistema SirvaOS" aria-hidden="true">
        <div className="hs-window">
          <div className="hs-bar">
            <span className="hs-dot" />
            <span className="hs-dot" />
            <span className="hs-dot" />
            <span className="hs-url">app.sirvaos.com.br</span>
          </div>
          <div className="hs-body">
            <div className="hs-metrics">
              {modules.map((m) => (
                <article key={m.name} className="hs-metric">
                  <span className="hs-metric-label">{m.name}</span>
                  <strong className="hs-metric-value">{m.metric}</strong>
                  <small>{m.label}</small>
                </article>
              ))}
            </div>
            <div className="hs-panels">
              <article className="hs-panel">
                <div className="hs-panel-head">
                  <span>
                    <UsersRound size={15} />
                    Membresia
                  </span>
                  <em className="hs-trend">+12 este mês</em>
                </div>
                <div className="hs-member-list">
                  {memberRows.map((member) => (
                    <div key={member.name} className="hs-member-row">
                      <span className="hs-avatar">{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>
                          {member.group} · {member.detail}
                        </small>
                      </div>
                      <em className={member.status === "Ativo" ? "success" : "warning"}>{member.status}</em>
                    </div>
                  ))}
                </div>
              </article>
              <article className="hs-panel">
                <div className="hs-panel-head">
                  <span>
                    <CalendarCheck size={15} />
                    Próximos eventos
                  </span>
                </div>
                <div className="hs-event-list">
                  {calendarItems.map((item) => (
                    <div key={item.title} className="hs-event-row">
                      <time>{item.date}</time>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hs-chips">
                  {modules.map((m) => (
                    <span key={m.name} className="hs-chip">
                      {m.name}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {showLogin ? (
        <div
          className="login-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Acesso ao SirvaOS"
          onClick={() => setShowLogin(false)}
        >
          <div className="login-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="login-modal-close"
              aria-label="Fechar"
              onClick={() => setShowLogin(false)}
            >
              <X size={20} />
            </button>

            <div className="login-card login-card--modal">
              <div className="login-card-header">
                <img src="/img/icon-sirvaos.svg" alt="" />
                <div>
                  <span>Acesso da igreja</span>
                  <h2>Entrar no SirvaOS</h2>
                </div>
              </div>

              <form
                className="login-form"
                method="post"
                onSubmit={
                  loginMode === "login"
                    ? handleLandingLogin
                    : firstAccessStep === "identify"
                      ? handleFirstAccessStart
                      : handleFirstAccessComplete
                }
              >
                {loginMode === "login" || firstAccessStep === "identify" ? (
                  <TextField
                    autoComplete="email"
                    icon={<Mail size={18} />}
                    label="E-mail"
                    name={loginMode === "login" ? "email" : "firstAccessEmail"}
                    onChange={(event) => setFirstAccessEmail(event.target.value)}
                    placeholder="admin@suaigreja.org"
                    type="email"
                    value={firstAccessEmail}
                  />
                ) : null}

                {loginMode === "first-access" && firstAccessRequiresBirthDate && firstAccessStep === "identify" ? (
                  <label>
                    <span>Data de nascimento</span>
                    <div className="field">
                      <Fingerprint size={18} />
                      <input
                        autoComplete="bday"
                        name="dateOfBirth"
                        onChange={(event) => setFirstAccessBirthDate(event.target.value)}
                        type="date"
                        value={firstAccessBirthDate}
                      />
                    </div>
                  </label>
                ) : null}

                {loginMode === "login" ? (
                  <TextField
                    autoComplete="current-password"
                    endIcon={
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    icon={<LockKeyhole size={18} />}
                    label="Senha"
                    name="password"
                    placeholder="Sua senha"
                    type={showPassword ? "text" : "password"}
                  />
                ) : null}

                {loginMode === "first-access" && firstAccessStep === "password" ? (
                  <>
                    <p className="first-access-context">{firstAccessContext}</p>
                    <TextField
                      autoComplete="new-password"
                      icon={<LockKeyhole size={18} />}
                      label="Criar senha"
                      name="newPassword"
                      placeholder="Mínimo 8 caracteres"
                      type="password"
                    />
                    <TextField
                      autoComplete="new-password"
                      icon={<LockKeyhole size={18} />}
                      label="Confirmar senha"
                      name="newPasswordConfirm"
                      placeholder="Repita a senha"
                      type="password"
                    />
                  </>
                ) : null}

                <div className="form-options">
                  <label className="remember">
                    <input
                      type="checkbox"
                      checked={loginMode === "first-access"}
                      onChange={(event) => {
                        setLoginMode(event.target.checked ? "first-access" : "login");
                        setFirstAccessStep("identify");
                        setLoginStatus("idle");
                        setLoginMessage("");
                      }}
                    />
                    <span>Primeiro acesso</span>
                  </label>
                  <a href="/">Esqueci a senha</a>
                </div>

                <Button
                  type="submit"
                  className="submit-button"
                  icon={<ArrowRight size={18} />}
                  disabled={loginStatus === "loading"}
                >
                  {loginStatus === "loading"
                    ? "Aguarde..."
                    : loginMode === "first-access" && firstAccessStep === "password"
                      ? "Criar senha e entrar"
                      : loginMode === "first-access"
                        ? "Continuar primeiro acesso"
                        : "Acessar SirvaOS"}
                </Button>

                {loginMessage ? <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p> : null}
              </form>

              <div className="divider">
                <span>ou</span>
              </div>

              <Button variant="sso" icon={<Fingerprint size={18} />}>
                Entrar com código seguro
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="marketing-section" id="produto" aria-labelledby="produto-title">
        <div className="section-heading">
          <span className="eyebrow">
            <MessageSquareText size={18} />
            Operação centralizada
          </span>
          <div>
            <h2 id="produto-title">Menos planilhas. Mais visão e governança.</h2>
            <p>
              O SirvaOS organiza membros, ministérios, agenda e comunicados em um
              fluxo único. A liderança enxerga o todo e cada ministério opera apenas o
              que precisa.
            </p>
          </div>
        </div>

        <div className="marketing-grid" id="por-dentro">
          <div className="marketing-copy" aria-label="Destaques do produto">
            <div className="marketing-points">
              <article className="marketing-point">
                <div className="point-icon">
                  <UsersRound size={18} />
                </div>
                <div>
                  <strong>Cadastro unificado</strong>
                  <p>Um membro, um registro. Vínculos e históricos conectam módulos sem duplicação.</p>
                </div>
              </article>
              <article className="marketing-point">
                <div className="point-icon">
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <strong>Agenda e escalas</strong>
                  <p>Eventos e compromissos dos ministérios alimentam um calendário central, sem conflitos.</p>
                </div>
              </article>
              <article className="marketing-point">
                <div className="point-icon">
                  <BellRing size={18} />
                </div>
                <div>
                  <strong>Comunicação segmentada</strong>
                  <p>Comunicados e notificações chegam às pessoas certas, no tempo certo, por perfil e módulo.</p>
                </div>
              </article>
              <article className="marketing-point">
                <div className="point-icon">
                  <Palette size={18} />
                </div>
                <div>
                  <strong>White-label por igreja</strong>
                  <p>Logo, cores e identidade visual aplicados por igreja, sem afetar outros tenants.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="marketing-preview" aria-label="Prévia ilustrativa do painel" aria-hidden="true">
            <div className="dashboard-shell">
              <aside className="dashboard-sidebar">
                <div className="client-brand">
                  <span>PI</span>
                  <div>
                    <strong>Primeira Igreja</strong>
                    <small>Painel administrativo</small>
                  </div>
                </div>

                <nav>
                  {[
                    { icon: Activity, label: "Visão geral", active: true },
                    { icon: UsersRound, label: "Membros" },
                    { icon: CalendarCheck, label: "Calendário" },
                    { icon: BellRing, label: "Comunicados" },
                    { icon: Palette, label: "Identidade" },
                  ].map(({ icon: Icon, label, active }) => (
                    <div className={active ? "preview-nav-item active" : "preview-nav-item"} key={label}>
                      <Icon size={18} />
                      {label}
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="dashboard-content">
                <header className="dashboard-header">
                  <div>
                    <span>Admin da Igreja</span>
                    <h3>Resumo operacional</h3>
                  </div>
                  <span className="preview-cta">Novo membro</span>
                </header>

                <div className="client-stats">
                  {clientStats.map((stat) => (
                    <article key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.trend}</small>
                    </article>
                  ))}
                </div>

                <div className="dashboard-grid">
                  <article className="panel members-panel">
                    <div className="panel-heading">
                      <div>
                        <span>Membresia</span>
                        <h4>Cadastro unificado</h4>
                      </div>
                      <span className="preview-link">Ver todos</span>
                    </div>

                    <div className="member-list">
                      {memberRows.map((member) => (
                        <div key={member.name} className="member-row">
                          <span>{member.name.slice(0, 1)}</span>
                          <div>
                            <strong>{member.name}</strong>
                            <small>
                              {member.group} · {member.detail}
                            </small>
                          </div>
                          <em className={member.status === "Ativo" ? "success" : "warning"}>{member.status}</em>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-heading">
                      <div>
                        <span>Calendário</span>
                        <h4>Próximos eventos</h4>
                      </div>
                      <CalendarCheck size={20} />
                    </div>

                    <div className="event-list">
                      {calendarItems.map((item) => (
                        <div key={item.title}>
                          <time>{item.date}</time>
                          <div>
                            <strong>{item.title}</strong>
                            <small>{item.meta}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel">
                    <div className="panel-heading">
                      <div>
                        <span>Comunicados</span>
                        <h4>Avisos do dia</h4>
                      </div>
                      <BellRing size={20} />
                    </div>

                    <div className="notification-list">
                      {notificationItems.map((item) => (
                        <div key={item.title}>
                          <div>
                            <strong>{item.title}</strong>
                            <small>{item.channel}</small>
                          </div>
                          <em>{item.status}</em>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel theme-panel">
                    <div className="panel-heading">
                      <div>
                        <span>White-label</span>
                        <h4>Identidade do cliente</h4>
                      </div>
                      <Palette size={20} />
                    </div>

                    <div className="theme-preview">
                      <span className="church-logo">PI</span>
                      <div className="theme-swatches" aria-label="Cores do cliente">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <PolicyFooter />
    </main>
  );
}
