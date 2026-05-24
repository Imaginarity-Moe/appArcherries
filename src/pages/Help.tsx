import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Search,
  X,
  BookOpen,
  Smartphone,
  Users,
  Target,
  Award,
  Compass,
  Crosshair,
  Languages,
  Info,
  Trophy,
  BarChart3,
  Cloud,
  Dumbbell,
  Zap,
  HelpCircle,
  Lock,
  Sparkles,
  Wrench,
  Calculator,
} from "lucide-react";

import HelpGettingStarted from "./help/HelpGettingStarted";
import HelpInstall from "./help/HelpInstall";
import HelpShared from "./help/HelpShared";
import HelpDisciplines from "./help/HelpDisciplines";
import HelpScoring from "./help/HelpScoring";
import HelpPegs from "./help/HelpPegs";
import HelpBows from "./help/HelpBows";
import HelpGlossary from "./help/HelpGlossary";
import HelpApp from "./help/HelpApp";
import HelpCommunity from "./help/HelpCommunity";
import HelpEquipment from "./help/HelpEquipment";
import HelpStats from "./help/HelpStats";
import HelpOfflineSync from "./help/HelpOfflineSync";
import HelpRoutines from "./help/HelpRoutines";
import HelpPowerUser from "./help/HelpPowerUser";
import HelpFAQ from "./help/HelpFAQ";
import HelpPrivacy from "./help/HelpPrivacy";
import HelpConversions from "./help/HelpConversions";

type Section = {
  key: string;
  icon: ReactNode;
  /** Suchbare Keywords zusätzlich zum Titel — manuell gepflegt */
  keywords: string;
  content: ReactNode;
};

type Group = {
  key: string;
  label: string;
  icon: ReactNode;
  description: string;
  sections: Section[];
};

const SECTIONS: Record<string, Section> = {
  getting_started: { key: "getting_started", icon: <BookOpen size={20} strokeWidth={1.75} />,    keywords: "anfang einstieg start tutorial einleitung beginner training pfeile", content: <HelpGettingStarted /> },
  install:         { key: "install",         icon: <Smartphone size={20} strokeWidth={1.75} />,  keywords: "install pwa homescreen offline iphone android chrome safari sync verbindung funkloch installieren",      content: <HelpInstall /> },
  offline_sync:    { key: "offline_sync",    icon: <Cloud size={20} strokeWidth={1.75} />,      keywords: "offline pwa sync queue outbox indexeddb cache upload pending funkloch verbindung netz",                       content: <HelpOfflineSync /> },
  disciplines:     { key: "disciplines",     icon: <Target size={20} strokeWidth={1.75} />,     keywords: "3d ifaa wa bowhunter feldbogen disziplin parcours stationen scheibe tier",                                   content: <HelpDisciplines /> },
  scoring:         { key: "scoring",         icon: <Award size={20} strokeWidth={1.75} />,      keywords: "wertung punkte score vital wound kill miss treffer zone ring inner outer x bowhunter ifaa",                  content: <HelpScoring /> },
  pegs:            { key: "pegs",            icon: <Compass size={20} strokeWidth={1.75} />,    keywords: "pflock peg blau rot gelb weiss farbe distanz markiert unmarkiert",                                            content: <HelpPegs /> },
  bows:            { key: "bows",            icon: <Crosshair size={20} strokeWidth={1.75} />,  keywords: "bogen recurve compound barebow longbow traditional jagd profil setup pfeilspine zuggewicht visiermarken",   content: <HelpBows /> },
  conversions:     { key: "conversions",     icon: <Calculator size={20} strokeWidth={1.75} />, keywords: "umrechnung tabelle inch zoll mm millimeter grain gramm lbs pfund kg kilogramm yards meter spine pfeil rechner calculator",  content: <HelpConversions /> },
  shared:          { key: "shared",          icon: <Users size={20} strokeWidth={1.75} />,      keywords: "qr code einladung freunde gast scoren teilen invitation share runde gemeinsam",                              content: <HelpShared /> },
  community:       { key: "community",       icon: <Trophy size={20} strokeWidth={1.75} />,     keywords: "öffentlich review bewertung kommentar vorlage clone highscore favorit stern public rating",                  content: <HelpCommunity /> },
  stats:           { key: "stats",           icon: <BarChart3 size={20} strokeWidth={1.75} />,  keywords: "statistik heatmap verlauf konsistenz pfeil score chart graph diagramm",                                       content: <HelpStats /> },
  routines:        { key: "routines",        icon: <Dumbbell size={20} strokeWidth={1.75} />,   keywords: "routine training warmup match wettkampf vorbereitung üben distanz schätzen anker schießen tipps",            content: <HelpRoutines /> },
  power_user:      { key: "power_user",      icon: <Zap size={20} strokeWidth={1.75} />,        keywords: "shortcut tastatur url deep-link power tricks profi schnell erfassung lange druck zoom",                       content: <HelpPowerUser /> },
  equipment:       { key: "equipment",       icon: <Wrench size={20} strokeWidth={1.75} />,     keywords: "equipment pfeil arrow spine länge gpi befiederung nocke spitze grains shop nachkauf bestand defekt verloren history verlauf",  content: <HelpEquipment /> },
  privacy:         { key: "privacy",         icon: <Lock size={20} strokeWidth={1.75} />,       keywords: "datenschutz privacy sicherheit dsgvo daten löschen anonym öffentlich admin",                                  content: <HelpPrivacy /> },
  faq:             { key: "faq",             icon: <HelpCircle size={20} strokeWidth={1.75} />, keywords: "faq frage antwort fehler problem stolperfalle troubleshoot",                                                   content: <HelpFAQ /> },
  glossary:        { key: "glossary",        icon: <Languages size={20} strokeWidth={1.75} />,  keywords: "begriff glossary definition spot passe quiver release nocke fletching killzone vital wound abkürzungen wa dsb ifaa dfbv nfaa",                content: <HelpGlossary /> },
  app:             { key: "app",             icon: <Info size={20} strokeWidth={1.75} />,       keywords: "about app entwicklung feedback geplant hosting daten datenschutz roadmap version",                          content: <HelpApp /> },
};

const GROUPS: Group[] = [
  {
    key: "start",
    label: "Einstieg & App",
    icon: <Sparkles size={16} strokeWidth={2} />,
    description: "Erste Schritte, Installation, Offline-Modus.",
    sections: [SECTIONS.getting_started, SECTIONS.install, SECTIONS.offline_sync],
  },
  {
    key: "sport",
    label: "Sport & Regelwerk",
    icon: <Target size={16} strokeWidth={2} />,
    description: "Disziplinen, Wertungssysteme, Pflöcke, Bogenklassen, Umrechnungstabellen.",
    sections: [SECTIONS.disciplines, SECTIONS.scoring, SECTIONS.pegs, SECTIONS.bows, SECTIONS.conversions],
  },
  {
    key: "social",
    label: "Community & Geteilte Runden",
    icon: <Users size={16} strokeWidth={2} />,
    description: "Mitspieler einladen, öffentliche Parcours, Highscores.",
    sections: [SECTIONS.shared, SECTIONS.community],
  },
  {
    key: "advanced",
    label: "Statistik & Fortgeschritten",
    icon: <BarChart3 size={16} strokeWidth={2} />,
    description: "Heatmaps lesen, Trainings-Routinen, Power-User-Tricks, Equipment.",
    sections: [SECTIONS.stats, SECTIONS.routines, SECTIONS.power_user, SECTIONS.equipment],
  },
  {
    key: "support",
    label: "Datenschutz, FAQ & Glossar",
    icon: <Lock size={16} strokeWidth={2} />,
    description: "Was speichert die App, häufige Fragen, Begriffe-Lexikon.",
    sections: [SECTIONS.privacy, SECTIONS.faq, SECTIONS.glossary, SECTIONS.app],
  },
];

// Flache Liste aller Sections (für Suche und Deep-Link-Resolution)
const ALL_SECTIONS = Object.values(SECTIONS);

export default function HelpHub() {
  const { t } = useTranslation("help");
  const location = useLocation();
  const params = useParams<{ section?: string }>();
  const [query, setQuery] = useState("");
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Deep-Linking: /help/install ODER /help#install öffnet die Sektion automatisch
  useEffect(() => {
    const raw = params.section ?? location.hash.replace(/^#/, "");
    const key = raw.replace(/-/g, "_");
    if (key && ALL_SECTIONS.some((s) => s.key === key)) {
      setOpenSet((prev) => new Set(prev).add(key));
      setTimeout(() => {
        document.getElementById(`help-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [params.section, location.hash]);

  const trimmed = query.trim().toLowerCase();
  const matchingKeys = useMemo(() => {
    if (!trimmed) return new Set(ALL_SECTIONS.map((s) => s.key));
    return new Set(
      ALL_SECTIONS.filter((s) => {
        const title = t(`categories.${s.key}`).toLowerCase();
        return title.includes(trimmed) || s.keywords.toLowerCase().includes(trimmed);
      }).map((s) => s.key)
    );
  }, [trimmed, t]);

  const totalMatching = matchingKeys.size;

  const toggle = (key: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Bei aktiver Suche sind matching Sektionen automatisch offen
  const isOpen = (key: string) => Boolean(trimmed) || openSet.has(key);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <header>
        <h1 className="display text-h1">{t("title")}</h1>
        <p className="text-secondary mt-1">{t("subtitle")}</p>
      </header>

      {/* Suche */}
      <div className="relative">
        <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="input pl-11 pr-11 text-base"
          aria-label={t("search_placeholder")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon"
            aria-label="Suche leeren"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Themengruppen */}
      {totalMatching === 0 ? (
        <div className="card-sunken text-center py-8 text-secondary">
          Keine Hilfe-Themen zu „{query}" gefunden.
        </div>
      ) : (
        <div className="space-y-7">
          {GROUPS.map((g) => {
            const visibleSections = g.sections.filter((s) => matchingKeys.has(s.key));
            if (visibleSections.length === 0) return null;
            return (
              <section key={g.key} className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cherry-50 text-cherry-600 dark:bg-cherry-900/30 dark:text-cherry-200 shrink-0 mt-0.5">
                    {g.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg font-semibold leading-tight">{g.label}</h2>
                    <p className="text-sm text-secondary">{g.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {visibleSections.map((s) => {
                    const open = isOpen(s.key);
                    const title = t(`categories.${s.key}`);
                    return (
                      <li key={s.key} id={`help-${s.key}`} className="rounded-2xl bg-elevated border border-hairline overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggle(s.key)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition active:scale-[0.998]"
                          aria-expanded={open}
                          aria-controls={`help-content-${s.key}`}
                        >
                          <span className="w-9 h-9 rounded-full bg-surface text-cherry-500 flex items-center justify-center shrink-0">
                            {s.icon}
                          </span>
                          <span className="font-medium text-primary flex-1 text-base">{title}</span>
                          <ChevronDown
                            size={18}
                            strokeWidth={1.75}
                            className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        {open && (
                          <div
                            id={`help-content-${s.key}`}
                            className="px-4 sm:px-5 pb-5 pt-1 border-t border-hairline [&_h1]:hidden [&_header>h1+p]:mt-0"
                          >
                            {s.content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
