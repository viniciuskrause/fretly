#!/usr/bin/env node
// Writes src/lessons.ts: the CAGED module (one trail per chord quality — major,
// minor, dominant seventh, half-diminished — and, in each, one lesson per key: the
// chord in its five CAGED shapes), the triad-inversion module and the
// seventh-chord-inversion module and the scale module (7 positions of the major
// scale). Keys follow the cycle of fourths.
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
  OPEN_STRING_MIDI,
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
const ORDINAL_EN = { 3: "3rd", 4: "4th", 5: "5th", 6: "6th" };
/** Bass strings of a model, low to high in the text: "3ª, 4ª, 5ª e 6ª corda" / "3rd, 4th, 5th and 6th strings". */
function bassStringList(model) {
  const strings = [...new Set(model.map((voicing) => voicing.bassString))].sort((a, b) => a - b);
  const join = (items, and) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}` : items[0]);
  return {
    pt: `${join(strings.map((string) => `${string}ª`), "e")} corda`,
    en: `${join(strings.map((string) => ORDINAL_EN[string]), "and")} strings`,
  };
}
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
      pt: `${symbol} com a ${label.pt} no baixo, na ${bassStringList(model).pt}`,
      en: `${englishSymbol(symbol)} with the ${label.en} in the bass, on the ${bassStringList(model).en}`,
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
// adjacent strings, bass on the 6th, 5th, 4th or 3rd string, in root position and
// with the third or the fifth in the bass. C models proposed by Claude
// (2026-11-16), pending the user's review; every key is the model moved up
// the neck (`transpose`), as in the seventh-chord inversions.
const TRIAD_ROOT_C = [
  { bassString: 6, frets: [8, 7, 5, -1, -1, -1], fingers: [4, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 14, 12, -1, -1], fingers: [0, 4, 3, 1, 0, 0] }, // in C: x320xx
  { bassString: 4, frets: [-1, -1, 10, 9, 8, -1], fingers: [0, 0, 3, 2, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 5, 5, 3], fingers: [0, 0, 0, 3, 4, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_FIRST_C = [
  { bassString: 6, frets: [12, 10, 10, -1, -1, -1], fingers: [3, 1, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 7, 5, 5, -1, -1], fingers: [0, 3, 1, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 14, 12, 13, -1], fingers: [0, 0, 3, 1, 2, 0] }, // in C: xx201x
  { bassString: 3, frets: [-1, -1, -1, 9, 8, 8], fingers: [0, 0, 0, 2, 1, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_SECOND_C = [
  { bassString: 6, frets: [3, 3, 2, -1, -1, -1], fingers: [2, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 10, 10, 9, -1, -1], fingers: [0, 2, 3, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 5, 5, 5, -1], fingers: [0, 0, 1, 1, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 12, 13, 12], fingers: [0, 0, 0, 1, 2, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_ROOT_CM = [
  { bassString: 6, frets: [8, 6, 5, -1, -1, -1], fingers: [4, 2, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 13, 12, -1, -1], fingers: [0, 4, 2, 1, 0, 0] }, // in C: x310xx
  { bassString: 4, frets: [-1, -1, 10, 8, 8, -1], fingers: [0, 0, 3, 1, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 5, 4, 3], fingers: [0, 0, 0, 3, 2, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_FIRST_CM = [
  { bassString: 6, frets: [11, 10, 10, -1, -1, -1], fingers: [2, 1, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 6, 5, 5, -1, -1], fingers: [0, 2, 1, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 13, 12, 13, -1], fingers: [0, 0, 2, 1, 3, 0] }, // in C: xx101x
  { bassString: 3, frets: [-1, -1, -1, 8, 8, 8], fingers: [0, 0, 0, 1, 1, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_SECOND_CM = [
  { bassString: 6, frets: [3, 3, 1, -1, -1, -1], fingers: [3, 4, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 10, 10, 8, -1, -1], fingers: [0, 3, 4, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 5, 5, 4, -1], fingers: [0, 0, 2, 3, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 12, 13, 11], fingers: [0, 0, 0, 2, 3, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_ROOT_CDIM = [
  { bassString: 6, frets: [8, 6, 4, -1, -1, -1], fingers: [4, 2, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 15, 13, 11, -1, -1], fingers: [0, 4, 2, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 10, 8, 7, -1], fingers: [0, 0, 4, 2, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 5, 4, 2], fingers: [0, 0, 0, 4, 3, 1] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_FIRST_CDIM = [
  { bassString: 6, frets: [11, 9, 10, -1, -1, -1], fingers: [3, 1, 2, 0, 0, 0] },
  { bassString: 5, frets: [-1, 6, 4, 5, -1, -1], fingers: [0, 3, 1, 2, 0, 0] },
  { bassString: 4, frets: [-1, -1, 13, 11, 13, -1], fingers: [0, 0, 2, 1, 3, 0] },
  { bassString: 3, frets: [-1, -1, -1, 8, 7, 8], fingers: [0, 0, 0, 2, 1, 3] }, // 3rd-string set (G B E), added 2026-11-16
];
const TRIAD_SECOND_CDIM = [
  { bassString: 6, frets: [2, 3, 1, -1, -1, -1], fingers: [2, 3, 1, 0, 0, 0] },
  { bassString: 5, frets: [-1, 9, 10, 8, -1, -1], fingers: [0, 2, 3, 1, 0, 0] },
  { bassString: 4, frets: [-1, -1, 4, 5, 4, -1], fingers: [0, 0, 1, 2, 1, 0] },
  { bassString: 3, frets: [-1, -1, -1, 11, 13, 11], fingers: [0, 0, 0, 1, 3, 1] }, // 3rd-string set (G B E), added 2026-11-16
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
    pt: "Cada tríade na ordem direta e com o baixo na terça e na quinta, na 3ª, 4ª, 5ª e 6ª corda",
    en: "Every triad in root position and with the third and fifth in the bass, on the 3rd, 4th, 5th and 6th strings",
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

// ---------------------------------------------------------------- scales
// Module "7 Posições do Modo Jônio": the major scale (and its relative natural
// minor) in seven positions, three notes per string except one string with two
// (NOTES_PER_STRING). Position n starts on the n-th degree of the major scale on
// the 6th string, so each position is the
// shape of one mode (1 Jônio … 7 Lócrio). A minor key uses the positions of its
// relative major (A minor = C major), with the degrees and the position numbers
// counted from its own tonic (minor position 1 = Eólio shape). Generated by Claude, fingerings set by the user (2026-11-16).
const MODES = [
  { pt: "Jônio", en: "Ionian" },
  { pt: "Dórico", en: "Dorian" },
  { pt: "Frígio", en: "Phrygian" },
  { pt: "Lídio", en: "Lydian" },
  { pt: "Mixolídio", en: "Mixolydian" },
  { pt: "Eólio", en: "Aeolian" },
  { pt: "Lócrio", en: "Locrian" },
];
/** Semitones of each degree of the major scale above its tonic. */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const SCALE_DEGREES = {
  major: ["1", "2", "3", "4", "5", "6", "7"],
  minor: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
};
/** Degree of the relative major where the natural minor starts (A in C: the 6th). */
const MINOR_TONIC_DEGREE = 5;

/**
 * Notes on each string (6th → 1st) per position, set by the user (2026-11-16):
 * starting from three per string, one string gives its last note to the next one
 * and the top note of the 1st string is dropped, so the shape keeps a short span
 * (17 notes; degrees of the major):
 * Jônio: the 1 goes from the 2nd to the 1st string, the 4 is dropped.
 * Dórico: the 6 goes from the 3rd to the 2nd string and the 2 from the 2nd to the
 * 1st, the 5 is dropped.
 * Frígio: the 7 goes from the 3rd to the 2nd string and the 3 from the 2nd to the
 * 1st, the 6 is dropped.
 * Lídio: the 4 goes from the 2nd to the 1st string, the 7 is dropped.
 * Mixolídio: the 5 goes from the 2nd to the 1st string, the 1 is dropped.
 * Eólio: the 3 goes from the 3rd to the 2nd string and the 6 from the 2nd to the
 * 1st, the 2 is dropped.
 * Lócrio: the 7 goes from the 2nd to the 1st string, the 3 is dropped.
 */
const NOTES_PER_STRING = {
  0: [3, 3, 3, 3, 2, 3],
  1: [3, 3, 3, 2, 3, 3],
  2: [3, 3, 3, 2, 3, 3],
  3: [3, 3, 3, 3, 2, 3],
  4: [3, 3, 3, 3, 2, 3],
  5: [3, 3, 3, 2, 3, 3],
  6: [3, 3, 3, 3, 2, 3],
};

/**
 * Left-hand fingers for the notes of one string, from the gaps between them:
 * whole-whole and half-whole → 1 2 4, whole-half → 1 3 4; two notes a whole
 * step apart → 2 4, a half step → 3 4.
 */
function stringFingers(frets) {
  if (frets.length === 2) return frets[1] - frets[0] === 1 ? [3, 4] : [2, 4];
  const [a, b, c] = frets;
  return b - a === 2 && c - b === 1 ? [1, 3, 4] : [1, 2, 4];
}

/**
 * Position `index` (0 = Jônio) of the major scale on `majorRoot`: 18 notes, three
 * per string from the 6th to the 1st, starting on fret 1–12 of the 6th string.
 */
function scalePosition(majorRoot, quality, index) {
  const tonic = rootPitchClass(majorRoot);
  const startPc = (tonic + MAJOR_SCALE[index]) % 12;
  const startFret = ((startPc - 4 + 12) % 12) || 12; // low E is pitch class 4
  let midi = OPEN_STRING_MIDI[0] + startFret;
  const perString = NOTES_PER_STRING[index];
  const stringOf = perString.flatMap((count, string) => Array(count).fill(string));
  const notes = [];
  for (let n = 0; n < stringOf.length; n++) {
    const degree = (index + n) % 7;
    const string = stringOf[n];
    const scaleDegree = quality === "major" ? degree : (degree - MINOR_TONIC_DEGREE + 7) % 7;
    notes.push({ string, fret: midi - OPEN_STRING_MIDI[string], degree: SCALE_DEGREES[quality][scaleDegree] });
    const next = MAJOR_SCALE[(degree + 1) % 7] + (degree === 6 ? 12 : 0);
    midi += next - MAJOR_SCALE[degree];
  }
  for (let string = 0; string < 6; string++) {
    const onString = notes.filter((note) => note.string === string);
    const frets = onString.map((note) => note.fret);
    if (frets.some((fret, i) => i > 0 && fret <= frets[i - 1])) throw new Error(`${majorRoot} posição ${index + 1}: casas fora de ordem`);
    if (frets.at(-1) - frets[0] > 5) throw new Error(`${majorRoot} posição ${index + 1}: abertura de ${frets.at(-1) - frets[0]} casas`);
    stringFingers(frets).forEach((finger, i) => (onString[i].finger = finger));
  }
  // A position within four frets is played one finger per fret (index on the lowest fret).
  const low = Math.min(...notes.map((note) => note.fret));
  if (Math.max(...notes.map((note) => note.fret)) - low <= 3) notes.forEach((note) => (note.finger = note.fret - low + 1));
  // Minor keys number their positions from the minor tonic: position 1 starts on
  // the tonic (the Eólio shape), position 2 on the 2nd degree (Lócrio), …
  const position = quality === "major" ? index + 1 : ((index - MINOR_TONIC_DEGREE + 7) % 7) + 1;
  return { position, mode: MODES[index], notes };
}

/** Relative major of a minor key, spelled by letter (A → C, C♯ → E, G♯ → B). */
function relativeMajor(minorRoot) {
  return spell(minorRoot, 3, 2);
}

/** One key of a shape lesson: the scale on `root` in a single position (1–7, counted from its tonic). */
function scaleLesson(root, quality, position) {
  const majorRoot = quality === "major" ? root : relativeMajor(root);
  const name = quality === "major" ? { pt: `${root} maior`, en: `${root} major` } : { pt: `${root} menor`, en: `${root} minor` };
  const step = MODES.map((_, index) => scalePosition(majorRoot, quality, index)).find((item) => item.position === position);
  return {
    key: lessonKey("scales", quality, `p${position}`, ascii(root)),
    title: { pt: `${name.pt} - posição ${position}`, en: `${name.en} - position ${position}` },
    subtitle: {
      pt: `${name.pt} na posição ${position} (${step.mode.pt}), subindo e descendo`,
      en: `${name.en} in position ${position} (${step.mode.en}), up and down`,
    },
    scale: [{ root, quality, ...step }],
  };
}

const SCALE_QUALITIES = [
  // No group heading on the module page (removed by the user, 2026-11-16).
  { quality: "major", cycle: CYCLE_OF_FOURTHS },
  // Minor scales were removed from the module by the user (2026-11-16); scalePosition still supports them.
];

/**
 * Preparatory lesson, set by the user (2026-11-16): on the 1st string, pairs of
 * notes 0-5, 3-7, 5-10, 7-12, 10-15 and back (the player plays the list up and
 * then in reverse). One variation only (open E string); no fingering given.
 */
const PREP_FRETS = [0, 5, 3, 7, 5, 10, 7, 12, 10, 15];
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const PREP = {
  title: { pt: "Aula preparatória", en: "Preparatory lesson" },
  lessons: [
    {
      key: "scales/prep/first-string",
      title: { pt: "Aula preparatória - 1ª corda", en: "Preparatory lesson - 1st string" },
      subtitle: {
        pt: "Pares de notas na 1ª corda, subindo o braço e voltando",
        en: "Pairs of notes on the 1st string, up the neck and back",
      },
      scale: [
        {
          root: "E",
          quality: "major",
          position: 0,
          mode: { pt: "1ª corda", en: "1st string" },
          label: { pt: "1ª corda", en: "1st string" },
          leaps: true,
          instruction: {
            pt: "Toque os pares de notas na 1ª corda, subindo o braço e voltando.",
            en: "Play the pairs of notes on the 1st string, up the neck and back.",
          },
          notes: PREP_FRETS.map((fret) => ({ string: 5, fret, degree: NOTE_NAMES[(OPEN_STRING_MIDI[5] + fret) % 12] })),
        },
      ],
    },
  ],
};

// One lesson (trail) per shape: position 1 … 7, each in the 12 keys.
const SCALES = {
  title: { pt: "7 Posições do Modo Jônio", en: "7 Positions of the Ionian Mode" },
  subtitle: {
    pt: "Aprenda a escala do modo jônio e a digitação base para todas as escalas maiores e menores em qualquer região do braço",
    en: "Learn the Ionian mode scale and the base fingering for every major and minor scale anywhere on the neck",
  },
  trails: [PREP, ...SCALE_QUALITIES.flatMap((item) =>
    [1, 2, 3, 4, 5, 6, 7].map((position) => {
      return {
        // Only the position on the module page (mode names removed by the user, 2026-11-16).
        title: { pt: `Posição ${position}`, en: `Position ${position}` },
        lessons: item.cycle.map((root) => scaleLesson(root, item.quality, position)),
      };
    }),
  )],
};

const renderScaleTrails = (module) => module.trails.map((trail) => {
  const lessons = trail.lessons.map((lesson) => {
    const steps = lesson.scale.map((step) => [
      "          {",
      `            root: "${step.root}",`,
      `            quality: "${step.quality}",`,
      `            position: ${step.position},`,
      `            mode: ${loc(step.mode)},`,
      ...(step.label ? [`            label: ${loc(step.label)},`] : []),
      ...(step.leaps ? ["            leaps: true,"] : []),
      ...(step.showFingers ? ["            showFingers: true,"] : []),
      ...(step.instruction ? [`            instruction: ${loc(step.instruction)},`] : []),
      `            notes: [${step.notes.map((note) => `{ string: ${note.string}, fret: ${note.fret}, ${note.finger ? `finger: ${note.finger}, ` : ""}degree: "${note.degree}" }`).join(", ")}],`,
      "          },",
    ].join("\n"));
    return `      {
        id: ${nextId++},
        key: "${lesson.key}",
        title: ${loc(lesson.title)},
        exerciseTitle: ${loc(lesson.title)},
        subtitle: ${loc(lesson.subtitle)},
        type: "scale",
        status: "locked",
        steps: [],
        scale: [
${steps.join("\n")}
        ],
      },`;
  });
  return `      {${trail.group ? `\n        group: ${loc(trail.group)},` : ""}
        title: ${loc(trail.title)},
        lessons: [
${lessons.join("\n")}
        ],
      },`;
});

// ---------------------------------------------------------------- arpeggios
// Module "Arpejos de Tríades": the major triad played note by note (1 3 5).
// Three fingerings with the root on the 6th string set by the user (2026-11-16/17):
// 1) C 6th string finger 1, E 6th string finger 4, G 5th string finger 2;
// 2) C 6th string finger 2, E 5th string finger 1, G 5th string finger 4;
// 3) C 6th string finger 4, E 5th string finger 3, G 4th string finger 1.
// The user then asked for the same logic with the root on the 5th and 4th
// strings (2026-11-17): the same notes on the same strings relative to the
// root, same fingers. Strings 6-5-4-3 are a fourth apart, so the shapes keep
// their frets; from the 3rd to the 2nd string the interval is a major third, so
// a note moved onto the 2nd string goes one fret up (fingering 3 on the 4th
// string: G on the 2nd string, fret 8).
// Strings here are 0 = low E … 5 = high E. Every key moves the three together by
// the smallest shift that keeps every fret ≥ 0, as `transpose` does for chords;
// a note that falls on fret 0 is an open string (no finger).
/**
 * Fingerings per starting degree, note by note: string (offset from the reference
 * string, + towards the 1st string), semitones above the first note and finger. The
 * frets come from the pitches, so the major third between the 3rd and 2nd strings
 * is taken care of. Set by the user:
 * - root (2026-11-16/17, C on the 6th string): 1) C 1, E 4 same string, G 2 next;
 *   2) C 2, E 1 and G 4 next string; 3) C 4, E 3 next string, G 1 the one after.
 * - third (2026-11-17, E on the 5th string): 1) E 1, G 4 same string, C 4 next;
 *   2) E 2, G 1 and C 2 next string (a small shift); 3) E 3, G 1 next, C 1 after.
 * - fifth (2026-11-17, G on the 4th string): 1) G 1, C 4 same string, E 3 next;
 *   2) G 1, C 1 and E 4 next string; 3) later changed to G 2, C 3 next string, E 1 the
 *   one after (it first started on the string below, all finger 1). "The big shifts
 *   are meant to be like that."
 * The other strings follow the same logic: the whole set moves one string at a time.
 */
const ARPEGGIO_SHAPES = {
  root: {
    first: "C",
    group: { pt: "Começando na tônica", en: "Starting on the root" },
    degreeName: { pt: "tônica", en: "root" },
    strings: [6, 5, 4],
    shapes: [
      [{ string: 0, semitones: 0, finger: 1, degree: "1" }, { string: 0, semitones: 4, finger: 4, degree: "3" }, { string: 1, semitones: 7, finger: 2, degree: "5" }],
      [{ string: 0, semitones: 0, finger: 2, degree: "1" }, { string: 1, semitones: 4, finger: 1, degree: "3" }, { string: 1, semitones: 7, finger: 4, degree: "5" }],
      [{ string: 0, semitones: 0, finger: 4, degree: "1" }, { string: 1, semitones: 4, finger: 3, degree: "3" }, { string: 2, semitones: 7, finger: 1, degree: "5" }],
    ],
  },
  third: {
    first: "E",
    group: { pt: "Começando na terça", en: "Starting on the third" },
    degreeName: { pt: "terça", en: "third" },
    strings: [6, 5, 4],
    shapes: [
      [{ string: 0, semitones: 0, finger: 1, degree: "3" }, { string: 0, semitones: 3, finger: 4, degree: "5" }, { string: 1, semitones: 8, finger: 4, degree: "1" }],
      [{ string: 0, semitones: 0, finger: 2, degree: "3" }, { string: 1, semitones: 3, finger: 1, degree: "5" }, { string: 1, semitones: 8, finger: 2, degree: "1" }],
      // From the 4th string, C lands on the 2nd string one fret above G: finger 2 there (Claude's choice, to review).
      [{ string: 0, semitones: 0, finger: 3, degree: "3" }, { string: 1, semitones: 3, finger: 1, degree: "5" }, { string: 2, semitones: 8, finger: 1, crossFinger: 2, degree: "1" }],
    ],
  },
  fifth: {
    first: "G",
    group: { pt: "Começando na quinta", en: "Starting on the fifth" },
    degreeName: { pt: "quinta", en: "fifth" },
    // The 6th string first had two fingerings of its own; the user then added G 1 6th-3,
    // C 1 5th-3, E 4 5th-7 as fingering 2 (2026-11-17), so it uses the same three as the others.
    // The 3rd-string lesson was removed by the user (2026-11-17).
    strings: [6, 5, 4],
    shapes: [
      [{ string: 0, semitones: 0, finger: 1, degree: "5" }, { string: 0, semitones: 5, finger: 4, degree: "1" }, { string: 1, semitones: 9, finger: 3, degree: "3" }],
      [{ string: 0, semitones: 0, finger: 1, degree: "5" }, { string: 1, semitones: 5, finger: 1, degree: "1" }, { string: 1, semitones: 9, finger: 4, degree: "3" }],
      // Changed by the user (2026-11-17), in C on the 5th string: G 5th-10 finger 2, C 4th-10
      // finger 3, E 3rd-9 finger 1 (it used to start one string lower, all with finger 1).
      [{ string: 0, semitones: 0, finger: 2, degree: "5" }, { string: 1, semitones: 5, finger: 3, degree: "1" }, { string: 2, semitones: 9, finger: 1, degree: "3" }],
    ],
  },
};

/** The shapes of `start` with the reference string `firstString` (its fingering 1 starts there), in C. */
function arpeggioModel(start, firstString) {
  const { first, byString } = ARPEGGIO_SHAPES[start];
  const shapes = byString?.[firstString] ?? ARPEGGIO_SHAPES[start].shapes;
  const reference = 6 - firstString; // 0-based index (0 = low E)
  // The first note on the reference string, at its lowest fret (0–11); keys shift it later.
  const firstMidi = OPEN_STRING_MIDI[reference] + ((rootPitchClass(first) - (OPEN_STRING_MIDI[reference] % 12) + 12) % 12);
  return shapes.map((shape) =>
    shape.map(({ crossFinger, semitones, ...note }) => {
      const string = reference + note.string;
      // A note on the 2nd or 1st string of a set that starts on the 3rd string or lower.
      const crosses = crossFinger && string >= 4 && reference <= 3;
      return { ...note, string, fret: firstMidi + semitones - OPEN_STRING_MIDI[string], finger: crosses ? crossFinger : note.finger };
    }),
  );
}

const COUNT_PT = { 2: "duas", 3: "três" };
const COUNT_EN = { 2: "two", 3: "three" };

function arpeggioLesson(root, start, firstString) {
  const model = arpeggioModel(start, firstString);
  const interval = (rootPitchClass(root) - rootPitchClass("C") + 12) % 12;
  const lowest = Math.min(...model.flat().map((note) => note.fret));
  // No open strings: the drill is the fingering, so every note stays fretted (lowest fret ≥ 1).
  const shift = Math.min(...[interval - 12, interval, interval + 12].filter((value) => lowest + value >= 1));
  const name = { pt: `${root} maior`, en: `${root} major` };
  const degree = ARPEGGIO_SHAPES[start].degreeName;
  const where =
    start === "root"
      ? { pt: `com a tônica na ${firstString}ª corda`, en: `with the root on the ${ORDINAL_EN[firstString]} string` }
      : {
          pt: `começando na ${degree.pt}, na ${firstString}ª corda`,
          en: `starting on the ${degree.en}, on the ${ORDINAL_EN[firstString]} string`,
        };
  return {
    key: lessonKey("arpeggios", "major", start, String(firstString), ascii(root)),
    title: { pt: `${name.pt} - arpejo`, en: `${name.en} - arpeggio` },
    subtitle: {
      pt: `Arpejo de ${name.pt} em ${COUNT_PT[model.length]} digitações, ${where.pt}`,
      en: `${name.en} arpeggio in ${COUNT_EN[model.length]} fingerings, ${where.en}`,
    },
    scale: model.map((notes, index) => ({
      root,
      quality: "major",
      position: index + 1,
      mode: { pt: `Digitação ${index + 1}`, en: `Fingering ${index + 1}` },
      label: { pt: `Digitação ${index + 1}`, en: `Fingering ${index + 1}` },
      showFingers: true,
      instruction: {
        pt: `Toque o arpejo de ${name.pt} na digitação ${index + 1}, ${where.pt}, subindo e descendo.`,
        en: `Play the ${name.en} arpeggio in fingering ${index + 1}, ${where.en}, up and down.`,
      },
      notes: notes.map((note) => {
        const fret = note.fret + shift;
        return fret === 0 ? { string: note.string, fret, degree: note.degree } : { ...note, fret };
      }),
    })),
  };
}

const ARPEGGIOS = {
  title: { pt: "Arpejos de Tríades", en: "Triad Arpeggios" },
  subtitle: {
    pt: "Toque as tríades nota por nota, começando na tônica, na terça e na quinta",
    en: "Play the triads note by note, starting on the root, the third and the fifth",
  },
  trails: ["root", "third", "fifth"].flatMap((start) =>
    ARPEGGIO_SHAPES[start].strings.map((firstString) => {
      const degree = ARPEGGIO_SHAPES[start].degreeName;
      const name = { pt: degree.pt[0].toUpperCase() + degree.pt.slice(1), en: degree.en[0].toUpperCase() + degree.en.slice(1) };
      return {
        group: ARPEGGIO_SHAPES[start].group,
        title: { pt: `${name.pt} na ${firstString}ª corda`, en: `${name.en} on the ${ORDINAL_EN[firstString]} string` },
        lessons: CYCLE_OF_FOURTHS.map((root) => arpeggioLesson(root, start, firstString)),
      };
    }),
  ),
};

// Module order on the dashboard: CAGED, triads, seventh chords (ids stay: 1, 3, 2).
const triadTrails = renderInversionTrails(TRIADS);
const inversionTrails = renderInversionTrails(INVERSIONS);
const scaleTrails = renderScaleTrails(SCALES);
const arpeggioTrails = renderScaleTrails(ARPEGGIOS);

const file = `import type { ChordStep, ScaleStep } from "./chords.ts";
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
  type: "theory" | "chord" | "practice" | "review" | "scale";
  status: "done" | "current" | "locked";
  steps: ChordStep[];
  /** Scale lessons: one step per position (chord lessons leave it out and use \`steps\`). */
  scale?: ScaleStep[];
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
  {
    id: 4,
    title: ${loc(SCALES.title)},
    subtitle: ${loc(SCALES.subtitle)},
    trails: [
${scaleTrails.join("\n")}
    ],
  },
  {
    id: 5,
    title: ${loc(ARPEGGIOS.title)},
    subtitle: ${loc(ARPEGGIOS.subtitle)},
    trails: [
${arpeggioTrails.join("\n")}
    ],
  },
];

/** Every lesson of every trail, in order. */
export const lessons: Lesson[] = sections.flatMap((section) => section.trails.flatMap((trail) => trail.lessons));
`;
fs.writeFileSync(path.resolve(import.meta.dirname, "../../src/lessons.ts"), file);
console.log(`src/lessons.ts: 5 seções, ${TRAILS.length + TRIADS.trails.length + INVERSIONS.trails.length + SCALES.trails.length + ARPEGGIOS.trails.length} trilhas, ${nextId - 1} aulas`);
