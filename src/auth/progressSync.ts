import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";

import { clearLocalProgress, mergeProgress, type LessonResult, type Progress } from "../progress.ts";
import { auth, currentAccount, db, updateAccountData } from "./firebase.ts";

// Progress in the account (Firestore users/{uid}/progress, one document per
// finished lesson): the browser keeps working offline with localStorage, and
// while the learner is logged in every completion is also saved to the account.
// On log-in both sides are merged (newest completion wins), so practice done
// before creating the account, or on another device, is never lost.

/** Account field (users/{uid}) with the ISO date of the last progress reset (settings page). */
export const PROGRESS_RESET_AT = "progress_reset_at";

type Row = { lesson_key: string; bpm: number; completed_at: string };

/** Lesson keys have "/" ("caged/major/C"), which Firestore ids can't: encode them. */
const docId = (key: string) => encodeURIComponent(key);

const toRow = (key: string, result: LessonResult): Row => ({
  lesson_key: key,
  bpm: result.bpm,
  completed_at: result.completedAt,
});

function progressCollection() {
  const uid = auth?.currentUser?.uid;
  return uid && db ? collection(db, "users", uid, "progress") : null;
}

/** Writes in batches (Firestore takes up to 500 writes per batch). */
async function inBatches<T>(items: T[], write: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  if (!db) return;
  for (let start = 0; start < items.length; start += 400) {
    const batch = writeBatch(db);
    items.slice(start, start + 400).forEach((item) => write(batch, item));
    await batch.commit();
  }
}

/**
 * Downloads the account's progress, merges it with this browser's and uploads
 * whatever the account is missing or has older. Returns the merged progress, or
 * null when it could not reach the account (the local progress stays as is).
 */
export async function syncProgress(local: Progress): Promise<Progress | null> {
  const account = await currentAccount();
  const progress = progressCollection();
  if (!account || !progress) return null;
  // Progress reset on the settings page (maybe on another device): drop what this
  // browser finished before the reset, so it is not uploaded back.
  const resetAt = String(account.data[PROGRESS_RESET_AT] ?? "");
  if (resetAt) local = Object.fromEntries(Object.entries(local).filter(([, result]) => result.completedAt > resetAt));
  let remote: Progress;
  try {
    const snapshot = await getDocs(progress);
    remote = Object.fromEntries(
      snapshot.docs.map((item) => {
        const row = item.data() as Row;
        return [row.lesson_key, { bpm: row.bpm, completedAt: row.completed_at }];
      }),
    );
  } catch (error) {
    console.warn("Guitar Workouts: could not load progress from the account", (error as Error).message);
    return null;
  }
  const merged = mergeProgress(remote, local);
  const missing = Object.entries(merged).filter(([key, result]) => {
    const current = remote[key];
    return !current || result.completedAt > current.completedAt;
  });
  try {
    await inBatches(missing, (batch, [key, result]) => batch.set(doc(progress, docId(key)), toRow(key, result)));
  } catch (error) {
    console.warn("Guitar Workouts: could not save progress to the account", (error as Error).message);
  }
  return merged;
}

/** Saves one finished lesson to the account (no-op when logged out; retried on the next sync if it fails). */
export async function saveResultToAccount(key: string, result: LessonResult) {
  const progress = progressCollection();
  if (!progress) return;
  try {
    await setDoc(doc(progress, docId(key)), toRow(key, result));
  } catch (error) {
    console.warn("Guitar Workouts: could not save progress to the account", (error as Error).message);
  }
}

/** Deletes every progress document of the logged-in account. */
export async function deleteAccountProgress() {
  const progress = progressCollection();
  if (!progress) return;
  const snapshot = await getDocs(progress);
  await inBatches(snapshot.docs, (batch, item) => batch.delete(item.ref));
}

/**
 * Erases the learner's progress: the account's documents, this browser's copy, and
 * (through the reset date in the account) older copies on other devices.
 */
export async function resetAccountProgress(): Promise<{ code: string } | null> {
  const failure = await updateAccountData({ [PROGRESS_RESET_AT]: new Date().toISOString() });
  if (failure) return failure;
  try {
    await deleteAccountProgress();
  } catch (error) {
    return { code: String((error as { code?: string }).code ?? (error as Error).message) };
  }
  clearLocalProgress();
  return null;
}

/** Deletes users/{uid} and its progress (before the auth account itself is deleted). */
export async function deleteAccountData(): Promise<{ code: string } | null> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return { code: "not-authenticated" };
  try {
    await deleteAccountProgress();
    await deleteDoc(doc(db, "users", uid));
  } catch (error) {
    return { code: String((error as { code?: string }).code ?? (error as Error).message) };
  }
  return null;
}
