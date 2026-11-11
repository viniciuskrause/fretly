import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
  barreSpans,
  chordLabel,
  soundingStrings,
  stringFrequency,
  type ChordPosition,
  type ChordStep,
} from "./chords.ts";
import { sections, type Lesson, type Section, type Trail as TrailData } from "./lessons.ts";
import { applyProgress, loadProgress, saveProgress, type Progress } from "./progress.ts";

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
    | "chevron"
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
    chevron: <path d="m6 9 6 6 6-6" />,
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

/** A guitar wearing taped-up nerd glasses (drawn for the orange tile). */
function Logo({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="12.6" y="1" width="6.8" height="5.4" rx="1.8" fill="#fff"/>
      <circle cx="11.7" cy="2.6" r="1" fill="#fff"/><circle cx="11.7" cy="5" r="1" fill="#fff"/>
      <circle cx="20.3" cy="2.6" r="1" fill="#fff"/><circle cx="20.3" cy="5" r="1" fill="#fff"/>
      <rect x="14.4" y="5.8" width="3.2" height="9.5" fill="#fff"/>
      <path d="M14.4 9h3.2M14.4 11.6h3.2M14.4 14.2h3.2" stroke="#F97316" strokeWidth="0.7"/>
      <path d="M16 13.2c3.4 0 5.6 2.2 5.6 4.6 0 1.3-.6 2.1-.6 2.9 0 .9 2.6 1.9 2.6 5.2 0 3.3-3.4 5.1-7.6 5.1s-7.6-1.8-7.6-5.1c0-3.3 2.6-4.3 2.6-5.2 0-.8-.6-1.6-.6-2.9 0-2.4 2.2-4.6 5.6-4.6z" fill="#fff"/>
      <rect x="8.2" y="18.3" width="6.6" height="5.4" rx="1.6" fill="#fff" stroke="#172554" strokeWidth="1.6"/>
      <rect x="17.2" y="18.3" width="6.6" height="5.4" rx="1.6" fill="#fff" stroke="#172554" strokeWidth="1.6"/>
      <path d="M14.8 20.4h2.4" stroke="#172554" strokeWidth="1.6"/>
      <rect x="15.1" y="19.3" width="1.8" height="2.4" rx="0.3" fill="#FEF3C7" stroke="#172554" strokeWidth="0.5"/>
      <circle cx="11.9" cy="21.2" r="1.1" fill="#172554"/><circle cx="20.1" cy="21.2" r="1.1" fill="#172554"/>
      <path d="M13.2 26.6q2.8 1.9 5.6 0" stroke="#172554" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-11 shrink-0 rotate-[-5deg] items-center justify-center rounded-[14px] bg-[#F97316] text-white shadow-[0_4px_0_#C2410C]">
        <Logo className="size-8" />
      </div>
      <p className="text-[20px] font-bold leading-none tracking-[-0.04em] text-[#172554]">
        Guitar Workouts for Nerds
      </p>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-[#E5D8B5]/90 bg-[#FFFEFB]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[720px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <button
          className="flex size-9 items-center justify-center rounded-full bg-[#FEF3C7] text-xs font-black text-[#92400E] ring-2 ring-white shadow-sm"
          aria-label="Abrir perfil"
        >
          RL
        </button>
      </div>
    </header>
  );
}

/** Trail label: the key part of a title like "C maior - formas CAGED" ("C maior"). */
function trailLabel(lesson: Lesson) {
  return <span className="block whitespace-nowrap">{lesson.title.split(" - ")[0]}</span>;
}

type TrailStatus = Lesson["status"];

type TrailPoint = { x: number; y: number };

// Serpentine layout: rows run left → right, then right → left, joined by
// half-circle turns outside the last node of each row.
function trailLayout(width: number, count: number) {
  const columns = width >= 520 ? 4 : 3;
  const radius = width >= 520 ? 74 : 72;
  const top = 52;
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
  return (
    <span className="text-[24px] font-black leading-none tracking-[-0.04em]">
      {/* "Bm7(♭5)" is too wide for the node: show it as "Bø"; inversions drop the bass ("C7M/E" → "C7M"). */}
      {lesson.steps[0].chord.replace("m7(♭5)", "ø").split("/")[0]}
    </span>
  );
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
      {status === "done" && lesson.lastBpm !== undefined && (
        <p className="trail-bpm" title="Andamento da última execução do exercício final">
          <Icon name="metronome" className="size-3.5" />
          <span>{lesson.lastBpm}</span>
          <span className="sr-only">BPM</span>
        </p>
      )}
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
      <p className={`trail-label trail-label--${status} whitespace-nowrap`}>Seção completa</p>
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

/** Done/total counter shown on section and trail headers. */
function doneCount(lessons: Lesson[]) {
  return `${lessons.filter((lesson) => lesson.status === "done").length}/${lessons.length}`;
}

function Trail({
  trail,
  trophy,
  open,
  onToggle,
  onSelect,
}: {
  trail: TrailData;
  /** Status of the trophy at the end of the trail; omitted = no trophy. */
  trophy?: TrailStatus;
  open: boolean;
  onToggle: () => void;
  onSelect: (lesson: Lesson) => void;
}) {
  const hasCurrent = trail.lessons.some((lesson) => lesson.status === "current");
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition hover:border-[#FBBF24] ${
          open ? "border-transparent" : "border-[#E5D8B5] bg-white"
        }`}
      >
        <span className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.14em] text-[#172554]">
          {trail.title}
        </span>
        {hasCurrent && !open && (
          <span className="shrink-0 rounded-full bg-[#FFEDD5] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#C2410C]">
            Atual
          </span>
        )}
        <span className="shrink-0 text-xs font-black text-[#64748B]">{doneCount(trail.lessons)}</span>
        <Icon
          name="chevron"
          className={`size-5 shrink-0 text-[#64748B] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <TrailBody trail={trail} trophy={trophy} onSelect={onSelect} />}
    </div>
  );
}

function TrailBody({
  trail,
  trophy,
  onSelect,
}: {
  trail: TrailData;
  trophy?: TrailStatus;
  onSelect: (lesson: Lesson) => void;
}) {
  const { lessons } = trail;
  const { ref, width } = useElementWidth();
  const statuses: TrailStatus[] = [...lessons.map((lesson) => lesson.status), ...(trophy ? [trophy] : [])];
  const layout = width ? trailLayout(width, statuses.length) : null;
  return (
    <div ref={ref} className="relative" style={{ height: layout?.height ?? 400 }}>
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
                stroke={statuses[index + 1] === "locked" ? "#E5D8B5" : "#3B82F6"}
              />
            ))}
          </svg>
          {lessons.map((lesson, index) => (
            <TrailNode key={lesson.id} lesson={lesson} point={layout.points[index]} onSelect={onSelect} />
          ))}
          {trophy && <TrailTrophy point={layout.points[lessons.length]} status={trophy} />}
        </>
      )}
    </div>
  );
}

const COLLAPSED_KEY = "fretly.collapsed.v1";
const sectionKey = (section: Section) => `s${section.id}`;
const trailKey = (section: Section, index: number) => `s${section.id}:t${index}`;

/** Collapsed sections and trails, remembered in this browser (all open by default). */
function useCollapsed() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  function update(next: Set<string>) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
    } catch {
      // Blocked storage: the state lasts for this visit only.
    }
  }
  return {
    collapsed,
    toggle(key: string) {
      const next = new Set(collapsed);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      update(next);
    },
    expandAll: () => update(new Set()),
    collapseAll: (all: Section[]) =>
      update(new Set(all.flatMap((section) => [sectionKey(section), ...section.trails.map((_, i) => trailKey(section, i))]))),
  };
}

/** Sticky bar under the top bar: open or close every section and trail at once. */
function OutlineControls({ onExpand, onCollapse }: { onExpand: () => void; onCollapse: () => void }) {
  const button =
    "flex items-center gap-1.5 rounded-full border border-[#E5D8B5] bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-[#172554] shadow-sm transition hover:border-[#FBBF24] active:translate-y-px";
  return (
    <div className="sticky top-[72px] z-[5] -mx-5 mb-6 flex justify-end gap-2 bg-[#FFFEFB]/90 px-5 py-2.5 backdrop-blur-xl sm:-mx-8 sm:px-8">
      <button onClick={onExpand} className={button}>
        <Icon name="chevron" className="size-4" /> Expandir tudo
      </button>
      <button onClick={onCollapse} className={button}>
        <Icon name="chevron" className="size-4 rotate-180" /> Recolher tudo
      </button>
    </div>
  );
}

function PathSection({
  section,
  collapsed,
  onToggle,
  onSelect,
  onOpenGuide,
}: {
  section: Section;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (lesson: Lesson) => void;
  onOpenGuide: () => void;
}) {
  const open = !collapsed.has(sectionKey(section));
  const lessons = section.trails.flatMap((trail) => trail.lessons);
  const sectionDone = lessons.every((lesson) => lesson.status === "done");
  const doneShare = lessons.filter((lesson) => lesson.status === "done").length / lessons.length;
  return (
    <section>
      <div className="overflow-hidden rounded-[26px] bg-[#1E3A8A] text-white shadow-[0_7px_0_#172554]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <button
            onClick={() => onToggle(sectionKey(section))}
            aria-expanded={open}
            className="group flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#FDE68A]">
                Seção {section.id} • {doneCount(lessons)} {lessons.length === 1 ? "exercício" : "exercícios"}
              </span>
              <span className="mt-2 block text-[25px] font-black tracking-[-0.03em]">{section.title}</span>
              <span className="mt-1 block text-sm text-white/75">{section.subtitle}</span>
            </span>
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
              <Icon name="chevron" className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
            </span>
          </button>
          <button
            onClick={onOpenGuide}
            className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-5 py-3 text-xs font-black text-[#1E3A8A] shadow-[0_4px_0_#C7D7F5] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#C7D7F5] active:translate-y-1 active:shadow-none"
          >
            <Icon name="book" className="size-4" /> GUIA
          </button>
        </div>
        <div className="h-1.5 bg-[#2B4BA8]">
          <div
            className="h-full rounded-r-full bg-[#FBBF24]"
            style={{ width: `${doneShare * 100}%` }}
          />
        </div>
      </div>

      {open &&
        section.trails.map((trail, index) => (
          <Trail
            key={trail.title}
            trail={trail}
            trophy={index === section.trails.length - 1 ? (sectionDone ? "done" : "locked") : undefined}
            open={!collapsed.has(trailKey(section, index))}
            onToggle={() => onToggle(trailKey(section, index))}
            onSelect={onSelect}
          />
        ))}
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
/** "Cm7(♭5)/E♭" and the like are too wide for the big size on phones. */
function isLongChordName(step: ChordStep) {
  return step.chord.length > 8;
}

function ChordName({ step, className }: { step: ChordStep; className: string }) {
  return (
    <p className={`font-black tracking-[-0.055em] text-[#172554] ${className}`}>{step.chord}</p>
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
      <rect x="28" y="18" width="244" height="206" rx="16" fill="#FFFFFF" />
      {[0, 1, 2, 3, 4, 5].map((string) => {
        const isActive = activeStrings.includes(string);
        return (
          <g key={`string-${string}`}>
            <line
              x1="56"
              y1={diagramRowY(string)}
              x2="258"
              y2={diagramRowY(string)}
              stroke={isActive ? "#F97316" : "#94A3B8"}
              strokeWidth={isActive ? 4 : string === 5 ? 1.3 : 1}
              className="transition-all duration-150"
            />
            {position.frets[string] === 0 && isActive && (
              <circle
                cx="42"
                cy={diagramRowY(string)}
                r="7"
                fill="none"
                stroke="#F97316"
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
          stroke="#475569"
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
          fill="#475569"
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
            stroke={isActive ? "#F97316" : "#172554"}
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
              fill={isActive ? "#F97316" : "#172554"}
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
  wide = false,
  children,
}: {
  progress: number;
  onExit: () => void;
  footer: ReactNode;
  /** Centred in the bottom bar (on its own row above the buttons on narrow screens). */
  footerCenter?: ReactNode;
  /** Wider content column (the final exercise shows every diagram). */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFEFB] text-[#172554]">
      <header className="mx-auto flex w-full max-w-[1040px] items-center gap-4 px-4 pt-5 sm:gap-6 sm:px-10 sm:pt-12">
        <button
          onClick={onExit}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#64748B] transition hover:bg-[#FBF3DC] hover:text-[#334155]"
          aria-label="Voltar à trilha"
        >
          <Icon name="close" className="size-6" />
        </button>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-[#E5D8B5]"
          role="progressbar"
          aria-label="Progresso do exercício"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-8 sm:px-6 ${wide ? "max-w-[1040px]" : "max-w-[600px]"}`}
      >
        {children}
      </main>

      <footer className="sticky bottom-0 border-t-2 border-[#E5D8B5] bg-[#FFFEFB]">
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

/**
 * Uppercase eyebrow that keeps the chord symbol before " - " in its own case:
 * "Dm7(♭5) - formas CAGED" must not read "DM7(♭5)" (a major-seventh chord).
 */
function EyebrowText({ text }: { text: string }) {
  const [chord, ...rest] = text.split(" - ");
  if (!rest.length) return <>{text}</>;
  return (
    <>
      <span className="normal-case">{chord}</span> - {rest.join(" - ")}
    </>
  );
}

function ExerciseHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C2410C]">
        <EyebrowText text={eyebrow} />
      </p>
      <h1 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.035em] text-[#172554]">
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
      className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-b-4 border-[#DACCA8] bg-white px-4 text-sm font-black uppercase tracking-[0.08em] text-[#475569] transition hover:bg-[#FBF3DC] active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[150px] sm:px-6"
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
      ? "bg-[#C2410C] shadow-[0_4px_0_#9A3412]"
      : "bg-[#2563EB] shadow-[0_4px_0_#1E3A8A]";
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

const MIN_BPM = 40;
const MAX_BPM = 180;
const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

function BpmControl({
  bpm,
  onChange,
  disabled,
}: {
  bpm: number;
  onChange: (update: (value: number) => number) => void;
  disabled: boolean;
}) {
  // Text being typed; null while the field isn't being edited.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (Number.isFinite(value)) onChange(() => clampBpm(value));
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2 ring-1 ring-[#E5D8B5]" role="group" aria-label={`Andamento: ${bpm} BPM`}>
      <div className="flex items-center px-2 text-[#64748B]" title="BPM">
        <Icon name="metronome" className="size-5" />
      </div>
      <button
        onClick={() => onChange((value) => clampBpm(value - 4))}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg bg-[#FBF3DC] font-black text-[#475569] disabled:opacity-40"
        aria-label="Diminuir BPM"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={3}
        value={draft ?? String(bpm)}
        disabled={disabled}
        aria-label={`Andamento em BPM (${MIN_BPM} a ${MAX_BPM})`}
        title={`Digite o andamento (${MIN_BPM}–${MAX_BPM} BPM)`}
        onFocus={(event) => {
          setDraft(String(bpm));
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          else if (event.key === "Escape") {
            setDraft(null);
            // Blur without committing: draft is already cleared.
            requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const next = clampBpm(Number.parseInt(draft ?? String(bpm), 10) + (event.key === "ArrowUp" ? 1 : -1) || bpm);
            setDraft(String(next));
            onChange(() => next);
          }
        }}
        className="h-8 w-12 rounded-lg border-2 border-transparent bg-transparent text-center text-sm font-black text-[#172554] outline-none transition hover:border-[#E5D8B5] focus:border-[#3B82F6] focus:bg-[#EFF6FF] disabled:opacity-60"
      />
      <button
        onClick={() => onChange((value) => clampBpm(value + 4))}
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg bg-[#FBF3DC] font-black text-[#475569] disabled:opacity-40"
        aria-label="Aumentar BPM"
      >
        +
      </button>
    </div>
  );
}

function ExercisePage({
  lesson,
  onExit,
  onComplete,
}: {
  lesson: Lesson;
  onExit: () => void;
  /** Called on "Concluir" with the tempo of the last final-exercise run. */
  onComplete: (bpm: number) => void;
}) {
  // Tempo of the last run of the final exercise.
  const sequenceBpm = useRef<number | null>(null);
  // A finished lesson reopens on its final exercise, at the tempo used last time.
  const reopensFinished = lesson.status === "done";
  const [stepIndex, setStepIndex] = useState(reopensFinished ? lesson.steps.length - 1 : 0);
  const [bpm, setBpm] = useState(lesson.lastBpm ?? 72);
  const [playbackStatus, setPlaybackStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [activeStrings, setActiveStrings] = useState<number[]>([]);
  const [finalExercise, setFinalExercise] = useState(reopensFinished);
  const [sequenceIndex, setSequenceIndex] = useState(-1);
  const [sequenceStatus, setSequenceStatus] = useState<"idle" | "countdown" | "playing" | "finished">("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
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
    setSequenceIndex(-1);
    setCountdown(null);
    setSequenceStatus("idle");
  }

  /** 3-2-1 countdown (one second each), then every chord in sequence. */
  async function startChordSequence() {
    clearPlayback();
    sequenceBpm.current = bpm;
    setSequenceIndex(-1);
    setSequenceStatus("countdown");
    setCountdown(3);
    await prepareAudio();
    const later = (ms: number, fn: () => void) => timeoutIds.current.push(window.setTimeout(fn, ms));
    later(1000, () => setCountdown(2));
    later(2000, () => setCountdown(1));
    later(3000, () => {
      setCountdown(null);
      setSequenceStatus("playing");
      const events: ScheduledEvent[] = lesson.steps.map((chordStep, index) => ({
        beat: index,
        notes: chordNotes(chordStep.position),
        onPlay: () => setSequenceIndex(index),
      }));
      runSchedule(events, lesson.steps.length, () => {
        setSequenceIndex(-1);
        setSequenceStatus("finished");
      });
    });
  }

  if (complete) {
    return (
      <div className="min-h-screen bg-[#FFFEFB]">
        <TopBar />
        <div className="mx-auto w-full max-w-[560px] px-5 py-16 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-[0_9px_0_#1E3A8A]">
            <Icon name="check" className="size-12" />
          </div>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-[#C2410C]">
            Exercício concluído
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#172554]">
            {lesson.exerciseTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#64748B]">
            Você percorreu todas as formas desta etapa. Faça a revisão todos os dias para manter a
            forma dos exercícios que você já aprendeu.
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5D8B5]">
              <p className="text-2xl font-black text-[#C2410C]">{lesson.steps.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                {lesson.steps[0].shape ? "Formas tocadas" : "Digitações tocadas"}
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-8 w-full max-w-sm rounded-2xl bg-[#2563EB] py-4 text-sm font-black text-white shadow-[0_5px_0_#1E3A8A] transition active:translate-y-1 active:shadow-none"
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
      disabled={playbackStatus === "playing" || sequenceStatus === "playing" || sequenceStatus === "countdown"}
    />
  );

  if (finalExercise) {
    const isPlaying = sequenceStatus === "playing" || sequenceStatus === "countdown";
    return (
      <ExerciseShell
        progress={100}
        onExit={onExit}
        wide
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
                  <PrimaryButton
                    label="Concluir"
                    onClick={() => {
                      onComplete(sequenceBpm.current ?? bpm);
                      setComplete(true);
                    }}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={sequenceStatus === "countdown" ? "Preparando" : isPlaying ? "Tocando" : "Iniciar"}
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

        <div className="relative mt-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {lesson.steps.map((chordStep, index) => {
              const isSounding = sequenceStatus === "playing" && index === sequenceIndex;
              const isDimmed = isPlaying && !isSounding;
              return (
                <div
                  key={`${chordStep.chord}-${index}`}
                  ref={(node) => {
                    // Keep the chord being played on screen (the grid scrolls on phones).
                    if (node && isSounding) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                  }}
                  className={`sequence-card ${isSounding ? "sequence-card--sounding" : ""} ${isDimmed ? "sequence-card--dimmed" : ""}`}
                  aria-current={isSounding ? "true" : undefined}
                >
                  <ChordName step={chordStep} className={isLongChordName(chordStep) ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} />
                  <ChordDiagram
                    step={chordStep}
                    activeStrings={isSounding ? soundingStrings(chordStep.position) : []}
                  />
                  {chordStep.alternative && <AlternativeLabel className="mt-2 text-[10px]" />}
                </div>
              );
            })}
          </div>
          {countdown !== null && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
              <span key={countdown} className="sequence-countdown">
                {countdown}
              </span>
            </div>
          )}
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
        <ChordName step={step} className={isLongChordName(step) ? "text-5xl sm:text-6xl" : "text-6xl"} />
        <div className="mt-5 rounded-[24px] bg-[#FFFFFF] p-3 ring-1 ring-[#E5D8B5]">
          <ChordDiagram
            step={step}
            activeStrings={activeStrings}
          />
        </div>
        {step.alternative && <AlternativeLabel className="mt-3 text-xs" />}
      </div>
    </ExerciseShell>
  );
}

/** Caption under the diagram of an alternative fingering. */
function AlternativeLabel({ className = "" }: { className?: string }) {
  return (
    <p className={`font-black uppercase tracking-[0.14em] text-[#64748B] ${className}`}>
      Digitação alternativa
    </p>
  );
}

// ---------------------------------------------------------------- guide

const GUIDE_SOURCES = [
  { label: "JustinGuitar — CAGED System", url: "https://justinguitar.com/modules/caged-system" },
  { label: "Premier Guitar — CAGED explained", url: "https://www.premierguitar.com/explains/caged" },
  { label: "D'Addario — Guitarist's Guide to the CAGED System", url: "https://www.daddario.com/the-lesson-room/guitar/guitarists-guide-to-the-caged-system/" },
  { label: "Andy Guitar — The CAGED System Explained", url: "https://www.andyguitar.co.uk/videos/06-the-caged-system-explained" },
  { label: "London Guitar Academy — The CAGED Guitar System Explained", url: "https://www.londonguitaracademy.com/?p=10738" },
  { label: "Music Grotto — CAGED System Guitar", url: "https://www.musicgrotto.com/caged-system-guitar" },
  { label: "Premier Guitar — Why I Don't Teach the CAGED System", url: "https://www.premierguitar.com/lessons/caged/why-i-don-t-teach-the-caged-system?rebelltitem=8" },
];

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-[24px] font-black tracking-[-0.03em] text-[#172554]">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#334155]">{children}</div>
    </section>
  );
}

function GuidePage({ onBack }: { onBack: () => void }) {
  const cMajor = sections[0].trails[0].lessons[0];
  const fretOf = (step: ChordStep) =>
    step.position.baseFret === 1 ? "aberta" : `a partir da casa ${step.position.baseFret}`;
  return (
    <div className="min-h-screen bg-[#FFFEFB] text-[#172554]">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-8 sm:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-black text-[#475569] transition hover:bg-[#FBF3DC]"
        >
          <Icon name="back" className="size-4" /> Voltar à trilha
        </button>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-[#C2410C]">Guia</p>
        <h1 className="mt-2 text-[36px] font-black leading-tight tracking-[-0.045em] sm:text-[44px]">
          O sistema CAGED
        </h1>
        <p className="mt-4 text-[17px] leading-8 text-[#334155]">
          Cinco acordes que você aprende nas primeiras semanas de violão — C, A, G, E e D — escondem
          um mapa do braço inteiro. O CAGED é a forma de ler esse mapa: com ele, qualquer acorde
          pode ser tocado em qualquer tonalidade, em cinco regiões diferentes do braço.
        </p>

        <GuideSection title="O que é">
          <p>
            CAGED é um jeito de organizar o braço da guitarra a partir das cinco formas de acorde
            aberto: <strong>C, A, G, E e D</strong> — daí o nome. Cada uma dessas formas pode ser
            deslocada para cima no braço e continua sendo o mesmo desenho; só muda a tonalidade.
            Encadeadas, as cinco formas cobrem o braço de ponta a ponta.
          </p>
          <p>
            Não há consenso sobre quem criou o sistema. Muitos professores lembram que ele não foi
            inventado por alguém: é uma consequência da afinação padrão do instrumento, que alguém
            em algum momento organizou e batizou. Por isso mesmo ele só funciona na afinação padrão
            (E A D G B E).
          </p>
        </GuideSection>

        <GuideSection title="A lógica">
          <p>
            Ao mover uma forma aberta para cima, o <strong>dedo indicador faz o papel da pestana do
            braço</strong>: prende na casa base as cordas que eram soltas, e os outros dedos refazem
            o desenho. Assim o E aberto vira o F na casa 1, e o A aberto vira o C na casa 3.
          </p>
          <p>
            Subindo o braço, as formas aparecem sempre na ordem <strong>C → A → G → E → D</strong> e
            depois recomeçam uma oitava acima. Cada uma se encaixa na seguinte, compartilhando notas.
            Em outro tom só muda o ponto de partida: o F começa na forma de E e segue E → D → C → A →
            G. Veja o C maior nas cinco formas:
          </p>
          <div className="!mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
            {cMajor.steps.map((step) => (
              <figure key={step.shape} className="sequence-card guide-shape">
                <figcaption className="text-center">
                  <span className="block text-lg font-black text-[#172554]">Forma {step.shape}</span>
                  <span className="block text-xs font-bold text-[#64748B]">{fretOf(step)}</span>
                </figcaption>
                <ChordDiagram step={step} activeStrings={[]} />
              </figure>
            ))}
          </div>
        </GuideSection>

        <GuideSection title="Vantagens">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>O braço inteiro com o que você já sabe.</strong> As cinco formas são acordes que
              qualquer iniciante conhece; o CAGED só mostra para onde cada uma pode ir.
            </li>
            <li>
              <strong>Qualquer acorde, em qualquer tom, em qualquer lugar.</strong> Encontrando a
              tônica, você monta o acorde em cinco regiões diferentes e escolhe a mais próxima de onde
              sua mão já está.
            </li>
            <li>
              <strong>Transpor fica simples.</strong> Mudar de tom é mover o mesmo desenho; a forma
              não muda.
            </li>
            <li>
              <strong>Ponte para escalas e solos.</strong> Cada forma serve de âncora para arpejos,
              a pentatônica e a escala maior daquela região, conectando acordes e melodia.
            </li>
            <li>
              <strong>Menos memorização solta.</strong> Em vez de decorar centenas de digitações,
              você aprende cinco desenhos e a regra que os liga.
            </li>
          </ul>
        </GuideSection>

        <GuideSection title="Limites e cuidados">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Formas não substituem as notas.</strong> Um risco comum é tocar desenhos sem
              saber quais notas eles têm. Vale sempre localizar a tônica e a terça de cada forma.
            </li>
            <li>
              <strong>Só na afinação padrão.</strong> Em afinações alternativas os desenhos mudam.
            </li>
            <li>
              <strong>Algumas formas completas são difíceis.</strong> Por isso as aulas usam
              digitações tocáveis de cada forma: às vezes uma corda fica abafada, mas a tônica
              continua no baixo.
            </li>
          </ul>
        </GuideSection>

        <GuideSection title="Como estudar com este app">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Cada aula é uma tonalidade: o acorde nas cinco formas, da mais grave para a mais aguda.</li>
            <li>Monte cada forma e toque corda por corda; o título diz o acorde e a forma.</li>
            <li>No exercício final, toque as cinco formas em sequência, no andamento do metrônomo.</li>
            <li>Suba o andamento aos poucos: a trilha guarda o BPM da sua última execução.</li>
            <li>
              Depois dos acordes maiores vêm os menores, os de sétima dominante e os meio diminutos,
              sempre pela mesma lógica.
            </li>
          </ol>
        </GuideSection>

        <section className="mt-14 rounded-2xl border border-[#E5D8B5] bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#475569]">Fontes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {GUIDE_SOURCES.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#2563EB] underline decoration-[#BFDBFE] underline-offset-4 hover:decoration-[#2563EB]"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [showGuide, setShowGuide] = useState(false);
  const outline = useCollapsed();
  const trailSections = applyProgress(sections, progress);

  function completeLesson(lesson: Lesson, bpm: number) {
    setProgress((current) => {
      const next = { ...current, [lesson.id]: { bpm, completedAt: new Date().toISOString() } };
      saveProgress(next);
      return next;
    });
  }

  if (showGuide) return <GuidePage onBack={() => setShowGuide(false)} />;

  if (selectedLesson) {
    return (
      <ExercisePage
        key={selectedLesson.id}
        lesson={selectedLesson}
        onExit={() => setSelectedLesson(null)}
        onComplete={(bpm) => completeLesson(selectedLesson, bpm)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEFB] text-[#172554]">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-16 pt-2 sm:px-8">
        <OutlineControls onExpand={outline.expandAll} onCollapse={() => outline.collapseAll(trailSections)} />
        <div className="space-y-10">
          {trailSections.map((section) => (
            <PathSection
              key={section.id}
              section={section}
              collapsed={outline.collapsed}
              onToggle={outline.toggle}
              onSelect={setSelectedLesson}
              onOpenGuide={() => {
                setShowGuide(true);
                window.scrollTo(0, 0);
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
