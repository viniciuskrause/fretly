import { supabase } from "./auth/supabase.ts";

// Default metronome tempo: where every exercise starts (a lesson already
// finished reopens at the tempo of its last run). Chosen on the profile page,
// kept in this browser (read synchronously when an exercise opens) and in the
// account's user metadata, so it follows the learner to other devices.

export const MIN_BPM = 40;
export const MAX_BPM = 180;
export const FALLBACK_BPM = 72;
export const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

/** User metadata field with the default tempo. */
export const DEFAULT_BPM_FIELD = "default_bpm";

const STORAGE_KEY = "fretly.defaultBpm.v1";

const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= MIN_BPM && value <= MAX_BPM;

export function loadDefaultBpm(): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (valid(saved)) return Math.round(saved);
  } catch {
    // Blocked storage: use the fallback.
  }
  return FALLBACK_BPM;
}

function storeLocally(bpm: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(bpm));
  } catch {
    // Blocked storage: the account still keeps it.
  }
}

/** Takes the account's default (user metadata) into this browser. */
export function adoptAccountDefaultBpm(value: unknown) {
  if (valid(value)) storeLocally(Math.round(value));
}

/** Saves the default in this browser and, when logged in, in the account. */
export async function saveDefaultBpm(bpm: number): Promise<{ message: string } | null> {
  const value = clampBpm(bpm);
  storeLocally(value);
  if (!supabase) return null;
  const { error } = await supabase.auth.updateUser({ data: { [DEFAULT_BPM_FIELD]: value } });
  return error;
}
