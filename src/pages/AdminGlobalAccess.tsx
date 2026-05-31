import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";

type GlobalProfile = {
  global_role: "super_admin" | "operations" | "support" | null;
  status: "active" | "invited" | "suspended";
};

const allowedGlobalRoles = new Set(["super_admin", "operations"]);

export function AdminGlobalAccess() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("global_role, status")
      .eq("id", authData.user.id)
      .single<GlobalProfile>();

    if (
      profileError ||
      !profile ||
      profile.status !== "active" ||
      !profile.global_role ||
      !allowedGlobalRoles.has(profile.global_role)
    ) {
      await supabase.auth.signOut();
      setLoginStatus("error");
      setLoginMessage("Usuário autenticado, mas sem permissão para o Admin Global.");
      return;
    }

    setLoginStatus("success");
    setLoginMessage("Acesso autorizado. Dashboard global será carregado na próxima etapa.");
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
