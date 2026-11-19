// Consent for Google Analytics (German TDDDG § 25 / GDPR): the tag only loads after
// the visitor accepts it in this banner. The choice is kept in this browser; the
// "Cookies" link in the footer opens the banner again (openConsent). Shared by the
// static pages (src/landing-analytics.ts) and the app pages (src/analytics.ts).

import { storageKey } from "./storage.ts";

const KEY = storageKey("consent.v1");
type Choice = "granted" | "denied";

function stored(): Choice | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function store(choice: Choice) {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    // Blocked storage: ask again next time.
  }
}

let onGrant: (() => void) | null = null;

function banner() {
  if (document.getElementById("gw-consent")) return;
  const pt = document.documentElement.lang.toLowerCase().startsWith("pt");
  const privacy = pt ? "/pt/privacidade/" : "/privacy/";
  const box = document.createElement("div");
  box.id = "gw-consent";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-live", "polite");
  box.setAttribute("aria-label", pt ? "Cookies" : "Cookies");
  box.className = "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[640px] rounded-card border border-line-strong bg-surface p-5 text-ink sm:inset-x-6 sm:bottom-6";
  box.innerHTML = `
    <p class="text-[15px] leading-6 text-ink-2">${
      pt
        ? `Usamos o Google Analytics para entender como o site é usado, só se você aceitar. <a href="${privacy}" class="font-semibold text-brand-ink underline underline-offset-2">Política de privacidade</a>`
        : `We use Google Analytics to understand how the site is used, only if you accept. <a href="${privacy}" class="font-semibold text-brand-ink underline underline-offset-2">Privacy policy</a>`
    }</p>
    <div class="mt-4 flex flex-wrap gap-3">
      <button type="button" data-choice="granted" class="flex h-11 items-center rounded-control bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-strong">${pt ? "Aceitar" : "Accept"}</button>
      <button type="button" data-choice="denied" class="flex h-11 items-center rounded-control border border-line-strong bg-surface px-5 text-[15px] font-semibold text-ink-2 hover:bg-sunken">${pt ? "Recusar" : "Decline"}</button>
    </div>`;
  box.addEventListener("click", (event) => {
    const choice = (event.target as HTMLElement).closest("button")?.dataset.choice as Choice | undefined;
    if (!choice) return;
    const before = stored();
    store(choice);
    box.remove();
    if (choice === "granted") onGrant?.();
    // Withdrawn after it was running: reload so the tag is gone.
    else if (before === "granted") window.location.reload();
  });
  document.body.appendChild(box);
}

/** Runs `start` now if the visitor accepted analytics, or later when they do. */
export function withConsent(start: () => void) {
  onGrant = start;
  const choice = stored();
  if (choice === "granted") start();
  else if (choice === null) banner();
}

/** Opens the banner again (footer link "Cookies"). */
export function openConsent() {
  banner();
}
