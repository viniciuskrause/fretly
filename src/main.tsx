import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n.tsx";
import "./index.css";

// A confirmation or log-in link from an e-mail that failed (expired, already used):
// Supabase sends the learner here with the error in the URL. Show it on the log-in
// page, where a new link can be requested, instead of a silent logged-out app.
const hash = new URLSearchParams(window.location.hash.slice(1));
const query = new URLSearchParams(window.location.search);
const authError = hash.get("error_code") || query.get("error_code") || hash.get("error") || query.get("error");
if (authError) {
  const lang = query.get("lang");
  window.location.replace(`../login/?${lang ? `lang=${lang}&` : ""}auth_error=${encodeURIComponent(authError)}`);
} else
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
