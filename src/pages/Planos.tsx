import { useState } from "react";
import type { FormEvent } from "react";
import "./Planos.css";

// Página pública de planos. Ao escolher um plano, abre o formulário com os dados
// da igreja/contato e chama a Edge Function create-subscription-checkout:
//  - planos automáticos → redireciona para o checkout do AbacatePay
//  - Catedral (manual)  → registra o pedido e mostra confirmação ("Fale com o time")

const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// TODO: trocar pelo link real do app na Google Play quando publicado.
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.com.sirvaos.app";

type PlanCard = {
  code: "starter" | "essencial" | "ultra";
  name: string;
  price: string;
  tagline: string;
  highlight: boolean;
  badge?: string;
  inheritsFrom?: string;
  cta: string;
  features: string[];
};

const PLANS: PlanCard[] = [
  {
    code: "starter",
    name: "Básico",
    price: "R$ 69",
    tagline: "Para igrejas começando",
    highlight: false,
    cta: "Assinar Básico",
    features: [
      "Aplicativo para membros (Android · Google Play)",
      "Até 300 membros cadastrados",
      "1 administrador",
      "Membros, famílias e células/grupos",
      "Eventos e calendário",
      "Comunicados e lembretes por e-mail",
      "Escola Bíblica (EBD)",
      "Financeiro básico",
      "Portal do membro",
      "Relatórios essenciais",
      "Suporte por e-mail",
    ],
  },
  {
    code: "essencial",
    name: "Essencial",
    price: "R$ 89",
    tagline: "Para igrejas em crescimento",
    highlight: true,
    badge: "Mais Popular",
    inheritsFrom: "Básico",
    cta: "Assinar Essencial",
    features: [
      "Até 1.000 membros cadastrados",
      "5 administradores",
      "Comunicados e lembretes por WhatsApp",
      "Louvor e escalas de ministério",
      "Pedidos de intercessão / oração",
      "Kids com check-in seguro",
      "Financeiro completo + conciliação OFX",
      "Administradores de módulo",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
  },
  {
    code: "ultra",
    name: "Ultra",
    price: "R$ 119",
    tagline: "Para igrejas grandes e multi-ministério",
    highlight: false,
    inheritsFrom: "Essencial",
    cta: "Assinar Ultra",
    features: [
      "Até 2.000 membros cadastrados",
      "10 administradores",
      "Dashboard do Pastor + Radar de Cuidado Pastoral",
      "Redes sociais e transmissões online",
      "Escalas e envios ilimitados",
      "Identidade visual personalizada",
      "Histórico e auditoria ampliados",
      "Suporte prioritário",
    ],
  },
];

const CATEDRAL = {
  code: "catedral" as const,
  name: "Catedral",
  price: "R$ 249",
  tagline: "Para grandes igrejas e redes",
  features: [
    "Tudo do Ultra",
    "Membros e administradores ilimitados",
    "API e integrações",
    "Implantação assistida pela equipe",
    "Suporte dedicado",
  ],
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "O aplicativo está incluído em todos os planos?",
    a: "Sim. O app SirvaOS para membros (Android, na Google Play) acompanha todos os planos, do Básico ao Catedral, sem custo adicional.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Pode, a qualquer momento. Ao subir de plano, sua igreja passa a ter acesso imediato aos módulos e limites do novo plano.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "A assinatura é mensal e processada em ambiente seguro pelo AbacatePay. O plano Catedral é liberado de forma assistida pela nossa equipe.",
  },
  {
    q: "Existe fidelidade ou multa?",
    a: "Não há fidelidade. Você pode cancelar quando quiser e mantém o acesso até o fim do período já pago.",
  },
];

type SelectedPlan = { code: string; name: string; price: string; manual: boolean };
type SubmitState = "idle" | "loading" | "manual_done" | "error";

export function Planos() {
  const [selected, setSelected] = useState<SelectedPlan | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function openForm(plan: SelectedPlan) {
    setSelected(plan);
    setSubmitState("idle");
    setErrorMsg("");
  }

  function closeForm() {
    setSelected(null);
    setSubmitState("idle");
    setErrorMsg("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setSubmitState("error");
      setErrorMsg("Configuração indisponível. Tente novamente mais tarde.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      plan_code: selected.code,
      church_name: String(form.get("church_name") ?? "").trim(),
      contact_name: String(form.get("contact_name") ?? "").trim(),
      contact_email: String(form.get("contact_email") ?? "").trim(),
      contact_phone: String(form.get("contact_phone") ?? "").trim(),
      document_number: String(form.get("document_number") ?? "").trim(),
    };

    if (!payload.church_name || !payload.contact_email) {
      setSubmitState("error");
      setErrorMsg("Informe ao menos o nome da igreja e um e-mail de contato.");
      return;
    }

    setSubmitState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-subscription-checkout`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { mode?: string; url?: string; error?: string }
        | null;

      if (!res.ok || !data) {
        setSubmitState("error");
        setErrorMsg("Não foi possível iniciar a assinatura. Tente novamente.");
        return;
      }

      if (data.mode === "manual") {
        setSubmitState("manual_done");
        return;
      }

      if (data.mode === "checkout" && data.url) {
        window.location.assign(data.url); // → AbacatePay
        return;
      }

      setSubmitState("error");
      setErrorMsg("Resposta inesperada do servidor. Tente novamente.");
    } catch {
      setSubmitState("error");
      setErrorMsg("Falha de conexão. Verifique sua internet e tente novamente.");
    }
  }

  return (
    <div className="planos-page">
      <header className="planos-nav">
        <a className="planos-brand" href="/" aria-label="SirvaOS - página inicial">
          Sirva<span>OS</span>
        </a>
        <a className="planos-nav-login" href="/">
          Entrar
        </a>
      </header>

      <section className="planos-hero">
        <span className="planos-eyebrow">Planos e preços</span>
        <h1>Escolha o plano da sua igreja</h1>
        <p>
          Gestão completa de membros, ministérios, escalas, eventos, finanças e
          comunicação — em um só lugar. Sem fidelidade, cancele quando quiser.
        </p>
        <div className="planos-pills" aria-label="Garantias">
          <span>✓ App incluso em todos os planos</span>
          <span>✓ Cobrança mensal segura</span>
          <span>✓ Suporte humano</span>
        </div>
      </section>

      {/* Faixa do app */}
      <section className="planos-appbar">
        <div className="planos-appbar-text">
          <strong>📱 Seus membros no aplicativo SirvaOS</strong>
          <span>
            Disponível na Google Play. Cada membro acessa avisos, eventos, pedidos de oração, escalas,
            contribuições e o Kids da igreja no celular. Incluído em todos os planos.
          </span>
        </div>
        <a className="planos-appbar-cta" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
          Baixar na Google Play
        </a>
      </section>

      {/* Cards */}
      <section className="planos-grid">
        {PLANS.map((plan) => (
          <article key={plan.code} className={`plan-card${plan.highlight ? " plan-card--highlight" : ""}`}>
            {plan.badge ? <div className="plan-badge">⭐ {plan.badge}</div> : null}
            <h2>{plan.name}</h2>
            <p className="plan-tagline">{plan.tagline}</p>
            <div className="plan-price">
              {plan.price} <span>/mês</span>
            </div>
            <button
              type="button"
              className={`plan-cta${plan.highlight ? " plan-cta--highlight" : ""}`}
              onClick={() => openForm({ code: plan.code, name: plan.name, price: plan.price, manual: false })}
            >
              {plan.cta} →
            </button>
            {plan.inheritsFrom ? (
              <div className="plan-inherits">Tudo do {plan.inheritsFrom}, mais:</div>
            ) : (
              <div className="plan-inherits">Inclui:</div>
            )}
            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>
                  <span className="plan-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {/* Catedral — faixa manual */}
      <section className="planos-catedral">
        <div className="planos-catedral-info">
          <h2>
            {CATEDRAL.name} <span className="planos-catedral-price">{CATEDRAL.price}/mês</span>
          </h2>
          <p>{CATEDRAL.tagline}. Liberação assistida pela nossa equipe.</p>
          <ul>
            {CATEDRAL.features.map((f) => (
              <li key={f}>
                <span className="plan-check">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="planos-catedral-cta"
          onClick={() =>
            openForm({ code: CATEDRAL.code, name: CATEDRAL.name, price: CATEDRAL.price, manual: true })
          }
        >
          Falar com o time →
        </button>
      </section>

      {/* FAQ */}
      <section className="planos-faq">
        <h2>Perguntas frequentes</h2>
        <div className="planos-faq-grid">
          {FAQ.map((item) => (
            <article key={item.q} className="planos-faq-item">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Modal de cadastro */}
      {selected ? (
        <div className="planos-modal-backdrop" role="dialog" aria-modal="true" onClick={closeForm}>
          <div className="planos-modal" onClick={(e) => e.stopPropagation()}>
            <button className="planos-modal-close" type="button" aria-label="Fechar" onClick={closeForm}>
              ×
            </button>

            {submitState === "manual_done" ? (
              <div className="planos-modal-done">
                <div className="planos-modal-done-icon">✓</div>
                <h3>Pedido enviado!</h3>
                <p>
                  Recebemos sua solicitação do plano <strong>{selected.name}</strong>. Nossa equipe vai entrar
                  em contato pelo e-mail informado para concluir a ativação.
                </p>
                <button type="button" className="plan-cta" onClick={closeForm}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h3>
                  {selected.manual ? "Solicitar plano " : "Assinar plano "}
                  <strong>{selected.name}</strong>
                </h3>
                <p className="planos-modal-sub">
                  {selected.manual
                    ? "Preencha os dados da igreja. Nossa equipe fará a liberação."
                    : `Preencha os dados da igreja para seguir ao pagamento (${selected.price}/mês).`}
                </p>

                <form className="planos-form" onSubmit={handleSubmit}>
                  <label>
                    Nome da igreja *
                    <input name="church_name" type="text" required placeholder="Igreja Exemplo" />
                  </label>
                  <label>
                    Seu nome *
                    <input name="contact_name" type="text" required placeholder="Nome do responsável" />
                  </label>
                  <label>
                    E-mail *
                    <input name="contact_email" type="email" required placeholder="voce@email.com" />
                  </label>
                  <label>
                    WhatsApp / Telefone
                    <input name="contact_phone" type="tel" placeholder="(11) 99999-9999" />
                  </label>
                  <label>
                    CNPJ / CPF
                    <input name="document_number" type="text" placeholder="Documento da igreja" />
                  </label>

                  {submitState === "error" ? <div className="planos-form-error">{errorMsg}</div> : null}

                  <button type="submit" className="plan-cta plan-cta--highlight" disabled={submitState === "loading"}>
                    {submitState === "loading"
                      ? "Processando…"
                      : selected.manual
                        ? "Enviar pedido →"
                        : "Ir para o pagamento →"}
                  </button>
                  {!selected.manual ? (
                    <p className="planos-form-note">
                      Você será direcionado ao ambiente seguro do AbacatePay para concluir a assinatura no cartão.
                    </p>
                  ) : null}
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}

      <footer className="planos-footer">
        <span>
          Sirva<strong>OS</strong> — organize para servir melhor.
        </span>
      </footer>
    </div>
  );
}
