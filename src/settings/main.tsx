import React from "react";
import ReactDOM from "react-dom/client";

import { I18nProvider } from "../i18n.tsx";
import "../index.css";
import { SettingsPage } from "../profile/ProfilePage.tsx";

// Entry of the settings page (settings/), opened from the user menu.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <SettingsPage />
    </I18nProvider>
  </React.StrictMode>,
);
