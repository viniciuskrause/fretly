---
name: fretly-scale-diagrams
description: Padrão do diagrama de escalas e arpejos do Fretly — o braço com bolinhas (ScaleDiagram / ScaleCard em src/App.tsx) usado para shapes de escala (as 7 posições), a aula preparatória de saltos e as digitações de arpejo, com graus, dedos, tônica em azul e nota soando em laranja. Use SEMPRE que for criar ou alterar uma aula de escala, posição, shape ou digitação de arpejo, o diagrama de bolinhas, o card de posição, a sequência final de escalas, ou quando alguém pedir "mostre o desenho da escala", "adicione uma posição/digitação", "mostre os dedos/graus nas bolinhas".
---

# Diagrama de escalas e arpejos (bolinhas)

Representação dos **shapes**: um trecho do braço visto de frente com uma bolinha
por nota. Serve para memorizar um desenho numa região do braço. Para melodias
tocadas em ordem ao longo do braço (sequências diatônicas, frases), use a skill
`fretly-music-notation` (tablatura/partitura). Para acordes, `ChordCard`.

Siga também `fretly-design-system` e a regra bilíngue (pt + en em tudo).

## Onde é usado hoje

| Aula | Dado | O que a bolinha mostra |
|---|---|---|
| Escalas — Posição 1…7 (módulo "7 posições") | `scale`, sem `showFingers` | o **grau** na bolinha ("1", "2"… "7") |
| Aula preparatória de saltos (1ª corda) | `leaps: true` | grau; **arcos** ligam os pares de notas |
| Arpejos de Tríades — digitações 1/2/3 | `showFingers: true` | o **dedo** na bolinha, o **grau** ao lado ("1", "♭3", "♭5") |

## Dados (gerador → `src/lessons.ts`)

Aula `type: "scale"`, `steps: []`, `scale: ScaleStep[]` (um passo por posição ou
digitação). `ScaleStep`:
- `root`, `quality` ("major" | "minor" | "dim"), `position`, `mode` ({pt, en});
- `notes[]`: `{ string (0 = mi grave), fret, degree, finger? }`, em ordem
  ascendente (ou de execução, no exercício de saltos);
- opcionais: `label` (substitui "Posição n", ex. "Digitação 1"), `instruction`
  (título do exercício), `showFingers`, `leaps`.

Regras do gerador (`scripts/chords/build-key-lessons.mjs`):
- Escalas: 3 notas por corda; as 12 tonalidades no anel do hub; a posição
  mais grave que cabe.
- Arpejos: shape guardado como corda relativa + semitons + dedo; a casa vem da
  altura (cuida da terça maior entre sol e si). Transposição: menor deslocamento
  com **todas as casas ≥ 1** (sem corda solta: o exercício é a digitação) e
  **casa máxima 19**. Menor/diminuta derivam da maior (terça e, na diminuta,
  quinta meio tom abaixo), mesmos dedos.
- Digitações ditadas pelo usuário são fonte da verdade; derivadas pelo Claude
  ficam marcadas "a revisar" na skill `chord-generator`.

## `ScaleDiagram` (geometria e estilo)

- Cordas na horizontal: **mi grave embaixo**, mi agudo em cima (como o
  `ChordDiagram`). `SCALE_ROW = 22`, `SCALE_COLUMN = 36`, margens `SCALE_LEFT = 12`,
  `SCALE_TOP = 14`.
- Cordas `stroke-subtle` (6ª um pouco mais grossa, 1.6); trastes `stroke-ink-2`
  1.3; **pestana** (traço 5) quando o desenho começa na casa 1, ou depois da
  coluna da casa 0 quando há corda solta (a coluna da casa 0 fica antes da
  pestana, sem traste à esquerda).
- **Número da casa** embaixo de cada coluna: `font-mono` 11px 600 `fill-muted`.
- Colunas: todas as casas que o desenho ocupa. Arpejos: **no mínimo 4 casas**,
  e o SVG limitado a `maxWidth = largura × 1.6` (não estoura num card largo);
  +14px à direita para o grau escrito ao lado da bolinha.
- **Bolinha**: raio 9 (`fill-ink`); **tônica (grau "1") `fill-brand`**; nota
  soando raio 10.5 `fill-accent`, desenhada por último (fica por cima).
- Texto na bolinha: branco, `font-mono` 700, 10px (8.5px para graus de 2
  caracteres). Com `showFingers`: o dedo (ou "0" em corda solta) dentro, e o
  grau em `font-mono` 9px 700 acima-à-direita (`fill-brand-ink` na tônica,
  `fill-muted` nas outras).
- **Saltos** (`leaps`): +34px no topo; arco quadrático sobre a corda entre cada
  par (1ª-2ª, 3ª-4ª…), mais alto para saltos maiores; `stroke-muted` 1.6, o par
  soando em `stroke-accent` 2.4.
- `aria-label` bilíngue: nome da escala, posição e modo (ou o label) e "casas
  x a y".

## `ScaleCard`

Card `rounded-card border border-line bg-surface p-4 sm:p-5`:
- Cabeçalho: título `font-display` 18px bold ("Posição n" ou `label`) e, à
  direita, o modo (`text-sm text-muted`) — ou, com `showFingers` e a prop
  `fingerHint` (só na tela do exercício, que tem espaço), "Números: dedos".
- Exercício de saltos: **sem cabeçalho** (o título da página basta).
- Diagrama embaixo.

## Exercício e sequência final

- Passo: `ScaleCard` em `max-w-[560px]` abaixo do `ExerciseHeading` (`mt-12`);
  título = `instruction` quando existir. Toca **sobe e desce** em colcheias
  (`upAndDown`: não repete a nota mais aguda), a bolinha soando fica laranja.
- Aula com mais de um passo tem a **sequência final** (grade `sm:grid-cols-2
  lg:grid-cols-3` de `ScaleCard` com `sequence-card--sounding` / `--dimmed`);
  aula de um passo só termina com "Concluir".
- Botão de som: "Tocar" → **"Parar"** (ícone `stop`) enquanto toca.
- Hub da trilha (símbolo no centro quando não é a aula atual): posição (escalas),
  ordinal da corda da primeira nota ("6ª"/"6th") nos arpejos, a tonalidade no
  exercício de uma tonalidade só.

## Guias

Os guias (Escalas, Arpejos) mostram os shapes em C com o mesmo `ScaleCard`, em
grade (`sm:grid-cols-3` para as 3 digitações), sem `fingerHint`.

## Ao mudar algo

1. Mude `ScaleDiagram`/`ScaleCard` (vale para todas as aulas) — sem variações locais.
2. Regere as aulas (`node scripts/chords/build-key-lessons.mjs`) e confira notas
   e dedos com um script (corda, casa, nome da nota, dedo) antes de olhar a tela.
3. `npx tsc -b --noEmit`; confira no navegador uma posição de escala, o exercício
   de saltos e uma digitação de arpejo (tocando).
4. Acordes ou digitações novas: atualize o Dicionário de Acordes quando couber e
   registre a decisão do usuário (com data) aqui ou em `chord-generator`.
