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
const uniqueFingerings = new Set(steps.map((step) => `${step.chord}|${step.position.baseFret}|${step.position.frets}`)).size;
const numbers = {
  lessons: sections.flatMap((section) => section.trails).length,
  exercises: lessons.length,
  fingerings: Math.floor(uniqueFingerings / 100) * 100,
};

const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--color-muted)" font-family="var(--font-display)">${key}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" class="h-auto w-full max-w-[300px]" role="img" aria-label="${escape(label)}">
          ${segments}
          ${keys}
          <circle cx="${c}" cy="${c}" r="58" fill="var(--color-accent)" />
          <text x="${c}" y="${c + 13}" text-anchor="middle" font-size="38" font-weight="700" fill="#fff" font-family="var(--font-display)" letter-spacing="-1.5">${symbol}</text>
        </svg>`;
}

function page(lang) {
  const t = content[lang];
  const other = lang === "en" ? "pt" : "en";
  const up = lang === "en" ? "" : "../"; // from this page to the site root
  const appHref = `${up}app/?lang=${lang}`;
  const signupHref = `${up}signup/?lang=${lang}`;
  const loginHref = `${up}login/?lang=${lang}`;
  const dictionaryHref = `${up}app/?lang=${lang}#dicionario`;
  const otherHref = lang === "en" ? "pt/" : "../";
  const url = `${SITE_URL}${t.path}`;

  const image = `${SITE_URL}og-${lang}.png`;
  const jsonLd = [
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
      featureList: t.curriculum.modules.map(([title]) => title),
      educationalLevel: lang === "en" ? "Beginner to advanced" : "Iniciante a avançado",
    },
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
  ];

  // Cards sit under a section h2, so their titles are h3 (one h1, then h2 → h3).
  const textCard = ([title, text]) => `
          <article class="rounded-card border border-line bg-surface p-6 sm:p-8">
            <h3 class="font-display text-[22px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[24px]">${escape(title)}</h3>
            <p class="mt-3 text-[16px] leading-7 text-ink-2">${escape(text)}</p>
          </article>`;

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
      (function () {
        var chosen = null, geo = null;
        try {
          chosen = localStorage.getItem("guitar-workouts.lang.v1");
          geo = localStorage.getItem("guitar-workouts.geo.v1");
        } catch (error) {}
        if (chosen === "pt" || chosen === "en") return;
        function toPortuguese() {
          window.gwRedirecting = true;
          location.replace("pt/" + location.search + location.hash);
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
    <title>${escape(t.title)}</title>
    <meta name="description" content="${escape(t.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${SITE_URL}${content.en.path}" />
    <link rel="alternate" hreflang="pt-BR" href="${SITE_URL}${content.pt.path}" />
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${BRAND}" />
    <meta property="og:title" content="${escape(t.title)}" />
    <meta property="og:description" content="${escape(t.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${t.ogLocale}" />
    <meta property="og:locale:alternate" content="${content[other].ogLocale}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escape(t.hero.h1)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(t.title)}" />
    <meta name="twitter:description" content="${escape(t.description)}" />
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
      lang === "en"
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
        <a href="${lang === "en" ? "./" : "./"}" class="font-display text-[19px] font-bold leading-none tracking-[-0.03em] text-ink sm:text-[22px]">
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

    <main id="main">
      <!-- Hero -->
      <section class="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16 lg:pb-24">
        <div>
          <h1 class="text-balance font-display text-[38px] font-bold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[56px]">${escape(t.hero.h1)}</h1>
          <p class="mt-6 max-w-[620px] text-[19px] leading-8 text-ink-2">${escape(t.hero.sub)}</p>
          <div class="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href="${signupHref}" class="flex h-14 items-center rounded-control bg-accent px-7 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.hero.cta)}</a>
            <span class="text-sm font-medium text-muted">${escape(t.hero.ctaNote)}</span>
          </div>
          <ul class="mt-10 grid gap-3 sm:grid-cols-2">
${t.hero.checklist
  .map(
    (item) => `            <li class="flex items-start gap-3 text-[16px] font-medium leading-6 text-ink-2">
              <svg class="mt-0.5 size-5 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              <span>${escape(item)}</span>
            </li>`,
  )
  .join("\n")}
          </ul>
        </div>
        <div class="flex justify-center">
          ${lessonRing(t.hero.ringLabel, lang === "en" ? "maj7" : "7+")}
        </div>
      </section>

      <!-- Stats -->
      <section class="border-y border-line bg-surface" aria-label="${escape(t.hero.statsLabel)}">
        <div class="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-8">
          <dl class="grid grid-cols-2 gap-6 sm:grid-cols-4">
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
        </div>
      </section>

      <!-- The modules -->
      <section class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24" aria-labelledby="path">
        <h2 id="path" class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.curriculum.h2)}</h2>
        <p class="mt-4 max-w-[720px] text-[18px] leading-8 text-ink-2">${escape(t.curriculum.intro)}</p>
        <div class="mt-10 grid gap-4 md:grid-cols-2">${t.curriculum.modules.map(textCard).join("")}
        </div>
      </section>

      <!-- How it works -->
      <section class="border-y border-line bg-surface">
        <div class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.how.h2)}</h2>
        <ol class="mt-10 grid gap-4 md:grid-cols-3">
${t.how.cards
  .map(
    ([title, text], i) => `          <li class="rounded-card border border-line bg-canvas p-6 sm:p-8">
            <span class="flex size-10 items-center justify-center rounded-full bg-brand font-mono text-[15px] font-bold text-white" aria-hidden="true">${i + 1}</span>
            <h3 class="mt-5 font-display text-[21px] font-bold tracking-[-0.02em] text-ink">${escape(title)}</h3>
            <p class="mt-2 text-[16px] leading-7 text-ink-2">${escape(text)}</p>
          </li>`,
  )
  .join("\n")}
        </ol>
        </div>
      </section>

      <!-- Play, compose, arrange -->
      <section class="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.uses.h2)}</h2>
        <div class="mt-10 grid gap-4 md:grid-cols-3">${t.uses.cards.map(textCard).join("")}
        </div>
      </section>

      <!-- Features -->
      <section class="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-8 sm:pb-24">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.features.h2)}</h2>
        <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">${t.features.cards.map(textCard).join("")}
        </div>
      </section>

      <!-- Call to action -->
      <section class="bg-brand text-white">
        <div class="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-8 px-4 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-[680px]">
            <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] sm:text-[40px]">${escape(t.ctaBand.h2)}</h2>
            <p class="mt-4 text-[18px] leading-8 text-brand-soft">${escape(t.ctaBand.text)}</p>
          </div>
          <div class="shrink-0">
            <a href="${signupHref}" class="flex h-14 items-center justify-center rounded-control bg-accent px-8 text-[17px] font-semibold text-white transition-colors hover:bg-accent-strong">${escape(t.ctaBand.cta)}</a>
            <p class="mt-3 max-w-[260px] text-sm text-brand-soft">${escape(t.ctaBand.note)}</p>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="mx-auto w-full max-w-[860px] px-4 py-20 sm:px-8 sm:py-28">
        <h2 class="font-display text-[30px] font-bold leading-tight tracking-[-0.035em] text-ink sm:text-[40px]">${escape(t.faq.h2)}</h2>
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
      </section>
    </main>

    <footer class="border-t border-line bg-surface">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p class="text-sm text-muted">© ${new Date().getFullYear()} ${BRAND} · ${escape(t.footer.rights)}</p>
        <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <li><a href="${appHref}" class="text-ink-2 hover:text-brand-ink">${escape(t.footer.app)}</a></li>
          <li><a href="${dictionaryHref}" class="text-ink-2 hover:text-brand-ink">${escape(t.footer.dictionary)}</a></li>
          <li><a href="${otherHref}" hreflang="${content[other].htmlLang}" lang="${content[other].htmlLang}" onclick="try { localStorage.setItem('guitar-workouts.lang.v1', '${other}') } catch (error) {}" class="text-ink-2 hover:text-brand-ink">${escape(t.footer.language)}</a></li>
        </ul>
      </div>
    </footer>${SESSION_KEY ? `
    <script type="module" src="/src/landing-auth.ts"></script>` : ""}
  </body>
</html>
`;
}

for (const lang of ["en", "pt"]) {
  const file = path.join(ROOT, content[lang].path, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(lang));
}

// Sitemap with both languages linked as alternates.
const alternates = ["en", "pt"]
  .map((l) => `    <xhtml:link rel="alternate" hreflang="${content[l].htmlLang}" href="${SITE_URL}${content[l].path}" />`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${["en", "pt"]
  .map((l) => `  <url>\n    <loc>${SITE_URL}${content[l].path}</loc>\n${alternates}\n  </url>`)
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "public/sitemap.xml"), sitemap);
// Account pages carry their own noindex; the sitemap lists the two homepages.
fs.writeFileSync(path.join(ROOT, "public/robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
console.log(`landing: index.html, pt/index.html, public/sitemap.xml (${numbers.lessons} aulas, ${numbers.exercises} exercícios, ${numbers.fingerings}+ digitações)`);
