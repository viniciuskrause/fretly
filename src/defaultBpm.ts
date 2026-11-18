import { supabase } from "./auth/supabase.ts";
import { storageKey } from "./storage.ts";

// Default metronome tempos: where the exercises start, and where the final
// exercise (all the lesson's shapes in sequence) starts — usually slower. A
// finished lesson reopens on its final exercise at the tempo of its last run,
// which is what the trail records. Chosen on the settings page,
// kept in this browser (read synchronously when an exercise opens) and in the
// account's user metadata, so it follows the learner to other devices.

export const MIN_BPM = 40;
export const MAX_BPM = 180;
export const FALLBACK_BPM = 72;
export const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

/** Which default: the exercises step by step, or the final exercise (the lesson's shapes in sequence). */
export type BpmKind = "exercise" | "sequence";

/** User metadata field of each default. */
export const DEFAULT_BPM_FIELDS: Record<BpmKind, string> = { exercise: "default_bpm", sequence: "sequence_bpm" };

const STORAGE_KEYS: Record<BpmKind, string> = { exercise: storageKey("defaultBpm.v1"), sequence: storageKey("sequenceBpm.v1") };

const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= MIN_BPM && value <= MAX_BPM;

/** The default tempo; the final exercise falls back to the exercises' default until one is chosen. */
export function loadDefaultBpm(kind: BpmKind = "exercise"): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEYS[kind]) ?? Number.NaN);
    if (valid(saved)) return Math.round(saved);
  } catch {
    // Blocked storage: use the fallback.
  }
  return kind === "sequence" ? loadDefaultBpm("exercise") : FALLBACK_BPM;
}

function storeLocally(kind: BpmKind, bpm: number) {
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], String(bpm));
  } catch {
    // Blocked storage: the account still keeps it.
  }
}

/** Takes the account's defaults (user metadata) into this browser. */
export function adoptAccountDefaults(metadata: Record<string, unknown> | undefined) {
  for (const kind of ["exercise", "sequence"] as const) {
    const value = metadata?.[DEFAULT_BPM_FIELDS[kind]];
    if (valid(value)) storeLocally(kind, Math.round(value));
  }
}

/** Saves a default in this browser and, when logged in, in the account. */
export async function saveDefaultBpm(kind: BpmKind, bpm: number): Promise<{ message: string } | null> {
  const value = clampBpm(bpm);
  storeLocally(kind, value);
  if (!supabase) return null;
  const { error } = await supabase.auth.updateUser({ data: { [DEFAULT_BPM_FIELDS[kind]]: value } });
  return error;
}
