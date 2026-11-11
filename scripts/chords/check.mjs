#!/usr/bin/env node
// Validates every chord in src/lessons.ts against Fretly's conventions and
// compares it with reference/chords-db. Exits 1 on any convention error.
//   npm run check:chords
import { lessons } from "../../src/lessons.ts";
import { compareWithDb, describe, validate } from "./lib.mjs";

let errors = 0;
const tally = { identical: 0, "db-extra-strings": 0, "not-in-db": 0 };
const notInDb = [];

for (const lesson of lessons) {
  for (const [index, step] of lesson.steps.entries()) {
    const suffix = step.suffix ?? "major";
    const where = `${lesson.title} · passo ${index + 1} · ${step.chord}`;
    const result = validate(step.position, step.chord, suffix, step.shape, step.bass);
    const db = compareWithDb(step.position, step.chord, suffix);
    tally[db.kind]++;
    if (db.kind === "not-in-db") notInDb.push(`${step.chord} (forma de ${step.shape})`);
    if (db.kind !== "not-in-db" && !db.fingersAgree) result.warnings.push("dedos diferentes do chords-db");
    if (result.errors.length || result.warnings.length) {
      console.log(`${result.errors.length ? "❌" : "⚠"} ${where}\n   ${describe(step.position)}`);
      result.errors.forEach((e) => console.log(`   erro: ${e}`));
      result.warnings.forEach((w) => console.log(`   aviso: ${w}`));
    }
    errors += result.errors.length;
  }
}

const total = Object.values(tally).reduce((a, b) => a + b, 0);
console.log(
  `\n${total} acordes · idênticos ao chords-db: ${tally.identical} · chords-db com cordas extras: ${tally["db-extra-strings"]} · próprios do Fretly: ${tally["not-in-db"]}`,
);
if (notInDb.length) console.log(`Próprios do Fretly (sem equivalente no chords-db): ${[...new Set(notInDb)].join(", ")}`);
console.log(errors ? `\n❌ ${errors} erro(s) de convenção` : "\n✓ todos os acordes seguem as convenções");
process.exit(errors ? 1 : 0);
