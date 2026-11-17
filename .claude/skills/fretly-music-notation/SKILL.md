---
name: fretly-music-notation
description: Padrão de notação musical do Fretly — tablatura e partitura (NotationCard em src/Notation.tsx) para exercícios melódicos que correm pelo braço, com dedos, cordas, compassos, seletor de notação e modal "Como ler a notação". Use SEMPRE que for criar ou alterar um exercício escrito como tablatura ou partitura, uma sequência de notas tocadas em ordem (arpejos diatônicos, frases, escalas na horizontal), o componente de notação, o modal de ajuda, ou quando alguém pedir "mostre em tablatura", "coloque em partitura", "adicione compassos/dedos/cordas na notação" ou "crie um exercício como o das tríades diatônicas".
---

# Notação musical do Fretly (tablatura / partitura)

Padrão aprovado pelo usuário em 2026-11-17 ("esse será nosso padrão de notação
musical a partir de agora"), a partir do exercício **Tríades diatônicas na 6ª
corda** (módulo Arpejos de Tríades, seção Exercícios). Todo exercício novo que
é uma **melodia tocada em ordem** usa este padrão. Os **shapes** (posições de
escala, digitações de arpejo) continuam com o diagrama de bolinhas: veja a skill
`fretly-scale-diagrams`. Acordes continuam com `ChordCard`.

Siga também `fretly-design-system` (tokens, raios, botões) e a regra bilíngue
(todo texto em pt e en).

## Quando usar

| Conteúdo | Representação |
|---|---|
| Sequência de notas tocadas uma a uma, ao longo do braço ou por mais de ~5 casas | **Notação (esta skill)** |
| Shape de escala ou de arpejo para memorizar (posição fixa) | Bolinhas (`ScaleDiagram`) |
| Acorde (notas juntas) | `ChordCard` |

## Dados (gerador → `src/lessons.ts`)

O exercício é uma aula `type: "scale"` cujo passo (`ScaleStep`) tem:

- `notation: true` — desenha `NotationCard` em vez de `ScaleCard`.
- `groups: [{ label, count }]` — cada grupo de notas consecutivas que forma um
  acorde (nome em cima do compasso: "F", "Gm", "Bdim"). Um grupo = um compasso.
- `notes[]` na **ordem de execução**, cada uma com `string` (0 = mi grave),
  `fret`, `finger` (1–4) e **`pitch`**: a altura **real (soando)** grafada no
  tom, com oitava — `"B♭2"`, `"C♭3"` (C♭3 soa como B2; a oitava acompanha a
  letra). Gere com `pitchName(key, grauDaEscala, midi)` em
  `scripts/chords/build-key-lessons.mjs`; nunca escreva a grafia enarmônica errada
  (em G♭ maior é C♭, não B).
- `label` ("Digitação 1") e `showFingers: true` continuam no dado (hub da trilha),
  mas **não aparecem** no card de notação.
- Título (`instruction`): frase completa com o tom, ex. "Play the diatonic triads
  of C Major up the neck on the 6th string" / "Toque as tríades diatônicas de C
  maior subindo o braço na 6ª corda".
- `signature` (opcional): tom maior cuja armadura a partitura usa quando não é o
  `root` — tríade menor usa o relativo maior, diminuta o tom de que ela é o vii°.
- Overline: a trilha pode definir `overline` ({pt, en}), que substitui o caminho
  e a cifra ("Triad Arpeggios Practice" / "Prática de Arpejos de Tríades").

### Ordem de execução e compassos

- `playingOrder(step)` (src/Notation.tsx) é a fonte única da ordem: sobe e desce,
  **repetindo a nota mais aguda** na volta, para cada compasso conter um grupo
  inteiro. O áudio (`startPlayback` em App.tsx) usa a mesma função para passos
  com `notation` — notação e som nunca podem divergir.
- Ritmo: colcheias (duas por tempo do metrônomo). Compasso = tamanho do grupo
  (tríades → **3/8**, tétrades → **4/8**; o numerador vem de `groups[0].count`). Se um exercício novo tiver grupos de outro tamanho,
  ajuste a fórmula (`BEAT_UNIT` / numerador) e garanta compassos completos.

## Componente `NotationCard` (src/Notation.tsx)

Card `rounded-card border border-line bg-surface`, padding `p-4 pt-7 sm:p-5 sm:pt-9`
(topo proporcional ao rodapé). Contém **só** o diagrama e a barra inferior —
sem título, sem legenda.

**Barra inferior** (`grid-cols-[1fr_auto_1fr]`):
- **Centro: seletor de notação** — grupo `rounded-control border border-line
  p-0.5` com dois botões só-ícone `h-9 w-11` (`aria-pressed`, `aria-label` e
  `title` bilíngues). Selecionado `bg-ink text-white`; outro `text-muted
  hover:text-ink`. Ícones **sem linhas**: tablatura = números "3" e "5" em
  diagonal (mono bold); partitura = uma colcheia.
- **Direita: ajuda** — botão só-ícone `size-11` com `Icon name="help"`, abre o
  modal "Como ler a notação".
- A escolha (tab/partitura) fica em `localStorage` (`fretly.notation.v1`, com
  try/catch); padrão: tablatura.

**Layout comum às duas vistas** (SVG em px reais, largura medida com
`ResizeObserver`, mínimo 300):
- Nota a cada `NOTE = 30`px; entre compassos `GROUP_GAP = 18`px com a barra de
  compasso no meio; uma linha nunca corta um compasso; entre linhas
  `ROW_GAP = 36`px.
- **Nome do acorde** acima de cada compasso: `font-display` 14px bold
  `fill-brand-ink`.
- **Dedos acima** do diagrama nas duas vistas: `font-mono` 13px semibold
  `fill-muted`.
- **Barras de compasso** finas (`stroke-ink`, 1px) entre compassos; barra de
  1,5px no início e no fim de cada linha.
- **Nota soando**: `fill-accent` (número da casa / cabeça de nota / haste) e o
  dedo e a corda dela também em `accent`. As duas passagens (subida e descida)
  são desenhadas; o destaque usa a posição na ordem (`activeOrder`), não o
  índice da nota.
- A página do exercício fica larga (`ExerciseShell wide`, `max-w-[880px]`) quando
  a sequência passa de 10 casas.

### Tablatura

- 6 linhas `stroke-line-strong`, espaço 12px; **1ª corda (mi agudo) em cima,
  6ª embaixo**. "T A B" empilhado à esquerda (`font-display` 15px bold).
- Número da casa sobre a linha da corda, com retângulo `fill-surface` atrás
  (corta a linha): `font-mono` 14px bold.
- **Sem fórmula de compasso** (decisão do usuário); só as barras.

### Partitura

- Pauta de 5 linhas (espaço 8px), **clave de sol com "8" embaixo** (violão soa
  uma oitava abaixo do escrito): glifo 𝄞 da fonte **Noto Music** (carregada em
  `app/index.html` só com esse caractere, `text=%F0%9D%84%9E`), 46px.
- **Armadura** do tom maior (ordem e posições em `SHARP_SPOTS` / `FLAT_SPOTS`)
  em todas as linhas; **fórmula de compasso** (3 sobre 8) só na primeira linha.
- Altura escrita = `pitch` + 1 oitava. Cabeças de nota elípticas (rx 5.4, ry 4,
  −20°), **hastes para cima** e **uma barra (beam) por compasso** (colcheias);
  nota isolada ganha bandeirola. Linhas suplementares acima/abaixo quando
  preciso. Acidente só quando a nota foge da armadura (♯, ♭ ou ♮ antes da cabeça).
- O espaço acima da pauta cresce com a nota mais aguda do exercício: a barra
  (beam) nunca encosta nos dedos nem no nome do acorde.
- **Corda entre parênteses abaixo** da pauta: "(6)", "(5)" em `font-mono` 12px.

### Vários exercícios na aula (sequência final)

Uma aula com mais de um passo (ex.: digitações 1, 2 e 3) termina na **sequência
final**: um `NotationCard` por passo, um embaixo do outro (`max-w-[880px]`),
tocados em seguida com `playingOrder`; o que soa ganha `sequence-card--sounding`
e os outros `--dimmed`. A escolha tablatura/partitura é **uma só para a página**
(store compartilhado `useNotationView`): trocar num card troca todos.

## Modal "Como ler a notação" (`NotationHelp`)

`<dialog>` nativo com `showModal()` (Esc e clique fora fecham), fundo
`::backdrop` sólido `canvas`, painel `rounded-card border-line-strong`,
`w-[min(640px,100vw-32px)]`, conteúdo rolável, botão `close` no canto.

Estrutura (bilíngue):
1. **Tablatura** — exemplo desenhado (`TabExample`) + lista: linhas = cordas,
   números nas linhas = casas, números acima = dedos (1 indicador … 4 mínimo),
   nome acima = tríade.
2. **Partitura** — exemplo (`StaffExample`) + lista: clave com 8, armadura,
   altura e linhas suplementares, colcheias, dedos acima, corda entre parênteses.
3. **Nas duas** — compassos (um grupo por compasso; 3/8 só na partitura) e nota
   laranja.

**Exemplos anotados** (`Annotated`): um compasso real (tríade de G, raiz na 6ª
casa 3, dedos 1-4-2) desenhado com os **mesmos componentes** `Tablature`/`Staff`,
no centro de um SVG de 560 de largura (encolhe no celular); rótulos curtos
(`fill-ink-2` 13px semibold) nos dois lados, ligados por uma linha até uma coluna
fixa e uma **seta** `stroke-brand-ink` com ponta (`marker`) até o elemento. Se a
geometria do diagrama mudar, recalcule os pontos das setas (estão comentados nos
componentes) e confira no navegador.

## Ao mudar algo

1. Mude no componente (vale para todo exercício) — nunca crie uma variação local.
2. Se um elemento mudar (ex.: tirar a fórmula da tablatura), atualize o modal:
   texto e setas do exemplo.
3. `npx tsc -b --noEmit`; abra um exercício nas duas vistas no navegador (tom
   com sustenidos e com bemóis), toque e pare, abra o modal.
4. Atualize esta skill com a decisão do usuário e a data.
