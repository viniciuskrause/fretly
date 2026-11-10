import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
  barreSpans,
  chordLabel,
  soundingStrings,
  stringFrequency,
  type ChordPosition,
  type ChordStep,
} from "./chords.ts";
import { lessons, type Lesson } from "./lessons.ts";

function Icon({
  name,
  className = "size-5",
}: {
  name:
    | "home"
    | "path"
    | "practice"
    | "profile"
    | "fire"
    | "book"
    | "play"
    | "check"
    | "lock"
    | "headphones"
    | "heart"
    | "target"
    | "close"
    | "back"
    | "replay"
    | "metronome"
    | "trophy";
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    path: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18c6 0 2-12 8-12" />
      </>
    ),
    practice: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    fire: (
      <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-1 4-3 5 0-4-2-7-2-7-3 4-4 7-4 10 0 5 3 8 7 8Z" />
    ),
    book: (
      <>
        <path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z" />
        <path d="M4 5v17M8 6h8M8 10h6" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    headphones: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1Zm16 0h-3v6h2a1 1 0 0 0 1-1Z" />
      </>
    ),
    heart: (
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="m15 9 6-6M17 3h4v4" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h10" />
      </>
    ),
    replay: (
      <>
        <path d="M20 12a8 8 0 1 1-2.3-5.7L20 9" />
        <path d="M20 4v5h-5" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v6a4 4 0 0 1-8 0Z" />
        <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8" />
      </>
    ),
    metronome: (
      <>
        <path d="M8 3h8l4 18H4Z" />
        <path d="m12 16 3-9M8 17h8" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-11 rotate-[-5deg] items-center justify-center rounded-[14px] bg-[#ff6b45] text-white shadow-[0_4px_0_#c94225]">
        <Icon name="practice" className="size-6" />
      </div>
      <div>
        <p className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[#182b2a]">
          Fretly
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#80918d]">
          guitar lab
        </p>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#e3e9e5]/90 bg-[#f7f8f3]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[720px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <button
          className="flex size-9 items-center justify-center rounded-full bg-[#efe4d0] text-xs font-black text-[#705538] ring-2 ring-white shadow-sm"
          aria-label="Abrir perfil"
        >
          RL
        </button>
      </div>
    </header>
  );
}

const ORDINALS: Record<string, string> = {
  primeira: "1ª",
  segunda: "2ª",
  terceira: "3ª",
  quarta: "4ª",
  quinta: "5ª",
};

function trailPosition(lesson: Lesson) {
  const match = lesson.title.toLowerCase().match(/(primeira|segunda|terceira|quarta|quinta|[1-5]ª) posição/);
  if (!match) return null;
  return ORDINALS[match[1]] ?? match[1];
}

/** Trail label: "Acordes maiores / 1ª posição", plus "todos os tons" on the all-keys lessons. */
function trailLabel(lesson: Lesson) {
  const position = trailPosition(lesson);
  if (!position) return lesson.title;
  const title = lesson.title.toLowerCase();
  const group = title.includes("menores") ? "Acordes menores" : "Acordes maiores";
  return (
    <>
      <span className="block whitespace-nowrap">{group}</span>
      <span className="block whitespace-nowrap">{position} posição</span>
      {title.includes("todos os tons") && <span className="block whitespace-nowrap">todos os tons</span>}
    </>
  );
}

function trailPositionNumber(lesson: Lesson) {
  return trailPosition(lesson)?.replace("ª", "") ?? "";
}

type TrailStatus = Lesson["status"];

type TrailPoint = { x: number; y: number };

// Serpentine layout: rows run left → right, then right → left, joined by
// half-circle turns outside the last node of each row.
function trailLayout(width: number, count: number) {
  const columns = width >= 520 ? 4 : 3;
  const radius = width >= 520 ? 74 : 72;
  const top = 76;
  const minX = radius + 6;
  const maxX = width - radius - 6;
  const spacing = (maxX - minX) / (columns - 1);
  const points: TrailPoint[] = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = row % 2 === 0 ? minX + column * spacing : maxX - column * spacing;
    return { x, y: top + row * radius * 2 };
  });
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    if (point.y === previous.y) return `M${previous.x} ${previous.y} L${point.x} ${point.y}`;
    const turnsRight = previous.x > width / 2;
    return `M${previous.x} ${previous.y} A${radius} ${radius} 0 0 ${turnsRight ? 1 : 0} ${point.x} ${point.y}`;
  });
  const rows = Math.ceil(count / columns);
  return { points, segments, height: top + (rows - 1) * radius * 2 + 82 };
}

function TrailNodeIcon({ lesson }: { lesson: Lesson }) {
  if (lesson.status === "locked") return <Icon name="lock" className="size-6" />;
  if (lesson.type === "review") return <Icon name="replay" className="size-7" />;
  return <span className="text-[26px] font-black leading-none">{trailPositionNumber(lesson)}</span>;
}

function TrailNode({
  lesson,
  point,
  onSelect,
}: {
  lesson: Lesson;
  point: TrailPoint;
  onSelect: (lesson: Lesson) => void;
}) {
  const status = lesson.status;
  return (
    <div
      className="absolute flex w-[112px] -translate-x-1/2 -translate-y-[34px] flex-col items-center"
      style={{ left: point.x, top: point.y }}
    >
      <button
        className={`trail-node trail-node--${status}`}
        onClick={() => onSelect(lesson)}
        aria-label={`${lesson.title}: ${lesson.subtitle}${status === "locked" ? " (bloqueada)" : ""}`}
      >
        {status === "current" && (
          <svg className="trail-node__progress" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" />
          </svg>
        )}
        <span className="trail-node__face">
          <TrailNodeIcon lesson={lesson} />
        </span>
        {status === "done" && (
          <span className="trail-node__badge">
            <Icon name="check" className="size-3" />
          </span>
        )}
      </button>
      <p className={`trail-label trail-label--${status}`}>{trailLabel(lesson)}</p>
    </div>
  );
}

function TrailTrophy({ point, status }: { point: TrailPoint; status: TrailStatus }) {
  return (
    <div
      className="absolute flex w-[112px] -translate-x-1/2 -translate-y-[36px] flex-col items-center"
      style={{ left: point.x, top: point.y }}
    >
      <div className={`trail-trophy trail-trophy--${status}`} aria-hidden="true">
        <span className="trail-trophy__face">
          <Icon name="trophy" className="size-7" />
        </span>
      </div>
      <p className={`trail-label trail-label--${status} whitespace-nowrap`}>Unidade completa</p>
    </div>
  );
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

function Trail({ onSelect }: { onSelect: (lesson: Lesson) => void }) {
  const { ref, width } = useElementWidth();
  const allDone = lessons.every((lesson) => lesson.status === "done");
  const statuses: TrailStatus[] = [...lessons.map((lesson) => lesson.status), allDone ? "done" : "locked"];
  const layout = width ? trailLayout(width, statuses.length) : null;
  return (
    <div ref={ref} className="relative mt-10" style={{ height: layout?.height ?? 400 }}>
      <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#203330]">
        Fundamentos
      </p>
      {layout && (
        <>
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {layout.segments.map((segment, index) => (
              <path
                key={index}
                d={segment}
                stroke={statuses[index + 1] === "locked" ? "#dbe2de" : "#1f9a7a"}
              />
            ))}
          </svg>
          {lessons.map((lesson, index) => (
            <TrailNode key={lesson.id} lesson={lesson} point={layout.points[index]} onSelect={onSelect} />
          ))}
          <TrailTrophy point={layout.points[lessons.length]} status={statuses[lessons.length]} />
        </>
      )}
    </div>
  );
}

function PathSection({ onSelect }: { onSelect: (lesson: Lesson) => void }) {
  const doneShare = lessons.filter((lesson) => lesson.status === "done").length / lessons.length;
  return (
    <section>
      <div className="overflow-hidden rounded-[26px] bg-[#157b67] text-white shadow-[0_7px_0_#0d5b4b]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9ee9d1]">
              Seção 1 • {lessons.length} exercícios
            </p>
            <h2 className="mt-2 text-[25px] font-black tracking-[-0.03em]">
              Acordes Básicos no CAGED
            </h2>
            <p className="mt-1 text-sm text-white/75">
              Faça qualquer acorde em qualquer tonalidade em qualquer lugar do braço
            </p>
          </div>
          <button
            onClick={() =>
              onSelect(lessons.find((lesson) => lesson.status === "current") ?? lessons[0])
            }
            className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-xs font-black text-[#126a59] shadow-[0_4px_0_#b5d9ce] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#b5d9ce] active:translate-y-1 active:shadow-none"
          >
            <Icon name="book" className="size-4" /> GUIA
          </button>
        </div>
        <div className="h-1.5 bg-[#0b6654]">
          <div
            className="h-full rounded-r-full bg-[#75e0bd]"
            style={{ width: `${doneShare * 100}%` }}
          />
        </div>
      </div>

      <Trail onSelect={onSelect} />
    </section>
  );
}

const TONE_DURATION = 1.6;

type ScheduledEvent = {
  beat: number;
  notes: Array<{ frequency: number; volume: number }>;
  onPlay: () => void;
};

/** Every sounding string of the chord, struck together. */
function chordNotes(position: ChordPosition) {
  return soundingStrings(position).map((string) => ({
    frequency: stringFrequency(position, string)!,
    volume: position.frets[string] === 0 ? 0.065 : 0.075,
  }));
}

// Diagram geometry: strings run low E (bottom row) → high E (top row); columns are
// frets baseFret … baseFret + 4. The nut is drawn when baseFret is 1, otherwise the
// base fret number sits under the first column.
const DIAGRAM_COLUMN_WIDTH = 40.4;
const diagramRowY = (string: number) => 48 + (5 - string) * 29;
const diagramColumnX = (fret: number) => 56 + (fret - 0.5) * DIAGRAM_COLUMN_WIDTH;

/** Big chord symbol ("D"); the shape is only named in the exercise title. */
function ChordName({ step, className }: { step: ChordStep; className: string }) {
  return (
    <p className={`font-black tracking-[-0.055em] text-[#183e39] ${className}`}>{step.chord}</p>
  );
}

function ChordDiagram({
  step,
  activeStrings,
}: {
  step: ChordStep;
  activeStrings: number[];
}) {
  const { position } = step;
  const barres = barreSpans(position);
  const barreStrings = new Set(barres.flatMap((barre) => barre.strings));
  return (
    <svg
      width="300"
      height="250"
      viewBox="0 0 300 250"
      fill="none"
      className="block max-w-full"
      aria-label={`Diagrama de ${chordLabel(step)}`}
      role="img"
    >
      <rect x="28" y="18" width="244" height="206" rx="16" fill="#FCFDF9" />
      {[0, 1, 2, 3, 4, 5].map((string) => {
        const isActive = activeStrings.includes(string);
        return (
          <g key={`string-${string}`}>
            <line
              x1="56"
              y1={diagramRowY(string)}
              x2="258"
              y2={diagramRowY(string)}
              stroke={isActive ? "#FF6B45" : "#85938F"}
              strokeWidth={isActive ? 4 : string === 5 ? 1.3 : 1}
              className="transition-all duration-150"
            />
            {position.frets[string] === 0 && isActive && (
              <circle
                cx="42"
                cy={diagramRowY(string)}
                r="7"
                fill="none"
                stroke="#FF6B45"
                strokeWidth="3"
              />
            )}
          </g>
        );
      })}
      {[0, 1, 2, 3, 4, 5].map((line) => (
        <line
          key={`fret-${line}`}
          x1={56 + line * DIAGRAM_COLUMN_WIDTH}
          y1="48"
          x2={56 + line * DIAGRAM_COLUMN_WIDTH}
          y2="193"
          stroke="#64736F"
          strokeWidth={line === 0 && position.baseFret === 1 ? 6 : 1.4}
        />
      ))}
      {position.baseFret > 1 && (
        <text
          x={diagramColumnX(1)}
          y="215"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="#64736F"
          aria-label={`${position.baseFret}ª casa`}
        >
          {position.baseFret}
        </text>
      )}
      {barres.map((barre) => {
        const isActive = barre.strings.some((string) => activeStrings.includes(string));
        return (
          <line
            key={`barre-${barre.fret}`}
            x1={diagramColumnX(barre.fret)}
            y1={diagramRowY(barre.from)}
            x2={diagramColumnX(barre.fret)}
            y2={diagramRowY(barre.to)}
            stroke={isActive ? "#FF6B45" : "#183E39"}
            strokeWidth="18"
            strokeLinecap="round"
            className="transition-all duration-150"
            aria-label={`Pestana na ${position.baseFret + barre.fret - 1}ª casa, cordas ${6 - barre.to} a ${6 - barre.from}`}
          />
        );
      })}
      {position.frets.map((fret, string) => {
        if (fret <= 0 || barreStrings.has(string)) return null;
        const isActive = activeStrings.includes(string);
        const cx = diagramColumnX(fret);
        const cy = diagramRowY(string);
        const finger = position.fingers[string];
        return (
          <g key={`note-${string}`}>
            <circle
              cx={cx}
              cy={cy}
              r={isActive ? 13 : 10}
              fill={isActive ? "#FF6B45" : "#183E39"}
              className="transition-all duration-150"
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="white"
              aria-label={`Dedo ${finger}`}
            >
              {finger}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type IconName = Parameters<typeof Icon>[0]["name"];

function ExerciseShell({
  progress,
  onExit,
  footer,
  footerCenter,
  children,
}: {
  progress: number;
  onExit: () => void;
  footer: ReactNode;
  /** Centred in the bottom bar (on its own row above the buttons on narrow screens). */
  footerCenter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f8f3] text-[#203330]">
      <header className="mx-auto flex w-full max-w-[1040px] items-center gap-4 px-4 pt-5 sm:gap-6 sm:px-10 sm:pt-12">
        <button
          onClick={onExit}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#8a9a96] transition hover:bg-[#edf2ef] hover:text-[#4f615c]"
          aria-label="Voltar à trilha"
        >
          <Icon name="close" className="size-6" />
        </button>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-[#dfe6e2]"
          role="progressbar"
          aria-label="Progresso do exercício"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-[#4fbf9d] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="sticky bottom-0 border-t-2 border-[#e3e9e5] bg-[#f7f8f3]">
        <div className="relative mx-auto w-full max-w-[1040px] px-4 py-4 sm:px-10 sm:py-8">
          {footerCenter && (
            <div className="mb-3 flex justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:mb-0 lg:-translate-x-1/2 lg:-translate-y-1/2">
              {footerCenter}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">{footer}</div>
        </div>
      </footer>
    </div>
  );
}

function ExerciseHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e75e3a]">{eyebrow}</p>
      <h1 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.035em] text-[#18302d]">
        {title}
      </h1>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: IconName;
};

function SecondaryButton({ label, onClick, disabled, icon }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-[#d6dfdb] bg-white px-4 text-sm font-black uppercase tracking-[0.08em] text-[#60716c] transition hover:bg-[#f3f6f4] active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[150px] sm:px-6"
    >
      {icon && <Icon name={icon} className="size-5" />}
      <span className={icon ? "hidden sm:inline" : undefined}>{label}</span>
    </button>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
  icon,
  tone = "green",
}: ActionButtonProps & { tone?: "green" | "orange" }) {
  const toneClass =
    tone === "orange"
      ? "bg-[#ff6b45] shadow-[0_4px_0_#ca4728]"
      : "bg-[#157b67] shadow-[0_4px_0_#0b5b4b]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 min-w-[130px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black uppercase tracking-[0.08em] text-white transition active:translate-y-1 active:shadow-none disabled:cursor-wait disabled:opacity-75 sm:min-w-[150px] ${toneClass}`}
    >
      {icon && <Icon name={icon} className="size-5 fill-current" />}
      {label}
    </button>
  );
}

function BpmControl({
  bpm,
  onChange,
  disabled,
}: {
  bpm: number;
  onChange: (update: (value: number) => number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-[#e0e7e3]" role="group" aria-label={`Andamento: ${bpm} BPM`}>
      <div className="flex items-center px-2 text-[#61736e]" title="BPM">
        <Icon name="metronome" className="size-5" />
      </div>
      <button
        onClick={() => onChange((value) => Math.max(40, value - 4))}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f] disabled:opacity-40"
        aria-label="Diminuir BPM"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-black text-[#183e39]">{bpm}</span>
      <button
        onClick={() => onChange((value) => Math.min(180, value + 4))}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ef] font-black text-[#52645f] disabled:opacity-40"
        aria-label="Aumentar BPM"
      >
        +
      </button>
    </div>
  );
}

function ExercisePage({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [bpm, setBpm] = useState(72);
  const [playbackStatus, setPlaybackStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [activeStrings, setActiveStrings] = useState<number[]>([]);
  const [finalExercise, setFinalExercise] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequenceStatus, setSequenceStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [complete, setComplete] = useState(false);
  const timeoutIds = useRef<number[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const scheduledSources = useRef<Array<{ source: AudioBufferSourceNode; startAt: number }>>([]);
  const step = lesson.steps[stepIndex];
  const progress = complete || finalExercise ? 100 : ((stepIndex + 1) / lesson.steps.length) * 100;

  // Cancels pending UI updates, the scheduler loop and every note that hasn't
  // started yet. Notes already sounding keep ringing naturally.
  function clearPlayback() {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];
    const context = audioContext.current;
    scheduledSources.current.forEach(({ source, startAt }) => {
      if (context && startAt > context.currentTime) source.stop();
    });
    scheduledSources.current = [];
  }

  useEffect(() => {
    return () => {
      clearPlayback();
      if (audioContext.current) void audioContext.current.close();
    };
  }, []);

  function getAudioContext() {
    if (!audioContext.current) audioContext.current = new AudioContext();
    return audioContext.current;
  }

  // Wait until audio output is actually running before scheduling notes, so the
  // first note of a sequence (the 6th string on G and E shapes) is not swallowed.
  async function prepareAudio() {
    const isNew = !audioContext.current;
    const context = getAudioContext();
    if (context.state !== "running") await context.resume();
    if (isNew) await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  // Nylon-string guitar via plucked-string synthesis (Karplus–Strong). It keeps
  // enough upper harmonics for low notes such as G2 (98 Hz) to stay audible on
  // laptop and phone speakers, while the soft "fingertip" pluck, the darker
  // string damping and the final low-pass give it a warm nylon timbre.
  function createPluckBuffer(context: AudioContext, frequency: number) {
    const { sampleRate } = context;
    const buffer = context.createBuffer(1, Math.floor(sampleRate * TONE_DURATION), sampleRate);
    const data = buffer.getChannelData(0);
    // The 3-tap loop filter below adds one sample of delay per loop.
    const period = Math.max(3, Math.round(sampleRate / frequency - 1));

    // Fingertip pluck: smoothed noise (no pick click), plucked ~1/5 from the bridge.
    const excitation = new Float32Array(period);
    for (let i = 0; i < period; i++) excitation[i] = Math.random() * 2 - 1;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < period; i++) excitation[i] = 0.5 * excitation[i] + 0.5 * excitation[i - 1];
    }
    const pluckOffset = Math.max(1, Math.round(period * 0.2));
    for (let i = 0; i < period; i++) {
      data[i] = excitation[i] - (i >= pluckOffset ? excitation[i - pluckOffset] : 0);
    }

    // String loop: a 3-tap average damps the highs faster, like nylon.
    for (let i = period; i < data.length; i++) {
      const a = data[i - period];
      const b = i - period - 1 >= 0 ? data[i - period - 1] : 0;
      const c = i - period - 2 >= 0 ? data[i - period - 2] : 0;
      data[i] = 0.997 * (0.25 * a + 0.5 * b + 0.25 * c);
    }
    return buffer;
  }

  // Schedules one note at an exact time on the audio clock (sample-accurate,
  // independent of what the main thread is doing).
  function scheduleTone(context: AudioContext, frequency: number, volume: number, when: number) {
    const source = context.createBufferSource();
    source.buffer = createPluckBuffer(context, frequency);
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    tone.Q.value = 0.5;
    const output = context.createGain();
    output.gain.setValueAtTime(0, when);
    output.gain.linearRampToValueAtTime(volume * 2.2, when + 0.004);
    output.gain.setTargetAtTime(0, when + 1.1, 0.08);
    source.connect(tone);
    tone.connect(output);
    output.connect(context.destination);
    source.start(when);
    source.stop(when + TONE_DURATION);
    scheduledSources.current.push({ source, startAt: when });
  }

  // Runs a UI update when a note scheduled at `when` actually reaches the speakers.
  function atAudioTime(context: AudioContext, when: number, update: () => void) {
    const latency = context.outputLatency || 0;
    const delay = Math.max(0, (when - context.currentTime + latency) * 1000);
    timeoutIds.current.push(window.setTimeout(update, delay));
  }

  // Look-ahead scheduler: a timer wakes every 25 ms and hands the audio clock any
  // note due in the next 250 ms, so main-thread hiccups never shift the rhythm.
  function runSchedule(events: ScheduledEvent[], endBeat: number, onDone: () => void) {
    const context = getAudioContext();
    const beat = 60 / bpm;
    const startAt = context.currentTime + 0.1;
    let next = 0;
    const pump = () => {
      const horizon = context.currentTime + 0.25;
      while (next < events.length && startAt + events[next].beat * beat < horizon) {
        const event = events[next++];
        const when = startAt + event.beat * beat;
        event.notes.forEach(({ frequency, volume }) => scheduleTone(context, frequency, volume, when));
        atAudioTime(context, when, event.onPlay);
      }
      if (next < events.length) {
        timeoutIds.current.push(window.setTimeout(pump, 25));
      } else {
        atAudioTime(context, startAt + endBeat * beat, onDone);
      }
    };
    pump();
  }

  async function startPlayback() {
    clearPlayback();
    setPlaybackStatus("playing");
    setActiveStrings([]);
    await prepareAudio();

    const { position } = step;
    // Every sounding string, fretted or open, from the lowest up to the 1st.
    const bottomToTop = soundingStrings(position);

    const events: ScheduledEvent[] = bottomToTop.map((string, index) => ({
      beat: index,
      notes: [{ frequency: stringFrequency(position, string)!, volume: 0.16 }],
      onPlay: () => setActiveStrings([string]),
    }));
    events.push({
      beat: bottomToTop.length,
      notes: chordNotes(position),
      onPlay: () => setActiveStrings(bottomToTop),
    });

    runSchedule(events, bottomToTop.length + 1, () => setPlaybackStatus("finished"));
  }

  function resetPlayback() {
    clearPlayback();
    setPlaybackStatus("idle");
    setActiveStrings([]);
  }

  function nextStep() {
    resetPlayback();
    if (stepIndex === lesson.steps.length - 1) {
      setFinalExercise(true);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function resetSequence() {
    clearPlayback();
    setSequenceIndex(0);
    setSequenceStatus("idle");
  }

  async function startChordSequence() {
    clearPlayback();
    setSequenceIndex(0);
    setSequenceStatus("playing");
    await prepareAudio();

    const events: ScheduledEvent[] = lesson.steps.map((chordStep, index) => ({
      beat: index,
      notes: chordNotes(chordStep.position),
      onPlay: () => setSequenceIndex(index),
    }));
    runSchedule(events, lesson.steps.length, () => setSequenceStatus("finished"));
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-[#f7f8f3]">
        <TopBar />
        <div className="mx-auto w-full max-w-[560px] px-5 py-16 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#4fbf9d] text-white shadow-[0_9px_0_#2f8d72]">
            <Icon name="check" className="size-12" />
          </div>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#e75e3a]">
            Exercício concluído
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#18302d]">
            {lesson.exerciseTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#71817d]">
            Você percorreu todas as formas desta etapa. Faça a revisão todos os dias para manter a
            forma dos exercícios que você já aprendeu.
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#e0e7e3]">
              <p className="text-2xl font-black text-[#ef6a44]">{lesson.steps.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#8b9995]">
                Formas tocadas
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-8 w-full max-w-sm rounded-2xl bg-[#157b67] py-4 text-sm font-black text-white shadow-[0_5px_0_#0b5b4b] transition active:translate-y-1 active:shadow-none"
          >
            VOLTAR À TRILHA
          </button>
        </div>
      </div>
    );
  }

  const bpmControl = (
    <BpmControl
      bpm={bpm}
      onChange={setBpm}
      disabled={playbackStatus === "playing" || sequenceStatus === "playing"}
    />
  );

  if (finalExercise) {
    const isPlaying = sequenceStatus === "playing";
    return (
      <ExerciseShell
        progress={100}
        onExit={onExit}
        footerCenter={bpmControl}
        footer={
          <>
            <SecondaryButton
              label="Voltar"
              icon="back"
              disabled={isPlaying}
              onClick={() => {
                resetSequence();
                setFinalExercise(false);
              }}
            />
            <div className="flex gap-3">
              {sequenceStatus === "finished" ? (
                <>
                  <SecondaryButton label="Repetir" icon="replay" onClick={startChordSequence} />
                  <PrimaryButton label="Concluir" onClick={() => setComplete(true)} />
                </>
              ) : (
                <PrimaryButton
                  label={isPlaying ? "Tocando" : "Iniciar"}
                  icon="play"
                  tone="orange"
                  disabled={isPlaying}
                  onClick={startChordSequence}
                />
              )}
            </div>
          </>
        }
      >
        <ExerciseHeading eyebrow={lesson.exerciseTitle} title="Sequência completa" />

        <div className="relative -mx-4 mt-6 min-h-[420px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] sm:-mx-32">
          {lesson.steps.map((chordStep, index) => {
            const offset = index - sequenceIndex;
            const isCurrent = offset === 0;
            const cardPosition =
              offset < -1
                ? "past-hidden"
                : offset === -1
                  ? "played"
                  : isCurrent
                    ? sequenceStatus === "finished"
                      ? "complete"
                      : "current"
                    : offset === 1
                      ? "next"
                      : "future-hidden";
            const isSounding = isCurrent && sequenceStatus === "playing";

            return (
              <div
                key={`${chordStep.chord}-${index}`}
                className={`sequence-chord-card sequence-chord-card--${cardPosition} ${
                  isSounding ? "sequence-chord-card--sounding" : ""
                }`}
                style={{
                  transitionDuration: `${Math.min((60000 / bpm) * 0.58, 760)}ms`,
                }}
              >
                <ChordName step={chordStep} className="text-5xl" />
                <ChordDiagram
                  step={chordStep}
                  activeStrings={isSounding ? soundingStrings(chordStep.position) : []}
                />
              </div>
            );
          })}
        </div>

      </ExerciseShell>
    );
  }

  const isPlaying = playbackStatus === "playing";
  return (
    <ExerciseShell
      progress={progress}
      onExit={onExit}
      footerCenter={bpmControl}
      footer={
        <>
          <SecondaryButton
            label="Anterior"
            icon="back"
            disabled={stepIndex === 0 || isPlaying}
            onClick={() => {
              resetPlayback();
              setStepIndex((current) => Math.max(0, current - 1));
            }}
          />
          <div className="flex gap-3">
            {playbackStatus === "finished" ? (
              <>
                <SecondaryButton label="Repetir" icon="replay" onClick={startPlayback} />
                <PrimaryButton
                  label={stepIndex === lesson.steps.length - 1 ? "Exercício final" : "Próximo"}
                  onClick={nextStep}
                />
              </>
            ) : (
              <PrimaryButton
                label={isPlaying ? "Tocando" : "Tocar"}
                icon="play"
                tone="orange"
                disabled={isPlaying}
                onClick={startPlayback}
              />
            )}
          </div>
        </>
      }
    >
      <ExerciseHeading
        eyebrow={lesson.exerciseTitle}
        title={`Monte ${chordLabel(step)} e toque corda por corda.`}
      />

      <div className="mt-8 flex flex-col items-center">
        <ChordName step={step} className="text-6xl" />
        <div className="mt-5 rounded-[24px] bg-[#fcfdf9] p-3 ring-1 ring-[#e6ebe8]">
          <ChordDiagram
            step={step}
            activeStrings={activeStrings}
          />
        </div>
      </div>
    </ExerciseShell>
  );
}

export default function App() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  if (selectedLesson) {
    return (
      <ExercisePage
        key={selectedLesson.id}
        lesson={selectedLesson}
        onExit={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-[#203330]">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#71817d]">Bom dia, Rafa</p>
          <h1 className="mt-1 text-[34px] font-black leading-tight tracking-[-0.045em] text-[#18302d] sm:text-[40px]">
            Continue no seu ritmo.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#788984]">
            Cada forma nova deixa o braço da guitarra um pouco menor.
          </p>
        </div>
        <PathSection onSelect={setSelectedLesson} />
      </main>
    </div>
  );
}
