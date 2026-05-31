import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Church,
  Eye,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";

const modules = [
  { name: "Membresia", metric: "12.450", label: "membros organizados" },
  { name: "Louvor", metric: "186", label: "escalas publicadas" },
  { name: "Kids", metric: "72", label: "famílias acompanhadas" },
];

const tenantCards = [
  { name: "Primeira Igreja", status: "Online", modules: "Membresia, Louvor, Financeiro" },
  { name: "Comunidade Vida", status: "Configurando", modules: "Kids, Escola Bíblica" },
  { name: "Igreja Central", status: "Online", modules: "Todos os módulos" },
];

export function App() {
  return (
    <main className="app-shell">
      <section className="brand-panel" aria-label="Apresentação do SirvaOS">
        <nav className="topbar">
          <a className="brand-mark" href="/" aria-label="SirvaOS">
            <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
          </a>

          <div className="nav-actions" aria-label="Acesso rápido">
            <button className="ghost-button" type="button">
              <Sparkles size={17} />
              Demonstração
            </button>
            <button className="ghost-icon" type="button" aria-label="Selecionar idioma">
              PT
              <ChevronDown size={14} />
            </button>
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
              <button className="primary-button" type="button">
                Conhecer o painel
                <ArrowRight size={18} />
              </button>
              <button className="secondary-button" type="button">
                <Smartphone size={18} />
                Ver app do membro
              </button>
            </div>

            <div className="trust-row" aria-label="Pilares do SirvaOS">
              <span>
                <Check size={16} />
                Multi-tenant
              </span>
              <span>
                <Check size={16} />
                White-label
              </span>
              <span>
                <Check size={16} />
                Módulos ativos
              </span>
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
                  <article key={module.name}>
                    <span>{module.name}</span>
                    <strong>{module.metric}</strong>
                    <small>{module.label}</small>
                  </article>
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
                    <em className={tenant.status === "Online" ? "online" : "setup"}>
                      {tenant.status}
                    </em>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="login-panel" aria-label="Login do sistema">
        <div className="login-card">
          <div className="login-card-header">
            <img src="/img/icon-sirvaos.svg" alt="" />
            <div>
              <span>Acesso seguro</span>
              <h2>Entrar no SirvaOS</h2>
            </div>
          </div>

          <form className="login-form">
            <label>
              <span>E-mail</span>
              <div className="field">
                <Mail size={18} />
                <input type="email" placeholder="admin@suaigreja.org" autoComplete="email" />
              </div>
            </label>

            <label>
              <span>Senha</span>
              <div className="field">
                <LockKeyhole size={18} />
                <input type="password" placeholder="Sua senha" autoComplete="current-password" />
                <button type="button" aria-label="Mostrar senha">
                  <Eye size={18} />
                </button>
              </div>
            </label>

            <div className="form-options">
              <label className="remember">
                <input type="checkbox" />
                <span>Manter conectado</span>
              </label>
              <a href="/">Esqueci a senha</a>
            </div>

            <button className="submit-button" type="submit">
              Acessar painel
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="divider">
            <span>ou</span>
          </div>

          <button className="sso-button" type="button">
            <Fingerprint size={18} />
            Entrar com código seguro
          </button>
        </div>

        <div className="feature-list" aria-label="Recursos do SirvaOS">
          <Feature icon={<LayoutDashboard size={20} />} title="Admin Global" text="Gerencie clientes, planos e módulos em um só lugar." />
          <Feature icon={<Network size={20} />} title="White-label" text="Cada igreja usa sua logo, cores e módulos contratados." />
          <Feature icon={<Bell size={20} />} title="Notificações" text="Escalas, eventos e comunicados chegam às pessoas certas." />
          <Feature icon={<CalendarDays size={20} />} title="Calendário único" text="A liderança enxerga a agenda consolidada da igreja." />
          <Feature icon={<UsersRound size={20} />} title="Membros" text="Cadastro central para todos os ministérios e módulos." />
        </div>
      </aside>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="feature-item">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}
