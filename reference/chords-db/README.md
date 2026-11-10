# chords-db (reference copy)

`guitar.json` is the guitar database from [chords-db](https://github.com/tombatossals/chords-db)
by David Rubert, npm package `@tombatossals/chords-db@0.5.1`, MIT licensed (see `LICENSE`).
Downloaded 2026-11-10 from
`https://cdn.jsdelivr.net/npm/@tombatossals/chords-db@0.5.1/lib/guitar.json`.

It is reference data only. It is not bundled into the app. The chord-generator
skill and `scripts/chords/*` use it to look up voicings and fingerings, and
`npm run check:chords` compares every chord in the app with it.

Layout: `chords[key]` is a list of `{ key, suffix, positions[] }`. The sharp keys are
`Csharp` and `Fsharp`; the other keys use flats (`Eb`, `Ab`, `Bb`). Each position looks like this:

```json
{ "frets": [-1, 3, 2, 0, 1, 0], "fingers": [0, 3, 2, 0, 1, 0], "baseFret": 1, "barres": [], "midi": [48, 52, 55, 60, 64] }
```

Strings run low E → high E. `frets` count from `baseFret` (1 = baseFret), 0 is open
and -1 is muted. `barres` lists relative frets held by one finger across several
strings. `capo: true` marks a full-neck barre. Fretly does not use `capo`.
