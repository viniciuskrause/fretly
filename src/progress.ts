import type { Lesson, Section } from "./lessons.ts";

/** What the learner did in a finished lesson. */
export type LessonResult = {
  /** Tempo (BPM) of the last run of the lesson's final exercise. */
  bpm: number;
  completedAt: string;
};

export type Progress = Record<number, LessonResult>;

const STORAGE_KEY = "fretly.progress.v2";

/** Saved progress for this browser (empty when storage is unavailable). */
export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
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

/**
 * Lesson statuses from the learner's progress: finished lessons are "done"
 * (with the tempo they used), the first unfinished lesson is "current" and the
 * rest are "locked".
 */
export function applyProgress(sections: Section[], progress: Progress): Section[] {
  let currentAssigned = false;
  const withStatus = (lesson: Lesson): Lesson => {
    const result = progress[lesson.id];
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
