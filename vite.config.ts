import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon-32x32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Archerries",
        short_name: "Archerries",
        description: "Bogensport-Tracker — Trainings, Stationen, Scores.",
        lang: "de",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FAF8F3",
        theme_color: "#4F6B1A",
        icons: [
          { src: "/pwa-192x192.png",          sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png",          sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Phase 1: API NICHT cachen — wir wollen keine veralteten Daten zeigen.
        // Offline-Reads kommen in Phase 2 mit gezielter IDB-Cache-Strategie.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        // SW im Dev-Modus aktivieren, damit du auf dem iPhone die PWA-Installation testen kannst.
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://archerries.mossig.de",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Schwere Libs in eigene Chunks → caching pro Lib + besseres Code-Splitting
          "vendor-react":   ["react", "react-dom", "react-router-dom"],
          "vendor-i18n":    ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          "vendor-charts":  ["recharts", "react-is"],
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          "vendor-icons":   ["lucide-react"],
          "vendor-idb":     ["idb"],
        },
      },
    },
  },
});
