import { useEffect, useState } from "react";
import { X, UserPlus, Check, Loader2 } from "lucide-react";
import { listFriends, type Friendship } from "../api/friends";
import { addFriendToTraining } from "../api/invitations";
import Avatar from "./Avatar";

/**
 * Friend-Picker für 1-Tap-Add zu Training.
 * Listet akzeptierte Freunde; bereits anwesende sind disabled mit ✓.
 */
export default function AddFriendModal({
  trainingId,
  existingUserIds,
  onClose,
  onAdded,
}: {
  trainingId: number;
  existingUserIds: number[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFriends()
      .then((r) => setFriends(r.friends))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add(f: Friendship) {
    setBusyId(f.user.id);
    setError(null);
    try {
      await addFriendToTraining(trainingId, f.user.id);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hinzufügen fehlgeschlagen");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div
        className="card bg-elevated w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-3">
          <h2 className="display text-h3 flex items-center gap-2">
            <UserPlus size={20} strokeWidth={1.75} /> Freund hinzufügen
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Schließen">
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>

        {loading ? (
          <div className="py-8 text-center text-secondary text-sm">Lade Freunde …</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-secondary text-sm">
            Noch keine Freunde — füge erst welche im Profil hinzu.
          </div>
        ) : (
          <ul className="space-y-2 overflow-y-auto flex-1">
            {friends.map((f) => {
              const already = existingUserIds.includes(f.user.id);
              const busy = busyId === f.user.id;
              return (
                <li key={f.id} className="flex items-center gap-3 p-2 rounded-xl bg-surface">
                  <Avatar user={{ avatar_url: f.user.avatar_url ?? null, display_name: f.user.display_name }} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.user.display_name ?? f.user.email}</div>
                    <div className="text-xs text-muted truncate">{f.user.email}</div>
                  </div>
                  {already ? (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <Check size={14} strokeWidth={2} /> dabei
                    </span>
                  ) : (
                    <button
                      onClick={() => add(f)}
                      disabled={busy}
                      className="btn-accent text-sm py-1.5 px-3"
                      aria-label="Hinzufügen"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} strokeWidth={2} />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <div className="mt-3 text-sm text-cherry-500">{error}</div>}
      </div>
    </div>
  );
}
