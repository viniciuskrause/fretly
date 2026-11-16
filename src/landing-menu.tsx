import React from "react";
import ReactDOM from "react-dom/client";

import { I18nProvider, type Lang } from "./i18n.tsx";
import { UserMenu } from "./UserMenu.tsx";

/**
 * Mounts the app's user menu (initials + drop-down) in the homepage header.
 * Loaded by landing-auth.ts only after Supabase confirms the session, so
 * logged-out visitors never download React.
 */
export function mountUserMenu(container: HTMLElement, { onSignOut }: { onSignOut: () => void }) {
  const lang: Lang = document.documentElement.lang.startsWith("pt") ? "pt" : "en";
  const basePath = lang === "pt" ? "../" : "";
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <I18nProvider lang={lang}>
        <UserMenu
          basePath={basePath}
          onSignOut={onSignOut}
        />
      </I18nProvider>
    </React.StrictMode>,
  );
}
