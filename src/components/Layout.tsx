import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  BarChart3,
  Plus,
  HelpCircle,
  UserCircle,
  Map,
  LogIn,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { LogoMark, LogoWordmark } from "./Logo";

/**
 * Responsive Layout:
 * - Mobile: Bottom-Nav mit zentralem FAB für „Neues Training“
 * - Desktop (≥1024px): Linke Sidebar
 *
 * Auth-Routes haben kein Layout-Chrome (eigenes minimal Login-Layout).
 * Live-Training-View (TrainingDetail) blendet die Bottom-Nav aus, um Fokus zu schaffen.
 */
export default function Layout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthRoute =
    /^\/(login|register|verify|forgot-password|reset-password)/.test(location.pathname);

  // In aktiven Trainings reduzieren wir Chrome
  const isLiveTraining = /^\/trainings\/\d+/.test(location.pathname);

  if (isAuthRoute || !user) {
    return (
      <main className="min-h-screen bg-canvas dark:bg-canvas-dark">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark">
      {/* Desktop-Sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-60 flex-col border-r border-forest-100 bg-elevated dark:bg-elevated-dark dark:border-forest-800 z-20">
        <Link to="/" className="block px-6 py-5">
          <LogoWordmark />
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <SidebarLink to="/" icon={<Home size={20} />} label={t("nav.home")} />
          <SidebarLink to="/stats" icon={<BarChart3 size={20} />} label={t("nav.stats")} />
          <SidebarLink to="/parcours" icon={<Map size={20} />} label={t("nav.parcours")} />
          <SidebarLink to="/help" icon={<HelpCircle size={20} />} label={t("nav.help")} />
          <SidebarLink to="/profile" icon={<UserCircle size={20} />} label={t("nav.profile")} />
        </nav>
        <div className="p-3">
          <button
            className="btn w-full"
            onClick={() => navigate("/trainings/new")}
          >
            <Plus size={18} /> {t("dashboard:new_training")}
          </button>
        </div>
      </aside>

      {/* Mobile-Header (schlank) */}
      <header className="lg:hidden sticky top-0 z-10 bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur border-b border-forest-100 dark:border-forest-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-forest-700 dark:text-forest-100">
            <LogoMark size={28} className="text-copper-500" />
            <span className="font-display text-lg font-semibold">Archerries</span>
          </Link>
          <Link to="/profile" className="btn-icon" aria-label="Profile">
            <UserCircle size={24} />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className={`lg:pl-60 ${isLiveTraining ? "pb-4" : "pb-24"}`}>
        <div className="container-app py-4 sm:py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile-Bottom-Nav (verstecken in Live-Training für Fokus) */}
      {!isLiveTraining && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-elevated/95 dark:bg-elevated-dark/95 backdrop-blur border-t border-forest-100 dark:border-forest-800 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 items-end h-16 relative">
            <BottomLink to="/" icon={<Home size={22} />} label={t("nav.home")} />
            <BottomLink to="/stats" icon={<BarChart3 size={22} />} label={t("nav.stats")} />
            <div className="flex items-center justify-center -mt-6">
              <button
                onClick={() => navigate("/trainings/new")}
                className="tap-large rounded-full bg-copper-500 hover:bg-copper-600 text-white shadow-copper flex items-center justify-center transition active:scale-95"
                aria-label={t("dashboard:new_training")}
              >
                <Plus size={28} strokeWidth={2.5} />
              </button>
            </div>
            <BottomLink to="/parcours" icon={<Map size={22} />} label={t("nav.parcours")} />
            <BottomLink to="/help" icon={<HelpCircle size={22} />} label={t("nav.help")} />
          </div>
        </nav>
      )}
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition " +
        (isActive
          ? "bg-forest-100 dark:bg-forest-800 text-forest-900 dark:text-forest-50"
          : "text-forest-700 dark:text-forest-200 hover:bg-forest-50 dark:hover:bg-forest-900")
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function BottomLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        "flex flex-col items-center justify-center gap-0.5 h-full text-xs font-medium transition " +
        (isActive
          ? "text-copper-500"
          : "text-forest-700 dark:text-forest-300 hover:text-forest-900")
      }
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </NavLink>
  );
}

/** Minimal-Layout für /login etc (kein Layout, eigenes Auth-Shell) */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark flex flex-col">
      <div className="flex-1 center-fit px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer className="py-4 text-center text-sm text-forest-700 dark:text-forest-300">
        <Link to="/login" className="hover:text-copper-500 inline-flex items-center gap-1">
          <LogIn size={14} /> Archerries
        </Link>
      </footer>
    </div>
  );
}
