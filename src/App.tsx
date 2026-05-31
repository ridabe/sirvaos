import {
  ArrowRight,
  Check,
  ChevronDown,
  Church,
  Eye,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  Button,
  FeatureItem,
  IconButton,
  MetricCard,
  StatusBadge,
  TextField,
} from "./design-system/components";
import { features, modules, tenantCards } from "./data/landing";

export function App() {
  return (
    <main className="app-shell">
      <section className="brand-panel" aria-label="Apresentação do SirvaOS">
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
            <TextField
              autoComplete="email"
              icon={<Mail size={18} />}
              label="E-mail"
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

            <Button type="submit" className="submit-button" icon={<ArrowRight size={18} />}>
              Acessar painel
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
    </main>
  );
}
