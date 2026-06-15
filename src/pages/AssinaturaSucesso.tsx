import "./Planos.css";

// Página de retorno do AbacatePay (completionUrl). O provisionamento real acontece
// de forma assíncrona pelo webhook; aqui apenas tranquilizamos o cliente.
export function AssinaturaSucesso() {
  return (
    <div className="planos-page">
      <div className="planos-modal-backdrop" style={{ position: "static", background: "transparent", minHeight: "80vh" }}>
        <div className="planos-modal" style={{ textAlign: "center" }}>
          <div className="planos-modal-done-icon">✓</div>
          <h3>Assinatura confirmada!</h3>
          <p style={{ color: "var(--color-neutral-500)", lineHeight: 1.6 }}>
            Recebemos seu pagamento. Estamos preparando o painel da sua igreja — em instantes você receberá um
            <strong> e-mail com os dados de acesso</strong> (verifique também a caixa de spam/promoções).
          </p>
          <a className="plan-cta plan-cta--highlight" href="https://www.sirvaos.com.br" style={{ display: "inline-block", textDecoration: "none" }}>
            Ir para o site
          </a>
        </div>
      </div>
    </div>
  );
}
