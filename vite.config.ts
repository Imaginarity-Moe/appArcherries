import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";

// Build-Revision: git-Commit-Hash + Timestamp werden ins Bundle inlined.
// Verfügbar im Frontend als __APP_REV__ / __APP_BUILT__ (siehe src/vite-env.d.ts).
const APP_REV = (() => {
  try { return execSync("git rev-parse --short HEAD").toString().trim(); }
  catch { return "dev"; }
})();
const APP_BUILT = new Date().toISOString().slice(0, 16).replace("T", " ");

export default defineConfig({
  define: {
    __APP_REV__: JSON.stringify(APP_REV),
    __APP_BUILT__: JSON.stringify(APP_BUILT),
  },
  plugins: [
    react(),
    VitePWA({
      // autoUpdate + skipWaiting + clientsClaim:
      //  - Neuer SW wird im Hintergrund installiert
      //  - skipWaiting: kein "waiting"-Zustand, neuer SW übernimmt sofort
      //  - clientsClaim: alle offenen Tabs werden vom neuen SW kontrolliert
      //  - PWAUpdatePrompt.tsx fängt das controllerchange-Event ab und reloaded
      //    die Seite automatisch + zeigt einen kurzen Toast.
      // Plus: client-side Version-Mismatch-Detection (siehe main.tsx) als Fallback,
      // falls SW nicht greift (z.B. bei iOS Safari quirks).
      registerType: "autoUpdate",
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
        background_color: "#FAF8F4",
        theme_color: "#111111",
        icons: [
          { src: "/pwa-192x192.png",          sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png",          sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            // index.html / SPA-Navigationen: Network-First mit kurzem Timeout
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "archerries-html",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Avatar / Stations / Parcours / Lanes-Bilder: Network-First,
            // damit ein neu hochgeladenes Bild den alten Cache-Eintrag überholt.
            urlPattern: /^\/uploads\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "archerries-uploads",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
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
