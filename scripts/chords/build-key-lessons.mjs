#!/usr/bin/env node
// Writes src/lessons.ts: one section with one trail per chord quality (major,
// minor, dominant seventh, half-diminished) and, in each, one lesson per key — the chord in its five CAGED
// shapes, from the lowest shape up the neck. Keys follow the cycle of fourths.
//
//   node scripts/chords/build-key-lessons.mjs
//
// The lessons file keeps every chord written out in full (chords-db format);
// run `npm run check:chords` afterwards.
import fs from "node:fs";
import path from "node:path";
import {
  barresOf,
  chordSymbol,
  CYCLE_OF_FOURTHS,
  formatPosition,
  fromCaged,
  midiOf,
  shapesUpTheNeck,
  validate,
} from "./lib.mjs";

const SECTION = {
  title: "Acordes Básicos no CAGED",
  subtitle: "Faça qualquer acorde em qualquer tonalidade em qualquer lugar do braço",
};
const TRAILS = [
  { suffix: "major", title: "Acordes maiores" },
  { suffix: "minor", title: "Acordes menores" },
  { suffix: "7", title: "Acordes de sétima dominante" },
  { suffix: "m7b5", title: "Acordes meio diminutos" },
];
/** Lesson title prefix: "C maior", "C menor", "C7", "Cm7(♭5)". */
const lessonName = (root, suffix) =>
  ({ major: `${root} maior`, minor: `${root} menor` })[suffix] ?? chordSymbol(root, suffix);

const instruction = (shape, baseFret, suffix) => {
  if (suffix !== "major" && suffix !== "minor")
    return baseFret === 1 ? `Forma de ${shape} na primeira posição.` : `Forma de ${shape} a partir da casa ${baseFret}.`;
  if (baseFret === 1)
    return {
      C: "Forma aberta de C: toque da 5ª corda até a 1ª.",
      A: "Forma aberta de A: tônica na 5ª corda solta.",
      G: "Forma aberta de G: deixe as cordas do meio soarem soltas.",
      E: "Forma aberta de E: todas as seis cordas soam.",
      D: "Forma aberta de D: toque somente as quatro cordas agudas.",
    }[shape];
  return {
    C: `Forma de C a partir da casa ${baseFret}: tônica na 5ª corda com o dedo 4.`,
    A: `Forma de A: pestana do dedo 1 na casa ${baseFret}, da 5ª à 1ª corda.`,
    G:
      suffix === "minor"
        ? `Forma de G a partir da casa ${baseFret}: toque só as quatro cordas graves.`
        : `Forma de G a partir da casa ${baseFret}: tônica na 6ª corda.`,
    E: `Forma de E: pestana completa na casa ${baseFret}.`,
    D: `Forma de D a partir da casa ${baseFret}: toque as quatro cordas agudas.`,
  }[shape];
};

let nextId = 1;
const trails = TRAILS.map((trail, trailIndex) => {
  const { suffix } = trail;
  const lessons = CYCLE_OF_FOURTHS.map((root, index) => {
    const name = chordSymbol(root, suffix);
    const steps = shapesUpTheNeck(root).map((shape) => {
      const position = fromCaged(root, shape, undefined, suffix);
      const { errors } = validate(position, root, suffix, shape);
      if (errors.length) throw new Error(`${name} forma ${shape}: ${errors.join("; ")}`);
      return [
        "          {",
        `            chord: "${name}",`,
        ...(suffix === "major" ? [] : [`            suffix: "${suffix}",`]),
        `            shape: "${shape}",`,
        `            instruction: "${instruction(shape, position.baseFret, suffix)}",`,
        `            position: ${formatPosition(position)},`,
        "          },",
      ].join("\n");
    });
    const title = `${lessonName(root, suffix)} - formas CAGED`;
    const current = trailIndex === 0 && index === 0;
    return `      {
        id: ${nextId++},
        title: "${title}",
        exerciseTitle: "${title}",
        subtitle: "${name} nas cinco formas, subindo o braço",
        type: "chord",
        status: "${current ? "current" : "locked"}",
        steps: [
${steps.join("\n")}
        ],
      },`;
  });
  return `      {
        title: "${trail.title}",
        lessons: [
${lessons.join("\n")}
        ],
      },`;
});

// ---------------------------------------------------------------- section 2
// Seventh-chord inversions, written voicing by voicing (absolute frets, low E →
// high E) as the user defines them.
const INVERSIONS = {
  title: "Inversões de Tétrades",
  subtitle: "Tétrades com o baixo na terça, na quinta e na sétima, em todas as formas",
  trails: [
    {
      title: "1ª inversão: baixo na terça",
      lessons: [
        {
          title: "C7M - baixo na terça",
          subtitle: "C7M com a terça no baixo, nas formas CAGED",
          steps: [
            {
              root: "C",
              suffix: "maj7",
              bassNote: "E",
              bass: "third",
              shape: "C",
              frets: "xx2413",
              fingers: [0, 0, 2, 4, 1, 3],
              instruction: "Forma de C com a terça (E) no baixo, na 4ª corda.",
            },
          ],
        },
      ],
    },
  ],
};

/** Absolute frets ("xx2413" or [-1, -1, 2, 4, 1, 3]) → a chords-db position. */
function positionFromFrets(frets, fingers) {
  const abs = typeof frets === "string" ? [...frets].map((c) => (c === "x" ? -1 : Number.parseInt(c, 36))) : frets;
  const fretted = abs.filter((fret) => fret > 0);
  const baseFret = Math.max(1, Math.min(...fretted) - (Math.max(...fretted) <= 5 ? Math.min(...fretted) : 1));
  const rel = abs.map((fret) => (fret <= 0 ? fret : fret - baseFret + 1));
  return { frets: rel, fingers, baseFret, barres: barresOf(rel, fingers), midi: midiOf(rel, baseFret) };
}

const inversionTrails = INVERSIONS.trails.map((trail) => {
  const lessons = trail.lessons.map((lesson) => {
    const steps = lesson.steps.map((step) => {
      const position = positionFromFrets(step.frets, step.fingers);
      const name = `${chordSymbol(step.root, step.suffix)}/${step.bassNote}`;
      const { errors } = validate(position, step.root, step.suffix, step.shape, step.bass);
      if (errors.length) throw new Error(`${name} forma ${step.shape}: ${errors.join("; ")}`);
      return [
        "          {",
        `            chord: "${name}",`,
        `            suffix: "${step.suffix}",`,
        `            bass: "${step.bass}",`,
        `            shape: "${step.shape}",`,
        `            instruction: "${step.instruction}",`,
        `            position: ${formatPosition(position)},`,
        "          },",
      ].join("\n");
    });
    return `      {
        id: ${nextId++},
        title: "${lesson.title}",
        exerciseTitle: "${lesson.title}",
        subtitle: "${lesson.subtitle}",
        type: "chord",
        status: "locked",
        steps: [
${steps.join("\n")}
        ],
      },`;
  });
  return `      {
        title: "${trail.title}",
        lessons: [
${lessons.join("\n")}
        ],
      },`;
});

const file = `import type { ChordStep } from "./chords.ts";

// One section with a trail per chord quality (major, minor, 7, m7(♭5)); in each trail, one
// lesson per key (cycle of fourths): the chord in its five CAGED shapes,
// from the lowest shape up the neck; the final exercise plays all five in
// sequence. Every chord is written out in full in the chords-db format
// (strings low E → high E). Generated by scripts/chords/build-key-lessons.mjs
// (chord-generator skill); validate with \`npm run check:chords\`.

export type Lesson = {
  id: number;
  title: string;
  exerciseTitle: string;
  subtitle: string;
  type: "theory" | "chord" | "practice" | "review";
  status: "done" | "current" | "locked";
  steps: ChordStep[];
  /** Tempo of the last final-exercise run, set from the learner's progress (src/progress.ts). */
  lastBpm?: number;
};

/** One trail of the home page, under a small heading ("Acordes maiores"). */
export type Trail = {
  title: string;
  lessons: Lesson[];
};

export type Section = {
  id: number;
  title: string;
  subtitle: string;
  trails: Trail[];
};

export const sections: Section[] = [
  {
    id: 1,
    title: "${SECTION.title}",
    subtitle: "${SECTION.subtitle}",
    trails: [
${trails.join("\n")}
    ],
  },
  {
    id: 2,
    title: "${INVERSIONS.title}",
    subtitle: "${INVERSIONS.subtitle}",
    trails: [
${inversionTrails.join("\n")}
    ],
  },
];

/** Every lesson of every trail, in order. */
export const lessons: Lesson[] = sections.flatMap((section) => section.trails.flatMap((trail) => trail.lessons));
`;
fs.writeFileSync(path.resolve(import.meta.dirname, "../../src/lessons.ts"), file);
console.log(`src/lessons.ts: 2 seções, ${TRAILS.length + INVERSIONS.trails.length} trilhas, ${nextId - 1} aulas`);
