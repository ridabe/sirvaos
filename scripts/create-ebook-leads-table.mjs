/**
 * create-ebook-leads-table.mjs
 * Cria a tabela ebook_leads no Supabase via REST API.
 * Uso: node scripts/create-ebook-leads-table.mjs
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const SQL = `
CREATE TABLE IF NOT EXISTS ebook_leads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  ebook_title TEXT        NOT NULL DEFAULT 'Série Completa',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscas por e-mail
CREATE INDEX IF NOT EXISTS idx_ebook_leads_email ON ebook_leads (email);

-- RLS: habilitar mas permitir inserção pública (para captura de leads)
ALTER TABLE ebook_leads ENABLE ROW LEVEL SECURITY;

-- Política: qualquer pessoa pode inserir um lead
DROP POLICY IF EXISTS "ebook_leads_insert_public" ON ebook_leads;
CREATE POLICY "ebook_leads_insert_public"
  ON ebook_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política: apenas service_role pode ler (admin)
DROP POLICY IF EXISTS "ebook_leads_select_service" ON ebook_leads;
CREATE POLICY "ebook_leads_select_service"
  ON ebook_leads FOR SELECT
  TO service_role
  USING (true);
`;

async function run() {
  console.log("🔧 Criando tabela ebook_leads no Supabase...");

  // Executar via rpc exec_sql se disponível, senão via REST direto
  const { error } = await supabase.rpc("exec_sql", { sql: SQL }).single();

  if (error) {
    // Tentar via fetch direto na API de management
    console.log("⚠️  RPC exec_sql não disponível, tentando via REST...");
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ sql: SQL }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("❌ Erro ao criar tabela:", body);
      console.log("\n📋 Execute o SQL abaixo manualmente no Supabase SQL Editor:\n");
      console.log(SQL);
      process.exit(1);
    }
  }

  console.log("✅ Tabela ebook_leads criada com sucesso!");
}

run().catch((e) => {
  console.error("❌ Erro inesperado:", e.message);
  console.log("\n📋 Execute o SQL abaixo manualmente no Supabase SQL Editor:\n");
  console.log(SQL);
});
