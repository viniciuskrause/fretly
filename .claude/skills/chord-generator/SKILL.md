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

4. **Pestana** = dedo 1 na mesma casa em 2 ou mais cordas, listada em `barres`.
   Só o dedo 1 faz pestana. Um dedo numa corda só é um ponto comum.
5. **Dedos em ordem:** casa mais alta nunca leva dedo menor que casa mais baixa;
   cada dedo (exceto a pestana do 1) prende uma única corda. Abertura máxima de 4 casas.
6. **Cabe no diagrama:** `frets` entre -1 e 5 (o diagrama mostra 5 casas).
7. **Notas do acorde:** só notas do acorde (`SUFFIX_INTERVALS`), com tônica e terça.

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

## Posições e aulas de ciclo das quartas

- **Posição N de um acorde = a N-ª forma CAGED subindo o braço** (`shapeForPosition`
  em `lib.mjs`; a ordem cíclica é C → A → G → E → D, começando pela forma mais
  grave que cabe no braço). Vale para todas as aulas "Acordes Maiores - Nª posição".
  Gere com `npm run chord -- B♭ --position 3`.
- **Ciclo das quartas** (`CYCLE_OF_FOURTHS`): C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G.
- **Ordem na trilha:** cada aula "Acordes Maiores - {n}ª posição" é seguida pela aula
  "Acordes no ciclo das quartas - {N} posição" (tipo `review`), com os 12 tons do
  ciclo naquela posição. C/A/G/E/D da aula de ciclo são idênticos aos da aula
  de posição correspondente.
- Depois do ciclo vem "Acordes Menores - {n}ª posição" (Cm, Am, Gm, Em, Dm na
  mesma posição). Ordem: Maiores N → Ciclo N → Menores N → Maiores N+1…

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
- **Instrução na tela:** o título é "Monte a forma de {acorde} e toque corda por
  corda."; o campo `instruction` fica registrado nos dados.

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
     chord: "A",              // nome exibido (use ♭/♯: "B♭", "F♯")
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
