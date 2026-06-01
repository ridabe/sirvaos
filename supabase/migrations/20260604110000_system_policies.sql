-- ============================================================
-- Etapa 11 (complemento) – Políticas do sistema SirvaOS
-- Visíveis na landing page e no Admin Global (não editáveis via UI)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_policies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  terms_text  text        NOT NULL DEFAULT '',
  privacy_text text       NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Garante no máximo uma linha
CREATE UNIQUE INDEX IF NOT EXISTS system_policies_single_row ON system_policies ((true));

-- RLS: leitura pública; escrita apenas pelo banco (sem política de escrita via app)
ALTER TABLE system_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_system_policies" ON system_policies
  FOR SELECT USING (true);

-- Linha default com políticas do sistema SirvaOS
INSERT INTO system_policies (terms_text, privacy_text)
VALUES (
  E'Termos de Uso — SirvaOS\n\nAo utilizar a plataforma SirvaOS, você concorda com os presentes Termos de Uso.\n\n1. DESCRIÇÃO DO SERVIÇO\nO SirvaOS é uma plataforma SaaS de gestão eclesiástica que oferece ferramentas de organização de membros, escalas de louvor, finanças e outros módulos para igrejas e organizações religiosas.\n\n2. USO PERMITIDO\nA plataforma deve ser utilizada exclusivamente para fins legítimos de gestão organizacional. É vedado utilizar os serviços para atividades ilegais, abusivas ou que violem direitos de terceiros.\n\n3. RESPONSABILIDADE\nO SirvaOS não se responsabiliza por dados inseridos pelos tenants e seus membros. Cada organização contratante é responsável pelo conteúdo e pela conformidade dos dados inseridos em sua conta.\n\n4. ALTERAÇÕES\nEstes Termos podem ser atualizados periodicamente. O uso continuado da plataforma após alterações implica a aceitação dos novos termos.\n\n5. CONTATO\nDúvidas sobre estes termos: contato@sirvaos.com',
  E'Política de Privacidade — SirvaOS\n\nEsta Política descreve como o SirvaOS coleta, usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).\n\n1. DADOS COLETADOS\nColetamos dados de identificação (nome, e-mail), dados de acesso (logs de autenticação) e dados fornecidos pelas organizações contratantes no uso dos módulos da plataforma.\n\n2. FINALIDADE\nOs dados são utilizados para: prestação dos serviços contratados; comunicações relacionadas à conta; melhoria da plataforma; e cumprimento de obrigações legais.\n\n3. BASE LEGAL\nO tratamento se fundamenta no consentimento do titular, na execução de contrato e no legítimo interesse do controlador, conforme previsto na LGPD.\n\n4. COMPARTILHAMENTO\nNão compartilhamos dados pessoais com terceiros, exceto quando necessário para a prestação do serviço (ex.: infraestrutura de nuvem) ou por obrigação legal.\n\n5. SEUS DIREITOS\nVocê tem direito a: acesso, correção, portabilidade, eliminação e revogação do consentimento dos seus dados. Para exercê-los: privacidade@sirvaos.com\n\n6. RETENÇÃO\nDados são retidos pelo tempo necessário à prestação do serviço e obrigações legais.\n\n7. CONTATO DPO\nprivacidade@sirvaos.com'
)
ON CONFLICT DO NOTHING;
