import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Shield, Trash2, AlertTriangle, ChevronDown, Loader2,
  Map, Target, Crosshair, Users, Star, Trophy,
} from "lucide-react";
import { PageSpinner } from "../components/Spinner";
import Avatar from "../components/Avatar";
import { useAuth, type Role } from "../auth/AuthContext";
import { useConfirm } from "../components/ConfirmDialog";
import RoleBadge from "../components/RoleBadge";
import { lastSeenLabel, isOnline } from "../lib/presence";
import {
  getAdminUser, updateAdminUser, deleteAdminUser, listAdminUserTrainings,
  type AdminUserDetailResponse, type UserStatus, type AdminTrainingItem,
} from "../api/admin";
import { DISCIPLINE_LABELS, BOW_LABELS, type BowType, type Discipline } from "../api/trainings";

const ALL_ROLES: Role[] = ["superadmin", "admin", "user", "guest"];

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const nav = useNavigate();
  const confirm = useConfirm();
  const userId = Number(id);

  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Pagination: weitere Trainings über die initialen 10 hinaus.
  const [extraTrainings, setExtraTrainings] = useState<AdminTrainingItem[]>([]);
  const [trainingsOffset, setTrainingsOffset] = useState(10);
  const [trainingsHasMore, setTrainingsHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Wenn das Detail mehr als 10 Trainings hat: weitere lazy via Show-More.
  useEffect(() => {
    if (data && data.user.count_trainings > 10) {
      setTrainingsHasMore(true);
      setTrainingsOffset(10);
      setExtraTrainings([]);
    }
  }, [data]);

  async function loadMoreTrainings() {
    if (loadingMore || !data) return;
    setLoadingMore(true);
    try {
      const r = await listAdminUserTrainings(data.user.id, trainingsOffset, 20);
      setExtraTrainings((prev) => [...prev, ...r.trainings]);
      setTrainingsOffset((prev) => prev + r.trainings.length);
      setTrainingsHasMore(r.has_more);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte weitere Trainings nicht laden");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    getAdminUser(userId)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte User nicht laden"));
  }, [userId]);

  if (me && me.role !== "admin" && me.role !== "superadmin") {
    return <Navigate to="/" replace />;
  }
  if (!data && !error) return <PageSpinner />;
  if (!data) return <p className="text-cherry-500 p-8">{error}</p>;

  const u = data.user;
  const myRole: Role = me?.role ?? "user";
  const isSelf = u.id === me?.id;

  function canModify(): boolean {
    if (isSelf) return false;
    if (u.role === "superadmin" && myRole !== "superadmin") return false;
    if (u.role === "admin" && myRole !== "superadmin") return false;
    return true;
  }

  function canDelete(): boolean {
    if (!canModify()) return false;
    if (u.role === "superadmin") return false; // Superadmin nicht löschbar via UI
    if (u.deleted_at) return false; // bereits gelöscht
    return true;
  }

  const assignableRoles: Role[] = myRole === "superadmin" ? ALL_ROLES : ["user", "guest"];

  async function changeRole(role: Role) {
    if (role === u.role) return;
    setBusy(true);
    setError(null);
    try {
      await updateAdminUser(u.id, { role });
      const fresh = await getAdminUser(u.id);
      setData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(s: UserStatus) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminUser(u.id, { status: s });
      const fresh = await getAdminUser(u.id);
      setData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function hardDelete() {
    if (!canDelete()) return;
    const ok = await confirm({
      title: `${u.display_name ?? u.email} endgültig löschen?`,
      message: `Dieser Vorgang ist nicht umkehrbar. Trainings, Parcours, Bögen, Pfeile, Reviews — alles wird kaskadiert gelöscht.`,
      confirmLabel: "Endgültig löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminUser(u.id, deleteConfirmEmail);
      nav("/admin", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link to="/admin" className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
        <Shield size={20} strokeWidth={1.75} className="text-cherry-500" />
        <h1 className="display text-h2 flex-1">User-Detail</h1>
      </div>

      {error && (
        <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>
      )}

      {/* Profile-Card */}
      <section className={`card ${u.deleted_at ? "opacity-80" : ""}`}>
        {u.deleted_at && (
          <div className="card-sunken border-cherry-500/30 mb-3 flex items-start gap-2 text-sm">
            <Trash2 size={14} strokeWidth={1.75} className="text-cherry-600 dark:text-cherry-200 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Dieser Account ist gelöscht.</p>
              <p className="text-secondary text-xs">
                Anonymisiert am {formatDate(u.deleted_at)}. Persönliche Daten (Name, E-Mail, Avatar) wurden entfernt;
                öffentliche Inhalte (Parcours, Reviews, Trainings) bleiben erhalten.
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-4">
          <Avatar user={u} size="xl" showPresence={!u.deleted_at} />
          <div className="flex-1 min-w-0">
            <h2 className={`font-display text-xl font-semibold ${u.deleted_at ? "italic text-secondary" : ""}`}>
              {u.display_name ?? "—"}
              {isSelf && <span className="text-sm text-muted ml-2">(du)</span>}
            </h2>
            <p className="text-sm text-secondary">{u.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <RoleBadge role={u.role} />
              <Badge variant={u.deleted_at ? "warn" : (u.status === "active" ? "good" : "warn")}>
                {u.deleted_at ? "gelöscht" : u.status}
              </Badge>
              {!u.deleted_at && (isOnline(u.last_seen_at) ? (
                <Badge variant="good">● online</Badge>
              ) : (
                <span className="text-xs text-muted">· zuletzt aktiv {lastSeenLabel(u.last_seen_at)}</span>
              ))}
              <span className="text-xs text-muted">
                · seit {formatDate(u.created_at)}
              </span>
              {u.onboarding_completed_at && (
                <span className="text-xs text-muted">· Onboarding ✓</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Counts-Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CountTile icon={<Trophy size={18} />}   label="Trainings"   value={u.count_trainings} />
        <CountTile icon={<Map size={18} />}      label="Parcours"    value={u.count_parcours} />
        <CountTile icon={<Crosshair size={18} />} label="Bögen"      value={u.count_bows} />
        <CountTile icon={<Target size={18} />}    label="Pfeil-Sets" value={u.count_arrows} />
        <CountTile icon={<Crosshair size={18} />} label="Equipment"  value={u.count_equipment} />
        <CountTile icon={<Star size={18} />}     label="Reviews"     value={u.count_reviews} />
        <CountTile icon={<Users size={18} />}    label="Freunde"     value={u.count_friends} />
      </section>

      {/* Aktionen */}
      <section className="card space-y-3">
        <h2 className="eyebrow">Aktionen</h2>

        {!canModify() && (
          <p className="text-xs text-secondary">
            {isSelf
              ? "Eigener Account ist nicht änderbar (Lock-Out-Schutz)."
              : `Nur ein Superadmin kann diese Rolle ändern. Du bist ${myRole}.`}
          </p>
        )}

        {/* Rolle */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium min-w-[80px]">Rolle</span>
          <select
            value={u.role}
            disabled={busy || !canModify()}
            onChange={(e) => changeRole(e.target.value as Role)}
            className="input py-1 text-sm max-w-[200px]"
          >
            {[...new Set([...assignableRoles, u.role])].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium min-w-[80px]">Status</span>
          <button
            type="button"
            onClick={() => setStatus(u.status === "active" ? "pending" : "active")}
            disabled={busy || !canModify()}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              u.status === "active"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            } disabled:opacity-50`}
          >
            {u.status} {canModify() && <> · umschalten</>}
          </button>
          <span className="text-xs text-muted">
            {u.status === "active" ? "Login + Aktionen möglich" : "Gesperrt: kein Login möglich"}
          </span>
        </div>
      </section>

      {/* Soft-Delete (Anonymisierung) */}
      {canDelete() && (
        <section className="card border-cherry-500/30">
          <h2 className="eyebrow text-cherry-700 dark:text-cherry-200 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} strokeWidth={1.75} /> Account löschen (Soft-Delete)
          </h2>
          {!deleteOpen ? (
            <>
              <p className="text-sm text-secondary mb-3">
                Anonymisiert Name + E-Mail + Avatar, sperrt den Login. <b>Inhalte bleiben erhalten</b>
                (öffentliche Parcours, Reviews, geteilte Trainings, Highscores) — andere User sehen
                den Account als <i>„Gelöschter User"</i>.
              </p>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="btn-danger text-sm inline-flex items-center gap-1.5"
              >
                <Trash2 size={14} strokeWidth={1.75} /> Account löschen
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-secondary">
                Der Account wird <b>anonymisiert</b>:
              </p>
              <ul className="text-sm text-secondary list-disc pl-5 space-y-0.5">
                <li>Name → „Gelöschter User #{u.id}"</li>
                <li>E-Mail → unbrauchbar gemacht</li>
                <li>Avatar-Datei wird vom Server entfernt</li>
                <li>Login wird gesperrt (password_hash = NULL)</li>
              </ul>
              <p className="text-sm text-secondary">
                Inhalte (Parcours, Reviews, Trainings, Highscores) <b>bleiben</b>. Zur Bestätigung
                E-Mail-Adresse tippen:
              </p>
              <input
                type="email"
                className="input text-sm font-mono"
                placeholder={u.email}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteConfirmEmail(""); }}
                  className="btn-ghost text-sm flex-1"
                  disabled={busy}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={hardDelete}
                  className="btn-danger text-sm flex-1 inline-flex items-center justify-center gap-1.5"
                  disabled={busy || deleteConfirmEmail !== u.email}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={1.75} />}
                  Anonymisieren
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Listen */}
      <DetailSection title="Letzte Trainings" count={u.count_trainings} defaultOpen={data.trainings.length > 0}>
        {data.trainings.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Trainings.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {[...data.trainings, ...extraTrainings].map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm gap-2">
                  <Link to={`/trainings/${t.id}`} className="hover:text-cherry-500 transition truncate min-w-0">
                    <span className="font-medium">{DISCIPLINE_LABELS[t.discipline as Discipline] ?? t.discipline}</span>
                    {" · "}
                    <span className="text-secondary">{BOW_LABELS[t.bow_type as BowType] ?? t.bow_type}</span>
                    {t.parcours_name && <span className="text-secondary"> · {t.parcours_name}</span>}
                  </Link>
                  <div className="flex items-center gap-2 shrink-0 text-sm">
                    {t.published_to_highscore && <Trophy size={14} className="text-amber-500" />}
                    {t.summary_score != null && <span className="font-mono tabular-nums">{t.summary_score} Pkt</span>}
                    <span className="text-muted">{formatDate(t.started_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {trainingsHasMore && (
              <button
                type="button"
                onClick={loadMoreTrainings}
                disabled={loadingMore}
                className="btn-ghost w-full mt-3 text-sm inline-flex items-center justify-center gap-2"
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} strokeWidth={1.75} />}
                {loadingMore ? "Lade…" : `Weitere ${Math.min(20, u.count_trainings - (10 + extraTrainings.length))} Trainings laden`}
              </button>
            )}
            {!trainingsHasMore && extraTrainings.length > 0 && (
              <p className="text-xs text-muted text-center mt-2 italic">
                Alle {u.count_trainings} Trainings geladen.
              </p>
            )}
          </>
        )}
      </DetailSection>

      <DetailSection title="Parcours" count={data.parcours.length}>
        {data.parcours.length === 0 ? (
          <p className="text-xs text-muted">Keine Parcours angelegt.</p>
        ) : (
          <ul className="space-y-1">
            {data.parcours.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                <Link to={`/parcours/${p.id}`} className="hover:text-cherry-500 transition truncate min-w-0">
                  {p.name}
                </Link>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  {p.is_public ? <span className="text-emerald-600">öffentlich</span> : <span className="text-muted">privat</span>}
                  {p.lanes_count != null && <span className="text-muted">{p.lanes_count} Bahnen</span>}
                  {p.reviews_count > 0 && <span className="text-muted">· {p.reviews_count} Reviews</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Bögen" count={data.bows.length}>
        {data.bows.length === 0 ? (
          <p className="text-xs text-muted">Keine Bögen.</p>
        ) : (
          <ul className="space-y-1">
            {data.bows.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate min-w-0">
                  {b.is_default && <span className="text-cherry-500 mr-1">★</span>}
                  <b>{b.name}</b>
                  <span className="text-secondary"> · {BOW_LABELS[b.bow_type as BowType] ?? b.bow_type}</span>
                </span>
                {b.draw_weight_lbs != null && (
                  <span className="text-xs text-muted shrink-0">{b.draw_weight_lbs} lbs</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Pfeil-Sets" count={data.arrows.length}>
        {data.arrows.length === 0 ? (
          <p className="text-xs text-muted">Keine Pfeil-Sets.</p>
        ) : (
          <ul className="space-y-1">
            {data.arrows.map((a) => (
              <li key={a.id} className="text-sm flex items-center justify-between gap-2">
                <span className="truncate min-w-0">
                  <b>{a.name}</b>
                  {a.manufacturer && <span className="text-secondary"> · {a.manufacturer}{a.model ? ` ${a.model}` : ""}</span>}
                  {a.spine && <span className="text-secondary"> · Spine {a.spine}</span>}
                </span>
                {a.count_total != null && (
                  <span className="text-xs text-muted shrink-0">
                    {a.count_total - a.count_broken - a.count_lost} / {a.count_total}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Equipment" count={data.equipment.length}>
        {data.equipment.length === 0 ? (
          <p className="text-xs text-muted">Kein Equipment.</p>
        ) : (
          <ul className="space-y-1">
            {data.equipment.map((e) => (
              <li key={e.id} className="text-sm flex items-center justify-between gap-2">
                <span className="truncate min-w-0">
                  <b>{e.name}</b>
                  <span className="text-secondary"> · {e.kind}{e.sub_kind ? ` / ${e.sub_kind}` : ""}</span>
                  {e.manufacturer && <span className="text-secondary"> · {e.manufacturer}</span>}
                </span>
                {e.retired_at && (
                  <span className="text-xs text-muted shrink-0">außer Dienst</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Freunde" count={data.friends.length}>
        {data.friends.length === 0 ? (
          <p className="text-xs text-muted">Keine bestätigten Freundschaften.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.friends.map((f) => (
              <li key={f.id}>
                <Link to={`/admin/users/${f.id}`} className="flex items-center gap-2 text-sm hover:text-cherry-500 transition min-w-0">
                  <Avatar user={f} size="xs" showPresence />
                  <span className="truncate flex-1">
                    <b>{f.display_name ?? "—"}</b>
                    <span className="text-muted text-xs ml-1">{f.email}</span>
                  </span>
                  {isOnline(f.last_seen_at) && (
                    <span className="text-[10px] text-emerald-600 font-medium shrink-0">online</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Reviews" count={data.reviews.length}>
        {data.reviews.length === 0 ? (
          <p className="text-xs text-muted">Keine Reviews geschrieben.</p>
        ) : (
          <ul className="space-y-2">
            {data.reviews.map((r) => (
              <li key={r.id} className="text-sm">
                <Link to={`/parcours/${r.parcours_id}`} className="hover:text-cherry-500 transition">
                  <span className="font-medium">{r.parcours_name}</span>
                </Link>
                <span className="ml-2 text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                {r.comment && <p className="text-xs text-secondary mt-0.5">„{r.comment}"</p>}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
    </div>
  );
}

function DetailSection({ title, count, defaultOpen = false, children }: { title: string; count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="card group">
      <summary className="cursor-pointer list-none flex items-center gap-2">
        <ChevronDown size={16} strokeWidth={1.75} className={`text-secondary transition ${open ? "rotate-180" : ""} shrink-0`} />
        <h2 className="eyebrow flex-1">{title}</h2>
        <span className="text-xs text-muted tabular-nums">{count}</span>
      </summary>
      <div className="pt-3 pl-6">{children}</div>
    </details>
  );
}

function CountTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card-sunken text-center py-3">
      <div className="text-secondary flex justify-center mb-1">{icon}</div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "neutral" | "good" | "warn" }) {
  const cls =
    variant === "good"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : variant === "warn"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-surface text-secondary border border-hairline";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>
  );
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return s;
  }
}
