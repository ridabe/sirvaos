import "./Produto.css";
import {
  ArrowRight,
  Baby,
  Bell,
  BookOpen,
  CalendarHeart,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  Globe,
  Heart,
  Image,
  Lock,
  MessageCircle,
  Music2,
  PhoneCall,
  PlayCircle,
  ShieldHalf,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

const TOTAL_SLOTS = 47;

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function tick() {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function useSlotsLeft() {
  const [slots, setSlots] = useState(TOTAL_SLOTS);
  useEffect(() => {
    const stored = sessionStorage.getItem("sirvaos_slots");
    const base = stored ? parseInt(stored) : TOTAL_SLOTS;
    setSlots(base);
    const id = setInterval(() => {
      setSlots((prev) => {
        if (prev <= 3) return prev;
        const next = prev - 1;
        sessionStorage.setItem("sirvaos_slots", String(next));
        return next;
      });
    }, 45000);
    return () => clearInterval(id);
  }, []);
  return slots;
}

const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

const modules = [
  {
    id: "membros",
    icon: <Users size={28} />,
    color: "#087c7a",
    colorSoft: "#e0f6f4",
    title: "Cadastro de Membros",
    tagline: "O coração da sua gestão pastoral",
    description:
      "Tenha todos os dados dos seus membros organizados, atualizados e acessíveis. Cadastre com foto, endereço, data de batismo, aniversário, status e vínculos familiares.",
    features: [
      "Ficha completa com histórico espiritual",
      "Controle de status (ativo, inativo, visitante)",
      "Filtros avançados por célula, ministério ou bairro",
      "Relatórios de crescimento e retenção",
      "Notificações automáticas de aniversários",
    ],
    flow: [
      { step: "1", label: "Recepção cadastra o visitante" },
      { step: "2", label: "Líder valida e integra ao sistema" },
      { step: "3", label: "Membro recebe acesso ao portal" },
      { step: "4", label: "Pastores acompanham evolução" },
    ],
  },
  {
    id: "louvor",
    icon: <Music2 size={28} />,
    color: "#7c3aed",
    colorSoft: "#f0ebff",
    title: "Ministério de Louvor",
    tagline: "Escalas, repertório e ensaios sem conflito",
    description:
      "Organize músicos, vocalistas e técnicos com escala automática, repertório de cifras integrado e comunicação direta com os membros da equipe de louvor.",
    features: [
      "Escala inteligente com aviso de conflito",
      "Banco de cifras e letras ilimitado",
      "Confirmação de presença pelo app",
      "Histórico de repertório por culto",
      "Lista de ensaios e recados da equipe",
    ],
    flow: [
      { step: "1", label: "Líder monta a escala do domingo" },
      { step: "2", label: "App notifica cada músico" },
      { step: "3", label: "Músico confirma ou sugere troca" },
      { step: "4", label: "Repertório disponível no app" },
    ],
  },
  {
    id: "kids",
    icon: <Baby size={28} />,
    color: "#d97706",
    colorSoft: "#fff7ed",
    title: "Área Kids",
    tagline: "Segurança total — pais no culto, filhos no coração",
    description:
      "Os pais curtem o culto com tranquilidade sabendo que estão conectados. Se a professora precisar chamar o responsável durante o culto — seja por choro, mal-estar ou qualquer necessidade — uma notificação push chega instantaneamente no celular do pai ou mãe, discretamente, sem precisar sair buscando na plateia.",
    features: [
      "Notificação push discreta para o responsável durante o culto",
      "Check-in e check-out com QR Code exclusivo",
      "Cadastro de alergias e necessidades especiais",
      "Professora comunica sem interromper o culto",
      "Histórico completo por criança e por domingo",
    ],
    flow: [
      { step: "1", label: "Responsável faz check-in na entrada" },
      { step: "2", label: "Sistema gera etiqueta com QR único" },
      { step: "3", label: "Professora envia aviso pelo app" },
      { step: "4", label: "Pai recebe push no celular na hora" },
    ],
  },
  {
    id: "intercessao",
    icon: <Heart size={28} />,
    color: "#dc2626",
    colorSoft: "#fef2f2",
    title: "Intercessão",
    tagline: "Pedidos de oração organizados e sigilosos",
    description:
      "Gerencie pedidos de oração da congregação com privacidade e organização. Intercessores recebem as listas atualizadas e podem registrar os momentos de oração.",
    features: [
      "Envio de pedidos pela web ou app",
      "Controle de privacidade por nível",
      "Distribuição por grupos de intercessão",
      "Registro de orações realizadas",
      "Relatório de pedidos atendidos",
    ],
    flow: [
      { step: "1", label: "Membro envia pedido pelo app" },
      { step: "2", label: "Líder aprova e categoriza" },
      { step: "3", label: "Intercessores recebem notificação" },
      { step: "4", label: "Grupo ora e registra no sistema" },
    ],
  },
  {
    id: "comunicados",
    icon: <Bell size={28} />,
    color: "#0891b2",
    colorSoft: "#ecfeff",
    title: "Comunicados & Agenda",
    tagline: "Toda a comunicação em um canal só",
    description:
      "Envie comunicados segmentados para toda a igreja ou grupos específicos. Gerencie a agenda de eventos, cultos e reuniões com confirmação de presença integrada.",
    features: [
      "Comunicados por push, e-mail ou SMS",
      "Segmentação por ministério ou célula",
      "Agenda pública e restrita por grupo",
      "Confirmação de presença em eventos",
      "Histórico completo de mensagens",
    ],
    flow: [
      { step: "1", label: "Secretaria cria comunicado" },
      { step: "2", label: "Sistema segmenta os destinatários" },
      { step: "3", label: "Membros recebem notificação" },
      { step: "4", label: "Pastor acompanha engajamento" },
    ],
  },
  {
    id: "relatorios",
    icon: <BookOpen size={28} />,
    color: "#059669",
    colorSoft: "#ecfdf5",
    title: "Relatórios & Gestão",
    tagline: "Dados que ajudam pastores a decidir",
    description:
      "Acesse dashboards em tempo real com crescimento de membros, frequência, finanças e engajamento por ministério. Tome decisões baseadas em dados reais.",
    features: [
      "Dashboard ao vivo com KPIs principais",
      "Relatórios exportáveis em PDF e Excel",
      "Comparativo mensal e anual",
      "Mapa de calor de frequência",
      "Alertas de membros inativos",
    ],
    flow: [
      { step: "1", label: "Sistema coleta dados automaticamente" },
      { step: "2", label: "Dashboard atualiza em tempo real" },
      { step: "3", label: "Pastor filtra por período" },
      { step: "4", label: "Relatório exportado para reunião" },
    ],
  },
];

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="pd-countdown-box">
      <span className="pd-countdown-number">{String(value).padStart(2, "0")}</span>
      <span className="pd-countdown-label">{label}</span>
    </div>
  );
}

function FlowStep({ step, label, last }: { step: string; label: string; last?: boolean }) {
  return (
    <div className="pd-flow-step">
      <div className="pd-flow-dot">{step}</div>
      <span>{label}</span>
      {!last && <ChevronRight size={14} className="pd-flow-arrow" />}
    </div>
  );
}

type FormState = "idle" | "sending" | "sent" | "error";

export function Produto() {
  const countdown = useCountdown(deadline);
  const slots = useSlotsLeft();
  const [formState, setFormState] = useState<FormState>("idle");
  const [formMsg, setFormMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");

    const fd = new FormData(e.currentTarget);
    const nome = fd.get("nome") as string;
    const email = fd.get("email") as string;
    const igreja = fd.get("igreja") as string;
    const telefone = fd.get("telefone") as string;
    const membros = fd.get("membros") as string;

    const body = {
      to: "ridabe@uol.com.br",
      subject: `[SirvaOS] Solicitação de teste grátis — ${igreja}`,
      text: `Nome: ${nome}\nE-mail: ${email}\nIgreja/Ministério: ${igreja}\nTelefone: ${telefone}\nNº aprox. de membros: ${membros}`,
    };

    try {
      const res = await fetch("https://formsubmit.co/ajax/ridabe@uol.com.br", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nome,
          email,
          igreja,
          telefone,
          membros,
          _subject: body.subject,
          _captcha: "false",
        }),
      });

      if (res.ok) {
        setFormState("sent");
        setFormMsg("Solicitação enviada! Nossa equipe entrará em contato em até 24h.");
        formRef.current?.reset();
      } else {
        throw new Error("fail");
      }
    } catch {
      setFormState("error");
      setFormMsg("Erro ao enviar. Tente novamente ou envie um e-mail para contato@sirvos.com.br");
    }
  }

  return (
    <div className="pd-root">
      {/* NAV */}
      <nav className="pd-nav">
        <a href="/" className="pd-nav-brand">
          <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" height={32} />
        </a>
        <a href="#trial-form" className="pd-nav-cta">
          <Flame size={16} />
          30 dias grátis
        </a>
      </nav>

      {/* URGENCY BAR */}
      <div className="pd-urgency-bar">
        <Zap size={15} />
        <span>
          Apenas <strong>{slots} vagas</strong> de teste grátis disponíveis este mês — oferta encerra em:
        </span>
        <div className="pd-urgency-countdown">
          <CountdownBox value={countdown.days} label="dias" />
          <span className="pd-urgency-sep">:</span>
          <CountdownBox value={countdown.hours} label="hrs" />
          <span className="pd-urgency-sep">:</span>
          <CountdownBox value={countdown.minutes} label="min" />
          <span className="pd-urgency-sep">:</span>
          <CountdownBox value={countdown.seconds} label="seg" />
        </div>
      </div>

      {/* HERO */}
      <section className="pd-hero">
        <div className="pd-hero-inner">
          <span className="pd-eyebrow">
            <Sparkles size={16} /> Plataforma completa para igrejas e ministérios
          </span>
          <h1 className="pd-hero-title">
            Gerencie sua igreja com a<br />
            <span className="pd-gradient-text">tecnologia que ela merece</span>
          </h1>
          <p className="pd-hero-sub">
            Do cadastro de membros ao ministério de louvor, da Área Kids à intercessão —
            tudo em uma plataforma integrada, acessível pelo navegador <strong>e pelo app mobile</strong>.
          </p>
          <div className="pd-hero-actions">
            <a href="#trial-form" className="pd-btn-primary">
              <Flame size={18} />
              Quero meus 30 dias grátis
            </a>
            <a href="#modulos" className="pd-btn-ghost">
              Ver os módulos
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="pd-hero-badges">
            <span><Check size={14} /> Sem cartão de crédito</span>
            <span><Check size={14} /> Configuração em 24h</span>
            <span><Check size={14} /> Suporte incluso</span>
          </div>
        </div>
        <div className="pd-hero-visual">
          <div className="pd-mockup-wrapper">
            <div className="pd-mockup-web">
              <div className="pd-mockup-bar">
                <span /><span /><span />
                <div className="pd-mockup-url">sirvos.com.br/painel</div>
              </div>
              <div className="pd-mockup-screen">
                <div className="pd-mock-sidebar">
                  {["Membros", "Louvor", "Kids", "Agenda", "Relatórios"].map((l) => (
                    <div key={l} className="pd-mock-nav-item">{l}</div>
                  ))}
                </div>
                <div className="pd-mock-content">
                  <div className="pd-mock-stat-row">
                    {[["847", "membros"], ["94%", "ativos"], ["12", "ministérios"]].map(([v, l]) => (
                      <div key={l} className="pd-mock-stat">
                        <strong>{v}</strong><small>{l}</small>
                      </div>
                    ))}
                  </div>
                  <div className="pd-mock-list">
                    {["Ana Paula · Louvor", "Carlos · Kids", "Marta · Intercessão"].map((m) => (
                      <div key={m} className="pd-mock-row">{m}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="pd-mockup-phone">
              <div className="pd-phone-notch" />
              <div className="pd-phone-screen">
                <div className="pd-phone-header">SirvaOS</div>
                <div className="pd-phone-card">
                  <Music2 size={16} />
                  <span>Escala de louvor</span>
                  <span className="pd-phone-badge">Hoje</span>
                </div>
                <div className="pd-phone-card">
                  <Baby size={16} />
                  <span>Kids · 3 crianças</span>
                  <span className="pd-phone-badge pd-badge-green">Check-in</span>
                </div>
                <div className="pd-phone-card">
                  <Bell size={16} />
                  <span>2 comunicados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="pd-stats-bar">
        {[
          { icon: <Users size={20} />, value: "12.000+", label: "membros gerenciados" },
          { icon: <Globe size={20} />, value: "180+", label: "igrejas ativas" },
          { icon: <Smartphone size={20} />, value: "98%", label: "satisfação no app" },
          { icon: <Star size={20} />, value: "4,9★", label: "avaliação média" },
        ].map(({ icon, value, label }) => (
          <div key={label} className="pd-stat-item">
            {icon}
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* WEB + APP SECTION */}
      <section className="pd-channels">
        <div className="pd-section-inner">
          <h2 className="pd-section-title">Uma plataforma, dois mundos</h2>
          <p className="pd-section-sub">
            Acesse pelo navegador ou pelo app — a experiência é completa nos dois canais.
          </p>
          <div className="pd-channels-grid">
            <div className="pd-channel-card">
              <div className="pd-channel-icon pd-channel-web">
                <Globe size={32} />
              </div>
              <h3>Painel Web</h3>
              <p>
                Para líderes, pastores e secretaria. Acesse de qualquer computador pelo
                navegador sem instalar nada. Gerencie membros, escalas, relatórios e
                comunicados com uma interface completa.
              </p>
              <ul className="pd-channel-list">
                <li><Check size={14} /> Dashboard administrativo completo</li>
                <li><Check size={14} /> Gestão de múltiplos ministérios</li>
                <li><Check size={14} /> Relatórios e exportação de dados</li>
                <li><Check size={14} /> Configurações avançadas da igreja</li>
              </ul>
            </div>
            <div className="pd-channel-card pd-channel-featured">
              <div className="pd-channel-badge"><Flame size={13} /> Mais usado</div>
              <div className="pd-channel-icon pd-channel-app">
                <Smartphone size={32} />
              </div>
              <h3>App Mobile</h3>
              <p>
                Para membros, músicos e voluntários. O app SirvaOS conecta toda a
                comunidade com notificações em tempo real, cifras, escalas, pedidos de
                oração e muito mais no bolso de cada membro.
              </p>
              <ul className="pd-channel-list">
                <li><Check size={14} /> Notificações push instantâneas</li>
                <li><Check size={14} /> Cifras e escalas offline</li>
                <li><Check size={14} /> Check-in da Área Kids</li>
                <li><Check size={14} /> Pedidos de intercessão</li>
              </ul>
            </div>
            <div className="pd-channel-card">
              <div className="pd-channel-icon pd-channel-admin">
                <BookOpen size={32} />
              </div>
              <h3>Área Administrativa</h3>
              <p>
                Para líderes sênior e pastores. Visão 360° da saúde da igreja com
                relatórios consolidados, alertas automáticos e configuração granular
                de permissões por ministério.
              </p>
              <ul className="pd-channel-list">
                <li><Check size={14} /> Controle de acesso por função</li>
                <li><Check size={14} /> Auditoria de ações no sistema</li>
                <li><Check size={14} /> Dados isolados por congregação</li>
                <li><Check size={14} /> Suporte premium dedicado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="pd-modules" id="modulos">
        <div className="pd-section-inner">
          <span className="pd-eyebrow pd-eyebrow-center">
            <Sparkles size={15} /> Módulos do sistema
          </span>
          <h2 className="pd-section-title">Cada ministério tem seu espaço</h2>
          <p className="pd-section-sub">
            Ative apenas os módulos que a sua igreja usa. Sem cobranças por funcionalidade
            que você não precisa.
          </p>

          <div className="pd-modules-list">
            {modules.map((mod, i) => (
              <div key={mod.id} className={`pd-module-card ${i % 2 === 1 ? "pd-module-reverse" : ""}`}>
                <div className="pd-module-info">
                  <div className="pd-module-icon" style={{ background: mod.colorSoft, color: mod.color }}>
                    {mod.icon}
                  </div>
                  <span className="pd-module-tagline" style={{ color: mod.color }}>
                    {mod.tagline}
                  </span>
                  <h3 className="pd-module-title">{mod.title}</h3>
                  <p className="pd-module-desc">{mod.description}</p>
                  <ul className="pd-module-features">
                    {mod.features.map((f) => (
                      <li key={f}>
                        <CheckCircle size={15} style={{ color: mod.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pd-module-flow-panel">
                  <div className="pd-flow-title">Como funciona</div>
                  <div className="pd-flow-steps">
                    {mod.flow.map((s, idx) => (
                      <FlowStep key={s.step} step={s.step} label={s.label} last={idx === mod.flow.length - 1} />
                    ))}
                  </div>
                  <div className="pd-flow-visual" style={{ borderColor: mod.color + "33" }}>
                    <div className="pd-flow-visual-header" style={{ background: mod.colorSoft, color: mod.color }}>
                      {mod.icon}
                      <strong>{mod.title}</strong>
                    </div>
                    <div className="pd-flow-nodes">
                      {mod.flow.map((s, idx) => (
                        <div key={s.step} className="pd-flow-node">
                          <div className="pd-node-dot" style={{ background: mod.color }}>{s.step}</div>
                          <div className="pd-node-label">{s.label}</div>
                          {idx < mod.flow.length - 1 && (
                            <div className="pd-node-line" style={{ background: mod.color + "40" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEMBER APP PORTAL */}
      <section className="pd-memberapp" id="app-membro">
        <div className="pd-section-inner">
          <span className="pd-eyebrow pd-eyebrow-center pd-eyebrow-light">
            <Smartphone size={15} /> Portal do Membro · App Mobile
          </span>
          <h2 className="pd-section-title pd-title-light">A igreja na palma da mão de cada membro</h2>
          <p className="pd-section-sub pd-sub-light">
            Muito mais que avisos: o app SirvaOS aproxima cada membro da vida da igreja,
            em tempo real, todos os dias da semana.
          </p>

          <div className="pd-memberapp-grid">
            <div className="pd-memberapp-features">
              <div className="pd-mafeature">
                <div className="pd-mafeature-icon"><Image size={22} /></div>
                <div>
                  <strong>Mídias da igreja na hora</strong>
                  <p>Pregações, estudos, fotos dos cultos e vídeos especiais — toda a biblioteca de conteúdo disponível para assistir e compartilhar quando quiser.</p>
                </div>
              </div>
              <div className="pd-mafeature">
                <div className="pd-mafeature-icon"><Bell size={22} /></div>
                <div>
                  <strong>Informações em tempo real</strong>
                  <p>Eventos, anúncios, mudanças de horário e novidades chegam instantaneamente. O membro nunca mais perde um aviso importante da igreja.</p>
                </div>
              </div>
              <div className="pd-mafeature">
                <div className="pd-mafeature-icon"><MessageCircle size={22} /></div>
                <div>
                  <strong>Comunicação direta e instantânea</strong>
                  <p>Um canal direto entre membro e liderança. Tire dúvidas, confirme presença e fale com a igreja em tempo real, sem depender de grupos lotados.</p>
                </div>
              </div>
              <div className="pd-mafeature">
                <div className="pd-mafeature-icon"><CalendarHeart size={22} /></div>
                <div>
                  <strong>Agenda viva da igreja</strong>
                  <p>Próximos cultos, conferências e encontros sempre atualizados, com lembretes automáticos e confirmação de presença em um toque.</p>
                </div>
              </div>
            </div>

            <div className="pd-memberapp-phone">
              <div className="pd-maphone-frame">
                <div className="pd-maphone-notch" />
                <div className="pd-maphone-screen">
                  <div className="pd-maphone-top">
                    <span className="pd-maphone-hi">Olá, Beatriz 👋</span>
                    <span className="pd-maphone-church">Igreja Viva</span>
                  </div>
                  <div className="pd-maphone-media">
                    <PlayCircle size={26} />
                    <span>Culto de Domingo — ao vivo</span>
                  </div>
                  <div className="pd-maphone-section-title">Próximos eventos</div>
                  <div className="pd-maphone-event">
                    <div className="pd-maphone-event-date"><strong>12</strong><small>JUN</small></div>
                    <div><strong>Conferência de Famílias</strong><span>19h30 · Templo</span></div>
                  </div>
                  <div className="pd-maphone-event">
                    <div className="pd-maphone-event-date"><strong>15</strong><small>JUN</small></div>
                    <div><strong>Encontro de Jovens</strong><span>20h · Anexo</span></div>
                  </div>
                  <div className="pd-maphone-chat">
                    <MessageCircle size={15} />
                    <span>Pra. Helena: "Te esperamos hoje! 🙏"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* REAL PEOPLE PHOTOS */}
          <div className="pd-people-strip">
            <div className="pd-people-strip-label">
              <Users size={16} /> No celular ou no computador — a igreja conectada todos os dias
            </div>
            <div className="pd-people-photos">
              {[
                { url: "https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=480&q=80&auto=format&fit=crop", cap: "Acompanhando os avisos pelo app" },
                { url: "https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=480&q=80&auto=format&fit=crop", cap: "Em contato direto com a igreja" },
                { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=480&q=80&auto=format&fit=crop", cap: "Equipe administrando o sistema" },
                { url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=480&q=80&auto=format&fit=crop", cap: "Gestão completa pelo painel web" },
              ].map(({ url, cap }) => (
                <figure key={url} className="pd-people-photo">
                  <img src={url} alt={cap} loading="lazy" />
                  <figcaption>{cap}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TREASURY / DÍZIMOS */}
      <section className="pd-treasury" id="tesouraria">
        <div className="pd-section-inner">
          <div className="pd-treasury-grid">
            <div className="pd-treasury-visual">
              <div className="pd-treasury-card-main">
                <div className="pd-treasury-card-head">
                  <DollarSign size={20} />
                  <span>Dízimos & Ofertas</span>
                  <span className="pd-treasury-lock"><Lock size={13} /> Acesso restrito</span>
                </div>
                <div className="pd-treasury-amount">
                  <small>Arrecadação do mês</small>
                  <strong>R$ 48.720,00</strong>
                  <span className="pd-treasury-up">▲ 12% vs. mês anterior</span>
                </div>
                <div className="pd-treasury-rows">
                  <div className="pd-treasury-row"><span>Dízimos</span><strong>R$ 39.150,00</strong></div>
                  <div className="pd-treasury-row"><span>Ofertas</span><strong>R$ 7.320,00</strong></div>
                  <div className="pd-treasury-row"><span>Missões</span><strong>R$ 2.250,00</strong></div>
                </div>
              </div>
              <div className="pd-treasury-perm">
                <div className="pd-treasury-perm-title"><ShieldHalf size={15} /> Quem pode acessar</div>
                <div className="pd-perm-item"><span className="pd-perm-avatar">P</span> Pr. Titular <em className="pd-perm-on">Autorizado</em></div>
                <div className="pd-perm-item"><span className="pd-perm-avatar">T</span> Tesoureiro <em className="pd-perm-on">Autorizado</em></div>
                <div className="pd-perm-item"><span className="pd-perm-avatar">S</span> Secretário <em className="pd-perm-off">Sem acesso</em></div>
              </div>
            </div>

            <div className="pd-treasury-info">
              <span className="pd-eyebrow">
                <Lock size={15} /> Controle financeiro seguro
              </span>
              <h2>Tesouraria sob controle total do administrador</h2>
              <p>
                O administrador do sistema tem acesso completo à área de <strong>Dízimos e
                Ofertas</strong> e decide, com total autonomia, <strong>quem mais pode
                visualizar ou gerenciar</strong> as finanças da igreja.
              </p>
              <ul className="pd-treasury-list">
                <li><CheckCircle size={16} /> Registro de dízimos, ofertas e campanhas</li>
                <li><CheckCircle size={16} /> Autorização individual de acesso à tesouraria</li>
                <li><CheckCircle size={16} /> Relatórios financeiros e prestação de contas</li>
                <li><CheckCircle size={16} /> Histórico auditável de cada lançamento</li>
                <li><CheckCircle size={16} /> Sigilo garantido — só vê quem o pastor liberar</li>
              </ul>
              <div className="pd-treasury-note">
                <ShieldHalf size={18} />
                <span>Nenhum dado financeiro é exibido sem autorização expressa do administrador.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* URGENCY BLOCK */}
      <section className="pd-urgency-section">
        <div className="pd-urgency-inner">
          <Flame size={40} className="pd-urgency-icon" />
          <h2>Restam apenas <span className="pd-urgency-slots">{slots} vagas</span> para o teste grátis</h2>
          <p>
            Cada mês liberamos um número limitado de testes para garantir onboarding
            com qualidade. Não deixe para amanhã.
          </p>
          <div className="pd-urgency-timer">
            <CountdownBox value={countdown.days} label="dias" />
            <span className="pd-urgency-sep pd-sep-large">:</span>
            <CountdownBox value={countdown.hours} label="horas" />
            <span className="pd-urgency-sep pd-sep-large">:</span>
            <CountdownBox value={countdown.minutes} label="minutos" />
            <span className="pd-urgency-sep pd-sep-large">:</span>
            <CountdownBox value={countdown.seconds} label="segundos" />
          </div>
          <a href="#trial-form" className="pd-btn-primary pd-btn-large">
            <Flame size={20} />
            Garantir minha vaga agora
          </a>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="pd-testimonials">
        <div className="pd-section-inner">
          <h2 className="pd-section-title">Pastores que já transformaram sua gestão</h2>
          <div className="pd-testimonials-grid">
            {[
              {
                name: "Pr. Ricardo Alves",
                role: "Pastor Titular · Igreja da Graça, SP",
                text: "Antes perdíamos horas toda semana com planilhas. Hoje o SirvaOS faz isso em minutos. Nossa secretaria agradece todos os dias.",
                stars: 5,
              },
              {
                name: "Líder Ana Costa",
                role: "Coordenadora de Louvor · Ministério Ágape, MG",
                text: "A escala de louvor com confirmação no app mudou tudo. Zero ligação na sexta à noite perguntando quem confirma no domingo.",
                stars: 5,
              },
              {
                name: "Pr. Jonas Ferreira",
                role: "Pastor de Jovens · Comunidade Viva, RJ",
                text: "O módulo de Kids com QR Code deu uma profissionalidade enorme para nossa Escola Bíblica. Os pais ficaram impressionados.",
                stars: 5,
              },
            ].map(({ name, role, text, stars }) => (
              <div key={name} className="pd-testimonial-card">
                <div className="pd-testimonial-stars">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p>"{text}"</p>
                <div className="pd-testimonial-author">
                  <div className="pd-testimonial-avatar">{name[0]}</div>
                  <div>
                    <strong>{name}</strong>
                    <span>{role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRIAL FORM */}
      <section className="pd-form-section" id="trial-form">
        <div className="pd-form-wrapper">
          <div className="pd-form-left">
            <span className="pd-eyebrow">
              <Flame size={15} /> Oferta por tempo limitado
            </span>
            <h2>30 dias de teste<br /><span className="pd-gradient-text">completamente grátis</span></h2>
            <p>
              Sem cartão de crédito. Sem compromisso. Sua igreja começa a usar
              em até 24h após o contato da nossa equipe.
            </p>
            <ul className="pd-form-benefits">
              <li><Check size={16} /> Acesso completo a todos os módulos</li>
              <li><Check size={16} /> Suporte via WhatsApp incluso</li>
              <li><Check size={16} /> Migração de dados assistida</li>
              <li><Check size={16} /> Treinamento da equipe incluso</li>
              <li><Check size={16} /> Sem fidelidade após o teste</li>
            </ul>
            <div className="pd-form-urgency-mini">
              <Clock size={16} />
              <span>Apenas <strong>{slots} vagas</strong> restantes este mês</span>
            </div>
          </div>
          <div className="pd-form-right">
            <div className="pd-form-card">
              <h3>Solicitar teste grátis</h3>
              <p className="pd-form-card-sub">
                Nossa equipe entrará em contato em até <strong>24 horas</strong>.
              </p>
              {formState === "sent" ? (
                <div className="pd-form-success">
                  <CheckCircle size={48} />
                  <strong>Solicitação enviada!</strong>
                  <p>{formMsg}</p>
                </div>
              ) : (
                <form className="pd-trial-form" onSubmit={handleSubmit} ref={formRef}>
                  <label>
                    <span>Seu nome completo *</span>
                    <input name="nome" type="text" placeholder="Ex: João da Silva" required />
                  </label>
                  <label>
                    <span>E-mail *</span>
                    <input name="email" type="email" placeholder="joao@suaigreja.com.br" required />
                  </label>
                  <label>
                    <span>Nome da Igreja / Ministério *</span>
                    <input name="igreja" type="text" placeholder="Ex: Igreja Batista Central" required />
                  </label>
                  <label>
                    <span>WhatsApp / Telefone *</span>
                    <input name="telefone" type="tel" placeholder="(11) 99999-9999" required />
                  </label>
                  <label>
                    <span>Número aproximado de membros</span>
                    <select name="membros">
                      <option value="">Selecione</option>
                      <option>Até 50</option>
                      <option>50 a 200</option>
                      <option>200 a 500</option>
                      <option>500 a 1.000</option>
                      <option>Acima de 1.000</option>
                    </select>
                  </label>
                  {formState === "error" && (
                    <p className="pd-form-error">{formMsg}</p>
                  )}
                  <button type="submit" className="pd-btn-primary pd-btn-full" disabled={formState === "sending"}>
                    {formState === "sending" ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <PhoneCall size={18} />
                        Quero meu teste grátis agora
                      </>
                    )}
                  </button>
                  <p className="pd-form-disclaimer">
                    Ao enviar, você concorda em receber contato da nossa equipe.
                    Sem spam. Prometemos.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pd-footer">
        <div className="pd-footer-inner">
          <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" height={28} />
          <p>© {new Date().getFullYear()} SirvaOS · <a href="https://sirvos.com.br">sirvos.com.br</a></p>
          <p className="pd-footer-sub">Plataforma operacional para igrejas e ministérios</p>
        </div>
      </footer>
    </div>
  );
}
