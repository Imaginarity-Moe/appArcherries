import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import { startSync } from "./lib/sync";
import "./i18n";
import "./styles/index.css";
import "leaflet/dist/leaflet.css";

// Outbox-Sync starten: pending Writes werden gesendet sobald online
startSync();

// Theme aus localStorage einmalig anwenden
const savedTheme = localStorage.getItem("archerries.theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else if (savedTheme === "auto" || !savedTheme) {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <PWAUpdatePrompt />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
