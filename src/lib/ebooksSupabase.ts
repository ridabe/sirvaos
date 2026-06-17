/**
 * ebooksSupabase.ts
 * Integração com Supabase para a série de ebooks "Os 5 Pilares da Gestão Eclesiástica".
 * Responsável por:
 *  - Gerar URLs assinadas para download dos PDFs no bucket "ebooks"
 *  - Inserir e consultar leads capturados na tabela "ebook_leads"
 *  - CRUD de ebooks (tabela pública + storage)
 */

import { supabase } from "./supabase";

export const BUCKET = "ebooks";

// ─── Tipo DB ──────────────────────────────────────────────────────────────────

export interface EbookRecord {
  id: number;
  volume: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_path: string | null;
  pdf_path: string | null;
  topics: string[];
  accent_color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ─── Compatibilidade legada (landing page usa EbookMeta) ──────────────────────

export interface EbookMeta {
  id: number;
  volume: string;
  title: string;
  subtitle: string;
  description: string;
  coverPath: string;
  pdfPath: string;
  topics: string[];
  accentColor: string;
}

function recordToMeta(r: EbookRecord): EbookMeta {
  return {
    id: r.id,
    volume: r.volume,
    title: r.title,
    subtitle: r.subtitle ?? "",
    description: r.description ?? "",
    coverPath: r.cover_path ?? "",
    pdfPath: r.pdf_path ?? "",
    topics: r.topics ?? [],
    accentColor: r.accent_color,
  };
}

/** Fallback hardcoded caso o banco falhe */
export const EBOOKS_FALLBACK: EbookMeta[] = [
  { id: 1, volume: "Vol. 1", title: "Gestão Financeira Transparente para Igrejas", subtitle: "Mordomia, orçamento e prestação de contas", description: "Descubra como administrar dízimos e ofertas com integridade.", coverPath: "covers/capa1.png", pdfPath: "pdfs/ebook1_gestao_financeira.pdf", topics: ["Mordomia cristã", "Orçamento eclesiástico", "Transparência financeira"], accentColor: "#1e3a5f" },
  { id: 2, volume: "Vol. 2", title: "Gestão de Pessoas e Voluntários", subtitle: "Recrutamento, capacitação e retenção", description: "Aprenda a recrutar, capacitar e reter voluntários engajados.", coverPath: "covers/capa2.png", pdfPath: "pdfs/ebook2_gestao_pessoas.pdf", topics: ["Recrutamento de voluntários", "Capacitação ministerial", "Escalas e times"], accentColor: "#1a4731" },
  { id: 3, volume: "Vol. 3", title: "Comunicação Eficaz na Igreja", subtitle: "Conectando a congregação e a comunidade", description: "Domine a comunicação interna e externa da sua igreja.", coverPath: "covers/capa3.png", pdfPath: "pdfs/ebook3_comunicacao.pdf", topics: ["Comunicação interna", "Redes sociais", "Engajamento de membros"], accentColor: "#5c1a2e" },
  { id: 4, volume: "Vol. 4", title: "Planejamento Estratégico para Igrejas", subtitle: "Visão, propósito e metas na prática", description: "Transforme a visão da sua igreja em ações concretas.", coverPath: "covers/capa4.png", pdfPath: "pdfs/ebook4_planejamento.pdf", topics: ["Missão e visão", "Metas SMART", "Indicadores ministeriais"], accentColor: "#2d4a6e" },
  { id: 5, volume: "Vol. 5", title: "Tecnologia e Inovação na Igreja", subtitle: "Transformação digital para congregações modernas", description: "Modernize a administração da sua igreja com tecnologia.", coverPath: "covers/capa5.png", pdfPath: "pdfs/ebook5_tecnologia.pdf", topics: ["Gestão digital", "Segurança de dados", "Inovação ministerial"], accentColor: "#1a1a2e" },
];

/** @deprecated — use getEbooksFromDb() na landing page */
export const EBOOKS = EBOOKS_FALLBACK;

// ─── Leitura ──────────────────────────────────────────────────────────────────

/** Busca ebooks ativos do banco, ordenados por sort_order */
export async function getEbooksFromDb(): Promise<EbookMeta[]> {
  const { data, error } = await supabase
    .from("ebooks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) {
    console.warn("[ebooks] Fallback para lista hardcoded:", error?.message);
    return EBOOKS_FALLBACK;
  }
  return (data as EbookRecord[]).map(recordToMeta);
}

/** Busca TODOS os ebooks (incluindo inativos) — para admin */
export async function getAllEbooksAdmin(): Promise<EbookRecord[]> {
  const { data, error } = await supabase
    .from("ebooks")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[ebooks] Erro ao buscar ebooks:", error.message);
    return [];
  }
  return (data as EbookRecord[]) ?? [];
}

// ─── Criação ──────────────────────────────────────────────────────────────────

export interface CreateEbookPayload {
  volume: string;
  title: string;
  subtitle?: string;
  description?: string;
  topics?: string[];
  accent_color?: string;
  sort_order?: number;
  coverFile?: File | null;
  pdfFile?: File | null;
}

/** Cria um novo ebook: faz upload dos arquivos e insere no banco */
export async function createEbook(payload: CreateEbookPayload): Promise<{ ok: boolean; error?: string; id?: number }> {
  let cover_path: string | null = null;
  let pdf_path: string | null = null;

  // Upload da capa
  if (payload.coverFile) {
    const ext = payload.coverFile.name.split(".").pop() ?? "png";
    const path = `covers/${Date.now()}_cover.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, payload.coverFile, { upsert: false });
    if (error) return { ok: false, error: `Erro ao enviar capa: ${error.message}` };
    cover_path = path;
  }

  // Upload do PDF
  if (payload.pdfFile) {
    const path = `pdfs/${Date.now()}_ebook.pdf`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, payload.pdfFile, { upsert: false });
    if (error) {
      if (cover_path) await supabase.storage.from(BUCKET).remove([cover_path]);
      return { ok: false, error: `Erro ao enviar PDF: ${error.message}` };
    }
    pdf_path = path;
  }

  const { data, error } = await supabase
    .from("ebooks")
    .insert({
      volume: payload.volume,
      title: payload.title,
      subtitle: payload.subtitle ?? null,
      description: payload.description ?? null,
      topics: payload.topics ?? [],
      accent_color: payload.accent_color ?? "#1e3a5f",
      sort_order: payload.sort_order ?? 99,
      cover_path,
      pdf_path,
    })
    .select("id")
    .single();

  if (error) {
    if (cover_path) await supabase.storage.from(BUCKET).remove([cover_path]);
    if (pdf_path) await supabase.storage.from(BUCKET).remove([pdf_path]);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: (data as { id: number }).id };
}

// ─── Exclusão ─────────────────────────────────────────────────────────────────

/** Remove ebook do banco e os arquivos do storage */
export async function deleteEbook(ebook: EbookRecord): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ebooks").delete().eq("id", ebook.id);
  if (error) return { ok: false, error: error.message };

  const toRemove: string[] = [];
  if (ebook.cover_path) toRemove.push(ebook.cover_path);
  if (ebook.pdf_path) toRemove.push(ebook.pdf_path);
  if (toRemove.length) await supabase.storage.from(BUCKET).remove(toRemove);

  return { ok: true };
}

// ─── Toggle ativo ─────────────────────────────────────────────────────────────

export async function toggleEbookActive(id: number, is_active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ebooks").update({ is_active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

/** Retorna a URL pública da capa (imagem) — sem expiração */
export function getCoverPublicUrl(coverPath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(coverPath);
  return data.publicUrl;
}

/** Gera URL assinada para download do PDF (válida por expiresIn segundos) */
export async function getPdfSignedUrl(pdfPath: string, expiresIn = 86400): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pdfPath, expiresIn);
  if (error) {
    console.error("[ebooks] Erro ao gerar URL assinada:", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Gera URLs assinadas para uma lista de ebooks de uma vez */
export async function getAllPdfSignedUrls(expiresIn = 86400, ebooks?: EbookMeta[]): Promise<Record<number, string>> {
  const list = ebooks ?? EBOOKS_FALLBACK;
  const entries = await Promise.all(
    list.map(async (e) => {
      const url = await getPdfSignedUrl(e.pdfPath, expiresIn);
      return [e.id, url ?? ""] as [number, string];
    })
  );
  return Object.fromEntries(entries);
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface EbookLead {
  id?: number;
  name: string;
  email: string;
  ebook_title: string;
  created_at?: string;
}

/** Insere um novo lead na tabela ebook_leads */
export async function insertEbookLead(
  lead: Omit<EbookLead, "id" | "created_at">
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("ebook_leads")
    .insert({
      name: lead.name,
      email: lead.email,
      ebook_title: lead.ebook_title,
    });
  if (error) {
    console.error("[ebooks] Erro ao inserir lead:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Remove leads pelo array de IDs (requer permissão de admin) */
export async function deleteEbookLeads(ids: number[]): Promise<{ ok: boolean; error?: string }> {
  if (!ids.length) return { ok: true };
  const { error } = await supabase.from("ebook_leads").delete().in("id", ids);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Busca todos os leads (requer permissão de admin) */
export async function getAllEbookLeads(): Promise<EbookLead[]> {
  const { data, error } = await supabase
    .from("ebook_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[ebooks] Erro ao buscar leads:", error.message);
    return [];
  }
  return data ?? [];
}
