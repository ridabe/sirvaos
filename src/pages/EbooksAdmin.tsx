/**
 * EbooksAdmin.tsx — Rota /ebooks/admin
 * Área administrativa para visualização e exportação de leads capturados
 */

import { Download, FileText, Search, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAllEbookLeads, type EbookLead } from "../lib/ebooksSupabase";
import { supabase } from "../lib/supabase";
import "./EbooksAdmin.css";

export function EbooksAdmin() {
  const [leads, setLeads] = useState<EbookLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");

  // Verificar autenticação e papel de admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setAuthChecking(false);
        return;
      }
      // Verificar se é admin via metadata ou email do owner
      const role = user.user_metadata?.global_role ?? user.app_metadata?.global_role;
      const isOwner = user.email === import.meta.env.NEXT_PUBLIC_OWNER_EMAIL;
      if (role === "super_admin" || role === "admin" || isOwner) {
        setIsAdmin(true);
      }
      setAuthChecking(false);
    });
  }, []);

  // Carregar leads quando autenticado como admin
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    getAllEbookLeads().then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.ebook_title ?? "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  function exportCsv() {
    const header = "ID,Nome,E-mail,Ebook,Data\n";
    const rows = leads
      .map((l) => {
        const date = l.created_at
          ? new Date(l.created_at).toLocaleString("pt-BR")
          : "";
        const title = (l.ebook_title ?? "").replace(/,/g, ";");
        return `${l.id ?? ""},"${l.name}","${l.email}","${title}","${date}"`;
      })
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_ebooks_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Loading de autenticação ──────────────────────────────────────────────
  if (authChecking) {
    return (
      <div className="ebadmin-loading">
        <div className="ebadmin-spinner" />
        <p>Verificando acesso...</p>
      </div>
    );
  }

  // ── Não autenticado ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="ebadmin-denied">
        <div className="ebadmin-denied__icon">🔒</div>
        <h1>Acesso Restrito</h1>
        <p>Esta área é exclusiva para administradores do Sirva OS.</p>
        <a href="/" className="ebadmin-btn-primary">Voltar ao início</a>
      </div>
    );
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const uniqueEmails = new Set(leads.map((l) => l.email)).size;
  const today = new Date().toDateString();
  const todayLeads = leads.filter(
    (l) => l.created_at && new Date(l.created_at).toDateString() === today
  ).length;

  return (
    <div className="ebadmin-page">
      {/* Header */}
      <header className="ebadmin-header">
        <div className="ebadmin-container">
          <div className="ebadmin-header__inner">
            <div>
              <p className="ebadmin-header__label">Painel Administrativo</p>
              <h1 className="ebadmin-header__title">Leads — Os 5 Pilares</h1>
            </div>
            <div className="ebadmin-header__actions">
              <a href="/ebooks" className="ebadmin-btn-outline">← Voltar à página</a>
              <button
                className="ebadmin-btn-primary"
                onClick={exportCsv}
                disabled={leads.length === 0}
              >
                <Download size={15} /> Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="ebadmin-container ebadmin-body">
        {/* Stats */}
        <div className="ebadmin-stats">
          {[
            { icon: Users, label: "Total de Leads", value: totalLeads },
            { icon: FileText, label: "E-mails Únicos", value: uniqueEmails },
            { icon: TrendingUp, label: "Capturas Hoje", value: todayLeads },
          ].map((s) => (
            <div key={s.label} className="ebadmin-stat-card">
              <div className="ebadmin-stat-icon">
                <s.icon size={20} />
              </div>
              <div>
                <p className="ebadmin-stat-label">{s.label}</p>
                <p className="ebadmin-stat-value">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Busca */}
        <div className="ebadmin-toolbar">
          <div className="ebadmin-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou ebook..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="ebadmin-count">
            {filtered.length} de {totalLeads} registros
          </p>
        </div>

        {/* Tabela */}
        <div className="ebadmin-table-wrap">
          {loading ? (
            <div className="ebadmin-table-empty">
              <div className="ebadmin-spinner" />
              <p>Carregando leads...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ebadmin-table-empty">
              <FileText size={36} />
              <p>
                {search
                  ? "Nenhum resultado encontrado."
                  : "Nenhum lead capturado ainda."}
              </p>
            </div>
          ) : (
            <table className="ebadmin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Ebook</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, idx) => (
                  <tr key={lead.id ?? idx}>
                    <td className="ebadmin-td-id">{lead.id}</td>
                    <td className="ebadmin-td-name">{lead.name}</td>
                    <td className="ebadmin-td-email">{lead.email}</td>
                    <td>
                      <span className="ebadmin-ebook-badge">
                        {(lead.ebook_title ?? "")
                          .replace("Série Completa — ", "")
                          .replace("Os 5 Pilares da Gestão Eclesiástica", "Série Completa")}
                      </span>
                    </td>
                    <td className="ebadmin-td-date">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
