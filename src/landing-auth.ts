import { supabase } from "./auth/supabase.ts";

// Homepage header (static HTML, see scripts/landing/build.mjs): shows the user's
// menu (initials + the app's drop-down) and "Continue practicing" only after
// Supabase confirms the session is valid. An inline script hides the header buttons while a stored session is
// being checked (data-auth-pending), so the wrong state never flashes.

const header = document.querySelector<HTMLElement>("[data-auth-root]");

function show(state: "in" | "out") {
  if (!header) return;
  header.querySelector('[data-auth="out"]')?.classList.toggle("hidden", state !== "out");
  header.querySelector('[data-auth="out"]')?.classList.toggle("flex", state === "out");
  header.querySelector('[data-auth="in"]')?.classList.toggle("hidden", state !== "in");
  header.querySelector('[data-auth="in"]')?.classList.toggle("flex", state === "in");
  header.removeAttribute("data-auth-pending");
}

async function verify() {
  if (!supabase || !header?.hasAttribute("data-auth-pending")) return;
  // getSession renews an expired access token (and stores it as the app expects);
  // getUser then asks the server, so a revoked session or deleted user is caught.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return show("out");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    // Rejected by the server: forget the stale session in this browser.
    if (error && "status" in error && (error.status === 401 || error.status === 403)) {
      await supabase.auth.signOut({ scope: "local" });
    }
    return show("out");
  }
  // The same initials + drop-down menu as in the app.
  const slot = header.querySelector<HTMLElement>("[data-auth-menu]");
  if (slot) {
    const { mountUserMenu } = await import("./landing-menu.tsx");
    mountUserMenu(slot, { onSignOut: () => show("out") });
  }
  show("in");
}

// Never leave the buttons hidden: if the check takes too long, fall back to logged out.
const fallback = window.setTimeout(() => show("out"), 5000);
verify()
  .catch(() => show("out"))
  .finally(() => window.clearTimeout(fallback));
