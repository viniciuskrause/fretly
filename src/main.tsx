import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n.tsx";
import "./index.css";
import { initAnalytics } from "./analytics.ts";

// The app sends a page view per screen itself (see App).
initAnalytics({ pageViews: false });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
