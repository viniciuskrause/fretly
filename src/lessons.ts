import type { ChordStep } from "./chords.ts";

// Every chord is written out in full in the chords-db format (strings low E →
// high E). Generate new ones with the chord-generator skill
// (.claude/skills/chord-generator) and validate with `npm run check:chords`.

export type Lesson = {
  id: number;
  title: string;
  exerciseTitle: string;
  subtitle: string;
  type: "theory" | "chord" | "practice" | "review";
  status: "done" | "current" | "locked";
  steps: ChordStep[];
};

export const lessons: Lesson[] = [
  {
    id: 1,
    title: "Primeira posição",
    exerciseTitle: "Acordes na primeira posição",
    subtitle: "As cinco formas abertas",
    type: "chord",
    status: "done",
    steps: [
      {
        chord: "C",
        shape: "C",
        instruction: "Monte a forma de C e toque corda por corda.",
        position: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [], midi: [48, 52, 55, 60, 64] },
      },
      {
        chord: "A",
        shape: "A",
        instruction: "Mantenha os três dedos próximos ao traste.",
        position: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1, barres: [], midi: [45, 52, 57, 61, 64] },
      },
      {
        chord: "G",
        shape: "G",
        instruction: "Deixe todas as cordas soarem com clareza.",
        position: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1, barres: [], midi: [43, 47, 50, 55, 59, 67] },
      },
      {
        chord: "E",
        shape: "E",
        instruction: "Relaxe o polegar atrás do braço.",
        position: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1, barres: [], midi: [40, 47, 52, 56, 59, 64] },
      },
      {
        chord: "D",
        shape: "D",
        instruction: "Toque somente as quatro cordas agudas.",
        position: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1, barres: [], midi: [50, 57, 62, 66] },
      },
    ],
  },
  {
    id: 7,
    title: "Ciclo das quartas",
    exerciseTitle: "Acordes no ciclo das quartas",
    subtitle: "Aplique CAGED em 12 tons",
    type: "review",
    status: "current",
    steps: [
      {
        chord: "C",
        shape: "C",
        instruction: "Comece em C e escute a resolução.",
        position: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1, barres: [], midi: [48, 52, 55, 60, 64] },
      },
      {
        chord: "F",
        shape: "E",
        instruction: "Avance uma quarta até F.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barres: [1], midi: [41, 48, 53, 57, 60, 65] },
      },
      {
        chord: "B♭",
        shape: "A",
        instruction: "Mantenha o pulso ao chegar em B♭.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1, barres: [1], midi: [46, 53, 58, 62, 65] },
      },
      {
        chord: "E♭",
        shape: "D",
        instruction: "Conecte a próxima região sem interromper.",
        position: { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], baseFret: 1, barres: [], midi: [51, 58, 63, 67] },
      },
      {
        chord: "A♭",
        shape: "G",
        instruction: "Antecipe a próxima forma antes da troca.",
        position: { frets: [4, 3, 1, 1, 1, 4], fingers: [3, 2, 1, 1, 1, 4], baseFret: 1, barres: [1], midi: [44, 48, 51, 56, 60, 68] },
      },
      {
        chord: "D♭",
        shape: "C",
        instruction: "Siga o ciclo com movimento mínimo.",
        position: { frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 1, barres: [1], midi: [49, 53, 56, 61, 65] },
      },
      {
        chord: "G♭",
        shape: "E",
        instruction: "Mantenha todas as vozes equilibradas.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 2, barres: [1], midi: [42, 49, 54, 58, 61, 66] },
      },
      {
        chord: "B",
        shape: "A",
        instruction: "Continue o pulso e respire entre ataques.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [1], midi: [47, 54, 59, 63, 66] },
      },
      {
        chord: "E",
        shape: "E",
        instruction: "Volte a uma forma aberta sem acelerar.",
        position: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1, barres: [], midi: [40, 47, 52, 56, 59, 64] },
      },
      {
        chord: "A",
        shape: "A",
        instruction: "Prepare a penúltima troca do ciclo.",
        position: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1, barres: [], midi: [45, 52, 57, 61, 64] },
      },
      {
        chord: "D",
        shape: "D",
        instruction: "Toque D com articulação clara.",
        position: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1, barres: [], midi: [50, 57, 62, 66] },
      },
      {
        chord: "G",
        shape: "G",
        instruction: "Finalize em G e retorne para C.",
        position: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1, barres: [], midi: [43, 47, 50, 55, 59, 67] },
      },
    ],
  },
  {
    id: 3,
    title: "Segunda posição",
    exerciseTitle: "Acordes na segunda posição",
    subtitle: "Conecte C com a forma de A",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "A",
        instruction: "Encontre C usando a forma móvel de A.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 3, barres: [1], midi: [48, 55, 60, 64, 67] },
      },
      {
        chord: "A",
        shape: "G",
        instruction: "Visualize a forma de G sem mover a tônica.",
        position: { frets: [4, 3, 1, 1, 1, 4], fingers: [3, 2, 1, 1, 1, 4], baseFret: 2, barres: [1], midi: [45, 49, 52, 57, 61, 69] },
      },
      {
        chord: "G",
        shape: "E",
        instruction: "Faça a pestana completa na terceira casa.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 3, barres: [1], midi: [43, 50, 55, 59, 62, 67] },
      },
      {
        chord: "E",
        shape: "D",
        instruction: "Ataque apenas as quatro primeiras cordas.",
        position: { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], baseFret: 2, barres: [], midi: [52, 59, 64, 68] },
      },
      {
        chord: "D",
        shape: "C",
        instruction: "Feche o ciclo voltando à forma de C.",
        position: { frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 2, barres: [1], midi: [50, 54, 57, 62, 66] },
      },
    ],
  },
  {
    id: 4,
    title: "Terceira posição",
    exerciseTitle: "Acordes na terceira posição",
    subtitle: "Avance pelo braço",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "G",
        instruction: "Veja a forma de G dentro desta região.",
        position: { frets: [4, 3, 1, 1, 1, 4], fingers: [3, 2, 1, 1, 1, 4], baseFret: 5, barres: [1], midi: [48, 52, 55, 60, 64, 72] },
      },
      {
        chord: "A",
        shape: "E",
        instruction: "Apoie o indicador em uma pestana firme.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 5, barres: [1], midi: [45, 52, 57, 61, 64, 69] },
      },
      {
        chord: "G",
        shape: "D",
        instruction: "Mantenha a tônica da segunda corda evidente.",
        position: { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], baseFret: 5, barres: [], midi: [55, 62, 67, 71] },
      },
      {
        chord: "E",
        shape: "C",
        instruction: "Conecte a forma de C ao desenho anterior.",
        position: { frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 4, barres: [1], midi: [52, 56, 59, 64, 68] },
      },
      {
        chord: "D",
        shape: "A",
        instruction: "Feche a sequência com a forma de A.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 5, barres: [1], midi: [50, 57, 62, 66, 69] },
      },
    ],
  },
  {
    id: 5,
    title: "Quarta posição",
    exerciseTitle: "Acordes na quarta posição",
    subtitle: "Reconheça formas agudas",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "E",
        instruction: "Encontre C na oitava casa com a forma de E.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, barres: [1], midi: [48, 55, 60, 64, 67, 72] },
      },
      {
        chord: "A",
        shape: "D",
        instruction: "Toque a forma de D nas quatro cordas agudas.",
        position: { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], baseFret: 7, barres: [], midi: [57, 64, 69, 73] },
      },
      {
        chord: "G",
        shape: "C",
        instruction: "Observe a tônica na quinta corda.",
        position: { frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 7, barres: [1], midi: [55, 59, 62, 67, 71] },
      },
      {
        chord: "E",
        shape: "A",
        instruction: "Comprima a forma de A sem tensão.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 7, barres: [1], midi: [52, 59, 64, 68, 71] },
      },
      {
        chord: "D",
        shape: "G",
        instruction: "Visualize a forma inteira antes de tocar.",
        position: { frets: [4, 3, 1, 1, 1, 4], fingers: [3, 2, 1, 1, 1, 4], baseFret: 7, barres: [1], midi: [50, 54, 57, 62, 66, 74] },
      },
    ],
  },
  {
    id: 6,
    title: "Quinta posição",
    exerciseTitle: "Acordes na quinta posição",
    subtitle: "Complete o mapa CAGED",
    type: "chord",
    status: "locked",
    steps: [
      {
        chord: "C",
        shape: "D",
        instruction: "Complete C com a forma de D na região aguda.",
        position: { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3], baseFret: 10, barres: [], midi: [60, 67, 72, 76] },
      },
      {
        chord: "A",
        shape: "C",
        instruction: "Mantenha a visualização mesmo sem tocar graves.",
        position: { frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 9, barres: [1], midi: [57, 61, 64, 69, 73] },
      },
      {
        chord: "G",
        shape: "A",
        instruction: "Use uma mini pestana para a forma de A.",
        position: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 10, barres: [1], midi: [55, 62, 67, 71, 74] },
      },
      {
        chord: "E",
        shape: "G",
        instruction: "Reconheça o contorno da forma de G.",
        position: { frets: [4, 3, 1, 1, 1, 4], fingers: [3, 2, 1, 1, 1, 4], baseFret: 9, barres: [1], midi: [52, 56, 59, 64, 68, 76] },
      },
      {
        chord: "D",
        shape: "E",
        instruction: "Conclua o mapa com a forma de E.",
        position: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 10, barres: [1], midi: [50, 57, 62, 66, 69, 74] },
      },
    ],
  },
];
