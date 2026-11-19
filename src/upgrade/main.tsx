import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";

import { I18nProvider, useI18n } from "../i18n.tsx";
import "../index.css";
import { initAnalytics } from "../analytics.ts";
import { Header } from "../profile/ProfilePage.tsx";
import { UpgradeView } from "../premium/UpgradeView.tsx";

// Entry of the Premium page (upgrade/), opened from "Minha conta".
initAnalytics();

function UpgradePage() {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title = t("Premium – Guitar Workouts", "Premium – Guitar Workouts");
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Header />
      <UpgradeView onBack={() => window.location.assign(`../profile/?lang=${lang}`)} backLabel={t("Minha conta", "My account")} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <UpgradePage />
    </I18nProvider>
  </React.StrictMode>,
);
