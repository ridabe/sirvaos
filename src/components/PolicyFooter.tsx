import { ScrollText, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Policy = { terms_text: string; privacy_text: string };
type ModalType = "terms" | "privacy" | null;

type Props = {
  /** Se informado, carrega a política do tenant. Sem ele, carrega a política do sistema. */
  tenantId?: string | null;
  /** Nome exibido no copyright (ex.: nome da igreja). */
  entityName?: string;
  /**
   * "standalone" (padrão): renderiza o elemento <footer> completo com copyright + links.
   * "inline": renderiza apenas os links de política (sem wrapper <footer>), para embutir
   *           dentro de um footer já existente. O modal continua funcionando.
   */
  variant?: "standalone" | "inline";
};

export function PolicyFooter({ tenantId, entityName, variant = "standalone" }: Props) {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [modal, setModal] = useState<ModalType>(null);

  useEffect(() => {
    void loadPolicy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function loadPolicy() {
    if (tenantId) {
      const { data } = await supabase
        .from("tenant_policies")
        .select("terms_text, privacy_text")
        .eq("tenant_id", tenantId)
        .not("published_at", "is", null)
        .maybeSingle<Policy>();
      setPolicy(data ?? null);
    } else {
      const { data } = await supabase
        .from("system_policies")
        .select("terms_text, privacy_text")
        .maybeSingle<Policy>();
      setPolicy(data ?? null);
    }
  }

  const hasTerms = Boolean(policy?.terms_text?.trim());
  const hasPrivacy = Boolean(policy?.privacy_text?.trim());
  const showLinks = hasTerms || hasPrivacy;

  const year = new Date().getFullYear();

  const links = showLinks ? (
    <nav className="policy-footer-links" aria-label="Políticas">
      {hasTerms && (
        <button
          type="button"
          className="policy-footer-link"
          onClick={() => setModal("terms")}
        >
          <ScrollText size={13} />
          Termos de Uso
        </button>
      )}
      {hasPrivacy && (
        <button
          type="button"
          className="policy-footer-link"
          onClick={() => setModal("privacy")}
        >
          <Shield size={13} />
          Política de Privacidade
        </button>
      )}
    </nav>
  ) : null;

  const policyModal = modal && policy ? (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={modal === "terms" ? "Termos de Uso" : "Política de Privacidade"}
      onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
    >
      <div className="modal-card" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <span>Documento legal</span>
            <h2>{modal === "terms" ? "Termos de Uso" : "Política de Privacidade"}</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Fechar"
            onClick={() => setModal(null)}
          >
            <X size={18} />
          </button>
        </div>
        <div
          className="modal-body"
          style={{ maxHeight: "65vh", overflowY: "auto", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, color: "#374151" }}
        >
          {modal === "terms" ? policy.terms_text : policy.privacy_text}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setModal(null)}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Modo inline: apenas os links flutuam dentro de um footer já existente
  if (variant === "inline") {
    return (
      <>
        {links}
        {policyModal}
      </>
    );
  }

  // Modo standalone: footer completo com copyright
  return (
    <>
      <footer className="policy-footer">
        <span className="policy-footer-copy">
          © {year} {entityName ?? (tenantId ? "" : "SirvaOS")}
          {!entityName && !tenantId && " · Todos os direitos reservados"}
        </span>
        {links}
      </footer>
      {policyModal}
    </>
  );
}
