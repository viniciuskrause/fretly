// Google Analytics 4 (the property linked to the Firebase project; measurement id
// in .env.local as VITE_FIREBASE_MEASUREMENT_ID). Loaded with gtag.js on the live
// site only (never on localhost). The app pages send their own page views: the app
// changes screen without loading a new page, so each screen gets a virtual path
// ("/app/modulo/caged", "/app/aula/caged/major/C"). The static homepage loads the
// same tag from its own HTML (scripts/landing/build.mjs).
// Never send personal data (e-mail, name) in an event. Loads only after the visitor
// accepts it (src/consent.ts).

import { withConsent } from "./consent.ts";

const MEASUREMENT_ID = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const enabled = !!MEASUREMENT_ID && !LOCAL_HOSTS.includes(window.location.hostname);

/**
 * Starts the tag on this page. `pageViews: false` when the page sends its own
 * (the app); the other pages let gtag count the page load.
 */
export function initAnalytics({ pageViews = true }: { pageViews?: boolean } = {}) {
  if (!enabled) return;
  withConsent(() => start(pageViews));
}

function start(pageViews: boolean) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: pageViews });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Sends an event (no-op on localhost or before initAnalytics). */
export function track(name: string, params: Record<string, string | number | boolean | undefined> = {}) {
  // Beacon: the event still goes out when the page navigates away right after (log-in).
  window.gtag?.("event", name, { ...params, transport_type: "beacon" });
}

/** A screen of the app, as a page view with a virtual path. */
export function trackScreen(path: string, title: string) {
  track("page_view", { page_location: `${window.location.origin}${path}`, page_title: title });
}
