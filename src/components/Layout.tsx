import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  BarChart3,
  Plus,
  HelpCircle,
  UserCircle,
  Map,
  ArrowLeft,
  Target,
  LogOut,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { LogoWordmark, Wordmark } from "./Logo";
import NetworkStatusIcon from "./NetworkStatusIcon";
import { useConfirm } from "./ConfirmDialog";
import Avatar from "./Avatar";
import { useFooter, type FooterAction } from "./FooterContext";

/**
 * Responsive Layout (Archerries Premium-Shell):
 * - Mobile: Glass-Header mit Wordmark + Floating-Pill-Nav unten
 * - Desktop (≥1024px): Linke Sidebar mit kombiniertem Logo
 *
 * Footer-Buttons sind route-abhängig:
 *  - /profile, /bows → Page-spezifische Aktionen (Back, Bögen, Logout)
 *  - sonst           → Standard-5-Items mit Cherry-FAB (Neues Training)
 */
export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const isAuthRoute =
    /^\/(login|register|verify|forgot-password|reset-password|join)/.test(location.pathname);

  if (isAuthRoute || !user) {
    return (
      <main className="min-h-screen bg-canvas text-primary">
        <Outlet />
      </main>
    );
  }

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Abmelden?",
      message: "Du wirst aus deinem Konto ausgeloggt. Offline-Daten bleiben erhalten.",
      confirmLabel: "Abmelden",
      variant: "danger",
    });
    if (ok) {
      logout();
      navigate("/login");
    }
  };

  const { actions: customActions } = useFooter();
  // Leeres Array = Page hat explizit "keine Footer-Nav" gesetzt (z.B. Live-Eingabe-Modus).
  const hideMobileNav = customActions !== null && customActions.length === 0;
  const footerItems: FooterItem[] = customActions
    ? customActions.map(footerActionToItem)
    : getFooterItems(location.pathname, t, navigate, handleLogout);

  return (
    <div className="min-h-screen bg-canvas text-primary">
      {/* ─── Desktop-Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 flex-col bg-surface border-r border-hairline z-20">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <Link to="/" className="block py-2" aria-label="Archerries">
            <LogoWordmark className="h-8" />
          </Link>
          <NetworkStatusIcon />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <SidebarLink to="/" icon={<Home size={18} strokeWidth={1.75} />} label={t("nav.home")} />
          <SidebarLink to="/stats" icon={<BarChart3 size={18} strokeWidth={1.75} />} label={t("nav.stats")} />
          <SidebarLink to="/parcours" icon={<Map size={18} strokeWidth={1.75} />} label={t("nav.parcours")} />
          <SidebarLink to="/help" icon={<HelpCircle size={18} strokeWidth={1.75} />} label={t("nav.help")} />
          <SidebarLink to="/profile" icon={<UserCircle size={18} strokeWidth={1.75} />} label={t("nav.profile")} />
        </nav>
        <div className="px-3 pb-2">
          <button onClick={() => navigate("/trainings/new")} className="btn-accent w-full">
            <Plus size={16} strokeWidth={2} /> {t("dashboard:new_training")}
          </button>
        </div>
        {/* User-Bereich am Sidebar-Fuß — Avatar + Name + Logout + Build-Info */}
        <div className="border-t border-hairline px-3 py-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-elevated transition group"
          >
            <Avatar user={user} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-primary truncate">
                {user.display_name || user.email}
              </div>
              {user.display_name && (
                <div className="text-xs text-muted truncate">{user.email}</div>
              )}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 text-xs text-secondary hover:text-cherry-500 dark:hover:text-cherry-400 py-1.5 transition"
            aria-label="Abmelden"
          >
            <LogOut size={14} strokeWidth={1.75} /> Abmelden
          </button>
          <BuildInfo />
        </div>
      </aside>

      {/* ─── Mobile Header — Wordmark + Build-Tag + Status + Avatar ─────── */}
      <header className="lg:hidden sticky top-0 z-30 bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/75">
        <div className="flex items-center justify-between px-5 h-12 pt-safe">
          <Link to="/" aria-label="Archerries" className="flex items-center gap-2">
            <Wordmark className="h-7" />
            <BuildInfo compact />
          </Link>
          <div className="flex items-center gap-1.5">
            <NetworkStatusIcon />
            <Link to="/profile" aria-label={t("nav.profile")} className="rounded-full no-tap-highlight">
              <Avatar user={user} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      {/* pb-32 sorgt dafür, dass der letzte Inhalt nicht von der schwebenden
          Mobile-Nav (h-14 + safe-area + pb-3 ≈ 100px) verdeckt wird. */}
      <main className={`lg:pl-64 ${hideMobileNav ? "lg:pb-8" : "pb-32 lg:pb-8"}`}>
        <div className="container-app py-5 sm:py-7">
          <Outlet />
        </div>
      </main>

      {/* ─── Mobile Floating Bottom-Nav (route-aware, kann von Pages versteckt werden) ─ */}
      {!hideMobileNav && (
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-30 pb-safe pointer-events-none"
          aria-label="Hauptnavigation"
        >
          <div className="mx-auto max-w-md px-4 pb-3 pointer-events-auto">
            <div className="glass rounded-full shadow-lift flex items-center justify-around px-2 h-14">
              {footerItems.map((item, i) => renderFooterItem(item, i))}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}

// ─── Footer-Items ──────────────────────────────────────────────────────

type FooterItem =
  | { kind: "link"; to: string; icon: React.ReactNode; label: string; end?: boolean }
  | { kind: "button"; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }
  | { kind: "fab"; onClick: () => void; icon: React.ReactNode; label: string };

function getFooterItems(
  pathname: string,
  t: (k: string) => string,
  navigate: (p: string) => void,
  logout: () => void
): FooterItem[] {
  // Profile: Page-spezifisch
  if (pathname === "/profile") {
    return [
      { kind: "link",   to: "/",     icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link",   to: "/bows", icon: <Target size={20} strokeWidth={1.75} />,    label: "Bögen" },
      { kind: "button", onClick: logout, icon: <LogOut size={20} strokeWidth={1.75} />, label: "Logout", danger: true },
    ];
  }
  // Bows: zurück zu Profile
  if (pathname.startsWith("/bows")) {
    return [
      { kind: "link", to: "/profile", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link", to: "/", icon: <Home size={20} strokeWidth={1.75} />, label: t("nav.home") },
    ];
  }
  // Default 5er-Nav mit Cherry-FAB
  return [
    { kind: "link", to: "/",         icon: <Home size={20} strokeWidth={1.75} />,       label: t("nav.home"), end: true },
    { kind: "link", to: "/stats",    icon: <BarChart3 size={20} strokeWidth={1.75} />,  label: t("nav.stats") },
    { kind: "fab",  onClick: () => navigate("/trainings/new"), icon: <Plus size={20} strokeWidth={2} />, label: t("dashboard:new_training") },
    { kind: "link", to: "/parcours", icon: <Map size={20} strokeWidth={1.75} />,        label: t("nav.parcours") },
    { kind: "link", to: "/help",     icon: <HelpCircle size={20} strokeWidth={1.75} />, label: t("nav.help"), end: true },
  ];
}

function footerActionToItem(a: FooterAction): FooterItem {
  if (a.kind === "link") {
    return { kind: "link", to: a.to, icon: a.icon, label: a.label };
  }
  return { kind: "button", onClick: a.onClick, icon: a.icon, label: a.label, danger: !!a.danger };
}

function renderFooterItem(item: FooterItem, i: number) {
  if (item.kind === "fab") {
    return (
      <div key={i} className="flex items-center justify-center w-12">
        <button
          onClick={item.onClick}
          className="w-11 h-11 rounded-full bg-cherry-500 hover:bg-cherry-600 text-cream shadow-cherry flex items-center justify-center transition active:scale-95"
          aria-label={item.label}
        >
          {item.icon}
        </button>
      </div>
    );
  }
  if (item.kind === "button") {
    return (
      <button
        key={i}
        onClick={item.onClick}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition no-tap-highlight ${
          item.danger ? "text-cherry-500 dark:text-cherry-400 hover:text-cherry-600" : "text-secondary hover:text-primary"
        }`}
        aria-label={item.label}
      >
        {item.icon}
        <span className="text-[9px] font-medium tracking-wide uppercase opacity-70">{item.label}</span>
      </button>
    );
  }
  return <FooterLink key={i} to={item.to} icon={item.icon} label={item.label} end={item.end} />;
}

function FooterLink({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        "flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition no-tap-highlight " +
        (isActive ? "text-cherry-500 dark:text-cherry-400" : "text-secondary hover:text-primary")
      }
      aria-label={label}
    >
      {icon}
      <span className="text-[9px] font-medium tracking-wide uppercase opacity-70">{label}</span>
    </NavLink>
  );
}

/**
 * Build-Info-Indicator: zeigt commit-hash + build-zeit.
 * Wird via vite.config.ts -> define injiziert.
 * `compact` ist die Mobile-Variante (nur kurzer Hash).
 */
function BuildInfo({ compact = false }: { compact?: boolean }) {
  const rev = typeof __APP_REV__ !== "undefined" ? __APP_REV__ : "dev";
  const built = typeof __APP_BUILT__ !== "undefined" ? __APP_BUILT__ : "";
  if (compact) {
    return (
      <span
        className="text-[10px] font-mono text-muted leading-none px-1.5 py-0.5 rounded bg-surface/60"
        title={`Revision ${rev} · gebaut ${built} UTC`}
      >
        v{rev}
      </span>
    );
  }
  return (
    <div
      className="mt-2 pt-2 border-t border-hairline/60 text-[10px] font-mono text-muted opacity-60 text-center select-text"
      title={`Build ${built} UTC`}
    >
      v{rev} · {built}
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition " +
        (isActive
          ? "bg-elevated text-primary"
          : "text-secondary hover:bg-elevated hover:text-primary")
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/**
 * Auth-Shell: Logo passt sich in der Höhe an den verfügbaren Vertikalraum an.
 * Card + Sprachauswahl bleiben ohne Scrollen sichtbar. Logo respektiert seine
 * eigene Aspect-Ratio — wenn die Höhe knapp ist, schrumpft auch die Breite.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-svh flex flex-col bg-canvas text-primary overflow-hidden">
      {/* Logo füllt verfügbare Höhe; Breite max. so wie Input-Felder im Kasten
          (max-w-sm minus card-Innenpadding p-5 = 20px je Seite) */}
      <div className="flex-1 min-h-0 pt-[calc(env(safe-area-inset-top)+0.5rem)] px-6 pb-2 flex items-center justify-center">
        <div className="w-full max-w-sm h-full px-5">
          {/* Logo: leicht abgedimmt — nicht pures Schwarz im Light, nicht pures Weiß im Dark.
              opacity statt invert verhindert harten Bildschirm-Kontrast. */}
          <img
            src={new URL("../assets/log_schriftzug.svg", import.meta.url).href}
            alt="Archerries"
            draggable={false}
            className="block w-full h-full object-contain opacity-80 dark:opacity-70 dark:invert"
          />
        </div>
      </div>
      <main className="shrink-0 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="w-full max-w-sm mx-auto">{children}</div>
      </main>
    </div>
  );
}
