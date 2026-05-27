import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Users, Copy, Check, RefreshCw, Trash2, LogOut, Settings, Loader2, ShieldCheck,
  Trophy, Medal, BarChart3,
} from "lucide-react";
import {
  getClub,
  updateClub,
  deleteClub,
  leaveClub,
  removeClubMember,
  regenerateClubInviteCode,
  getClubStats,
  type Club,
  type ClubMember,
  type ClubStats,
} from "../api/clubs";
import { BOW_LABELS, DISCIPLINE_LABELS, type BowType, type Discipline } from "../api/trainings";
import { PageSpinner } from "../components/Spinner";
import Avatar from "../components/Avatar";
import { useConfirm } from "../components/ConfirmDialog";
import { usePageFooter } from "../components/FooterContext";

export default function ClubDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const confirm = useConfirm();
  const cid = Number(id);

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [stats, setStats] = useState<ClubStats | null>(null);

  const isAdmin = club?.my_role === "admin";

  useEffect(() => {
    if (!cid) return;
    getClub(cid)
      .then((r) => {
        setClub(r.club);
        setMembers(r.members);
        setEditName(r.club.name);
        setEditDescription(r.club.description ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Verein nicht gefunden"))
      .finally(() => setLoading(false));
    // Stats parallel laden — fehlt sie, blendet sich die Sektion still aus
    getClubStats(cid).then(setStats).catch(() => setStats(null));
  }, [cid]);

  const footerActions = useMemo(
    () => [
      { kind: "button" as const, icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück", onClick: () => nav("/clubs") },
    ],
    [nav]
  );
  usePageFooter(footerActions);

  function copyInvite() {
    if (!club) return;
    navigator.clipboard.writeText(club.invite_code).then(() => {
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!club || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await updateClub(club.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setClub(r.club);
      setMembers(r.members);
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenCode() {
    if (!club) return;
    const ok = await confirm({
      title: "Einladungs-Code rotieren?",
      message: "Der alte Code wird ungültig. Bestehende Mitglieder bleiben drin, neue Beitritte sind nur noch mit dem neuen Code möglich.",
      confirmLabel: "Neuen Code erzeugen",
      variant: "default",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await regenerateClubInviteCode(club.id);
      setClub(r.club);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteClub() {
    if (!club) return;
    const ok = await confirm({
      title: `Verein „${club.name}" löschen?`,
      message: "Alle Mitgliedschaften werden aufgehoben. Trainings und Highscores der Mitglieder bleiben erhalten.",
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteClub(club.id);
      nav("/clubs");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!club) return;
    const isLastAdmin =
      isAdmin && members.filter((m) => m.role === "admin").length === 1 && members.length > 1;
    const ok = await confirm({
      title: "Verein verlassen?",
      message: isLastAdmin
        ? "Du bist der einzige Admin. Bevor du gehst, wird das älteste Mitglied automatisch zum Admin befördert."
        : `Du verlässt „${club.name}". Du kannst jederzeit mit dem Einladungs-Code wieder beitreten.`,
      confirmLabel: "Verlassen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await leaveClub(club.id);
      nav("/clubs");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(m: ClubMember) {
    if (!club) return;
    const ok = await confirm({
      title: `${m.display_name ?? "Mitglied"} entfernen?`,
      message: "Die Person ist nicht mehr im Verein. Sie kann jederzeit mit dem Einladungs-Code wieder beitreten.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await removeClubMember(club.id, m.user_id);
      setClub(r.club);
      setMembers(r.members);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!club) return <p className="text-cherry-500 p-8">{error ?? "Verein nicht gefunden"}</p>;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <header className="space-y-1">
        <button onClick={() => nav("/clubs")} className="btn-icon -ml-2" aria-label="Zurück">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h1 flex items-center gap-2">
          <Users size={24} strokeWidth={1.75} /> {club.name}
        </h1>
        {club.description && (
          <p className="text-secondary text-sm whitespace-pre-wrap">{club.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{members.length} {members.length === 1 ? "Mitglied" : "Mitglieder"}</span>
          {isAdmin && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={11} strokeWidth={2} /> Du bist Admin
              </span>
            </>
          )}
        </div>
      </header>

      {/* Einladungs-Code */}
      <section className="card space-y-3">
        <h2 className="eyebrow">Einladungs-Code</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xl font-mono tabular-nums tracking-widest text-center py-2 bg-surface rounded-lg border border-hairline select-all">
            {club.invite_code}
          </code>
          <button
            onClick={copyInvite}
            className="btn-icon"
            aria-label="Kopieren"
            title={codeCopied ? "Kopiert!" : "Code kopieren"}
          >
            {codeCopied ? <Check size={18} strokeWidth={2} className="text-emerald-500" /> : <Copy size={18} strokeWidth={1.75} />}
          </button>
        </div>
        <p className="text-xs text-muted">
          Teile diesen Code mit Mitschützen. Sie tippen ihn unter „Vereine → Mit Code beitreten" ein.
        </p>
        {isAdmin && (
          <button
            onClick={handleRegenCode}
            disabled={busy}
            className="btn-ghost text-xs inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} strokeWidth={1.75} /> Code rotieren
          </button>
        )}
      </section>

      {/* Settings (Admin) */}
      {isAdmin && (
        <section className="card space-y-3">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="eyebrow flex items-center gap-1.5 w-full text-left"
          >
            <Settings size={13} strokeWidth={1.75} /> Einstellungen
          </button>
          {showSettings && (
            <form onSubmit={handleSaveSettings} className="space-y-3 animate-fade-in">
              <label className="block">
                <span className="text-xs text-muted">Name</span>
                <input
                  type="text"
                  className="input mt-1"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted">Beschreibung</span>
                <textarea
                  className="input mt-1"
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </label>
              {error && <div className="text-sm text-cherry-500">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSettings(false)} className="btn-ghost flex-1">
                  Abbrechen
                </button>
                <button type="submit" disabled={busy || !editName.trim()} className="btn-accent flex-1">
                  {busy && <Loader2 size={14} className="animate-spin" />} Speichern
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Mitglieder */}
      <section className="card">
        <h2 className="eyebrow mb-3">Mitglieder ({members.length})</h2>
        <ul className="space-y-2.5">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <Avatar
                user={{
                  avatar_url: m.avatar_url,
                  display_name: m.display_name,
                  last_seen_at: m.last_seen_at,
                }}
                size="sm"
                showPresence
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {m.display_name ?? "Anonym"}
                  {m.role === "admin" && (
                    <span className="text-[10px] uppercase tracking-wider bg-cherry-100 dark:bg-cherry-900/40 text-cherry-700 dark:text-cherry-200 px-1.5 py-0.5 rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  Beigetreten {new Date(m.joined_at).toLocaleDateString("de-DE")}
                </div>
              </div>
              {isAdmin && m.role !== "admin" && (
                <button
                  onClick={() => handleRemoveMember(m)}
                  disabled={busy}
                  className="btn-icon text-muted"
                  aria-label={`${m.display_name ?? "Mitglied"} entfernen`}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Vereins-Stats — lazy geladen, blendet sich aus wenn keine Daten */}
      {stats && (stats.members_ranked.some((m) => m.count_all > 0) || stats.parcours_records.length > 0) && (
        <ClubStatsSection stats={stats} />
      )}

      {/* Danger-Zone */}
      <section className="card border-cherry-500/20 space-y-2">
        <h2 className="eyebrow text-cherry-600">Mitgliedschaft</h2>
        <button
          onClick={handleLeave}
          disabled={busy}
          className="btn-ghost danger w-full inline-flex items-center justify-center gap-2"
        >
          <LogOut size={15} strokeWidth={1.75} /> Verein verlassen
        </button>
        {isAdmin && (
          <button
            onClick={handleDeleteClub}
            disabled={busy}
            className="btn-ghost danger w-full inline-flex items-center justify-center gap-2"
          >
            <Trash2 size={15} strokeWidth={1.75} /> Verein löschen
          </button>
        )}
      </section>
    </div>
  );
}

// ─── Vereins-Stats-Sektion ────────────────────────────────────────────────

function ClubStatsSection({ stats }: { stats: ClubStats }) {
  const activeRanking = stats.members_ranked.filter((m) => m.count_all > 0);
  const maxBestAll = Math.max(...activeRanking.map((m) => m.best_score_all ?? 0), 1);

  return (
    <section className="card space-y-4">
      <h2 className="eyebrow flex items-center gap-1.5">
        <BarChart3 size={13} strokeWidth={1.75} /> Vereins-Stats
      </h2>

      {/* Top-Schützen-Ranking */}
      {activeRanking.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Trophy size={14} strokeWidth={1.75} /> Top-Schützen
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted">
              Best-Score · letzte 30 T / alltime
            </span>
          </div>
          <ul className="space-y-2">
            {activeRanking.slice(0, 10).map((m, i) => (
              <li key={m.user_id} className="flex items-center gap-3">
                <RankBadge rank={i + 1} />
                <Avatar
                  user={{ avatar_url: m.avatar_url, display_name: m.display_name }}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {m.display_name ?? "Anonym"}
                  </div>
                  <div className="text-[11px] text-muted tabular-nums">
                    {m.count_30d > 0 ? <>{m.count_30d}× in 30 T</> : <span className="italic">keine Aktivität in 30 T</span>}
                    {" · "}
                    {m.count_all} alltime
                  </div>
                  {m.best_score_all !== null && (
                    <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cherry-500/80"
                        style={{ width: `${((m.best_score_all ?? 0) / maxBestAll) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-right tabular-nums text-sm">
                  <div className="font-mono">
                    {m.best_score_30d ?? <span className="text-muted">—</span>}
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    {m.best_score_all ?? "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vereinsrekorde */}
      {stats.parcours_records.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Medal size={14} strokeWidth={1.75} /> Vereinsrekorde
          </h3>
          <ul className="space-y-1.5">
            {stats.parcours_records.slice(0, 8).map((r) => (
              <li key={`${r.parcours_id}-${r.discipline}-${r.bow_type}`}>
                <Link
                  to={`/parcours/${r.parcours_id}`}
                  className="flex items-center gap-2 py-1.5 -mx-1 px-1 rounded-lg hover:bg-surface transition"
                >
                  <Avatar
                    user={{ avatar_url: r.avatar_url, display_name: r.display_name }}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.parcours_name}</div>
                    <div className="text-[11px] text-muted">
                      {DISCIPLINE_LABELS[r.discipline as Discipline] ?? r.discipline}
                      {" · "}
                      {BOW_LABELS[r.bow_type as BowType] ?? r.bow_type}
                      {" · "}
                      <span className="truncate">{r.display_name ?? "Anonym"}</span>
                    </div>
                  </div>
                  <span className="score text-lg tabular-nums">{r.score}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? "bg-gold text-warm-black"
    : rank === 2 ? "bg-stone-300 text-warm-black"
    : rank === 3 ? "bg-amber-700 text-cream"
    : "bg-surface text-secondary";
  return (
    <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${cls}`}>
      {rank}
    </div>
  );
}
