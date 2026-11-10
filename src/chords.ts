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

export type ChordStep = {
  chord: string;
  /** CAGED shape the voicing comes from (shown on the lesson path). */
  shape: CagedShape;
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
