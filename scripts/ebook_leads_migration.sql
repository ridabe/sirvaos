-- Migração: Tabela de leads para os ebooks "Os 5 Pilares da Gestão Eclesiástica"
-- Execute: node scripts/supabase-cli.mjs db query --file scripts/ebook_leads_migration.sql

CREATE TABLE IF NOT EXISTS ebook_leads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  ebook_title TEXT        NOT NULL DEFAULT 'Série Completa',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ebook_leads_email ON ebook_leads (email);
CREATE INDEX IF NOT EXISTS idx_ebook_leads_created ON ebook_leads (created_at DESC);

ALTER TABLE ebook_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ebook_leads_insert_public" ON ebook_leads;
CREATE POLICY "ebook_leads_insert_public"
  ON ebook_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "ebook_leads_select_service" ON ebook_leads;
CREATE POLICY "ebook_leads_select_service"
  ON ebook_leads FOR SELECT
  TO service_role
  USING (true);
