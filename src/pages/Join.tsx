import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users, Calendar, Target } from "lucide-react";
import { acceptJoin, getJoinPreview, type JoinPreview } from "../api/invitations";
import { setToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DISCIPLINE_LABELS, BOW_LABELS, type Discipline, type BowType } from "../api/trainings";
import { fmtDateTime } from "../lib/format";

export default function Join() {
  const { token } = useParams<{ token: string }>();
  const nav = useNavigate();
  const { user, refresh: refreshAuth } = useAuth();
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getJoinPreview(token);
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);
    try {
      const r = await acceptJoin(token, user ? undefined : name.trim());
      if (r.token) {
        // Gast-JWT speichern
        setToken(r.token);
        await refreshAuth();
      }
      nav(`/trainings/${r.training_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <p className="text-forest-700 p-8">Lade…</p>;
  if (error || !preview) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-canvas-dark flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-red-700 mb-4">{error ?? "Einladung nicht gefunden"}</p>
          <button onClick={() => nav("/")} className="btn-secondary">Zur Startseite</button>
        </div>
      </div>
    );
  }

  const tr = preview.training;
  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <h1 className="font-display text-3xl font-semibold text-forest-900 dark:text-forest-50 text-center">
          Du bist eingeladen
        </h1>
        <p className="text-forest-700 dark:text-forest-300 text-center mt-2">
          {tr.owner_name ? `${tr.owner_name} ` : ""}möchte, dass du an dieser Runde mit-scorst.
        </p>

        <div className="bg-elevated dark:bg-elevated-dark rounded-3xl shadow-card p-6 mt-6 space-y-3">
          <div className="flex items-center gap-3 text-forest-700 dark:text-forest-200">
            <Calendar size={18} className="text-copper-500" />
            <span>{fmtDateTime(tr.started_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-forest-700 dark:text-forest-200">
            <Target size={18} className="text-copper-500" />
            <span>{DISCIPLINE_LABELS[tr.discipline as Discipline] ?? tr.discipline}</span>
          </div>
          <div className="flex items-center gap-3 text-forest-700 dark:text-forest-200">
            <Users size={18} className="text-copper-500" />
            <span>{BOW_LABELS[tr.bow_type as BowType] ?? tr.bow_type}</span>
          </div>
          {tr.location && (
            <div className="text-sm text-forest-600 dark:text-forest-400 pt-2 border-t border-forest-100 dark:border-forest-800">
              📍 {tr.location}
            </div>
          )}
        </div>

        {!user && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-forest-700 dark:text-forest-200 mb-1">
              Dein Anzeigename
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Klaus"
              maxLength={60}
              autoFocus
              className="input w-full"
            />
            <p className="text-xs text-forest-600 dark:text-forest-400 mt-1">
              Du wirst als Gast beigetreten — kein Passwort nötig.
            </p>
          </div>
        )}

        {user && (
          <p className="text-sm text-forest-700 dark:text-forest-300 mt-6 text-center">
            Angemeldet als <strong>{user.display_name || user.email}</strong>
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining || (!user && name.trim().length === 0)}
          className="btn w-full mt-6 text-lg disabled:opacity-50"
        >
          {joining ? "Trete bei…" : "Beitreten"}
        </button>
      </div>
    </div>
  );
}
