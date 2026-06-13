---
name: roteiro-video-modulo
description: >-
  Gera roteiros de vídeo explicativos sobre os módulos do SirvaOS. ACIONAR
  sempre que o usuário pedir "criar roteiro", "roteiro de vídeo", "roteiro do
  módulo X", "vídeo explicativo do módulo", ou quiser apresentar o
  funcionamento de um módulo (membros, eventos, avisos, redes sociais, louvor,
  financeiro, intercessão, kids, escola bíblica) para usuários não técnicos. A
  skill pergunta o módulo, o estilo e a duração, analisa os documentos em docs/
  (PRD, SPEC e fluxos-modulos.md) para entender o fluxo real, e produz um
  roteiro cena a cena, com narração, sempre destacando as integrações entre o
  sistema web e o app, e encerrando com a chamada para www.sirvaos.com.br.
---

# Roteiro de Vídeo Explicativo — Módulos do SirvaOS

Esta skill cria roteiros de vídeo de caráter **explicativo**, voltados a
**usuários não técnicos** (pastores, líderes, membros), mostrando como um módulo
do SirvaOS funciona na prática — falando sobre o módulo e demonstrando seu uso.

## Passo 1 — Perguntar ao usuário (SEMPRE)

Antes de qualquer coisa, use a ferramenta de perguntas (`AskUserQuestion`) para
coletar, em uma única rodada:

1. **Módulo** — de qual módulo será o roteiro. Opções comuns: Membros, Eventos,
   Avisos, Redes Sociais, Louvor, Financeiro, Intercessão, Kids, Escola Bíblica.
2. **Estilo do vídeo** — tom/abordagem visual. Ex.: institucional/sóbrio,
   dinâmico/moderno, acolhedor/inspirador, tutorial passo a passo, depoimento.
   (O caráter é sempre explicativo; o estilo define a "embalagem".)
3. **Duração** — duração-alvo. Ex.: 30s, 1min, 1min30, 2min, 3min.

Se o usuário já tiver informado algum desses dados na mensagem, não repita a
pergunta — pergunte só o que falta.

## Passo 2 — Entender o módulo pelos documentos (SEMPRE)

Antes de escrever, analise os documentos do projeto para entender o **fluxo
real** do módulo. Leia, na pasta `docs/`:

- `docs/fluxos-modulos.md` — **fonte da verdade dos fluxos** (início → fim,
  integrações, tabelas, Edge Functions). É o documento mais importante.
- `docs/spec-sirvaos.md` — especificação do produto.
- `docs/prd-sirvaos.docx` — PRD (use a skill `docx` para ler, se necessário).
- Se existir, subpasta específica do módulo (ex.: `docs/intercession/PRD.md`,
  `docs/intercession/SPEC.md`, `docs/intercession/ROADMAP.md`).

Quando o documento não cobrir um detalhe do fluxo, vá ao código-fonte para
confirmar (migrations em `supabase/migrations/`, Edge Functions em
`supabase/functions/`, telas em `src/pages/` e `src/components/`). Nunca invente
um fluxo — descreva apenas o que existe nos documentos ou no código.

## Passo 3 — Identificar integrações Web ↔ App (OBRIGATÓRIO)

Sempre que o fluxo envolver troca entre o **sistema web** (painel do
admin/líder) e o **app** (membro), o roteiro **deve incluir uma explicação
clara dessa integração**: o que acontece no web, o que dispara, e como aparece
no app (e vice-versa). Exemplos de integração a destacar:

- Algo criado/enviado no painel web que chega como notificação/tela no app.
- Ação do membro no app (confirmar, responder, solicitar) que atualiza o painel
  do líder/admin **em tempo real**.
- Envios automáticos por **e-mail** ou **WhatsApp** disparados de dentro do
  sistema.

Descreva a integração em linguagem simples, sem jargão técnico (nada de nomes de
tabelas, Edge Functions ou colunas no texto narrado).

## Passo 4 — Escrever o roteiro

Estruture o roteiro em **cenas**, distribuindo o tempo conforme a duração
escolhida (referência: ~150 palavras de narração por minuto). Cada cena deve ter:

- **Faixa de tempo** (ex.: 0:08–0:22)
- **Visual:** o que aparece na tela.
- **Narração:** o texto falado, em tom explicativo e acessível.

Regras de conteúdo:

- Abra apresentando o módulo e o problema que ele resolve.
- Siga o fluxo na ordem real: do início (ação que dispara) até o fim (conclusão).
- Inclua as integrações Web ↔ App identificadas no Passo 3.
- Linguagem para leigos: sem termos técnicos no texto narrado.
- Acrescente uma seção final **"Notas de produção"** (tom, trilha, ritmo, textos
  em tela) coerente com o estilo escolhido.

## Passo 5 — Encerramento e pronúncia (SEMPRE)

O roteiro **sempre termina com a chamada para o site**:
`www.sirvaos.com.br`.

Inclua no roteiro uma **nota de pronúncia** para a locução:

- Quando falar o **nome do sistema**, pronunciar **"Sirva OS"** (duas partes:
  "Sirva" + "O-S").
- Quando falar o **endereço do site**, pronunciar **tudo junto** —
  "sirvaos ponto com ponto br" (sem separar "Sirva OS").

Deixe essa instrução explícita na seção de notas de produção, para o locutor.

## Passo 6 — Entregar

Salve o roteiro como arquivo Markdown em `docs/` (ex.:
`docs/roteiro-video-<modulo>.md`) e apresente-o ao usuário com
`present_files`. Ofereça, ao final, gerar uma versão só com a locução corrida
ou um storyboard visual.

## Formato de referência

```markdown
# Roteiro — Vídeo Explicativo: Módulo de <Nome>

**Duração-alvo:** <duração> · **Estilo:** <estilo> · **Narração:** ~N palavras
**Encerramento:** chamada para www.sirvaos.com.br

---

### Cena 1 — <título> (0:00–0:08)
**Visual:** ...
**Narração:**
> ...

(demais cenas...)

---

## Notas de produção
- Tom / trilha / ritmo / textos em tela
- Pronúncia: nome do sistema = "Sirva OS"; site = "sirvaos" (tudo junto)
- CTA final: logo + www.sirvaos.com.br
```
