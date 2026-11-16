#!/usr/bin/env node
// Writes src/lessons.ts: the CAGED module (one trail per chord quality — major,
// minor, dominant seventh, half-diminished — and, in each, one lesson per key: the
// chord in its five CAGED shapes), the triad-inversion module and the
// seventh-chord-inversion module. Keys follow the cycle of fourths.
//
//   node scripts/chords/build-key-lessons.mjs
//
// The lessons file keeps every chord written out in full (chords-db format);
// run `npm run check:chords` afterwards.
import fs from "node:fs";
import path from "node:path";
import {
  barresOf,
  BASS_TONES,
  chordSymbol,
  CYCLE_OF_FOURTHS,
  DOMINANT_CYCLE,
  HALF_DIMINISHED_CYCLE,
  MINOR_CYCLE,
  formatPosition,
  fromCaged,
  midiOf,
  rootPitchClass,
  shapesUpTheNeck,
  SUFFIX_INTERVALS,
  validate,
} from "./lib.mjs";

// Every text is bilingual ({ pt, en }); the app picks one with the language selector.
/** A `Localized` value written as TypeScript source. */
const loc = (text) => `{ pt: ${JSON.stringify(text.pt)}, en: ${JSON.stringify(text.en)} }`;
/** Chord symbol in English: Brazilian "7+" is "maj7". */
const englishSymbol = (symbol) => symbol.replace("7+", "maj7");
const ORDINAL_EN = { 4: "4th", 5: "5th", 6: "6th" };
/**
 * Stable lesson key ("caged/major/Bb", "inversions/third/maj7/C"): progress is saved
 * under it, locally and in the account, so it must never change when lessons are
 * added or reordered (unlike the sequential id).
 */
const ascii = (root) => root.replace("♭", "b").replace("♯", "#");
const lessonKey = (...parts) => parts.join("/");

const SECTION = {
  title: { pt: "Acordes Básicos no CAGED", en: "Basic Chords with CAGED" },
  subtitle: {
    pt: "Faça qualquer acorde em qualquer tonalidade em qualquer lugar do braço",
    en: "Play any chord in any key anywhere on the neck",
  },
};
const TRAILS = [
  { suffix: "major", title: { pt: "Acordes maiores", en: "Major chords" } },
  { suffix: "minor", title: { pt: "Acordes menores", en: "Minor chords" } },
  { suffix: "7", title: { pt: "Acordes de sétima dominante", en: "Dominant seventh chords" } },
  { suffix: "m7b5", title: { pt: "Acordes meio diminutos", en: "Half-diminished chords" } },
];
/** Lesson title prefix: "C maior" / "C major", "C7", "Cm7(♭5)". */
const lessonName = (root, suffix) => ({
  pt: ({ major: `${root} maior`, minor: `${root} menor` })[suffix] ?? chordSymbol(root, suffix),
  en: ({ major: `${root} major`, minor: `${root} minor` })[suffix] ?? englishSymbol(chordSymbol(root, suffix)),
});

const instruction = (shape, baseFret, suffix) => {
  if (suffix !== "major" && suffix !== "minor")
    return baseFret === 1
      ? { pt: `Forma de ${shape} na primeira posição.`, en: `${shape} shape in first position.` }
      : { pt: `Forma de ${shape} a partir da casa ${baseFret}.`, en: `${shape} shape from fret ${baseFret}.` };
  if (baseFret === 1)
    return {
      C: { pt: "Forma aberta de C: toque da 5ª corda até a 1ª.", en: "Open C shape: play from the 5th string to the 1st." },
      A: { pt: "Forma aberta de A: tônica na 5ª corda solta.", en: "Open A shape: root on the open 5th string." },
      G: { pt: "Forma aberta de G: deixe as cordas do meio soarem soltas.", en: "Open G shape: let the middle strings ring open." },
      E: { pt: "Forma aberta de E: todas as seis cordas soam.", en: "Open E shape: all six strings ring." },
      D: { pt: "Forma aberta de D: toque somente as quatro cordas agudas.", en: "Open D shape: play only the top four strings." },
    }[shape];
  return {
    C: {
      pt: `Forma de C a partir da casa ${baseFret}: tônica na 5ª corda com o dedo 4.`,
      en: `C shape from fret ${baseFret}: root on the 5th string with finger 4.`,
    },
    A: {
      pt: `Forma de A: pestana do dedo 1 na casa ${baseFret}, da 5ª à 1ª corda.`,
      en: `A shape: finger-1 barre at fret ${baseFret}, from the 5th string to the 1st.`,
    },
    G:
      suffix === "minor"
        ? {
            pt: `Forma de G a partir da casa ${baseFret}: toque só as quatro cordas graves.`,
            en: `G shape from fret ${baseFret}: play only the four low strings.`,
          }
        : {
            pt: `Forma de G a partir da casa ${baseFret}: tônica na 6ª corda.`,
            en: `G shape from fret ${baseFret}: root on the 6th string.`,
          },
    E: { pt: `Forma de E: pestana completa na casa ${baseFret}.`, en: `E shape: full barre at fret ${baseFret}.` },
    D: {
      pt: `Forma de D a partir da casa ${baseFret}: toque as quatro cordas agudas.`,
      en: `D shape from fret ${baseFret}: play the top four strings.`,
    },
  }[shape];
};

let nextId = 1;
const trails = TRAILS.map((trail, trailIndex) => {
  const { suffix } = trail;
  // Key-signature rule: minor keys G♯m, C♯m, F♯m (not A♭m …); half-diminished
  // chords as the 7th degree of a major key (A♯m7(♭5), not B♭m7(♭5)); F♯7, not G♭7.
  const cycle = { minor: MINOR_CYCLE, "7": DOMINANT_CYCLE, m7b5: HALF_DIMINISHED_CYCLE }[suffix] ?? CYCLE_OF_FOURTHS;
  const lessons = cycle.map((root, index) => {
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
        `            instruction: ${loc(instruction(shape, position.baseFret, suffix))},`,
        `            position: ${formatPosition(position)},`,
        "          },",
      ].join("\n");
    });
    const lessonTitle = lessonName(root, suffix);
    const title = loc({ pt: `${lessonTitle.pt} - formas CAGED`, en: `${lessonTitle.en} - CAGED shapes` });
    const subtitle = loc({
      pt: `${name} nas cinco formas, subindo o braço`,
      en: `${englishSymbol(name)} in all five shapes, moving up the neck`,
    });
    const current = trailIndex === 0 && index === 0;
    return `      {
        id: ${nextId++},
        key: "${lessonKey("caged", suffix, ascii(root))}",
        title: ${title},
        exerciseTitle: ${title},
        subtitle: ${subtitle},
        type: "chord",
        status: "${current ? "current" : "locked"}",
        steps: [
${steps.join("\n")}
        ],
      },`;
  });
  return `      {
        title: ${loc(trail.title)},
        lessons: [
${lessons.join("\n")}
        ],
      },`;
});

// ---------------------------------------------------------------- seventh-chord inversions
// Seventh-chord inversions, written voicing by voicing (absolute frets, low E →
// high E) as the user defines them.
// Voicings of C7+/E (first inversion), written as the user plays them: absolute
// frets low E → high E, fingers, bass string. Every key is this model moved up
// the neck (see `transpose`).
const FIRST_INVERSION_C = [
  { bassString: 4, frets: [-1, -1, 2, 4, 1, 3], fingers: [0, 0, 2, 4, 1, 3] },
  { bassString: 5, frets: [-1, 7, 9, 5, 8, -1], fingers: [0, 2, 4, 1, 3, 0] },
  { bassString: 5, frets: [-1, 7, -1, 5, 8, 7], fingers: [0, 2, 0, 1, 4, 3], alternative: true },
  { bassString: 6, frets: [12, 14, 10, 12, -1, -1], fingers: [2, 4, 1, 3, 0, 0] },
  { bassString: 6, frets: [12, -1, 10, 12, 12, -1], fingers: [2, 0, 1, 3, 4, 0], alternative: true },
];

// C7+/G (second inversion): 4th string from chords-db, 5th and 6th as the user plays them.
const SECOND_INVERSION_C = [
  { bassString: 4, frets: [-1, -1, 5, 5, 5, 7], fingers: [0, 0, 1, 1, 1, 4] },
  { bassString: 5, frets: [-1, 10, 10, 9, 12, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [3, 3, 2, 4, -1, -1], fingers: [2, 3, 1, 4, 0, 0] },
];

// Cm7/E♭ (first inversion of the minor seventh), as the user plays it.
const FIRST_INVERSION_CM = [
  { bassString: 4, frets: [-1, -1, 1, 3, 1, 3], fingers: [0, 0, 1, 3, 1, 4] },
  { bassString: 5, frets: [-1, 6, 8, 5, 8, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 5, frets: [-1, 6, -1, 5, 8, 6], fingers: [0, 2, 0, 1, 4, 3], alternative: true },
  { bassString: 6, frets: [11, 13, 10, 12, -1, -1], fingers: [2, 4, 1, 3, 0, 0] },
  { bassString: 6, frets: [11, -1, 10, 12, 11, -1], fingers: [2, 0, 1, 4, 3, 0], alternative: true },
];

// C7/E (first inversion of the dominant seventh): main voicings as the user
// plays them, alternatives following the major/minor model (B♭ on top).
const FIRST_INVERSION_C7 = [
  { bassString: 4, frets: [-1, -1, 2, 3, 1, 3], fingers: [0, 0, 2, 3, 1, 4] },
  { bassString: 5, frets: [-1, 7, 8, 5, 8, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 5, frets: [-1, 7, -1, 5, 8, 6], fingers: [0, 3, 0, 1, 4, 2], alternative: true },
  { bassString: 6, frets: [12, 13, 10, 12, -1, -1], fingers: [2, 4, 1, 3, 0, 0] },
  { bassString: 6, frets: [12, -1, 10, 12, 11, -1], fingers: [3, 0, 1, 4, 2, 0], alternative: true },
];

// Cm7(♭5)/E♭ (first inversion of the half-diminished), as the user plays it.
const FIRST_INVERSION_CM7B5 = [
  { bassString: 4, frets: [-1, -1, 1, 3, 1, 2], fingers: [0, 0, 1, 3, 1, 2] },
  { bassString: 5, frets: [-1, 6, 8, 5, 7, -1], fingers: [0, 2, 4, 1, 3, 0] },
  { bassString: 5, frets: [-1, 6, -1, 5, 7, 6], fingers: [0, 2, 0, 1, 4, 3], alternative: true },
  { bassString: 6, frets: [11, 13, 10, 11, -1, -1], fingers: [2, 4, 1, 3, 0, 0] },
  { bassString: 6, frets: [11, -1, 10, 11, 11, -1], fingers: [2, 0, 1, 3, 4, 0], alternative: true },
];

// Second inversions of the other qualities, derived from the C7+/G model by
// lowering the chord tones that differ (third, fifth, seventh).
const SECOND_INVERSION_CM = [
  { bassString: 4, frets: [-1, -1, 5, 5, 4, 6], fingers: [0, 0, 2, 3, 1, 4] },
  { bassString: 5, frets: [-1, 10, 10, 8, 11, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [3, 3, 1, 3, -1, -1], fingers: [2, 3, 1, 4, 0, 0] },
];
const SECOND_INVERSION_C7 = [
  { bassString: 4, frets: [-1, -1, 5, 5, 5, 6], fingers: [0, 0, 1, 1, 1, 2] },
  { bassString: 5, frets: [-1, 10, 10, 9, 11, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [3, 3, 2, 3, -1, -1], fingers: [2, 3, 1, 4, 0, 0] },
];
const SECOND_INVERSION_CM7B5 = [
  { bassString: 4, frets: [-1, -1, 4, 5, 4, 6], fingers: [0, 0, 1, 2, 1, 3] },
  { bassString: 5, frets: [-1, 9, 10, 8, 11, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [2, 3, 1, 3, -1, -1], fingers: [2, 3, 1, 4, 0, 0] },
];

// Third inversions (seventh in the bass), no alternatives: same string sets as
// the other inversions (B E G C for C7+/B); the other qualities lower the chord
// tones that differ.
const THIRD_INVERSION_C = [
  { bassString: 4, frets: [-1, -1, 9, 9, 8, 8], fingers: [0, 0, 2, 3, 1, 1] },
  { bassString: 5, frets: [-1, 14, 14, 12, 13, -1], fingers: [0, 3, 4, 1, 2, 0] }, // in C: x2201x (open G)
  { bassString: 6, frets: [7, 7, 5, 5, -1, -1], fingers: [3, 4, 1, 1, 0, 0] },
];
const THIRD_INVERSION_CM = [
  { bassString: 4, frets: [-1, -1, 8, 8, 8, 8], fingers: [0, 0, 1, 1, 1, 1] },
  { bassString: 5, frets: [-1, 13, 13, 12, 13, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [6, 6, 5, 5, -1, -1], fingers: [2, 3, 1, 1, 0, 0] },
];
const THIRD_INVERSION_C7 = [
  { bassString: 4, frets: [-1, -1, 8, 9, 8, 8], fingers: [0, 0, 1, 2, 1, 1] },
  { bassString: 5, frets: [-1, 13, 14, 12, 13, -1], fingers: [0, 2, 4, 1, 3, 0] },
  { bassString: 6, frets: [6, 7, 5, 5, -1, -1], fingers: [2, 3, 1, 1, 0, 0] },
];
const THIRD_INVERSION_CM7B5 = [
  { bassString: 4, frets: [-1, -1, 8, 8, 7, 8], fingers: [0, 0, 2, 3, 1, 4] },
  { bassString: 5, frets: [-1, 13, 13, 11, 13, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 6, frets: [6, 6, 4, 5, -1, -1], fingers: [3, 4, 1, 2, 0, 0] },
];

// Root position (ordem direta, bass = root), C models. Proposed by Claude
// (2026-11-13), pending the user's review: drop 2 on each bass string, plus a
// drop 3 alternative (string skipped) on the 5th and 6th strings.
const ROOT_POSITION_C = [
  { bassString: 4, frets: [-1, -1, 10, 12, 12, 12], fingers: [0, 0, 1, 2, 3, 4] },
  { bassString: 5, frets: [-1, 3, 5, 4, 5, -1], fingers: [0, 1, 3, 2, 4, 0] },
  { bassString: 5, frets: [-1, 3, -1, 4, 5, 3], fingers: [0, 2, 0, 3, 4, 1], alternative: true },
  { bassString: 6, frets: [8, 10, 9, 9, -1, -1], fingers: [1, 4, 2, 3, 0, 0] },
  { bassString: 6, frets: [8, -1, 9, 9, 8, -1], fingers: [2, 0, 3, 4, 1, 0], alternative: true },
];
const ROOT_POSITION_CM = [
  { bassString: 4, frets: [-1, -1, 10, 12, 11, 11], fingers: [0, 0, 1, 4, 2, 3] },
  { bassString: 5, frets: [-1, 3, 5, 3, 4, -1], fingers: [0, 1, 3, 1, 2, 0] },
  { bassString: 5, frets: [-1, 3, -1, 3, 4, 3], fingers: [0, 1, 0, 1, 2, 1], alternative: true },
  { bassString: 6, frets: [8, 10, 8, 8, -1, -1], fingers: [1, 3, 1, 1, 0, 0] },
  { bassString: 6, frets: [8, -1, 8, 8, 8, -1], fingers: [2, 0, 3, 4, 1, 0], alternative: true },
];
const ROOT_POSITION_C7 = [
  { bassString: 4, frets: [-1, -1, 10, 12, 11, 12], fingers: [0, 0, 1, 3, 2, 4] },
  { bassString: 5, frets: [-1, 3, 5, 3, 5, -1], fingers: [0, 1, 3, 1, 4, 0] },
  { bassString: 5, frets: [-1, 3, -1, 3, 5, 3], fingers: [0, 2, 0, 3, 4, 1], alternative: true },
  { bassString: 6, frets: [8, 10, 8, 9, -1, -1], fingers: [1, 3, 1, 2, 0, 0] },
  { bassString: 6, frets: [8, -1, 8, 9, 8, -1], fingers: [2, 0, 3, 4, 1, 0], alternative: true },
];
const ROOT_POSITION_CM7B5 = [
  { bassString: 4, frets: [-1, -1, 10, 11, 11, 11], fingers: [0, 0, 1, 2, 3, 4] },
  { bassString: 5, frets: [-1, 3, 4, 3, 4, -1], fingers: [0, 2, 3, 1, 4, 0] },
  { bassString: 5, frets: [-1, 3, -1, 3, 4, 2], fingers: [0, 2, 0, 3, 4, 1], alternative: true },
  { bassString: 6, frets: [8, 9, 8, 8, -1, -1], fingers: [1, 2, 1, 1, 0, 0] },
  { bassString: 6, frets: [8, -1, 8, 8, 7, -1], fingers: [2, 0, 3, 4, 1, 0], alternative: true },
];

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
/** Letters a chord tone sits above the root (third = 2 letters up, …). */
const BASS_LETTER_STEPS = { root: 0, third: 2, fifth: 4, seventh: 6 };

/**
 * Spells the note `semitones` above `root` on the letter `letterSteps` above it,
 * so the name follows the key signature (B major: third = D♯, E♭ major: G; on
 * the treble clef as in any clef).
 */
function spell(root, semitones, letterSteps) {
  const letter = LETTERS[(LETTERS.indexOf(root[0]) + letterSteps) % 7];
  const pc = (rootPitchClass(root) + semitones) % 12;
  const offset = ((pc - rootPitchClass(letter) + 18) % 12) - 6;
  return letter + ({ "-2": "𝄫", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" }[offset] ?? "?");
}

/**
 * Moves C voicings to `root` by one shift for all of them: the lowest shift
 * (mod 12) that keeps every note on the neck. When the lowest fretted notes land
 * on fret 0 they become open strings (C7/B♭ = x1201x rather than at fret 13):
 * their fingers are dropped and the others renumbered from 1. A main voicing
 * and its alternatives move together, so they stay in the same region.
 */
function transpose(voicings, root) {
  const interval = (rootPitchClass(root) - rootPitchClass("C") + 12) % 12;
  const fretted = voicings.flatMap(({ frets }) => frets.filter((fret) => fret > 0));
  const shift = Math.min(
    ...[interval - 24, interval - 12, interval, interval + 12].filter((s) => Math.min(...fretted) + s >= 0),
  );
  return voicings.map(({ frets, fingers }) => {
    const moved = frets.map((fret) => (fret < 0 ? fret : fret + shift));
    if (!moved.includes(0) || frets.includes(0)) return { frets: moved, fingers };
    const kept = fingers.map((finger, string) => (moved[string] === 0 ? 0 : finger));
    const order = [...new Set(kept.filter((finger) => finger > 0))].sort((a, b) => a - b);
    return { frets: moved, fingers: kept.map((finger) => (finger === 0 ? 0 : order.indexOf(finger) + 1)) };
  });
}

function inversionLesson(root, suffix, bass, label, model, module = "inversions") {
  const symbol = chordSymbol(root, suffix);
  const bassNote = spell(root, SUFFIX_INTERVALS[suffix][BASS_TONES[bass]], BASS_LETTER_STEPS[bass]);
  // Group each main voicing with its alternatives and move the group together.
  const groups = [];
  for (const voicing of model) {
    if (voicing.alternative) groups.at(-1).push(voicing);
    else groups.push([voicing]);
  }
  const moved = new Map(
    groups.flatMap((group) => {
      const moved = transpose(group, root);
      return group.map((voicing, index) => [voicing, moved[index]]);
    }),
  );
  const steps = model.map((voicing) => ({
      root,
      suffix,
      bassNote,
      bass,
      bassString: voicing.bassString,
      frets: moved.get(voicing).frets,
      fingers: moved.get(voicing).fingers,
      alternative: voicing.alternative,
      instruction: {
        pt: `${label.pt[0].toUpperCase()}${label.pt.slice(1)} (${bassNote}) no baixo, na ${voicing.bassString}ª corda.`,
        en: `${label.en[0].toUpperCase()}${label.en.slice(1)} (${bassNote}) in the bass, on the ${ORDINAL_EN[voicing.bassString]} string.`,
      },
  }));
  return {
    key: lessonKey(module, bass, suffix, ascii(root)),
    title: { pt: `${symbol} - baixo na ${label.pt}`, en: `${englishSymbol(symbol)} - ${label.en} in the bass` },
    subtitle: {
      pt: `${symbol} com a ${label.pt} no baixo, na 4ª, 5ª e 6ª corda`,
      en: `${englishSymbol(symbol)} with the ${label.en} in the bass, on the 4th, 5th and 6th strings`,
    },
    steps: lowToHigh(steps),
  };
}

/**
 * Orders a lesson along the neck: from the voicing nearest the nut to the one
 * nearest the body (lowest fretted note, then highest). Each alternative
 * fingering stays right after its main voicing.
 */
function lowToHigh(steps) {
  const groups = [];
  for (const step of steps) {
    if (step.alternative) groups.at(-1).push(step);
    else groups.push([step]);
  }
  const span = ({ frets }) => {
    const played = frets.filter((fret) => fret >= 0); // open strings count as fret 0
    return [Math.min(...played), Math.max(...played)];
  };
  const compare = ([a], [b]) => {
    const [[loA, hiA], [loB, hiB]] = [span(a), span(b)];
    return loA - loB || hiA - hiB;
  };
  return groups.sort(compare).flat();
}

/**
 * Review lesson of one quality in one key: every inversion on every bass string
 * (main fingerings only), from the voicing nearest the nut to the one nearest
 * the bridge.
 */
function reviewLesson(root, suffix, groups, module, count) {
  const symbol = chordSymbol(root, suffix);
  const steps = groups.flatMap((group) =>
    inversionLesson(root, suffix, group.bass, group.label, group.models[suffix], module).steps.filter((step) => !step.alternative),
  );
  return {
    key: lessonKey(module, "review", suffix, ascii(root)),
    title: { pt: `${symbol} - todas as inversões`, en: `${englishSymbol(symbol)} - all inversions` },
    subtitle: {
      pt: `As ${count.pt} inversões de ${symbol} em todas as cordas, da região mais próxima da pestana até a mais próxima da ponte`,
      en: `All ${count.en} inversions of ${englishSymbol(symbol)} on every string, from the region nearest the nut to the one nearest the bridge`,
    },
    steps: lowToHigh(steps),
  };
}

const REVIEW_GROUP = { pt: "Revisão: todas as inversões", en: "Review: all inversions" };

/** One review trail per quality: every inversion of the chord, along the whole neck. */
const reviewTrails = (groups, qualities, module, count) =>
  qualities.map((quality) => ({
    group: REVIEW_GROUP,
    review: true,
    title: quality.title,
    lessons: quality.cycle.map((root) => reviewLesson(root, quality.suffix, groups, module, count)),
  }));

// Trails grouped by inversion (a collapsible category on the home page), one
// trail per chord quality inside each group.
const INVERSION_GROUPS = [
  { title: { pt: "Ordem direta: baixo na tônica", en: "Root position: root in the bass" }, bass: "root", label: { pt: "tônica", en: "root" },
    models: { maj7: ROOT_POSITION_C, m7: ROOT_POSITION_CM, "7": ROOT_POSITION_C7, m7b5: ROOT_POSITION_CM7B5 } },
  { title: { pt: "1ª inversão: baixo na terça", en: "1st inversion: third in the bass" }, bass: "third", label: { pt: "terça", en: "third" },
    models: { maj7: FIRST_INVERSION_C, m7: FIRST_INVERSION_CM, "7": FIRST_INVERSION_C7, m7b5: FIRST_INVERSION_CM7B5 } },
  { title: { pt: "2ª inversão: baixo na quinta", en: "2nd inversion: fifth in the bass" }, bass: "fifth", label: { pt: "quinta", en: "fifth" },
    models: { maj7: SECOND_INVERSION_C, m7: SECOND_INVERSION_CM, "7": SECOND_INVERSION_C7, m7b5: SECOND_INVERSION_CM7B5 } },
  { title: { pt: "3ª inversão: baixo na sétima", en: "3rd inversion: seventh in the bass" }, bass: "seventh", label: { pt: "sétima", en: "seventh" },
    models: { maj7: THIRD_INVERSION_C, m7: THIRD_INVERSION_CM, "7": THIRD_INVERSION_C7, m7b5: THIRD_INVERSION_CM7B5 } },
];
const QUALITIES = [
  { suffix: "maj7", title: { pt: "Acordes maiores", en: "Major seventh chords" }, cycle: CYCLE_OF_FOURTHS },
  { suffix: "m7", title: { pt: "Acordes menores", en: "Minor seventh chords" }, cycle: MINOR_CYCLE },
  { suffix: "7", title: { pt: "Acordes de sétima dominante", en: "Dominant seventh chords" }, cycle: DOMINANT_CYCLE },
  { suffix: "m7b5", title: { pt: "Acordes meio diminutos", en: "Half-diminished chords" }, cycle: HALF_DIMINISHED_CYCLE },
];

const INVERSIONS = {
  title: { pt: "Inversões de Tétrades", en: "Seventh Chord Inversions" },
  subtitle: {
    pt: "Cada tétrade na ordem direta e com o baixo na terça, na quinta e na sétima, na 4ª, 5ª e 6ª corda",
    en: "Every seventh chord in root position and with the third, fifth and seventh in the bass, on the 4th, 5th and 6th strings",
  },
  trails: [
    ...INVERSION_GROUPS.flatMap((group) =>
      QUALITIES.map((quality) => ({
        group: group.title,
        title: quality.title,
        lessons: quality.cycle.map((root) =>
          inversionLesson(root, quality.suffix, group.bass, group.label, group.models[quality.suffix]),
        ),
      })),
    ),
    ...reviewTrails(INVERSION_GROUPS, QUALITIES, "inversions", { pt: "quatro", en: "four" }),
  ],
};

// ---------------------------------------------------------------- triads
// Triad inversions (module "Inversões de Tríades"): close voicings on three
// adjacent strings, bass on the 6th, 5th or 4th string, in root position and
// with the third or the fifth in the bass. C models proposed by Claude
// (2026-11-16), pending the user's review; every key is the model moved up
// the neck (`transpose`), as in the seventh-chord inversions.
const TRIAD_ROOT_C = [
  { bassString: 6, frets: [8, 7, 5, -1, -1, -1], fingers: [4, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 14, 12, -1, -1], fingers: [0, 4, 3, 1, 0, 0] }, // in C: x320xx
  { bassString: 4, frets: [-1, -1, 10, 9, 8, -1], fingers: [0, 0, 3, 2, 1, 0] },
];
const TRIAD_FIRST_C = [
  { bassString: 6, frets: [12, 10, 10, -1, -1, -1], fingers: [3, 1, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 7, 5, 5, -1, -1], fingers: [0, 3, 1, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 14, 12, 13, -1], fingers: [0, 0, 3, 1, 2, 0] }, // in C: xx201x
];
const TRIAD_SECOND_C = [
  { bassString: 6, frets: [3, 3, 2, -1, -1, -1], fingers: [2, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 10, 10, 9, -1, -1], fingers: [0, 2, 3, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 5, 5, 5, -1], fingers: [0, 0, 1, 1, 1, 0] },
];
const TRIAD_ROOT_CM = [
  { bassString: 6, frets: [8, 6, 5, -1, -1, -1], fingers: [4, 2, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 13, 12, -1, -1], fingers: [0, 4, 2, 1, 0, 0] }, // in C: x310xx
  { bassString: 4, frets: [-1, -1, 10, 8, 8, -1], fingers: [0, 0, 3, 1, 1, 0] },
];
const TRIAD_FIRST_CM = [
  { bassString: 6, frets: [11, 10, 10, -1, -1, -1], fingers: [2, 1, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 6, 5, 5, -1, -1], fingers: [0, 2, 1, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 13, 12, 13, -1], fingers: [0, 0, 2, 1, 3, 0] }, // in C: xx101x
];
const TRIAD_SECOND_CM = [
  { bassString: 6, frets: [3, 3, 1, -1, -1, -1], fingers: [3, 4, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 10, 10, 8, -1, -1], fingers: [0, 3, 4, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 5, 5, 4, -1], fingers: [0, 0, 2, 3, 1, 0] },
];
const TRIAD_ROOT_CDIM = [
  { bassString: 6, frets: [8, 6, 4, -1, -1, -1], fingers: [4, 2, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 13, 11, -1, -1], fingers: [0, 4, 2, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 10, 8, 7, -1], fingers: [0, 0, 4, 2, 1, 0] },
];
const TRIAD_FIRST_CDIM = [
  { bassString: 6, frets: [11, 9, 10, -1, -1, -1], fingers: [3, 1, 2, 0, 0, 0] },
  { bassString: 5, frets: [-1, 6, 4, 5, -1, -1], fingers: [0, 3, 1, 2, 0, 0] },
  { bassString: 4, frets: [-1, -1, 13, 11, 13, -1], fingers: [0, 0, 2, 1, 3, 0] },
];
const TRIAD_SECOND_CDIM = [
  { bassString: 6, frets: [2, 3, 1, -1, -1, -1], fingers: [2, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 9, 10, 8, -1, -1], fingers: [0, 2, 3, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 4, 5, 4, -1], fingers: [0, 0, 1, 2, 1, 0] },
];

const TRIAD_GROUPS = [
  { title: INVERSION_GROUPS[0].title, bass: "root", label: INVERSION_GROUPS[0].label,
    models: { major: TRIAD_ROOT_C, minor: TRIAD_ROOT_CM, dim: TRIAD_ROOT_CDIM } },
  { title: INVERSION_GROUPS[1].title, bass: "third", label: INVERSION_GROUPS[1].label,
    models: { major: TRIAD_FIRST_C, minor: TRIAD_FIRST_CM, dim: TRIAD_FIRST_CDIM } },
  { title: INVERSION_GROUPS[2].title, bass: "fifth", label: INVERSION_GROUPS[2].label,
    models: { major: TRIAD_SECOND_C, minor: TRIAD_SECOND_CM, dim: TRIAD_SECOND_CDIM } },
];
const TRIAD_QUALITIES = [
  { suffix: "major", title: { pt: "Tríades maiores", en: "Major triads" }, cycle: CYCLE_OF_FOURTHS },
  { suffix: "minor", title: { pt: "Tríades menores", en: "Minor triads" }, cycle: MINOR_CYCLE },
  // Diminished triads as the 7th degree of a major key (A♯dim, not B♭dim), like m7(♭5).
  { suffix: "dim", title: { pt: "Tríades diminutas", en: "Diminished triads" }, cycle: HALF_DIMINISHED_CYCLE },
];

const TRIADS = {
  title: { pt: "Inversões de Tríades", en: "Triad Inversions" },
  subtitle: {
    pt: "Cada tríade na ordem direta e com o baixo na terça e na quinta, na 4ª, 5ª e 6ª corda",
    en: "Every triad in root position and with the third and fifth in the bass, on the 4th, 5th and 6th strings",
  },
  trails: [
    ...TRIAD_GROUPS.flatMap((group) =>
      TRIAD_QUALITIES.map((quality) => ({
        group: group.title,
        title: quality.title,
        lessons: quality.cycle.map((root) =>
          inversionLesson(root, quality.suffix, group.bass, group.label, group.models[quality.suffix], "triads"),
        ),
      })),
    ),
    ...reviewTrails(TRIAD_GROUPS, TRIAD_QUALITIES, "triads", { pt: "três", en: "three" }),
  ],
};

/** Absolute frets ("xx2413" or [-1, -1, 2, 4, 1, 3]) → a chords-db position. */
function positionFromFrets(frets, fingers) {
  const abs = typeof frets === "string" ? [...frets].map((c) => (c === "x" ? -1 : Number.parseInt(c, 36))) : frets;
  const fretted = abs.filter((fret) => fret > 0);
  // Diagrams start at fret 1 when everything fits there, else at the lowest fretted note.
  const baseFret = Math.max(...fretted) <= 5 ? 1 : Math.min(...fretted);
  const rel = abs.map((fret) => (fret <= 0 ? fret : fret - baseFret + 1));
  return { frets: rel, fingers, baseFret, barres: barresOf(rel, fingers), midi: midiOf(rel, baseFret) };
}

const renderInversionTrails = (module) => module.trails.map((trail) => {
  const lessons = trail.lessons.map((lesson) => {
    const steps = lesson.steps.map((step) => {
      const position = positionFromFrets(step.frets, step.fingers);
      const name = chordSymbol(step.root, step.suffix) + (step.bass === "root" ? "" : `/${step.bassNote}`);
      const { errors } = validate(position, step.root, step.suffix, undefined, step.bass, step.bassString);
      if (errors.length) throw new Error(`${name} baixo na ${step.bassString}ª corda: ${errors.join("; ")}`);
      return [
        "          {",
        `            chord: "${name}",`,
        ...(step.suffix === "major" ? [] : [`            suffix: "${step.suffix}",`]),
        `            bass: "${step.bass}",`,
        `            bassString: ${step.bassString},`,
        `            instruction: ${loc(step.instruction)},`,
        ...(step.alternative ? ["            alternative: true,"] : []),
        `            position: ${formatPosition(position)},`,
        "          },",
      ].join("\n");
    });
    return `      {
        id: ${nextId++},
        key: "${lesson.key}",
        title: ${loc(lesson.title)},
        exerciseTitle: ${loc(lesson.title)},
        subtitle: ${loc(lesson.subtitle)},
        type: "chord",
        status: "locked",
        steps: [
${steps.join("\n")}
        ],
      },`;
  });
  return `      {
        group: ${loc(trail.group)},${trail.review ? "\n        review: true," : ""}
        title: ${loc(trail.title)},
        lessons: [
${lessons.join("\n")}
        ],
      },`;
});

// Module order on the dashboard: CAGED, triads, seventh chords (ids stay: 1, 3, 2).
const triadTrails = renderInversionTrails(TRIADS);
const inversionTrails = renderInversionTrails(INVERSIONS);

const file = `import type { ChordStep } from "./chords.ts";
import type { Localized } from "./i18n.tsx";

// One section with a trail per chord quality (major, minor, 7, m7(♭5)); in each trail, one
// lesson per key (cycle of fourths): the chord in its five CAGED shapes,
// from the lowest shape up the neck; the final exercise plays all five in
// sequence. Every chord is written out in full in the chords-db format
// (strings low E → high E). Generated by scripts/chords/build-key-lessons.mjs
// (chord-generator skill); validate with \`npm run check:chords\`.

export type Lesson = {
  id: number;
  /** Stable key the learner's progress is saved under ("caged/major/C", "inversions/third/maj7/C"). */
  key: string;
  title: Localized;
  exerciseTitle: Localized;
  subtitle: Localized;
  type: "theory" | "chord" | "practice" | "review";
  status: "done" | "current" | "locked";
  steps: ChordStep[];
  /** Tempo of the last final-exercise run, set from the learner's progress (src/progress.ts). */
  lastBpm?: number;
};

/** One trail of the home page, under a small heading ("Acordes maiores"). */
export type Trail = {
  /** Collapsible category the trail sits in ("1ª inversão: baixo na terça"); omitted = none. */
  group?: Localized;
  /** Review trail: every inversion of a quality, along the neck (left out of guide tables and the dictionary). */
  review?: boolean;
  title: Localized;
  lessons: Lesson[];
};

export type Section = {
  id: number;
  title: Localized;
  subtitle: Localized;
  trails: Trail[];
};

export const sections: Section[] = [
  {
    id: 1,
    title: ${loc(SECTION.title)},
    subtitle: ${loc(SECTION.subtitle)},
    trails: [
${trails.join("\n")}
    ],
  },
  {
    id: 3,
    title: ${loc(TRIADS.title)},
    subtitle: ${loc(TRIADS.subtitle)},
    trails: [
${triadTrails.join("\n")}
    ],
  },
  {
    id: 2,
    title: ${loc(INVERSIONS.title)},
    subtitle: ${loc(INVERSIONS.subtitle)},
    trails: [
${inversionTrails.join("\n")}
    ],
  },
];

/** Every lesson of every trail, in order. */
export const lessons: Lesson[] = sections.flatMap((section) => section.trails.flatMap((trail) => trail.lessons));
`;
fs.writeFileSync(path.resolve(import.meta.dirname, "../../src/lessons.ts"), file);
console.log(`src/lessons.ts: 3 seções, ${TRAILS.length + TRIADS.trails.length + INVERSIONS.trails.length} trilhas, ${nextId - 1} aulas`);
