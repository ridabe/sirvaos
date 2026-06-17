/**
 * Ebooks.tsx — Rota /ebooks
 * Landing page pública da série "Os 5 Pilares da Gestão Eclesiástica"
 * Segue a identidade visual do Sirva OS (verde-teal #0E6B68, Inter, design system próprio)
 */

import { BookOpen, Check, ChevronRight, Download, Sparkles, Star, Users } from "lucide-react";
import { useState } from "react";
import {
  EBOOKS,
  getAllPdfSignedUrls,
  getCoverPublicUrl,
  insertEbookLead,
} from "../lib/ebooksSupabase";
import "./Ebooks.css";

type FormState = "idle" | "loading" | "success" | "error";

interface DownloadEntry {
  id: number;
  volume: string;
  title: string;
  coverUrl: string;
  signedUrl: string;
}

export function Ebooks() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [leadName, setLeadName] = useState("");
  const [showDownloads, setShowDownloads] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<Set<number>>(new Set());

  function openModal() {
    setModalOpen(true);
    setFormState("idle");
    setFormError("");
  }

  function closeModal() {
    if (formState === "loading") return;
    setModalOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setFormError("Por favor, informe seu nome completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError("Por favor, informe um e-mail válido.");
      return;
    }

    setFormState("loading");

    try {
      // 1. Salvar lead no Supabase
      const { ok, error: insertError } = await insertEbookLead({
        name: trimmedName,
        email: trimmedEmail,
        ebook_title: "Série Completa — Os 5 Pilares da Gestão Eclesiástica",
      });

      if (!ok) {
        console.warn("[ebooks] Falha ao salvar lead:", insertError);
        // Não bloquear o download por falha no registro
      }

      // 2. Gerar URLs assinadas para todos os PDFs
      const signedUrls = await getAllPdfSignedUrls(86400); // 24h

      const entries: DownloadEntry[] = EBOOKS.map((ebook) => ({
        id: ebook.id,
        volume: ebook.volume,
        title: ebook.title,
        coverUrl: getCoverPublicUrl(ebook.coverPath),
        signedUrl: signedUrls[ebook.id] ?? "",
      }));

      setDownloads(entries);
      setLeadName(trimmedName);
      setFormState("success");

      // Fechar modal e mostrar área de downloads após breve delay
      setTimeout(() => {
        setModalOpen(false);
        setShowDownloads(true);
        // Scroll suave para a seção de downloads
        setTimeout(() => {
          document.getElementById("ebooks-downloads")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }, 1200);
    } catch (err) {
      console.error("[ebooks] Erro inesperado:", err);
      setFormState("error");
      setFormError("Ocorreu um erro inesperado. Tente novamente.");
    }
  }

  function handleDownload(entry: DownloadEntry) {
    if (!entry.signedUrl) return;
    window.open(entry.signedUrl, "_blank", "noopener,noreferrer");
    setDownloadedIds((prev) => {
      const next = new Set(prev);
      next.add(entry.id);
      return next;
    });
  }

  function handleDownloadAll() {
    downloads.forEach((entry, idx) => {
      if (!entry.signedUrl) return;
      setTimeout(() => {
        window.open(entry.signedUrl, "_blank", "noopener,noreferrer");
        setDownloadedIds((prev) => {
          const next = new Set(prev);
          next.add(entry.id);
          return next;
        });
      }, idx * 700);
    });
  }

  const firstName = leadName.split(" ")[0];

  return (
    <div className="ebooks-page">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="ebooks-hero">
        {/* Ornamentos de fundo */}
        <div className="ebooks-hero__orb ebooks-hero__orb--1" />
        <div className="ebooks-hero__orb ebooks-hero__orb--2" />

        <div className="ebooks-container">
          {/* Breadcrumb */}
          <nav className="ebooks-breadcrumb">
            <a href="/" className="ebooks-breadcrumb__link">Sirva OS</a>
            <ChevronRight size={14} />
            <span>Ebooks</span>
          </nav>

          <div className="ebooks-hero__content">
            {/* Badge */}
            <div className="ebooks-badge">
              <Star size={13} fill="currentColor" />
              <span>Série Gratuita de Ebooks</span>
            </div>

            <h1 className="ebooks-hero__title">
              Os 5 Pilares da{" "}
              <em>Gestão Eclesiástica</em>
            </h1>

            {/* Ornamento */}
            <div className="ebooks-hero__ornament">
              <span />
              <span className="ebooks-hero__ornament-dot" />
              <span />
            </div>

            <p className="ebooks-hero__subtitle">
              Uma coleção completa de guias práticos para líderes, pastores e administradores que desejam profissionalizar a gestão da sua congregação — totalmente gratuita.
            </p>

            {/* Benefícios */}
            <div className="ebooks-benefits">
              {[
                "5 ebooks práticos e gratuitos",
                "Adaptado à realidade das igrejas",
                "Templates prontos para usar",
                "Acesso imediato após o cadastro",
              ].map((b) => (
                <div key={b} className="ebooks-benefit-item">
                  <Check size={14} />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <button className="ebooks-btn-primary ebooks-btn-lg" onClick={openModal}>
              <Download size={18} />
              Baixar a Série Completa — Grátis
            </button>
            <p className="ebooks-hero__disclaimer">
              Sem spam. Apenas conteúdo relevante para sua liderança.
            </p>
          </div>
        </div>

        {/* Divisor ondulado */}
        <div className="ebooks-hero__wave">
          <svg viewBox="0 0 1440 56" fill="none" preserveAspectRatio="none">
            <path d="M0 56L60 46C120 36 240 16 360 11C480 6 600 16 720 21C840 26 960 26 1080 21C1200 16 1320 6 1380 3L1440 0V56H0Z" fill="#F7FAF9" />
          </svg>
        </div>
      </section>

      {/* ─── DOWNLOADS (pós-captura) ───────────────────────────────────────── */}
      {showDownloads && (
        <section id="ebooks-downloads" className="ebooks-downloads-section">
          <div className="ebooks-container">
            <div className="ebooks-downloads-header">
              <div className="ebooks-success-icon">
                <Check size={28} />
              </div>
              <h2 className="ebooks-downloads-title">
                {firstName ? `Parabéns, ${firstName}!` : "Parabéns!"}
              </h2>
              <p className="ebooks-downloads-subtitle">
                Seus 5 ebooks estão prontos. Clique em cada um para baixar ou use o botão abaixo para baixar todos de uma vez.
              </p>
              <button className="ebooks-btn-primary" onClick={handleDownloadAll}>
                <Download size={16} />
                Baixar Todos os 5 Ebooks
              </button>
            </div>

            <div className="ebooks-download-list">
              {downloads.map((entry) => (
                <div
                  key={entry.id}
                  className={`ebooks-download-item ${downloadedIds.has(entry.id) ? "ebooks-download-item--done" : ""}`}
                >
                  <div className="ebooks-download-cover">
                    <img
                      src={entry.coverUrl}
                      alt={entry.volume}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    {downloadedIds.has(entry.id) && (
                      <div className="ebooks-download-cover__overlay">
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                  <div className="ebooks-download-info">
                    <span className="ebooks-volume-badge">{entry.volume}</span>
                    <p className="ebooks-download-title">{entry.title}</p>
                  </div>
                  <button
                    className={downloadedIds.has(entry.id) ? "ebooks-btn-done" : "ebooks-btn-download"}
                    onClick={() => handleDownload(entry)}
                    disabled={!entry.signedUrl}
                  >
                    {downloadedIds.has(entry.id) ? (
                      <><Check size={14} /> Baixado</>
                    ) : (
                      <><Download size={14} /> Baixar</>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="ebooks-reading-tip">
              <BookOpen size={20} />
              <div>
                <strong>Dica de leitura:</strong> Comece pelo <strong>Vol. 1 — Gestão Financeira</strong>, o tema de maior impacto imediato para a maioria das congregações. Os links são válidos por 24 horas.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── GRID DE EBOOKS ───────────────────────────────────────────────── */}
      <section className="ebooks-grid-section">
        <div className="ebooks-container">
          <div className="ebooks-section-header">
            <p className="ebooks-section-label">A Série Completa</p>
            <h2 className="ebooks-section-title">Cinco volumes, um propósito</h2>
            <p className="ebooks-section-desc">
              Cada ebook aborda um pilar essencial da administração eclesiástica, com linguagem acessível e exemplos práticos da realidade das igrejas brasileiras.
            </p>
          </div>

          <div className="ebooks-grid">
            {EBOOKS.map((ebook) => (
              <article
                key={ebook.id}
                className="ebooks-card"
                onClick={openModal}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openModal()}
              >
                <div className="ebooks-card__cover">
                  <img
                    src={getCoverPublicUrl(ebook.coverPath)}
                    alt={`Capa ${ebook.volume}`}
                    loading="lazy"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = "none";
                    }}
                  />
                  <span className="ebooks-card__volume">{ebook.volume}</span>
                  <div className="ebooks-card__hover-overlay">
                    <Download size={16} /> Baixar grátis
                  </div>
                </div>
                <div className="ebooks-card__body">
                  <h3 className="ebooks-card__title">{ebook.title}</h3>
                  <p className="ebooks-card__desc">{ebook.description}</p>
                  <div className="ebooks-card__topics">
                    {ebook.topics.slice(0, 2).map((t) => (
                      <span key={t} className="ebooks-topic-tag">{t}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}

            {/* Card CTA */}
            <article className="ebooks-card ebooks-card--cta" onClick={openModal} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openModal()}>
              <div className="ebooks-card-cta__icon">
                <Download size={28} />
              </div>
              <h3 className="ebooks-card-cta__title">Acesse a Série Completa</h3>
              <p className="ebooks-card-cta__desc">Cadastre-se gratuitamente e baixe todos os 5 volumes de uma vez.</p>
              <button className="ebooks-btn-primary">
                Quero baixar grátis <ChevronRight size={16} />
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* ─── SOBRE A SÉRIE ────────────────────────────────────────────────── */}
      <section className="ebooks-about-section">
        <div className="ebooks-container">
          <div className="ebooks-about-inner">
            <p className="ebooks-section-label">Por que esta série?</p>
            <h2 className="ebooks-section-title">Gestão profissional a serviço do Reino</h2>
            <p className="ebooks-about-text">
              A maioria dos líderes eclesiásticos tem um coração apaixonado pelo ministério, mas enfrenta desafios reais na administração da congregação. Esta série foi criada para preencher essa lacuna — com linguagem prática, exemplos reais de igrejas e ferramentas que você pode aplicar imediatamente.
            </p>
            <div className="ebooks-stats">
              {[
                { value: "5", label: "Volumes" },
                { value: "100%", label: "Gratuito" },
                { value: "Prático", label: "e Aplicável" },
              ].map((s) => (
                <div key={s.label} className="ebooks-stat-card">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SIRVA OS ─────────────────────────────────────────────────── */}
      <section className="ebooks-cta-section">
        <div className="ebooks-container">
          <div className="ebooks-cta-box">
            <div className="ebooks-cta-box__orb ebooks-cta-box__orb--1" />
            <div className="ebooks-cta-box__orb ebooks-cta-box__orb--2" />
            <div className="ebooks-cta-box__content">
              <span className="ebooks-cta-badge">
                <Sparkles size={13} /> Próximo Passo
              </span>
              <h2 className="ebooks-cta-title">
                Leve a gestão da sua igreja para o próximo nível
              </h2>
              <p className="ebooks-cta-desc">
                O <strong>Sirva OS</strong> é o sistema de gestão eclesiástica completo que centraliza finanças, pessoas, comunicação e planejamento em uma única plataforma — desenvolvido especialmente para igrejas brasileiras.
              </p>
              <div className="ebooks-cta-actions">
                <a href="/" className="ebooks-btn-primary">
                  Conhecer o Sirva OS <ChevronRight size={16} />
                </a>
                <button className="ebooks-btn-outline-white" onClick={openModal}>
                  <Download size={16} /> Baixar os Ebooks Grátis
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="ebooks-footer">
        <div className="ebooks-container">
          <div className="ebooks-footer__inner">
            <div>
              <p className="ebooks-footer__brand">Os 5 Pilares da Gestão Eclesiástica</p>
              <p className="ebooks-footer__sub">Série gratuita de ebooks para líderes e pastores</p>
            </div>
            <p className="ebooks-footer__credit">
              Uma iniciativa do{" "}
              <a href="/">Sirva OS</a>
            </p>
          </div>
        </div>
      </footer>

      {/* ─── MODAL DE CAPTURA ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="ebooks-modal-overlay" onClick={closeModal}>
          <div className="ebooks-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="ebooks-modal__header">
              <div className="ebooks-modal__icon">
                <Download size={22} />
              </div>
              <h2 className="ebooks-modal__title">Acesso Gratuito</h2>
              <p className="ebooks-modal__subtitle">
                Preencha seus dados para baixar a série completa de 5 ebooks
              </p>
            </div>

            {/* Formulário */}
            <form className="ebooks-modal__form" onSubmit={handleSubmit}>
              {formState === "success" ? (
                <div className="ebooks-modal__success">
                  <div className="ebooks-success-icon ebooks-success-icon--sm">
                    <Check size={20} />
                  </div>
                  <p>Preparando seus downloads...</p>
                </div>
              ) : (
                <>
                  <div className="ebooks-field">
                    <label htmlFor="ebooks-name">Nome completo</label>
                    <input
                      id="ebooks-name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={formState === "loading"}
                      autoComplete="name"
                    />
                  </div>
                  <div className="ebooks-field">
                    <label htmlFor="ebooks-email">E-mail</label>
                    <input
                      id="ebooks-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={formState === "loading"}
                      autoComplete="email"
                    />
                  </div>

                  {formError && (
                    <p className="ebooks-form-error">{formError}</p>
                  )}

                  <button
                    type="submit"
                    className="ebooks-btn-primary ebooks-btn-full"
                    disabled={formState === "loading"}
                  >
                    {formState === "loading" ? (
                      <span className="ebooks-spinner-row">
                        <span className="ebooks-spinner" />
                        Preparando downloads...
                      </span>
                    ) : (
                      <><Download size={16} /> Baixar os 5 Ebooks Grátis</>
                    )}
                  </button>

                  <p className="ebooks-modal__privacy">
                    Seus dados estão seguros. Não compartilhamos com terceiros.
                  </p>
                </>
              )}
            </form>

            {/* Fechar */}
            {formState !== "loading" && (
              <button className="ebooks-modal__close" onClick={closeModal} aria-label="Fechar">
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
