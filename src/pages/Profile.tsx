import { useEffect, useRef, useState, type AriaAttributes } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Globe, Trash2, Target, ChevronRight, Zap, Users, Bell, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";
import AvatarUploader from "../components/AvatarUploader";
import { listFriends } from "../api/friends";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotifPrefs,
  type NotifCategory,
  type NotifChannel,
} from "../api/notificationPrefs";
import { Spinner } from "../components/Spinner";

type Theme = "light" | "dark" | "auto";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { t, i18n } = useTranslation(["profile", "common"]);
  const nav = useNavigate();

  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("archerries.theme") as Theme) || "auto"
  );
  const [incomingFriends, setIncomingFriends] = useState(0);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  async function resetOnboarding(mode: "short" | "long") {
    setResettingOnboarding(true);
    try {
      await api("/me/onboarding/reset", { method: "POST" });
      await refresh();
      nav(`/welcome?mode=${mode}`, { replace: true });
    } catch (err) {
      console.warn("[profile] reset onboarding failed", err);
    } finally {
      setResettingOnboarding(false);
    }
  }

  useEffect(() => {
    localStorage.setItem("archerries.theme", theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    listFriends()
      .then((r) => setIncomingFriends(r.incoming.length))
      .catch(() => {});
  }, []);

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

      <Link to="/arrows" className="card-interactive flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-cherry-500">
            <Zap size={18} strokeWidth={1.75} />
          </span>
          <div>
            <div className="font-semibold">Meine Pfeile</div>
            <div className="text-sm text-secondary">Pfeil-Sets mit Spine, Befiederung & Bestand verwalten</div>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} className="text-muted" />
      </Link>

      <NotificationsSection />

      <Link to="/friends" className="card-interactive flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative w-9 h-9 rounded-full bg-surface flex items-center justify-center text-cherry-500">
            <Users size={18} strokeWidth={1.75} />
            {incomingFriends > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cherry-500 text-cream text-[10px] font-bold flex items-center justify-center">
                {incomingFriends}
              </span>
            )}
          </span>
          <div>
            <div className="font-semibold flex items-center gap-1.5">
              Freunde
              {incomingFriends > 0 && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-cherry-500">
                  {incomingFriends === 1 ? "1 neue Anfrage" : `${incomingFriends} neue Anfragen`}
                </span>
              )}
            </div>
            <div className="text-sm text-secondary">Anfragen senden, annehmen und Freundes-Liste verwalten</div>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} className="text-muted" />
      </Link>


      <section className="card">
        <h2 className="eyebrow mb-2">Tour &amp; Hilfe</h2>
        <p className="text-sm text-secondary mb-3">
          Du kannst das Onboarding jederzeit erneut durchspielen — z.B. um es einem
          neuen Mitspieler zu zeigen oder selbst noch mal aufzufrischen.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            className="btn-accent inline-flex items-start gap-2 text-left p-3"
            onClick={() => resetOnboarding("long")}
            disabled={resettingOnboarding}
          >
            <Compass size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" />
            <span className="flex flex-col items-start">
              <span className="font-semibold">Ausführliche Einführung</span>
              <span className="text-sm opacity-90 font-normal">
                11 Schritte — Disziplinen, Wertung, Pflöcke, Bogenklassen,
                Multi-Player, Statistik. ~5 Min.
              </span>
            </span>
          </button>
          <button
            className="btn-secondary inline-flex items-start gap-2 text-left p-3"
            onClick={() => resetOnboarding("short")}
            disabled={resettingOnboarding}
          >
            <Compass size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" />
            <span className="flex flex-col items-start">
              <span className="font-semibold">Kurze Tour</span>
              <span className="text-sm text-secondary font-normal">
                5 Schritte — nur Setup, ~1 Min.
              </span>
            </span>
          </button>
        </div>
        {resettingOnboarding && (
          <p className="text-sm text-secondary mt-2">Setze Onboarding zurück…</p>
        )}
      </section>

      <section className="card">
        <h2 className="eyebrow mb-2 text-cherry-700 dark:text-cherry-200">{t("profile:danger_zone")}</h2>
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

// ── Benachrichtigungen ────────────────────────────────────────────────────────

const CATEGORIES: Array<{
  key: NotifCategory;
  labelKey: string;
  descKey: string;
}> = [
  { key: "social",      labelKey: "notif.cat_social_label",      descKey: "notif.cat_social_desc" },
  { key: "invitations", labelKey: "notif.cat_invitations_label", descKey: "notif.cat_invitations_desc" },
];

function NotificationsSection() {
  const { t } = useTranslation("profile");
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const sectionRef = useScrollToHash("notifications");

  useEffect(() => {
    getNotificationPrefs()
      .then((r) => setPrefs(r.prefs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (cat: NotifCategory, channel: NotifChannel) => {
    if (!prefs) return;
    const next: NotifPrefs = {
      ...prefs,
      [cat]: { ...prefs[cat], [channel]: !prefs[cat][channel] },
    };
    setPrefs(next); // optimistic
    setSaving(true);
    try {
      const r = await saveNotificationPrefs(next);
      setPrefs(r.prefs);
      setSavedAt(Date.now());
    } catch {
      setPrefs(prefs); // rollback
    } finally {
      setSaving(false);
    }
  };

  return (
    <section ref={sectionRef} id="notifications" className="card scroll-mt-20">
      <div className="flex items-center justify-between mb-1">
        <h2 className="eyebrow flex items-center gap-2"><Bell size={13} strokeWidth={1.75} /> {t("notif.title")}</h2>
        {saving ? (
          <Spinner size={14} />
        ) : savedAt ? (
          <span className="text-[11px] text-muted">{t("notif.saved")}</span>
        ) : null}
      </div>
      <p className="text-xs text-secondary mb-4">{t("notif.intro")}</p>

      {/* Header-Zeile */}
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-x-4 gap-y-1 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted">{t("notif.channel_header")}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted text-center w-14">{t("notif.col_in_app")}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted text-center w-14">{t("notif.col_email")}</span>
      </div>

      <div className="divide-y divide-hairline">
        {/* Security-Zeile (gesperrt) */}
        <PrefRow
          label={t("notif.cat_security_label")}
          desc={t("notif.cat_security_desc")}
          inApp={true}
          email={true}
          locked
        />

        {loading || !prefs ? (
          <div className="py-3"><Spinner /></div>
        ) : (
          CATEGORIES.map((c) => (
            <PrefRow
              key={c.key}
              label={t(c.labelKey)}
              desc={t(c.descKey)}
              inApp={prefs[c.key].in_app}
              email={prefs[c.key].email}
              onToggleInApp={() => toggle(c.key, "in_app")}
              onToggleEmail={() => toggle(c.key, "email")}
            />
          ))
        )}
      </div>
    </section>
  );
}

function PrefRow({
  label, desc, inApp, email, locked, onToggleInApp, onToggleEmail,
}: {
  label: string;
  desc: string;
  inApp: boolean;
  email: boolean;
  locked?: boolean;
  onToggleInApp?: () => void;
  onToggleEmail?: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-primary">{label}</div>
        <div className="text-xs text-secondary leading-snug mt-0.5">{desc}</div>
      </div>
      <div className="w-14 flex justify-center">
        <Switch checked={inApp} onChange={onToggleInApp} locked={locked} aria-label={label} />
      </div>
      <div className="w-14 flex justify-center">
        <Switch checked={email} onChange={onToggleEmail} locked={locked} aria-label={label} />
      </div>
    </div>
  );
}

function Switch({
  checked, onChange, locked, ...aria
}: {
  checked: boolean;
  onChange?: () => void;
  locked?: boolean;
} & AriaAttributes) {
  const disabled = locked || !onChange;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-cherry-500/40 ${
        checked
          ? locked ? "bg-cherry-500/40" : "bg-cherry-500"
          : "bg-surface border border-hairline"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      {...aria}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-cream shadow-sm transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/** Scrollt das ref-Element in den Viewport, wenn URL-Hash matched. */
function useScrollToHash(hash: string) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (window.location.hash.replace("#", "") === hash) {
      // RAF damit das DOM gerendert ist
      requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [hash]);
  return ref;
}
