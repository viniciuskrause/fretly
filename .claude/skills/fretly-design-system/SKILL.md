---
name: fretly-design-system
description: Design system do Fretly (Guitar Workouts for Nerds) — tokens de cor, tipografia, raios, componentes e padrões de layout/interação da UI atual (azul, branco, laranja e preto, cores sólidas, sem gradientes). Use SEMPRE que for criar ou alterar qualquer tela, componente, estado visual, guia, card, botão, cabeçalho recolhível, barra de progresso, ícone ou diagrama do app, ou quando alguém pedir "crie uma tela/página/componente", "ajuste o visual", "siga o padrão da UI" ou "deixe igual ao resto do app".
---

# Design system do Fretly

A UI do Fretly foi definida e aprovada iterativamente. Toda interface nova
deve **parecer que sempre esteve no app**: reutilize tokens, componentes e
receitas abaixo antes de inventar qualquer coisa. Se algo novo for realmente
necessário, construa-o só com os tokens e as regras desta skill e registre o
padrão aqui.

Stack: Vite + React 19 + TypeScript + Tailwind CSS v4. Tokens em
`src/index.css` (`@theme`), componentes em `src/App.tsx`, fontes no
`index.html`. Não altere lógica, dados (`src/lessons.ts`, `src/chords.ts`) nem
progresso (`src/progress.ts`) ao fazer trabalho visual.

## Princípios (decisões do usuário — não reverter)

1. **Cores sólidas, sempre.** Nada de `linear/radial/conic-gradient`, `blur`,
   `backdrop-blur`, sombras difusas ou transparências como `white/70`. Separação
   se faz com **borda sólida de 1px** (`border-line`) ou com cor de fundo.
   Único "anel" permitido: `box-shadow: 0 0 0 3px <token>` sólido, sem desfoque.
2. **Nada de estética Duolingo/gamificada:** sem botões "3D" com sombra
   deslocada, sem verde como cor de interface, sem caixa alta em botões, sem
   cantos muito redondos. Única exceção aprovada para o verde: o badge de
   check da aula concluída (token `success`).
3. **Moderno e enxuto:** menos ornamento. Rótulos supérfluos foram removidos
   (logo, label "Guia", etiqueta "Atual", barras de progresso nas subseções,
   ícones nos cabeçalhos de grupo). Antes de adicionar um elemento, pergunte se
   um número, um ponto ou um ícone simples resolve.
4. **Paleta com papéis fixos:** azul = marca, avanço, progresso, concluído;
   laranja = atual, som, destaque pontual; preto = texto e contraste;
   branco/cinza-claro = superfícies.
5. **Texto branco sobre laranja** (`bg-accent` → `text-white`). Contraste é
   3,3:1, então só em texto **bold/semibold ou grande**; nunca texto fino
   pequeno sobre laranja.
6. **Mesma estrutura de navegação.** Mude a pele, não a arquitetura.

## Tokens (`src/index.css` → classes Tailwind)

Cada `--color-x` vira `bg-x`, `text-x`, `border-x`, `fill-x`, `stroke-x`.
**Nunca use hex solto em componentes** — se faltar uma cor, crie um token.

| Token | Hex | Uso |
|---|---|---|
| `ink` | #0A0F1C | texto principal, trilho da barra de progresso principal, ponto do diagrama |
| `ink-2` | #2B3445 | texto corrido, chevrons das subseções, linhas de casa |
| `muted` | #5A6478 | texto secundário, contadores `x/y` das subseções |
| `subtle` | #8A94A6 | só gráfico (cordas em repouso, hover de borda) — nunca texto |
| `canvas` | #F5F7FA | fundo do app **e do header** |
| `surface` | #FFFFFF | cards, rodapés, diagramas |
| `sunken` | #EDF1F6 | hover de botões neutros, nós bloqueados |
| `line` | #DFE5EE | bordas finas, separadores |
| `line-strong` | #C5CEDB | borda de card aberto, bordas de controles, trecho bloqueado |
| `brand` | #1F4BE6 | **cabeçalho das seções principais**, botão primário, progresso, nó concluído |
| `brand-strong` | #1A3FD1 | hover/pressed do primário |
| `brand-ink` | #1B3BB3 | texto azul em fundo claro (links, rótulos de linha nos guias) |
| `brand-soft` | #E8EEFF | texto secundário **sobre o azul**; fundos tingidos (selo de BPM) |
| `brand-line` | #C3D1FF | bordas tingidas |
| `accent` | #F2600F | preenchimento da barra principal, nó atual, ponto "atual", botão de som |
| `accent-strong` | #D95209 | hover do botão laranja |
| `accent-ink` | #B53D06 | texto laranja em fundo claro (eyebrow "Guia", rótulos de exercício) |
| `accent-soft` | #FFF0E6 | anel sólido do card que está soando |
| `success` | #0E7A52 | **só** checks de "concluído": badge da trilha e tela de aula concluída (ícone branco 5,5:1) |
| `success-soft` | #E3F4EC | anel sólido em volta do check grande da tela de aula concluída |
| `danger` | #C8281C | reservado |

Outros tokens:
- **Raios:** `rounded-card` = **6px** (todo container: cards, cabeçalhos,
  painéis, figuras); `rounded-control` = 12px (botões, campos, botões só-ícone);
  `rounded-full` para barras de progresso, pontos e nós da trilha.
- **Motion:** `--ease-out-soft` (`cubic-bezier(0.2,0.7,0.2,1)`), 160–280ms.
  A regra global de `prefers-reduced-motion` já zera animações — não a remova.

## Tipografia

| Família | Classe | Uso |
|---|---|---|
| Space Grotesk 500–700 | `font-display` | títulos, nomes de seção/subseção, nomes de acorde, letras nos nós |
| Inter 400–700 | `font-sans` (padrão) | texto corrido, botões |
| JetBrains Mono 500–700 | `font-mono` / `.eyebrow` | contadores `x/y`, BPM, intervalos, números de dedo/casa, eyebrows |

- `.eyebrow`: mono 11px, 600, `tracking 0.12em`, caixa alta — rótulos pequenos
  (cabeçalho de tabela, "Digitação alternativa", "Formas tocadas").
- `.eyebrow.eyebrow--lg`: 13px, 700 — **overlines de abertura** de página ou
  bloco: "Seção N", "Guia", título da aula no exercício, "Exercício concluído".
- Cifras dentro de eyebrow ficam em `normal-case` (`Dm7(♭5)` não pode virar `DM7(♭5)`).
- Títulos: `tracking-[-0.03em]`/`-0.04em`, `font-bold`, `leading-tight`.
  Escala: H1 de página 36/46px; título de seção principal 24/26px; H2 de guia
  24px; título de subseção/grupo 17px semibold; corpo 15px `leading-7`; intro 17px.
- Números sempre com `tabular-nums`.
- `Accidentals` fica primeiro em todas as pilhas (♭/♯ com largura certa) — não remova.

## Layout

- Coluna de conteúdo: `mx-auto max-w-[720px] px-4 sm:px-8` (home) /
  `px-5 sm:px-8` (guias). Exercícios: até `max-w-[1040px]`.
- **Header (TopBar):** largura total, `sticky top-0`, `bg-canvas` (mesma cor do
  fundo, nunca branco) com **só a linha** `border-b border-line` como
  separador; nome do site à esquerda, avatar à direita;
  `px-4 sm:px-8 lg:px-12`, `h-16 sm:h-[72px]`. Sem logo.
- Espaço entre seções: `space-y-6 sm:space-y-8`; entre cards de subseção: `space-y-3`.
- Mobile-first: alvos de toque ≥ 44px; testar em 320–390px.

## Componentes e receitas

Reutilize os componentes existentes em `src/App.tsx` antes de criar novos:
`Icon`, `TopBar`, `ChevronToggle`, `Collapse`, `useDisclosureIds`,
`CurrentDot`, `PrimaryButton`, `SecondaryButton`, `ChordCard`, `ChordDiagram`,
`GuideLayout`, `GuideSection`, `ExerciseShell`, `ExerciseHeading`.

### Hierarquia recolhível (Home)

Seção → (grupo) → subseção → trilha. **Tudo fechado por padrão**; estado salvo
em `localStorage` (`fretly.open.v1`) via `useOutline`. Abrir uma seção abre
também a subseção (e o grupo) da próxima aula a estudar.

**1. Cabeçalho de seção principal** (`PathSection`) — o único bloco "forte":
- Card `rounded-card border border-brand bg-brand text-white`, padding
  `p-5 sm:p-6 sm:pr-5` (direita 20px para alinhar o chevron).
- Esquerda (clicável, também alterna): overline `Seção N`
  (`eyebrow eyebrow--lg text-brand-soft`),
  título `font-display text-[24px] sm:text-[26px] font-bold`, subtítulo
  `text-[15px] font-medium text-brand-soft`.
- Direita, lado a lado: botão só-ícone do guia (ícone `notebook`, `size-6`,
  sem borda/label, `aria-label` + `title`) e o **chevron** (botão `size-11`,
  `-mr-1.5`, controle acessível com `aria-expanded`/`aria-controls`/`aria-label`).
  Ambos `text-white hover:opacity-80`, foco `focus-visible:outline-white`.
- Embaixo: **barra de progresso destacada** — linha com contador à esquerda
  (`font-mono text-sm font-bold text-white`, "x/y exercícios") e barra
  `h-3 flex-1 rounded-full bg-ink` com preenchimento `bg-accent`,
  `role="progressbar"`. Barras de progresso **só** aqui e no exercício.

**2. Cabeçalho de subseção e de grupo** (`Trail`, `TrailGroup`) — mesmo estilo:
- `rounded-card border bg-surface`, `border-line` fechado / `border-line-strong` aberto.
- Botão `flex min-h-16 items-center gap-3 px-5 py-5`, **sem hover de fundo**,
  `focus-visible:outline-offset-[-2px]`.
- Título sozinho, centralizado na vertical: `font-display text-[17px]
  font-semibold leading-snug tracking-[-0.015em] text-ink` (sem barra, sem
  ícone à esquerda, sem texto embaixo).
- À direita, nesta ordem: `CurrentDot` (ponto laranja 10px, só quando fechado
  e contém a aula atual), contador `x/y` (`min-w-[3rem] text-right font-mono
  text-xs tabular-nums text-muted`, largura mínima para alinhar entre cards) e
  `ChevronToggle` em `text-ink-2`.
- Corpo da subseção: sem linha separadora entre cabeçalho e conteúdo
  (`px-1 pb-4 pt-1`). Corpo de grupo: recuo com guia `border-l-2 border-line`.

**3. Indicador de abrir/fechar:** sempre `ChevronToggle` — chevron puro, sem
fundo nem borda, gira 180° ao abrir. Nunca "+/−", nunca chip com fundo.
Tamanho: `size-5` nas subseções/grupos; `iconClassName="size-7"` na seção
principal (o centro do chevron não muda, então o alinhamento se mantém).
Os chevrons de seção e subseção ficam **alinhados** (centro a 36px da borda
direita do card: `px-5` nas subseções e `pr-5` + `-mr-1.5` no botão de 44px da seção).

**4. Região animada:** `Collapse` (`.disclosure-region`, altura 0fr→1fr em
280ms + fade/translate 4px), sempre montada e `inert` quando fechada;
`role="region"` + `aria-labelledby`.

### Trilha (serpentina)

Nós redondos 68px ligados por caminho SVG (`trailLayout`, 3 colunas < 520px,
4 acima). Estados:
- concluído: `brand` com letra branca + badge de check **verde** (`success`, 28px, borda branca 2px, check branco `size-4` com traço grosso `[stroke-width:3.5]`) + selo de BPM (`brand-soft`/`brand-ink`, mono);
- atual: `accent` com letra **branca** + anel laranja tracejado girando;
- bloqueado: `sunken` com borda `line-strong` e letra `muted`.
Caminho percorrido azul sólido; trecho bloqueado pontilhado `line-strong`.
Troféu: hexágono preto com face laranja (bloqueado: cinza). Não trocar por
lista/timeline (já testado e rejeitado).

### Botões

- **Primário** (`PrimaryButton tone="primary"`): `h-12 rounded-control bg-brand text-white hover:bg-brand-strong text-sm font-semibold active:scale-[0.98]`. Avança.
- **Som** (`tone="accent"`): `bg-accent text-white hover:bg-accent-strong`. Toca áudio.
- **Secundário** (`SecondaryButton`): `border border-line-strong bg-surface text-ink-2 hover:bg-sunken`.
- **Só-ícone**: `size-11 rounded-control`, sem borda; em fundo claro
  `text-muted hover:bg-sunken hover:text-ink`; em fundo azul `text-white hover:opacity-80`.
  Sempre `aria-label` (e `title` quando o significado não é óbvio).
- Texto de botão em caixa normal ("Voltar à trilha"), nunca CAIXA ALTA.
- Pressionar: `active:scale-[0.98]` — nunca afundamento 3D.

### Ícones

`Icon` (SVG 24×24, `stroke="currentColor"`, `strokeWidth=2`, pontas
arredondadas, `fill="none"`). Para um ícone novo, adicione o nome à união e o
`path` no mapa, no mesmo traço linear. Tamanhos: `size-4` inline, `size-5`
padrão, `size-6` em botões só-ícone de cabeçalho. Remova ícones que ficarem
sem uso.

### Indicadores de estado

- Aula atual em contexto fechado: `CurrentDot` (`size-2.5 rounded-full bg-accent`, `role="img"`, `aria-label="Aula atual"`).
- Contagens: `x/y` em mono — preferir número a barra fora do cabeçalho principal.
- Foco: contorno 2px `brand` global; em fundo azul `outline-white`.

### Acordes: o card de acorde (padrão único)

Todo acorde do app — passo da aula, sequência completa, guias — é mostrado com
**`ChordCard`**: cifra no topo e diagrama embaixo, num único card. Não monte
cifra + diagrama à mão em lugar nenhum.

- **Proporções** (referência: card de 348px no passo da aula, ~348 × 330):
  margem ~40px em cima e embaixo, ~52px nas laterais (padding + margem do
  próprio diagrama), cifra de 40px numa caixa de 40px e 13px entre cifra e
  diagrama. Em `.chord-card` (`src/index.css`) tudo está em **`cqw`** (fração
  da largura do próprio card): padding `11.5cqw 10.9cqw 7.5cqw`, cifra
  `11.5cqw` (longas, > 8 caracteres: `9.2cqw`), espaço `3.7cqw`. Assim um card
  de 110px no celular é uma miniatura exata do de 348px. Para mudar o padrão,
  mude essas frações, nunca valores fixos num uso específico.
- **Tamanho:** o card ocupa a largura que recebe (`width: 100%`). Passo da aula:
  `className="max-w-[348px]"`. Grades: `.sequence-slot` (2/3/5 por linha, até
  190px; com `guide-shape`, 2/3) ou `grid grid-cols-3 gap-2 sm:gap-3` para
  comparar formas lado a lado.
- **Legendas ficam fora do card**, logo abaixo (`mt-1.5`/`mt-2`, centralizadas,
  `text-xs text-muted`; título curto em `font-display` bold). Ex.: "Forma A ·
  a partir da casa 3", "Baixo na 5ª · casa 5", "Digitação alternativa".
- **Estados:** `sequence-card--sounding` (borda `accent` + anel sólido
  `accent-soft`, sobe 4px) e `sequence-card--dimmed` (opacidade 0.45), passados
  em `className`; `current` marca `aria-current`.

**`ChordDiagram`** (dentro do card; SVG 272×211, `viewBox="0 21 272 211"` com a
mesma margem de 14 unidades nos quatro lados — se mudar a geometria, recalcule a
caixa para manter as margens iguais): cordas em repouso `subtle`, casas `ink-2`,
pontos/pestana `ink`; corda soando fica laranja com número do dedo branco. Na
margem esquerda (alinhado à direita em x=31, colado ao diagrama sem tocar o
círculo de corda solta), o **grau** de cada corda que soa (`stringDegree`: "1",
"♭3", "5", "♭7"…) em `font-mono` 13px bold `fill-brand-ink`, que vira
`fill-accent-ink` quando a corda está soando. O grau substitui listas de
intervalos embaixo do diagrama.

### Páginas de guia

Use `GuideLayout` (TopBar, botão "Voltar à trilha", overline `eyebrow--lg` "Guia" em
`accent-ink`, H1, intro, conteúdo, card de **Fontes**) e `GuideSection` para
cada H2. Tabelas: `rounded-card border border-line bg-surface`, cabeçalho com
`.eyebrow text-muted`, linhas separadas por `border-line`, `overflow-x-auto`.
Listas `list-disc`/`list-decimal pl-5 space-y-2` com `<strong>` no início do
item. Cada seção da Home liga ao seu guia pelo `id` (veja `App`).

### Páginas de aula (exercício)

- **`ExerciseShell`:** topo com botão fechar só-ícone (`close`, `text-muted`)
  + barra `h-2.5 rounded-full bg-line` com preenchimento `bg-brand`; conteúdo
  `max-w-[600px]` (passo a passo) ou `max-w-[1040px]` (`wide`, sequência);
  rodapé `sticky bg-surface border-t border-line` com área segura do iPhone,
  `BpmControl` centralizado e botões nas pontas.
- **`ExerciseHeading`:** bloco centralizado na tela (`mx-auto max-w-[600px]
  text-center`, também na sequência larga): overline `eyebrow eyebrow--lg
  text-accent-ink` com o **caminho da aula na Home** — os títulos acima dela
  (grupo, se houver, e subseção) + a cifra, separados por " - ", ex.
  "1ª inversão: baixo na terça - Acordes maiores - C7M" (`lessonPath` +
  `LessonOverline`; a cifra fica em `normal-case`) + H1 `font-display text-[26px]
  sm:text-[30px] font-bold text-balance`.
- **Espaço cabeçalho → acordes:** `mt-12` (48px) abaixo do `ExerciseHeading`,
  no passo e na sequência.
- **Passo:** `ChordCard` com `max-w-[348px]`, centralizado; legenda
  opcional fora do card, na linha reservada abaixo.
- **Nada pode empurrar o layout entre passos.** Textos opcionais ficam **fora**
  do card do diagrama, numa linha **reservada** em todos os passos da aula:
  `AlternativeSlot` ("Digitação alternativa") é renderizado sempre que a aula
  tem alguma digitação alternativa e só alterna `invisible`. Na sequência, cada
  item é um `.sequence-slot` (largura da grade) com o `ChordCard` e a linha
  reservada embaixo.
- **Rodapé:** esquerda `SecondaryButton` ("Anterior"/"Voltar", ícone `back`,
  label some no celular); direita `PrimaryButton tone="accent"` ("Tocar",
  "Iniciar", ícone `play`) e, depois de tocar, `SecondaryButton` "Repetir" +
  `PrimaryButton` azul ("Próximo", "Exercício final", "Concluir").
- **`BpmControl`:** grupo `rounded-control border border-line bg-surface`,
  só o ícone `metronome` (sem rótulo "BPM"; dica `title="BPM"`), botões −/+ `size-9 rounded-lg
  bg-sunken` (exceção de raio por serem pequenos) e campo mono 15px.
- **Sequência completa:** `ChordCard` com `.sequence-card` em `.sequence-slot`
  (2/3/5 por linha); o que está soando ganha borda `accent` + anel sólido `accent-soft`; os demais ficam com
  opacidade 0.45. Contagem regressiva: círculo `ink` com borda laranja 6px.
- **Aula concluída:** check grande `size-24 rounded-full bg-success` com anel
  `ring-8 ring-success-soft` e check branco de traço 3; overline
  "Exercício concluído", H1 32/36px, card de estatística e botão primário
  "Voltar à trilha" (`max-w-sm`, largura total).

## Acessibilidade (obrigatório)

- Contraste AA para texto (tabela de tokens já indica os pares válidos);
  texto sobre `brand` usa `white` ou `brand-soft`; sobre laranja só texto bold.
- Todo recolhível: `button` com `aria-expanded` + `aria-controls`; região com
  `aria-labelledby`.
- Botões só-ícone com `aria-label`; ícones decorativos `aria-hidden`.
- Barras de progresso com `role="progressbar"` e `aria-valuenow`.
- Respeitar `prefers-reduced-motion`.

## Checklist antes de entregar

1. Só tokens — `grep -nE "#[0-9a-fA-F]{3,6}" src/App.tsx` não deve trazer cores novas.
2. Sem gradiente/blur: `grep -rniE "gradient|backdrop|blur\(" src index.html public` vazio.
3. Containers com `rounded-card` (6px); controles com `rounded-control`.
4. Chevron (não "+/−"); sem hover de fundo nos cabeçalhos de subseção.
5. Barra de progresso só no cabeçalho principal e no exercício.
6. `npx tsc --noEmit` e `npm run build` passando.
7. Conferir no navegador (http://localhost:5173) em largura de celular e desktop.
8. Se criou um padrão novo aprovado pelo usuário, atualize esta skill.
