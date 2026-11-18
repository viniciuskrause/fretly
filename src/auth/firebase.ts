import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, getFirestore, onSnapshot, setDoc, type Firestore } from "firebase/firestore";
import { useSyncExternalStore } from "react";

/**
 * Accounts (sign-up, log-in, password reset) and the data saved in them, on
 * Firebase (Google Cloud): Firebase Authentication for the accounts and
 * Firestore for each learner's data:
 *
 *   users/{uid}                    first_name, username, language, default tempos, progress reset date
 *   users/{uid}/progress/{lesson}  one finished lesson (see progressSync.ts)
 *
 * firestore.rules lets every user read and write only their own documents.
 * The web config comes from .env.local (VITE_FIREBASE_*). It is public by
 * design (it ships in the browser bundle); access is controlled by Firebase
 * Auth and the security rules. Without it accounts are off and the auth pages
 * say that log-in is not configured yet.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const app = config.apiKey && config.projectId ? initializeApp(config) : null;
// Kept in localStorage (not IndexedDB) so the static homepage can tell, before
// any script loads, that a session may exist (scripts/landing/build.mjs).
export const auth: Auth | null = app ? initializeAuth(app, { persistence: browserLocalPersistence }) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const accountsEnabled = !!app;

/** Fields of users/{uid}. */
export type AccountData = {
  first_name?: string;
  username?: string;
  language?: string;
  default_bpm?: number;
  sequence_bpm?: number;
  progress_reset_at?: string;
};

/** The logged-in learner, as the pages need it. */
export type Account = {
  uid: string;
  email: string;
  firstName: string;
  username: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  data: AccountData;
  /** users/{uid} has been read at least once (data is the account's, not a placeholder). */
  dataLoaded: boolean;
};

/** Absolute URL of a page of the site, relative to the current one ("../app/"). */
export const siteUrl = (relative: string) => new URL(relative, window.location.href).href;

// One shared store: the auth user plus a live copy of users/{uid}.
type State = { ready: boolean; user: User | null; data: AccountData; dataLoaded: boolean };
let state: State = { ready: !auth, user: null, data: {}, dataLoaded: false };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
let stopData: (() => void) | null = null;
if (auth) {
  onAuthStateChanged(auth, (user) => {
    stopData?.();
    stopData = null;
    // An account whose e-mail is not confirmed yet counts as logged out.
    const active = user && user.emailVerified ? user : null;
    emit({ ready: true, user: active, data: {}, dataLoaded: false });
    if (active && db) {
      stopData = onSnapshot(
        doc(db, "users", active.uid),
        (snapshot) => emit({ data: (snapshot.data() as AccountData | undefined) ?? {}, dataLoaded: true }),
        (error) => {
          console.warn("Guitar Workouts: could not read the account", error.message);
          emit({ dataLoaded: true });
        },
      );
    }
  });
}

let cached: { from: State; account: Account | null } | null = null;
function accountOf(current: State): Account | null {
  if (cached?.from === current) return cached.account;
  const { user, data, dataLoaded } = current;
  const account: Account | null = user
    ? {
        uid: user.uid,
        email: user.email ?? "",
        firstName: (data.first_name ?? user.displayName ?? "").trim(),
        username: (data.username ?? "").trim(),
        createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
        lastSignInAt: user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null,
        data,
        dataLoaded,
      }
    : null;
  cached = { from: current, account };
  return account;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The logged-in account (null when logged out, while loading, or when accounts are off). */
export function useAccount() {
  return useSyncExternalStore(subscribe, () => accountOf(state));
}

/** Whether Firebase has finished restoring the session. */
export function useAccountReady() {
  return useSyncExternalStore(subscribe, () => state.ready);
}

/** Resolves once the stored session has been restored, with the account (or null). */
export async function currentAccount(): Promise<Account | null> {
  if (!auth) return null;
  await auth.authStateReady();
  return accountOf(state);
}

/** Initials shown in the avatar ("Rafael Lima" → "RL"; falls back to the e-mail). */
export function initialsOf(account: Account) {
  const source = account.firstName || account.email || "?";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Error with the Firebase code ("auth/invalid-credential") or one of ours ("email-not-verified"). */
export class AccountError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
const codeOf = (error: unknown) =>
  error instanceof AccountError ? error.code : String((error as { code?: string })?.code ?? (error as Error)?.message ?? error);

/** Runs an account action; returns null or the error code. */
async function attempt(action: () => Promise<unknown>): Promise<{ code: string } | null> {
  try {
    await action();
    return null;
  } catch (error) {
    return { code: codeOf(error) };
  }
}

function setEmailLanguage(lang: string) {
  if (auth) auth.languageCode = lang === "pt" ? "pt_br" : "en";
}

/**
 * Creates the account and sends the confirmation e-mail; the learner logs in
 * after confirming (the link returns to the log-in page).
 */
export function signUp(input: { email: string; password: string; firstName: string; username: string; lang: string }) {
  return attempt(async () => {
    if (!auth || !db) throw new AccountError("not-configured");
    setEmailLanguage(input.lang);
    const { user } = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await updateProfile(user, { displayName: input.firstName });
    await setDoc(doc(db, "users", user.uid), { first_name: input.firstName, username: input.username, language: input.lang }, { merge: true });
    await sendEmailVerification(user, { url: siteUrl(`../login/?lang=${input.lang}&verified=1`) });
    await signOut(auth);
  });
}

/** Logs in; an unconfirmed e-mail is refused ("email-not-verified"). */
export function signIn(email: string, password: string) {
  return attempt(async () => {
    if (!auth) throw new AccountError("not-configured");
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!user.emailVerified) {
      await signOut(auth);
      throw new AccountError("email-not-verified");
    }
  });
}

/** Sends a new confirmation e-mail (Firebase needs the password to know it is the owner). */
export function resendConfirmation(email: string, password: string, lang: string) {
  return attempt(async () => {
    if (!auth) throw new AccountError("not-configured");
    setEmailLanguage(lang);
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!user.emailVerified) await sendEmailVerification(user, { url: siteUrl(`../login/?lang=${lang}&verified=1`) });
    await signOut(auth);
  });
}

/** E-mails a link to choose a new password (Firebase's page), then back to the log-in page. */
export function sendPasswordReset(email: string, lang: string) {
  return attempt(async () => {
    if (!auth) throw new AccountError("not-configured");
    setEmailLanguage(lang);
    await sendPasswordResetEmail(auth, email, { url: siteUrl(`../login/?lang=${lang}`) });
  });
}

export async function signOutAccount() {
  if (auth) await signOut(auth);
}

/** Merges fields into users/{uid}. */
export function updateAccountData(data: Partial<AccountData>) {
  return attempt(async () => {
    const user = auth?.currentUser;
    if (!user || !db) throw new AccountError("not-authenticated");
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
  });
}

/** Asks for the password again (before deleting the account). */
export function confirmPassword(password: string) {
  return attempt(async () => {
    const user = auth?.currentUser;
    if (!user?.email) throw new AccountError("not-authenticated");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  });
}

/** Deletes the auth account (call deleteAccountData first, while still allowed to). */
export function deleteAuthAccount() {
  return attempt(async () => {
    const user = auth?.currentUser;
    if (!user) throw new AccountError("not-authenticated");
    await deleteUser(user);
  });
}

/**
 * Checks the stored session with the server (a deleted or disabled account is
 * signed out here). Used by the static homepage.
 */
export async function verifiedAccount(): Promise<Account | null> {
  if (!auth) return null;
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    await user.reload();
  } catch (error) {
    const code = codeOf(error);
    if (code === "auth/user-not-found" || code === "auth/user-disabled" || code === "auth/user-token-expired") await signOut(auth);
    return null;
  }
  return user.emailVerified ? accountOf(state) : null;
}
