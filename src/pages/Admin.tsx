import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Shield, Search, ChevronRight, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight,
  Filter, X, Info, Crown, User as UserIcon, UserCircle, Trash2,
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
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    listAdminUsers(includeDeleted)
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte User-Liste nicht laden"));
  }, [includeDeleted]);

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
      <div className="card-sunken space-y-3">
        <div className="flex items-center gap-2">
          <Search size={18} strokeWidth={1.75} className="text-muted shrink-0" />
          <input
            type="search"
            className="input flex-1 text-base"
            placeholder="Email oder Name suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {hasActiveFilter && (
            <button onClick={resetFilters} className="btn-icon" title="Filter zurücksetzen">
              <X size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} strokeWidth={1.75} className="text-muted shrink-0" />
          <span className="text-sm font-medium text-secondary">Rolle:</span>
          {ALL_ROLES.map((r) => (
            <FilterPill key={r} active={roleFilter.has(r)} onClick={() => toggleRole(r)}>
              <RoleBadge role={r} size="md" />
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-secondary pl-[24px]">Status:</span>
          {ALL_STATUSES.map((s) => (
            <FilterPill key={s} active={statusFilter.has(s)} onClick={() => toggleStatus(s)}>
              <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                s === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}>{s}</span>
            </FilterPill>
          ))}
          <label className="ml-3 inline-flex items-center gap-1.5 text-sm text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="w-4 h-4 accent-cherry-500"
            />
            Auch gelöschte zeigen
          </label>
        </div>
      </div>

      {/* Desktop: volle Tabelle */}
      <div className="card overflow-x-auto p-0 hidden lg:block">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-hairline text-left text-sm tracking-wide text-secondary/80 font-semibold select-none">
              <ThSort label="User"      k="name"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4" />
              <ThSort label="Rolle"     k="role"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4" />
              <ThSort label="Status"    k="status"    sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4" />
              <ThSort label="Trainings" k="trainings" sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4 text-right" />
              <ThSort label="Parcours"  k="parcours"  sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4 text-right" />
              <ThSort label="Bögen"     k="bows"      sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4 text-right" />
              <ThSort label="Seit"      k="created"   sortBy={sortBy} sortDir={sortDir} onClick={clickSort} className="py-3 px-4 text-right" />
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((u) => {
              const isSelf = u.id === me?.id;
              const isDeleted = !!u.deleted_at;
              return (
                <tr key={u.id} className={`border-b border-hairline last:border-0 hover:bg-elevated/50 transition ${isDeleted ? "opacity-60" : ""}`}>
                  <td className="py-3 px-4">
                    <Link to={`/admin/users/${u.id}`} className="flex items-center gap-3 min-w-0 hover:text-cherry-500 transition">
                      <Avatar user={u} size="md" showPresence={!isDeleted} />
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5">
                          {isDeleted && <Trash2 size={13} strokeWidth={1.75} className="text-muted shrink-0" />}
                          <span className={isDeleted ? "italic" : ""}>{u.display_name ?? "—"}</span>
                          {isSelf && <span className="text-sm text-muted ml-1">(du)</span>}
                          {isDeleted && <span className="text-xs uppercase tracking-wider bg-surface text-muted border border-hairline rounded-full px-1.5 py-0.5">gelöscht</span>}
                        </div>
                        <div className="text-sm text-muted truncate">{u.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <RoleBadge role={u.role} size="md" />
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                      u.status === "active"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    }`}>{u.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{u.count_trainings}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{u.count_parcours}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{u.count_bows}</td>
                  <td className="py-3 px-4 text-right text-sm text-muted tabular-nums whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1 text-sm text-secondary hover:text-cherry-500 transition"
                    >
                      Details <ChevronRight size={16} strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-base text-muted">
                  {hasActiveFilter ? "Keine User passen zum Filter." : "Keine User."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card-Liste statt Tabelle (Tabellen-Spalten passen nicht auf 390px) */}
      <div className="lg:hidden space-y-2">
        {/* Sort-Dropdown für Mobile */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted shrink-0">Sortiert nach:</span>
          <select
            value={`${sortBy}_${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split("_") as [SortKey, SortDir];
              setSortBy(k);
              setSortDir(d);
            }}
            className="input py-1 text-sm flex-1"
          >
            <option value="created_desc">Seit ↓ (neueste zuerst)</option>
            <option value="created_asc">Seit ↑ (älteste zuerst)</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="role_asc">Rolle (Superadmin zuerst)</option>
            <option value="status_asc">Status</option>
            <option value="trainings_desc">Trainings ↓</option>
            <option value="parcours_desc">Parcours ↓</option>
            <option value="bows_desc">Bögen ↓</option>
          </select>
        </div>

        {pageItems.map((u) => {
          const isSelf = u.id === me?.id;
          const isDeleted = !!u.deleted_at;
          return (
            <Link
              key={u.id}
              to={`/admin/users/${u.id}`}
              className={`card flex items-center gap-3 hover:border-cherry-500/30 transition ${isDeleted ? "opacity-60" : ""}`}
            >
              <Avatar user={u} size="md" showPresence={!isDeleted} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isDeleted && <Trash2 size={13} strokeWidth={1.75} className="text-muted shrink-0" />}
                  <span className={`font-medium ${isDeleted ? "italic" : ""}`}>{u.display_name ?? "—"}</span>
                  {isSelf && <span className="text-xs text-muted">(du)</span>}
                </div>
                <div className="text-sm text-muted truncate">{u.email}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <RoleBadge role={u.role} size="sm" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.status === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}>{u.status}</span>
                  {isDeleted && (
                    <span className="text-xs uppercase tracking-wider bg-surface text-muted border border-hairline rounded-full px-1.5 py-0.5">gelöscht</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted tabular-nums">
                  <span>{u.count_trainings} Trainings</span>
                  <span>·</span>
                  <span>{u.count_parcours} Parcours</span>
                  <span>·</span>
                  <span>{u.count_bows} Bögen</span>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.75} className="text-muted shrink-0" />
            </Link>
          );
        })}
        {sorted.length === 0 && (
          <div className="card text-center py-10 text-base text-muted">
            {hasActiveFilter ? "Keine User passen zum Filter." : "Keine User."}
          </div>
        )}
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
