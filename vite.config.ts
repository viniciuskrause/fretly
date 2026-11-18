import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Multi-page: the static homepage (en at the root, pt in pt/) and FAQ (faq/, pt/faq/), the app in app/, sign-up, log-in, the profile and the settings.
  build: {
    rollupOptions: {
      input: {
        home: path.resolve(import.meta.dirname, "index.html"),
        homePt: path.resolve(import.meta.dirname, "pt/index.html"),
        faq: path.resolve(import.meta.dirname, "faq/index.html"),
        faqPt: path.resolve(import.meta.dirname, "pt/faq/index.html"),
        app: path.resolve(import.meta.dirname, "app/index.html"),
        signup: path.resolve(import.meta.dirname, "signup/index.html"),
        login: path.resolve(import.meta.dirname, "login/index.html"),
        profile: path.resolve(import.meta.dirname, "profile/index.html"),
        settings: path.resolve(import.meta.dirname, "settings/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
