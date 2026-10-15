# Design tokens

Origem: variáveis do Figma (`get_variable_defs` nos frames `2:2` e `14:5226`) mais valores
recorrentes no código de referência do `get_design_context`. Implementação: bloco `@theme` em
[`src/index.css`](../src/index.css) (Tailwind v4, sem `tailwind.config`).

## Cores

| Figma | Hex | Token Tailwind | Uso |
| --- | --- | --- | --- |
| `color/ink` | `#140D0A` | `ink` | Fundo da página, texto sobre botões primários |
| `color/surface-card` | `#241612` | `surface-card` | Cards, painel de filtros, rodapé |
| `color/surface-raised` | `#2F1D15` | `surface-raised` | Fim do gradiente dos cards mobile |
| `color/surface-dark` | `#38220F` | `surface-dark` | Campos, faixa da marca no rodapé |
| `color/border` | `#3F2319` | `line` | Bordas (paginação, divisores) |
| `color/border-soft` | `#55321F` | `line-soft` | Bordas de chips e campos |
| `color/primary` | `#D28A4C` | `brand` | Botões, sublinhado ativo, badges |
| `color/secondary` | `#B39463` | `brand-muted` | Placeholder, preço riscado |
| `color/foreground` | `#F5F1EB` | `cream` | Texto padrão |
| `color/text-primary` | `#F7F3EC` | `cream-strong` | Títulos do blog |
| `color/text-secondary` | `#CFB28C` | `sand` | Texto de apoio |
| `color/text-accent` | `#E89B55` | `amber` | Preços, item ativo, links |
| `color/background-elevated` | `#FBFBFB` | `elevated` | Máscaras (não visível) |
| `Color/Gray Light` | `#EDEDED` | `gray-light` | Máscaras (não visível) |
| — (decorativo no banner) | `#46A358` | `success` | Estado de sucesso |
| — **não existe no Figma** | `#E5654B` | `danger` | Erros de validação (adição; o layout não desenha estados de erro) |

### Mapeamento para o shadcn/ui

As variáveis semânticas do shadcn (`--background`, `--primary`…) apontam para a paleta acima, para
que os componentes de `src/components/ui` herdem a identidade sem reescrita. O tema é **somente dark**,
porque o Figma não tem modo claro.

| shadcn | Token |
| --- | --- |
| `background` / `foreground` | `ink` / `cream` |
| `card`, `popover` | `surface-card` |
| `primary` / `primary-foreground` | `brand` / `ink` |
| `secondary` | `surface-dark` |
| `muted`, `accent` | `surface-raised` |
| `muted-foreground` | `sand` |
| `accent-foreground` | `amber` |
| `border` / `input` | `line` / `line-soft` |
| `ring` | `amber` |
| `destructive` | `danger` |

### Gradientes (utilitários)

| Utilitário | Valor | Uso |
| --- | --- | --- |
| `bg-card-gradient` | 140° `#241612 → #2F1D15` | Cards de NFT mobile |
| `bg-brand-gradient` | 137° `rgba(210,138,76,.45) → #D28A4C` | Botão de filtro mobile |
| `bg-featured-gradient` | ↓ `rgba(210,138,76,.10) → .03` | Banner "NFT em destaque" |
| `bg-bubble-gradient` | 145° `rgba(210,138,76,.3) → 0` | Bolhas decorativas |

## Tipografia

Família única: **Roboto Mono** (`font/family`), gratuita (Google Fonts), instalada via
`@fontsource/roboto-mono` nos pesos 400, 500 e 700. **Nenhuma troca de fonte foi necessária.**

| Token | Tamanho / altura de linha padrão | Estilos do Figma |
| --- | --- | --- |
| `text-tiny` | 9 / 100% | Tiny/9 Bold (+0.1 tracking) |
| `text-micro` | 10 / 100% | Tiny/10 Medium |
| `text-caption` | 12 / 16 | Caption/12 Bold (lh 14), Caption/12 Regular (lh 18) |
| `text-caption-lg` | 13 / 22 | Caption/13 Regular · lh 22, Caption/13 Medium (lh 16) |
| `text-body` | 14 / 16 | Body/14 (lh 16, 20, 22, 24, 30 via `leading-*`) |
| `text-body-md` | 15 / 16 | Body/15 (lh 16, 40) |
| `text-body-lg` | 16 / 16 | Body Large/16 (lh 16, 20, auto) |
| `text-lead` | 17 / 16 | Body Large/17 Bold |
| `text-title` | 18 / 16 | Body Large/18 (lh 16, 24) |
| `text-title-lg` | 22 / 16 | "Oferta limitada" |
| `text-heading` | 24 / 32 | Heading/24 Bold |
| `text-heading-lg` | 28 / normal | Título do blog |
| `text-display` | 43 / 70 | Display/43 Bold |

Alturas de linha alternativas usam a escala padrão do Tailwind (`leading-3.5` = 14px,
`leading-4` = 16, `leading-5` = 20, `leading-5.5` = 22, `leading-6` = 24, `leading-7.5` = 30,
`leading-10` = 40). O tracking de 10% (Body/14 Bold) vira `tracking-[1.4px]`.

## Espaçamento

A escala padrão do Tailwind (múltiplos de 4 px) cobre todos os valores do layout: 4, 8, 12, 16, 20,
24, 28, 32, 40, 44, 48, 72, 88, 96 e 120. A largura útil do desktop é `max-w-page` (1200 px), com
120 px de margem lateral no frame de 1440 px. No mobile, o padding lateral é 24 px.

## Raios

| Token | px | Uso |
| --- | --- | --- |
| `rounded-xs` | 4 | Paginação |
| `rounded-sm` | 6 | Botões, campos |
| `rounded-md` | 8 | Cards de promo e blog |
| `rounded-lg` | 10 | Busca mobile |
| `rounded-xl` | 12 | Banner mobile |
| `rounded-art` | 15 | Arte dos cards de NFT (desktop) |
| `rounded-2xl` | 16 | Arte mobile |
| `rounded-3xl` | 20 | Cards de NFT mobile |
| `rounded-4xl` | 24 | Hero desktop |

Valores pontuais (13, 14, 17, 18, 22 e 37 px) aparecem uma única vez no Figma e ficam como valores
arbitrários no componente.

## Sombras

| Token | Valor | Uso |
| --- | --- | --- |
| `shadow-field` | `0 0 10px rgba(10,6,4,.45)` | Campo de newsletter (`drop-shadow` no Figma) |
| `shadow-tabbar` | `0 -6px 24px rgba(10,6,4,.55)` | Tab bar mobile (aproximação: no Figma a sombra está embutida no SVG) |
