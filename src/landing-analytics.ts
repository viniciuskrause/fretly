import { initAnalytics } from "./analytics.ts";
import { openConsent } from "./consent.ts";

// Static pages (scripts/landing/build.mjs): Google Analytics after consent, and the
// footer's "Cookies" link.

declare global {
  interface Window {
    gwRedirecting?: boolean;
  }
}

if (!window.gwRedirecting) initAnalytics();
for (const link of document.querySelectorAll("[data-consent-open]")) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openConsent();
  });
}
