import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Users, Copy, Check, RefreshCw, Trash2, LogOut, Settings, Loader2, ShieldCheck,
} from "lucide-react";
import {
  getClub,
  updateClub,
  deleteClub,
  leaveClub,
  removeClubMember,
  regenerateClubInviteCode,
  type Club,
  type ClubMember,
} from "../api/clubs";
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
