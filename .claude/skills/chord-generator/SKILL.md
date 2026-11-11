---
name: chord-generator
description: Gera, registra e confere acordes de violão do Fretly por extenso no formato chords-db (casa e dedo por corda, baseFret, barres, midi), seguindo as convenções de digitação, pestana e diagrama do app. Use sempre que for criar ou alterar um acorde, uma aula ou um exercício com acordes, revisar digitações, ou quando alguém pedir "gere o acorde X", "adicione a aula Y" ou "corrija os dedos do acorde Z".
---

# Gerador de acordes do Fretly

Todo acorde do app é registrado **por extenso, no formato do chords-db**. Nunca
derive um acorde de tabelas de forma genéricas dentro do componente: gere a
posição com o script, cole o objeto em `src/lessons.ts` e rode a verificação.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/chords.ts` | Tipos (`ChordPosition`, `ChordStep`) e funções que o app usa para desenhar e tocar |
| `src/lessons.ts` | As aulas. Cada passo tem `chord`, `shape`, `instruction` e `position` (por extenso) |
| `scripts/chords/lib.mjs` | Convenções, formas CAGED, conversão do chords-db, validação e comparação |
| `scripts/chords/generate.mjs` | Gerador: `npm run chord -- <acorde> [opções]` |
| `scripts/chords/check.mjs` | Verificação de todas as aulas: `npm run check:chords` (também roda no deploy) |
| `reference/chords-db/guitar.json` | Cópia do chords-db 0.5.1 (MIT): 2.069 acordes, só para consulta |

## Formato (chords-db)

```ts
position: {
  frets:   [-1, 3, 2, 0, 1, 0], // 6ª → 1ª corda (Mi grave → Mi agudo). -1 muda, 0 solta, n = n-ésima casa a partir de baseFret (1 = baseFret)
  fingers: [ 0, 3, 2, 0, 1, 0], // dedo por corda: 1 indicador … 4 mínimo; 0 em corda solta ou muda
  baseFret: 1,                  // casa da 1ª coluna do diagrama. 1 = primeira posição (desenha a pestana do braço)
  barres: [],                   // casas relativas em que o dedo 1 prende 2+ cordas
  midi: [48, 52, 55, 60, 64],   // nota MIDI de cada corda que soa, do grave ao agudo (afinação 40 45 50 55 59 64)
}
```

Casa absoluta = `baseFret + fret - 1` (para `fret > 0`). Não use `capo` (o chords-db
usa para pestana de braço inteiro; o Fretly desenha a pestana pelas cordas reais).

## Convenções do Fretly (todas obrigatórias)

1. **O baixo é a tônica.** A nota mais grave tem que ser a fundamental; toda corda
   abaixo dela fica muda (`-1`). Por isso *não* adotamos as cordas extras que o
   chords-db às vezes acrescenta (ex.: o C na forma de A na 3ª casa com a 6ª corda
   na pestana): mantemos a nossa versão.
2. **Formas CAGED para acordes maiores.** Em `lib.mjs` (`CAGED`), na posição aberta:
   C `x32010`, A `x02220`, G `320003`, E `022100`, D `xx0232`. Para mover a forma,
   a casa base é onde a tônica cai (`cagedBaseFret`); o gerador calcula sozinho.
3. **Digitação aberta × móvel.** Na primeira posição as cordas soltas não levam
   dedo. Fora dela, as cordas que eram soltas passam a ser presas na casa base pelo
   **dedo 1**, e as outras notas usam os dedos 2–4:

   | Forma | Aberta (dedos) | Móvel (dedos) | Pestana do dedo 1 na casa base |
   |---|---|---|---|
   | C | Si 1, Ré 2, Lá 3 | Si 2, Ré 3, Lá 4 | cordas 1–3 |
   | A | Ré 1, Sol 2, Si 3 | Ré 2, Sol 3, Si 4 | cordas 1–5 |
   | G | Lá 1, Mi grave 2, Mi agudo 3 | Lá 2, Mi grave 3, Mi agudo 4 | cordas 2–4 |
   | E | Sol 1, Lá 2, Ré 3 | Sol 2, Lá 3, Ré 4 | cordas 1–6 |
   | D | Sol 1, Mi agudo 2, Si 3 | Sol 2, Mi agudo 3, Si 4 | só a corda 4 → ponto com dedo 1, **não** é pestana |

4. **A forma vem da tônica e da terça.** A corda da tônica (o baixo) e a corda
   mais grave que tem a terça definem a forma CAGED; o campo `shape` tem que bater
   (a verificação acusa erro se não bater):

   | Tônica na corda | Terça na corda | Forma |
   |---|---|---|
   | Lá (5ª) | Ré (4ª) | C |
   | Lá (5ª) | Si (2ª) | A |
   | Mi grave (6ª) | Lá (5ª) | G |
   | Mi grave (6ª) | Sol (3ª) | E |
   | Ré (4ª) | Mi agudo (1ª) | D |

   Vale para maiores e menores (terça menor). `shapeOf` em `lib.mjs` aplica a regra.
   **Exceção (decisão do usuário):** no meio diminuto, a Forma G é `3x332x`
   (Cm7(♭5) = `8x887x`): tônica no Mi grave, Lá abafada e terça na Sol. Por isso,
   em m7(♭5) com tônica no Mi grave e a corda Lá abafada, a forma é G; a Forma E
   do meio diminuto toca a corda Lá (`0100xx`, Cm7(♭5) = `8988xx`).
5. **Pestana** = dedo 1 na mesma casa em 2 ou mais cordas, listada em `barres`.
   Só o dedo 1 faz pestana. Um dedo numa corda só é um ponto comum.
6. **Dedos em ordem:** casa mais alta nunca leva dedo menor que casa mais baixa;
   cada dedo (exceto a pestana do 1) prende uma única corda. Abertura máxima de 4 casas.
7. **Cabe no diagrama:** `frets` entre -1 e 5 (o diagrama mostra 5 casas).
8. **Notas do acorde:** só notas do acorde (`SUFFIX_INTERVALS`), com tônica e terça.

## Acordes menores (formas CAGED menores)

`CAGED_MINOR` em `lib.mjs`, mesmas tônicas e mesma ordem no braço das maiores, então
a posição N de um menor usa a mesma forma que a posição N do maior:

| Forma | Aberta (frets · dedos) | Móvel (relativo à casa base · dedos) |
|---|---|---|
| Cm | `x31013` · 0,3,2,0,1,4 | `x4212x` · 0,4,2,1,3,0 (1ª corda abafada) |
| Am | `x02210` · 0,0,2,3,1,0 | pestana 5ª–1ª · 0,1,3,4,2,1 |
| Gm | `310033` · 2,1,0,0,3,4 | `4211xx` · 4,2,1,1,0,0 (só as 4 graves) |
| Em | `022000` · 0,2,3,0,0,0 | pestana completa · 1,3,4,1,1,1 |
| Dm | `xx0231` · 0,0,0,2,3,1 | `xx1342` · 0,0,1,3,4,2 (ponto, não pestana) |

`movedFrets` troca o molde quando a forma sai da primeira posição (Cm e Gm perdem
as notas que ficariam fora do alcance). Passos menores levam `chord: "Am"` e
`suffix: "minor"`. Gere com `npm run chord -- A --suffix minor --position 2`.

## Sétima dominante e meio diminuto (formas CAGED)

`CAGED_DOM7` e `CAGED_M7B5` em `lib.mjs` (sufixos do chords-db `7` e `m7b5`),
com as mesmas tônicas e terças de cada forma:

| Forma | Dominante (aberta · móvel) | Meio diminuto (aberta · móvel) |
|---|---|---|
| C | `x32310` · `x3231x` (sem a 1ª) | `x31312` · igual, sem cordas soltas |
| A | `x02020` · pestana 5ª–1ª, dedos 1,3,1,4,1 | `x0101x` · pestana 5ª–3ª, dedos 1,2,1,3 |
| G | `320001` · dedos 4,3,1,1,1,2 | `3x332x` · igual (Cm7(♭5) = `8x887x`), dedos 2,3,4,1 |
| E | `020100` · pestana completa, dedos 1,3,1,2,1,1 | `0100xx` · igual (Cm7(♭5) = `8988xx`), pestana 6ª–3ª, dedos 1,2,1,1 |
| D | `xx0212` · dedos 1,3,2,4 | `xx0111` (pestana) · dedos 1,2,3,4 |

Quando nenhuma nota cai na primeira casa da forma móvel (C7, Cm7(♭5)), o
gerador começa o diagrama na nota mais grave presa (`baseFret` sobe).
Cifras (`chordSymbol`): "C7", "Cm7(♭5)" (no círculo da trilha, "Cø").
Passos levam `suffix: "7"` ou `suffix: "m7b5"`.

## Notação: armadura de clave (obrigatória)

Sustenidos e bemóis seguem a notação padrão: a armadura de clave da tonalidade
(igual em qualquer clave, inclusive na de sol). Decisão do usuário, 2026-11-11.

- **Tons maiores:** C (sem acidentes); com sustenidos G, D, A, E, B (1–5♯); com
  bemóis F, B♭, E♭, A♭, D♭, G♭ (1–6♭). Ciclo das quartas: C F B♭ E♭ A♭ D♭ G♭ B E A D G.
- **Tons menores:** use a forma com menos acidentes: Am; Em, Bm, F♯m, C♯m, G♯m
  (1–5♯); Dm, Gm, Cm, Fm, B♭m, E♭m (1–6♭). Nunca A♭m, D♭m, G♭m (7–9♭): terças
  C♭, F♭, B𝄫. Ciclo (`MINOR_CYCLE`): C F B♭ E♭ G♯ C♯ F♯ B E A D G.
- **Notas do acorde** (baixo de inversões etc.) são escritas pela letra do grau
  (`spell`): terça = 2 letras acima da tônica, quinta = 4, sétima = 6; o acidente
  sai da distância em semitons. Ex.: B7M/D♯, D7M/F♯, G♭7M/B♭, G♯m7/B, E♭m7/G♭.
- **Raiz de cada trilha** (lib.mjs): maiores e 7M em `CYCLE_OF_FOURTHS`; menores
  e m7 em `MINOR_CYCLE`; sétima dominante em `DOMINANT_CYCLE` (F♯7, V de B, não
  G♭7, que tem F♭); meio diminutos em `HALF_DIMINISHED_CYCLE` (C F A♯ D♯ G♯ C♯ F♯
  B E A D G: VII de um tom maior; B♭ø, E♭ø, … teriam F♭, B𝄫). Nenhuma nota com
  dobrado acidente.
- Use os símbolos ♯ e ♭ (nunca `#` ou `b`) nos nomes exibidos.

## Inversões de tétrades (seção 2)

Aqui **não** se usa a lógica de formas CAGED. Cada tétrade tem 4 variações:
ordem direta (baixo na tônica), 1ª inversão (baixo na terça), 2ª (baixo na
quinta) e 3ª (baixo na sétima); cada variação pode ter o baixo na 4ª, 5ª ou 6ª
corda. Voicings escritos um a um em `INVERSIONS` (`build-key-lessons.mjs`):
trastes absolutos da 6ª para a 1ª corda (`"xx2413"`), dedos, `suffix` (`maj7` →
cifra `7M`), `bass` (`root` | `third` | `fifth` | `seventh`) e `bassString`
(4 | 5 | 6). O passo gerado leva `chord: "C7M/E"`, `suffix`, `bass`,
`bassString` e **não** tem `shape`. `validate(..., shape, bass, bassString)`
exige que a nota mais grave seja o grau declarado e que esteja na corda
declarada. O app mostra "C7M/E (baixo na 5ª corda)" no título do exercício.
Ordem dos exercícios de cada aula (`lowToHigh`): ao longo do braço, do acorde mais
perto da pestana (casa presa mais baixa) ao mais perto do corpo; cada alternativa logo
após a sua digitação normal. O exercício final toca os passos nessa mesma ordem.
Cada tonalidade (ciclo de quartas) é o modelo em C transposto (`FIRST_INVERSION_C`,
`transpose`: menor deslocamento que mantém todas as notas presas na casa ≥ 1,
mesma digitação; o baixo é escrito pela letra do grau, `spell`, seguindo a
armadura de clave da tonalidade: B7M/D♯, D7M/F♯, G♭7M/B♭). Modelo C7M - baixo na terça: xx2413 (dedos 0,0,2,4,1,3, 4ª corda), x7958x
(dedos 0,2,4,1,3,0, 5ª corda), 12-14-10-12-x-x (dedos 2,4,1,3,0,0, 6ª corda;
casas acima de 9 → escreva os trastes como array). Alternativas logo após a
principal: x7x587 (dedos 0,2,0,1,4,3) e 12-x-10-12-12-x (dedos 2,0,1,3,4,0).

1ª inversão menor (`FIRST_INVERSION_CM`, Cm7/E♭): xx1313 (0,0,1,3,1,4), x6858x
(0,2,3,1,4,0), alt x6x586 (0,2,0,1,4,3), 11-13-10-12-x-x (2,4,1,3,0,0), alt
11-x-10-12-11-x (2,0,1,4,3,0). Tons menores em `MINOR_CYCLE` (ver "Notação").

1ª inversão dominante (`FIRST_INVERSION_C7`, C7/E): xx2313 (0,0,2,3,1,4), x7858x
(0,2,3,1,4,0), alt x7x586 (0,3,0,1,4,2), 12-13-10-12-x-x (2,4,1,3,0,0), alt
12-x-10-12-11-x (3,0,1,4,2,0). Tons em `DOMINANT_CYCLE`.

1ª inversão meio diminuta (`FIRST_INVERSION_CM7B5`, Cm7(♭5)/E♭): xx1312 (0,0,1,3,1,2),
x6857x (0,2,4,1,3,0), alt x6x576 (0,2,0,1,4,3), 11-13-10-11-x-x (2,4,1,3,0,0), alt
11-x-10-11-11-x (2,0,1,3,4,0). Tons em `HALF_DIMINISHED_CYCLE`.

2ª inversão (baixo na quinta, `SECOND_INVERSION_C`): xx5557 (dedos 0,0,1,1,1,4,
do chords-db), x-10-10-9-12-x (dedos 0,2,3,1,4,0) e 3324xx (dedos 2,3,1,4,0,0),
as duas últimas do usuário. Sem alternativas.
2ª inversão dos outros tipos, derivada do modelo 7M (abaixando terça, quinta ou
sétima), sem alternativas: Cm7/G `SECOND_INVERSION_CM` xx5546 (0,0,2,3,1,4),
x-10-10-8-11-x (0,2,3,1,4,0), 3313xx (2,3,1,4,0,0); C7/G `SECOND_INVERSION_C7`
xx5556 (0,0,1,1,1,2), x-10-10-9-11-x (0,2,3,1,4,0), 3323xx (2,3,1,4,0,0);
Cm7(♭5)/G♭ `SECOND_INVERSION_CM7B5` xx4546 (0,0,1,2,1,3), x-9-10-8-11-x
(0,2,3,1,4,0), 2313xx (2,3,1,4,0,0).

## Posições e organização das aulas (v2: por tonalidade)

- **Posição N de um acorde = a N-ª forma CAGED subindo o braço** (`shapeForPosition`
  em `lib.mjs`; a ordem cíclica é C → A → G → E → D, começando pela forma mais
  grave que cabe no braço). Gere com `npm run chord -- B♭ --position 3`.
- **Ciclo das quartas** (`CYCLE_OF_FOURTHS`): C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.
- **Acidentes:** seguem a armadura de clave (ver "Notação: armadura de clave").
- **Uma aula por tonalidade**, na ordem do ciclo das quartas: "C maior - formas
  CAGED", "F maior - formas CAGED"… Cada aula tem o acorde nas 5 formas, da mais
  grave para a mais aguda (`shapesUpTheNeck`), e o exercício final toca as cinco
  em sequência. O título vira o rótulo da trilha ("C maior" / "formas CAGED") e o
  círculo mostra a cifra.
- **Seção e trilhas:** `src/lessons.ts` exporta `sections` — uma seção ("Acordes
  Básicos no CAGED") com quatro trilhas, cada uma com seu subtítulo: "Acordes
  maiores" (C maior … G maior), "Acordes menores" (C menor …), "Acordes de sétima
  dominante" (C7 …) e "Acordes meio diminutos" (Cm7(♭5) …). `lessons` lista todas
  as aulas em ordem. O troféu fica no fim da última trilha.
- **Gerar o arquivo de aulas:** `node scripts/chords/build-key-lessons.mjs`
  reescreve `src/lessons.ts` inteiro (`SECTION` e `TRAILS` no script). Depois
  rode `npm run check:chords`.
- A v1 (aulas por posição, maiores e menores) está na tag `v1` do GitHub.

## Como o app usa a posição (não mude sem motivo)

- **Diagrama** (`ChordDiagram` em `src/App.tsx`): 6ª corda embaixo, 1ª em cima;
  colunas = `baseFret … baseFret+4`. Com `baseFret` 1 desenha a pestana do braço
  (linha grossa); acima disso escreve o número de `baseFret` embaixo da 1ª coluna.
  Pestanas são uma barra contínua da primeira à última corda que o dedo 1 prende,
  **sem número de dedo**. Notas mostram o número do dedo. Corda solta acende um
  círculo antes da pestana do braço quando soa.
- **Som:** cada corda que soa vira uma nota (`midi` → frequência), com timbre de
  violão de nylon (Karplus–Strong). TOCAR toca as cordas uma a uma, da mais grave
  para a mais aguda, e depois o acorde inteiro; as notas são agendadas no relógio
  do áudio (ritmo exato) e o destaque das cordas segue esse relógio.
- **Cifra:** a forma aparece só no título do exercício, "D (Forma C)" (`chordLabel`
  em `src/chords.ts`). O nome grande do acorde e os cartões da sequência final
  mostram só a cifra ("D").
- **Instrução na tela:** o título é "Monte {cifra} e toque corda por corda.", ex.
  "Monte D (Forma C) e toque corda por corda."; o campo `instruction` fica
  registrado nos dados.

## Fluxo para gerar um acorde

1. **Gerar**
   - Maior numa posição: `npm run chord -- G --position 2` (forma escolhida pela regra acima).
   - Maior em forma CAGED: `npm run chord -- G --shape E` (casa calculada) ou
     `--fret N` para forçar a casa. Sem `--shape`, lista as 5 formas.
   - Outras qualidades: `npm run chord -- A --suffix minor` lista as posições do
     chords-db já convertidas para as convenções (baixo = tônica, pestana
     recalculada). Sufixos do chords-db: `minor`, `7`, `maj7`, `m7`, `sus4`, `dim`…
     (lista completa em `guitar.json` → `suffixes`).
2. **Escolher** uma posição sem `❌`. Avisos `⚠` exigem julgamento. Se nenhuma
   servir, ajuste à mão seguindo as convenções e valide de novo.
3. **Registrar** em `src/lessons.ts` como `ChordStep`:
   ```ts
   {
     chord: "A",              // nome exibido (acidentes da armadura de clave: "B♭", "F♯m")
     shape: "G",              // forma CAGED de origem (mostrada na trilha)
     instruction: "…",
     position: { frets: [...], fingers: [...], baseFret: 2, barres: [1], midi: [...] },
   }
   ```
   Para acorde menor, acrescente `suffix: "minor"`; outros sufixos do chords-db
   exigem estender o tipo `ChordStep` em `src/chords.ts`.
4. **Verificar:** `npm run check:chords` precisa terminar com
   "✓ todos os acordes seguem as convenções". Ele também informa quais acordes
   são idênticos ao chords-db, quais o chords-db toca com cordas extras e quais
   são próprios do Fretly.
5. **Ver no app:** `npm run dev`, abra a aula e confira diagrama e som.
6. **Publicar:** `npm run deploy` (roda a verificação antes do build).

Nunca altere `reference/chords-db/guitar.json`: é a referência original.
