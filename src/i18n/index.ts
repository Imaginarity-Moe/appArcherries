import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import deDashboard from "./locales/de/dashboard.json";
import deTraining from "./locales/de/training.json";
import deParcours from "./locales/de/parcours.json";
import deStats from "./locales/de/stats.json";
import deHelp from "./locales/de/help.json";
import deProfile from "./locales/de/profile.json";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enDashboard from "./locales/en/dashboard.json";
import enTraining from "./locales/en/training.json";
import enParcours from "./locales/en/parcours.json";
import enStats from "./locales/en/stats.json";
import enHelp from "./locales/en/help.json";
import enProfile from "./locales/en/profile.json";

export const NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "training",
  "parcours",
  "stats",
  "help",
  "profile",
] as const;

export const SUPPORTED_LANGUAGES = ["de", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "de",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "archerries.lang",
      caches: ["localStorage"],
    },
    resources: {
      de: {
        common: deCommon,
        auth: deAuth,
        dashboard: deDashboard,
        training: deTraining,
        parcours: deParcours,
        stats: deStats,
        help: deHelp,
        profile: deProfile,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        training: enTraining,
        parcours: enParcours,
        stats: enStats,
        help: enHelp,
        profile: enProfile,
      },
    },
  });

export default i18n;
