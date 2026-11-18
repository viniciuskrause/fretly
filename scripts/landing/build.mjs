#!/usr/bin/env node
// Writes the marketing homepage as static HTML, one page per language:
//   index.html (English, site root) and pt/index.html (Portuguese).
// Static HTML so search engines read every word without running JavaScript.
// The app itself lives in app/index.html.
//
//   node scripts/landing/build.mjs      (also run by `npm run landing` and deploy.sh)
import fs from "node:fs";
import path from "node:path";
import { lessons, sections } from "../../src/lessons.ts";
import { BRAND, SITE_URL, content } from "./content.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

/**
 * localStorage key where Firebase Auth keeps the session
 * ("firebase:authUser:<api key>:[DEFAULT]", src/auth/firebase.ts uses local
 * persistence), from VITE_FIREBASE_API_KEY in .env.local; null when accounts
 * are not configured.
 */
function sessionStorageKey() {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const apiKey = env.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1].trim();
    return apiKey ? `firebase:authUser:${apiKey}:[DEFAULT]` : null;
  } catch {
    return null;
  }
}
const SESSION_KEY = sessionStorageKey();

/** Google Analytics 4 measurement id (VITE_FIREBASE_MEASUREMENT_ID in .env.local); null = no tag. */
function measurementId() {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    return env.match(/^VITE_FIREBASE_MEASUREMENT_ID=(G-[A-Z0-9]+)$/m)?.[1] ?? null;
  } catch {
    return null;
  }
}
const MEASUREMENT_ID = measurementId();


// Real numbers from the lesson data.
const steps = lessons.flatMap((lesson) => lesson.steps);
// A voicing is a chord quality plus a shape, whatever the key: "C7+/E" and "F7+/A"
// played with the same shape count once. The shape is each string's fret relative
// to the lowest note played (muted strings as x), so open shapes moved up the neck match.
const qualityOf = (chord) => chord.replace(/^[A-G](♭|♯)?/, "").replace(/\/.*$/, "");
function shapeOf({ frets, baseFret }) {
  const absolute = frets.map((fret) => (fret < 0 ? null : fret === 0 ? 0 : baseFret + fret - 1));
  const lowest = Math.min(...absolute.filter((fret) => fret !== null));
  return absolute.map((fret) => (fret === null ? "x" : fret - lowest)).join(",");
}
const voicings = new Set(steps.map((step) => `${qualityOf(step.chord)}|${shapeOf(step.position)}`)).size;
const numbers = {
  lessons: sections.flatMap((section) => section.trails).length,
  exercises: lessons.length,
  voicings,
};

// ---- "How a lesson works" illustrations: static SVG versions of the app's own
// pieces (ChordDiagram in src/App.tsx, BpmControl, the lesson ring), so the
// homepage shows the experience without screenshots. Same geometry and tokens.
const DIAGRAM_COLUMN_WIDTH = 40.4;
const rowY = (string) => 48 + (5 - string) * 29;
const columnX = (fret) => 56 + (fret - 0.5) * DIAGRAM_COLUMN_WIDTH;

/** A chord diagram like the app's: strings as rows (low E at the bottom), degrees on the left. */
function chordDiagram({ frets, fingers, baseFret = 1, barre, degrees, active = [] }, label, extraClass = "") {
  const parts = [];
  for (let string = 0; string < 6; string++) {
    const on = active.includes(string);
    parts.push(`<line x1="56" y1="${rowY(string)}" x2="258" y2="${rowY(string)}" stroke-width="${on ? 4 : string === 5 ? 1.6 : 1.2}" class="${on ? "stroke-accent" : "stroke-subtle"}" />`);
    if (degrees[string]) parts.push(`<text x="31" y="${rowY(string) + 4.5}" text-anchor="end" font-size="13" font-weight="700" class="font-mono ${on ? "fill-accent-ink" : "fill-brand-ink"}">${degrees[string]}</text>`);
    if (frets[string] === 0 && on) parts.push(`<circle cx="42" cy="${rowY(string)}" r="7" fill="none" stroke-width="3" class="stroke-accent" />`);
  }
  for (let line = 0; line < 6; line++) {
    const nut = line === 0 && baseFret === 1;
    parts.push(`<line x1="${56 + line * DIAGRAM_COLUMN_WIDTH}" y1="48" x2="${56 + line * DIAGRAM_COLUMN_WIDTH}" y2="193" stroke-width="${nut ? 6 : 1.4}"${nut ? ' stroke-linecap="round"' : ""} class="stroke-ink-2" />`);
  }
  if (baseFret > 1) parts.push(`<text x="${columnX(1)}" y="215" text-anchor="middle" font-size="14" font-weight="600" class="fill-muted font-mono">${baseFret}</text>`);
  if (barre) parts.push(`<line x1="${columnX(barre.fret)}" y1="${rowY(barre.from)}" x2="${columnX(barre.fret)}" y2="${rowY(barre.to)}" stroke-width="18" stroke-linecap="round" class="stroke-ink" />`);
  frets.forEach((fret, string) => {
    if (fret <= 0 || (barre && fret === barre.fret && string >= barre.from && string <= barre.to)) return;
    const on = active.includes(string);
    parts.push(`<circle cx="${columnX(fret)}" cy="${rowY(string)}" r="${on ? 13 : 10}" class="${on ? "fill-accent" : "fill-ink"}" /><text x="${columnX(fret)}" y="${rowY(string) + 4}" text-anchor="middle" font-size="${on ? 12 : 11}" font-weight="700" class="fill-white font-mono">${fingers[string]}</text>`);
  });
  return `<svg viewBox="0 21 272 211" fill="none" class="block h-auto w-full ${extraClass}" role="img" aria-label="${escape(label)}">${parts.join("")}</svg>`;
}

const CHORDS = {
  cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], degrees: ["", "1", "3", "5", "7", "3"] },
  am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], degrees: ["", "1", "5", "1", "♭3", "5"], active: [4] },
};

const icon = (d, cls = "size-5") => `<svg class="${cls} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const METRONOME = '<path d="M8 3h8l4 18H4Z" /><path d="m12 16 3-9M8 17h8" />';
const GLOBE = '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />';
const PLAY = '<path d="m9 7 8 5-8 5Z" fill="currentColor" />';

/** 12-segment ring like the app's lesson icon: 4 keys done, the 5th next. */
function lessonRing(label, symbol) {
  const size = 280;
  const c = size / 2;
  const r = 118;
  const gap = 5;
  const point = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return `${(c + r * Math.cos(rad)).toFixed(2)} ${(c + r * Math.sin(rad)).toFixed(2)}`;
  };
  const segments = Array.from({ length: 12 }, (_, i) => {
    const start = -90 + i * 30 + gap / 2;
    const end = start + 30 - gap;
    const color = i < 4 ? "var(--color-brand)" : i === 4 ? "var(--color-accent)" : "var(--color-line)";
    return `<path d="M${point(start)} A${r} ${r} 0 0 1 ${point(end)}" stroke="${color}" stroke-width="16" fill="none" />`;
  }).join("");
  const keys = ["C", "F", "B♭", "E♭", "A♭", "D♭", "G♭", "B", "E", "A", "D", "G"]
    .map((key, i) => {
      const rad = ((-75 + i * 30) * Math.PI) / 180; // middle of segment i
      const x = c + (r - 34) * Math.cos(rad);
      const y = c + (r - 34) * Math.sin(rad) + 5;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--color-muted)" font-family="var(--font-display)">${key}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" class="h-auto w-full max-w-[200px]" role="img" aria-label="${escape(label)}">
          ${segments}
          ${keys}
          <circle cx="${c}" cy="${c}" r="58" fill="var(--color-accent)" />
          <text x="${c}" y="${c + 13}" text-anchor="middle" font-size="38" font-weight="700" fill="#fff" font-family="var(--font-display)" letter-spacing="-1.5">${symbol}</text>
        </svg>`;
}

/** The picture on top of each "How a lesson works" card, in the order of t.how.cards. */
function howVisuals(t, lang) {
  const v = t.how.visuals;
  const maj7 = lang === "en" ? "Cmaj7" : "C7+";
  const name = (text, cls = "text-[22px]") => `<p class="text-center font-display ${cls} font-bold tracking-[-0.03em] text-ink">${text}</p>`;
  const see = `<div class="w-full max-w-[210px]">${name(maj7)}${chordDiagram(CHORDS.cmaj7, v.see, "mt-1")}</div>`;
  const hear = `<div class="flex w-full max-w-[210px] flex-col items-center">${name("Am")}${chordDiagram(CHORDS.am, v.hear, "mt-1")}
            <span class="mt-2 flex h-9 items-center gap-1.5 rounded-control bg-accent px-4 text-sm font-semibold text-white">${icon(PLAY, "size-4")}${escape(v.play)}</span></div>`;
  // Four beats of the metronome, the second one sounding, over the tempo control.
  const beat = (on) => `<span class="block size-5 rounded-full ${on ? "bg-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" : "bg-line-strong"}"></span>`;
  const time = `<div class="flex w-full flex-col items-center" role="img" aria-label="${escape(v.time)}">
            <div class="flex items-center gap-4" aria-hidden="true">${[false, true, false, false].map(beat).join("")}</div>
            <div class="mt-8 flex items-center gap-2 rounded-control border border-line bg-surface p-1.5" aria-hidden="true">
              <span class="px-2 text-muted">${icon(METRONOME)}</span>
              <span class="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2">−</span>
              <span class="w-14 text-center font-mono text-[15px] font-semibold tabular-nums text-ink">72</span>
              <span class="flex size-9 items-center justify-center rounded-lg bg-sunken font-mono text-base font-semibold text-ink-2">+</span>
            </div>
            <span class="mt-4 rounded-full bg-brand-soft px-3 py-1 font-mono text-xs font-bold text-brand-ink">${escape(v.last)}</span></div>`;
  const keys = lessonRing(v.keys, lang === "en" ? "maj7" : "7+");
  return [see, hear, time, keys];
}

const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Path of a page from the site root: the homepage ("", "pt/") or the FAQ ("faq/", "pt/faq/"). */
const pathOf = (lang, kind) => content[lang].path + (kind === "faq" ? "faq/" : "");

/** One static page: the homepage or the FAQ, in one language (same head, header and footer). */
function page(lang, kind = "home") {
  const t = content[lang];
  const other = lang === "en" ? "pt" : "en";
  const here = pathOf(lang, kind);
  const up = "../".repeat(here.split("/").filter(Boolean).length); // from this page to the site root
  const appHref = `${up}app/?lang=${lang}`;
  const signupHref = `${up}signup/?lang=${lang}`;
  const loginHref = `${up}login/?lang=${lang}`;
  const otherHref = `${up}${pathOf(other, kind)}` || "./";
  const homeHref = `${up}${pathOf(lang, "home")}` || "./";
  const faqHref = `${up}${pathOf(lang, "faq")}`;
  const url = `${SITE_URL}${here}`;
  const title = kind === "faq" ? t.faqPage.title : t.title;
  const description = kind === "faq" ? t.faqPage.description : t.description;

  const image = `${SITE_URL}og-${lang}.png`;
  const jsonLd = kind === "faq" ? [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: t.htmlLang,
      mainEntity: t.faq.items.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ] : [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: BRAND,
      url: SITE_URL,
      inLanguage: t.htmlLang,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: BRAND,
      url,
      description: t.description,
      image,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser)",
      inLanguage: ["en", "pt-BR"],
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: t.practice.modules,
      educationalLevel: lang === "en" ? "Beginner to advanced" : "Iniciante a avançado",
    },
  ];

  return `<!doctype html>
<!-- Generated by scripts/landing/build.mjs from scripts/landing/content.mjs. Do not edit by hand. -->
<html lang="${t.htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <script>
      // The site lives at guitarworkouts.app: the Firebase addresses send visitors there (same page).
      if (/\\.web\\.app$|\\.firebaseapp\\.com$/.test(location.hostname)) location.replace("https://guitarworkouts.app" + location.pathname + location.search + location.hash);
    </script>${lang === "en" ? `
    <script>
      // Default language by country (src/geo.ts): no language chosen yet and the visitor
      // is in Brazil or Portugal → the Portuguese homepage. Firebase Hosting answers
      // /geo.json per country; while it answers the page stays hidden (at most 1.5 s).
      // The same page in Portuguese: / → /pt/, /faq/ → /pt/faq/.
      (function () {
        var chosen = null, geo = null;
        try {
          chosen = localStorage.getItem("guitar-workouts.lang.v1");
          geo = localStorage.getItem("guitar-workouts.geo.v1");
        } catch (error) {}
        if (chosen === "pt" || chosen === "en") return;
        function toPortuguese() {
          window.gwRedirecting = true;
          location.replace("/pt" + location.pathname + location.search + location.hash);
        }
        if (geo === "pt") return toPortuguese();
        if (geo === "en") return;
        var root = document.documentElement;
        root.style.visibility = "hidden";
        function show() { root.style.visibility = ""; }
        setTimeout(show, 1500);
        fetch("/geo.json", { cache: "no-store" })
          .then(function (response) { return response.json(); })
          .then(function (answer) {
            try { localStorage.setItem("guitar-workouts.geo.v1", answer.lang); } catch (error) {}
            if (answer.lang === "pt") toPortuguese(); else show();
          }, show);
      })();
    </script>` : ""}${MEASUREMENT_ID ? `
    <script>
      // Google Analytics 4 (same tag as the app, src/analytics.ts); not on localhost.
      if (!window.gwRedirecting && !/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { dataLayer.push(arguments); };
        gtag("js", new Date());
        gtag("config", "${MEASUREMENT_ID}");
        var tag = document.createElement("script");
        tag.async = true;
        tag.src = "https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}";
        document.head.appendChild(tag);
      }
    </script>` : ""}
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#F5F7FA" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${SITE_URL}${pathOf("en", kind)}" />
    <link rel="alternate" hreflang="pt-BR" href="${SITE_URL}${pathOf("pt", kind)}" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}${pathOf("en", kind)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${BRAND}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${t.ogLocale}" />
    <meta property="og:locale:alternate" content="${content[other].ogLocale}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escape(kind === "faq" ? title : t.hero.h1.join(""))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
    />
    <link rel="stylesheet" href="/src/index.css" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>${
      lang === "en" && kind === "home"
        ? `
    <script>
      // Old links to the app's dictionary (#dicionario) now live under app/.
      if (location.hash.startsWith("#dicionario")) location.replace("app/" + location.hash);
    </script>`
        : ""
    }
  </head>
  <body class="bg-canvas text-ink">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2">${lang === "en" ? "Skip to content" : "Pular para o conteúdo"}</a>

    <header class="border-b border-line bg-canvas">
      <nav data-auth-root class="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:h-[88px] sm:px-8" aria-label="${lang === "en" ? "Main" : "Principal"}">
        <a href="${homeHref}" class="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
          Guitar <span class="text-accent-ink">Workouts</span>
        </a>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3" data-auth="out">
          <a href="${loginHref}" class="flex h-11 items-center rounded-control border border-line-strong bg-surface px-4 text-[15px] font-semibold text-ink-2 transition-colors hover:border-subtle hover:text-ink">${escape(t.nav.login)}</a>
          <a href="${signupHref}" class="hidden h-11 items-center rounded-control bg-brand px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-strong sm:flex">${escape(t.nav.cta)}</a>
        </div>
        <div class="hidden shrink-0 items-center gap-3" data-auth="in">
          <a href="${appHref}" class="hidden h-11 items-center rounded-control bg-brand px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-strong sm:flex">${escape(t.nav.continue)}</a>
          <div data-auth-menu class="size-9"></div>
        </div>${SESSION_KEY ? `
        <script>
          // A session stored by Firebase in this browser: hide the header buttons until
          // src/landing-auth.ts confirms it with the server (then it shows the right state).
          try {
            if (localStorage.getItem(${JSON.stringify(SESSION_KEY)})) document.querySelector("[data-auth-root]").setAttribute("data-auth-pending", "");
          } catch (error) {}
        </script>` : ""}
      </nav>
    </header>

    <main id="main">${kind === "home" ? `
      <!-- Hero -->
      <section class="mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 pb-16 pt-14 text-center sm:px-8 sm:pt-24 lg:pb-24">
        <h1 class="max-w-[1040px] text-balance font-display text-[40px] font-bold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[60px] lg:text-[72px]">${escape(t.hero.h1[0])}<mark class="whitespace-nowrap rounded-[4px] bg-brand-soft px-1.5 text-brand-ink">${escape(t.hero.h1[1])}</mark>${escape(t.hero.h1[2])}</h1>
        <p class="mt-7 max-w-[880px] text-balance text-[19px] leading-8 text-ink-2 sm:text-[22px] sm:leading-9">${escape(t.hero.sub)}</p>
        <a href="${signupHref}" class="mt-10 flex h-14 items-center rounded-control bg-accent px-8 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.hero.cta)}</a>
        <ul class="mt-8 flex max-w-[760px] flex-wrap justify-center gap-x-6 gap-y-3">
${t.hero.checklist
  .map(
    (item) => `          <li class="flex items-center gap-2 text-[15px] font-semibold text-ink-2">
            <svg class="size-5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            <span>${escape(item)}</span>
          </li>`,
  )
  .join("\n")}
        </ul>
      </section>

      <!-- Stats -->
      <section class="border-y border-line bg-surface" aria-label="${escape(t.hero.statsLabel)}">
        <div class="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8">
          <dl class="mx-auto grid max-w-[880px] grid-cols-3 gap-6 text-center">
${t.hero
  .stats(numbers)
  .map(
    ([value, label]) => `            <div>
              <dt class="sr-only">${escape(label)}</dt>
              <dd class="font-display text-[36px] font-bold leading-none tracking-[-0.03em] text-brand-ink">${escape(value)}</dd>
              <dd class="mt-2 text-sm font-semibold text-muted">${escape(label)}</dd>
            </div>`,
  )
  .join("\n")}
          </dl>
        </div>
      </section>

      <!-- Story -->
      <section class="bg-ink text-white">
        <div class="mx-auto w-full max-w-[860px] px-4 py-16 sm:px-8 sm:py-24">
          <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[40px]">${escape(t.story.h2)}</h2>
${t.story.paragraphs.map((p) => `          <p class="mt-6 text-[18px] leading-8 text-on-ink-muted">${escape(p)}</p>`).join("\n")}
          <a href="${signupHref}" class="mt-10 inline-flex h-14 items-center rounded-control bg-accent px-8 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.story.cta)}</a>
        </div>
      </section>

      <!-- The practice path and what the app offers: articles with a marked heading, in two columns -->
      <section class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <div class="gap-16 lg:columns-2">
${t.practice.articles
  .map(
    ({ h, paragraphs }, i) => `          <article class="mb-12 break-inside-avoid last:mb-0">
            <h2${i === 0 ? ' id="path"' : ""} class="border-l-4 border-brand pl-4 font-display text-[26px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[28px]">${escape(h)}</h2>
${paragraphs.map((p) => `            <p class="mt-4 text-[17px] leading-8 text-ink-2">${escape(p)}</p>`).join("\n")}
          </article>`,
  )
  .join("\n")}
        </div>
      </section>

      <!-- How it works -->
      <section class="border-y border-line bg-surface">
        <div class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.how.h2)}</h2>
        <ol class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
${t.how.cards
  .map(
    ([title, text], i) => `          <li class="flex flex-col">
            <div class="flex h-[260px] items-center justify-center rounded-card border border-line bg-surface px-5 py-4">
            ${howVisuals(t, lang)[i]}
            </div>
            <div class="pt-6">
            <span class="flex size-10 items-center justify-center rounded-full bg-brand font-mono text-[15px] font-bold text-white" aria-hidden="true">${i + 1}</span>
            <h3 class="mt-5 font-display text-[21px] font-bold tracking-[-0.02em] text-ink">${escape(title)}</h3>
            <p class="mt-2 text-[16px] leading-7 text-ink-2">${escape(text)}</p>
            </div>
          </li>`,
  )
  .join("\n")}
        </ol>
        </div>
      </section>

      <!-- Play, compose, arrange -->
      <section class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.uses.h2)}</h2>
        <div class="mt-12 grid gap-x-16 gap-y-12 lg:grid-cols-2">
${t.uses.cards
  .map(
    ([title, text]) => `          <article>
            <h3 class="border-l-4 border-brand pl-4 font-display text-[26px] font-bold leading-tight tracking-[-0.03em] text-ink sm:text-[28px]">${escape(title)}</h3>
            <p class="mt-4 text-[17px] leading-8 text-ink-2">${escape(text)}</p>
          </article>`,
  )
  .join("\n")}
        </div>
      </section>

      <!-- Call to action -->
      <section class="bg-brand text-white">
        <div class="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-4 py-16 text-center sm:px-8 sm:py-20">
          <div class="max-w-[720px]">
            <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[40px]">${escape(t.ctaBand.h2)}</h2>
            <p class="mt-4 text-[18px] leading-8 text-brand-soft">${escape(t.ctaBand.text)}</p>
          </div>
          <div class="flex flex-col items-center">
            <a href="${signupHref}" class="flex h-14 items-center justify-center rounded-control bg-accent px-8 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.ctaBand.cta)}</a>
            <p class="mt-3 text-sm text-brand-soft">${escape(t.ctaBand.note)}</p>
          </div>
        </div>
      </section>

` : `
      <!-- FAQ page -->
      <section class="mx-auto w-full max-w-[860px] px-4 py-16 sm:px-8 sm:py-24">
        <h1 class="font-display text-[36px] font-bold leading-tight tracking-[-0.04em] text-ink sm:text-[48px]">${escape(t.faq.h2)}</h1>
        <div class="mt-8 divide-y divide-line border-y border-line">
${t.faq.items
  .map(
    ([q, a]) => `          <details class="group py-5">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[19px] font-semibold text-ink">
              <h3>${escape(q)}</h3>
              <svg class="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <p class="mt-3 text-[16px] leading-7 text-ink-2">${escape(a)}</p>
          </details>`,
  )
  .join("\n")}
        </div>
        <div class="mt-14 flex flex-col items-center text-center">
          <p class="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">${escape(t.ctaBand.h2)}</p>
          <a href="${signupHref}" class="mt-6 flex h-14 items-center rounded-control bg-accent px-8 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.ctaBand.cta)}</a>
        </div>
      </section>`}
    </main>

    <footer class="border-t border-brand-strong bg-brand text-white">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p class="text-sm text-brand-soft">© ${new Date().getFullYear()} ${BRAND} · ${escape(t.footer.rights)}</p>
        <ul class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
          <li><a href="${faqHref}"${kind === "faq" ? ' aria-current="page"' : ""} class="text-white underline-offset-4 hover:underline">${escape(t.footer.faq)}</a></li>
          <li><a href="${otherHref}" hreflang="${content[other].htmlLang}" lang="${content[other].htmlLang}" onclick="try { localStorage.setItem('guitar-workouts.lang.v1', '${other}') } catch (error) {}" class="flex h-10 items-center gap-2 rounded-control border border-brand-line px-3 text-white transition-colors hover:bg-brand-strong" aria-label="${escape(t.footer.languageLabel)}" title="${escape(t.footer.languageLabel)}">${icon(GLOBE, "size-5")}<span>${other.toUpperCase()}</span></a></li>
        </ul>
      </div>
    </footer>${SESSION_KEY ? `
    <script type="module" src="/src/landing-auth.ts"></script>` : ""}
  </body>
</html>
`;
}

const KINDS = ["home", "faq"];
for (const kind of KINDS) {
  for (const lang of ["en", "pt"]) {
    const file = path.join(ROOT, pathOf(lang, kind), "index.html");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page(lang, kind));
  }
}

// Sitemap: each page in both languages, linked as alternates.
const alternates = (kind) =>
  ["en", "pt"].map((l) => `    <xhtml:link rel="alternate" hreflang="${content[l].htmlLang}" href="${SITE_URL}${pathOf(l, kind)}" />`).join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${KINDS.flatMap((kind) => ["en", "pt"].map((l) => `  <url>\n    <loc>${SITE_URL}${pathOf(l, kind)}</loc>\n${alternates(kind)}\n  </url>`)).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "public/sitemap.xml"), sitemap);
// Account pages carry their own noindex; the sitemap lists the homepages and the FAQ.
fs.writeFileSync(path.join(ROOT, "public/robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
console.log(`landing: index.html, pt/index.html, faq/, pt/faq/, public/sitemap.xml (${numbers.lessons} aulas, ${numbers.exercises} exercícios, ${numbers.voicings} voicings)`);
