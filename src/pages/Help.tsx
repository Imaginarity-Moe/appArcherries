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

type Section = {
  key: string;
  icon: ReactNode;
  /** Suchbare Keywords zusätzlich zum Titel — manuell gepflegt */
  keywords: string;
  content: ReactNode;
};

const SECTIONS: Section[] = [
  { key: "getting_started", icon: <BookOpen size={18} strokeWidth={1.75} />,    keywords: "anfang einstieg start tutorial einleitung beginner training pfeile", content: <HelpGettingStarted /> },
  { key: "install",         icon: <Smartphone size={18} strokeWidth={1.75} />,  keywords: "install pwa homescreen offline iphone android chrome safari sync verbindung funkloch installieren",      content: <HelpInstall /> },
  { key: "shared",          icon: <Users size={18} strokeWidth={1.75} />,      keywords: "qr code einladung freunde gast scoren teilen invitation share runde gemeinsam",                              content: <HelpShared /> },
  { key: "community",       icon: <Trophy size={18} strokeWidth={1.75} />,     keywords: "öffentlich review bewertung kommentar vorlage clone highscore favorit stern public rating",                  content: <HelpCommunity /> },
  { key: "disciplines",     icon: <Target size={18} strokeWidth={1.75} />,     keywords: "3d ifaa wa bowhunter feldbogen disziplin parcours stationen scheibe tier",                                   content: <HelpDisciplines /> },
  { key: "scoring",         icon: <Award size={18} strokeWidth={1.75} />,      keywords: "wertung punkte score vital wound kill miss treffer zone ring inner outer x bowhunter ifaa",                  content: <HelpScoring /> },
  { key: "pegs",            icon: <Compass size={18} strokeWidth={1.75} />,    keywords: "pflock peg blau rot gelb weiss farbe distanz markiert unmarkiert",                                            content: <HelpPegs /> },
  { key: "bows",            icon: <Crosshair size={18} strokeWidth={1.75} />,  keywords: "bogen recurve compound barebow longbow traditional jagd profil setup pfeilspine zuggewicht visiermarken",   content: <HelpBows /> },
  { key: "glossary",        icon: <Languages size={18} strokeWidth={1.75} />,  keywords: "begriff glossary definition spot passe quiver release nocke fletching killzone vital wound",                content: <HelpGlossary /> },
  { key: "app",             icon: <Info size={18} strokeWidth={1.75} />,       keywords: "about app entwicklung feedback geplant hosting daten datenschutz roadmap version",                          content: <HelpApp /> },
];

export default function HelpHub() {
  const { t } = useTranslation("help");
  const location = useLocation();
  const params = useParams<{ section?: string }>();
  const [query, setQuery] = useState("");
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Deep-Linking: /help/install ODER /help#install öffnet die Sektion automatisch
  // (URL-Bindestriche werden zu Unterstrichen normalisiert, weil Section-Keys snake_case sind)
  useEffect(() => {
    const raw = params.section ?? location.hash.replace(/^#/, "");
    const key = raw.replace(/-/g, "_");
    if (key && SECTIONS.some((s) => s.key === key)) {
      setOpenSet((prev) => new Set(prev).add(key));
      setTimeout(() => {
        document.getElementById(`help-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [params.section, location.hash]);

  const trimmed = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!trimmed) return SECTIONS;
    return SECTIONS.filter((s) => {
      const title = t(`categories.${s.key}`).toLowerCase();
      return title.includes(trimmed) || s.keywords.toLowerCase().includes(trimmed);
    });
  }, [trimmed, t]);

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
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <header>
        <h1 className="display text-h1">{t("title")}</h1>
        <p className="text-secondary text-sm mt-1">{t("subtitle")}</p>
      </header>

      {/* Suche */}
      <div className="relative">
        <Search size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="input pl-10 pr-10"
          aria-label={t("search_placeholder")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon"
            aria-label="Suche leeren"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Accordion */}
      {visible.length === 0 ? (
        <div className="card-sunken text-center py-8 text-secondary text-sm">
          Keine Hilfe-Themen zu „{query}" gefunden.
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => {
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
                  <span className="w-8 h-8 rounded-full bg-surface text-cherry-500 flex items-center justify-center shrink-0">
                    {s.icon}
                  </span>
                  <span className="font-medium text-primary flex-1">{title}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.75}
                    className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div
                    id={`help-content-${s.key}`}
                    className="px-4 pb-5 pt-1 border-t border-hairline [&_h1]:hidden [&_header>h1+p]:mt-0"
                  >
                    {s.content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
