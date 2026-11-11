// Shared chord logic for the chord-generator skill: Fretly's conventions,
// CAGED templates, conversion of chords-db voicings, validation and comparison.
// Positions use the chords-db format (strings low E → high E).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ["6ª (Mi grave)", "5ª (Lá)", "4ª (Ré)", "3ª (Sol)", "2ª (Si)", "1ª (Mi agudo)"];

// ---------------------------------------------------------------- names
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "B♭" / "Bb" / "C#" → pitch class 0–11. */
export function rootPitchClass(chord) {
  const match = /^([A-G])([#♯b♭]?)/.exec(chord);
  if (!match) throw new Error(`Acorde inválido: ${chord}`);
  const accidental = match[2] === "#" || match[2] === "♯" ? 1 : match[2] ? -1 : 0;
  return (NOTE_PC[match[1]] + accidental + 12) % 12;
}

/** chords-db key for a root pitch class (it stores Csharp/Fsharp and flats otherwise). */
const DB_KEYS = ["C", "Csharp", "D", "Eb", "E", "F", "Fsharp", "G", "Ab", "A", "Bb", "B"];
export const dbKey = (chord) => DB_KEYS[rootPitchClass(chord)];

/** Chord tones (semitones above the root) for the suffixes we validate. */
export const SUFFIX_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  "7sus4": [0, 5, 7, 10],
  add9: [0, 2, 4, 7],
  "9": [0, 2, 4, 7, 10],
};

// ---------------------------------------------------------------- CAGED
// Open-position template of each shape (absolute frets, low E → high E) and its
// fingering. When the shape moves up the neck, the strings that were open are
// held by a finger-1 barre and the other notes use fingers 2–4 ("moved").
// Strings below the root stay muted (Fretly convention: the bass is the root).
export const CAGED = {
  C: { rootPc: 0, frets: [-1, 3, 2, 0, 1, 0], open: [0, 3, 2, 0, 1, 0], moved: [0, 4, 3, 1, 2, 1] },
  A: { rootPc: 9, frets: [-1, 0, 2, 2, 2, 0], open: [0, 0, 1, 2, 3, 0], moved: [0, 1, 2, 3, 4, 1] },
  G: { rootPc: 7, frets: [3, 2, 0, 0, 0, 3], open: [2, 1, 0, 0, 0, 3], moved: [3, 2, 1, 1, 1, 4] },
  E: { rootPc: 4, frets: [0, 2, 2, 1, 0, 0], open: [0, 2, 3, 1, 0, 0], moved: [1, 3, 4, 2, 1, 1] },
  D: { rootPc: 2, frets: [-1, -1, 0, 2, 3, 2], open: [0, 0, 0, 1, 3, 2], moved: [0, 0, 1, 2, 4, 3] },
};

// Minor CAGED shapes (Cm, Am, Gm, Em, Dm in open position). Same roots and the
// same order up the neck as the major ones, so "posição N" picks the same shape.
// `movedFrets` replaces the open template when the shape moves: the open Cm's
// high G (1ª corda, casa 3) and the open Gm's two top notes are out of reach
// once the open strings become a finger-1 barre, so those strings are muted.
export const CAGED_MINOR = {
  C: { rootPc: 0, frets: [-1, 3, 1, 0, 1, 3], open: [0, 3, 2, 0, 1, 4], movedFrets: [-1, 3, 1, 0, 1, -1], moved: [0, 4, 2, 1, 3, 0] },
  A: { rootPc: 9, frets: [-1, 0, 2, 2, 1, 0], open: [0, 0, 2, 3, 1, 0], moved: [0, 1, 3, 4, 2, 1] },
  G: { rootPc: 7, frets: [3, 1, 0, 0, 3, 3], open: [2, 1, 0, 0, 3, 4], movedFrets: [3, 1, 0, 0, -1, -1], moved: [4, 2, 1, 1, 0, 0] },
  E: { rootPc: 4, frets: [0, 2, 2, 0, 0, 0], open: [0, 2, 3, 0, 0, 0], moved: [1, 3, 4, 1, 1, 1] },
  D: { rootPc: 2, frets: [-1, -1, 0, 2, 3, 1], open: [0, 0, 0, 2, 3, 1], moved: [0, 0, 1, 3, 4, 2] },
};

// Dominant seventh shapes (C7 x32310, A7 x02020, G7 320001, E7 020100, D7 xx0212).
// The moved C7 drops the high E string (x3231x moved, like the common D7 x5453x).
export const CAGED_DOM7 = {
  C: { rootPc: 0, frets: [-1, 3, 2, 3, 1, 0], open: [0, 3, 2, 4, 1, 0], movedFrets: [-1, 3, 2, 3, 1, -1], moved: [0, 3, 2, 4, 1, 0] },
  A: { rootPc: 9, frets: [-1, 0, 2, 0, 2, 0], open: [0, 0, 2, 0, 3, 0], moved: [0, 1, 3, 1, 4, 1] },
  G: { rootPc: 7, frets: [3, 2, 0, 0, 0, 1], open: [3, 2, 0, 0, 0, 1], moved: [4, 3, 1, 1, 1, 2] },
  E: { rootPc: 4, frets: [0, 2, 0, 1, 0, 0], open: [0, 2, 0, 1, 0, 0], moved: [1, 3, 1, 2, 1, 1] },
  D: { rootPc: 2, frets: [-1, -1, 0, 2, 1, 2], open: [0, 0, 0, 2, 1, 3], moved: [0, 0, 1, 3, 2, 4] },
};

// Half-diminished (m7(♭5)) shapes, each keeping its CAGED root/third strings:
// Cm7(♭5) x31312, Am7(♭5) x0101x, Gm7(♭5) 3x332x, Em7(♭5) 0100xx, Dm7(♭5) xx0111.
export const CAGED_M7B5 = {
  C: { rootPc: 0, frets: [-1, 3, 1, 3, 1, 2], open: [0, 3, 1, 4, 1, 2], moved: [0, 3, 1, 4, 1, 2] },
  A: { rootPc: 9, frets: [-1, 0, 1, 0, 1, -1], open: [0, 0, 2, 0, 3, 0], moved: [0, 1, 2, 1, 3, 0] },
  // Forma G: 3x332x (Cm7(♭5) = 8x887x), chosen by the user for every key.
  G: { rootPc: 7, frets: [3, -1, 3, 3, 2, -1], open: [2, 0, 3, 4, 1, 0], moved: [2, 0, 3, 4, 1, 0] },
  // Forma E: 0100xx (Cm7(♭5) = 8988xx), chosen by the user for every key.
  E: { rootPc: 4, frets: [0, 1, 0, 0, -1, -1], open: [0, 1, 0, 0, 0, 0], moved: [1, 2, 1, 1, 0, 0] },
  D: { rootPc: 2, frets: [-1, -1, 0, 1, 1, 1], open: [0, 0, 0, 1, 1, 1], moved: [0, 0, 1, 2, 3, 4] },
};

/** Chord symbol shown in the app: "C", "Cm", "C7", "Cm7(♭5)", "C7M". */
export function chordSymbol(root, suffix = "major") {
  return root + ({ major: "", minor: "m", "7": "7", m7b5: "m7(♭5)", maj7: "7M" }[suffix] ?? suffix);
}

/** Chord tone in the bass of an inversion, as an index into SUFFIX_INTERVALS. */
export const BASS_TONES = { root: 0, third: 1, fifth: 2, seventh: 3 };
export const BASS_NAMES = { root: "a tônica", third: "a terça", fifth: "a quinta", seventh: "a sétima" };

/** CAGED templates for a suffix (major, minor, 7, m7b5). */
export function cagedTemplates(suffix = "major") {
  return { major: CAGED, minor: CAGED_MINOR, "7": CAGED_DOM7, m7b5: CAGED_M7B5 }[suffix] ?? null;
}

/** Fret where the shape sits for this root (0 = open position). */
export function cagedBaseFret(chord, shape) {
  return (rootPitchClass(chord) - CAGED[shape].rootPc + 12) % 12;
}

/**
 * The five CAGED shapes of a chord ordered up the neck (lowest base fret first).
 * "Posição N" of a chord = the N-th shape in this list: position 1 is the shape
 * closest to the nut (open C/A/G/E/D, F as E shape at fret 1, B♭ as A shape…),
 * and each next position is the next shape in C → A → G → E → D order.
 */
export function shapesUpTheNeck(chord) {
  return Object.keys(CAGED).sort((a, b) => cagedBaseFret(chord, a) - cagedBaseFret(chord, b));
}

export function shapeForPosition(chord, position) {
  if (!(position >= 1 && position <= 5)) throw new Error("A posição vai de 1 a 5");
  return shapesUpTheNeck(chord)[position - 1];
}

/** Order of the "ciclo das quartas" lessons. */
export const CYCLE_OF_FOURTHS = ["C", "F", "B♭", "E♭", "A♭", "D♭", "G♭", "B", "E", "A", "D", "G"];

export function midiOf(frets, baseFret) {
  return frets.flatMap((fret, string) =>
    fret < 0 ? [] : [OPEN_STRING_MIDI[string] + (fret === 0 ? 0 : baseFret + fret - 1)],
  );
}

/** Major or minor chord from a CAGED shape. `shift` (fret) defaults to where the root falls. */
export function fromCaged(chord, shape, shift = cagedBaseFret(chord, shape), suffix = "major") {
  const template = cagedTemplates(suffix)?.[shape];
  if (!template) throw new Error(`Forma desconhecida: ${shape} ${suffix} (use C, A, G, E ou D; major ou minor)`);
  if (shift === 0) {
    const frets = [...template.frets];
    const fingers = [...template.open];
    return { frets, fingers, baseFret: 1, barres: barresOf(frets, fingers), midi: midiOf(frets, 1) };
  }
  // abs = shift + templateFret, and abs = baseFret + rel - 1 with baseFret = shift, so rel = templateFret + 1.
  let frets = (template.movedFrets ?? template.frets).map((fret) => (fret < 0 ? -1 : fret + 1));
  let baseFret = shift;
  // When nothing is held on the shape's first fret (moved C7, m7(♭5)…), start
  // the diagram at the lowest fretted note instead of an empty column.
  const lowest = Math.min(...frets.filter((fret) => fret > 0));
  if (lowest > 1) {
    frets = frets.map((fret) => (fret > 0 ? fret - (lowest - 1) : fret));
    baseFret += lowest - 1;
  }
  const fingers = [...template.moved];
  return { frets, fingers, baseFret, barres: barresOf(frets, fingers), midi: midiOf(frets, baseFret) };
}

/** A barre is finger 1 holding the same relative fret on two or more strings. */
export function barresOf(frets, fingers) {
  const counts = {};
  frets.forEach((fret, string) => {
    if (fret > 0 && fingers[string] === 1) counts[fret] = (counts[fret] ?? 0) + 1;
  });
  return Object.keys(counts).filter((fret) => counts[fret] >= 2).map(Number);
}

// ---------------------------------------------------------------- chords-db
let db;
export function loadDb() {
  db ??= JSON.parse(fs.readFileSync(path.join(ROOT, "reference/chords-db/guitar.json"), "utf8"));
  return db;
}

export function dbPositions(chord, suffix = "major") {
  const entry = loadDb().chords[dbKey(chord)]?.find((c) => c.suffix === suffix);
  if (!entry) throw new Error(`chords-db não tem ${chord} ${suffix}`);
  return entry.positions;
}

/**
 * Applies Fretly's conventions to a chords-db position: mute every string below
 * the lowest root, drop `capo`, keep only finger-1 barres over 2+ strings, and
 * recompute MIDI.
 */
export function toFretly(position, chord) {
  const rootPc = rootPitchClass(chord);
  const frets = [...position.frets];
  const fingers = [...position.fingers];
  const bass = frets.findIndex((fret, string) => {
    if (fret < 0) return false;
    const abs = fret === 0 ? 0 : position.baseFret + fret - 1;
    return (OPEN_STRING_MIDI[string] + abs) % 12 === rootPc;
  });
  for (let string = 0; string < bass; string++) {
    frets[string] = -1;
    fingers[string] = 0;
  }
  return {
    frets,
    fingers,
    baseFret: position.baseFret,
    barres: barresOf(frets, fingers),
    midi: midiOf(frets, position.baseFret),
  };
}

const absFrets = (p) => p.frets.map((f) => (f <= 0 ? f : p.baseFret + f - 1));

/** How a Fretly position relates to chords-db: identical, db plays extra strings, or not listed. */
export function compareWithDb(position, chord, suffix = "major") {
  const mine = absFrets(position);
  let best = null;
  for (const [index, candidate] of dbPositions(chord, suffix).entries()) {
    const theirs = absFrets(candidate);
    const identical = theirs.every((f, i) => f === mine[i]);
    const superset = mine.every((f, i) => f === -1 || theirs[i] === f);
    if (!identical && !superset) continue;
    const fingersAgree = mine.every((f, i) => f <= 0 || candidate.fingers[i] === position.fingers[i]);
    const result = { kind: identical ? "identical" : "db-extra-strings", index, fingersAgree, db: candidate };
    if (identical) return result;
    best ??= result;
  }
  return best ?? { kind: "not-in-db" };
}

// ---------------------------------------------------------------- shape
// A chord's CAGED shape comes from the string that holds the root (the bass)
// and the lowest string that holds the third:
//   tônica na Lá + terça na Ré       → forma de C
//   tônica na Lá + terça na Si       → forma de A
//   tônica no Mi grave + terça na Lá → forma de G
//   tônica no Mi grave + terça na Sol → forma de E
//   tônica na Ré + terça no Mi agudo → forma de D
const SHAPE_BY_STRINGS = { "1-2": "C", "1-4": "A", "0-1": "G", "0-3": "E", "2-5": "D" };

/** CAGED shape of a position by the root/third rule, or null when it fits none. */
export function shapeOf(position, chord, suffix = "major") {
  const intervals = SUFFIX_INTERVALS[suffix];
  if (!intervals) return null;
  const rootPc = rootPitchClass(chord);
  const thirdPc = (rootPc + intervals[1]) % 12;
  const pcAt = (string) => {
    const fret = position.frets[string];
    if (fret < 0) return null;
    return (OPEN_STRING_MIDI[string] + (fret === 0 ? 0 : position.baseFret + fret - 1)) % 12;
  };
  const strings = [0, 1, 2, 3, 4, 5];
  const rootString = strings.find((string) => pcAt(string) !== null);
  const thirdString = strings.find((string) => pcAt(string) === thirdPc);
  if (rootString === undefined || pcAt(rootString) !== rootPc || thirdString === undefined) return null;
  // Exception chosen by the user: the half-diminished Forma G is 3x332x
  // (Cm7(♭5) = 8x887x) — root on the low E, A string muted, third on the G
  // string. The half-diminished Forma E plays the A string (0100xx).
  if (suffix === "m7b5" && rootString === 0 && pcAt(1) === null) return "G";
  return SHAPE_BY_STRINGS[`${rootString}-${thirdString}`] ?? null;
}

// ---------------------------------------------------------------- validation
/**
 * Returns { errors, warnings } for a position against Fretly's conventions.
 * With `shape`, also checks it against the root/third rule (`shapeOf`).
 */
export function validate(position, chord, suffix = "major", shape, bass = "root") {
  const errors = [];
  const warnings = [];
  const { frets, fingers, baseFret, barres, midi } = position;

  if (frets?.length !== 6 || fingers?.length !== 6) errors.push("frets e fingers precisam de 6 valores (6ª → 1ª corda)");
  if (!Number.isInteger(baseFret) || baseFret < 1) errors.push("baseFret precisa ser um inteiro ≥ 1");
  if (errors.length) return { errors, warnings };

  frets.forEach((fret, string) => {
    const name = STRING_NAMES[string];
    if (!Number.isInteger(fret) || fret < -1 || fret > 5) errors.push(`${name}: casa ${fret} fora do diagrama (-1 a 5)`);
    if (fret > 0 && !(fingers[string] >= 1 && fingers[string] <= 4)) errors.push(`${name}: nota presa sem dedo 1–4`);
    if (fret <= 0 && fingers[string] !== 0) errors.push(`${name}: corda solta ou muda não leva dedo`);
  });

  // Pitches.
  const expectedMidi = midiOf(frets, baseFret);
  if (JSON.stringify(expectedMidi) !== JSON.stringify(midi)) errors.push(`midi deveria ser ${JSON.stringify(expectedMidi)}`);
  const rootPc = rootPitchClass(chord);
  const intervals = SUFFIX_INTERVALS[suffix];
  if (!intervals) warnings.push(`sufixo "${suffix}" sem notas cadastradas: notas não verificadas`);
  else {
    const tones = new Set(intervals.map((i) => (rootPc + i) % 12));
    const pcs = expectedMidi.map((m) => m % 12);
    pcs.forEach((pc) => tones.has(pc) || errors.push(`nota fora do acorde (classe ${pc})`));
    if (!pcs.includes(rootPc)) errors.push("falta a tônica");
    if (!pcs.includes((rootPc + intervals[1]) % 12)) warnings.push("falta a terça (ou a nota característica)");
  }
  // Inversions declare which chord tone is in the bass; everything else has the root there.
  const bassInterval = intervals?.[BASS_TONES[bass]] ?? 0;
  if (expectedMidi.length && expectedMidi[0] % 12 !== (rootPc + bassInterval) % 12)
    errors.push(`o baixo (nota mais grave) deve ser ${BASS_NAMES[bass]}`);

  // Fingering.
  const byFinger = {};
  frets.forEach((fret, string) => {
    if (fret > 0) (byFinger[fingers[string]] ??= []).push({ fret, string });
  });
  for (const [finger, notes] of Object.entries(byFinger)) {
    if (notes.length < 2) continue;
    const sameFret = notes.every((n) => n.fret === notes[0].fret);
    if (finger !== "1") errors.push(`dedo ${finger} em ${notes.length} cordas: só o dedo 1 faz pestana`);
    else if (!sameFret) errors.push("dedo 1 em casas diferentes");
    else if (!barres.includes(notes[0].fret)) errors.push(`pestana do dedo 1 na casa ${notes[0].fret} não está em barres`);
  }
  barres.forEach((fret) => {
    if ((byFinger[1] ?? []).filter((n) => n.fret === fret).length < 2) errors.push(`barres tem a casa ${fret}, mas o dedo 1 não prende 2+ cordas nela`);
  });
  const fretted = frets.flatMap((fret, string) => (fret > 0 ? [{ fret, finger: fingers[string] }] : []));
  for (const a of fretted)
    for (const b of fretted)
      if (a.fret > b.fret && a.finger < b.finger) errors.push(`dedo ${a.finger} na casa ${a.fret} acima do dedo ${b.finger} na casa ${b.fret}`);
  if (fretted.length) {
    const span = Math.max(...fretted.map((n) => n.fret)) - Math.min(...fretted.map((n) => n.fret));
    if (span > 3) warnings.push(`abertura de ${span + 1} casas: difícil de alcançar`);
  }
  if (baseFret > 1 && frets.some((f) => f === 0)) warnings.push("corda solta numa posição com baseFret > 1");
  // The root/third rule names shapes of root-position chords; an inversion's
  // shape is the one declared for it.
  if (shape && bass === "root") {
    const derived = shapeOf(position, chord, suffix);
    if (derived !== shape)
      errors.push(`forma registrada ${shape}, mas tônica/terça indicam ${derived ? `forma de ${derived}` : "nenhuma forma CAGED"}`);
  }
  return { errors: [...new Set(errors)], warnings };
}

export function describe(position) {
  const parts = position.frets.map((fret, string) => {
    if (fret < 0) return `${STRING_NAMES[string]} muda`;
    if (fret === 0) return `${STRING_NAMES[string]} solta`;
    return `${STRING_NAMES[string]} casa ${position.baseFret + fret - 1} dedo ${position.fingers[string]}`;
  });
  return parts.join(" · ");
}

export function formatPosition(p) {
  return `{ frets: [${p.frets.join(", ")}], fingers: [${p.fingers.join(", ")}], baseFret: ${p.baseFret}, barres: [${p.barres.join(", ")}], midi: [${p.midi.join(", ")}] }`;
}
