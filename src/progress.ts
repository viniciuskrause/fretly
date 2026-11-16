import { lessons, type Lesson, type Section } from "./lessons.ts";

/** What the learner did in a finished lesson (one key variation). */
export type LessonResult = {
  /** Tempo (BPM) of the last run of the lesson's final exercise. */
  bpm: number;
  /** ISO date of the last completion; the newest wins when two devices disagree. */
  completedAt: string;
};

/** Finished lessons by stable lesson key ("caged/major/C"), never by the sequential id. */
export type Progress = Record<string, LessonResult>;

const STORAGE_KEY = "fretly.progress.v3";
/** v2 saved progress by sequential lesson id; it is converted to keys once. */
const LEGACY_KEY = "fretly.progress.v2";

const isResult = (value: unknown): value is LessonResult =>
  !!value &&
  typeof value === "object" &&
  typeof (value as LessonResult).bpm === "number" &&
  typeof (value as LessonResult).completedAt === "string";

/** Keeps only entries of lessons that still exist, with a valid shape. */
function clean(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") return {};
  const known = new Set(lessons.map((lesson) => lesson.key));
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, LessonResult] => known.has(entry[0]) && isResult(entry[1]),
    ),
  );
}

/** Saved progress for this browser (empty when storage is unavailable). */
export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return clean(JSON.parse(raw));
    // First run with keys: convert the id-based v2 progress, if any.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return {};
    const byId = JSON.parse(legacy) as Record<string, unknown>;
    const keyOf = new Map(lessons.map((lesson) => [String(lesson.id), lesson.key]));
    const converted = clean(
      Object.fromEntries(Object.entries(byId).flatMap(([id, result]) => (keyOf.has(id) ? [[keyOf.get(id)!, result]] : []))),
    );
    saveProgress(converted);
    return converted;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private mode or blocked storage: progress lasts for this visit only.
  }
}

/** Both progress records together; for a lesson in both, the newest completion wins. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const merged: Progress = { ...a };
  for (const [key, result] of Object.entries(b)) {
    const current = merged[key];
    if (!current || result.completedAt > current.completedAt) merged[key] = result;
  }
  return merged;
}

/**
 * Lesson statuses from the learner's progress: finished lessons are "done"
 * (with the tempo they used), the first unfinished lesson is "current" and the
 * rest are "locked".
 */
export function applyProgress(sections: Section[], progress: Progress): Section[] {
  let currentAssigned = false;
  const withStatus = (lesson: Lesson): Lesson => {
    const result = progress[lesson.key];
    if (result) return { ...lesson, status: "done", lastBpm: result.bpm };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...lesson, status: "current", lastBpm: undefined };
    }
    return { ...lesson, status: "locked", lastBpm: undefined };
  };
  return sections.map((section) => ({
    ...section,
    trails: section.trails.map((trail) => ({ ...trail, lessons: trail.lessons.map(withStatus) })),
  }));
}
