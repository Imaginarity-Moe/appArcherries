import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Shield, Search, ChevronRight, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  Filter, X, Info, Crown, User as UserIcon, UserCircle,
} from "lucide-react";
import { PageSpinner } from "../components/Spinner";
import Avatar from "../components/Avatar";
import RoleBadge from "../components/RoleBadge";
import { useAuth, type Role } from "../auth/AuthContext";
import { listAdminUsers, type AdminUser, type UserStatus } from "../api/admin";

const ALL_ROLES: Role[] = ["superadmin", "admin", "user", "guest"];
const ALL_STATUSES: UserStatus[] = ["active", "pending"];
const PAGE_SIZE = 25;

type SortKey = "name" | "role" | "status" | "trainings" | "parcours" | "bows" | "created";
type SortDir = "asc" | "desc";
const ROLE_ORDER: Record<Role, number> = { superadmin: 0, admin: 1, user: 2, guest: 3 };

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Set<Role>>(new Set(ALL_ROLES));
  const [statusFilter, setStatusFilter] = useState<Set<UserStatus>>(new Set(ALL_STATUSES));
  const [sortBy, setSortBy] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    listAdminUsers()
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte User-Liste nicht laden"));
  }, []);

  if (me && me.role !== "admin" && me.role !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => roleFilter.has(u.role))
      .filter((u) => statusFilter.has(u.status))
      .filter((u) => {
        if (!q) return true;
        return (
          u.email.toLowerCase().includes(q) ||
          (u.display_name ?? "").toLowerCase().includes(q)
        );
      });
  }, [users, search, roleFilter, statusFilter]);

  const sorted = useMemo(() => {
    const cmp = (a: AdminUser, b: AdminUser): number => {
      let v = 0;
      switch (sortBy) {
        case "name":
          v = (a.display_name ?? a.email).localeCompare(b.display_name ?? b.email, "de");
          break;
        case "role":
          v = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
          break;
        case "status":
          v = a.status.localeCompare(b.status);
          break;
        case "trainings":
          v = a.count_trainings - b.count_trainings; break;
        case "parcours":
          v = a.count_parcours - b.count_parcours; break;
        case "bows":
          v = a.count_bows - b.count_bows; break;
        case "created":
          v = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? v : -v;
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortBy, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageItems = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  // Filter ändern → zurück auf Seite 1
  useEffect(() => { setPage(0); }, [search, roleFilter, statusFilter, sortBy, sortDir]);

  function toggleRole(r: Role) {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }
  function toggleStatus(s: UserStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }
  function clickSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(k); setSortDir(k === "created" ? "desc" : "asc"); }
  }
  function resetFilters() {
    setSearch("");
    setRoleFilter(new Set(ALL_ROLES));
    setStatusFilter(new Set(ALL_STATUSES));
  }

  if (!users) return <PageSpinner />;

  const myRole: Role = me?.role ?? "user";
  const hasActiveFilter =
    search.trim() !== "" ||
    roleFilter.size !== ALL_ROLES.length ||
    statusFilter.size !== ALL_STATUSES.length;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield size={22} strokeWidth={1.75} className="text-cherry-500" />
        <h1 className="display text-h2 flex-1">Admin · User-Verwaltung</h1>
        <span className="text-xs text-muted tabular-nums">
          {sorted.length} {sorted.length === 1 ? "User" : "User"}
          {hasActiveFilter && <> von {users.length}</>}
        </span>
      </div>

      {error && (
        <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>
      )}

      {/* Rollen-Info-Box (collapsible) */}
      <RoleInfoBox myRole={myRole} />

      {/* Filter-Bar */}
      <div className="card-sunken space-y-2.5">
        <div className="flex items-center gap-2">
          <Search size={16} strokeWidth={1.75} className="text-muted shrink-0" />
          <input
            type="search"
            className="input flex-1"
            placeholder="Email oder Name suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {hasActiveFilter && (
            <button onClick={resetFilters} className="btn-icon" title="Filter zurücksetzen">
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} strokeWidth={1.75} className="text-muted shrink-0" />
          <span className="text-xs text-muted">Rolle:</span>
          {ALL_ROLES.map((r) => (
            <FilterPill key={r} active={roleFilter.has(r)} onClick={() => toggleRole(r)}>
              <RoleBadge role={r} size="sm" />
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted pl-[22px]">Status:</span>
          {ALL_STATUSES.map((s) => (
            <FilterPill key={s} active={statusFilter.has(s)} onClick={() => toggleStatus(s)}>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                s === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}>{s}</span>
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Tabelle */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs tracking-[0.08em] text-secondary/70 font-semibold uppercase select-none">
              <ThSort label="User"      k="name"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3" />
              <ThSort label="Rolle"     k="role"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3" />
              <ThSort label="Status"    k="status"    sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3" />
              <ThSort label="Trainings" k="trainings" sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3 text-right" />
              <ThSort label="Parcours"  k="parcours"  sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3 text-right" />
              <ThSort label="Bögen"     k="bows"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3 text-right" />
              <ThSort label="Seit"      k="created"   sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-2.5 px-3 text-right" />
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="border-b border-hairline last:border-0 hover:bg-elevated/50 transition">
                  <td className="py-2 px-3">
                    <Link to={`/admin/users/${u.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-cherry-500 transition">
                      <Avatar user={u} size="sm" showPresence />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.display_name ?? "—"}
                          {isSelf && <span className="text-xs text-muted ml-1.5">(du)</span>}
                        </div>
                        <div className="text-xs text-muted truncate">{u.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <RoleBadge role={u.role} size="sm" />
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}>{u.status}</span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_trainings}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_parcours}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_bows}</td>
                  <td className="py-2 px-3 text-right text-xs text-muted tabular-nums whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1 text-xs text-secondary hover:text-cherry-500 transition"
                    >
                      Details <ChevronRight size={14} strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-muted">
                  {hasActiveFilter ? "Keine User passen zum Filter." : "Keine User."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-xs text-muted">
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, sorted.length)} von {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={currentPage === 0}
              className="btn-icon"
              title="Erste Seite"
            >
              <ChevronsLeft size={16} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="btn-icon"
              title="Vorherige Seite"
            >
              <ChevronUp size={16} strokeWidth={1.75} className="rotate-[-90deg]" />
            </button>
            <span className="text-xs tabular-nums px-2">
              {currentPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              className="btn-icon"
              title="Nächste Seite"
            >
              <ChevronDown size={16} strokeWidth={1.75} className="rotate-[-90deg]" />
            </button>
            <button
              onClick={() => setPage(pageCount - 1)}
              disabled={currentPage >= pageCount - 1}
              className="btn-icon"
              title="Letzte Seite"
            >
              <ChevronsRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rollen-Info-Box ─────────────────────────────────────────────────────────

function RoleInfoBox({ myRole }: { myRole: Role }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
        <Info size={16} strokeWidth={1.75} className="text-cherry-500 shrink-0" />
        <span className="font-semibold text-sm">Rollen &amp; Berechtigungen</span>
        <span className="text-xs text-muted ml-auto">aufklappen</span>
        <ChevronDown size={16} strokeWidth={1.75} className="text-muted group-open:rotate-180 transition shrink-0" />
      </summary>

      <div className="pt-4 space-y-3">
        <p className="text-sm text-secondary">
          Vier Rollen mit absteigender Berechtigung. Höhere Rollen schließen die Rechte
          niedrigerer Rollen ein:
        </p>

        <div className="space-y-2">
          <RoleRow
            icon={<Crown size={16} strokeWidth={2} className="text-amber-600 dark:text-amber-300" />}
            role="superadmin"
            label="Superadmin"
            description="Verwaltet alle User inkl. anderer Admins/Superadmins. Kann hart löschen. Mindestens ein aktiver Superadmin muss übrig bleiben — sperrt sich vor Self-Demote."
            can={[
              "Andere Superadmins/Admins verwalten",
              "User-Rollen beliebig vergeben (auch Superadmin)",
              "User endgültig löschen",
              "Eigener Account: nicht änderbar (Lock-Out-Schutz)",
            ]}
          />
          <RoleRow
            icon={<Shield size={16} strokeWidth={2} className="text-cherry-600 dark:text-cherry-200" />}
            role="admin"
            label="Admin"
            description="Verwaltet User und Gäste. Kann andere Admins/Superadmins NICHT anfassen."
            can={[
              "User/Guest sperren (Status pending)",
              "User/Guest auf andere Rolle setzen (außer admin/superadmin)",
              "Nicht: andere Admins, Superadmins, sich selbst",
            ]}
          />
          <RoleRow
            icon={<UserIcon size={16} strokeWidth={1.75} className="text-secondary" />}
            role="user"
            label="User"
            description="Normaler registrierter Nutzer. Trainings, Parcours, Bögen, Pfeile, Equipment, Reviews, Freundschaften — alles freigeschaltet."
            can={[
              "Eigene Daten verwalten",
              "Öffentliche Parcours nutzen + klonen + bewerten",
              "Geteilte Runden eröffnen und beitreten",
            ]}
          />
          <RoleRow
            icon={<UserCircle size={16} strokeWidth={1.5} className="text-muted" />}
            role="guest"
            label="Gast"
            description="Wird nur via QR-Code-Einladung erstellt. Kein Passwort, kein eigenes Login. Lebt nur innerhalb eines geteilten Trainings."
            can={[
              "Nur das Training scoren, zu dem er eingeladen wurde",
              "Kein eigenes Dashboard, keine eigenen Parcours",
              "Onboarding-Wizard wird übersprungen",
            ]}
          />
        </div>

        <div className="card-sunken text-xs space-y-1">
          <p className="font-semibold text-primary">Wichtig — Schutzregeln</p>
          <ul className="list-disc pl-5 text-secondary space-y-0.5">
            <li>Der eigene Account ist nie änderbar (verhindert Lock-Out).</li>
            <li>Promotion zu Superadmin nur durch einen Superadmin möglich.</li>
            <li>Hard-Delete eines Superadmin-Accounts ist hart gesperrt — er muss erst auf Admin demoted werden.</li>
            <li>Mindestens ein aktiver Superadmin muss übrig bleiben — Backend prüft das vor jedem Demote/Sperren.</li>
          </ul>
        </div>

        <p className="text-xs text-muted italic">
          Deine aktuelle Rolle: <RoleBadge role={myRole} size="sm" />
        </p>
      </div>
    </details>
  );
}

function RoleRow({
  icon, role, label, description, can,
}: {
  icon: React.ReactNode; role: Role; label: string; description: string; can: string[];
}) {
  return (
    <div className="card-sunken">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <RoleBadge role={role} size="sm" withIcon={false} />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p className="text-xs text-secondary mb-1.5">{description}</p>
      <ul className="text-xs text-secondary list-disc pl-5 space-y-0.5">
        {can.map((c, i) => <li key={i}>{c}</li>)}
      </ul>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FilterPill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full transition active:scale-[0.96] ${
        active ? "opacity-100" : "opacity-35 hover:opacity-60"
      }`}
      title={active ? "Filter aktiv — klick zum Ausblenden" : "Klick zum Einblenden"}
    >
      {children}
    </button>
  );
}

function ThSort({
  label, k, sortBy, sortDir, onClick, className = "",
}: {
  label: string; k: SortKey; sortBy: SortKey; sortDir: SortDir;
  onClick: (k: SortKey) => void; className?: string;
}) {
  const active = sortBy === k;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-0.5 hover:text-primary transition ${
          active ? "text-primary" : ""
        }`}
      >
        {label}
        <span className="inline-flex flex-col w-3 ml-0.5">
          <ChevronUp size={9} strokeWidth={2.5} className={active && sortDir === "asc" ? "text-cherry-500" : "text-muted/40"} />
          <ChevronDown size={9} strokeWidth={2.5} className={active && sortDir === "desc" ? "text-cherry-500" : "text-muted/40"} style={{ marginTop: -3 }} />
        </span>
      </button>
    </th>
  );
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("de-DE", { year: "2-digit", month: "2-digit", day: "2-digit" });
  } catch {
    return s;
  }
}
