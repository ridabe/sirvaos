# Identidade Visual — SirvaOS

> **Documento:** Guia visual inicial  
> **Produto:** SirvaOS  
> **Versão:** 0.1  
> **Data:** Maio de 2026  
> **Status:** Direção visual inicial

---

## 1. Direção Visual

O SirvaOS deve transmitir:

- Profissionalismo.
- Clareza.
- Tecnologia.
- Confiança.
- Organização.
- Serviço.
- Leveza para uso diário.

A identidade visual precisa funcionar bem em dois contextos:

1. **Admin Global SirvaOS**
   - Interface interna da plataforma.
   - Deve carregar a marca própria do SirvaOS.
   - Visual mais técnico, institucional e operacional.

2. **Ambiente White-Label das Igrejas**
   - Interface personalizada para cada cliente.
   - Usa logo e cores da igreja.
   - Mantém a estrutura visual e usabilidade do SirvaOS, mas adapta a camada de marca.

---

## 2. Conceito da Paleta

A paleta base do SirvaOS combina:

- **Verde petróleo/teal** como cor principal: confiança, serviço, estabilidade e tecnologia sem parecer frio demais.
- **Ciano tecnológico** como acento: modernidade, interação e destaque digital.
- **Grafite quente** para texto: profissional, legível e menos duro que preto puro.
- **Superfícies claras esverdeadas**: sensação clean, organizada e acolhedora.
- **Âmbar discreto** para alertas e atenção: usado com moderação.

O objetivo é evitar uma identidade genérica azul corporativa, sem cair em tons excessivamente religiosos, escuros ou decorativos.

---

## 3. Paleta Principal

| Token | Cor | Hex | Uso |
|---|---:|---|---|
| `brand.primary` | <span style="display:inline-block;width:64px;height:20px;background:#0E6B68;border:1px solid #D9E3E0;"></span> | `#0E6B68` | Botões primários, links importantes, navegação ativa |
| `brand.primary.dark` | <span style="display:inline-block;width:64px;height:20px;background:#084C4A;border:1px solid #D9E3E0;"></span> | `#084C4A` | Sidebar global, headers institucionais, hover forte |
| `brand.primary.soft` | <span style="display:inline-block;width:64px;height:20px;background:#DDF1EE;border:1px solid #D9E3E0;"></span> | `#DDF1EE` | Backgrounds sutis, badges suaves, cards informativos |
| `brand.accent` | <span style="display:inline-block;width:64px;height:20px;background:#2BB3C0;border:1px solid #D9E3E0;"></span> | `#2BB3C0` | Destaques, foco, gráficos, estados selecionados |
| `brand.accent.soft` | <span style="display:inline-block;width:64px;height:20px;background:#E1F7FA;border:1px solid #D9E3E0;"></span> | `#E1F7FA` | Áreas de destaque leve, tags e feedback visual |

---

## 4. Neutros

| Token | Cor | Hex | Uso |
|---|---:|---|---|
| `neutral.950` | <span style="display:inline-block;width:64px;height:20px;background:#17201F;border:1px solid #D9E3E0;"></span> | `#17201F` | Texto principal, títulos, ícones fortes |
| `neutral.700` | <span style="display:inline-block;width:64px;height:20px;background:#3D4A47;border:1px solid #D9E3E0;"></span> | `#3D4A47` | Texto secundário forte |
| `neutral.500` | <span style="display:inline-block;width:64px;height:20px;background:#6B7774;border:1px solid #D9E3E0;"></span> | `#6B7774` | Texto auxiliar, labels, metadados |
| `neutral.300` | <span style="display:inline-block;width:64px;height:20px;background:#B9C8C4;border:1px solid #D9E3E0;"></span> | `#B9C8C4` | Bordas fortes, divisores ativos |
| `neutral.200` | <span style="display:inline-block;width:64px;height:20px;background:#D9E3E0;border:1px solid #D9E3E0;"></span> | `#D9E3E0` | Bordas padrão, linhas de tabela |
| `neutral.100` | <span style="display:inline-block;width:64px;height:20px;background:#EEF5F3;border:1px solid #D9E3E0;"></span> | `#EEF5F3` | Superfície secundária |
| `neutral.50` | <span style="display:inline-block;width:64px;height:20px;background:#F7FAF9;border:1px solid #D9E3E0;"></span> | `#F7FAF9` | Fundo principal da aplicação |
| `white` | <span style="display:inline-block;width:64px;height:20px;background:#FFFFFF;border:1px solid #D9E3E0;"></span> | `#FFFFFF` | Cards, modais, inputs, tabelas |

---

## 5. Cores Semânticas

| Token | Cor | Hex | Uso |
|---|---:|---|---|
| `success` | <span style="display:inline-block;width:64px;height:20px;background:#2F8A5F;border:1px solid #D9E3E0;"></span> | `#2F8A5F` | Confirmações, presença confirmada, ações concluídas |
| `success.soft` | <span style="display:inline-block;width:64px;height:20px;background:#E3F5EC;border:1px solid #D9E3E0;"></span> | `#E3F5EC` | Badge de sucesso, mensagens positivas |
| `warning` | <span style="display:inline-block;width:64px;height:20px;background:#C98A13;border:1px solid #D9E3E0;"></span> | `#C98A13` | Pendências, atenção, prazos próximos |
| `warning.soft` | <span style="display:inline-block;width:64px;height:20px;background:#FFF3D8;border:1px solid #D9E3E0;"></span> | `#FFF3D8` | Alertas leves |
| `danger` | <span style="display:inline-block;width:64px;height:20px;background:#C94A4A;border:1px solid #D9E3E0;"></span> | `#C94A4A` | Erros, exclusões, bloqueios |
| `danger.soft` | <span style="display:inline-block;width:64px;height:20px;background:#FBE4E4;border:1px solid #D9E3E0;"></span> | `#FBE4E4` | Alertas de erro leves |
| `info` | <span style="display:inline-block;width:64px;height:20px;background:#3578A8;border:1px solid #D9E3E0;"></span> | `#3578A8` | Informações do sistema, mensagens neutras |
| `info.soft` | <span style="display:inline-block;width:64px;height:20px;background:#E5F1FA;border:1px solid #D9E3E0;"></span> | `#E5F1FA` | Callouts informativos |

---

## 6. Tokens CSS Iniciais

```css
:root {
  --color-brand-primary: #0E6B68;
  --color-brand-primary-dark: #084C4A;
  --color-brand-primary-soft: #DDF1EE;
  --color-brand-accent: #2BB3C0;
  --color-brand-accent-soft: #E1F7FA;

  --color-neutral-950: #17201F;
  --color-neutral-700: #3D4A47;
  --color-neutral-500: #6B7774;
  --color-neutral-300: #B9C8C4;
  --color-neutral-200: #D9E3E0;
  --color-neutral-100: #EEF5F3;
  --color-neutral-50: #F7FAF9;
  --color-white: #FFFFFF;

  --color-success: #2F8A5F;
  --color-success-soft: #E3F5EC;
  --color-warning: #C98A13;
  --color-warning-soft: #FFF3D8;
  --color-danger: #C94A4A;
  --color-danger-soft: #FBE4E4;
  --color-info: #3578A8;
  --color-info-soft: #E5F1FA;
}
```

---

## 7. Uso Recomendado

### Layout

- Fundo geral: `neutral.50`.
- Cards e painéis: `white`.
- Bordas: `neutral.200`.
- Divisores e linhas de tabela: `neutral.200`.
- Texto principal: `neutral.950`.
- Texto secundário: `neutral.700`.
- Texto auxiliar: `neutral.500`.

### Ações

- Botão primário: `brand.primary`.
- Hover do botão primário: `brand.primary.dark`.
- Foco/acento: `brand.accent`.
- Botões destrutivos: `danger`.
- Ações secundárias: fundo branco com borda `neutral.200`.

### Navegação

- Admin Global SirvaOS pode usar `brand.primary.dark` em áreas de navegação.
- Ambientes white-label devem substituir a cor primária pela cor do cliente.
- O SirvaOS deve manter componentes, espaçamentos e padrões de interação mesmo com cores do cliente.

### Dados e Dashboards

Ordem sugerida para gráficos:

1. `brand.primary` — `#0E6B68`
2. `brand.accent` — `#2BB3C0`
3. `info` — `#3578A8`
4. `success` — `#2F8A5F`
5. `warning` — `#C98A13`
6. `danger` — `#C94A4A`
7. `neutral.500` — `#6B7774`

---

## 8. Acessibilidade

Regras mínimas:

- Texto normal deve buscar contraste WCAG AA.
- Botões primários devem usar texto branco sobre `brand.primary`.
- Evitar texto pequeno sobre `brand.accent`, pois o ciano deve ser usado como destaque, não como base de leitura longa.
- `warning.soft`, `success.soft`, `danger.soft` e `info.soft` devem usar texto escuro, nunca texto branco.
- Temas white-label dos clientes devem passar por validação de contraste antes de serem aplicados.

Pares recomendados:

| Fundo | Texto |
|---|---|
| `brand.primary` | `white` |
| `brand.primary.dark` | `white` |
| `brand.primary.soft` | `brand.primary.dark` |
| `brand.accent.soft` | `neutral.950` |
| `neutral.50` | `neutral.950` |
| `white` | `neutral.950` |
| `warning.soft` | `neutral.950` |
| `danger.soft` | `neutral.950` |
| `success.soft` | `neutral.950` |

---

## 9. White-Label dos Clientes

Cada cliente poderá customizar sua própria marca, mas o sistema deve preservar consistência.

### Cores configuráveis pelo cliente

- Cor primária.
- Cor secundária.
- Cor de destaque.
- Cor de fundo opcional.
- Cor de texto opcional, se passar na validação de contraste.

### Fallbacks

Se o cliente não configurar cores:

- Usar paleta SirvaOS.

Se o cliente configurar cores inválidas:

- Bloquear salvamento ou sugerir ajustes automáticos.

Se o contraste for insuficiente:

- Exibir aviso e impedir aplicação em produção.

---

## 10. Recomendações de Interface

O visual do SirvaOS deve ser:

- Clean, mas não vazio.
- Denso o suficiente para operação administrativa.
- Com poucos ornamentos.
- Baseado em tabelas claras, filtros, dashboards e ações previsíveis.
- Com cards apenas para agrupamentos reais de informação.
- Com ícones simples e utilitários.
- Com uso de cor para orientar ação, estado e hierarquia.

Evitar:

- Gradientes como identidade principal.
- Paleta dominada por uma única cor.
- Excesso de roxo/azul escuro.
- Fundos escuros em grandes áreas operacionais.
- Elementos decorativos que não ajudam a tarefa.
- Interfaces com aparência de landing page dentro do painel administrativo.

---

## 11. Próximas Decisões Visuais

Após aprovação da paleta, definir:

- Logo SirvaOS.
- Tipografia.
- Grid e espaçamento.
- Estilo de ícones.
- Componentes base.
- Layout do Admin Global.
- Layout do Admin do Cliente.
- Layout do App/Portal do Membro.
- Tema claro e possível tema escuro.
- Padrões de gráficos e relatórios.

