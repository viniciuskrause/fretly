import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Multi-page: the static homepage (en at the root, pt in pt/), the app in app/, sign-up and log-in.
  build: {
    rollupOptions: {
      input: {
        home: path.resolve(import.meta.dirname, "index.html"),
        homePt: path.resolve(import.meta.dirname, "pt/index.html"),
        app: path.resolve(import.meta.dirname, "app/index.html"),
        signup: path.resolve(import.meta.dirname, "signup/index.html"),
        login: path.resolve(import.meta.dirname, "login/index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
