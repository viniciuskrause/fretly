// Chord voicings are written out in full, in the chords-db format
// (https://github.com/tombatossals/chords-db). Generate new ones with the
// chord-generator skill (.claude/skills/chord-generator) and validate them
// with `npm run check:chords`.

/** One way to play a chord, exactly as chords-db stores it. */
export type ChordPosition = {
  /** One entry per string, low E → high E. -1 muted, 0 open, n = n-th fret counted from baseFret (1 = baseFret). */
  frets: number[];
  /** Left-hand finger per string (1 index … 4 pinky), 0 when open or muted. */
  fingers: number[];
  /** Fret shown in the first column of the diagram. 1 = first position (nut drawn). */
  baseFret: number;
  /** Relative frets held by a finger-1 barre across two or more strings. */
  barres: number[];
  /** MIDI note of every sounding string, low → high. */
  midi: number[];
};

export type CagedShape = "C" | "A" | "G" | "E" | "D";

/** Chord symbol with its CAGED shape ("D (Forma C)") or, for inversions, its bass string ("C7M/E (baixo na 5ª corda)"). */
export function chordLabel(step: Pick<ChordStep, "chord" | "shape" | "bassString">) {
  if (step.shape) return `${step.chord} (Forma ${step.shape})`;
  return step.bassString ? `${step.chord} (baixo na ${step.bassString}ª corda)` : step.chord;
}

export type ChordStep = {
  /** Name shown in the app ("C", "B♭", "Am", "G7", "Bm7(♭5)"). */
  chord: string;
  /** chords-db suffix; omitted = "major". */
  suffix?: "major" | "minor" | "7" | "m7b5" | "maj7" | "m7";
  /** Chord tone in the bass (inversions); omitted = the root. */
  bass?: "root" | "third" | "fifth" | "seventh";
  /** CAGED shape the voicing comes from (root-position chords of section 1). */
  shape?: CagedShape;
  /** String holding the bass note (inversions of section 2: 4, 5 or 6). */
  bassString?: 4 | 5 | 6;
  /** Alternative fingering of the previous step (labelled under the diagram). */
  alternative?: boolean;
  instruction: string;
  position: ChordPosition;
};

/** Standard tuning, low E → high E. */
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

export function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Absolute fret of a string (0 = open), or null when muted. */
export function absoluteFret(position: ChordPosition, string: number) {
  const fret = position.frets[string];
  if (fret < 0) return null;
  return fret === 0 ? 0 : position.baseFret + fret - 1;
}

/** Sounding strings, low → high. */
export function soundingStrings(position: ChordPosition) {
  return position.frets.flatMap((fret, string) => (fret >= 0 ? [string] : []));
}

export function stringFrequency(position: ChordPosition, string: number) {
  const fret = absoluteFret(position, string);
  return fret === null ? null : midiToFrequency(OPEN_STRING_MIDI[string] + fret);
}

/** Strings covered by each barre (finger 1 on that relative fret), as [from, to] string indexes. */
export function barreSpans(position: ChordPosition) {
  return position.barres.map((fret) => {
    const strings = position.frets.flatMap((f, string) =>
      f === fret && position.fingers[string] === 1 ? [string] : [],
    );
    return { fret, from: Math.min(...strings), to: Math.max(...strings), strings };
  });
}

const NATURAL_PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Pitch class (0 = C) of the chord's root, read from its symbol ("B♭m7/F" → 10). */
export function rootPitchClass(chord: string) {
  const match = /^([A-G])([♭♯]?)/.exec(chord);
  if (!match) return null;
  const accidental = match[2] === "♭" ? -1 : match[2] === "♯" ? 1 : 0;
  return (NATURAL_PITCH_CLASS[match[1]] + accidental + 12) % 12;
}

/** Degree names by semitones above the root, spelled for the app's chords (triads, 7M, m7, 7, m7(♭5)). */
const DEGREE_BY_SEMITONES = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♯5", "6", "♭7", "7"];

/** Degree of the note a string sounds in this chord ("1", "♭3", "5", "♭7"…), or null when muted. */
export function stringDegree(step: Pick<ChordStep, "chord" | "position">, string: number) {
  const fret = absoluteFret(step.position, string);
  const root = rootPitchClass(step.chord);
  if (fret === null || root === null) return null;
  return DEGREE_BY_SEMITONES[(OPEN_STRING_MIDI[string] + fret - root + 120) % 12];
}
