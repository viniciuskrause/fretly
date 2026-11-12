import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
    | "notebook"
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
    notebook: (
      <>
        <rect x="6" y="3" width="14" height="18" rx="2" />
        <path d="M3.5 7.5h5M3.5 12h5M3.5 16.5h5M11.5 8h5M11.5 12h5M11.5 16h3" />
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

function Brand() {
  return (
    <div className="flex items-center">
      <p className="font-display text-[17px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[19px]">
        Guitar Workouts <span className="text-accent-ink">for Nerds</span>
      </p>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas">
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-8 lg:px-12">
        <Brand />
        <button
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-semibold text-white transition hover:bg-ink-2 active:scale-95"
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

/** Done/total counter shown on section and trail headers. */
function doneCount(lessons: Lesson[]) {
  return `${lessons.filter((lesson) => lesson.status === "done").length}/${lessons.length}`;
}

const doneShareOf = (lessons: Lesson[]) =>
  lessons.length ? lessons.filter((lesson) => lesson.status === "done").length / lessons.length : 0;

/** Bare chevron (no background) that turns upward when its category is open. */
function ChevronToggle({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center transition-transform duration-[240ms] ${
        open ? "rotate-180" : ""
      } ${className}`}
      aria-hidden="true"
    >
      <Icon name="chevron" className="size-5" />
    </span>
  );
}

/**
 * Animated region of a collapsible category. It stays mounted so it can slide
 * open and shut; while closed it is `inert` (no focus, hidden from assistive tech).
 */
function Collapse({
  id,
  labelledBy,
  open,
  children,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div id={id} role="region" aria-labelledby={labelledBy} className="disclosure-region" data-open={open} inert={!open}>
      <div className="disclosure-region__inner">{children}</div>
    </div>
  );
}

/** Small orange dot on a closed header whose lessons include the current one. */
function CurrentDot() {
  return (
    <span className="size-2.5 shrink-0 rounded-full bg-accent" role="img" aria-label="Aula atual" title="Aula atual" />
  );
}

/** Ids tying a disclosure button to its region (aria-controls / aria-labelledby). */
function useDisclosureIds() {
  const id = useId();
  return { buttonId: `${id}-button`, regionId: `${id}-region` };
}

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
    <span className="text-[23px] font-bold leading-none tracking-[-0.04em]">
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
            <Icon name="check" className="size-4 [stroke-width:3.5]" />
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
                className={statuses[index + 1] === "locked" ? "stroke-line-strong" : "stroke-brand"}
                strokeDasharray={statuses[index + 1] === "locked" ? "2 8" : undefined}
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
  const { buttonId, regionId } = useDisclosureIds();
  const hasCurrent = trail.lessons.some((lesson) => lesson.status === "current");
  return (
    <div
      className={`overflow-hidden rounded-card border bg-surface transition-colors ${
        open ? "border-line-strong" : "border-line"
      }`}
    >
      <button
        id={buttonId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={regionId}
        className="group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-offset-[-2px]"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {trail.title}
          </span>
          <span className="mt-1 block font-mono text-[11px] font-medium tabular-nums text-muted">
            {doneCount(trail.lessons)}
          </span>
        </span>
        {hasCurrent && !open && <CurrentDot />}
        <ChevronToggle open={open} className="text-ink-2" />
      </button>
      <Collapse id={regionId} labelledBy={buttonId} open={open}>
        <div className="px-1 pb-2 pt-1">
          <TrailBody trail={trail} trophy={trophy} onSelect={onSelect} />
        </div>
      </Collapse>
    </div>
  );
}


const OPEN_KEY = "fretly.open.v1";
const sectionKey = (section: Section) => `s${section.id}`;
const trailKey = (section: Section, index: number) => `s${section.id}:t${index}`;
const groupKey = (section: Section, group: string) => `s${section.id}:g${group}`;

/** Open sections and trails, remembered in this browser (all closed by default). */
function useOutline() {
  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(OPEN_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  function update(next: Set<string>) {
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
    } catch {
      // Blocked storage: the state lasts for this visit only.
    }
  }
  return {
    open,
    /** Opens or closes `key`; when opening, also opens the keys in `alsoOpen`. */
    toggle(key: string, alsoOpen: string[] = []) {
      const next = new Set(open);
      if (next.has(key)) next.delete(key);
      else [key, ...alsoOpen].forEach((k) => next.add(k));
      update(next);
    },
  };
}

/** Consecutive trails of a section that share a group (trails without one stand alone). */
function trailBlocks(section: Section) {
  const blocks: Array<{ group?: string; items: Array<{ trail: TrailData; index: number }> }> = [];
  section.trails.forEach((trail, index) => {
    const last = blocks.at(-1);
    if (trail.group && last?.group === trail.group) last.items.push({ trail, index });
    else blocks.push({ group: trail.group, items: [{ trail, index }] });
  });
  return blocks;
}

/** Collapsible category of trails (an inversion in section 2). */
function TrailGroup({
  title,
  lessons,
  open,
  onToggle,
  children,
}: {
  title: string;
  lessons: Lesson[];
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const hasCurrent = lessons.some((lesson) => lesson.status === "current");
  const { buttonId, regionId } = useDisclosureIds();
  return (
    <div>
      <button
        id={buttonId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={regionId}
        className={`group flex min-h-14 w-full items-center gap-3 rounded-card border bg-surface px-4 py-3 text-left transition-colors focus-visible:outline-offset-[-2px] ${
          open ? "border-line-strong" : "border-line"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </span>
          <span className="mt-1 block font-mono text-[11px] font-medium tabular-nums text-muted">
            {doneCount(lessons)}
          </span>
        </span>
        {hasCurrent && !open && <CurrentDot />}
        <ChevronToggle open={open} className="text-ink-2" />
      </button>
      <Collapse id={regionId} labelledBy={buttonId} open={open}>
        <div className="ml-[31px] space-y-3 border-l-2 border-line pb-1 pl-3 pt-3 sm:ml-[35px] sm:pl-4">
          {children}
        </div>
      </Collapse>
    </div>
  );
}

function PathSection({
  section,
  openKeys,
  onToggle,
  onSelect,
  onOpenGuide,
}: {
  section: Section;
  openKeys: Set<string>;
  onToggle: (key: string, alsoOpen?: string[]) => void;
  onSelect: (lesson: Lesson) => void;
  onOpenGuide: () => void;
}) {
  const { buttonId, regionId } = useDisclosureIds();
  const open = openKeys.has(sectionKey(section));
  const lessons = section.trails.flatMap((trail) => trail.lessons);
  const sectionDone = lessons.every((lesson) => lesson.status === "done");
  const doneShare = doneShareOf(lessons);
  /**
   * Opening the section also opens the trail (and its group) holding the next lesson to
   * study: its first unfinished lesson (the "current" one, when it is in this section).
   */
  function toggleSection() {
    const index = section.trails.findIndex((trail) => trail.lessons.some((lesson) => lesson.status !== "done"));
    const trail = section.trails[index];
    const alsoOpen = trail ? [trailKey(section, index), ...(trail.group ? [groupKey(section, trail.group)] : [])] : [];
    onToggle(sectionKey(section), alsoOpen);
  }
  return (
    <section>
      <div className="overflow-hidden rounded-card border border-brand bg-brand text-white">
        <div className="flex flex-col gap-4 p-5 pr-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6 sm:pr-4">
          {/* The whole title area toggles too; the chevron button is the accessible control. */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={toggleSection}>
            <span className="eyebrow block text-brand-soft">
              Seção {section.id}
            </span>
            <span className="mt-2 block font-display text-[24px] font-bold leading-tight tracking-[-0.03em] sm:text-[26px]">
              {section.title}
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-brand-soft">{section.subtitle}</span>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              onClick={onOpenGuide}
              aria-label={`Guia da seção ${section.id}`}
              title="Guia"
              className="flex size-11 shrink-0 items-center justify-center rounded-control text-white transition-opacity hover:opacity-80 active:scale-[0.96] focus-visible:outline-white"
            >
              <Icon name="notebook" className="size-6" />
            </button>
            <button
              id={buttonId}
              onClick={toggleSection}
              aria-expanded={open}
              aria-controls={regionId}
              aria-label={`${open ? "Recolher" : "Expandir"} seção ${section.id}: ${section.title}`}
              className="-mr-1.5 flex size-11 items-center justify-center rounded-control text-white transition-opacity hover:opacity-80 focus-visible:outline-white"
            >
              <ChevronToggle open={open} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 pb-5 sm:px-6 sm:pb-6">
          <span className="shrink-0 whitespace-nowrap font-mono text-sm font-bold tabular-nums text-white">
            {doneCount(lessons)} {lessons.length === 1 ? "exercício" : "exercícios"}
          </span>
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-ink"
            role="progressbar"
            aria-label={`Progresso da seção ${section.id}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(doneShare * 100)}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${doneShare * 100}%` }}
            />
          </div>
        </div>
      </div>

      <Collapse id={regionId} labelledBy={buttonId} open={open}>
        <div className="space-y-3 pt-3">
          {trailBlocks(section).map((block) => {
            const trails = block.items.map(({ trail, index }) => (
              <Trail
                key={index}
                trail={trail}
                trophy={index === section.trails.length - 1 ? (sectionDone ? "done" : "locked") : undefined}
                open={openKeys.has(trailKey(section, index))}
                onToggle={() => onToggle(trailKey(section, index))}
                onSelect={onSelect}
              />
            ));
            if (!block.group) return trails;
            const key = groupKey(section, block.group);
            return (
              <TrailGroup
                key={key}
                title={block.group}
                lessons={block.items.flatMap(({ trail }) => trail.lessons)}
                open={openKeys.has(key)}
                onToggle={() => onToggle(key)}
              >
                {trails}
              </TrailGroup>
            );
          })}
        </div>
      </Collapse>
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
    <p className={`font-display font-bold tracking-[-0.045em] text-ink ${className}`}>{step.chord}</p>
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
      <rect x="28" y="18" width="244" height="206" rx="16" className="fill-surface" />
      {[0, 1, 2, 3, 4, 5].map((string) => {
        const isActive = activeStrings.includes(string);
        return (
          <g key={`string-${string}`}>
            <line
              x1="56"
              y1={diagramRowY(string)}
              x2="258"
              y2={diagramRowY(string)}
              strokeWidth={isActive ? 4 : string === 5 ? 1.6 : 1.2}
              className={`transition-all duration-150 ${isActive ? "stroke-accent" : "stroke-subtle"}`}
            />
            {position.frets[string] === 0 && isActive && (
              <circle
                cx="42"
                cy={diagramRowY(string)}
                r="7"
                fill="none"
                className="stroke-accent"
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
          className="stroke-ink-2"
          strokeWidth={line === 0 && position.baseFret === 1 ? 6 : 1.4}
          strokeLinecap={line === 0 && position.baseFret === 1 ? "round" : undefined}
        />
      ))}
      {position.baseFret > 1 && (
        <text
          x={diagramColumnX(1)}
          y="215"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          className="fill-muted font-mono"
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
            strokeWidth="18"
            strokeLinecap="round"
            className={`transition-all duration-150 ${isActive ? "stroke-accent" : "stroke-ink"}`}
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
              className={`transition-all duration-150 ${isActive ? "fill-accent" : "fill-ink"}`}
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize={isActive ? 12 : 11}
              fontWeight="700"
              className={`font-mono transition-all duration-150 fill-white`}
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
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-[1040px] items-center gap-4 px-4 pt-5 sm:gap-6 sm:px-10 sm:pt-12">
        <button
          onClick={onExit}
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-sunken hover:text-ink active:scale-95"
          aria-label="Voltar à trilha"
        >
          <Icon name="close" className="size-6" />
        </button>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Progresso do exercício"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main
        className={`mx-auto flex w-full flex-1 flex-col justify-center px-4 py-8 sm:px-6 ${wide ? "max-w-[1040px]" : "max-w-[600px]"}`}
      >
        {children}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-surface">
        <div className="relative mx-auto w-full max-w-[1040px] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-6">
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
      <p className="eyebrow text-accent-ink">
        <EyebrowText text={eyebrow} />
      </p>
      <h1 className="mt-3 text-balance font-display text-[26px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">
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
      className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 transition hover:border-subtle hover:bg-sunken hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:bg-surface sm:min-w-[140px] sm:px-5"
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
  tone = "primary",
}: ActionButtonProps & {
  /** "primary" (blue) moves forward; "accent" (orange) makes sound. */
  tone?: "primary" | "accent";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent text-white hover:bg-accent-strong"
      : "bg-brand text-white hover:bg-brand-strong";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 min-w-[124px] items-center justify-center gap-2 rounded-control px-6 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:min-w-[150px] ${toneClass}`}
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
    <div className="flex items-center gap-2 rounded-control bg-surface p-1.5 border border-line" role="group" aria-label={`Andamento: ${bpm} BPM`}>
      <div className="flex items-center gap-1.5 px-2 text-muted" title="BPM">
        <Icon name="metronome" className="size-5" />
        <span className="eyebrow text-[10px]!">BPM</span>
      </div>
      <button
        onClick={() => onChange((value) => clampBpm(value - 4))}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2 transition hover:bg-line hover:text-ink active:scale-95 disabled:opacity-40 disabled:hover:bg-sunken"
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
        className="h-9 w-14 rounded-lg border-2 border-transparent bg-transparent text-center font-mono text-[15px] font-semibold tabular-nums text-ink outline-none transition hover:border-line focus:border-brand focus:bg-brand-soft disabled:opacity-60"
      />
      <button
        onClick={() => onChange((value) => clampBpm(value + 4))}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2 transition hover:bg-line hover:text-ink active:scale-95 disabled:opacity-40 disabled:hover:bg-sunken"
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
      <div className="min-h-screen bg-canvas">
        <TopBar />
        <div className="mx-auto w-full max-w-[560px] px-5 py-14 text-center sm:py-16">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand text-white ring-8 ring-brand-soft">
            <Icon name="check" className="size-12" />
          </div>
          <p className="eyebrow mt-10 text-accent-ink">Exercício concluído</p>
          <h1 className="mt-3 text-balance font-display text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
            {lesson.exerciseTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted">
            Você percorreu todas as formas desta etapa. Faça a revisão todos os dias para manter a
            forma dos exercícios que você já aprendeu.
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="font-display text-3xl font-bold tabular-nums text-accent-ink">{lesson.steps.length}</p>
              <p className="eyebrow mt-1 text-[10px]! text-muted">
                {lesson.steps[0].shape ? "Formas tocadas" : "Digitações tocadas"}
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-8 h-12 w-full max-w-sm rounded-control bg-brand text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-[0.98]"
          >
            Voltar à trilha
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
                  tone="accent"
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
                tone="accent"
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
        <div className="mt-5 rounded-card border border-line bg-surface p-3">
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
    <p className={`eyebrow text-muted ${className}`}>
      Digitação alternativa
    </p>
  );
}

// ---------------------------------------------------------------- guide

const GUIDE_SOURCES: GuideSource[] = [
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
      <h2 className="font-display text-[24px] font-bold tracking-[-0.03em] text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

type GuideSource = { label: string; url: string };

/** Shared frame of every guide page: top bar, back button, title, intro, content and sources. */
function GuideLayout({
  title,
  intro,
  sources,
  onBack,
  children,
}: {
  title: string;
  intro: ReactNode;
  sources: GuideSource[];
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        <button
          onClick={onBack}
          className="-ml-2 flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <Icon name="back" className="size-4" /> Voltar à trilha
        </button>

        <p className="eyebrow mt-8 text-accent-ink">Guia</p>
        <h1 className="mt-2 font-display text-[36px] font-bold leading-tight tracking-[-0.04em] sm:text-[46px]">
          {title}
        </h1>
        <p className="mt-4 text-[17px] leading-8 text-ink-2">{intro}</p>

        {children}

        <section className="mt-14 rounded-card border border-line bg-surface p-5">
          <h2 className="eyebrow text-muted">Fontes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-ink underline decoration-brand-line underline-offset-4 transition hover:text-brand hover:decoration-brand"
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

function CagedGuide({ onBack }: { onBack: () => void }) {
  const cMajor = sections[0].trails[0].lessons[0];
  const fretOf = (step: ChordStep) =>
    step.position.baseFret === 1 ? "aberta" : `a partir da casa ${step.position.baseFret}`;
  return (
    <GuideLayout
      title="O sistema CAGED"
      sources={GUIDE_SOURCES}
      onBack={onBack}
      intro={
        <>
          Cinco acordes que você aprende nas primeiras semanas de violão — C, A, G, E e D — escondem
          um mapa do braço inteiro. O CAGED é a forma de ler esse mapa: com ele, qualquer acorde
          pode ser tocado em qualquer tonalidade, em cinco regiões diferentes do braço.
        </>
      }
    >

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
                  <span className="block font-display text-lg font-bold text-ink">Forma {step.shape}</span>
                  <span className="block text-xs font-medium text-muted">{fretOf(step)}</span>
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
    </GuideLayout>
  );
}

// ------------------------------------------------- guide: inversões de tétrades

const INVERSIONS_SOURCES: GuideSource[] = [
  { label: "Jazz Guitar Licks — Major Seventh Chords: Drop 2, Drop 3 and Drop 2 & 4 Voicings", url: "https://www.jazz-guitar-licks.com/pages/chords/major-seventh-chords-jazz-guitar-diagrams.html" },
  { label: "Jazz Guitar Licks — Minor 7th Chord Voicings & Inversions", url: "https://www.jazz-guitar-licks.com/pages/chords/minor-seventh-chords-voicings-jazz-guitar-diagrams-root-positions-inversions.html" },
  { label: "Jazz Guitar Licks — Dominant 7th Chords: Drop 2, Drop 3 and Drop 2-4 Voicings", url: "https://jazz-guitar-licks.com/pages/chords/dominant-7th-chords-voicings-jazz-guitar-diagrams-root-positions-inversions.html" },
  { label: "Hub Guitar — Drop 2 Chords (dom7)", url: "https://www.hubguitar.com/fretboard/drop2-chords-dom7" },
  { label: "Hub Guitar — Drop 3 Chords (dom7)", url: "https://hubguitar.com/fretboard/drop3-chords-dom7" },
  { label: "Premier Guitar — Jazz Drop 2 Chord Lesson", url: "https://www.premierguitar.com/lessons/jazz/jazz-drop-2-chord-lesson" },
  { label: "jazzguitar.be — What is meant by drop 2, drop 3 and inversions?", url: "https://www.jazzguitar.be/forum/comping-chords-chord-progressions/85754-need-general-explanation-what-meant-drop-2-drop-3-inversions.html" },
];

/** The four tetrads of section 2, in C, with their notes and formula. */
const TETRADS = [
  { quality: "Maior com sétima maior", symbol: "C7M", notes: "C · E · G · B", formula: "1 · 3 · 5 · 7", role: "I7M e IV7M de uma tonalidade maior" },
  { quality: "Menor com sétima", symbol: "Cm7", notes: "C · E♭ · G · B♭", formula: "1 · ♭3 · 5 · ♭7", role: "IIm7, IIIm7 e VIm7" },
  { quality: "Sétima dominante", symbol: "C7", notes: "C · E · G · B♭", formula: "1 · 3 · 5 · ♭7", role: "V7, o acorde que pede resolução" },
  { quality: "Meio diminuto", symbol: "Cm7(♭5)", notes: "C · E♭ · G♭ · B♭", formula: "1 · ♭3 · ♭5 · ♭7", role: "VIIm7(♭5) e o IIm7(♭5) do menor" },
];

/** Interval of each pitch class above C, spelled for these four chord qualities. */
const INTERVAL_FROM_C: Record<number, string> = { 0: "1", 3: "♭3", 4: "3", 6: "♭5", 7: "5", 10: "♭7", 11: "7" };

/** Intervals of a C voicing, from the bass up ("3 · 7 · 1 · 5"). */
function intervalsOf(step: ChordStep) {
  return step.position.midi.map((note) => INTERVAL_FROM_C[note % 12] ?? "?").join(" · ");
}

/** Short quality name used as the row label of the diagram tables. */
const QUALITY_LABEL: Record<string, string> = {
  "Acordes maiores": "Maior (7M)",
  "Acordes menores": "Menor (m7)",
  "Acordes de sétima dominante": "Dominante (7)",
  "Acordes meio diminutos": "Meio diminuto (m7♭5)",
};

/**
 * The C lesson of every trail of section 2, grouped by inversion: per chord quality, the
 * main voicing on each bass string (6ª → 4ª), leaving out the alternative fingerings.
 */
function inversionTables() {
  const section = sections[1];
  const tables: Array<{ inversion: string; rows: Array<{ quality: string; steps: ChordStep[] }> }> = [];
  for (const trail of section.trails) {
    const lesson = trail.lessons.find((item) => item.title.startsWith("C")) ?? trail.lessons[0];
    const steps = lesson.steps
      .filter((step) => !step.alternative)
      .sort((a, b) => (b.bassString ?? 0) - (a.bassString ?? 0));
    const inversion = trail.group ?? "";
    let table = tables.find((item) => item.inversion === inversion);
    if (!table) tables.push((table = { inversion, rows: [] }));
    table.rows.push({ quality: QUALITY_LABEL[trail.title] ?? trail.title, steps });
  }
  return tables;
}

function InversionsGuide({ onBack }: { onBack: () => void }) {
  const tables = inversionTables();
  const fretOf = (step: ChordStep) => `casa ${step.position.baseFret}`;
  return (
    <GuideLayout
      title="Inversões de tétrades"
      sources={INVERSIONS_SOURCES}
      onBack={onBack}
      intro={
        <>
          Uma tétrade tem quatro notas, e qualquer uma delas pode ir para o baixo. Trocar a nota mais
          grave muda a cor do acorde e, principalmente, deixa você tocar a mesma harmonia em vários
          lugares do braço, com uma linha de baixo que anda por graus vizinhos em vez de saltar.
        </>
      }
    >
      <GuideSection title="O que é uma tétrade">
        <p>
          A tétrade é a tríade (fundamental, terça e quinta) com mais uma terça empilhada:{" "}
          <strong>a sétima</strong>. A combinação de terça e sétima, maiores ou menores, e de quinta
          justa ou diminuta dá as quatro qualidades que esta seção trabalha. Em C:
        </p>
        <div className="!mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="eyebrow px-4 py-3 font-medium">Qualidade</th>
                <th className="eyebrow px-4 py-3 font-medium">Cifra</th>
                <th className="eyebrow px-4 py-3 font-medium">Notas</th>
                <th className="eyebrow px-4 py-3 font-medium">Fórmula</th>
              </tr>
            </thead>
            <tbody>
              {TETRADS.map((tetrad) => (
                <tr key={tetrad.symbol} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-ink">{tetrad.quality}</span>
                    <span className="block text-xs text-muted">{tetrad.role}</span>
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-ink">{tetrad.symbol}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px]">{tetrad.notes}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-brand-ink">{tetrad.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title="O que é uma inversão">
        <p>
          O que define a inversão é só <strong>a nota mais grave</strong>. As outras três podem vir
          em qualquer ordem por cima. Com quatro notas há quatro possibilidades:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Estado fundamental:</strong> a fundamental no baixo (C7M). É o que você tocou na
            Seção 1.
          </li>
          <li>
            <strong>1ª inversão:</strong> a terça no baixo (C7M/E, Cm7/E♭).
          </li>
          <li>
            <strong>2ª inversão:</strong> a quinta no baixo (C7M/G, Cm7(♭5)/G♭).
          </li>
          <li>
            <strong>3ª inversão:</strong> a sétima no baixo (C7M/B, C7/B♭). É a mais instável das
            quatro: a sétima no grave pede resolução, e o baixo costuma descer um grau, como em
            C7/B♭ → F7M/A.
          </li>
        </ul>
        <p>
          Na cifra, a inversão aparece com uma barra seguida da nota do baixo: <strong>C7/E</strong>{" "}
          se lê “C sete com baixo em mi”.
        </p>
      </GuideSection>

      <GuideSection title="Como as formas são montadas">
        <p>
          No piano, a tétrade fechada (as quatro notas o mais juntas possível) é natural. No violão
          ela quase sempre exige uma abertura impossível de mão. A solução clássica é o{" "}
          <strong>drop 2</strong>: pegar a forma fechada e descer uma oitava a segunda nota mais
          aguda. O acorde fica mais aberto, cabe em <strong>quatro cordas vizinhas</strong> e
          continua com as mesmas quatro notas.
        </p>
        <p>
          Cada aula desta seção mostra o acorde em três grupos de cordas, um para cada corda do
          baixo: <strong>6ª</strong> (cordas 6 a 3), <strong>5ª</strong> (5 a 2) e{" "}
          <strong>4ª</strong> (4 a 1). Algumas aulas trazem também uma{" "}
          <strong>digitação alternativa</strong> que pula uma corda: é o <strong>drop 3</strong>,
          em que a terceira nota mais aguda é que desce a oitava. Ela soa mais aberta e é muito
          usada com o baixo na 6ª e na 5ª corda.
        </p>
      </GuideSection>

      <GuideSection title="As formas em C">
        <p>
          Abaixo, as formas principais de cada inversão em C, para as quatro qualidades e as três
          cordas do baixo. Embaixo de cada diagrama estão as notas do acorde lidas do baixo para o
          agudo, como intervalos: <strong>1</strong> é a fundamental, <strong>3</strong> a terça,{" "}
          <strong>5</strong> a quinta e <strong>7</strong> a sétima.
        </p>
        {tables.map((table) => (
          <div key={table.inversion} className="!mt-10">
            <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">{table.inversion}</h3>
            <div className="mt-4 space-y-6">
              {table.rows.map((row) => (
                <div key={row.quality}>
                  <p className="eyebrow text-brand-ink">{row.quality}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
                    {row.steps.map((step) => (
                      <figure
                        key={`${step.chord}-${step.bassString}`}
                        className="flex min-w-0 flex-col items-center gap-1 rounded-card border border-line bg-surface px-1 pb-3 pt-3"
                      >
                        <figcaption className="text-center">
                          <span className="block font-display text-[15px] font-bold leading-tight text-ink sm:text-lg">
                            {step.chord}
                          </span>
                          <span className="block text-[11px] font-medium text-muted sm:text-xs">
                            Baixo na {step.bassString}ª · {fretOf(step)}
                          </span>
                        </figcaption>
                        <ChordDiagram step={step} activeStrings={[]} />
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-brand-ink sm:text-xs">
                          {intervalsOf(step)}
                        </span>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </GuideSection>

      <GuideSection title="Uma nota de diferença">
        <p>
          Compare as quatro qualidades na mesma inversão e na mesma corda do baixo: o desenho quase
          não muda. De uma qualidade para a próxima, <strong>uma única nota desce um semitom</strong>{" "}
          (uma casa):
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Maior → dominante:</strong> a sétima maior desce para a sétima menor (B → B♭).
          </li>
          <li>
            <strong>Dominante → menor:</strong> a terça maior desce para a terça menor (E → E♭).
          </li>
          <li>
            <strong>Menor → meio diminuto:</strong> a quinta justa desce para a quinta diminuta (G → G♭).
          </li>
        </ul>
        <p>
          Por isso vale aprender cada desenho junto com os intervalos dele: sabendo onde estão a
          terça, a quinta e a sétima, você troca de qualidade movendo um dedo, sem decorar um
          desenho novo.
        </p>
      </GuideSection>

      <GuideSection title="Para que servem">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Condução de vozes.</strong> Escolhendo a inversão certa, a passagem de um acorde
            para o outro move cada voz o mínimo possível. Num II–V–I, por exemplo, a sétima de um
            acorde costuma descer meio tom e virar a terça do seguinte.
          </li>
          <li>
            <strong>Linhas de baixo.</strong> Inversões criam baixos que andam por grau conjunto,
            como C7M → C7M/B → Am7 (dó, si, lá) ou C7 → C7/B♭ → F7M/A (dó, si bemol, lá).
          </li>
          <li>
            <strong>Tudo na mesma região.</strong> Com as três inversões e o estado fundamental, um
            acorde aparece em quatro lugares de cada grupo de cordas, e você acompanha uma música
            inteira sem sair de uma região do braço.
          </li>
          <li>
            <strong>Cor.</strong> Com a terça ou a sétima no baixo, o acorde soa menos “parado” que no
            estado fundamental, o que dá movimento ao acompanhamento.
          </li>
        </ul>
      </GuideSection>

      <GuideSection title="Como estudar com este app">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            A seção está organizada por inversão e, dentro de cada uma, pelas quatro qualidades de
            tétrade.
          </li>
          <li>
            Cada aula é uma tonalidade, no ciclo de quartas: o acorde com o baixo na 4ª, na 5ª e na
            6ª corda, ordenado pela posição no braço, do mais grave para o mais agudo.
          </li>
          <li>
            Monte cada forma e diga em voz alta qual nota está no baixo. Depois, toque as formas em
            sequência no exercício final, no andamento do metrônomo.
          </li>
          <li>
            Quando uma forma estiver firme, troque a qualidade movendo um único dedo, como no item
            “Uma nota de diferença”.
          </li>
        </ol>
      </GuideSection>
    </GuideLayout>
  );
}

export default function App() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [guideSection, setGuideSection] = useState<number | null>(null);
  const outline = useOutline();
  const trailSections = applyProgress(sections, progress);

  function completeLesson(lesson: Lesson, bpm: number) {
    setProgress((current) => {
      const next = { ...current, [lesson.id]: { bpm, completedAt: new Date().toISOString() } };
      saveProgress(next);
      return next;
    });
  }

  if (guideSection !== null) {
    const Guide = guideSection === 2 ? InversionsGuide : CagedGuide;
    return <Guide onBack={() => setGuideSection(null)} />;
  }

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
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <div className="space-y-6 sm:space-y-8">
          {trailSections.map((section) => (
            <PathSection
              key={section.id}
              section={section}
              openKeys={outline.open}
              onToggle={outline.toggle}
              onSelect={setSelectedLesson}
              onOpenGuide={() => {
                setGuideSection(section.id);
                window.scrollTo(0, 0);
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
