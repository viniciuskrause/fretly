import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Fretly is bilingual: every text exists in Brazilian Portuguese and English.
 * UI strings sit side by side in the code (`t("Voltar", "Back")`); generated
 * lesson data carries a `Localized` value ({ pt, en }) for each text.
 */
export type Lang = "pt" | "en";

export type Localized = { pt: string; en: string };

export const LANGUAGES: Array<{ id: Lang; label: string; htmlLang: string }> = [
  { id: "pt", label: "Português", htmlLang: "pt-BR" },
  { id: "en", label: "English", htmlLang: "en" },
];

const STORAGE_KEY = "fretly.lang.v1";

function initialLang(): Lang {
  // A link from the homepage picks the language (?lang=pt); it is then remembered.
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "pt" || requested === "en") {
    try {
      window.localStorage.setItem(STORAGE_KEY, requested);
    } catch {
      // Blocked storage: the choice lasts for this visit only.
    }
    return requested;
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    // Blocked storage: fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Picks the text for the current language. */
  t: <T extends ReactNode>(pt: T, en: T) => T;
  /** Text of a generated `Localized` value. */
  l: (text: Localized) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children, lang: pageLang }: { children: ReactNode; /** Fixed by the page (the homepage is one page per language). */ lang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => pageLang ?? initialLang());

  useEffect(() => {
    document.documentElement.lang = LANGUAGES.find((item) => item.id === lang)!.htmlLang;
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Blocked storage: the choice lasts for this visit only.
    }
  }

  const value: I18n = {
    lang,
    setLang,
    t: (pt, en) => (lang === "en" ? en : pt),
    l: (text) => text[lang],
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

/**
 * Chord symbol as written in each language: Brazilian "7+" is "maj7" in English
 * ("C7+/E" → "Cmaj7/E"); everything else is the same.
 */
export function chordName(symbol: string, lang: Lang) {
  return lang === "en" ? symbol.replace("7+", "maj7") : symbol;
}
