import React from "react";
import ReactDOM from "react-dom/client";

import { I18nProvider } from "../i18n.tsx";
import "../index.css";
import { AuthPage, type AuthMode } from "./AuthPage.tsx";

// Entry of the sign-up (signup/) and log-in (login/) pages; the page says which via data-mode.
const root = document.getElementById("root")!;
const mode: AuthMode = root.dataset.mode === "signup" ? "signup" : "login";

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthPage mode={mode} />
    </I18nProvider>
  </React.StrictMode>,
);
