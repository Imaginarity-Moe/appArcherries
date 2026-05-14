import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Globe, Trash2, Target, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AvatarUploader from "../components/AvatarUploader";

type Theme = "light" | "dark" | "auto";

export default function Profile() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["profile", "common"]);

  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("archerries.theme") as Theme) || "auto"
  );

  useEffect(() => {
    localStorage.setItem("archerries.theme", theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <h1 className="display text-h1">{t("profile:title")}</h1>

      <section className="card">
        <h2 className="eyebrow mb-4">{t("profile:account")}</h2>
        <AvatarUploader />
        <div className="hairline my-4" />
        <div className="space-y-2">
          <Row label={t("profile:display_name")} value={user?.display_name ?? "—"} />
          <Row label={t("profile:email")} value={user?.email ?? "—"} />
          {user?.role !== "user" && <Row label="Rolle" value={user?.role ?? "—"} />}
        </div>
      </section>

      <section className="card">
        <h2 className="eyebrow mb-4">{t("profile:settings")}</h2>

        <div className="space-y-5">
          {/* Sprache */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
              <Globe size={15} strokeWidth={1.75} /> {t("profile:language")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <SegBtn active={i18n.language.startsWith("de")} onClick={() => i18n.changeLanguage("de")} label="Deutsch" />
              <SegBtn active={i18n.language.startsWith("en")} onClick={() => i18n.changeLanguage("en")} label="English" />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
              <Sun size={15} strokeWidth={1.75} /> {t("profile:theme")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <SegBtn active={theme === "light"} onClick={() => setTheme("light")} icon={<Sun size={14} strokeWidth={1.75} />} label={t("profile:theme_light")} />
              <SegBtn active={theme === "dark"}  onClick={() => setTheme("dark")}  icon={<Moon size={14} strokeWidth={1.75} />} label={t("profile:theme_dark")} />
              <SegBtn active={theme === "auto"}  onClick={() => setTheme("auto")}  icon={<span className="text-[11px] font-semibold">A</span>} label={t("profile:theme_auto")} />
            </div>
          </div>
        </div>
      </section>

      <Link to="/bows" className="card-interactive flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-cherry-500">
            <Target size={18} strokeWidth={1.75} />
          </span>
          <div>
            <div className="font-semibold">Meine Bögen</div>
            <div className="text-sm text-secondary">Bogen-Profile mit Setup-Daten verwalten</div>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} className="text-muted" />
      </Link>

      <section className="card">
        <h2 className="eyebrow mb-2 text-cherry-500">{t("profile:danger_zone")}</h2>
        <p className="text-xs text-secondary mb-3">{t("profile:delete_account_confirm")}</p>
        <button className="btn-danger" disabled>
          <Trash2 size={15} strokeWidth={1.75} /> {t("profile:delete_account")}
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-sm font-medium text-primary truncate">{value}</span>
    </div>
  );
}

/**
 * Segmentierter Button — wie iOS Settings.
 * Aktiv: dunkler Text auf Cherry-Hintergrund.
 * Inaktiv: dezent — surface mit secondary-Text. Funktioniert in light & dark.
 */
function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap-target rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
        active
          ? "bg-cherry-500 text-cream"
          : "bg-surface text-secondary hover:text-primary border border-hairline"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark");
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "auto") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    }
  }
}
