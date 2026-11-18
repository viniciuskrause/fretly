import type { Lang } from "./i18n.tsx";
import { storageKey } from "./storage.ts";

// Default language by country: Brazil and Portugal get Portuguese, everywhere else
// English. Firebase Hosting knows the visitor's country (from the IP) and serves
// /geo.json from public/localized/ALL_<country>/ when there is one (i18n rewrites in
// firebase.json), else public/geo.json. Only a default: a language the learner picks
// (or a ?lang= link) always wins. The answer is kept in this browser.

const GEO_KEY = storageKey("geo.v1");

export function cachedGeoLang(): Lang | null {
  try {
    const saved = window.localStorage.getItem(GEO_KEY);
    return saved === "pt" || saved === "en" ? saved : null;
  } catch {
    return null;
  }
}

export async function fetchGeoLang(): Promise<Lang | null> {
  try {
    const response = await fetch("/geo.json", { cache: "no-store" });
    const { lang } = (await response.json()) as { lang?: string };
    if (lang !== "pt" && lang !== "en") return null;
    try {
      window.localStorage.setItem(GEO_KEY, lang);
    } catch {
      // Blocked storage: asked again on the next visit.
    }
    return lang;
  } catch {
    return null;
  }
}
