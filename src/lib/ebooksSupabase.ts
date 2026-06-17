/**
 * ebooksSupabase.ts
 * Integração com Supabase para a série de ebooks "Os 5 Pilares da Gestão Eclesiástica".
 * Responsável por:
 *  - Gerar URLs assinadas para download dos PDFs no bucket "ebooks"
 *  - Inserir e consultar leads capturados na tabela "ebook_leads"
 */

import { supabase } from "./supabase";

export const BUCKET = "ebooks";

export interface EbookMeta {
  id: number;
  volume: string;
  title: string;
  subtitle: string;
  description: string;
  coverPath: string; // path dentro do bucket, ex: covers/capa1.png
  pdfPath: string;   // path dentro do bucket, ex: pdfs/ebook1_gestao_financeira.pdf
  topics: string[];
  accentColor: string;
}

export const EBOOKS: EbookMeta[] = [
  {
    id: 1,
    volume: "Vol. 1",
    title: "Gestão Financeira Transparente para Igrejas",
    subtitle: "Mordomia, orçamento e prestação de contas",
    description:
      "Descubra como administrar dízimos e ofertas com integridade. Aborda planejamento orçamentário, prestação de contas e os erros mais comuns que comprometem a saúde financeira das congregações.",
    coverPath: "covers/capa1.png",
    pdfPath: "pdfs/ebook1_gestao_financeira.pdf",
    topics: ["Mordomia cristã", "Orçamento eclesiástico", "Transparência financeira"],
    accentColor: "#1e3a5f",
  },
  {
    id: 2,
    volume: "Vol. 2",
    title: "Gestão de Pessoas e Voluntários",
    subtitle: "Recrutamento, capacitação e retenção",
    description:
      "Aprenda a recrutar, capacitar e reter voluntários engajados. Explora o ciclo completo do voluntariado, prevenção de burnout, resolução de conflitos e organização de escalas ministeriais.",
    coverPath: "covers/capa2.png",
    pdfPath: "pdfs/ebook2_gestao_pessoas.pdf",
    topics: ["Recrutamento de voluntários", "Capacitação ministerial", "Escalas e times"],
    accentColor: "#1a4731",
  },
  {
    id: 3,
    volume: "Vol. 3",
    title: "Comunicação Eficaz na Igreja",
    subtitle: "Conectando a congregação e a comunidade",
    description:
      "Domine a comunicação interna e externa da sua igreja. Aborda engajamento de membros, relevância comunitária, clareza na mensagem e centralização via ferramentas digitais.",
    coverPath: "covers/capa3.png",
    pdfPath: "pdfs/ebook3_comunicacao.pdf",
    topics: ["Comunicação interna", "Redes sociais", "Engajamento de membros"],
    accentColor: "#5c1a2e",
  },
  {
    id: 4,
    volume: "Vol. 4",
    title: "Planejamento Estratégico para Igrejas",
    subtitle: "Visão, propósito e metas na prática",
    description:
      "Transforme a visão da sua igreja em ações concretas. Guia você pela definição de missão, visão e valores, metas SMART, acompanhamento de resultados e uso de dashboards ministeriais.",
    coverPath: "covers/capa4.png",
    pdfPath: "pdfs/ebook4_planejamento.pdf",
    topics: ["Missão e visão", "Metas SMART", "Indicadores ministeriais"],
    accentColor: "#2d4a6e",
  },
  {
    id: 5,
    volume: "Vol. 5",
    title: "Tecnologia e Inovação na Igreja",
    subtitle: "Transformação digital para congregações modernas",
    description:
      "Modernize a administração da sua igreja com tecnologia. Explora como sair do papel, implementar segurança de dados, integrar sistemas de gestão e acompanhar tendências de inovação.",
    coverPath: "covers/capa5.png",
    pdfPath: "pdfs/ebook5_tecnologia.pdf",
    topics: ["Gestão digital", "Segurança de dados", "Inovação ministerial"],
    accentColor: "#1a1a2e",
  },
];

/** Retorna a URL pública da capa (imagem) — sem expiração */
export function getCoverPublicUrl(coverPath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(coverPath);
  return data.publicUrl;
}

/** Gera URL assinada para download do PDF (válida por expiresIn segundos) */
export async function getPdfSignedUrl(
  pdfPath: string,
  expiresIn = 86400
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(pdfPath, expiresIn);
  if (error) {
    console.error("[ebooks] Erro ao gerar URL assinada:", error.message);
    return null;
  }
  return data.signedUrl;
}

/** Gera URLs assinadas para todos os ebooks de uma vez */
export async function getAllPdfSignedUrls(
  expiresIn = 86400
): Promise<Record<number, string>> {
  const entries = await Promise.all(
    EBOOKS.map(async (e) => {
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
