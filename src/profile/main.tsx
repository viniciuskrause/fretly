import React from "react";
import ReactDOM from "react-dom/client";

import { I18nProvider } from "../i18n.tsx";
import "../index.css";
import { initAnalytics } from "../analytics.ts";
import { ProfilePage } from "./ProfilePage.tsx";

// Entry of the profile page (profile/), opened from the user menu.
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <ProfilePage />
    </I18nProvider>
  </React.StrictMode>,
);
