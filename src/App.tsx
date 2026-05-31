import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarCheck,
  Check,
  ChevronDown,
  Church,
  Eye,
  Fingerprint,
  LockKeyhole,
  Mail,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import {
  Button,
  FeatureItem,
  IconButton,
  MetricCard,
  StatusBadge,
  TextField,
} from "./design-system/components";
import { supabase } from "./lib/supabase";
import {
  calendarItems,
  clientStats,
  memberRows,
  notificationItems,
} from "./data/clientDashboard";
import { features, modules, tenantCards } from "./data/landing";

export function App() {
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [loginMessage, setLoginMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setLoginStatus("loading");
    setLoginMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginStatus("error");
      setLoginMessage("Não foi possível entrar. Confira e-mail, senha e acesso liberado.");
      return;
    }

    setLoginStatus("success");
    setLoginMessage("Login realizado. Próximo passo: carregar o Admin Global.");
  }

  return (
    <main>
      <section className="app-shell">
        <div className="brand-panel" aria-label="Apresentação do SirvaOS">
          <nav className="topbar">
            <a className="brand-mark" href="/" aria-label="SirvaOS">
              <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
            </a>

            <div className="nav-actions" aria-label="Acesso rápido">
              <Button variant="ghost" icon={<Sparkles size={17} />}>
                Demonstração
              </Button>
              <IconButton ariaLabel="Selecionar idioma">
                PT
                <ChevronDown size={14} />
              </IconButton>
            </div>
          </nav>

          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <ShieldCheck size={18} />
                Plataforma SaaS para igrejas e ministérios
              </span>

              <h1>Organize a operação da igreja para servir melhor.</h1>

              <p>
                O SirvaOS conecta liderança, ministérios, membros, escalas, eventos e
                comunicação em uma plataforma moderna, modular e preparada para
                white-label.
              </p>

              <div className="hero-actions">
                <Button icon={<ArrowRight size={18} />}>Conhecer o painel</Button>
                <Button variant="secondary" icon={<Smartphone size={18} />}>
                  Ver app do membro
                </Button>
              </div>

              <div className="trust-row" aria-label="Pilares do SirvaOS">
                {["Multi-tenant", "White-label", "Módulos ativos"].map((item) => (
                  <span key={item}>
                    <Check size={16} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="product-preview" aria-label="Prévia do painel SirvaOS">
              <div className="preview-sidebar">
                <img src="/img/icon-sirvaos.svg" alt="" />
                <div className="sidebar-line active" />
                <div className="sidebar-line" />
                <div className="sidebar-line short" />
              </div>

              <div className="preview-content">
                <div className="preview-header">
                  <div>
                    <span>Admin Global</span>
                    <strong>Clientes ativos</strong>
                  </div>
                  <button type="button">Novo tenant</button>
                </div>

                <div className="module-strip">
                  {modules.map((module) => (
                    <MetricCard key={module.name} {...module} />
                  ))}
                </div>

                <div className="tenant-list">
                  {tenantCards.map((tenant) => (
                    <article key={tenant.name}>
                      <div className="tenant-icon">
                        <Church size={20} />
                      </div>
                      <div>
                        <strong>{tenant.name}</strong>
                        <span>{tenant.modules}</span>
                      </div>
                      <StatusBadge tone={tenant.status === "Online" ? "success" : "warning"}>
                        {tenant.status}
                      </StatusBadge>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="login-panel" aria-label="Login do sistema">
          <div className="login-card">
            <div className="login-card-header">
              <img src="/img/icon-sirvaos.svg" alt="" />
              <div>
                <span>Acesso seguro</span>
                <h2>Entrar no SirvaOS</h2>
              </div>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <TextField
                autoComplete="email"
                icon={<Mail size={18} />}
                label="E-mail"
                name="email"
                placeholder="admin@suaigreja.org"
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

              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" />
                  <span>Manter conectado</span>
                </label>
                <a href="/">Esqueci a senha</a>
              </div>

              {loginMessage ? (
                <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
              ) : null}

              <Button
                type="submit"
                className="submit-button"
                disabled={loginStatus === "loading"}
                icon={<ArrowRight size={18} />}
              >
                {loginStatus === "loading" ? "Entrando..." : "Acessar painel"}
              </Button>
            </form>

            <div className="divider">
              <span>ou</span>
            </div>

            <Button variant="sso" icon={<Fingerprint size={18} />}>
              Entrar com código seguro
            </Button>
          </div>

          <div className="feature-list" aria-label="Recursos do SirvaOS">
            {features.map(({ icon: Icon, title, text }) => (
              <FeatureItem key={title} icon={<Icon size={20} />} title={title} text={text} />
            ))}
          </div>
        </aside>
      </section>

      <section className="client-dashboard" aria-labelledby="client-dashboard-title">
        <div className="section-heading">
          <span className="eyebrow">
            <Church size={18} />
            Etapa 3 · Admin Cliente/Igreja
          </span>
          <div>
            <h2 id="client-dashboard-title">Painel operacional da igreja</h2>
            <p>
              Primeira base do ambiente onde cada cliente gerencia seus membros,
              módulos, calendário, notificações e identidade visual própria.
            </p>
          </div>
        </div>

        <div className="dashboard-shell">
          <aside className="dashboard-sidebar" aria-label="Navegação do Admin Cliente">
            <div className="client-brand">
              <span>PI</span>
              <div>
                <strong>Primeira Igreja</strong>
                <small>Tema do cliente aplicado</small>
              </div>
            </div>

            <nav>
              {[
                { icon: Activity, label: "Visão geral", active: true },
                { icon: UsersRound, label: "Membros" },
                { icon: CalendarCheck, label: "Calendário" },
                { icon: BellRing, label: "Notificações" },
                { icon: Palette, label: "Identidade" },
              ].map(({ icon: Icon, label, active }) => (
                <button className={active ? "active" : undefined} key={label} type="button">
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="dashboard-content">
            <header className="dashboard-header">
              <div>
                <span>Admin Cliente</span>
                <h3>Resumo desta semana</h3>
              </div>
              <Button icon={<UserPlus size={18} />}>Novo membro</Button>
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
                  <button type="button">Ver todos</button>
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
                      <em className={member.status === "Ativo" ? "success" : "warning"}>
                        {member.status}
                      </em>
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
                    <span>Notificações</span>
                    <h4>Comunicação básica</h4>
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
                    <h4>Logo e cores do cliente</h4>
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
      </section>
    </main>
  );
}
