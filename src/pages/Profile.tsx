import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut, Moon, Sun, Globe, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type Theme = "light" | "dark" | "auto";

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { t, i18n } = useTranslation(["profile", "common"]);

  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("archerries.theme") as Theme) || "auto"
  );

  useEffect(() => {
    localStorage.setItem("archerries.theme", theme);
    applyTheme(theme);
  }, [theme]);

  function handleLogout() {
    logout();
    nav("/login");
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold">{t("profile:title")}</h1>

      <section className="card">
        <h2 className="text-sm font-medium uppercase tracking-wider text-forest-700 mb-3">
          {t("profile:account")}
        </h2>
        <div className="space-y-2">
          <Row label={t("profile:display_name")} value={user?.display_name ?? "—"} />
          <Row label={t("profile:email")} value={user?.email ?? "—"} />
          {user?.role !== "user" && (
            <Row label="Rolle" value={user?.role ?? "—"} />
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="text-sm font-medium uppercase tracking-wider text-forest-700 mb-3">
          {t("profile:settings")}
        </h2>

        <div className="space-y-4">
          {/* Sprache */}
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 flex items-center gap-2">
              <Globe size={16} /> {t("profile:language")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <LangBtn code="de" current={i18n.language} label="Deutsch" />
              <LangBtn code="en" current={i18n.language} label="English" />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 flex items-center gap-2">
              <Sun size={16} /> {t("profile:theme")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ThemeBtn current={theme} value="light" onClick={setTheme} icon={<Sun size={14} />} label={t("profile:theme_light")} />
              <ThemeBtn current={theme} value="dark" onClick={setTheme} icon={<Moon size={14} />} label={t("profile:theme_dark")} />
              <ThemeBtn current={theme} value="auto" onClick={setTheme} icon={<span>A</span>} label={t("profile:theme_auto")} />
            </div>
          </div>
        </div>
      </section>

      <button onClick={handleLogout} className="btn-ghost w-full justify-start">
        <LogOut size={18} /> {t("profile:logout")}
      </button>

      <section className="card border-red-200">
        <h2 className="text-sm font-medium uppercase tracking-wider text-red-700 mb-2">
          {t("profile:danger_zone")}
        </h2>
        <p className="text-xs text-forest-700 mb-3">
          {t("profile:delete_account_confirm")}
        </p>
        <button className="btn-danger" disabled>
          <Trash2 size={16} /> {t("profile:delete_account")}
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-forest-700">{label}</span>
      <span className="text-sm font-medium text-forest-900 dark:text-forest-50 truncate">{value}</span>
    </div>
  );
}

function LangBtn({ code, current, label }: { code: string; current: string; label: string }) {
  const sel = current.startsWith(code);
  const { i18n } = useTranslation();
  return (
    <button
      onClick={() => i18n.changeLanguage(code)}
      className={`tap-target rounded-xl py-2 font-medium ${
        sel ? "bg-copper-500 text-white" : "bg-sunken text-forest-700"
      }`}
    >
      {label}
    </button>
  );
}

function ThemeBtn({
  current,
  value,
  onClick,
  icon,
  label,
}: {
  current: Theme;
  value: Theme;
  onClick: (v: Theme) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const sel = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`tap-target rounded-xl py-2 px-3 font-medium flex items-center justify-center gap-1 text-sm ${
        sel ? "bg-copper-500 text-white" : "bg-sunken text-forest-700"
      }`}
    >
      {icon} {label}
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
