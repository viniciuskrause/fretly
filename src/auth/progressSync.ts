import { mergeProgress, type LessonResult, type Progress } from "../progress.ts";
import { supabase } from "./supabase.ts";

// Progress in the account (table public.lesson_progress, see supabase/migrations):
// the browser keeps working offline with localStorage, and while the learner is
// logged in every completion is also saved to the account. On log-in both sides
// are merged (newest completion wins), so practice done before creating the
// account, or on another device, is never lost.

type Row = { lesson_key: string; bpm: number; completed_at: string };

const toRow = (key: string, result: LessonResult): Row => ({
  lesson_key: key,
  bpm: result.bpm,
  completed_at: result.completedAt,
});

/**
 * Downloads the account's progress, merges it with this browser's and uploads
 * whatever the account is missing or has older. Returns the merged progress, or
 * null when it could not reach the account (the local progress stays as is).
 */
export async function syncProgress(local: Progress): Promise<Progress | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("lesson_progress").select("lesson_key, bpm, completed_at");
  if (error) {
    console.warn("Fretly: could not load progress from the account", error.message);
    return null;
  }
  const remote: Progress = Object.fromEntries(
    (data as Row[]).map((row) => [row.lesson_key, { bpm: row.bpm, completedAt: new Date(row.completed_at).toISOString() }]),
  );
  const merged = mergeProgress(remote, local);
  const missing = Object.entries(merged).filter(([key, result]) => {
    const current = remote[key];
    return !current || result.completedAt > current.completedAt;
  });
  if (missing.length) {
    const { error: upsertError } = await supabase
      .from("lesson_progress")
      .upsert(missing.map(([key, result]) => toRow(key, result)), { onConflict: "user_id,lesson_key" });
    if (upsertError) console.warn("Fretly: could not save progress to the account", upsertError.message);
  }
  return merged;
}

/** Saves one finished lesson to the account (no-op when logged out; retried on the next sync if it fails). */
export async function saveResultToAccount(key: string, result: LessonResult) {
  if (!supabase) return;
  const { error } = await supabase.from("lesson_progress").upsert(toRow(key, result), { onConflict: "user_id,lesson_key" });
  if (error) console.warn("Fretly: could not save progress to the account", error.message);
}
