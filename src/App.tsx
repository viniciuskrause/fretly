import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { NotationCard, playingOrder } from "./Notation.tsx";
import {
  barreSpans,
  chordLabel,
  soundingStrings,
  rootPitchClass,
  stringDegree,
  stringFrequency,
  scaleNoteFrequency,
  type ChordPosition,
  type ChordStep,
  type ScaleStep,
} from "./chords.ts";
import { lessons, sections, type Lesson, type Section, type Trail as TrailData } from "./lessons.ts";
import { applyProgress, loadProgress, saveProgress, type Progress } from "./progress.ts";
import { chordName, useI18n, type Lang, type Localized } from "./i18n.tsx";
import { useAccount } from "./auth/firebase.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { BpmControl } from "./BpmControl.tsx";
import { track, trackScreen } from "./analytics.ts";
import { adoptAccountDefaults, loadDefaultBpm } from "./defaultBpm.ts";
import { UserMenu } from "./UserMenu.tsx";
import { saveResultToAccount, syncProgress } from "./auth/progressSync.ts";
import { isLocked, usePremium } from "./premium.ts";
import { UpgradeView } from "./premium/UpgradeView.tsx";

/** App name; links to the homepage in the current language (en at the site root, pt in pt/). */
function Brand() {
  const { lang, t } = useI18n();
  return (
    <a
      href={lang === "pt" ? "../pt/" : "../"}
      aria-label={t("Guitar Workouts: página inicial", "Guitar Workouts: homepage")}
      className="flex items-center"
    >
      <span className="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
        Guitar <span className="text-accent-ink">Workouts</span>
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

/** Chord of a key variation without its bass ("C7+/E" → "C7+"); for a scale, its key ("C", "Am"). */
const variationChord = (lesson: Lesson) =>
  lesson.scale ? scaleSymbol(lesson.scale[0]) : lesson.steps[0].chord.split("/")[0];

/** Key of a scale written as a chord symbol: "C" (major), "Am" (minor), "Bdim" (diminished arpeggio). */
const scaleSymbol = (step: ScaleStep) =>
  step.root +
  {
    major: "",
    minor: "m",
    dim: "dim",
    maj7: "7+",
    m7: "m7",
    "7": "7",
    m7b5: "m7(♭5)",
    altered: "alt",
  }[step.quality];

/** Key of a scale in words: "C maior" / "A minor" / "B diminuto" / "C alterada". */
const scaleName = (step: ScaleStep, lang: Lang) =>
  step.quality === "altered"
    ? `${step.root} ${lang === "en" ? "altered" : "alterada"}`
    : ["major", "minor", "dim"].includes(step.quality)
    ? `${step.root} ${(lang === "en" ? { major: "major", minor: "minor", dim: "diminished" } : { major: "maior", minor: "menor", dim: "diminuto" })[step.quality as "major" | "minor" | "dim"]}`
    : chordName(scaleSymbol(step), lang);

/** Key of a variation: the root of its chord ("B♭m7" → "B♭"). */
const variationKey = (lesson: Lesson) => variationChord(lesson).match(/^[A-G][♯♭]?/)?.[0] ?? lesson.title.pt;

/** Chord quality shown on the lesson icon ("7+", "m7", "ø"; a plain major triad is "M"). */
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
  // A lesson with a single variation (the preparatory lesson) gets the whole ring.
  if (count === 1) {
    const r = RING_RADIUS;
    return `M${center} ${center - r} A${r} ${r} 0 1 1 ${center} ${center + r} A${r} ${r} 0 1 1 ${center} ${center - r}`;
  }
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
  // The active lesson shows the chord of the key being studied ("C7+", "B♭m"); the others the quality ("7+").
  const quality = lessonSymbol(trail);
  // Scale lessons are told apart by their shape, so an idle scale hub shows its position number;
  // the preparatory exercise (a single key) shows its key, arpeggios the string of their root.
  const scaleStep = trail.lessons[0].scale?.[0];
  const centerSymbol = chordName(
    status === "current"
      ? variationKey(next) + (quality === "M" ? "" : quality)
      : scaleStep?.showFingers
        ? t(`${6 - scaleStep.notes[0].string}ª`, ORDINAL_EN[6 - scaleStep.notes[0].string])
        : scaleStep && !scaleStep.label
          ? String(scaleStep.position)
        : scaleStep && trail.lessons.length === 1
          ? scaleSymbol(scaleStep)
          : quality,
    lang,
  );
  // Segment under the pointer (or focused): its key shows in a tooltip outside the ring.
  const [hovered, setHovered] = useState<number | null>(null);
  const tooltip = hovered === null ? null : (() => {
    const degrees = -90 + (hovered + 0.5) * (360 / trail.lessons.length);
    const radians = (degrees * Math.PI) / 180;
    const radius = RING_RADIUS + 28;
    return { left: center + radius * Math.cos(radians), top: center + radius * Math.sin(radians) };
  })();
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
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered((current) => (current === index ? null : current))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(lesson);
                  }
                }}
              />
            );
          })}
        </svg>
        {tooltip && hovered !== null && (
          <span className="lesson-hub__tooltip" style={tooltip} aria-hidden="true">
            {variationKey(trail.lessons[hovered])}
          </span>
        )}
        <button
          className={`lesson-hub lesson-hub--${status}`}
          style={{ left: center, top: center }}
          onClick={() => onSelect(next)}
          aria-label={t(
            `${l(trail.title)}: praticar ${variationKey(next)} (${doneCount(trail.lessons)} tonalidades feitas)`,
            `${l(trail.title)}: practise ${variationKey(next)} (${doneCount(trail.lessons)} keys done)`,
          )}
        >
          <span className={`lesson-hub__symbol${centerSymbol.length > 4 ? " lesson-hub__symbol--long" : ""}`}>{centerSymbol}</span>
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
  const blocks: Array<{
    section?: Localized;
    group?: Localized;
    items: Array<{ trail: TrailData; index: number }>;
  }> = [];
  section.trails.forEach((trail, index) => {
    const last = blocks.at(-1);
    if (
      last &&
      last.group?.pt === trail.group?.pt &&
      last.section?.pt === trail.section?.pt
    )
      last.items.push({ trail, index });
    else
      blocks.push({
        section: trail.section,
        group: trail.group,
        items: [{ trail, index }],
      });
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

  // Collapsible parts of the trail: the top heading level (the section when the module has
  // two levels, else the group). The part holding the current lesson starts open — or the
  // first part, when no lesson is current here; the learner opens and closes the others.
  const partOf = (trail: TrailData) => (trail.section ?? trail.group)?.pt;
  const [open, setOpen] = useState<Set<string>>(() => {
    const active =
      trails.find((trail) => lessonStatus(trail) === "current") ??
      trails.find((trail) => partOf(trail));
    const part = active && partOf(active);
    return new Set(part ? [part] : []);
  });
  const toggle = (part: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  const isOpen = (trail: TrailData) => {
    const part = partOf(trail);
    return !part || open.has(part);
  };

  // Grid placement on wide screens: headings take a full row, lessons fill rows of two, alternating direction.
  let row = 0;
  let hubRow = 0;
  const placed: Array<
    | {
        kind: "heading";
        title: string;
        row: number;
        sub?: boolean;
        part?: string;
        expanded?: boolean;
      }
    | {
        kind: "hub";
        trail: TrailData;
        index: number;
        row: number;
        column: number;
      }
  > = [];
  let currentSection: string | undefined;
  trailBlocks(section).forEach((block) => {
    const first = block.items[0].trail;
    const expanded = isOpen(first);
    // Two levels: a section heading ("Começando na tônica") over subsection headings ("Tríade maior").
    if (block.section && block.section.pt !== currentSection) {
      currentSection = block.section.pt;
      placed.push({
        kind: "heading",
        title: l(block.section),
        row: ++row,
        part: block.section.pt,
        expanded,
      });
    }
    if (block.group && !block.section)
      placed.push({
        kind: "heading",
        title: l(block.group),
        row: ++row,
        part: block.group.pt,
        expanded,
      });
    if (!expanded) return;
    if (block.group && block.section)
      placed.push({
        kind: "heading",
        title: l(block.group),
        row: ++row,
        sub: true,
      });
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
  }, [trails, open]);

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
          <h3
            key={`h${item.row}`}
            className={`unit-trail__heading ${item.sub ? "unit-trail__heading--sub" : ""}`}
            style={{ "--row": item.row } as CSSProperties}
          >
            {item.part ? (
              <button
                type="button"
                className="unit-trail__toggle"
                aria-expanded={item.expanded}
                onClick={() => toggle(item.part!)}
              >
                {item.title}
                <Icon
                  name="chevron"
                  className={`size-5 shrink-0 transition-transform ${item.expanded ? "rotate-180" : ""}`}
                />
              </button>
            ) : (
              <span>{item.title}</span>
            )}
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
        <span className="text-[15px] font-bold text-ink">{t("Aulas concluídas", "Lessons completed")}</span>
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
/** Module groups on the dashboard: chord modules, then scales and arpeggios (modules 4–7). */
const SCALE_MODULES = new Set([4, 5, 6, 7]);
const DASHBOARD_GROUPS: Array<{
  title: Localized;
  sections: (id: number) => boolean;
}> = [
  {
    title: { pt: "Acordes", en: "Chords" },
    sections: (id) => !SCALE_MODULES.has(id),
  },
  {
    title: { pt: "Escalas e Arpejos", en: "Scales and Arpeggios" },
    sections: (id) => SCALE_MODULES.has(id),
  },
];

function Dashboard({ sections: all, onSelect }: { sections: Section[]; onSelect: (lesson: Lesson) => void }) {
  const { t, l } = useI18n();
  const account = useAccount();
  const firstName = account?.firstName ?? "";
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
        {DASHBOARD_GROUPS.map((group) => (
          <Fragment key={group.title.pt}>
            <h2 className="mt-10 font-display text-[22px] font-bold tracking-[-0.03em] text-ink">{l(group.title)}</h2>
            <div className="mt-4 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {all
                .filter((section) => group.sections(section.id))
                .map((section) => (
                  <ModuleCard key={section.id} section={section} />
                ))}
            </div>
          </Fragment>
        ))}
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
    document.title = `${l(section.title)} – Guitar Workouts`;
    return () => {
      document.title = "Guitar Workouts";
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

// Scale diagram geometry: like the chord diagram, strings run low E (bottom row) →
// high E (top row) and columns are frets, here every fret the position spans.
const SCALE_COLUMN = 36;
const SCALE_ROW = 22;
const SCALE_LEFT = 12;
const SCALE_TOP = 14;
const LEAP_ROOM = 34;

/** A scale position on the neck: one dot per note with its degree; the tonic in blue. */
function ScaleDiagram({ step, activeNote = null }: { step: ScaleStep; /** Index of the note sounding. */ activeNote?: number | null }) {
  const { t, l, lang } = useI18n();
  const frets = step.notes.map((note) => note.fret);
  const low = Math.min(...frets);
  // Arpeggio diagrams show at least four frets, so a two-fret fingering isn't drawn huge.
  const high = Math.max(...frets, step.showFingers ? low + 3 : 0);
  const columns = high - low + 1;
  // Arpeggio diagrams write the degree to the right of each dot ("♭3"): room for it on the last fret.
  const width =
    SCALE_LEFT * 2 + columns * SCALE_COLUMN + (step.showFingers ? 14 : 0);
  // Leap exercises draw arcs above the strings, so they get extra room on top.
  const top = SCALE_TOP + (step.leaps ? LEAP_ROOM : 0);
  const rowY = (string: number) => top + (5 - string) * SCALE_ROW;
  const columnX = (fret: number) => SCALE_LEFT + (fret - low + 0.5) * SCALE_COLUMN;
  const bottom = rowY(0);
  return (
    <svg
      viewBox={`0 0 ${width} ${bottom + 30}`}
      className="mx-auto block w-full"
      // Arpeggio diagrams span only 4–5 frets: cap their size so they don't fill a wide card.
      style={step.showFingers ? { maxWidth: width * 1.6 } : undefined}
      role="img"
      aria-label={
        step.label
          ? t(`${l(step.label)}, casas ${low} a ${high}`, `${l(step.label)}, frets ${low} to ${high}`)
          : t(
              `${scaleName(step, lang)}, posição ${step.position} (${l(step.mode)}), casas ${low} a ${high}`,
              `${scaleName(step, lang)}, position ${step.position} (${l(step.mode)}), frets ${low} to ${high}`,
            )
      }
    >
      {[0, 1, 2, 3, 4, 5].map((string) => (
        <line
          key={`string-${string}`}
          x1={SCALE_LEFT}
          y1={rowY(string)}
          x2={SCALE_LEFT + columns * SCALE_COLUMN}
          y2={rowY(string)}
          strokeWidth={string === 0 ? 1.6 : 1.2}
          className="stroke-subtle"
        />
      ))}
      {/* With open strings (fret 0) the first column sits before the nut, with no fret line on its left. */}
      {Array.from({ length: columns + 1 }, (_, line) => line).filter((line) => !(low === 0 && line === 0)).map((line) => (
        <line
          key={`fret-${line}`}
          x1={SCALE_LEFT + line * SCALE_COLUMN}
          y1={rowY(5)}
          x2={SCALE_LEFT + line * SCALE_COLUMN}
          y2={bottom}
          strokeWidth={(line === 0 && low === 1) || (line === 1 && low === 0) ? 5 : 1.3}
          className="stroke-ink-2"
        />
      ))}
      {Array.from({ length: columns }, (_, index) => low + index).map((fret) => (
        <text
          key={`number-${fret}`}
          x={columnX(fret)}
          y={bottom + 22}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          className="fill-muted font-mono"
        >
          {fret}
        </text>
      ))}
      {step.leaps &&
        step.notes.flatMap((note, index) => {
          const other = step.notes[index + 1];
          if (index % 2 === 1 || !other) return [];
          // An arc over the string from one note of the pair to the other, higher for a wider leap.
          const [x1, x2] = [columnX(note.fret), columnX(other.fret)];
          const y = rowY(note.string) - 11;
          const lift = Math.min(LEAP_ROOM + 6, 14 + Math.abs(x2 - x1) * 0.18);
          const isActive = activeNote === index || activeNote === index + 1;
          return [
            <path
              key={`leap-${index}`}
              d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y - lift} ${x2} ${y}`}
              fill="none"
              strokeWidth={isActive ? 2.4 : 1.6}
              strokeLinecap="round"
              className={isActive ? "stroke-accent" : "stroke-muted"}
            />,
          ];
        })}
      {step.notes
        .map((note, index) => ({ note, index }))
        // The sounding note is drawn last: in long runs another note can sit on the same fret.
        .sort(
          (a, b) =>
            Number(a.index === activeNote) - Number(b.index === activeNote),
        )
        .map(({ note, index }) => {
          const isActive = index === activeNote;
          const isTonic = note.degree === "1";
          return (
            <g
              key={`note-${index}`}
              className="transition-transform duration-150"
            >
              <circle
                cx={columnX(note.fret)}
                cy={rowY(note.string)}
                r={isActive ? 10.5 : 9}
                className={
                  isActive ? "fill-accent" : isTonic ? "fill-brand" : "fill-ink"
                }
              />
              <text
                x={columnX(note.fret)}
                y={rowY(note.string) + 3.5}
                textAnchor="middle"
                fontSize={
                  note.degree.length > 1 && !step.showFingers ? 8.5 : 10
                }
                fontWeight="700"
                className="fill-white font-mono"
              >
                {step.showFingers ? (note.finger ?? "0") : note.degree}
              </text>
              {step.showFingers && (
                <text
                  x={columnX(note.fret) + 12}
                  y={rowY(note.string) - 8}
                  fontSize="9"
                  fontWeight="700"
                  className={`font-mono ${isTonic ? "fill-brand-ink" : "fill-muted"}`}
                >
                  {note.degree}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}

/** A scale position in a card: its number and mode on top, the diagram below. */
function ScaleCard({
  step,
  activeNote = null,
  className = "",
  cardRef,
  current,
  fingerHint = false,
}: {
  step: ScaleStep;
  /** Says that the numbers in the dots are fingers (the single-exercise view, which has room for it). */
  fingerHint?: boolean;
  activeNote?: number | null;
  className?: string;
  cardRef?: (node: HTMLDivElement | null) => void;
  current?: boolean;
}) {
  const { t, l } = useI18n();
  return (
    <div
      ref={cardRef}
      className={`w-full rounded-card border border-line bg-surface p-4 sm:p-5 ${className}`}
      aria-current={current ? "true" : undefined}
    >
      {/* The leap exercise (preparatory lesson) has no title: the heading says it all. */}
      {!step.leaps && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-display text-[18px] font-bold tracking-[-0.02em] text-ink">
            {step.label ? l(step.label) : t(`Posição ${step.position}`, `Position ${step.position}`)}
          </p>
          {!step.label && <p className="text-sm font-medium text-muted">{l(step.mode)}</p>}
          {step.showFingers && fingerHint && (
            <p className="text-sm font-medium text-muted">{t("Números: dedos", "Numbers: fingers")}</p>
          )}
        </div>
      )}
      <div>
        <ScaleDiagram step={step} activeNote={activeNote} />
      </div>
    </div>
  );
}

/** Notes of a scale position played up and back down (the top note once). */
const upAndDown = (step: ScaleStep) => [
  ...step.notes.map((_, index) => index),
  ...step.notes.map((_, index) => index).reverse().slice(1),
];

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
 * "1ª inversão: baixo na terça - Acordes maiores - C7+".
 */
function lessonPath(lesson: Lesson, lang: Lang): LessonPath {
  const trail = sections
    .flatMap((section) => section.trails)
    .find((item) => item.lessons.some(({ id }) => id === lesson.id));
  // A trail can name its exercises itself ("Triad Arpeggios Practice"), with no key.
  if (trail?.overline) return { headings: [trail.overline[lang]], chord: "" };
  const headings = trail
    ? [trail.section, trail.group, trail.title]
        .filter((heading): heading is Localized => !!heading)
        .map((heading) => heading[lang])
    : [];
  // The chord without its bass ("C7+/E" → "C7+"); the lesson title is the fallback.
  const chord = lesson.scale
    ? chordName(scaleSymbol(lesson.scale[0]), lang)
    : lesson.steps[0]
      ? chordName(lesson.steps[0].chord.split("/")[0], lang)
      : lesson.title[lang].split(" - ")[0];
  return { headings, chord };
}

/**
 * Uppercase overline with the lesson path; the chord symbol keeps its own case
 * ("Dm7(♭5)" must not read "DM7(♭5)", a major-seventh chord).
 */
function LessonOverline({ path }: { path: LessonPath }) {
  return (
    <>
      {path.headings.join(" - ")}
      {path.chord && (
        <>
          {path.headings.length > 0 && " - "}
          <span className="normal-case">{path.chord}</span>
        </>
      )}
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

function SecondaryButton({
  label,
  onClick,
  disabled,
  icon,
  iconOnly = false,
}: ActionButtonProps & {
  /** Square button with the icon only (the label stays as aria-label and tooltip): previous / next. */
  iconOnly?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={iconOnly ? label : undefined}
      className={`flex h-12 min-w-12 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface text-sm font-semibold text-ink-2 transition hover:border-subtle hover:bg-sunken hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong disabled:hover:bg-surface ${
        iconOnly ? "w-12" : "px-4 sm:min-w-[140px] sm:px-5"
      }`}
    >
      {icon && <Icon name={icon} className="size-5" />}
      {!iconOnly && (
        <span className={icon ? "hidden sm:inline" : undefined}>{label}</span>
      )}
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

function ExercisePage({
  lesson,
  onExit,
  onComplete,
  nextKey,
}: {
  lesson: Lesson;
  onExit: () => void;
  /** Next key of the same lesson (none after the last one): "Próxima tonalidade" on the done screen. */
  nextKey?: { label: string; open: () => void };
  /** Called on "Concluir" with the tempo of the last final-exercise run. */
  onComplete: (bpm: number) => void;
}) {
  const { t, l, lang } = useI18n();
  // Tempo of the last run of the final exercise.
  const sequenceBpm = useRef<number | null>(null);
  // A finished lesson reopens on its final exercise, at the tempo used last time.
  const reopensFinished = lesson.status === "done";
  // Scale lessons have one step per position (`lesson.scale`); chord lessons use `lesson.steps`.
  const scale = lesson.scale;
  const stepCount = scale?.length ?? lesson.steps.length;
  // A lesson of a single shape (one scale position) has no final sequence: playing it finishes the lesson.
  const hasFinal = stepCount > 1;
  const [stepIndex, setStepIndex] = useState(reopensFinished ? stepCount - 1 : 0);
  const [playbackStatus, setPlaybackStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [activeStrings, setActiveStrings] = useState<number[]>([]);
  // Scale note sounding (index into the position's notes) and its place in the playing order.
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [activeOrder, setActiveOrder] = useState<number | null>(null);
  const [finalExercise, setFinalExercise] = useState(
    reopensFinished && hasFinal,
  );
  // Two tempos: the steps start at the exercises' default, the final exercise at
  // its own (slower) default. The last tempo (recorded on the trail) belongs to
  // the run that finished the lesson: the final exercise, or the only step.
  const [stepBpm, setStepBpm] = useState(() => (hasFinal ? undefined : lesson.lastBpm) ?? loadDefaultBpm("exercise"));
  const [finalBpm, setFinalBpm] = useState(() => (hasFinal ? lesson.lastBpm : undefined) ?? loadDefaultBpm("sequence"));
  const bpm = finalExercise ? finalBpm : stepBpm;
  const setBpm = finalExercise ? setFinalBpm : setStepBpm;
  const [sequenceIndex, setSequenceIndex] = useState(-1);
  const [sequenceStatus, setSequenceStatus] = useState<"idle" | "countdown" | "playing" | "finished">("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const timeoutIds = useRef<number[]>([]);
  // Bumped on every stop/restart: a start still waiting for the audio output gives up if it changed.
  const playbackRun = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const scheduledSources = useRef<Array<{ source: AudioBufferSourceNode; startAt: number }>>([]);
  const step = lesson.steps[stepIndex];
  const scaleStep = scale?.[stepIndex];
  const path = lessonPath(lesson, lang);
  // Lessons with alternative fingerings keep a caption row under every diagram.
  const hasAlternatives = lesson.steps.some((item) => item.alternative);
  const progress = complete || finalExercise ? 100 : ((stepIndex + 1) / stepCount) * 100;

  // Cancels pending UI updates, the scheduler loop and every note that hasn't
  // started yet. Notes already sounding keep ringing naturally.
  function clearPlayback() {
    playbackRun.current += 1;
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
    setActiveNote(null);
    const run = playbackRun.current;
    await prepareAudio();
    if (run !== playbackRun.current) return; // stopped meanwhile

    if (scaleStep) {
      // Up and back down, two notes per beat (eighth notes).
      // Written exercises (tab / staff) repeat the top note on the way down: one triad per bar.
      const order = scaleStep.notation
        ? playingOrder(scaleStep)
        : upAndDown(scaleStep);
      const events: ScheduledEvent[] = order.map((index, n) => ({
        beat: n / 2,
        notes: [
          {
            frequency: scaleNoteFrequency(scaleStep.notes[index]),
            volume: 0.16,
          },
        ],
        onPlay: () => {
          setActiveNote(index);
          setActiveOrder(n);
        },
      }));
      runSchedule(events, order.length / 2 + 0.5, () => {
        setActiveNote(null);
        setActiveOrder(null);
        setPlaybackStatus("finished");
      });
      return;
    }

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
    setActiveNote(null);
    setActiveOrder(null);
  }

  function nextStep() {
    resetPlayback();
    if (stepIndex === stepCount - 1) {
      if (!hasFinal) {
        onComplete(bpm);
        setComplete(true);
        return;
      }
      setFinalExercise(true);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function resetSequence() {
    clearPlayback();
    setSequenceIndex(-1);
    setActiveNote(null);
    setActiveOrder(null);
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
    const run = playbackRun.current;
    await prepareAudio();
    if (run !== playbackRun.current) return; // stopped meanwhile
    const later = (ms: number, fn: () => void) =>
      timeoutIds.current.push(window.setTimeout(fn, ms));
    later(1000, () => setCountdown(2));
    later(2000, () => setCountdown(1));
    later(3000, () => {
      setCountdown(null);
      setSequenceStatus("playing");
      if (scale) {
        // Every position up and down, one after the other, in eighth notes.
        const events: ScheduledEvent[] = [];
        let beat = 0;
        scale.forEach((scaleItem, position) => {
          (scaleItem.notation
            ? playingOrder(scaleItem)
            : upAndDown(scaleItem)
          ).forEach((index, n) => {
            events.push({
              beat,
              notes: [{ frequency: scaleNoteFrequency(scaleItem.notes[index]), volume: 0.16 }],
              onPlay: () => {
                setSequenceIndex(position);
                setActiveNote(index);
                setActiveOrder(n);
              },
            });
            beat += 0.5;
          });
        });
        runSchedule(events, beat + 0.5, () => {
          setSequenceIndex(-1);
          setActiveNote(null);
          setSequenceStatus("finished");
        });
        return;
      }
      const events: ScheduledEvent[] = lesson.steps.map((chordStep, index) => ({
        beat: index,
        notes: chordNotes(chordStep.position),
        onPlay: () => setSequenceIndex(index),
      }));
      runSchedule(events, stepCount, () => {
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
              <p className="font-display text-3xl font-bold tabular-nums text-accent-ink">{stepCount}</p>
              <p className="eyebrow mt-1 text-[10px]! text-muted">
                {scale?.[0].label
                  ? stepCount === 1
                    ? t("Exercício tocado", "Exercise played")
                    : t("Digitações tocadas", "Fingerings played")
                  : scale
                  ? stepCount === 1
                    ? t("Posição tocada", "Position played")
                    : t("Posições tocadas", "Positions played")
                  : lesson.steps[0].shape
                    ? t("Formas tocadas", "Shapes played")
                    : t("Digitações tocadas", "Fingerings played")}
              </p>
            </div>
          </div>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
            {nextKey && (
              <button
                onClick={nextKey.open}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98]"
              >
                {t(`Próxima tonalidade: ${nextKey.label}`, `Next key: ${nextKey.label}`)}
                <Icon name="chevron" className="size-4 -rotate-90" />
              </button>
            )}
            <button
              onClick={onExit}
              className={`h-12 w-full rounded-control text-sm font-semibold transition active:scale-[0.98] ${
                nextKey
                  ? "border border-line bg-surface text-ink hover:bg-sunken"
                  : "bg-brand text-white hover:bg-brand-strong"
              }`}
            >
              {t("Voltar ao módulo", "Back to the module")}
            </button>
          </div>
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
                // While it plays (or counts down), the button stops it and goes back to the start.
                <PrimaryButton
                  label={isPlaying ? t("Parar", "Stop") : t("Iniciar", "Start")}
                  icon={isPlaying ? "stop" : "play"}
                  tone="accent"
                  onClick={isPlaying ? resetSequence : startChordSequence}
                />
              )}
            </div>
          </>
        }
      >
        <ExerciseHeading path={path} title={t("Sequência completa", "Full sequence")} />

        <div className="relative mt-12">
          {scale?.[0].notation ? (
            // Written exercises: one notation card per fingering, one below the other.
            <div className="mx-auto grid max-w-[880px] gap-4">
              {scale.map((scaleItem, index) => {
                const isSounding =
                  sequenceStatus === "playing" && index === sequenceIndex;
                const isDimmed = isPlaying && !isSounding;
                return (
                  <NotationCard
                    key={scaleItem.position}
                    step={scaleItem}
                    activeOrder={isSounding ? activeOrder : null}
                    current={isSounding}
                    cardRef={(node) => {
                      if (node && isSounding)
                        node.scrollIntoView({
                          block: "nearest",
                          behavior: "smooth",
                        });
                    }}
                    className={`sequence-card ${isSounding ? "sequence-card--sounding" : ""} ${isDimmed ? "sequence-card--dimmed" : ""}`}
                  />
                );
              })}
            </div>
          ) : scale ? (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {scale.map((scaleItem, index) => {
                const isSounding = sequenceStatus === "playing" && index === sequenceIndex;
                const isDimmed = isPlaying && !isSounding;
                return (
                  <ScaleCard
                    key={scaleItem.position}
                    step={scaleItem}
                    activeNote={isSounding ? activeNote : null}
                    current={isSounding}
                    cardRef={(node) => {
                      if (node && isSounding) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }}
                    className={`sequence-card ${isSounding ? "sequence-card--sounding" : ""} ${isDimmed ? "sequence-card--dimmed" : ""}`}
                  />
                );
              })}
            </div>
          ) : (
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
          )}
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
  // Long runs along the neck (more than 10 frets) get a wider page, so the dots stay readable.
  const runFrets = scaleStep?.notes.map((note) => note.fret) ?? [];
  // Written exercises (tab / staff) always get the wide page: the score needs the width.
  const longRun =
    !!scaleStep?.notation ||
    (runFrets.length > 0 && Math.max(...runFrets) - Math.min(...runFrets) > 10);
  return (
    <ExerciseShell
      progress={progress}
      onExit={onExit}
      wide={longRun}
      footerCenter={bpmControl}
      footer={
        <>
          <div className="flex gap-3">
            <SecondaryButton
              label={t("Anterior", "Previous")}
              icon="back"
              iconOnly
              disabled={stepIndex === 0 || isPlaying}
              onClick={() => {
                resetPlayback();
                setStepIndex((current) => Math.max(0, current - 1));
              }}
            />
            {/* Skips ahead without playing (to the final exercise from the last step); never finishes the lesson. */}
            <SecondaryButton
              label={t("Próximo", "Next")}
              icon="forward"
              iconOnly
              disabled={isPlaying || (stepIndex === stepCount - 1 && !hasFinal)}
              onClick={() => {
                resetPlayback();
                if (stepIndex === stepCount - 1) setFinalExercise(true);
                else setStepIndex((current) => current + 1);
              }}
            />
          </div>
          <div className="flex gap-3">
            {playbackStatus === "finished" ? (
              <>
                <SecondaryButton label={t("Repetir", "Repeat")} icon="replay" onClick={startPlayback} />
                <PrimaryButton
                  label={
                    stepIndex < stepCount - 1
                      ? t("Próximo", "Next")
                      : hasFinal
                        ? t("Exercício final", "Final exercise")
                        : t("Concluir", "Finish")
                  }
                  onClick={nextStep}
                />
              </>
            ) : (
              // While it plays, the button stops it (the exercise goes back to "Tocar").
              <PrimaryButton
                label={isPlaying ? t("Parar", "Stop") : t("Tocar", "Play")}
                icon={isPlaying ? "stop" : "play"}
                tone="accent"
                onClick={isPlaying ? resetPlayback : startPlayback}
              />
            )}
          </div>
        </>
      }
    >
      {scaleStep ? (
        <>
          <ExerciseHeading
            path={path}
            title={
              scaleStep.instruction
                ? l(scaleStep.instruction)
                : t(
                    `Toque ${scaleName(scaleStep, lang)} na posição ${scaleStep.position} (${l(scaleStep.mode)}), subindo e descendo.`,
                    `Play ${scaleName(scaleStep, lang)} in position ${scaleStep.position} (${l(scaleStep.mode)}), up and down.`,
                  )
            }
          />
          <div
            className={`mx-auto mt-12 w-full ${longRun ? "max-w-[880px]" : "max-w-[560px]"}`}
          >
            {scaleStep.notation ? (
              <NotationCard
                step={scaleStep}
                activeOrder={playbackStatus === "playing" ? activeOrder : null}
              />
            ) : (
              <ScaleCard step={scaleStep} activeNote={activeNote} fingerHint />
            )}
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
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
    symbol: "C7+",
    notes: "C · E · G · B",
    formula: "1 · 3 · 5 · 7",
    role: { pt: "I7+ e IV7+ de uma tonalidade maior", en: "Imaj7 and IVmaj7 of a major key" },
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
  "Acordes maiores": { pt: "Maior (7+)", en: "Major (maj7)" },
  "Acordes menores": { pt: "Menor (m7)", en: "Minor (m7)" },
  "Acordes de sétima dominante": { pt: "Dominante (7)", en: "Dominant (7)" },
  "Acordes meio diminutos": { pt: "Meio diminuto (m7♭5)", en: "Half-diminished (m7♭5)" },
  "Tríades maiores": { pt: "Maior", en: "Major" },
  "Tríades menores": { pt: "Menor (m)", en: "Minor (m)" },
  "Tríades diminutas": { pt: "Diminuta (dim)", en: "Diminished (dim)" },
};

const ORDINAL_EN: Record<number, string> = { 3: "3rd", 4: "4th", 5: "5th", 6: "6th" };

/**
 * The C lesson of every trail of an inversion module (triads: id 3, seventh chords: id 2),
 * grouped by inversion: per chord quality, the main voicing on each bass string (6ª → 3ª),
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
                <div
                  className={`mt-2 grid gap-2 sm:gap-3 ${row.steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
                >
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
                <strong>Estado fundamental:</strong> a fundamental no baixo (C7+). É o que você tocou no
                módulo Acordes Básicos no CAGED.
              </li>
              <li>
                <strong>1ª inversão:</strong> a terça no baixo (C7+/E, Cm7/E♭).
              </li>
              <li>
                <strong>2ª inversão:</strong> a quinta no baixo (C7+/G, Cm7(♭5)/G♭).
              </li>
              <li>
                <strong>3ª inversão:</strong> a sétima no baixo (C7+/B, C7/B♭). É a mais instável das
                quatro: a sétima no grave pede resolução, e o baixo costuma descer um grau, como em
                C7/B♭ → F7+/A.
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
              como C7+ → C7+/B → Am7 (dó, si, lá) ou C7 → C7/B♭ → F7+/A (dó, si bemol, lá).
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

const SCALE_SOURCES: GuideSource[] = [
  { label: "Wikipedia — Major scale", url: "https://en.wikipedia.org/wiki/Major_scale" },
  { label: "Wikipedia — Mode (music)", url: "https://en.wikipedia.org/wiki/Mode_(music)" },
  { label: "Wikipedia — Relative key", url: "https://en.wikipedia.org/wiki/Relative_key" },
];

/** The seven positions in C major: the note each one starts on (6th string) and its mode. */
const SCALE_POSITIONS: Array<{ degree: string; note: string; mode: Localized }> = [
  { degree: "1", note: "C", mode: { pt: "Jônio", en: "Ionian" } },
  { degree: "2", note: "D", mode: { pt: "Dórico", en: "Dorian" } },
  { degree: "3", note: "E", mode: { pt: "Frígio", en: "Phrygian" } },
  { degree: "4", note: "F", mode: { pt: "Lídio", en: "Lydian" } },
  { degree: "5", note: "G", mode: { pt: "Mixolídio", en: "Mixolydian" } },
  { degree: "6", note: "A", mode: { pt: "Eólio", en: "Aeolian" } },
  { degree: "7", note: "B", mode: { pt: "Lócrio", en: "Locrian" } },
];

function ScalesGuide({ onBack }: { onBack: () => void }) {
  const { t, l } = useI18n();
  // C major in each position, from the shape lessons ("scales/major/p1/C" … "p7/C").
  const byPosition = [1, 2, 3, 4, 5, 6, 7].flatMap(
    (position) => lessons.find((lesson) => lesson.key === `scales/major/p${position}/C`)?.scale ?? [],
  );
  return (
    <GuideLayout
      title={t("7 posições do modo jônio", "7 positions of the Ionian mode")}
      sources={SCALE_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          A escala maior — o modo jônio — tem sete notas. Começando cada desenho numa nota diferente da
          escala, você cobre o braço inteiro com sete posições e toca qualquer escala maior em qualquer
          região.
        </>,
        <>
          The major scale — the Ionian mode — has seven notes. Starting a shape on each note of the scale,
          you cover the whole neck with seven positions and play any major scale anywhere.
        </>,
      )}
    >
      <GuideSection title={t("A escala maior", "The major scale")}>
        {t(
          <p>
            A escala maior segue a sequência de intervalos <strong>tom, tom, semitom, tom, tom, tom,
            semitom</strong>. Em C: C D E F G A B. Cada nota é um grau da escala, de <strong>1</strong> (a
            tônica) a <strong>7</strong>.
          </p>,
          <p>
            The major scale follows the interval pattern <strong>whole, whole, half, whole, whole, whole,
            half</strong>. In C: C D E F G A B. Each note is a degree of the scale, from <strong>1</strong>{" "}
            (the tonic) to <strong>7</strong>.
          </p>,
        )}
      </GuideSection>

      <GuideSection title={t("As sete posições", "The seven positions")}>
        {t(
          <p>
            Cada posição começa num grau diferente da escala na 6ª corda e vai até a 1ª com{" "}
            <strong>três notas por corda, menos uma corda com duas</strong>, para a mão não precisar abrir
            tanto. O desenho de cada posição é o de um modo da escala maior: a posição 1 começa na tônica
            (jônio), a posição 2 no 2º grau (dórico), e assim por diante. Em C:
          </p>,
          <p>
            Each position starts on a different degree of the scale on the 6th string and goes up to the
            1st with <strong>three notes per string, except one string with two</strong>, so the hand
            stretches less. The shape of each position is that of a mode of the major scale: position 1
            starts on the tonic (Ionian), position 2 on the 2nd degree (Dorian), and so on. In C:
          </p>,
        )}
        <div className="!mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="eyebrow px-4 py-3 font-medium">{t("Posição", "Position")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Começa no grau", "Starts on degree")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Nota em C", "Note in C")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Modo", "Mode")}</th>
              </tr>
            </thead>
            <tbody>
              {SCALE_POSITIONS.map((item, index) => (
                <tr key={item.note} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-ink">{item.degree}</td>
                  <td className="px-4 py-3 text-ink-2">{item.note}</td>
                  <td className="px-4 py-3 text-ink-2">{l(item.mode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title={t("As posições em C maior", "The positions in C major")}>
        {t(
          <p>
            Cada ponto mostra o grau da nota; os pontos azuis são a tônica (C). Os números abaixo do
            diagrama são as casas.
          </p>,
          <p>
            Each dot shows the degree of its note; the blue dots are the tonic (C). The numbers under the
            diagram are the frets.
          </p>,
        )}
        <div className="!mt-6 grid gap-4 sm:grid-cols-2">
          {byPosition.map((step) => (
            <ScaleCard key={step.position} step={step} />
          ))}
        </div>
      </GuideSection>

      <GuideSection title={t("Como estudar", "How to practise")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Comece pela aula preparatória: pares de notas na 1ª corda (0-5, 3-7, 5-10, 7-12, 10-15),
              subindo o braço e voltando, para soltar a mão nas mudanças de posição.
            </li>
            <li>Depois, cada aula é um desenho: a posição 1, a posição 2 e assim por diante, até a 7.</li>
            <li>Cada aula tem uma variação para cada tonalidade, no ciclo de quartas.</li>
            <li>Toque o desenho subindo e descendo, com o metrônomo, e diga em voz alta onde estão as tônicas.</li>
            <li>Quando dominar as sete aulas, junte as posições vizinhas e percorra o braço inteiro na mesma tonalidade.</li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Start with the preparatory lesson: pairs of notes on the 1st string (0-5, 3-7, 5-10, 7-12,
              10-15), up the neck and back, to loosen the hand for position shifts.
            </li>
            <li>Then each lesson is one shape: position 1, position 2 and so on, up to 7.</li>
            <li>Each lesson has a variation for every key, in the cycle of fourths.</li>
            <li>Play the shape up and down with the metronome, and say out loud where the tonics are.</li>
            <li>Once you know all seven lessons, join neighbouring positions and cover the whole neck in one key.</li>
          </ol>,
        )}
      </GuideSection>
    </GuideLayout>
  );
}

const ALTERED_SOURCES: GuideSource[] = [
  { label: "Wikipedia — Altered scale", url: "https://en.wikipedia.org/wiki/Altered_scale" },
  { label: "Wikipedia — Melodic minor scale", url: "https://en.wikipedia.org/wiki/Minor_scale#Melodic_minor_scale" },
];

/** The seven positions of C altered: the degree and note each one starts on (6th string) and its mode. */
const ALTERED_POSITIONS: Array<{ degree: string; note: string; mode: Localized }> = [
  { degree: "1", note: "C", mode: { pt: "Alterado", en: "Altered" } },
  { degree: "♭2", note: "D♭", mode: { pt: "Menor melódica", en: "Melodic minor" } },
  { degree: "♯2", note: "E♭", mode: { pt: "Dórico ♭2", en: "Dorian ♭2" } },
  { degree: "3", note: "E", mode: { pt: "Lídio aumentado", en: "Lydian augmented" } },
  { degree: "♯4", note: "F♯", mode: { pt: "Lídio dominante", en: "Lydian dominant" } },
  { degree: "♯5", note: "G♯", mode: { pt: "Mixolídio ♭6", en: "Mixolydian ♭6" } },
  { degree: "♭7", note: "B♭", mode: { pt: "Lócrio ♮2", en: "Locrian ♮2" } },
];

function AlteredGuide({ onBack }: { onBack: () => void }) {
  const { t, l } = useI18n();
  // C altered in each position, from the shape lessons ("altered/p1/C" … "p7/C").
  const byPosition = [1, 2, 3, 4, 5, 6, 7].flatMap(
    (position) => lessons.find((lesson) => lesson.key === `altered/p${position}/C`)?.scale ?? [],
  );
  return (
    <GuideLayout
      title={t("7 posições da escala alterada", "7 positions of the altered scale")}
      sources={ALTERED_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          A escala alterada é a escala do acorde dominante com todas as tensões alteradas. Com sete
          posições, uma começando em cada nota da escala, você a toca em qualquer região do braço.
        </>,
        <>
          The altered scale is the scale of the dominant chord with every tension altered. With seven
          positions, one starting on each note of the scale, you play it anywhere on the neck.
        </>,
      )}
    >
      <GuideSection title={t("A escala alterada", "The altered scale")}>
        {t(
          <p>
            Em C: <strong>C D♭ E♭ E F♯ G♯ B♭</strong>. Ela tem a tônica, a terça maior (3) e a sétima menor
            (♭7) do acorde C7, e todas as outras notas são tensões alteradas: <strong>♭2</strong> (♭9),{" "}
            <strong>♯2</strong> (♯9), <strong>♯4</strong> (♯11) e <strong>♯5</strong> (♭13). É o 7º modo da
            escala menor melódica: C alterada tem as mesmas notas de D♭ menor melódica. Use-a sobre um
            acorde dominante que resolve, como o C7 de um V–I em F.
          </p>,
          <p>
            In C: <strong>C D♭ E♭ E F♯ G♯ B♭</strong>. It has the root, the major third (3) and the minor
            seventh (♭7) of C7, and every other note is an altered tension: <strong>♭2</strong> (♭9),{" "}
            <strong>♯2</strong> (♯9), <strong>♯4</strong> (♯11) and <strong>♯5</strong> (♭13). It is the 7th
            mode of the melodic minor scale: C altered has the same notes as D♭ melodic minor. Use it over a
            dominant chord that resolves, like the C7 of a V–I in F.
          </p>,
        )}
      </GuideSection>

      <GuideSection title={t("As sete posições", "The seven positions")}>
        {t(
          <p>
            Como no módulo do modo jônio, cada posição começa num grau diferente da escala na 6ª corda e vai
            até a 1ª com <strong>três notas por corda, menos uma corda com duas</strong>. O desenho de cada
            posição é o de um modo da escala menor melódica. Em C:
          </p>,
          <p>
            As in the Ionian module, each position starts on a different degree of the scale on the 6th
            string and goes up to the 1st with <strong>three notes per string, except one string with
            two</strong>. The shape of each position is that of a mode of the melodic minor scale. In C:
          </p>,
        )}
        <div className="!mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="eyebrow px-4 py-3 font-medium">{t("Posição", "Position")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Começa no grau", "Starts on degree")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Nota em C", "Note in C")}</th>
                <th className="eyebrow px-4 py-3 font-medium">{t("Modo", "Mode")}</th>
              </tr>
            </thead>
            <tbody>
              {ALTERED_POSITIONS.map((item, index) => (
                <tr key={item.note} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-ink">{index + 1}</td>
                  <td className="px-4 py-3 font-mono text-ink">{item.degree}</td>
                  <td className="px-4 py-3 text-ink-2">{item.note}</td>
                  <td className="px-4 py-3 text-ink-2">{l(item.mode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title={t("As posições em C alterada", "The positions in C altered")}>
        {t(
          <p>
            Cada ponto mostra o grau da nota; os pontos azuis são a tônica (C). Os números abaixo do
            diagrama são as casas.
          </p>,
          <p>
            Each dot shows the degree of its note; the blue dots are the tonic (C). The numbers under the
            diagram are the frets.
          </p>,
        )}
        <div className="!mt-6 grid gap-4 sm:grid-cols-2">
          {byPosition.map((step) => (
            <ScaleCard key={step.position} step={step} />
          ))}
        </div>
      </GuideSection>

      <GuideSection title={t("Como estudar", "How to practise")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>Cada aula é um desenho: a posição 1, a posição 2 e assim por diante, até a 7.</li>
            <li>Cada aula tem uma variação para cada tonalidade, no ciclo de quartas.</li>
            <li>
              Toque o desenho subindo e descendo, com o metrônomo, e localize a tônica, a terça e a sétima
              do acorde dominante: as outras notas são as tensões.
            </li>
            <li>Depois, improvise sobre um V–I (C7 → F) usando a escala alterada no acorde dominante.</li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>Each lesson is one shape: position 1, position 2 and so on, up to 7.</li>
            <li>Each lesson has a variation for every key, in the cycle of fourths.</li>
            <li>
              Play the shape up and down with the metronome, and find the root, third and seventh of the
              dominant chord: the other notes are the tensions.
            </li>
            <li>Then improvise over a V–I (C7 → F) using the altered scale on the dominant chord.</li>
          </ol>,
        )}
      </GuideSection>
    </GuideLayout>
  );
}

const ARPEGGIO_SOURCES: GuideSource[] = [
  { label: "Wikipedia — Arpeggio", url: "https://en.wikipedia.org/wiki/Arpeggio" },
  { label: "Wikipedia — Triad (music)", url: "https://en.wikipedia.org/wiki/Triad_(music)" },
];

function ArpeggiosGuide({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  // The C lesson of each starting degree and string (6ª, 5ª, 4ª).
  const cLesson = (start: string, string: number) =>
    lessons.find((lesson) => lesson.key === `arpeggios/major/${start}/${string}/C`)?.scale ?? [];
  const shapeGrid = (start: string, name: Localized) =>
    [6, 5, 4].map((string) => (
      <div key={`${start}-${string}`} className="!mt-6">
        <p className="eyebrow text-brand-ink">
          {t(`${name.pt} na ${string}ª corda`, `${name.en} on the ${ORDINAL_EN[string]} string`)}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {cLesson(start, string).map((step) => (
            <ScaleCard key={step.position} step={step} />
          ))}
        </div>
      </div>
    ));
  return (
    <GuideLayout
      title={t("Arpejos de tríades", "Triad arpeggios")}
      sources={ARPEGGIO_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          Um arpejo é um acorde tocado nota por nota. A tríade maior tem três notas — a tônica, a terça e a
          quinta — e o módulo toca as três em três digitações a partir da tônica na 6ª, na 5ª e na 4ª corda.
        </>,
        <>
          An arpeggio is a chord played one note at a time. The major triad has three notes — the root, the
          third and the fifth — and the module plays them in three fingerings from the root on the 6th, 5th
          and 4th strings.
        </>,
      )}
    >
      <GuideSection title={t("As digitações em C", "The fingerings in C")}>
        {t(
          <p>
            As três digitações tocam as mesmas notas, C, E e G, mudando o dedo que começa na tônica: o dedo 1,
            o 2 e o 4. Nos diagramas, o número dentro de cada ponto é o dedo e o número ao lado é o grau
            (<strong>1</strong> tônica, <strong>3</strong> terça, <strong>5</strong> quinta).
          </p>,
          <p>
            The three fingerings play the same notes, C, E and G, changing the finger that starts on the root:
            finger 1, 2 and 4. In the diagrams, the number inside each dot is the finger and the number next to
            it is the degree (<strong>1</strong> root, <strong>3</strong> third, <strong>5</strong> fifth).
          </p>,
        )}
        {t(
          <p>
            Com a tônica na 5ª e na 4ª corda, as digitações são as mesmas, uma corda acima. Só a quinta da
            digitação 3 com a tônica na 4ª corda muda de casa: ela cai na 2ª corda, que fica a uma terça maior
            da 3ª (e não a uma quarta, como as outras), então sobe uma casa.
          </p>,
          <p>
            With the root on the 5th and 4th strings, the fingerings are the same, one string higher. Only the
            fifth of fingering 3 with the root on the 4th string changes fret: it falls on the 2nd string, a
            major third above the 3rd (not a fourth, like the others), so it moves up one fret.
          </p>,
        )}
        {shapeGrid("root", { pt: "Tônica", en: "Root" })}
      </GuideSection>

      <GuideSection title={t("Começando na terça", "Starting on the third")}>
        {t(
          <p>
            O mesmo arpejo pode começar na terça: em C, E G C. As três digitações seguem a mesma ideia — o
            dedo que toca a primeira nota muda (1, 2 e 3) — e a digitação 2 tem um pequeno salto do dedo 2 para
            a tônica. Com a terça na 4ª corda, a tônica da digitação 3 cai na 2ª corda, uma casa acima, e é
            tocada com o dedo 2.
          </p>,
          <p>
            The same arpeggio can start on the third: in C, E G C. The three fingerings follow the same idea —
            the finger on the first note changes (1, 2 and 3) — and fingering 2 has a small shift of finger 2
            to the root. With the third on the 4th string, the root of fingering 3 falls on the 2nd string, one
            fret higher, and is played with finger 2.
          </p>,
        )}
        {shapeGrid("third", { pt: "Terça", en: "Third" })}
      </GuideSection>

      <GuideSection title={t("Começando na quinta", "Starting on the fifth")}>
        {t(
          <p>
            Começando na quinta, o arpejo de C é G C E. As digitações têm saltos grandes de propósito: a
            digitação 1 leva o dedo 4 cinco casas acima na mesma corda, e a 2 toca duas notas seguidas com o
            dedo 1, mudando de corda. A digitação 3 usa os dedos 2, 3 e 1, uma nota por corda.
          </p>,
          <p>
            Starting on the fifth, the C arpeggio is G C E. The fingerings have big shifts on purpose:
            fingering 1 takes finger 4 five frets up the same string, and fingering 2 plays two notes in a row
            with finger 1, changing strings. Fingering 3 uses fingers 2, 3 and 1, one note per string.
          </p>,
        )}
        {shapeGrid("fifth", { pt: "Quinta", en: "Fifth" })}
      </GuideSection>

      <GuideSection
        title={t("Tríades menores e diminutas", "Minor and diminished triads")}
      >
        {t(
          <p>
            Cada seção tem também as tríades menores (1 ♭3 5) e diminutas (1 ♭3
            ♭5). As digitações são as mesmas da tríade maior, nas mesmas cordas
            e com os mesmos dedos: só a terça (e, na diminuta, também a quinta)
            desce uma casa. Abaixo, C menor e C diminuto com a tônica na 6ª
            corda.
          </p>,
          <p>
            Each section also has the minor (1 ♭3 5) and diminished (1 ♭3 ♭5)
            triads. The fingerings are the same as for the major triad, on the
            same strings and with the same fingers: only the third (and, in the
            diminished triad, the fifth too) moves down one fret. Below, C minor
            and C diminished with the root on the 6th string.
          </p>,
        )}
        {(["minor", "dim"] as const).map((quality) => (
          <div key={quality} className="!mt-6">
            <p className="eyebrow text-brand-ink">
              {quality === "minor"
                ? t("C menor", "C minor")
                : t("C diminuto", "C diminished")}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {(
                lessons.find(
                  (lesson) => lesson.key === `arpeggios/${quality}/root/6/C`,
                )?.scale ?? []
              ).map((step) => (
                <ScaleCard key={step.position} step={step} />
              ))}
            </div>
          </div>
        ))}
      </GuideSection>

      <GuideSection title={t("Como estudar", "How to practise")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Há uma aula para cada nota inicial (tônica, terça ou quinta), qualidade (maior, menor ou
              diminuta) e corda, cada uma com uma variação para cada tonalidade.
            </li>
            <li>Em cada tonalidade, toque cada digitação subindo e descendo, com o metrônomo.</li>
            <li>Diga em voz alta o grau de cada nota enquanto toca: 1, 3, 5 (ou 3, 5, 1, ou 5, 1, 3) e de volta.</li>
            <li>No exercício final, toque as digitações em sequência, no andamento do metrônomo.</li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              There is a lesson for each starting note (root, third or fifth), quality (major, minor or
              diminished) and string, each with a variation for every key.
            </li>
            <li>In each key, play each fingering up and down with the metronome.</li>
            <li>Say each note's degree out loud as you play: 1, 3, 5 (or 3, 5, 1, or 5, 1, 3) and back.</li>
            <li>In the final exercise, play the fingerings in sequence, in time with the metronome.</li>
          </ol>,
        )}
      </GuideSection>
    </GuideLayout>
  );
}

const SEVENTH_ARPEGGIO_SOURCES: GuideSource[] = [
  {
    label: "Wikipedia — Arpeggio",
    url: "https://en.wikipedia.org/wiki/Arpeggio",
  },
  {
    label: "Wikipedia — Seventh chord",
    url: "https://en.wikipedia.org/wiki/Seventh_chord",
  },
];

function SeventhArpeggiosGuide({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const qualities = [
    { id: "maj7", name: { pt: "C7+", en: "Cmaj7" }, degrees: "1 3 5 7" },
    { id: "m7", name: { pt: "Cm7", en: "Cm7" }, degrees: "1 ♭3 5 ♭7" },
    { id: "7", name: { pt: "C7", en: "C7" }, degrees: "1 3 5 ♭7" },
    {
      id: "m7b5",
      name: { pt: "Cm7(♭5)", en: "Cm7(♭5)" },
      degrees: "1 ♭3 ♭5 ♭7",
    },
  ];
  return (
    <GuideLayout
      title={t("Arpejos de tétrades", "Seventh chord arpeggios")}
      sources={SEVENTH_ARPEGGIO_SOURCES}
      onBack={onBack}
      intro={t(
        <>
          A tétrade é a tríade com a sétima: quatro notas. O módulo segue o de Arpejos de Tríades: cada acorde
          começando na tônica, na terça, na quinta e na sétima, a partir da 6ª, da 5ª e da 4ª corda, em até
          três digitações.
        </>,
        <>
          A seventh chord is a triad plus the seventh: four notes. The module follows Triad Arpeggios: each
          chord starting on the root, the third, the fifth and the seventh, from the 6th, 5th and 4th strings,
          in up to three fingerings.
        </>,
      )}
    >
      <GuideSection title={t("As quatro tétrades", "The four seventh chords")}>
        {t(
          <p>
            Nos diagramas, o número dentro de cada ponto é o dedo e o número ao lado é o grau. Abaixo, as
            digitações de cada tétrade em C com a tônica na 6ª corda.
          </p>,
          <p>
            In the diagrams, the number inside each dot is the finger and the number next to it is the degree.
            Below, the fingerings of each seventh chord in C with the root on the 6th string.
          </p>,
        )}
        {qualities.map((quality) => (
          <div key={quality.id} className="!mt-6">
            <p className="eyebrow text-brand-ink">
              <span className="normal-case">{t(quality.name.pt, quality.name.en)}</span> · {quality.degrees}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {(
                lessons.find((lesson) => lesson.key === `arpeggios7/${quality.id}/root/6/C`)?.scale ?? []
              ).map((step) => (
                <ScaleCard key={step.position} step={step} />
              ))}
            </div>
          </div>
        ))}
      </GuideSection>

      <GuideSection title={t("Como estudar", "How to practise")}>
        {t(
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Há uma aula para cada nota inicial (tônica, terça, quinta ou sétima), tétrade e corda, cada uma
              com uma variação para cada tonalidade.
            </li>
            <li>Em cada tonalidade, toque cada digitação subindo e descendo, com o metrônomo.</li>
            <li>Diga em voz alta o grau de cada nota enquanto toca.</li>
            <li>
              Nos exercícios, toque as inversões numa corda, as tétrades diatônicas subindo o braço e, por
              fim, em cada posição da escala maior.
            </li>
          </ol>,
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              There is a lesson for each starting note (root, third, fifth or seventh), chord and string, each
              with a variation for every key.
            </li>
            <li>In each key, play each fingering up and down with the metronome.</li>
            <li>Say each note's degree out loud as you play.</li>
            <li>
              In the exercises, play the inversions on one string, the diatonic seventh chords up the neck
              and, last, in each position of the major scale.
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
            formas em C das três qualidades, com o baixo na 6ª, 5ª, 4ª e 3ª corda. À esquerda de cada
            diagrama, cada corda que soa mostra o grau da nota: <strong>1</strong> é a fundamental,{" "}
            <strong>3</strong> a terça e <strong>5</strong> a quinta, com ♭ quando o intervalo é abaixado.
          </p>,
          <p>
            Every shape uses three neighbouring strings, with the notes as close together as possible.
            Below are the C shapes of the three qualities, with the bass on the 6th, 5th, 4th and 3rd string.
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
              com o baixo na 6ª, 5ª, 4ª e 3ª corda, da mais perto da pestana para a mais perto do corpo.
            </li>
            <li>O exercício final toca as quatro formas em sequência, no andamento do metrônomo.</li>
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
              bass on the 6th, 5th, 4th and 3rd string, from the one nearest the nut to the one nearest the body.
            </li>
            <li>The final exercise plays the four shapes in sequence, at the metronome tempo.</li>
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
  const [paywall, setPaywall] = useState(false);
  const premium = usePremium();
  const moduleRoute = useModuleRoute();
  const dictionary = useDictionaryRoute();
  const account = useAccount();
  const userId = account?.uid;
  const trailSections = applyProgress(sections, progress);
  const accountData = account?.data;

  // The default tempos chosen on the settings page follow the account to this browser.
  useEffect(() => {
    adoptAccountDefaults(accountData);
  }, [accountData]);

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

  // Analytics: one page view per screen (virtual path), and the lesson opened.
  const moduleOfLesson = (lesson: Lesson) => lesson.key.split("/")[0];
  const screenModule = trailSections.find((section) => moduleSlug(section) === moduleRoute);
  const screen = paywall
    ? { path: "/app/premium", title: "Paywall" }
    : dictionary.open
    ? { path: "/app/dicionario", title: "Chord Dictionary" }
    : guideSection !== null
      ? { path: `/app/modulo/${moduleSlug(sections.find((section) => section.id === guideSection) ?? sections[0])}/guia`, title: `Guide: ${sections.find((section) => section.id === guideSection)?.title.en ?? ""}` }
      : selectedLesson
        ? { path: `/app/aula/${selectedLesson.key}`, title: `${selectedLesson.title.en} (${selectedLesson.key})` }
        : screenModule
          ? { path: `/app/modulo/${moduleSlug(screenModule)}`, title: `Module: ${screenModule.title.en}` }
          : { path: "/app/", title: "Dashboard" };
  useEffect(() => {
    trackScreen(screen.path, screen.title);
  }, [screen.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const openedLesson = selectedLesson?.key;
  useEffect(() => {
    if (!selectedLesson) return;
    track("lesson_start", { lesson_key: selectedLesson.key, module: moduleOfLesson(selectedLesson), lesson_title: selectedLesson.title.en, repeat: selectedLesson.status === "done" });
  }, [openedLesson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opens an exercise, or the paywall once the free lessons are used up (src/premium.ts).
  function openLesson(lesson: Lesson) {
    if (isLocked({ premium, progress, lessonKey: lesson.key })) {
      setSelectedLesson(null);
      setPaywall(true);
      window.scrollTo(0, 0);
      return;
    }
    setSelectedLesson(lesson);
  }

  function completeLesson(lesson: Lesson, bpm: number) {
    track("lesson_complete", { lesson_key: lesson.key, module: moduleOfLesson(lesson), lesson_title: lesson.title.en, bpm, repeat: lesson.status === "done" });
    const result = { bpm, completedAt: new Date().toISOString() };
    setProgress((current) => {
      const next = { ...current, [lesson.key]: result };
      saveProgress(next);
      return next;
    });
    if (userId) void saveResultToAccount(lesson.key, result);
  }

  // The following key of the same lesson (trail), with its current status; none after the last key.
  function nextKeyOf(lesson: Lesson) {
    const trail = trailSections.flatMap((section) => section.trails).find((item) => item.lessons.some((other) => other.key === lesson.key));
    const next = trail?.lessons[trail.lessons.findIndex((other) => other.key === lesson.key) + 1];
    if (!next) return undefined;
    return {
      label: variationKey(next),
      open: () => {
        openLesson(next);
        window.scrollTo(0, 0);
      },
    };
  }

  // "Voltar ao módulo": a lesson always closes onto its module page, even when it was
  // opened from the dashboard ("Próxima aula").
  function exitLesson(lesson: Lesson) {
    setSelectedLesson(null);
    const section = sections.find((item) => item.trails.some((trail) => trail.lessons.some((other) => other.key === lesson.key)));
    if (section && moduleSlug(section) !== moduleRoute) window.location.hash = `${MODULE_HASH.slice(1)}${moduleSlug(section)}`;
  }

  if (dictionary.open) return <DictionaryPage onBack={dictionary.close} />;

  if (paywall) {
    return (
      <div className="min-h-dvh bg-canvas text-ink">
        <TopBar />
        <UpgradeView reason="limit" onBack={() => setPaywall(false)} />
      </div>
    );
  }

  if (guideSection !== null) {
    const Guide =
      guideSection === 2
        ? InversionsGuide
        : guideSection === 3
          ? TriadsGuide
          : guideSection === 4
            ? ScalesGuide
            : guideSection === 5
              ? ArpeggiosGuide
              : guideSection === 6
                ? SeventhArpeggiosGuide
                : guideSection === 7
                  ? AlteredGuide
                  : CagedGuide;
    return <Guide onBack={() => setGuideSection(null)} />;
  }

  if (selectedLesson) {
    return (
      <ExercisePage
        key={selectedLesson.id}
        lesson={selectedLesson}
        onExit={() => exitLesson(selectedLesson)}
        nextKey={nextKeyOf(selectedLesson)}
        onComplete={(bpm) => completeLesson(selectedLesson, bpm)}
      />
    );
  }

  const moduleSection = trailSections.find((section) => moduleSlug(section) === moduleRoute);
  if (moduleSection) {
    return (
      <ModulePage
        section={moduleSection}
        onSelect={openLesson}
        onOpenGuide={() => {
          setGuideSection(moduleSection.id);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return <Dashboard sections={trailSections} onSelect={openLesson} />;
}
