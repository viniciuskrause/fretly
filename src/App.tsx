import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import {
  barreSpans,
  chordLabel,
  soundingStrings,
  rootPitchClass,
  stringDegree,
  stringFrequency,
  type ChordPosition,
  type ChordStep,
} from "./chords.ts";
import { sections, type Lesson, type Section, type Trail as TrailData } from "./lessons.ts";
import { applyProgress, loadProgress, saveProgress, type Progress } from "./progress.ts";
import { chordName, useI18n, type Lang, type Localized } from "./i18n.tsx";
import { useSession } from "./auth/supabase.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { saveResultToAccount, syncProgress } from "./auth/progressSync.ts";

/** App name; links to the homepage in the current language (en at the site root, pt in pt/). */
function Brand() {
  const { lang, t } = useI18n();
  return (
    <a
      href={lang === "pt" ? "../pt/" : "../"}
      aria-label={t("Guitar Workouts for Nerds: página inicial", "Guitar Workouts for Nerds: homepage")}
      className="flex items-center"
    >
      <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
        Guitar Workouts <span className="text-accent-ink">for Nerds</span>
      </span>
    </a>
  );
}

const DICTIONARY_HASH = "#dicionario";

/** "#dicionario" or one of its anchors ("#dicionario/acordes-menores"). */
const isDictionaryHash = (hash: string) => hash === DICTIONARY_HASH || hash.startsWith(`${DICTIONARY_HASH}/`);

/** Section anchored by the URL ("#dicionario/acordes-menores" → "acordes-menores"). */
const dictionaryAnchor = (hash: string) => (hash.startsWith(`${DICTIONARY_HASH}/`) ? hash.slice(DICTIONARY_HASH.length + 1) : null);

/** Header link to the chord dictionary (a plain hash link, so it works from any page). */
function DictionaryLink() {
  const { t } = useI18n();
  const current = isDictionaryHash(window.location.hash);
  return (
    <a
      href={DICTIONARY_HASH}
      aria-current={current ? "page" : undefined}
      aria-label={t("Dicionário de Acordes", "Chord Dictionary")}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-control px-2 text-base font-semibold transition-colors hover:text-brand-ink sm:px-3 ${
        current ? "text-brand-ink" : "text-ink-2"
      }`}
    >
      <Icon name="dictionary" className="size-5 sm:hidden" />
      <span className="hidden sm:inline">{t("Dicionário de Acordes", "Chord Dictionary")}</span>
    </a>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-3 px-4 pt-2 sm:h-[88px] sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-3 sm:items-baseline sm:gap-10">
          <Brand />
          <DictionaryLink />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}

type TrailStatus = Lesson["status"];

/** Done/total counter shown on section and trail headers. */
function doneCount(lessons: Lesson[]) {
  return `${lessons.filter((lesson) => lesson.status === "done").length}/${lessons.length}`;
}

const doneShareOf = (lessons: Lesson[]) =>
  lessons.length ? lessons.filter((lesson) => lesson.status === "done").length / lessons.length : 0;

/** Chord of a key variation without its bass ("C7M/E" → "C7M"). */
const variationChord = (lesson: Lesson) => lesson.steps[0].chord.split("/")[0];

/** Key of a variation: the root of its chord ("B♭m7" → "B♭"). */
const variationKey = (lesson: Lesson) => variationChord(lesson).match(/^[A-G][♯♭]?/)?.[0] ?? lesson.title.pt;

/** Chord quality shown on the lesson icon ("7M", "m7", "ø"; a plain major triad is "M"). */
function lessonSymbol(trail: TrailData) {
  const first = trail.lessons[0];
  if (!first) return "";
  const suffix = variationChord(first).slice(variationKey(first).length);
  return suffix === "" ? "M" : suffix.replace("m7(♭5)", "ø");
}

/** A lesson is done once every key is done; it is current while it holds the current variation. */
function lessonStatus(trail: TrailData): TrailStatus {
  if (trail.lessons.every((lesson) => lesson.status === "done")) return "done";
  if (trail.lessons.some((lesson) => lesson.status === "current")) return "current";
  return "locked";
}

/** The variation the big icon opens: the first key not done yet (the first key once all are done). */
const nextVariation = (trail: TrailData) =>
  trail.lessons.find((lesson) => lesson.status !== "done") ?? trail.lessons[0];

const HUB_SIZE = 148;
const RING_RADIUS = 64;
/** Gap between two key segments of the ring, in degrees. */
const SEGMENT_GAP = 5;

/** Arc of the ring for key `index` of `count`, clockwise from the top. */
function segmentPath(index: number, count: number) {
  const center = HUB_SIZE / 2;
  const span = 360 / count;
  const start = -90 + index * span + SEGMENT_GAP / 2;
  const end = start + span - SEGMENT_GAP;
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${center + RING_RADIUS * Math.cos(radians)} ${center + RING_RADIUS * Math.sin(radians)}`;
  };
  return `M${point(start)} A${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${point(end)}`;
}

/**
 * One lesson (a trail): a big icon with the chord quality inside a ring split
 * into 12 segments, one per key in cycle-of-fourths order (C at the top, then
 * clockwise). A segment is blue once its key is done, orange for the key to
 * practise next; clicking it opens that key.
 */
function LessonHub({ trail, onSelect }: { trail: TrailData; onSelect: (lesson: Lesson) => void }) {
  const { t, l, lang } = useI18n();
  const status = lessonStatus(trail);
  const next = nextVariation(trail);
  const center = HUB_SIZE / 2;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: HUB_SIZE, height: HUB_SIZE }}>
        <svg className="lesson-hub__ring" viewBox={`0 0 ${HUB_SIZE} ${HUB_SIZE}`}>
          {trail.lessons.map((lesson, index) => {
            const bpm = lesson.status === "done" && lesson.lastBpm !== undefined ? ` · ${lesson.lastBpm} BPM` : "";
            const segmentStatus = lesson.status === "done" ? "done" : status === "current" && lesson.id === next.id ? "next" : "todo";
            const label = `${l(lesson.title)}${lesson.status === "done" ? t(" (feita)", " (done)") : ""}${bpm}`;
            return (
              <path
                key={lesson.id}
                d={segmentPath(index, trail.lessons.length)}
                className={`lesson-hub__segment lesson-hub__segment--${segmentStatus}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => onSelect(lesson)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(lesson);
                  }
                }}
              >
                <title>{label}</title>
              </path>
            );
          })}
        </svg>
        <button
          className={`lesson-hub lesson-hub--${status}`}
          style={{ left: center, top: center }}
          onClick={() => onSelect(next)}
          aria-label={t(
            `${l(trail.title)}: praticar ${variationKey(next)} (${doneCount(trail.lessons)} tonalidades feitas)`,
            `${l(trail.title)}: practise ${variationKey(next)} (${doneCount(trail.lessons)} keys done)`,
          )}
        >
          <span className="lesson-hub__symbol">{chordName(lessonSymbol(trail), lang)}</span>
          {status === "done" && (
            <span className="trail-node__badge">
              <Icon name="check" className="size-4 [stroke-width:3.5]" />
            </span>
          )}
        </button>
      </div>
      <p className={`trail-label trail-label--${status} mt-2 max-w-none`}>{l(trail.title)}</p>
    </div>
  );
}

/** Consecutive trails of a section that share a group (or that have none). */
function trailBlocks(section: Section) {
  const blocks: Array<{ group?: Localized; items: Array<{ trail: TrailData; index: number }> }> = [];
  section.trails.forEach((trail, index) => {
    const last = blocks.at(-1);
    if (last && last.group?.pt === trail.group?.pt) last.items.push({ trail, index });
    else blocks.push({ group: trail.group, items: [{ trail, index }] });
  });
  return blocks;
}

type TrailSegment = { d: string; status: TrailStatus };

/**
 * Every lesson of a module ("módulo") in one container, on a serpentine trail: two lessons
 * per row on wide screens (left → right, then right → left), one per row on
 * phones. Group headings ("1ª inversão: baixo na terça") sit on the trail
 * between their lessons. The trail is drawn from the measured hub positions.
 */
function UnitTrail({ section, onSelect }: { section: Section; onSelect: (lesson: Lesson) => void }) {
  const { l } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [segments, setSegments] = useState<TrailSegment[]>([]);
  const trails = section.trails;

  // Grid placement on wide screens: headings take a full row, lessons fill rows of two, alternating direction.
  let row = 0;
  let hubRow = 0;
  const placed: Array<
    { kind: "heading"; title: string; row: number } | { kind: "hub"; trail: TrailData; index: number; row: number; column: number }
  > = [];
  trailBlocks(section).forEach((block) => {
    if (block.group) placed.push({ kind: "heading", title: l(block.group), row: ++row });
    block.items.forEach(({ trail, index }, position) => {
      if (position % 2 === 0) {
        row += 1;
        hubRow += 1;
      }
      const leftToRight = hubRow % 2 === 1;
      placed.push({ kind: "hub", trail, index, row, column: leftToRight ? 1 + (position % 2) : 2 - (position % 2) });
    });
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const boxes = hubRefs.current.slice(0, trails.length).map((element) => {
        const circle = element?.firstElementChild?.getBoundingClientRect();
        const block = element?.getBoundingClientRect();
        if (!circle || !block) return null;
        return {
          x: circle.left + circle.width / 2 - origin.left,
          y: circle.top + circle.height / 2 - origin.top,
          top: circle.top - origin.top,
          bottom: block.bottom - origin.top,
        };
      });
      const half = HUB_SIZE / 2;
      const next: TrailSegment[] = [];
      boxes.slice(1).forEach((b, i) => {
        const a = boxes[i];
        if (!a || !b) return;
        const status = lessonStatus(trails[i + 1]);
        if (Math.abs(a.y - b.y) < 1) {
          const dir = Math.sign(b.x - a.x);
          next.push({ d: `M${a.x + dir * half} ${a.y} L${b.x - dir * half} ${b.y}`, status });
        } else {
          const midY = (a.bottom + b.top) / 2;
          next.push({ d: `M${a.x} ${a.bottom + 4} C${a.x} ${midY} ${b.x} ${midY} ${b.x} ${b.top - 4}`, status });
        }
      });
      setSegments(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [trails]);

  return (
    <div ref={containerRef} className="unit-trail">
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.d}
            className={segment.status === "locked" ? "stroke-line-strong" : "stroke-brand"}
            strokeDasharray={segment.status === "locked" ? "2 8" : undefined}
          />
        ))}
      </svg>
      {placed.map((item) =>
        item.kind === "heading" ? (
          <h3 key={`h${item.row}`} className="unit-trail__heading" style={{ "--row": item.row } as CSSProperties}>
            <span>{item.title}</span>
          </h3>
        ) : (
          <div
            key={item.index}
            ref={(element) => {
              hubRefs.current[item.index] = element;
            }}
            className="unit-trail__hub"
            style={{ "--row": item.row, "--column": item.column } as CSSProperties}
          >
            <LessonHub trail={item.trail} onSelect={onSelect} />
          </div>
        ),
      )}
    </div>
  );
}

/** Address of a module page ("#modulo/caged"), from the stable lesson keys ("caged/major/C"). */
const MODULE_HASH = "#modulo/";
const moduleSlug = (section: Section) => section.trails[0].lessons[0].key.split("/")[0];

/** Module page open in the URL (#modulo/<slug>); the back button returns to the dashboard. */
function useModuleRoute() {
  const read = () => (window.location.hash.startsWith(MODULE_HASH) ? window.location.hash.slice(MODULE_HASH.length) : null);
  const [slug, setSlug] = useState(read);
  useEffect(() => {
    const sync = () => {
      setSlug(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return slug;
}

/** Progress bar on the blue module cards. */
/** Lessons (trails) of a module finished in all 12 keys. */
const finishedTrails = (trails: TrailData[]) => trails.filter((trail) => lessonStatus(trail) === "done").length;

function ModuleProgress({ section, showCount = true }: { section: Section; /** "x/y aulas" before the bar (module page only). */ showCount?: boolean }) {
  const { t, l } = useI18n();
  const done = finishedTrails(section.trails);
  const total = section.trails.length;
  const doneShare = total ? done / total : 0;
  return (
    <div className="flex items-center gap-3">
      {showCount && (
        <span className="shrink-0 whitespace-nowrap font-mono text-sm font-bold tabular-nums text-white">
          {done}/{total} {total === 1 ? t("aula", "lesson") : t("aulas", "lessons")}
        </span>
      )}
      <div
        className="h-3 flex-1 overflow-hidden rounded-full bg-ink"
        role="progressbar"
        aria-label={t(`Progresso do módulo ${l(section.title)}`, `${l(section.title)} module progress`)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(doneShare * 100)}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${doneShare * 100}%` }} />
      </div>
    </div>
  );
}

/** Dashboard card of a module: the whole card links to the module page. */
function ModuleCard({ section }: { section: Section }) {
  const { l } = useI18n();
  return (
    <a
      href={`${MODULE_HASH}${moduleSlug(section)}`}
      className="group flex flex-col justify-between overflow-hidden rounded-card border border-brand bg-brand p-5 text-white transition-colors hover:border-brand-strong hover:bg-brand-strong sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="block font-display text-[24px] font-bold leading-tight tracking-[-0.03em] sm:text-[26px]">{l(section.title)}</span>
          <span className="mt-1.5 block text-[15px] font-medium leading-relaxed text-brand-soft">{l(section.subtitle)}</span>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center transition-transform group-hover:translate-x-1" aria-hidden="true">
          <Icon name="chevron" className="size-7 -rotate-90" />
        </span>
      </div>
      <div className="mt-5">
        <ModuleProgress section={section} showCount={false} />
      </div>
    </a>
  );
}

/** Dashboard: lessons finished (all 12 keys) across every module. */
function ProgressHighlight({ trails }: { trails: TrailData[] }) {
  const { t } = useI18n();
  const done = finishedTrails(trails);
  const share = trails.length ? done / trails.length : 0;
  return (
    <section aria-labelledby="progress-title" className="flex flex-col rounded-card border border-line bg-surface p-5 sm:p-7">
      <h2 id="progress-title" className="eyebrow eyebrow--lg text-muted">
        {t("Seu progresso", "Your progress")}
      </h2>
      <div className="flex flex-1 flex-col justify-center gap-1.5 py-4">
        <span className="font-display text-[44px] font-bold leading-none tracking-[-0.04em] text-ink sm:text-[52px]">
          {done}
          <span className="text-muted">/{trails.length}</span>
        </span>
        <span className="text-[15px] font-bold text-ink-2">{t("Aulas concluídas", "Lessons completed")}</span>
      </div>
      <div>
        <div
          className="h-3 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-label={t("Aulas concluídas em todos os módulos", "Lessons completed across all modules")}
          aria-valuemin={0}
          aria-valuemax={trails.length}
          aria-valuenow={done}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

/** Dashboard: the next lesson to practice, with its module, and a button that opens it. */
function NextLesson({ sections: all, onSelect }: { sections: Section[]; onSelect: (lesson: Lesson) => void }) {
  const { t, l } = useI18n();
  const section = all.find((item) => item.trails.some((trail) => trail.lessons.some((lesson) => lesson.status === "current")));
  const next = section?.trails.flatMap((trail) => trail.lessons).find((lesson) => lesson.status === "current");
  const started = all.some((item) => item.trails.some((trail) => trail.lessons.some((lesson) => lesson.status === "done")));
  return (
    <section aria-labelledby="next-title" className="flex flex-col rounded-card border border-line bg-surface p-5 sm:p-7">
      <h2 id="next-title" className="eyebrow eyebrow--lg text-muted">
        {t("Próxima aula", "Next lesson")}
      </h2>
      {next && section ? (
        <>
          <div className="mt-3">
            <p className="font-display text-[24px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[26px]">{l(next.title)}</p>
            <p className="mt-1.5 text-[15px] text-ink-2">{l(next.subtitle)}</p>
          </div>
          <div className="mt-auto flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex min-w-0 max-w-full items-center self-start rounded-md bg-sunken px-2.5 py-1 text-[13px] font-medium text-ink-2 sm:self-center">
              <span className="truncate">{l(section.title)}</span>
            </p>
            <button
              onClick={() => onSelect(next)}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-accent px-5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              <Icon name="play" className="size-4" />
              {started ? t("Continuar praticando", "Continue practicing") : t("Começar a praticar", "Start practicing")}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[16px] font-semibold text-ink">{t("Você concluiu todas as aulas!", "You've completed every lesson!")}</p>
      )}
    </section>
  );
}

/** The dashboard: home of the app, with the overall progress and the modules. */
function Dashboard({ sections: all, onSelect }: { sections: Section[]; onSelect: (lesson: Lesson) => void }) {
  const { t } = useI18n();
  const session = useSession();
  const firstName = String(session?.user.user_metadata?.first_name ?? "").trim();
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[36px]">
          {firstName ? t(`Olá, ${firstName}`, `Hey, ${firstName}`) : t("Seu painel", "Your dashboard")}
        </h1>
        <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2">
          <ProgressHighlight trails={all.flatMap((section) => section.trails)} />
          <NextLesson sections={all} onSelect={onSelect} />
        </div>
        <h2 className="mt-10 font-display text-[22px] font-bold tracking-[-0.03em] text-ink">{t("Módulos", "Modules")}</h2>
        <div className="mt-4 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {all.map((section) => (
            <ModuleCard key={section.id} section={section} />
          ))}
        </div>
      </main>
    </div>
  );
}

/** Page of one module: its header (with the guide) and all its lessons on the trail. */
function ModulePage({
  section,
  onSelect,
  onOpenGuide,
}: {
  section: Section;
  onSelect: (lesson: Lesson) => void;
  onOpenGuide: () => void;
}) {
  const { t, l } = useI18n();
  useEffect(() => {
    document.title = `${l(section.title)} – Guitar Workouts for Nerds`;
    return () => {
      document.title = "Guitar Workouts for Nerds";
    };
  }, [section, l]);
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
        <a
          href="./"
          onClick={(event) => {
            // Back to the dashboard without reloading the app.
            event.preventDefault();
            window.history.pushState(null, "", window.location.pathname + window.location.search);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          className="-ml-2 inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <Icon name="back" className="size-4" /> {t("Painel", "Dashboard")}
        </a>
        <section className="mt-3 overflow-hidden rounded-card border border-brand bg-brand p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="eyebrow eyebrow--lg block text-brand-soft">{t("Módulo", "Module")}</span>
              <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-[-0.03em] sm:text-[30px]">{l(section.title)}</h1>
              <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-brand-soft">{l(section.subtitle)}</p>
            </div>
            <button
              onClick={onOpenGuide}
              aria-label={t(`Guia do módulo ${l(section.title)}`, `${l(section.title)} module guide`)}
              title={t("Guia", "Guide")}
              className="flex size-11 shrink-0 items-center justify-center rounded-control text-white transition-opacity hover:opacity-80 active:scale-[0.96] focus-visible:outline-white"
            >
              <Icon name="notebook" className="size-6" />
            </button>
          </div>
          <div className="mt-5">
            <ModuleProgress section={section} />
          </div>
        </section>
        <div className="pt-3">
          <UnitTrail section={section} onSelect={onSelect} />
        </div>
      </main>
    </div>
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

/** "Cm7(♭5)/E♭" and the like are too wide for the big size on phones. */
function isLongChordName(step: ChordStep) {
  return step.chord.length > 8;
}

/**
 * The standard representation of a chord: symbol on top, diagram below, in one card.
 * It scales as a unit (see `.chord-card` in index.css); captions go outside the card.
 */
function ChordCard({
  step,
  activeStrings = [],
  className = "",
  cardRef,
  current,
}: {
  step: ChordStep;
  activeStrings?: number[];
  className?: string;
  cardRef?: (node: HTMLDivElement | null) => void;
  /** Marks the card being played (aria-current). */
  current?: boolean;
}) {
  const { lang } = useI18n();
  return (
    <div ref={cardRef} className={`chord-card ${className}`} aria-current={current ? "true" : undefined}>
      <div className="chord-card__body">
        <p className={`chord-card__name ${isLongChordName(step) ? "chord-card__name--long" : ""}`}>{chordName(step.chord, lang)}</p>
        <div className="chord-card__diagram">
          <ChordDiagram step={step} activeStrings={activeStrings} />
        </div>
      </div>
    </div>
  );
}

function ChordDiagram({
  step,
  activeStrings,
}: {
  step: ChordStep;
  activeStrings: number[];
}) {
  const { t, lang } = useI18n();
  const { position } = step;
  const barres = barreSpans(position);
  const barreStrings = new Set(barres.flatMap((barre) => barre.strings));
  return (
    // The view box hugs the drawing with the same 14-unit margin on every side: degree
    // labels (left, from x≈15) to the last fret (x=258), highest dot (y=35) to the
    // base-fret number (y≈218).
    <svg
      width="272"
      height="211"
      viewBox="0 21 272 211"
      fill="none"
      className="block max-w-full"
      aria-label={t(`Diagrama de ${chordLabel(step, lang)}`, `${chordLabel(step, lang)} diagram`)}
      role="img"
    >
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
            {stringDegree(step, string) && (
              <text
                x="31"
                y={diagramRowY(string) + 4.5}
                textAnchor="end"
                fontSize="13"
                fontWeight="700"
                className={`font-mono transition-colors duration-150 ${isActive ? "fill-accent-ink" : "fill-brand-ink"}`}
                aria-label={t(`Grau ${stringDegree(step, string)}`, `Degree ${stringDegree(step, string)}`)}
              >
                {stringDegree(step, string)}
              </text>
            )}
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
          aria-label={t(`${position.baseFret}ª casa`, `Fret ${position.baseFret}`)}
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
            aria-label={t(
              `Pestana na ${position.baseFret + barre.fret - 1}ª casa, cordas ${6 - barre.to} a ${6 - barre.from}`,
              `Barre at fret ${position.baseFret + barre.fret - 1}, strings ${6 - barre.to} to ${6 - barre.from}`,
            )}
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
              aria-label={t(`Dedo ${finger}`, `Finger ${finger}`)}
            >
              {finger}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


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
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-[1040px] items-center gap-4 px-4 pt-5 sm:gap-6 sm:px-10 sm:pt-12">
        <button
          onClick={onExit}
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-sunken hover:text-ink active:scale-95"
          aria-label={t("Voltar ao módulo", "Back to the module")}
        >
          <Icon name="close" className="size-6" />
        </button>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={t("Progresso do exercício", "Exercise progress")}
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

/** Where a lesson sits on the home page: its group (if any), trail and chord symbol. */
type LessonPath = { headings: string[]; chord: string };

/**
 * Path of a lesson for the exercise overline, from the headlines above it:
 * "1ª inversão: baixo na terça - Acordes maiores - C7M".
 */
function lessonPath(lesson: Lesson, lang: Lang): LessonPath {
  const trail = sections.flatMap((section) => section.trails).find((item) => item.lessons.some(({ id }) => id === lesson.id));
  const headings = trail
    ? [trail.group, trail.title].filter((heading): heading is Localized => !!heading).map((heading) => heading[lang])
    : [];
  // The chord without its bass ("C7M/E" → "C7M"); the lesson title is the fallback.
  const chord = lesson.steps[0] ? chordName(lesson.steps[0].chord.split("/")[0], lang) : lesson.title[lang].split(" - ")[0];
  return { headings, chord };
}

/**
 * Uppercase overline with the lesson path; the chord symbol keeps its own case
 * ("Dm7(♭5)" must not read "DM7(♭5)", a major-seventh chord).
 */
function LessonOverline({ path }: { path: LessonPath }) {
  return (
    <>
      {path.headings.map((heading) => `${heading} - `).join("")}
      <span className="normal-case">{path.chord}</span>
    </>
  );
}

function ExerciseHeading({ path, title }: { path: LessonPath; title: string }) {
  return (
    <div className="mx-auto w-full max-w-[600px] text-center">
      <p className="eyebrow eyebrow--lg text-balance text-accent-ink">
        <LessonOverline path={path} />
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
  const { t } = useI18n();
  // Text being typed; null while the field isn't being edited.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (Number.isFinite(value)) onChange(() => clampBpm(value));
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-2 rounded-control bg-surface p-1.5 border border-line" role="group" aria-label={t(`Andamento: ${bpm} BPM`, `Tempo: ${bpm} BPM`)}>
      <div className="flex items-center px-2 text-muted" title="BPM">
        <Icon name="metronome" className="size-5" />
      </div>
      <button
        onClick={() => onChange((value) => clampBpm(value - 4))}
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2 transition hover:bg-line hover:text-ink active:scale-95 disabled:opacity-40 disabled:hover:bg-sunken"
        aria-label={t("Diminuir BPM", "Decrease BPM")}
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
        aria-label={t(`Andamento em BPM (${MIN_BPM} a ${MAX_BPM})`, `Tempo in BPM (${MIN_BPM} to ${MAX_BPM})`)}
        title={t(`Digite o andamento (${MIN_BPM}–${MAX_BPM} BPM)`, `Type the tempo (${MIN_BPM}–${MAX_BPM} BPM)`)}
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
        aria-label={t("Aumentar BPM", "Increase BPM")}
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
  const { t, l, lang } = useI18n();
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
  const path = lessonPath(lesson, lang);
  // Lessons with alternative fingerings keep a caption row under every diagram.
  const hasAlternatives = lesson.steps.some((item) => item.alternative);
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
          <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-success text-white ring-8 ring-success-soft">
            <Icon name="check" className="size-12 [stroke-width:3]" />
          </div>
          <p className="eyebrow eyebrow--lg mt-10 text-accent-ink">{t("Exercício concluído", "Exercise complete")}</p>
          <h1 className="mt-3 text-balance font-display text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-4xl">
            {l(lesson.exerciseTitle)}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted">
            {t(
              "Você percorreu todas as formas desta etapa. Faça a revisão todos os dias para manter a forma dos exercícios que você já aprendeu.",
              "You went through every shape in this step. Review every day to keep the exercises you have already learned in shape.",
            )}
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <div className="rounded-card border border-line bg-surface p-5">
              <p className="font-display text-3xl font-bold tabular-nums text-accent-ink">{lesson.steps.length}</p>
              <p className="eyebrow mt-1 text-[10px]! text-muted">
                {lesson.steps[0].shape ? t("Formas tocadas", "Shapes played") : t("Digitações tocadas", "Fingerings played")}
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="mt-8 h-12 w-full max-w-sm rounded-control bg-brand text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-[0.98]"
          >
            {t("Voltar ao módulo", "Back to the module")}
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
              label={t("Voltar", "Back")}
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
                  <SecondaryButton label={t("Repetir", "Repeat")} icon="replay" onClick={startChordSequence} />
                  <PrimaryButton
                    label={t("Concluir", "Finish")}
                    onClick={() => {
                      onComplete(sequenceBpm.current ?? bpm);
                      setComplete(true);
                    }}
                  />
                </>
              ) : (
                <PrimaryButton
                  label={
                    sequenceStatus === "countdown"
                      ? t("Preparando", "Get ready")
                      : isPlaying
                        ? t("Tocando", "Playing")
                        : t("Iniciar", "Start")
                  }
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
        <ExerciseHeading path={path} title={t("Sequência completa", "Full sequence")} />

        <div className="relative mt-12">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {lesson.steps.map((chordStep, index) => {
              const isSounding = sequenceStatus === "playing" && index === sequenceIndex;
              const isDimmed = isPlaying && !isSounding;
              return (
                <div key={`${chordStep.chord}-${index}`} className="sequence-slot">
                  <ChordCard
                    step={chordStep}
                    activeStrings={isSounding ? soundingStrings(chordStep.position) : []}
                    current={isSounding}
                    cardRef={(node) => {
                      // Keep the chord being played on screen (the grid scrolls on phones).
                      if (node && isSounding) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }}
                    className={`sequence-card ${isSounding ? "sequence-card--sounding" : ""} ${isDimmed ? "sequence-card--dimmed" : ""}`}
                  />
                  {hasAlternatives && (
                    <AlternativeSlot className="mt-1.5 text-[10px]!" show={!!chordStep.alternative} />
                  )}
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
            label={t("Anterior", "Previous")}
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
                <SecondaryButton label={t("Repetir", "Repeat")} icon="replay" onClick={startPlayback} />
                <PrimaryButton
                  label={stepIndex === lesson.steps.length - 1 ? t("Exercício final", "Final exercise") : t("Próximo", "Next")}
                  onClick={nextStep}
                />
              </>
            ) : (
              <PrimaryButton
                label={isPlaying ? t("Tocando", "Playing") : t("Tocar", "Play")}
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
        path={path}
        title={t(
          `Monte ${chordLabel(step, lang)} e toque corda por corda.`,
          `Fret ${chordLabel(step, lang)} and play it string by string.`,
        )}
      />

      <div className="mt-12 flex flex-col items-center">
        <ChordCard step={step} activeStrings={activeStrings} className="max-w-[348px]" />
        {hasAlternatives && <AlternativeSlot className="mt-3 text-xs!" show={!!step.alternative} />}
      </div>
    </ExerciseShell>
  );
}

/**
 * Caption under the diagram of an alternative fingering. The row is reserved on every
 * step of a lesson that has alternatives (`show` only toggles visibility), so the
 * caption appearing never moves the rest of the content.
 */
function AlternativeSlot({ show, className = "" }: { show: boolean; className?: string }) {
  const { t } = useI18n();
  return (
    <p
      className={`eyebrow text-center leading-4 text-muted ${show ? "" : "invisible"} ${className}`}
      aria-hidden={!show}
    >
      {t("Digitação alternativa", "Alternative fingering")}
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

function GuideSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-[152px] lg:scroll-mt-[120px]">
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
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        <button
          onClick={onBack}
          className="-ml-2 flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <Icon name="back" className="size-4" /> {t("Voltar ao módulo", "Back to the module")}
        </button>

        <p className="eyebrow eyebrow--lg mt-8 text-accent-ink">{t("Guia", "Guide")}</p>
        <h1 className="mt-2 font-display text-[36px] font-bold leading-tight tracking-[-0.04em] sm:text-[46px]">
          {title}
        </h1>
        <p className="mt-4 text-[17px] leading-8 text-ink-2">{intro}</p>

        {children}

        <section className="mt-14 rounded-card border border-line bg-surface p-5">
          <h2 className="eyebrow text-muted">{t("Fontes", "Sources")}</h2>
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
  const { t } = useI18n();
  const cMajor = sections[0].trails[0].lessons[0];
  const fretOf = (step: ChordStep) =>
    step.position.baseFret === 1
      ? t("aberta", "open")
      : t(`a partir da casa ${step.position.baseFret}`, `from fret ${step.position.baseFret}`);
  return (
    <GuideLayout
      title={t("O sistema CAGED", "The CAGED system")}
      sources={GUIDE_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          Cinco acordes que você aprende nas primeiras semanas de violão — C, A, G, E e D — escondem
          um mapa do braço inteiro. O CAGED é a forma de ler esse mapa: com ele, qualquer acorde
          pode ser tocado em qualquer tonalidade, em cinco regiões diferentes do braço.
        </>,
        <>
          Five chords you learn in your first weeks on the guitar — C, A, G, E and D — hide a map of
          the whole neck. CAGED is the way to read that map: with it, any chord can be played in any
          key, in five different regions of the neck.
        </>,
      )}
    >
      <GuideSection title={t("O que é", "What it is")}>
        {t(
          <>
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
          </>,
          <>
            <p>
              CAGED is a way of organising the guitar neck around the five open-chord shapes:{" "}
              <strong>C, A, G, E and D</strong> — hence the name. Each shape can be moved up the neck
              and stays the same pattern; only the key changes. Chained together, the five shapes
              cover the neck from end to end.
            </p>
            <p>
              Nobody agrees on who created the system. Many teachers point out that nobody invented
              it: it is a consequence of the instrument's standard tuning, which someone at some point
              organised and named. That is also why it only works in standard tuning (E A D G B E).
            </p>
          </>,
        )}
      </GuideSection>

      <GuideSection title={t("A lógica", "The logic")}>
        {t(
          <>
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
          </>,
          <>
            <p>
              When you move an open shape up the neck, your <strong>index finger takes the place of
              the nut</strong>: it holds down, at the base fret, the strings that used to be open, and
              the other fingers rebuild the pattern. That is how open E becomes F at fret 1, and open A
              becomes C at fret 3.
            </p>
            <p>
              Going up the neck, the shapes always come in the order <strong>C → A → G → E → D</strong>{" "}
              and then start again an octave higher. Each one locks into the next, sharing notes. In
              another key only the starting point changes: F starts on the E shape and goes E → D → C →
              A → G. Here is C major in all five shapes:
            </p>
          </>,
        )}
        <div className="!mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
          {cMajor.steps.map((step) => (
            <figure key={step.shape} className="sequence-slot guide-shape">
              <ChordCard step={step} />
              <figcaption className="mt-2 text-center">
                <span className="block font-display text-[15px] font-bold text-ink">
                  {t(`Forma ${step.shape}`, `${step.shape} shape`)}
                </span>
                <span className="block text-xs font-medium text-muted">{fretOf(step)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </GuideSection>

      <GuideSection title={t("Vantagens", "Advantages")}>
        {t(
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
          </ul>,
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>The whole neck with what you already know.</strong> The five shapes are chords
              every beginner knows; CAGED just shows where each one can go.
            </li>
            <li>
              <strong>Any chord, in any key, anywhere.</strong> Once you find the root, you can build
              the chord in five different regions and pick the one closest to where your hand already
              is.
            </li>
            <li>
              <strong>Transposing becomes simple.</strong> Changing key means moving the same pattern;
              the shape does not change.
            </li>
            <li>
              <strong>A bridge to scales and solos.</strong> Each shape anchors the arpeggios, the
              pentatonic and the major scale of its region, connecting chords and melody.
            </li>
            <li>
              <strong>Less rote memorisation.</strong> Instead of memorising hundreds of fingerings,
              you learn five patterns and the rule that links them.
            </li>
          </ul>,
        )}
      </GuideSection>

      <GuideSection title={t("Limites e cuidados", "Limits and caveats")}>
        {t(
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
          </ul>,
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Shapes do not replace notes.</strong> A common trap is playing patterns without
              knowing which notes they contain. Always find the root and the third of each shape.
            </li>
            <li>
              <strong>Standard tuning only.</strong> In alternate tunings the patterns change.
            </li>
            <li>
              <strong>Some full shapes are hard to play.</strong> That is why the lessons use playable
              fingerings of each shape: sometimes a string is muted, but the root stays in the bass.
            </li>
          </ul>,
        )}
      </GuideSection>

      <GuideSection title={t("Como estudar com este app", "How to study with this app")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Cada aula é um tipo de acorde, com uma variação para cada uma das 12 tonalidades: o
              acorde nas cinco formas, da mais grave para a mais aguda.
            </li>
            <li>Monte cada forma e toque corda por corda; o título diz o acorde e a forma.</li>
            <li>No exercício final, toque as cinco formas em sequência, no andamento do metrônomo.</li>
            <li>Suba o andamento aos poucos: o app guarda o BPM da sua última execução.</li>
            <li>
              Depois dos acordes maiores vêm os menores, os de sétima dominante e os meio diminutos,
              sempre pela mesma lógica.
            </li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Each lesson is one chord type, with a variation for each of the 12 keys: the chord in
              all five shapes, from the lowest to the highest.
            </li>
            <li>Fret each shape and play it string by string; the title names the chord and the shape.</li>
            <li>In the final exercise, play the five shapes in sequence, in time with the metronome.</li>
            <li>Raise the tempo little by little: the app keeps the BPM of your last run.</li>
            <li>
              After the major chords come the minor, dominant seventh and half-diminished chords,
              always following the same logic.
            </li>
          </ol>,
        )}
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
const TETRADS: Array<{ quality: Localized; symbol: string; notes: string; formula: string; role: Localized }> = [
  {
    quality: { pt: "Maior com sétima maior", en: "Major seventh" },
    symbol: "C7M",
    notes: "C · E · G · B",
    formula: "1 · 3 · 5 · 7",
    role: { pt: "I7M e IV7M de uma tonalidade maior", en: "Imaj7 and IVmaj7 of a major key" },
  },
  {
    quality: { pt: "Menor com sétima", en: "Minor seventh" },
    symbol: "Cm7",
    notes: "C · E♭ · G · B♭",
    formula: "1 · ♭3 · 5 · ♭7",
    role: { pt: "IIm7, IIIm7 e VIm7", en: "IIm7, IIIm7 and VIm7" },
  },
  {
    quality: { pt: "Sétima dominante", en: "Dominant seventh" },
    symbol: "C7",
    notes: "C · E · G · B♭",
    formula: "1 · 3 · 5 · ♭7",
    role: { pt: "V7, o acorde que pede resolução", en: "V7, the chord that wants to resolve" },
  },
  {
    quality: { pt: "Meio diminuto", en: "Half-diminished" },
    symbol: "Cm7(♭5)",
    notes: "C · E♭ · G♭ · B♭",
    formula: "1 · ♭3 · ♭5 · ♭7",
    role: { pt: "VIIm7(♭5) e o IIm7(♭5) do menor", en: "VIIm7(♭5) and the IIm7(♭5) of a minor key" },
  },
];

/** Short quality name used as the row label of the diagram tables, keyed by the trail's Portuguese title. */
const QUALITY_LABEL: Record<string, Localized> = {
  "Acordes maiores": { pt: "Maior (7M)", en: "Major (maj7)" },
  "Acordes menores": { pt: "Menor (m7)", en: "Minor (m7)" },
  "Acordes de sétima dominante": { pt: "Dominante (7)", en: "Dominant (7)" },
  "Acordes meio diminutos": { pt: "Meio diminuto (m7♭5)", en: "Half-diminished (m7♭5)" },
  "Tríades maiores": { pt: "Maior", en: "Major" },
  "Tríades menores": { pt: "Menor (m)", en: "Minor (m)" },
  "Tríades diminutas": { pt: "Diminuta (dim)", en: "Diminished (dim)" },
};

const ORDINAL_EN: Record<number, string> = { 4: "4th", 5: "5th", 6: "6th" };

/**
 * The C lesson of every trail of an inversion module (triads: id 3, seventh chords: id 2),
 * grouped by inversion: per chord quality, the main voicing on each bass string (6ª → 4ª),
 * leaving out the alternative fingerings.
 */
function inversionTables(sectionId: number) {
  const section = sections.find((item) => item.id === sectionId)!;
  const tables: Array<{ inversion: Localized; rows: Array<{ quality: Localized; steps: ChordStep[] }> }> = [];
  for (const trail of section.trails.filter((item) => !item.review)) {
    const lesson = trail.lessons.find((item) => item.title.pt.startsWith("C")) ?? trail.lessons[0];
    const steps = lesson.steps
      .filter((step) => !step.alternative)
      .sort((a, b) => (b.bassString ?? 0) - (a.bassString ?? 0));
    const inversion = trail.group ?? { pt: "", en: "" };
    let table = tables.find((item) => item.inversion.pt === inversion.pt);
    if (!table) tables.push((table = { inversion, rows: [] }));
    table.rows.push({ quality: QUALITY_LABEL[trail.title.pt] ?? trail.title, steps });
  }
  return tables;
}

/** Guide tables: per inversion, the C shapes of each quality on the three bass strings. */
function InversionShapeTables({ tables }: { tables: ReturnType<typeof inversionTables> }) {
  const { t, l } = useI18n();
  const fretOf = (step: ChordStep) => t(`casa ${step.position.baseFret}`, `fret ${step.position.baseFret}`);
  return (
    <>
      {tables.map((table) => (
        <div key={table.inversion.pt} className="!mt-10">
          <h3 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">{l(table.inversion)}</h3>
          <div className="mt-4 space-y-6">
            {table.rows.map((row) => (
              <div key={row.quality.pt}>
                <p className="eyebrow text-brand-ink">{l(row.quality)}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
                  {row.steps.map((step) => (
                    <figure key={`${step.chord}-${step.bassString}`} className="min-w-0">
                      <ChordCard step={step} />
                      <figcaption className="mt-1.5 text-center text-[11px] font-medium leading-snug text-muted sm:text-xs">
                        {t(`Baixo na ${step.bassString}ª`, `Bass on the ${ORDINAL_EN[step.bassString ?? 0]}`)} ·{" "}
                        {fretOf(step)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function InversionsGuide({ onBack }: { onBack: () => void }) {
  const { t, l, lang } = useI18n();
  const tables = inversionTables(2);
  const fretOf = (step: ChordStep) => t(`casa ${step.position.baseFret}`, `fret ${step.position.baseFret}`);
  return (
    <GuideLayout
      title={t("Inversões de tétrades", "Seventh chord inversions")}
      sources={INVERSIONS_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          Uma tétrade tem quatro notas, e qualquer uma delas pode ir para o baixo. Trocar a nota mais
          grave muda a cor do acorde e, principalmente, deixa você tocar a mesma harmonia em vários
          lugares do braço, com uma linha de baixo que anda por graus vizinhos em vez de saltar.
        </>,
        <>
          A seventh chord has four notes, and any of them can go in the bass. Changing the lowest note
          changes the colour of the chord and, above all, lets you play the same harmony in several
          places on the neck, with a bass line that moves stepwise instead of leaping.
        </>,
      )}
    >
      <GuideSection title={t("O que é uma tétrade", "What a seventh chord is")}>
        {t(
          <p>
            A tétrade é a tríade (fundamental, terça e quinta) com mais uma terça empilhada:{" "}
            <strong>a sétima</strong>. A combinação de terça e sétima, maiores ou menores, e de quinta
            justa ou diminuta dá as quatro qualidades que este módulo trabalha. Em C:
          </p>,
          <p>
            A seventh chord (a tetrad) is the triad (root, third and fifth) with one more third stacked
            on top: <strong>the seventh</strong>. Combining a major or minor third and seventh with a
            perfect or diminished fifth gives the four qualities this module covers. In C:
          </p>,
        )}
        <div className="!mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="eyebrow px-4 py-3 font-medium">{t("Qualidade", "Quality")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Cifra", "Symbol")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Notas", "Notes")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Fórmula", "Formula")}</th>
              </tr>
            </thead>
            <tbody>
              {TETRADS.map((tetrad) => (
                <tr key={tetrad.symbol} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-ink">{l(tetrad.quality)}</span>
                    <span className="block text-xs text-muted">{l(tetrad.role)}</span>
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-ink">{chordName(tetrad.symbol, lang)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px]">{tetrad.notes}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-brand-ink">{tetrad.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title={t("O que é uma inversão", "What an inversion is")}>
        {t(
          <>
            <p>
              O que define a inversão é só <strong>a nota mais grave</strong>. As outras três podem vir
              em qualquer ordem por cima. Com quatro notas há quatro possibilidades:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Estado fundamental:</strong> a fundamental no baixo (C7M). É o que você tocou no
                módulo Acordes Básicos no CAGED.
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
          </>,
          <>
            <p>
              The only thing that defines the inversion is <strong>the lowest note</strong>. The other
              three can come in any order above it. With four notes there are four possibilities:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Root position:</strong> the root in the bass (Cmaj7). That is what you played in
                the Basic Chords with CAGED module.
              </li>
              <li>
                <strong>1st inversion:</strong> the third in the bass (Cmaj7/E, Cm7/E♭).
              </li>
              <li>
                <strong>2nd inversion:</strong> the fifth in the bass (Cmaj7/G, Cm7(♭5)/G♭).
              </li>
              <li>
                <strong>3rd inversion:</strong> the seventh in the bass (Cmaj7/B, C7/B♭). It is the
                least stable of the four: a seventh in the bass wants to resolve, and the bass usually
                steps down, as in C7/B♭ → Fmaj7/A.
              </li>
            </ul>
            <p>
              In chord symbols, an inversion is written with a slash followed by the bass note:{" "}
              <strong>C7/E</strong> reads “C seven over E”.
            </p>
          </>,
        )}
      </GuideSection>

      <GuideSection title={t("Como as formas são montadas", "How the shapes are built")}>
        {t(
          <>
            <p>
              No piano, a tétrade fechada (as quatro notas o mais juntas possível) é natural. No violão
              ela quase sempre exige uma abertura impossível de mão. A solução clássica é o{" "}
              <strong>drop 2</strong>: pegar a forma fechada e descer uma oitava a segunda nota mais
              aguda. O acorde fica mais aberto, cabe em <strong>quatro cordas vizinhas</strong> e
              continua com as mesmas quatro notas.
            </p>
            <p>
              Cada aula deste módulo mostra o acorde em três grupos de cordas, um para cada corda do
              baixo: <strong>6ª</strong> (cordas 6 a 3), <strong>5ª</strong> (5 a 2) e{" "}
              <strong>4ª</strong> (4 a 1). Algumas aulas trazem também uma{" "}
              <strong>digitação alternativa</strong> que pula uma corda: é o <strong>drop 3</strong>,
              em que a terceira nota mais aguda é que desce a oitava. Ela soa mais aberta e é muito
              usada com o baixo na 6ª e na 5ª corda.
            </p>
          </>,
          <>
            <p>
              On the piano, the close-position seventh chord (all four notes as close together as
              possible) comes naturally. On the guitar it almost always needs an impossible stretch.
              The classic solution is the <strong>drop 2</strong>: take the close shape and drop the
              second-highest note an octave. The chord opens up, fits on{" "}
              <strong>four adjacent strings</strong> and keeps the same four notes.
            </p>
            <p>
              Each lesson in this module shows the chord on three string sets, one for each bass string:{" "}
              <strong>6th</strong> (strings 6 to 3), <strong>5th</strong> (5 to 2) and{" "}
              <strong>4th</strong> (4 to 1). Some lessons also include an{" "}
              <strong>alternative fingering</strong> that skips a string: the <strong>drop 3</strong>,
              where the third-highest note is the one dropped an octave. It sounds more open and is
              widely used with the bass on the 6th and 5th strings.
            </p>
          </>,
        )}
      </GuideSection>

      <GuideSection title={t("As formas em C", "The shapes in C")}>
        {t(
          <p>
            Abaixo, as formas principais de cada inversão em C, para as quatro qualidades e as três
            cordas do baixo. À esquerda de cada diagrama, cada corda que soa mostra o grau da nota:{" "}
            <strong>1</strong> é a fundamental, <strong>3</strong> a terça, <strong>5</strong> a quinta
            e <strong>7</strong> a sétima, com ♭ quando o intervalo é abaixado.
          </p>,
          <p>
            Below are the main shapes of each inversion in C, for the four qualities and the three bass
            strings. To the left of each diagram, every sounding string shows the degree of its note:{" "}
            <strong>1</strong> is the root, <strong>3</strong> the third, <strong>5</strong> the fifth
            and <strong>7</strong> the seventh, with ♭ when the interval is lowered.
          </p>,
        )}
        <InversionShapeTables tables={tables} />
      </GuideSection>

      <GuideSection title={t("Uma nota de diferença", "One note apart")}>
        {t(
          <>
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
          </>,
          <>
            <p>
              Compare the four qualities in the same inversion and on the same bass string: the shape
              barely changes. From one quality to the next, <strong>a single note drops a semitone</strong>{" "}
              (one fret):
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Major → dominant:</strong> the major seventh drops to the minor seventh (B → B♭).
              </li>
              <li>
                <strong>Dominant → minor:</strong> the major third drops to the minor third (E → E♭).
              </li>
              <li>
                <strong>Minor → half-diminished:</strong> the perfect fifth drops to the diminished
                fifth (G → G♭).
              </li>
            </ul>
            <p>
              That is why it pays to learn each shape together with its intervals: knowing where the
              third, fifth and seventh are, you change quality by moving one finger, without memorising
              a new shape.
            </p>
          </>,
        )}
      </GuideSection>

      <GuideSection title={t("Para que servem", "What they are for")}>
        {t(
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
          </ul>,
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Voice leading.</strong> With the right inversion, moving from one chord to the
              next shifts each voice as little as possible. In a II–V–I, for example, the seventh of one
              chord usually drops a half step and becomes the third of the next.
            </li>
            <li>
              <strong>Bass lines.</strong> Inversions create bass lines that move stepwise, such as
              Cmaj7 → Cmaj7/B → Am7 (C, B, A) or C7 → C7/B♭ → Fmaj7/A (C, B♭, A).
            </li>
            <li>
              <strong>Everything in one region.</strong> With root position and the three inversions, a
              chord appears in four places on each string set, so you can accompany a whole song without
              leaving one region of the neck.
            </li>
            <li>
              <strong>Colour.</strong> With the third or the seventh in the bass, the chord sounds less
              “static” than in root position, which gives the accompaniment movement.
            </li>
          </ul>,
        )}
      </GuideSection>

      <GuideSection title={t("Como estudar com este app", "How to study with this app")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              O módulo está organizado por inversão e, dentro de cada uma, pelas quatro qualidades de
              tétrade.
            </li>
            <li>
              Cada aula tem uma variação para cada tonalidade, no ciclo de quartas: o acorde com o
              baixo na 4ª, na 5ª e na 6ª corda, ordenado pela posição no braço, do mais grave para o
              mais agudo.
            </li>
            <li>
              Monte cada forma e diga em voz alta qual nota está no baixo. Depois, toque as formas em
              sequência no exercício final, no andamento do metrônomo.
            </li>
            <li>
              Quando uma forma estiver firme, troque a qualidade movendo um único dedo, como no item
              “Uma nota de diferença”.
            </li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>The module is organised by inversion and, within each one, by the four seventh-chord qualities.</li>
            <li>
              Each lesson has a variation for every key, in the cycle of fourths: the chord with the
              bass on the 4th, 5th and 6th strings, ordered by position on the neck, from lowest to
              highest.
            </li>
            <li>
              Fret each shape and say out loud which note is in the bass. Then play the shapes in
              sequence in the final exercise, in time with the metronome.
            </li>
            <li>
              Once a shape feels solid, change its quality by moving a single finger, as in “One note
              apart”.
            </li>
          </ol>,
        )}
      </GuideSection>
    </GuideLayout>
  );
}

/** Dictionary sections, one per chord quality, named after the home-page trails. */
const TRIAD_SOURCES: GuideSource[] = [
  { label: "Wikipedia — Triad (music)", url: "https://en.wikipedia.org/wiki/Triad_(music)" },
  { label: "Wikipedia — Inversion (music)", url: "https://en.wikipedia.org/wiki/Inversion_(music)" },
];

/** The three triads of the triad-inversion module, in C. */
const TRIADS: Array<{ quality: Localized; symbol: string; notes: string; formula: string }> = [
  { quality: { pt: "Maior", en: "Major" }, symbol: "C", notes: "C E G", formula: "1 3 5" },
  { quality: { pt: "Menor", en: "Minor" }, symbol: "Cm", notes: "C E♭ G", formula: "1 ♭3 5" },
  { quality: { pt: "Diminuta", en: "Diminished" }, symbol: "Cdim", notes: "C E♭ G♭", formula: "1 ♭3 ♭5" },
];

function TriadsGuide({ onBack }: { onBack: () => void }) {
  const { t, l } = useI18n();
  const tables = inversionTables(3);
  return (
    <GuideLayout
      title={t("Inversões de tríades", "Triad inversions")}
      sources={TRIAD_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          A tríade é o acorde mais básico: três notas empilhadas em terças. Trocando a nota que fica no
          baixo, o mesmo acorde ganha três formas em cada grupo de três cordas — um jeito curto de tocar
          qualquer acorde em qualquer região do braço.
        </>,
        <>
          The triad is the most basic chord: three notes stacked in thirds. By changing which note sits
          in the bass, the same chord gets three shapes on every set of three strings — a short way to
          play any chord anywhere on the neck.
        </>,
      )}
    >
      <GuideSection title={t("O que é uma tríade", "What a triad is")}>
        {t(
          <p>
            Uma tríade tem a <strong>fundamental</strong>, a <strong>terça</strong> e a{" "}
            <strong>quinta</strong>. A terça maior ou menor e a quinta justa ou diminuta dão as três
            qualidades que este módulo trabalha. Em C:
          </p>,
          <p>
            A triad has the <strong>root</strong>, the <strong>third</strong> and the{" "}
            <strong>fifth</strong>. A major or minor third and a perfect or diminished fifth give the
            three qualities this module covers. In C:
          </p>,
        )}
        <div className="!mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="eyebrow px-4 py-3 font-medium">{t("Qualidade", "Quality")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Cifra", "Symbol")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Notas", "Notes")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Fórmula", "Formula")}</th>
              </tr>
            </thead>
            <tbody>
              {TRIADS.map((triad) => (
                <tr key={triad.symbol} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">{l(triad.quality)}</td>
                  <td className="px-4 py-3 font-mono text-ink">{triad.symbol}</td>
                  <td className="px-4 py-3 text-ink-2">{triad.notes}</td>
                  <td className="px-4 py-3 font-mono text-ink-2">{triad.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title={t("O que é uma inversão", "What an inversion is")}>
        {t(
          <>
            <p>
              O que define a inversão é só <strong>a nota mais grave</strong>. Com três notas há três
              possibilidades:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Ordem direta:</strong> a fundamental no baixo (C).
              </li>
              <li>
                <strong>1ª inversão:</strong> a terça no baixo (C/E, Cm/E♭).
              </li>
              <li>
                <strong>2ª inversão:</strong> a quinta no baixo (C/G, Cdim/G♭).
              </li>
            </ul>
            <p>A cifra com barra mostra a nota do baixo: C/E é o acorde de C com o E na nota mais grave.</p>
          </>,
          <>
            <p>
              The only thing that defines the inversion is <strong>the lowest note</strong>. With three
              notes there are three options:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Root position:</strong> the root in the bass (C).
              </li>
              <li>
                <strong>1st inversion:</strong> the third in the bass (C/E, Cm/E♭).
              </li>
              <li>
                <strong>2nd inversion:</strong> the fifth in the bass (C/G, Cdim/G♭).
              </li>
            </ul>
            <p>A slash chord names the bass note: C/E is a C chord with E as its lowest note.</p>
          </>,
        )}
      </GuideSection>

      <GuideSection title={t("As formas em C", "The shapes in C")}>
        {t(
          <p>
            Cada forma usa três cordas vizinhas, com as notas na ordem mais fechada possível. Abaixo, as
            formas em C das três qualidades, com o baixo na 6ª, 5ª e 4ª corda. À esquerda de cada
            diagrama, cada corda que soa mostra o grau da nota: <strong>1</strong> é a fundamental,{" "}
            <strong>3</strong> a terça e <strong>5</strong> a quinta, com ♭ quando o intervalo é abaixado.
          </p>,
          <p>
            Every shape uses three neighbouring strings, with the notes as close together as possible.
            Below are the C shapes of the three qualities, with the bass on the 6th, 5th and 4th string.
            To the left of each diagram, every sounding string shows the degree of its note:{" "}
            <strong>1</strong> is the root, <strong>3</strong> the third and <strong>5</strong> the fifth,
            with ♭ when the interval is lowered.
          </p>,
        )}
        <InversionShapeTables tables={tables} />
      </GuideSection>

      <GuideSection title={t("Como estudar com este app", "How to study with this app")}>
        {t(
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Cada aula é uma qualidade numa inversão, nas 12 tonalidades; cada tonalidade traz a forma
              com o baixo na 6ª, 5ª e 4ª corda, da mais perto da pestana para a mais perto do corpo.
            </li>
            <li>O exercício final toca as três formas em sequência, no andamento do metrônomo.</li>
            <li>
              Diga em voz alta a nota do baixo antes de tocar: é ela que muda de uma inversão para outra.
            </li>
            <li>
              Algumas formas da tríade diminuta pedem uma abertura grande entre os dedos; vá devagar.
            </li>
          </ul>,
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Each lesson is one quality in one inversion, in all 12 keys; each key has the shape with the
              bass on the 6th, 5th and 4th string, from the one nearest the nut to the one nearest the body.
            </li>
            <li>The final exercise plays the three shapes in sequence, at the metronome tempo.</li>
            <li>Say the bass note out loud before you play: it is what changes from one inversion to the next.</li>
            <li>Some diminished-triad shapes need a wide stretch between the fingers; take it slowly.</li>
          </ul>,
        )}
      </GuideSection>
    </GuideLayout>
  );
}

const DICTIONARY_QUALITIES: Array<{ trails: string[]; title: Localized }> = [
  { trails: ["Acordes maiores", "Tríades maiores"], title: { pt: "Acordes maiores", en: "Major chords" } },
  { trails: ["Acordes menores", "Tríades menores"], title: { pt: "Acordes menores", en: "Minor chords" } },
  { trails: ["Acordes de sétima dominante"], title: { pt: "Acordes dominantes", en: "Dominant chords" } },
  { trails: ["Acordes meio diminutos"], title: { pt: "Acordes meio diminutos", en: "Half-diminished chords" } },
  { trails: ["Tríades diminutas"], title: { pt: "Acordes diminutos", en: "Diminished chords" } },
];

/** The 12 keys of the dictionary's key selector, chromatic from C (pitch class = index). */
const DICTIONARY_KEYS = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

/**
 * Every fingering of the app in one key (pitch class of the root), by quality: for each
 * trail of that quality, its lesson in that key becomes a group (CAGED shapes, then each
 * inversion), in lesson order. Chord spellings come from the lessons (e.g. C♯m on D♭).
 */
function dictionaryOf(key: number) {
  return DICTIONARY_QUALITIES.map(({ trails: trailTitles, title }) => ({
    title,
    groups: sections.flatMap((section) =>
      section.trails
        .filter((trail) => trailTitles.includes(trail.title.pt) && !trail.review)
        .flatMap((trail) => {
          const lesson = trail.lessons.find((item) => item.steps.length && rootPitchClass(item.steps[0].chord) === key);
          if (!lesson) return [];
          return [{ key: `${section.id}-${trail.group?.pt ?? ""}`, steps: lesson.steps }];
        }),
    ),
  }));
}

/** Key drop-down of the chord dictionary (C by default). */
function KeySelect({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (key: number) => void;
  /** Phone menu row: no visible label, shorter control. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <label className={`block ${compact ? "shrink-0" : ""}`}>
      <span className={compact ? "sr-only" : "mb-2 block px-3 text-sm font-semibold text-ink-2"}>{t("Tonalidade", "Key")}</span>
      {/* Indented like the label (and the menu links' text) so they share one left edge. */}
      <span className={`relative block ${compact ? "" : "mx-3"}`}>
        <select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`w-full cursor-pointer appearance-none rounded-control border border-line-strong bg-surface font-display font-semibold text-ink transition-colors hover:border-subtle ${
            compact ? "h-9 pl-3 pr-8 text-sm" : "h-11 pl-3 pr-10 text-[15px]"
          }`}
        >
          {DICTIONARY_KEYS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <Icon
          name="chevron"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-2 ${compact ? "right-2 size-4" : "right-3 size-5"}`}
        />
      </span>
    </label>
  );
}

/** Anchor id of a dictionary section ("Acordes meio diminutos" → "acordes-meio-diminutos"). */
const anchorOf = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

/** Section of the dictionary currently at the top of the screen (for the menu highlight). */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-156px 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [ids.join()]);
  return active;
}

/** Chord dictionary: every fingering in the app, shown on C, with a menu of its sections. */
function DictionaryPage({ onBack }: { onBack: () => void }) {
  const { t, l } = useI18n();
  const [key, setKey] = useState(0);
  // Anchors come from the Portuguese titles so shared links work in both languages.
  const qualities = dictionaryOf(key).map((quality) => ({ ...quality, id: anchorOf(quality.title.pt) }));
  const active = useActiveSection(qualities.map((quality) => quality.id));
  // Opened straight on an anchor (shared link): jump to that section once.
  useEffect(() => {
    const anchor = dictionaryAnchor(window.location.hash);
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
  }, []);
  const menuLink = (quality: (typeof qualities)[number], compact: boolean) => {
    const current = quality.id === active;
    const count = quality.groups.reduce((total, group) => total + group.steps.length, 0);
    return (
      <a
        key={quality.id}
        href={`${DICTIONARY_HASH}/${quality.id}`}
        aria-current={current ? "location" : undefined}
        className={`flex shrink-0 items-center justify-between gap-3 rounded-control text-sm font-semibold transition-colors ${
          compact ? "h-9 px-3" : "h-11 px-3"
        } ${current ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-sunken hover:text-ink"}`}
      >
        <span className="whitespace-nowrap">{l(quality.title)}</span>
        {!compact && (
          <span className={`font-mono text-xs font-medium tabular-nums ${current ? "text-brand-ink" : "text-muted"}`}>
            {count}
          </span>
        )}
      </a>
    );
  };
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar />
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6 sm:px-8 sm:pt-8 lg:px-12">
        {/* Page header: one full-width column. */}
        <button
          onClick={onBack}
          className="-ml-2 flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <Icon name="back" className="size-4" /> {t("Voltar", "Back")}
        </button>
        <h1 className="mt-8 font-display text-[36px] font-bold leading-tight tracking-[-0.04em] sm:text-[46px]">
          {t("Dicionário de Acordes", "Chord Dictionary")}
        </h1>
        <p className="mt-4 max-w-[720px] text-[17px] leading-8 text-ink-2">
          {t(
            "Todas as digitações de acorde para cada função. Em teoria, você pode substituir um acorde por qualquer outro da mesma categoria. Não esqueça que o ouvido tem a última palavra.",
            "Every chord fingering for each function. In theory, you can replace a chord with any other in the same category. Don't forget that your ear has the final say.",
          )}
        </p>

        {/* Below it: the menu on the left of the chord column (a scrolling row on phones). */}
        <div className="mt-6 lg:mt-12 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <nav
            aria-label={t("Seções do dicionário", "Dictionary sections")}
            className="sticky top-20 z-[5] -mx-4 border-b border-line bg-canvas sm:-mx-8 sm:top-[88px] lg:top-[120px] lg:mx-0 lg:self-start lg:border-b-0"
          >
            <div className="flex items-center gap-2 px-4 py-2 sm:px-8 lg:hidden">
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {qualities.map((quality) => menuLink(quality, true))}
              </div>
              <KeySelect value={key} onChange={setKey} compact />
            </div>
            <div className="hidden lg:block">
              <div className="flex flex-col gap-1">{qualities.map((quality) => menuLink(quality, false))}</div>
              <div className="mt-8 border-t border-line pt-6">
                <KeySelect value={key} onChange={setKey} />
              </div>
            </div>
          </nav>

          <div className="min-w-0 [&>section:first-child]:lg:mt-0">
            {qualities.map((quality) => (
              <GuideSection key={quality.id} id={quality.id} title={l(quality.title)}>
                <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {quality.groups.flatMap((group) =>
                    group.steps.map((step, index) => (
                      <ChordCard key={`${group.key}-${index}`} step={step} className="chord-card--compact min-w-0" />
                    )),
                  )}
                </div>
              </GuideSection>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/** True while the URL points at the chord dictionary (#dicionario or one of its anchors). */
function useDictionaryRoute() {
  const [open, setOpen] = useState(() => isDictionaryHash(window.location.hash));
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      setOpen(isDictionaryHash(hash));
      // Anchors scroll to their section (after the page renders); anything else starts at the top.
      const anchor = dictionaryAnchor(hash);
      if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }));
      else window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  function close() {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(false);
  }
  return { open, close };
}

export default function App() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [guideSection, setGuideSection] = useState<number | null>(null);
  const moduleRoute = useModuleRoute();
  const dictionary = useDictionaryRoute();
  const session = useSession();
  const userId = session?.user.id;
  const trailSections = applyProgress(sections, progress);

  // Logged in (or switched account): merge this browser's progress with the account's.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void syncProgress(loadProgress()).then((merged) => {
      if (!merged || cancelled) return;
      saveProgress(merged);
      setProgress(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function completeLesson(lesson: Lesson, bpm: number) {
    const result = { bpm, completedAt: new Date().toISOString() };
    setProgress((current) => {
      const next = { ...current, [lesson.key]: result };
      saveProgress(next);
      return next;
    });
    if (userId) void saveResultToAccount(lesson.key, result);
  }

  if (dictionary.open) return <DictionaryPage onBack={dictionary.close} />;

  if (guideSection !== null) {
    const Guide = guideSection === 2 ? InversionsGuide : guideSection === 3 ? TriadsGuide : CagedGuide;
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

  const moduleSection = trailSections.find((section) => moduleSlug(section) === moduleRoute);
  if (moduleSection) {
    return (
      <ModulePage
        section={moduleSection}
        onSelect={setSelectedLesson}
        onOpenGuide={() => {
          setGuideSection(moduleSection.id);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return <Dashboard sections={trailSections} onSelect={setSelectedLesson} />;
}
