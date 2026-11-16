import { useEffect, useId, useRef, useState } from "react";

import { initialsOf, supabase, useSession } from "./auth/supabase.ts";
import { LANGUAGES, useI18n, type Lang } from "./i18n.tsx";
import { Icon } from "./Icon.tsx";

/**
 * Avatar with the user's initials (a profile icon when logged out); opens a menu
 * with the account (log out, or log in / sign up) and the language selector.
 * Used by the app's top bar and, for logged-in users, by the homepage header.
 */
export function UserMenu({
  basePath = "../",
  onLanguageChange,
  onSignOut,
}: {
  /** From the current page to the site root ("../" in app/, "" on the English homepage). */
  basePath?: string;
  /** Called after the language changes (the homepage moves to its page in that language). */
  onLanguageChange?: (lang: Lang) => void;
  /** Called after logging out. */
  onSignOut?: () => void;
} = {}) {
  const { t, lang, setLang } = useI18n();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Focus the selected language so the keyboard starts inside the menu.
    rootRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: Lang) {
    setLang(next);
    setOpen(false);
    buttonRef.current?.focus();
    onLanguageChange?.(next);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("Menu do usuário", "User menu")}
        className={`flex size-9 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-white transition hover:bg-ink-2 active:scale-95 ${
          open ? "bg-ink-2" : "bg-ink"
        }`}
      >
        {session ? initialsOf(session) : <Icon name="profile" className="size-5" />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("Menu do usuário", "User menu")}
          className="user-menu"
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next = (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}
        >
          {session ? (
            <div className="border-b border-line px-3 pb-3 pt-1">
              <p className="truncate text-sm font-semibold text-ink">
                {String(session.user.user_metadata?.first_name || session.user.email)}
              </p>
              {session.user.user_metadata?.first_name && (
                <p className="truncate text-xs text-muted">{session.user.email}</p>
              )}
            </div>
          ) : null}
          <p className="eyebrow px-3 pb-1.5 pt-3 text-muted" id={`${menuId}-language`}>
            {t("Idioma", "Language")}
          </p>
          <div role="group" aria-labelledby={`${menuId}-language`}>
            {LANGUAGES.map((language) => {
              const selected = language.id === lang;
              return (
                <button
                  key={language.id}
                  role="menuitemradio"
                  aria-checked={selected}
                  lang={language.htmlLang}
                  onClick={() => choose(language.id)}
                  className={`user-menu__item ${selected ? "user-menu__item--selected" : ""}`}
                >
                  <span>{language.label}</span>
                  {selected && <Icon name="check" className="size-4 [stroke-width:3]" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-line pt-2">
            {session ? (
              <>
              <a role="menuitem" href={`${basePath}profile/?lang=${lang}`} className="user-menu__item">
                {t("Meu perfil", "My profile")}
              </a>
              <button
                role="menuitem"
                className="user-menu__item"
                onClick={async () => {
                  await supabase?.auth.signOut();
                  setOpen(false);
                  onSignOut?.();
                }}
              >
                {t("Sair", "Log out")}
              </button>
              </>
            ) : (
              <>
                <a role="menuitem" href={`${basePath}login/?lang=${lang}`} className="user-menu__item">
                  {t("Entrar", "Log in")}
                </a>
                <a role="menuitem" href={`${basePath}signup/?lang=${lang}`} className="user-menu__item">
                  {t("Criar conta", "Sign up")}
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
