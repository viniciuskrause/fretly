#!/usr/bin/env node
// Generates chord positions in the chords-db format following Fretly's conventions.
//
//   node scripts/chords/generate.mjs <chord> [--position 1-5 | --shape C|A|G|E|D] [--fret N] [--suffix major]
//
//   major|minor + --position  the N-th CAGED shape up the neck (Fretly's "posição N")
//   major|minor + --shape     CAGED shape placed where the root falls (or at --fret)
//   major|minor, no shape     all five CAGED shapes
//   other suffixes            chords-db positions converted to Fretly conventions
//
// Every result is validated and compared with reference/chords-db/guitar.json.
import {
  cagedTemplates,
  compareWithDb,
  dbPositions,
  describe,
  formatPosition,
  fromCaged,
  shapeForPosition,
  toFretly,
  validate,
} from "./lib.mjs";

const args = process.argv.slice(2);
const chord = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const json = args.includes("--json");
if (!chord) {
  console.error("Uso: node scripts/chords/generate.mjs <acorde> [--position 1-5 | --shape C|A|G|E|D] [--fret N] [--suffix major] [--json]");
  process.exit(1);
}
const suffix = option("suffix") ?? "major";
const positionArg = option("position");
const shapeArg = positionArg ? shapeForPosition(chord, Number(positionArg)) : option("shape");
const fretArg = option("fret");

const candidates = [];
if (cagedTemplates(suffix)) {
  const shapes = shapeArg ? [shapeArg] : Object.keys(cagedTemplates(suffix));
  for (const shape of shapes) {
    const position = fromCaged(chord, shape, fretArg === undefined ? undefined : Number(fretArg), suffix);
    const label = positionArg ? `posição ${positionArg}, forma de ${shape}` : `forma de ${shape}`;
    candidates.push({ source: label, shape, position });
  }
} else {
  if (positionArg) throw new Error("--position só vale para major e minor");
  dbPositions(chord, suffix).forEach((dbPosition, index) => {
    candidates.push({ source: `chords-db posição ${index + 1}`, position: toFretly(dbPosition, chord) });
  });
}

let failed = false;
const results = candidates.map((candidate) => {
  const check = validate(candidate.position, chord, suffix);
  const db = compareWithDb(candidate.position, chord, suffix);
  if (check.errors.length) failed = true;
  return { chord, suffix, ...candidate, ...check, db: { kind: db.kind, fingersAgree: db.fingersAgree } };
});

if (json) console.log(JSON.stringify(results, null, 2));
else {
  for (const r of results) {
    const dbText = {
      identical: `idêntico ao chords-db${r.db.fingersAgree ? "" : " (dedos diferentes!)"}`,
      "db-extra-strings": `chords-db toca cordas extras${r.db.fingersAgree ? "" : " (dedos diferentes!)"}`,
      "not-in-db": "sem equivalente no chords-db",
    }[r.db.kind];
    console.log(`\n${r.chord} ${r.suffix} — ${r.source} — ${dbText}`);
    console.log(`  position: ${formatPosition(r.position)}`);
    console.log(`  ${describe(r.position)}`);
    r.errors.forEach((e) => console.log(`  ❌ ${e}`));
    r.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }
}
process.exit(failed ? 1 : 0);
