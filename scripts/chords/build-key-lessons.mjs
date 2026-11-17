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

const renderScaleTrails = (module) =>
  module.trails.map((trail) => {
    const lessons = trail.lessons.map((lesson) => {
      const steps = lesson.scale.map((step) =>
        [
          "          {",
          `            root: "${step.root}",`,
          `            quality: "${step.quality}",`,
          `            position: ${step.position},`,
          `            mode: ${loc(step.mode)},`,
          ...(step.label ? [`            label: ${loc(step.label)},`] : []),
          ...(step.leaps ? ["            leaps: true,"] : []),
          ...(step.showFingers ? ["            showFingers: true,"] : []),
          ...(step.instruction
            ? [`            instruction: ${loc(step.instruction)},`]
            : []),
          ...(step.notation ? ["            notation: true,"] : []),
          ...(step.signature
            ? [`            signature: "${step.signature}",`]
            : []),
          ...(step.groups
            ? [
                `            groups: [${step.groups.map((group) => `{ label: "${group.label}", count: ${group.count} }`).join(", ")}],`,
              ]
            : []),
          `            notes: [${step.notes.map((note) => `{ string: ${note.string}, fret: ${note.fret}, ${note.finger ? `finger: ${note.finger}, ` : ""}degree: "${note.degree}"${note.pitch ? `, pitch: "${note.pitch}"` : ""} }`).join(", ")}],`,
          "          },",
        ].join("\n"),
      );
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
    return `      {${trail.section ? `\n        section: ${loc(trail.section)},` : ""}${trail.overline ? `\n        overline: ${loc(trail.overline)},` : ""}${trail.group ? `\n        group: ${loc(trail.group)},` : ""}
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
    group: { pt: "Ordem fundamental", en: "Root position" },
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
    group: { pt: "Primeira inversão", en: "First inversion" },
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
    group: { pt: "Segunda inversão", en: "Second inversion" },
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
/**
 * Minor and diminished arpeggios (asked for by the user on 2026-11-17, fingerings
 * derived by Claude, "derive, I'll review"): the major fingerings with the third
 * (and, for diminished, the fifth) lowered a half step — same strings, same fingers.
 */
const ARPEGGIO_QUALITIES = {
  major: {
    offsets: { 1: 0, 3: 4, 5: 7 },
    labels: { 1: "1", 3: "3", 5: "5" },
    cycle: CYCLE_OF_FOURTHS,
    name: (root) => ({ pt: `${root} maior`, en: `${root} major` }),
    title: { pt: "tríade maior", en: "major triad" },
  },
  minor: {
    offsets: { 1: 0, 3: 3, 5: 7 },
    labels: { 1: "1", 3: "♭3", 5: "5" },
    cycle: MINOR_CYCLE,
    name: (root) => ({ pt: `${root} menor`, en: `${root} minor` }),
    title: { pt: "tríade menor", en: "minor triad" },
  },
  dim: {
    offsets: { 1: 0, 3: 3, 5: 6 },
    labels: { 1: "1", 3: "♭3", 5: "♭5" },
    cycle: HALF_DIMINISHED_CYCLE,
    name: (root) => ({ pt: `${root} diminuto`, en: `${root} diminished` }),
    title: { pt: "tríade diminuta", en: "diminished triad" },
  },
};
const FIRST_TONE = { root: 1, third: 3, fifth: 5 };

function arpeggioModel(start, firstString, quality = "major") {
  const { byString } = ARPEGGIO_SHAPES[start];
  const shapes = byString?.[firstString] ?? ARPEGGIO_SHAPES[start].shapes;
  const { offsets, labels } = ARPEGGIO_QUALITIES[quality];
  const major = ARPEGGIO_QUALITIES.major.offsets;
  const firstTone = FIRST_TONE[start];
  // How far each chord tone moves from the major triad (the third, maybe the fifth: −1).
  const moved = (tone) => offsets[tone] - major[tone];
  const reference = 6 - firstString; // 0-based index (0 = low E)
  // The first note on the reference string, at its lowest fret (0–11); keys shift it later.
  const firstPc = (rootPitchClass("C") + offsets[firstTone]) % 12;
  const firstMidi =
    OPEN_STRING_MIDI[reference] +
    ((firstPc - (OPEN_STRING_MIDI[reference] % 12) + 12) % 12);
  return shapes.map((shape) =>
    shape.map(({ crossFinger, semitones, ...note }) => {
      const string = reference + note.string;
      // A note on the 2nd or 1st string of a set that starts on the 3rd string or lower.
      const crosses = crossFinger && string >= 4 && reference <= 3;
      const pitch =
        firstMidi + semitones + moved(note.degree) - moved(firstTone);
      return {
        ...note,
        degree: labels[note.degree],
        string,
        fret: pitch - OPEN_STRING_MIDI[string],
        finger: crosses ? crossFinger : note.finger,
      };
    }),
  );
}

const COUNT_PT = { 2: "duas", 3: "três" };
const COUNT_EN = { 2: "two", 3: "three" };

function arpeggioLesson(root, start, firstString, quality = "major") {
  const model = arpeggioModel(start, firstString, quality);
  const interval = (rootPitchClass(root) - rootPitchClass("C") + 12) % 12;
  const lowest = Math.min(...model.flat().map((note) => note.fret));
  // No open strings: the drill is the fingering, so every note stays fretted (lowest fret ≥ 1).
  const shift = Math.min(
    ...[interval - 12, interval, interval + 12].filter(
      (value) => lowest + value >= 1,
    ),
  );
  const name = ARPEGGIO_QUALITIES[quality].name(root);
  const degree = ARPEGGIO_SHAPES[start].degreeName;
  const where =
    start === "root"
      ? { pt: `com a tônica na ${firstString}ª corda`, en: `with the root on the ${ORDINAL_EN[firstString]} string` }
      : {
          pt: `começando na ${degree.pt}, na ${firstString}ª corda`,
          en: `starting on the ${degree.en}, on the ${ORDINAL_EN[firstString]} string`,
        };
  return {
    key: lessonKey(
      "arpeggios",
      quality,
      start,
      String(firstString),
      ascii(root),
    ),
    title: { pt: `${name.pt} - arpejo`, en: `${name.en} - arpeggio` },
    subtitle: {
      pt: `Arpejo de ${name.pt} em ${COUNT_PT[model.length]} digitações, ${where.pt}`,
      en: `${name.en} arpeggio in ${COUNT_EN[model.length]} fingerings, ${where.en}`,
    },
    scale: model.map((notes, index) => ({
      root,
      quality,
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
    pt: "Toque as tríades maiores, menores e diminutas nota por nota, começando na tônica, na terça e na quinta",
    en: "Play major, minor and diminished triads note by note, starting on the root, the third and the fifth",
  },
  // Sections by starting note, subsections (groups) by quality, a lesson per string in each.
  trails: ["root", "third", "fifth"].flatMap((start) =>
    ["major", "minor", "dim"].flatMap((quality) =>
      ARPEGGIO_SHAPES[start].strings.map((firstString) => {
        const degree = ARPEGGIO_SHAPES[start].degreeName;
        const name = {
          pt: degree.pt[0].toUpperCase() + degree.pt.slice(1),
          en: degree.en[0].toUpperCase() + degree.en.slice(1),
        };
        const kind = ARPEGGIO_QUALITIES[quality].title;
        return {
          section: ARPEGGIO_SHAPES[start].group,
          group: {
            pt: kind.pt[0].toUpperCase() + kind.pt.slice(1),
            en: kind.en[0].toUpperCase() + kind.en.slice(1),
          },
          title: {
            pt: `${name.pt} na ${firstString}ª corda`,
            en: `${name.en} on the ${ORDINAL_EN[firstString]} string`,
          },
          lessons: ARPEGGIO_QUALITIES[quality].cycle.map((root) =>
            arpeggioLesson(root, start, firstString, quality),
          ),
        };
      }),
    ),
  ),
};

// Exercises (section "Exercícios", asked for by the user on 2026-11-17): for each string
// there are three root-position fingerings; the first lesson plays the seven diatonic
// triads of a major key one after the other, up the neck, always in the same fingering.
// Exercise 1: the fingering that starts with finger 1 (6th string: 1-4-2 for all three
// qualities). Fingerings 2 and 3 come next, when the user dictates them.
const DIATONIC_QUALITIES = [
  "major",
  "minor",
  "minor",
  "major",
  "major",
  "minor",
  "dim",
];
const CHORD_SUFFIX = { major: "", minor: "m", dim: "dim" };
// Lessons for the root on the 6th, then the 5th and 4th strings (asked for on 2026-11-17).
const DIATONIC_STRINGS = [6, 5, 4];
const DIATONIC_FINGERINGS = [0, 1, 2];

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Sounding pitch spelled in the key, with its octave ("B♭2", "C♭3" = the B of octave 2). */
function pitchName(key, scaleDegree, midi) {
  const name = spell(key, MAJOR_SCALE[scaleDegree], scaleDegree);
  const accidental = [...name.slice(1)].reduce(
    (sum, sign) => sum + (sign === "♯" ? 1 : sign === "♭" ? -1 : 0),
    0,
  );
  const octave = Math.round((midi - accidental - LETTER_PC[name[0]]) / 12) - 1;
  return `${name}${octave}`;
}

/** One triad of the run: the module's fingering, moved so its root sits at `rootFret`; dots carry the key degree. */
function diatonicTriad(rootString, rootFret, degree, fingering) {
  const quality = DIATONIC_QUALITIES[degree];
  const shape = arpeggioModel("root", rootString, quality)[fingering];
  const shift = rootFret - shape[0].fret;
  return shape.map((note, index) => ({
    string: note.string,
    fret: note.fret + shift,
    finger: note.finger,
    degree: String(((degree + index * 2) % 7) + 1),
  }));
}

/**
 * The seven triads up the string in one fingering, starting on the degree whose
 * shape sits closest to the nut (lowest fret ≥ 1), with everything up to fret 19.
 * Each fingering has its own start (2026-11-17: "comece sempre pela digitação mais
 * próxima da pestana").
 */
function diatonicRun(rootString, key, fingering) {
  const reference = 6 - rootString;
  const tonicFret =
    (rootPitchClass(key) - (OPEN_STRING_MIDI[reference] % 12) + 12) % 12;
  const runs = [];
  for (let first = 0; first < 7; first++) {
    for (const octave of [0, 12]) {
      const firstFret = ((tonicFret + MAJOR_SCALE[first]) % 12) + octave;
      const roots = Array.from({ length: 7 }, (_, n) => {
        const degree = (first + n) % 7;
        return {
          degree,
          fret:
            firstFret + ((MAJOR_SCALE[degree] - MAJOR_SCALE[first] + 12) % 12),
        };
      });
      const frets = roots
        .flatMap((root) =>
          diatonicTriad(rootString, root.fret, root.degree, fingering),
        )
        .map((note) => note.fret);
      if (Math.min(...frets) >= 1 && Math.max(...frets) <= 19)
        runs.push({
          first,
          roots,
          low: Math.min(...frets),
          high: Math.max(...frets),
        });
    }
  }
  // Always the run closest to the nut (asked for by the user, 2026-11-17): lowest fret first.
  return runs.sort((a, b) => a.low - b.low || a.high - b.high)[0].roots;
}

function diatonicLesson(rootString, key) {
  const name = { pt: `${key} maior`, en: `${key} major` };
  const where = {
    pt: `na ${rootString}ª corda`,
    en: `on the ${ORDINAL_EN[rootString]} string`,
  };
  return {
    key: lessonKey("arpeggios", "diatonic", String(rootString), ascii(key)),
    title: {
      pt: `${name.pt} - tríades diatônicas`,
      en: `${name.en} - diatonic triads`,
    },
    subtitle: {
      pt: `As sete tríades de ${name.pt} em arpejo, subindo o braço com a tônica ${where.pt}`,
      en: `The seven triads of ${name.en} as arpeggios, up the neck with the root ${where.en}`,
    },
    scale: DIATONIC_FINGERINGS.map((fingering) =>
      diatonicRun(rootString, key, fingering),
    ).map((roots, fingering) => ({
      root: key,
      quality: "major",
      position: fingering + 1,
      mode: {
        pt: `Digitação ${fingering + 1}`,
        en: `Fingering ${fingering + 1}`,
      },
      label: {
        pt: `Digitação ${fingering + 1}`,
        en: `Fingering ${fingering + 1}`,
      },
      showFingers: true,
      // Heading and overline set by the user (2026-11-17).
      instruction: {
        pt: `Toque as tríades diatônicas de ${key} maior subindo o braço ${where.pt}, na digitação ${fingering + 1}`,
        en: `Play the diatonic triads of ${key} Major up the neck ${where.en}, in fingering ${fingering + 1}`,
      },
      // Shown as tablature or staff (not fret dots): a run along the neck.
      notation: true,
      groups: roots.map(({ degree }) => ({
        label:
          spell(key, MAJOR_SCALE[degree], degree) +
          CHORD_SUFFIX[DIATONIC_QUALITIES[degree]],
        count: 3,
      })),
      notes: roots.flatMap((root) =>
        diatonicTriad(rootString, root.fret, root.degree, fingering).map(
          (note) => ({
            ...note,
            pitch: pitchName(
              key,
              Number(note.degree) - 1,
              OPEN_STRING_MIDI[note.string] + note.fret,
            ),
          }),
        ),
      ),
    })),
  };
}

for (const rootString of DIATONIC_STRINGS) {
  ARPEGGIOS.trails.push({
    section: { pt: "Exercícios", en: "Exercises" },
    group: { pt: "Na horizontal", en: "Horizontally" },
    overline: {
      pt: "Prática de Arpejos de Tríades",
      en: "Triad Arpeggios Practice",
    },
    title: {
      pt: `Tríades diatônicas na ${rootString}ª corda`,
      en: `Diatonic triads on the ${ORDINAL_EN[rootString]} string`,
    },
    lessons: CYCLE_OF_FOURTHS.map((key) => diatonicLesson(rootString, key)),
  });
}

/**
 * Diatonic triads vertically (asked for by the user on 2026-11-17: "tocar as tríades
 * diatonicamente e verticalmente em cada uma das posições do modo jônio"): in each of
 * the 7 positions of the Scales module, the seven triads of the key one after the
 * other, without leaving the position. Each triad starts on the lowest note of its
 * root in the position and goes up to the next third and fifth; the run starts on the
 * position's own degree (position 1: I ii iii…, position 2: ii iii … I). Fingers are
 * the scale position's (one finger per fret, or 1-2-4 / 1-3-4 per string) — derived
 * by Claude, to be checked with the user.
 */
function verticalTriads(key, index) {
  const { notes } = scalePosition(key, "major", index);
  const degreeOf = (note) => Number(note.degree) - 1;
  const roots = [];
  const triads = [];
  for (let n = 0; n < 7; n++) {
    const degree = (index + n) % 7;
    const rootAt = notes.findIndex((note) => degreeOf(note) === degree);
    const thirdAt = notes.findIndex(
      (note, at) => at > rootAt && degreeOf(note) === (degree + 2) % 7,
    );
    const fifthAt = notes.findIndex(
      (note, at) => at > thirdAt && degreeOf(note) === (degree + 4) % 7,
    );
    if (rootAt < 0 || thirdAt < 0 || fifthAt < 0)
      throw new Error(
        `${key} posição ${index + 1}: tríade do grau ${degree + 1} incompleta`,
      );
    roots.push(degree);
    triads.push(
      [rootAt, thirdAt, fifthAt].map((at) => {
        const note = notes[at];
        return {
          string: note.string,
          fret: note.fret,
          finger: note.finger,
          degree: note.degree,
          pitch: pitchName(
            key,
            degreeOf(note),
            OPEN_STRING_MIDI[note.string] + note.fret,
          ),
        };
      }),
    );
  }
  return { roots, notes: triads.flat() };
}

function verticalLesson(key, index) {
  const { roots, notes } = verticalTriads(key, index);
  const position = index + 1;
  const name = { pt: `${key} maior`, en: `${key} major` };
  return {
    key: lessonKey(
      "arpeggios",
      "diatonic-vertical",
      `p${position}`,
      ascii(key),
    ),
    title: {
      pt: `${name.pt} - tríades na posição ${position}`,
      en: `${name.en} - triads in position ${position}`,
    },
    subtitle: {
      pt: `As sete tríades de ${name.pt} em arpejo, sem sair da posição ${position}`,
      en: `The seven triads of ${name.en} as arpeggios, staying in position ${position}`,
    },
    scale: [
      {
        root: key,
        quality: "major",
        position,
        mode: MODES[index],
        instruction: {
          pt: `Toque as tríades diatônicas de ${key} maior na posição ${position}`,
          en: `Play the diatonic triads of ${key} Major in position ${position}`,
        },
        notation: true,
        groups: roots.map((degree) => ({
          label:
            spell(key, MAJOR_SCALE[degree], degree) +
            CHORD_SUFFIX[DIATONIC_QUALITIES[degree]],
          count: 3,
        })),
        notes,
      },
    ],
  };
}

for (let index = 0; index < 7; index++) {
  ARPEGGIOS.trails.push({
    section: { pt: "Exercícios", en: "Exercises" },
    group: { pt: "Na vertical", en: "Vertically" },
    overline: {
      pt: "Prática de Arpejos de Tríades",
      en: "Triad Arpeggios Practice",
    },
    title: {
      pt: `Tríades diatônicas na posição ${index + 1}`,
      en: `Diatonic triads in position ${index + 1}`,
    },
    lessons: CYCLE_OF_FOURTHS.map((key) => verticalLesson(key, index)),
  });
}

/**
 * Inversions (asked for by the user on 2026-11-17, reorganised the same day): one
 * lesson per string (6th, 5th, 4th), major triads only. Exercise n plays every
 * inversion of the triad (root position, 1st and 2nd inversion) in fingering n of
 * its section of the module, each placed as close to the nut as possible (fret ≥ 1),
 * the three in order up the neck — one bar each.
 */
const INVERSION_STARTS = ["root", "third", "fifth"];
const TONE_LETTERS = { 1: 0, 3: 2, 5: 4 };

/** "E♭" at a MIDI pitch → "E♭3" (the octave follows the letter: C♭3 sounds as B2). */
function withOctave(name, midi) {
  const accidental = [...name.slice(1)].reduce(
    (sum, sign) => sum + (sign === "♯" ? 1 : sign === "♭" ? -1 : 0),
    0,
  );
  return `${name}${Math.round((midi - accidental - LETTER_PC[name[0]]) / 12) - 1}`;
}

/** Major key whose signature fits the triad: its own (major), relative major (minor), a half step up (diminished = vii°). */
const SIGNATURE_KEY = {
  major: (root) => root,
  minor: (root) => spell(root, 3, 2),
  dim: (root) => spell(root, 1, 1),
};

function inversionRun(root, quality, firstString, fingering) {
  const interval = (rootPitchClass(root) - rootPitchClass("C") + 12) % 12;
  const { offsets } = ARPEGGIO_QUALITIES[quality];
  const suffix = CHORD_SUFFIX[quality];
  const bars = INVERSION_STARTS.map((start) => {
    const shape = arpeggioModel(start, firstString, quality)[fingering];
    const lowest = Math.min(...shape.map((note) => note.fret));
    const shift = Math.min(
      ...[interval - 12, interval, interval + 12].filter(
        (value) => lowest + value >= 1,
      ),
    );
    const notes = shape.map((note) => {
      const tone = Number(note.degree.replace("♭", ""));
      const name = spell(root, offsets[tone], TONE_LETTERS[tone]);
      const fret = note.fret + shift;
      return {
        string: note.string,
        fret,
        finger: note.finger,
        degree: note.degree,
        pitch: withOctave(name, OPEN_STRING_MIDI[note.string] + fret),
        name,
      };
    });
    const bass = notes[0].name;
    return {
      label: start === "root" ? `${root}${suffix}` : `${root}${suffix}/${bass}`,
      notes,
    };
  });
  // Up the neck: the inversion nearest the nut first.
  return bars.sort((a, b) => a.notes[0].fret - b.notes[0].fret);
}

function arpeggioInversionLesson(root, firstString, quality) {
  const name = ARPEGGIO_QUALITIES[quality].name(root);
  const where = {
    pt: `a partir da ${firstString}ª corda`,
    en: `starting on the ${ORDINAL_EN[firstString]} string`,
  };
  return {
    // Major keys came first (arpeggios/inversions/6/C); minor and diminished name their quality.
    key: lessonKey(
      "arpeggios",
      "inversions",
      ...(quality === "major" ? [] : [quality]),
      String(firstString),
      ascii(root),
    ),
    title: {
      pt: `${name.pt} - inversões na ${firstString}ª corda`,
      en: `${name.en} - inversions on the ${ORDINAL_EN[firstString]} string`,
    },
    subtitle: {
      pt: `Todas as inversões de ${name.pt} em arpejo ${where.pt}, nas três digitações`,
      en: `Every inversion of ${name.en} as arpeggios ${where.en}, in the three fingerings`,
    },
    scale: [0, 1, 2].map((fingering) => {
      const bars = inversionRun(root, quality, firstString, fingering);
      return {
        root,
        quality,
        position: fingering + 1,
        mode: {
          pt: `Digitação ${fingering + 1}`,
          en: `Fingering ${fingering + 1}`,
        },
        label: {
          pt: `Digitação ${fingering + 1}`,
          en: `Fingering ${fingering + 1}`,
        },
        // The hub shows the string (6ª, 5ª, 4ª); the subsection says the quality.
        showFingers: true,
        instruction: {
          pt: `Toque as inversões de ${name.pt} ${where.pt}, na digitação ${fingering + 1}`,
          en: `Play the inversions of ${name.en} ${where.en}, in fingering ${fingering + 1}`,
        },
        notation: true,
        signature: SIGNATURE_KEY[quality](root),
        groups: bars.map((bar) => ({ label: bar.label, count: 3 })),
        notes: bars.flatMap((bar) =>
          bar.notes.map(({ name: _name, ...note }) => note),
        ),
      };
    }),
  };
}

// The Inversões subsection comes first in Exercícios (the user's order, 2026-11-17).
const firstExercise = ARPEGGIOS.trails.findIndex(
  (trail) => trail.section?.pt === "Exercícios",
);
// Major, then minor and diminished (added 2026-11-17), each on the 6th, 5th and 4th strings.
const INVERSION_QUALITIES = [
  {
    quality: "major",
    cycle: CYCLE_OF_FOURTHS,
    name: { pt: "maiores", en: "Major" },
    group: { pt: "Inversões maiores", en: "Major inversions" },
  },
  {
    quality: "minor",
    cycle: MINOR_CYCLE,
    name: { pt: "menores", en: "Minor" },
    group: { pt: "Inversões menores", en: "Minor inversions" },
  },
  {
    quality: "dim",
    cycle: HALF_DIMINISHED_CYCLE,
    name: { pt: "diminutas", en: "Diminished" },
    group: { pt: "Inversões diminutas", en: "Diminished inversions" },
  },
];
// One subsection per quality (the user's split, 2026-11-17).
INVERSION_QUALITIES.flatMap(({ quality, cycle, name, group }) =>
  [6, 5, 4].map((firstString) => ({
    section: { pt: "Exercícios", en: "Exercises" },
    group,
    overline: {
      pt: "Prática de Arpejos de Tríades",
      en: "Triad Arpeggios Practice",
    },
    // "Major Inversions on the 6th string" (the user's pattern, 2026-11-17).
    title: {
      pt: `Inversões ${name.pt} na ${firstString}ª corda`,
      en: `${name.en} Inversions on the ${ORDINAL_EN[firstString]} string`,
    },
    lessons: cycle.map((root) =>
      arpeggioInversionLesson(root, firstString, quality),
    ),
  })),
).forEach((trail, offset) =>
  ARPEGGIOS.trails.splice(firstExercise + offset, 0, trail),
);

/* ------------------------------------------------------------------------ *
 * Seventh-chord arpeggios ("Arpejos de Tétrades", asked for by the user on
 * 2026-11-17: "seguindo o padrão dos arpejos de tríades"). Same structure:
 * sections by starting tone (root, 3rd, 5th, 7th), subsections by quality
 * (7+, m7, 7, m7(♭5)), a lesson per string (6th, 5th, 4th) with up to three
 * fingerings; then the Exercícios section (inversions, horizontal, vertical).
 * Fingerings derived by Claude ("derive, eu reviso"), to be checked with the user.
 * ------------------------------------------------------------------------ */
const SEVENTH_QUALITIES = {
  maj7: {
    offsets: [0, 4, 7, 11],
    labels: ["1", "3", "5", "7"],
    suffix: "7+",
    cycle: CYCLE_OF_FOURTHS,
    name: (root) => ({ pt: `${root}7+`, en: `${root}maj7` }),
    title: { pt: "Acordes 7+", en: "Maj7 chords" },
    inversions: { pt: "Inversões de 7+", en: "Maj7 Inversions" },
  },
  m7: {
    offsets: [0, 3, 7, 10],
    labels: ["1", "♭3", "5", "♭7"],
    suffix: "m7",
    cycle: MINOR_CYCLE,
    name: (root) => ({ pt: `${root}m7`, en: `${root}m7` }),
    title: { pt: "Acordes m7", en: "m7 chords" },
    inversions: { pt: "Inversões de m7", en: "m7 Inversions" },
  },
  7: {
    offsets: [0, 4, 7, 10],
    labels: ["1", "3", "5", "♭7"],
    suffix: "7",
    cycle: DOMINANT_CYCLE,
    name: (root) => ({ pt: `${root}7`, en: `${root}7` }),
    title: { pt: "Acordes 7", en: "Dominant 7 chords" },
    inversions: { pt: "Inversões de 7", en: "Dominant 7 Inversions" },
  },
  m7b5: {
    offsets: [0, 3, 6, 10],
    labels: ["1", "♭3", "♭5", "♭7"],
    suffix: "m7(♭5)",
    cycle: HALF_DIMINISHED_CYCLE,
    name: (root) => ({ pt: `${root}m7(♭5)`, en: `${root}m7(♭5)` }),
    title: { pt: "Acordes m7(♭5)", en: "m7(♭5) chords" },
    inversions: { pt: "Inversões de m7(♭5)", en: "m7(♭5) Inversions" },
  },
};
const SEVENTH_ORDER = ["maj7", "m7", "7", "m7b5"];
const SEVENTH_STARTS = [
  {
    tone: 0,
    key: "root",
    section: { pt: "Ordem fundamental", en: "Root position" },
    degree: { pt: "tônica", en: "root" },
  },
  {
    tone: 1,
    key: "third",
    section: { pt: "Primeira inversão", en: "First inversion" },
    degree: { pt: "terça", en: "third" },
  },
  {
    tone: 2,
    key: "fifth",
    section: { pt: "Segunda inversão", en: "Second inversion" },
    degree: { pt: "quinta", en: "fifth" },
  },
  {
    tone: 3,
    key: "seventh",
    section: { pt: "Terceira inversão", en: "Third inversion" },
    degree: { pt: "sétima", en: "seventh" },
  },
];
const SEVENTH_LETTERS = [0, 2, 4, 6];

/**
 * Fingerings dictated by the user (source of truth over the derived ones), in C:
 * [string (6 = low E), fret, finger] per note, in playing order. Key: quality/start tone/first string.
 */
const SEVENTH_DICTATED = {
  // 2026-11-17: "faltou a digitação dedo 4 corda 6 casa 8, dedo 3 corda 5 casa 7, dedo 1 corda 4 casa 5 e dedo 4 corda 4 casa 9"
  // (the pinky slides from fret 8 to 9).
  // 2026-11-17: "nos acordes menores faltou a digitação corda 6 dedo 2 casa 8, corda 5 dedo 1 casa 6,
  // corda 5 dedo 4 casa 10 e corda 4 dedo 2 casa 8".
  "m7/0/6": [
    [6, 8, 2],
    [5, 6, 1],
    [5, 10, 4],
    [4, 8, 2],
  ],
  // 2026-11-17: "nos diminutos faltou a digitação corda 6 dedo 4 casa 8, corda 5 dedo 2 casa 7,
  // corda 4 dedo 1 casa 4, corda 4 dedo 4 casa 8" — the 5th string at fret 7 is E, not in
  // Cm7(♭5); the chord's E♭ is at fret 6.
  "m7b5/0/6": [
    [6, 8, 4],
    [5, 6, 2],
    [4, 4, 1],
    [4, 8, 4],
  ],
  "maj7/0/6": [
    [6, 8, 4],
    [5, 7, 3],
    [4, 5, 1],
    [4, 9, 4],
  ],
};

/** Fingers for fret offsets from the hand position: one per fret, or 1-2/3-4 over a five-fret stretch. */
function stretchFingers(offsets) {
  if (Math.max(...offsets) <= 3) return offsets.map((offset) => offset + 1);
  const middle = [...new Set(offsets)].filter((offset) => offset > 0 && offset < 4).sort((a, b) => a - b);
  const map = { 0: 1, 4: 4 };
  if (middle.length === 1) map[middle[0]] = middle[0] <= 2 ? 2 : 3;
  if (middle.length === 2) [map[middle[0]], map[middle[1]]] = [2, 3];
  return offsets.map((offset) => map[offset]);
}

/**
 * Up to three fingerings of a seventh arpeggio in C (one octave: four notes going up
 * from the starting tone, first note on `firstString`): the shape starting with
 * finger 1, the one with finger 2 and the better of finger 4 / finger 3 — like the
 * triad fingerings. Each keeps the hand in one position (a fret per finger, a
 * five-fret stretch at most), no finger on two frets, few same-finger rolls and
 * strings; the three use different strings. Frets are relative (may be ≤ 0): the
 * lessons move the shape to each key.
 */
function seventhShapes(quality, startTone, firstString) {
  const { offsets, labels } = SEVENTH_QUALITIES[quality];
  const reference = 6 - firstString;
  const firstPc = offsets[startTone] % 12;
  const firstFret = ((firstPc - (OPEN_STRING_MIDI[reference] % 12) + 12) % 12) + 12;
  const firstMidi = OPEN_STRING_MIDI[reference] + firstFret;
  const pitches = [0, 1, 2, 3].map((step) => {
    const tone = (startTone + step) % 4;
    const octave = Math.floor((startTone + step) / 4);
    return {
      midi: firstMidi + offsets[tone] + 12 * octave - offsets[startTone],
      tone,
    };
  });
  const assignments = [];
  const walk = (strings) => {
    if (strings.length === 4) return assignments.push(strings);
    for (const next of [0, 1, 2].map((step) => strings.at(-1) + step))
      if (next <= 5) walk([...strings, next]);
  };
  walk([reference]);
  const used = [];
  // Pinky slide (the user's C7+ fingering, 2026-11-17: "aplique como padrão onde for
  // necessário"): in a five-fret stretch, finger 4 plays one note on the 4th fret of the
  // hand and, later, one on the 5th — instead of rolling a finger across strings.
  const best = (finger) => {
    let choice = null;
    for (const slide of [false, true]) {
      for (const strings of assignments) {
        if (used.some((other) => other.join() === strings.join())) continue;
        const frets = pitches.map((pitch, index) => pitch.midi - OPEN_STRING_MIDI[strings[index]]);
        if (
          frets.some(
            (fret, index) => index > 0 && strings[index] === strings[index - 1] && fret <= frets[index - 1],
          )
        )
          continue;
        // The hand starts at the first finger's fret minus (finger − 1). In a five-fret stretch
        // finger 2 may sit two frets above finger 1 (the user's Cm7 fingering 6-8(2) 5-6(1)
        // 5-10(4) 4-8(2)) and finger 4 four frets above it (the user's Cm7(♭5) fingering
        // 6-8(4) 5-6(2) 4-4(1) 4-8(4)), both 2026-11-17.
        const bases = { 2: [frets[0] - 1, frets[0] - 2], 4: [frets[0] - 3, frets[0] - 4] }[finger] ?? [frets[0] - (finger - 1)];
        for (const base of bases) {
          const offsetsFromBase = frets.map((fret) => fret - base);
          if (offsetsFromBase.some((offset) => offset < 0 || offset > 4)) continue;
          if (slide) {
            const low = offsetsFromBase.filter((offset) => offset === 3).length;
            const high = offsetsFromBase.filter((offset) => offset === 4).length;
            if (low !== 1 || high !== 1 || offsetsFromBase.indexOf(3) > offsetsFromBase.indexOf(4)) continue;
          }
          const fingers = slide
            ? offsetsFromBase.map((offset) => Math.min(offset + 1, 4))
            : stretchFingers(offsetsFromBase);
          if (fingers[0] !== finger) continue;
          const fretOf = {};
          if (
            fingers.some((f, index) =>
              f !== 4 || !slide ? (fretOf[f] ??= frets[index]) !== frets[index] : false,
            )
          )
            continue;
          const rolls = fingers.filter((f, index) => index > 0 && f === fingers[index - 1]).length;
          const span = Math.max(...offsetsFromBase) - Math.min(...offsetsFromBase);
          const score = rolls * 20 + (span === 4 ? 6 : 0) + (slide ? 10 : 0) + new Set(strings).size;
          if (!choice || score < choice.score) {
            choice = {
              score,
              strings,
              notes: pitches.map((pitch, index) => ({
                string: strings[index],
                fret: frets[index] - 12,
                finger: fingers[index],
                degree: labels[pitch.tone],
                tone: pitch.tone,
              })),
            };
          }
        }
      }
    }
    return choice;
  };
  const take = (choice) => {
    if (choice) used.push(choice.strings);
    return choice;
  };
  const shapes = [take(best(1)), take(best(2))];
  const last = take([best(4), best(3)].filter(Boolean).sort((a, b) => a.score - b.score)[0]);
  const derived = [...shapes, last].filter(Boolean).map((shape) => shape.notes);
  const dictated = SEVENTH_DICTATED[`${quality}/${startTone}/${firstString}`];
  if (!dictated) return derived;
  // A fingering dictated by the user replaces the derived one that starts with the same finger, or is added.
  const shape = dictated.map(([string, fret, finger], index) => {
    const tone = (startTone + index) % 4;
    return { string: 6 - string, fret, finger, degree: labels[tone], tone };
  });
  const same = derived.findIndex((notes) => notes[0].finger === shape[0].finger);
  return same >= 0
    ? derived.map((notes, index) => (index === same ? shape : notes))
    : [...derived, shape].slice(0, 3);
}

/** A C shape moved to `root`: the smallest shift that keeps every fret ≥ 1. */
function placeShape(notes, root, quality, near = null) {
  const interval = (rootPitchClass(root) - rootPitchClass("C") + 12) % 12;
  const lowest = Math.min(...notes.map((note) => note.fret));
  const shifts = [-24, -12, 0, 12, 24]
    .map((octave) => interval + octave)
    .filter((shift) => lowest + shift >= 1);
  const shift =
    near === null
      ? Math.min(...shifts)
      : shifts.sort((a, b) => Math.abs(lowest + a - near) - Math.abs(lowest + b - near))[0];
  const { offsets } = SEVENTH_QUALITIES[quality];
  return notes.map((note) => {
    const fret = note.fret + shift;
    const name = spell(root, offsets[note.tone], SEVENTH_LETTERS[note.tone]);
    return {
      string: note.string,
      fret,
      finger: note.finger,
      degree: note.degree,
      pitch: withOctave(name, OPEN_STRING_MIDI[note.string] + fret),
      name,
    };
  });
}

const COUNT7_PT = {
  1: "uma digitação",
  2: "duas digitações",
  3: "três digitações",
};
const COUNT7_EN = {
  1: "one fingering",
  2: "two fingerings",
  3: "three fingerings",
};

function seventhLesson(root, quality, start, firstString) {
  const shapes = seventhShapes(quality, start.tone, firstString);
  const name = SEVENTH_QUALITIES[quality].name(root);
  const where =
    start.tone === 0
      ? {
          pt: `com a tônica na ${firstString}ª corda`,
          en: `with the root on the ${ORDINAL_EN[firstString]} string`,
        }
      : {
          pt: `começando na ${start.degree.pt}, na ${firstString}ª corda`,
          en: `starting on the ${start.degree.en}, on the ${ORDINAL_EN[firstString]} string`,
        };
  return {
    key: lessonKey("arpeggios7", quality, start.key, String(firstString), ascii(root)),
    title: { pt: `${name.pt} - arpejo`, en: `${name.en} - arpeggio` },
    subtitle: {
      pt: `Arpejo de ${name.pt} em ${COUNT7_PT[shapes.length]}, ${where.pt}`,
      en: `${name.en} arpeggio in ${COUNT7_EN[shapes.length]}, ${where.en}`,
    },
    scale: shapes.map((notes, index) => ({
      root,
      quality,
      position: index + 1,
      mode: { pt: `Digitação ${index + 1}`, en: `Fingering ${index + 1}` },
      label: { pt: `Digitação ${index + 1}`, en: `Fingering ${index + 1}` },
      showFingers: true,
      instruction: {
        pt: `Toque o arpejo de ${name.pt} na digitação ${index + 1}, ${where.pt}, subindo e descendo.`,
        en: `Play the ${name.en} arpeggio in fingering ${index + 1}, ${where.en}, up and down.`,
      },
      notes: placeShape(notes, root, quality).map(({ string, fret, finger, degree }) => ({
        string,
        fret,
        finger,
        degree,
      })),
    })),
  };
}

const SEVENTHS = {
  title: { pt: "Arpejos de Tétrades", en: "Seventh Chord Arpeggios" },
  subtitle: {
    pt: "Toque os acordes 7+, m7, 7 e m7(♭5) nota por nota, começando na tônica, na terça, na quinta e na sétima",
    en: "Play maj7, m7, 7 and m7(♭5) chords note by note, starting on the root, the third, the fifth and the seventh",
  },
  trails: SEVENTH_STARTS.flatMap((start) =>
    SEVENTH_ORDER.flatMap((quality) =>
      [6, 5, 4].map((firstString) => ({
        section: start.section,
        group: SEVENTH_QUALITIES[quality].title,
        title: {
          pt: `${start.degree.pt[0].toUpperCase() + start.degree.pt.slice(1)} na ${firstString}ª corda`,
          en: `${start.degree.en[0].toUpperCase() + start.degree.en.slice(1)} on the ${ORDINAL_EN[firstString]} string`,
        },
        lessons: SEVENTH_QUALITIES[quality].cycle.map((root) =>
          seventhLesson(root, quality, start, firstString),
        ),
      })),
    ),
  ),
};

// ---- Exercises (same as the triad module, with four-note chords) ----
const SEVENTH_SECTION = { pt: "Exercícios", en: "Exercises" };
const SEVENTH_OVERLINE = {
  pt: "Prática de Arpejos de Tétrades",
  en: "Seventh Arpeggios Practice",
};
const DIATONIC_SEVENTHS = ["maj7", "m7", "m7", "maj7", "7", "m7", "m7b5"];
const seventhSymbol = (root, quality) => `${root}${SEVENTH_QUALITIES[quality].suffix}`;
/** Major key whose signature fits the chord: its own (7+, 7 = V of the key a 4th up), relative major (m7), vii° (m7(♭5)). */
const SEVENTH_SIGNATURE = {
  maj7: (root) => root,
  m7: (root) => spell(root, 3, 2),
  7: (root) => spell(root, 5, 3),
  m7b5: (root) => spell(root, 1, 1),
};
/** Shape n of a start and string, or the last one when that start has fewer fingerings. */
const seventhShape = (quality, tone, string, fingering) => {
  const shapes = seventhShapes(quality, tone, string);
  return shapes[Math.min(fingering, shapes.length - 1)];
};

// Inversions: per quality and string, exercise n = every inversion in fingering n, up the neck.
function seventhInversionLesson(root, quality, firstString) {
  // As many exercises as every inversion has fingerings (no exercise repeats another).
  const count = Math.min(
    ...SEVENTH_STARTS.map((start) => seventhShapes(quality, start.tone, firstString).length),
  );
  const name = SEVENTH_QUALITIES[quality].name(root);
  const where = {
    pt: `a partir da ${firstString}ª corda`,
    en: `starting on the ${ORDINAL_EN[firstString]} string`,
  };
  return {
    key: lessonKey("arpeggios7", "inversions", quality, String(firstString), ascii(root)),
    title: {
      pt: `${name.pt} - inversões na ${firstString}ª corda`,
      en: `${name.en} - inversions on the ${ORDINAL_EN[firstString]} string`,
    },
    subtitle: {
      pt: `Todas as inversões de ${name.pt} em arpejo ${where.pt}, em ${COUNT7_PT[count]}`,
      en: `Every inversion of ${name.en} as arpeggios ${where.en}, in ${COUNT7_EN[count]}`,
    },
    scale: Array.from({ length: count }, (_, fingering) => {
      const bars = SEVENTH_STARTS.map((start) => {
        const notes = placeShape(seventhShape(quality, start.tone, firstString, fingering), root, quality);
        return {
          label:
            start.tone === 0
              ? seventhSymbol(root, quality)
              : `${seventhSymbol(root, quality)}/${notes[0].name}`,
          notes,
        };
      }).sort((a, b) => a.notes[0].fret - b.notes[0].fret);
      return {
        root,
        quality,
        position: fingering + 1,
        mode: {
          pt: `Digitação ${fingering + 1}`,
          en: `Fingering ${fingering + 1}`,
        },
        label: {
          pt: `Digitação ${fingering + 1}`,
          en: `Fingering ${fingering + 1}`,
        },
        showFingers: true,
        instruction: {
          pt: `Toque as inversões de ${name.pt} ${where.pt}, na digitação ${fingering + 1}`,
          en: `Play the inversions of ${name.en} ${where.en}, in fingering ${fingering + 1}`,
        },
        notation: true,
        signature: SEVENTH_SIGNATURE[quality](root),
        groups: bars.map((bar) => ({ label: bar.label, count: 4 })),
        notes: bars.flatMap((bar) => bar.notes.map(({ name: _name, ...note }) => note)),
      };
    }),
  };
}

// Horizontal: the seven chords of the key up one string, in fingering n (closest to the nut).
function seventhHorizontalRun(rootString, key, fingering) {
  const reference = 6 - rootString;
  const tonicFret = (rootPitchClass(key) - (OPEN_STRING_MIDI[reference] % 12) + 12) % 12;
  const runs = [];
  for (let first = 0; first < 7; first++) {
    for (const octave of [0, 12]) {
      const firstFret = ((tonicFret + MAJOR_SCALE[first]) % 12) + octave;
      const chords = Array.from({ length: 7 }, (_, n) => {
        const degree = (first + n) % 7;
        const fret = firstFret + ((MAJOR_SCALE[degree] - MAJOR_SCALE[first] + 12) % 12);
        const quality = DIATONIC_SEVENTHS[degree];
        const chordRoot = spell(key, MAJOR_SCALE[degree], degree);
        const shape = seventhShape(quality, 0, rootString, fingering);
        const placed = placeShape(shape, chordRoot, quality, fret).map((note) => ({
          ...note,
          fret: note.fret - (placeShape(shape, chordRoot, quality, fret)[0].fret - fret),
        }));
        return {
          degree,
          label: seventhSymbol(chordRoot, quality),
          notes: placed,
        };
      });
      const frets = chords.flatMap((chord) => chord.notes.map((note) => note.fret));
      if (Math.min(...frets) >= 1 && Math.max(...frets) <= 19)
        runs.push({
          chords,
          low: Math.min(...frets),
          high: Math.max(...frets),
        });
    }
  }
  return runs.sort((a, b) => a.low - b.low || a.high - b.high)[0].chords;
}

function seventhHorizontalLesson(rootString, key) {
  const name = { pt: `${key} maior`, en: `${key} Major` };
  const where = {
    pt: `na ${rootString}ª corda`,
    en: `on the ${ORDINAL_EN[rootString]} string`,
  };
  return {
    key: lessonKey("arpeggios7", "diatonic", String(rootString), ascii(key)),
    title: {
      pt: `${key} maior - tétrades diatônicas`,
      en: `${key} major - diatonic seventh chords`,
    },
    subtitle: {
      pt: `As sete tétrades de ${key} maior em arpejo, subindo o braço com a tônica ${where.pt}`,
      en: `The seven seventh chords of ${key} major as arpeggios, up the neck with the root ${where.en}`,
    },
    // As many exercises as every chord of the key has root-position fingerings.
    scale: Array.from(
      {
        length: Math.min(...SEVENTH_ORDER.map((quality) => seventhShapes(quality, 0, rootString).length)),
      },
      (_, fingering) => {
        const chords = seventhHorizontalRun(rootString, key, fingering);
        return {
          root: key,
          quality: "maj7",
          position: fingering + 1,
          mode: {
            pt: `Digitação ${fingering + 1}`,
            en: `Fingering ${fingering + 1}`,
          },
          label: {
            pt: `Digitação ${fingering + 1}`,
            en: `Fingering ${fingering + 1}`,
          },
          showFingers: true,
          instruction: {
            pt: `Toque as tétrades diatônicas de ${name.pt} subindo o braço ${where.pt}, na digitação ${fingering + 1}`,
            en: `Play the diatonic seventh chords of ${name.en} up the neck ${where.en}, in fingering ${fingering + 1}`,
          },
          notation: true,
          groups: chords.map((chord) => ({ label: chord.label, count: 4 })),
          notes: chords.flatMap((chord) => chord.notes.map(({ name: _name, ...note }) => note)),
        };
      },
    ),
  };
}

// Vertical: in each scale position, the seven chords from the lowest root up to its 7th.
function seventhVerticalLesson(key, index) {
  const { notes } = scalePosition(key, "major", index);
  const degreeOf = (note) => Number(note.degree) - 1;
  const chords = [];
  for (let n = 0; n < 7; n++) {
    const degree = (index + n) % 7;
    const picked = [];
    let from = -1;
    for (const step of [0, 2, 4, 6]) {
      from = notes.findIndex((note, at) => at > from && degreeOf(note) === (degree + step) % 7);
      if (from < 0) throw new Error(`${key} posição ${index + 1}: tétrade do grau ${degree + 1} incompleta`);
      picked.push(notes[from]);
    }
    const quality = DIATONIC_SEVENTHS[degree];
    chords.push({
      label: seventhSymbol(spell(key, MAJOR_SCALE[degree], degree), quality),
      notes: picked.map((note) => ({
        string: note.string,
        fret: note.fret,
        finger: note.finger,
        degree: note.degree,
        pitch: pitchName(key, degreeOf(note), OPEN_STRING_MIDI[note.string] + note.fret),
      })),
    });
  }
  const position = index + 1;
  return {
    key: lessonKey("arpeggios7", "diatonic-vertical", `p${position}`, ascii(key)),
    title: {
      pt: `${key} maior - tétrades na posição ${position}`,
      en: `${key} major - seventh chords in position ${position}`,
    },
    subtitle: {
      pt: `As sete tétrades de ${key} maior em arpejo, sem sair da posição ${position}`,
      en: `The seven seventh chords of ${key} major as arpeggios, staying in position ${position}`,
    },
    scale: [
      {
        root: key,
        quality: "maj7",
        position,
        mode: MODES[index],
        instruction: {
          pt: `Toque as tétrades diatônicas de ${key} maior na posição ${position}`,
          en: `Play the diatonic seventh chords of ${key} Major in position ${position}`,
        },
        notation: true,
        groups: chords.map((chord) => ({ label: chord.label, count: 4 })),
        notes: chords.flatMap((chord) => chord.notes),
      },
    ],
  };
}

SEVENTHS.trails.push(
  ...SEVENTH_ORDER.flatMap((quality) =>
    [6, 5, 4].map((firstString) => ({
      section: SEVENTH_SECTION,
      group: SEVENTH_QUALITIES[quality].inversions,
      overline: SEVENTH_OVERLINE,
      title: {
        pt: `${SEVENTH_QUALITIES[quality].inversions.pt} na ${firstString}ª corda`,
        en: `${SEVENTH_QUALITIES[quality].inversions.en} on the ${ORDINAL_EN[firstString]} string`,
      },
      lessons: SEVENTH_QUALITIES[quality].cycle.map((root) =>
        seventhInversionLesson(root, quality, firstString),
      ),
    })),
  ),
  ...[6, 5, 4].map((rootString) => ({
    section: SEVENTH_SECTION,
    group: { pt: "Na horizontal", en: "Horizontally" },
    overline: SEVENTH_OVERLINE,
    title: {
      pt: `Tétrades diatônicas na ${rootString}ª corda`,
      en: `Diatonic seventh chords on the ${ORDINAL_EN[rootString]} string`,
    },
    lessons: CYCLE_OF_FOURTHS.map((key) => seventhHorizontalLesson(rootString, key)),
  })),
  ...[0, 1, 2, 3, 4, 5, 6].map((index) => ({
    section: SEVENTH_SECTION,
    group: { pt: "Na vertical", en: "Vertically" },
    overline: SEVENTH_OVERLINE,
    title: {
      pt: `Tétrades diatônicas na posição ${index + 1}`,
      en: `Diatonic seventh chords in position ${index + 1}`,
    },
    lessons: CYCLE_OF_FOURTHS.map((key) => seventhVerticalLesson(key, index)),
  })),
);

// Module order on the dashboard: CAGED, triads, seventh chords (ids stay: 1, 3, 2).
const triadTrails = renderInversionTrails(TRIADS);
const inversionTrails = renderInversionTrails(INVERSIONS);
const scaleTrails = renderScaleTrails(SCALES);
const arpeggioTrails = renderScaleTrails(ARPEGGIOS);
const seventhArpeggioTrails = renderScaleTrails(SEVENTHS);

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
  /** Section heading above the groups ("Começando na tônica"), when the module has two levels. */
  section?: Localized;
  /** Overline of the trail's exercises, replacing the path and the key ("Triad Arpeggios Practice"). */
  overline?: Localized;
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
  {
    id: 6,
    title: ${loc(SEVENTHS.title)},
    subtitle: ${loc(SEVENTHS.subtitle)},
    trails: [
${seventhArpeggioTrails.join("\n")}
    ],
  },
];

/** Every lesson of every trail, in order. */
export const lessons: Lesson[] = sections.flatMap((section) => section.trails.flatMap((trail) => trail.lessons));
`;
fs.writeFileSync(
  path.resolve(import.meta.dirname, "../../src/lessons.ts"),
  file,
);
console.log(
  `src/lessons.ts: 6 seções, ${TRAILS.length + TRIADS.trails.length + INVERSIONS.trails.length + SCALES.trails.length + ARPEGGIOS.trails.length + SEVENTHS.trails.length} trilhas, ${nextId - 1} aulas`,
);
