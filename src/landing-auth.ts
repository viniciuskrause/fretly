import { accountsEnabled, verifiedAccount } from "./auth/firebase.ts";

// Homepage header (static HTML, see scripts/landing/build.mjs): shows the user's
// menu (initials + the app's drop-down) and "Continue practicing" only after
// Firebase confirms the session is valid. An inline script hides the header buttons while a stored session is
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
  if (!accountsEnabled || !header?.hasAttribute("data-auth-pending")) return;
  // Restores the stored session and asks the server about it, so a deleted or
  // disabled account is caught (and signed out in this browser).
  if (!(await verifiedAccount())) return show("out");
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
