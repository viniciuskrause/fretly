import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ScaleStep } from "./chords.ts";
import { Icon } from "./Icon.tsx";
import { chordName, useI18n } from "./i18n.tsx";

/**
 * Tablature / staff notation for exercises that run along the neck (diatonic triads):
 * fret dots are kept for scale and arpeggio shapes. The learner switches between
 *  - tablature: six strings (high E on top), the fret of each note in playing order,
 *    and the left-hand finger under each fret number;
 *  - staff: treble clef sounding an octave lower (guitar), the key signature, the
 *    fingers above the staff and the string of each note in parentheses below.
 */
export type NotationView = "tab" | "staff";

const VIEW_KEY = "fretly.notation.v1";

function savedView(): NotationView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "staff" ? "staff" : "tab";
  } catch {
    return "tab";
  }
}

// One choice for every card on the page (the final sequence shows several): a tiny shared store.
let currentView: NotationView | null = null;
const viewListeners = new Set<() => void>();
function setSharedView(view: NotationView) {
  currentView = view;
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Blocked storage: the choice lasts for this visit only.
  }
  viewListeners.forEach((listener) => listener());
}
function useNotationView() {
  return useSyncExternalStore(
    (listener) => {
      viewListeners.add(listener);
      return () => viewListeners.delete(listener);
    },
    () => (currentView ??= savedView()),
  );
}

/**
 * Notes in playing order — the same order as the audio: up, then back down. The top
 * note is played again on the way down, so every bar of 3/8 holds one whole triad.
 */
export const playingOrder = (step: ScaleStep) => [
  ...step.notes.map((_, index) => index),
  ...step.notes.map((_, index) => index).reverse(),
];

/** Eighth notes per bar: one chord (3/8 for triads, 4/8 for seventh chords). */
const BEAT_UNIT = 8;

const LETTERS = "CDEFGAB";
const SHARP_KEYS = ["C", "G", "D", "A", "E", "B", "F♯", "C♯"];
const FLAT_KEYS = ["C", "F", "B♭", "E♭", "A♭", "D♭", "G♭", "C♭"];
const SHARP_ORDER = "FCGDAEB";
const FLAT_ORDER = "BEADGCF";
// Staff position (letter index + 7 × octave, written pitch) of each sign of the key signature.
const SHARP_SPOTS = [38, 35, 39, 36, 33, 37, 34];
const FLAT_SPOTS = [34, 37, 33, 36, 32, 35, 31];
/** E4, the bottom line of the treble staff, as a staff position. */
const BOTTOM_LINE = 2 + 7 * 4;

function keySignature(root: string) {
  const sharps = SHARP_KEYS.indexOf(root);
  if (sharps > 0) return { sign: "♯", count: sharps, letters: SHARP_ORDER.slice(0, sharps), spots: SHARP_SPOTS };
  const flats = FLAT_KEYS.indexOf(root);
  return { sign: "♭", count: Math.max(0, flats), letters: FLAT_ORDER.slice(0, Math.max(0, flats)), spots: FLAT_SPOTS };
}

/** "B♭2" → its letter, accidental and written staff position (guitar: an octave above the sound). */
function parsePitch(pitch: string) {
  const match = pitch.match(/^([A-G])([♯♭]*)(-?\d+)$/);
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  return { letter, accidental, position: LETTERS.indexOf(letter) + 7 * Number(octave) };
}

// Horizontal layout, in px.
const NOTE = 30;
const GROUP_GAP = 18;
/** Room for the time signature (3 over 8) at the start of the first line. */
const TIME_SIGNATURE = 22;
const TAB_PREFIX = 38;
const STAFF_SPACE = 8;
const STRING_SPACE = 12;
/** Extra room between two lines of the score, so each reads on its own. */
const ROW_GAP = 36;

type Item = { index: number; order: number; label: string; newGroup: boolean };

/** The playing order cut into chord groups (a new group when the chord or the direction changes). */
function sequence(step: ScaleStep): Item[] {
  const groupOf: string[] = [];
  (step.groups ?? []).forEach((group) => {
    for (let n = 0; n < group.count; n++) groupOf.push(group.label);
  });
  const order = playingOrder(step);
  return order.map((index, n) => {
    const previous = n > 0 ? order[n - 1] : null;
    const turned = n === step.notes.length; // first note on the way down
    const newGroup = previous === null || turned || (groupOf[index] ?? "") !== (groupOf[previous] ?? "");
    return { index, order: n, label: groupOf[index] ?? "", newGroup };
  });
}

/** Lines of the score: whole chord groups (bars) per line, as many as fit in `width`; the first line also holds the time signature. */
function lines(items: Item[], width: number, prefix: number, firstExtra = 0) {
  const groups: Item[][] = [];
  items.forEach((item) => {
    if (item.newGroup || groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(item);
  });
  const result: Item[][][] = [[]];
  let used = prefix + firstExtra;
  groups.forEach((group) => {
    const size = group.length * NOTE + GROUP_GAP;
    if (used + size > width && result[result.length - 1].length > 0) {
      result.push([]);
      used = prefix;
    }
    result[result.length - 1].push(group);
    used += size;
  });
  return result;
}

/** x of every note of a line, after `prefix`; groups (bars) are separated by a gap holding the barline. */
function placeLine(groups: Item[][], prefix: number) {
  let x = prefix + NOTE / 2;
  return groups.map((group) =>
    group.map((item, position) => {
      const placed = { item, x };
      x += NOTE;
      if (position === group.length - 1) x += GROUP_GAP;
      return placed;
    }),
  );
}

export function NotationCard({
  step,
  activeOrder = null,
  className = "",
  cardRef,
  current,
}: {
  step: ScaleStep;
  /** Position in the playing order of the note sounding now (both directions are drawn). */
  activeOrder?: number | null;
  /** Final sequence: sounding / dimmed state classes. */
  className?: string;
  cardRef?: (node: HTMLDivElement | null) => void;
  current?: boolean;
}) {
  const { t } = useI18n();
  const view = useNotationView();
  const setView = setSharedView;
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setWidth(Math.max(300, Math.floor(box.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const items = sequence(step);
  const helpRef = useRef<HTMLDialogElement>(null);
  return (
    <div
      ref={cardRef}
      aria-current={current ? "true" : undefined}
      className={`w-full rounded-card border border-line bg-surface p-4 pt-7 sm:p-5 sm:pt-9 ${className}`}
    >
      <div ref={boxRef} className="w-full">
        {view === "tab" ? (
          <Tablature step={step} items={items} width={width} activeOrder={activeOrder} center />
        ) : (
          <Staff step={step} items={items} width={width} activeOrder={activeOrder} center />
        )}
      </div>
      {/* Bottom bar: the notation switch in the centre, help at the right. */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <div role="group" aria-label={t("Notação", "Notation")} className="flex rounded-control border border-line p-0.5">
          {(
            [
              ["tab", t("Tablatura", "Tablature")],
              ["staff", t("Partitura", "Staff")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              aria-label={label}
              title={label}
              onClick={() => setView(id)}
              className={`flex h-9 w-11 items-center justify-center rounded-[0.6rem] transition ${
                view === id ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              <NotationIcon view={id} />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label={t("Como ler a tablatura e a partitura", "How to read the tab and the staff")}
          title={t("Como ler", "How to read")}
          onClick={() => helpRef.current?.showModal()}
          className="flex size-11 items-center justify-center justify-self-end rounded-control text-muted transition hover:bg-sunken hover:text-ink"
        >
          <Icon name="help" className="size-6" />
        </button>
      </div>
      <NotationHelp dialogRef={helpRef} />
    </div>
  );
}

/** "How to read" modal: the tablature and the staff of these exercises, element by element. */
function NotationHelp({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const { t } = useI18n();
  const close = () => dialogRef.current?.close();
  const items = (list: Array<[string, string]>) => (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ink-2">
      {list.map(([term, text]) => (
        <li key={term}>
          <strong className="font-semibold text-ink">{term}</strong> {text}
        </li>
      ))}
    </ul>
  );
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="notation-help-title"
      className="notation-help m-auto w-[min(640px,calc(100vw-32px))] rounded-card border border-line-strong bg-surface p-0 text-left"
      // A click on the backdrop (outside the panel) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="max-h-[calc(100dvh-64px)] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 id="notation-help-title" className="font-display text-[24px] font-bold leading-tight tracking-[-0.03em] text-ink">
            {t("Como ler a notação", "How to read the notation")}
          </h2>
          <button
            type="button"
            aria-label={t("Fechar", "Close")}
            onClick={close}
            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-sunken hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <h3 className="mt-6 font-display text-[17px] font-semibold text-ink">{t("Tablatura", "Tablature")}</h3>
        <TabExample />
        {items(
          t(
            [
              ["Linhas:", "cada linha é uma corda. A de cima é a 1ª (mi agudo), a de baixo é a 6ª (mi grave)."],
              ["Números nas linhas:", "a casa que você aperta naquela corda. Leia da esquerda para a direita, na ordem em que as notas soam."],
              ["Números acima:", "o dedo da mão esquerda para cada nota: 1 indicador, 2 médio, 3 anelar, 4 mínimo."],
              ["Nome acima de cada grupo:", "a tríade que aquelas notas formam (F, Gm, Bdim…)."],
            ],
            [
              ["Lines:", "each line is a string. The top one is the 1st (high E), the bottom one the 6th (low E)."],
              ["Numbers on the lines:", "the fret you press on that string. Read left to right, in the order the notes sound."],
              ["Numbers above:", "the left-hand finger for each note: 1 index, 2 middle, 3 ring, 4 pinky."],
              ["Name above each group:", "the triad those notes make (F, Gm, Bdim…)."],
            ],
          ),
        )}

        <h3 className="mt-6 font-display text-[17px] font-semibold text-ink">{t("Partitura", "Staff")}</h3>
        <StaffExample />
        {items(
          t(
            [
              ["Clave de sol com um 8 embaixo:", "o violão soa uma oitava abaixo do que está escrito."],
              ["Armadura:", "os sustenidos ou bemóis logo depois da clave valem para todas as notas com aquele nome, na música inteira. Eles dizem a tonalidade."],
              ["Altura:", "quanto mais alta a nota na pauta, mais aguda ela soa. As linhas curtas abaixo da pauta (linhas suplementares) continuam a pauta para as notas graves."],
              ["Colcheias:", "cada nota vale uma colcheia; as notas de um mesmo grupo são ligadas por uma barra."],
              ["Números acima:", "o dedo da mão esquerda, como na tablatura."],
              ["Números entre parênteses abaixo:", "a corda em que a nota é tocada: (6) é a 6ª corda, (5) a 5ª."],
            ],
            [
              ["Treble clef with an 8 below:", "the guitar sounds an octave lower than written."],
              ["Key signature:", "the sharps or flats right after the clef apply to every note with that name, for the whole piece. They tell you the key."],
              ["Pitch:", "the higher the note on the staff, the higher it sounds. The short lines below the staff (ledger lines) extend it for low notes."],
              ["Eighth notes:", "each note is an eighth note; the notes of one group are joined by a beam."],
              ["Numbers above:", "the left-hand finger, as in the tab."],
              ["Numbers in parentheses below:", "the string the note is played on: (6) is the 6th string, (5) the 5th."],
            ],
          ),
        )}

        <h3 className="mt-6 font-display text-[17px] font-semibold text-ink">{t("Nas duas", "In both")}</h3>
        {items(
          t(
            [
              ["Compassos:", "as linhas verticais separam os compassos: uma tríade por compasso. Na partitura, o 3 sobre 8 no começo quer dizer três colcheias por compasso."],
              ["Nota em laranja:", "a que está soando enquanto o exercício toca."],
            ],
            [
              ["Bars:", "the vertical lines separate the bars: one triad per bar. On the staff, the 3 over 8 at the start means three eighth notes per bar."],
              ["Orange note:", "the one sounding while the exercise plays."],
            ],
          ),
        )}
      </div>
    </dialog>
  );
}

/** Toggle icons: tablature = fret numbers; staff = an eighth note. */
function NotationIcon({ view }: { view: NotationView }) {
  return view === "tab" ? (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <text x={7.5} y={20} textAnchor="middle" fill="currentColor" style={{ font: "700 11px var(--font-mono)" }}>3</text>
      <text x={16.5} y={11} textAnchor="middle" fill="currentColor" style={{ font: "700 11px var(--font-mono)" }}>5</text>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <ellipse cx={10} cy={16.5} rx={3} ry={2.2} transform="rotate(-20 10 16.5)" fill="currentColor" />
      <line x1={12.7} x2={12.7} y1={16} y2={3} stroke="currentColor" strokeWidth={1.4} />
      <path d="M12.7 3 q 1 3.5 5 5.5" fill="none" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}

/** One bar (one triad, going up) for the examples of the help modal. */
function exampleStep(root: string, label: string, notes: ScaleStep["notes"]): { step: ScaleStep; items: Item[] } {
  const step: ScaleStep = {
    root,
    quality: "major",
    position: 1,
    mode: { pt: "", en: "" },
    notation: true,
    groups: [{ label, count: notes.length }],
    notes,
  };
  return { step, items: notes.map((_, index) => ({ index, order: index, label, newGroup: index === 0 })) };
}

type Callout = { label: string; side: "left" | "right"; y: number; to: [number, number] };

/**
 * A notation example with labelled arrows: the diagram sits in the middle of a
 * 560-wide drawing (scaled down on phones), the labels on both sides.
 */
function Annotated({ x, y, height, callouts, children }: { x: number; y: number; height: number; callouts: Callout[]; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 560 ${height}`} className="mt-4 block h-auto w-full" role="img" aria-hidden="true">
      <defs>
        <marker id="help-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 Z" className="fill-brand-ink" />
        </marker>
      </defs>
      <g transform={`translate(${x} ${y})`}>{children}</g>
      {callouts.map(({ label, side, y: labelY, to }) => {
        const textX = side === "left" ? 8 : 552;
        // Arrows start from a fixed column next to the labels (the longest label ends before it).
        const startX = side === "left" ? 162 : 398;
        return (
          <g key={label}>
            <text
              x={textX}
              y={labelY + 4}
              textAnchor={side === "left" ? "start" : "end"}
              className="fill-ink-2 text-[13px] font-semibold"
            >
              {label}
            </text>
            {/* A thin rule from the label to the arrow column, then the arrow to the element. */}
            <path
              d={`M${side === "left" ? 8 + label.length * 7.4 + 4 : 552 - label.length * 7.4 - 4} ${labelY} L${startX} ${labelY} L${to[0]} ${to[1]}`}
              className="fill-none stroke-brand-ink"
              strokeWidth={1.3}
              markerEnd="url(#help-arrow)"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** G major triad, root on the 6th string (fret 3), fingers 1-4-2: the same shape as the exercises. */
const EXAMPLE_NOTES: ScaleStep["notes"] = [
  { string: 0, fret: 3, finger: 1, degree: "1", pitch: "G2" },
  { string: 0, fret: 7, finger: 4, degree: "3", pitch: "B2" },
  { string: 1, fret: 5, finger: 2, degree: "5", pitch: "D3" },
];

function TabExample() {
  const { t } = useI18n();
  const { step, items } = exampleStep("C", "G", EXAMPLE_NOTES);
  // Tablature geometry (one line): strings from y 44 (1st) to 104 (6th); notes at x 53, 83, 113; end 137.
  const X = 212;
  const Y = 6;
  return (
    <Annotated
      x={X}
      y={Y}
      height={132}
      callouts={[
        { label: t("Nome da tríade", "Triad name"), side: "left", y: 14, to: [X + 37, Y + 12] },
        { label: t("Dedo", "Finger"), side: "left", y: 46, to: [X + 47, Y + 32] },
        { label: t("6ª corda (mi grave)", "6th string (low E)"), side: "left", y: 118, to: [X + 2, Y + 104] },
        { label: t("1ª corda (mi agudo)", "1st string (high E)"), side: "right", y: 30, to: [X + 130, Y + 44] },
        { label: t("Casa 5 na 5ª corda", "Fret 5, 5th string"), side: "right", y: 76, to: [X + 122, Y + 90] },
        { label: t("Barra de compasso", "Barline"), side: "right", y: 118, to: [X + 139, Y + 100] },
      ]}
    >
      <Tablature step={step} items={items} width={170} activeOrder={null} />
    </Annotated>
  );
}

function StaffExample() {
  const { t } = useI18n();
  const { step, items } = exampleStep("G", "G", EXAMPLE_NOTES);
  // Staff geometry (G major, one sharp): staff lines y 58–90; notes at x 95, 125, 155; strings at y 148.
  const X = 196;
  const Y = 4;
  return (
    <Annotated
      x={X}
      y={Y}
      height={172}
      callouts={[
        { label: t("Clave de sol com 8", "Treble clef with 8"), side: "left", y: 40, to: [X + 16, Y + 62] },
        { label: t("Armadura (tom de G)", "Key signature (G)"), side: "left", y: 92, to: [X + 41, Y + 60] },
        { label: t("Compasso 3/8", "Time: 3/8"), side: "left", y: 140, to: [X + 62, Y + 88] },
        { label: t("Nome da tríade", "Triad name"), side: "right", y: 12, to: [X + 88, Y + 10] },
        { label: t("Dedo", "Finger"), side: "right", y: 40, to: [X + 162, Y + 30] },
        { label: t("Nota (colcheia)", "Note (eighth)"), side: "right", y: 96, to: [X + 162, Y + 95] },
        { label: t("Corda", "String"), side: "right", y: 150, to: [X + 172, Y + 148] },
      ]}
    >
      <Staff step={step} items={items} width={190} activeOrder={null} />
    </Annotated>
  );
}

type ViewProps = {
  step: ScaleStep;
  items: Item[];
  width: number;
  activeOrder: number | null;
  /** Centre the score in `width` (the exercise card); the help examples stay left-aligned for their arrows. */
  center?: boolean;
};

/** Left offset that centres the widest line of the score in `width`. */
function centring(rows: Item[][][], width: number, prefix: (row: number) => number) {
  const widest = Math.max(...rows.map((groups, row) => placeLine(groups, prefix(row)).at(-1)!.at(-1)!.x + NOTE / 2 + GROUP_GAP / 2));
  return Math.max(0, Math.floor((width - widest) / 2));
}

const activeClass = (on: boolean) => (on ? "fill-accent" : "fill-ink");

function ChordLabels({ placed, y }: { placed: Array<Array<{ item: Item; x: number }>>; y: number }) {
  const { lang } = useI18n();
  return placed.map((group) =>
    group[0].item.label ? (
      <text
        key={`c${group[0].item.order}`}
        x={group[0].x - NOTE / 2 + 2}
        y={y}
        className="fill-brand-ink font-display text-[14px] font-bold"
      >
        {chordName(group[0].item.label, lang)}
      </text>
    ) : null,
  );
}

/** Barline after each bar but the last of the line (the line ends with its own barline). */
function Barlines({ placed, top, bottom }: { placed: Array<Array<{ item: Item; x: number }>>; top: number; bottom: number }) {
  return placed.slice(0, -1).map((group) => {
    const x = group.at(-1)!.x + NOTE / 2 + GROUP_GAP / 2 - 2;
    return <line key={`b${group[0].item.order}`} x1={x} x2={x} y1={top} y2={bottom} className="stroke-ink" strokeWidth={1} />;
  });
}

/** "3 over 8" (triads) or "4 over 8" (seventh chords), centred on the staff (or the tab) between `top` and `bottom`. */
function TimeSignature({ x, top, bottom, size, beats }: { x: number; top: number; bottom: number; size: number; beats: number }) {
  const middle = (top + bottom) / 2;
  return (
    <g className="fill-ink font-display font-bold" style={{ fontSize: size }}>
      <text x={x} y={middle - 1} textAnchor="middle">
        {beats}
      </text>
      <text x={x} y={middle + size * 0.72} textAnchor="middle">
        {BEAT_UNIT}
      </text>
    </g>
  );
}

function Tablature({ step, items, width, activeOrder, center = false }: ViewProps) {
  // No time signature on the tab (the user's choice); the barlines stay.
  const rows = lines(items, width, TAB_PREFIX);
  const lineHeight = 44 + STRING_SPACE * 5 + 14 + ROW_GAP;
  return (
    <svg width={width} height={rows.length * lineHeight - ROW_GAP} className="block" role="img" aria-label="Tablatura">
      {rows.map((groups, row) => {
        const offset = center ? centring(rows, width, () => TAB_PREFIX) : 0;
        const top = row * lineHeight + 44;
        const bottom = top + STRING_SPACE * 5;
        const placed = placeLine(groups, TAB_PREFIX);
        const end = placed.at(-1)!.at(-1)!.x + NOTE / 2 + GROUP_GAP / 2;
        // String 0 (low E) is the bottom line.
        const stringY = (string: number) => bottom - string * STRING_SPACE;
        return (
          <g key={row} transform={`translate(${offset} 0)`}>
            <ChordLabels placed={placed} y={top - 28} />
            {[0, 1, 2, 3, 4, 5].map((string) => (
              <line key={string} x1={0} x2={end} y1={stringY(string)} y2={stringY(string)} className="stroke-line-strong" />
            ))}
            <line x1={0} x2={0} y1={top} y2={bottom} className="stroke-ink" strokeWidth={1.5} />
            <line x1={end} x2={end} y1={top} y2={bottom} className="stroke-ink" strokeWidth={1.5} />
            <Barlines placed={placed} top={top} bottom={bottom} />
            {["T", "A", "B"].map((letter, n) => (
              <text
                key={letter}
                x={14}
                y={top + 14 + n * 18}
                textAnchor="middle"
                className="fill-ink font-display text-[15px] font-bold"
              >
                {letter}
              </text>
            ))}
            {placed.flat().map(({ item, x }) => {
              const note = step.notes[item.index];
              const on = item.order === activeOrder;
              const y = stringY(note.string);
              return (
                <g key={item.order}>
                  <rect x={x - 11} y={y - 8} width={22} height={16} className="fill-surface" />
                  <text x={x} y={y + 5} textAnchor="middle" className={`${activeClass(on)} font-mono text-[14px] font-bold`}>
                    {note.fret}
                  </text>
                  {note.finger && (
                    <text x={x} y={top - 9} textAnchor="middle" className={`${on ? "fill-accent" : "fill-muted"} font-mono text-[13px] font-semibold`}>
                      {note.finger}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function Staff({ step, items, width, activeOrder, center = false }: ViewProps) {
  const signature = keySignature(step.signature ?? step.root);
  const prefix = 40 + signature.count * 10 + 8;
  const rows = lines(items, width, prefix, TIME_SIGNATURE);
  // Room above the staff grows with the highest note: its beam must clear the fingers and the chord names.
  const highest = Math.max(BOTTOM_LINE, ...step.notes.map((note) => (note.pitch ? (parsePitch(note.pitch)?.position ?? 0) + 7 : 0)));
  const beamTop = STAFF_SPACE * 4 - ((highest - BOTTOM_LINE) * STAFF_SPACE) / 2 - 26;
  const fingerY = Math.min(-26, beamTop - 12);
  const chordY = fingerY - 20;
  const head = 12 - chordY;
  const lineHeight = head + STAFF_SPACE * 4 + 76 + ROW_GAP;
  return (
    <svg width={width} height={rows.length * lineHeight - ROW_GAP} className="block" role="img" aria-label="Partitura">
      {rows.map((groups, row) => {
        const offset = center ? centring(rows, width, (line) => prefix + (line === 0 ? TIME_SIGNATURE : 0)) : 0;
        const top = row * lineHeight + head;
        const bottom = top + STAFF_SPACE * 4;
        const placed = placeLine(groups, prefix + (row === 0 ? TIME_SIGNATURE : 0));
        const end = placed.at(-1)!.at(-1)!.x + NOTE / 2 + GROUP_GAP / 2;
        const yOf = (position: number) => bottom - ((position - BOTTOM_LINE) * STAFF_SPACE) / 2;
        return (
          <g key={row} transform={`translate(${offset} 0)`}>
            <ChordLabels placed={placed} y={top + chordY} />
            {[0, 1, 2, 3, 4].map((line) => (
              <line key={line} x1={0} x2={end} y1={top + line * STAFF_SPACE} y2={top + line * STAFF_SPACE} className="stroke-line-strong" />
            ))}
            <line x1={0} x2={0} y1={top} y2={bottom} className="stroke-ink" strokeWidth={1.5} />
            <line x1={end} x2={end} y1={top} y2={bottom} className="stroke-ink" strokeWidth={1.5} />
            <Barlines placed={placed} top={top} bottom={bottom} />
            {row === 0 && <TimeSignature x={prefix + 4} top={top} bottom={bottom} size={19} beats={step.groups?.[0]?.count ?? 3} />}
            {/* Treble clef with an 8 below: guitar sounds an octave lower than written. */}
            <text x={4} y={bottom - STAFF_SPACE} className="fill-ink" style={{ fontFamily: '"Noto Music", "Apple Symbols", "Segoe UI Symbol", serif', fontSize: 46 }}>
              {"\u{1D11E}"}
            </text>
            <text x={15} y={bottom + 22} className="fill-ink font-display text-[10px] font-bold">
              8
            </text>
            {[...signature.letters].map((letter, n) => (
              <text
                key={letter}
                x={40 + n * 10}
                y={yOf(signature.spots[n]) + (signature.sign === "♭" ? 3 : 5)}
                className="fill-ink text-[17px]"
                style={{ fontFamily: "Accidentals, serif" }}
              >
                {signature.sign}
              </text>
            ))}
            {groups.map((group, g) => {
              const notes = placed[g].map(({ item, x }) => {
                const note = step.notes[item.index];
                const pitch = note.pitch ? parsePitch(note.pitch) : null;
                return { item, x, note, pitch, y: pitch ? yOf(pitch.position + 7) : bottom };
              });
              // Stems up, joined by one beam per chord group (eighth notes).
              const beamY = Math.min(...notes.map((n) => n.y)) - 26;
              return (
                <g key={g}>
                  {notes.map(({ item, x, note, pitch, y }) => {
                    const on = item.order === activeOrder;
                    const position = pitch ? pitch.position + 7 : BOTTOM_LINE;
                    const ledgers: number[] = [];
                    for (let p = BOTTOM_LINE - 2; p >= position; p -= 2) ledgers.push(p);
                    for (let p = BOTTOM_LINE + 10; p <= position; p += 2) ledgers.push(p);
                    const inKey = pitch && signature.letters.includes(pitch.letter) ? signature.sign : "";
                    const accidental = pitch && pitch.accidental !== inKey ? pitch.accidental || "♮" : "";
                    return (
                      <g key={item.order}>
                        {ledgers.map((p) => (
                          <line key={p} x1={x - 10} x2={x + 10} y1={yOf(p)} y2={yOf(p)} className="stroke-ink" />
                        ))}
                        {accidental && (
                          <text x={x - 17} y={y + 5} className="fill-ink text-[15px]" style={{ fontFamily: "Accidentals, serif" }}>
                            {accidental}
                          </text>
                        )}
                        <ellipse cx={x} cy={y} rx={5.4} ry={4} transform={`rotate(-20 ${x} ${y})`} className={activeClass(on)} />
                        <line x1={x + 4.8} x2={x + 4.8} y1={y - 1} y2={beamY} className={on ? "stroke-accent" : "stroke-ink"} strokeWidth={1.3} />
                        {note.finger && (
                          <text x={x} y={top + fingerY} textAnchor="middle" className={`${on ? "fill-accent" : "fill-muted"} font-mono text-[13px] font-semibold`}>
                            {note.finger}
                          </text>
                        )}
                        <text x={x} y={bottom + 58} textAnchor="middle" className={`${on ? "fill-accent" : "fill-muted"} font-mono text-[12px] font-semibold`}>
                          ({6 - note.string})
                        </text>
                      </g>
                    );
                  })}
                  {notes.length > 1 ? (
                    <rect
                      x={notes[0].x + 4.8 - 0.65}
                      y={beamY - 1}
                      width={notes.at(-1)!.x - notes[0].x + 1.3}
                      height={4.5}
                      className="fill-ink"
                    />
                  ) : (
                    <path d={`M${notes[0].x + 4.8} ${beamY} q 3 8 9 12`} className="fill-none stroke-ink" strokeWidth={1.5} />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
