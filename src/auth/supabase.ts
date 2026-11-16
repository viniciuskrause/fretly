import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

/**
 * Supabase client for accounts (sign-up, log-in, password reset). The project
 * URL and the publishable key come from .env.local:
 *
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
 *
 * The publishable key is public by design (it ships in the browser bundle);
 * access is controlled by Supabase Auth and row-level security. Never put the
 * secret key (sb_secret_...) here. Without them the client is null and the
 * auth pages say that log-in is not configured yet. (A legacy anon key in
 * VITE_SUPABASE_ANON_KEY also works.)
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

/** Absolute URL of a page of the site, relative to the current one ("../app/"). */
export const siteUrl = (relative: string) => new URL(relative, window.location.href).href;

/** Current session (null when logged out or when auth is not configured). */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** Initials shown in the avatar ("Rafael Lima" → "RL"; falls back to the e-mail). */
export function initialsOf(session: Session) {
  const name = String(session.user.user_metadata?.first_name ?? "").trim();
  const source = name || session.user.email || "?";
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "")).toUpperCase();
}
