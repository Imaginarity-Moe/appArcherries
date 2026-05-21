import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield, Search } from "lucide-react";
import { PageSpinner } from "../components/Spinner";
import Avatar from "../components/Avatar";
import { useAuth, type Role } from "../auth/AuthContext";
import { listAdminUsers, updateAdminUser, type AdminUser } from "../api/admin";

const ROLES: Role[] = ["admin", "user", "guest"];

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listAdminUsers()
      .then((r) => setUsers(r.users))
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte User-Liste nicht laden"));
  }, []);

  // Schutz: nicht-admin abweisen (Backend würde 403 schmeißen, aber UX besser mit Redirect)
  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  async function changeRole(u: AdminUser, role: Role) {
    if (role === u.role) return;
    setBusyId(u.id);
    setError(null);
    try {
      const r = await updateAdminUser(u.id, { role });
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? r.user : x)) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(u: AdminUser) {
    const next = u.status === "active" ? "pending" : "active";
    setBusyId(u.id);
    setError(null);
    try {
      const r = await updateAdminUser(u.id, { status: next });
      setUsers((prev) => prev?.map((x) => (x.id === u.id ? r.user : x)) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  if (!users) return <PageSpinner />;

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={22} strokeWidth={1.75} className="text-cherry-500" />
        <h1 className="display text-h2 flex-1">Admin · User-Verwaltung</h1>
        <span className="text-xs text-muted tabular-nums">{users.length} User</span>
      </div>

      {error && (
        <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>
      )}

      <div className="card-sunken">
        <label className="flex items-center gap-2">
          <Search size={16} strokeWidth={1.75} className="text-muted shrink-0" />
          <input
            type="search"
            className="input flex-1"
            placeholder="Email oder Name suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs tracking-[0.08em] text-secondary/60 font-semibold">
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Rolle</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Trainings</th>
              <th className="py-2.5 px-3 text-right">Parcours</th>
              <th className="py-2.5 px-3 text-right">Bögen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <tr key={u.id} className="border-b border-hairline last:border-0">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar user={u} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {u.display_name ?? "—"}
                          {isSelf && <span className="text-xs text-muted ml-1.5">(du)</span>}
                        </div>
                        <div className="text-xs text-muted truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={u.role}
                      disabled={busyId === u.id || isSelf}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="input py-1 text-xs"
                      title={isSelf ? "Eigene Rolle nicht änderbar" : "Rolle ändern"}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(u)}
                      disabled={busyId === u.id || isSelf}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      } disabled:opacity-50`}
                      title={isSelf ? "Eigener Status nicht änderbar" : "Status umschalten"}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_trainings}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_parcours}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{u.count_bows}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted">
                  Keine User gefunden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted text-center">
        Schutz: Mindestens ein aktiver Admin muss übrig bleiben. Eigene Rolle und Status nicht änderbar.
      </p>
    </div>
  );
}
