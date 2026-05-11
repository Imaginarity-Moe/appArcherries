import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Target, Award, Compass, Crosshair, Languages, Info } from "lucide-react";

const CATEGORIES = [
  { key: "getting_started", path: "getting-started", icon: <BookOpen size={18} /> },
  { key: "disciplines", path: "disciplines", icon: <Target size={18} /> },
  { key: "scoring", path: "scoring", icon: <Award size={18} /> },
  { key: "pegs", path: "pegs", icon: <Compass size={18} /> },
  { key: "bows", path: "bows", icon: <Crosshair size={18} /> },
  { key: "glossary", path: "glossary", icon: <Languages size={18} /> },
  { key: "app", path: "app", icon: <Info size={18} /> },
];

export default function HelpHub() {
  const { t } = useTranslation("help");
  const location = useLocation();
  const isRoot = location.pathname === "/help" || location.pathname === "/help/";

  if (isRoot) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-forest-700 dark:text-forest-300 mt-1">{t("subtitle")}</p>
        </div>

        <ul className="space-y-2">
          {CATEGORIES.map((c) => (
            <li key={c.key}>
              <Link
                to={`/help/${c.path}`}
                className="card-interactive flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-copper-50 text-copper-500 flex items-center justify-center">
                  {c.icon}
                </div>
                <div className="font-semibold flex-1">{t(`categories.${c.key}`)}</div>
                <span className="text-forest-300">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <Link to="/help" className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-copper-500">
        <ArrowLeft size={16} /> {t("back_to_help")}
      </Link>
      <article className="card prose prose-forest dark:prose-invert max-w-none">
        <Outlet />
      </article>
    </div>
  );
}
