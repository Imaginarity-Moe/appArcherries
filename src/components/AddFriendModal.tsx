import { FormEvent, useEffect, useState } from "react";
import { X, UserPlus, Check, Loader2, UserCircle2 } from "lucide-react";
import { listFriends, type Friendship } from "../api/friends";
import { addFriendToTraining, addGuestToTraining } from "../api/invitations";
import Avatar from "./Avatar";

/**
 * Picker für 1-Tap-Add zu Training. Zwei Tabs:
 *  - Freunde: akzeptierte Freundschaften, bereits anwesende disabled mit ✓
 *  - Gast: Name eingeben, Owner scort dann für den Gast mit
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
  const [tab, setTab] = useState<"friend" | "guest">("friend");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);

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

  async function addGuest(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    setGuestBusy(true);
    setError(null);
    try {
      await addGuestToTraining(trainingId, name);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gast konnte nicht hinzugefügt werden");
    } finally {
      setGuestBusy(false);
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
            <UserPlus size={20} strokeWidth={1.75} /> Teilnehmer hinzufügen
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Schließen">
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>

        {/* Tabs Freund / Gast */}
        <div className="flex gap-1 mb-3 p-0.5 bg-surface rounded-lg">
          <button
            onClick={() => setTab("friend")}
            className={`flex-1 py-1.5 text-sm font-medium rounded ${tab === "friend" ? "bg-elevated text-primary" : "text-secondary"}`}
          >
            Freund
          </button>
          <button
            onClick={() => setTab("guest")}
            className={`flex-1 py-1.5 text-sm font-medium rounded ${tab === "guest" ? "bg-elevated text-primary" : "text-secondary"}`}
          >
            Gast (du scort)
          </button>
        </div>

        {tab === "guest" ? (
          <form onSubmit={addGuest} className="space-y-3">
            <div className="text-xs text-muted">
              Lege einen Gast-Teilnehmer an. Der Gast hat keinen Account — du scort für ihn mit.
            </div>
            <div className="relative">
              <UserCircle2 size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                autoFocus
                className="input pl-10"
                placeholder="Name des Gastes"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={80}
              />
            </div>
            {error && <div className="text-sm text-cherry-500">{error}</div>}
            <button type="submit" disabled={!guestName.trim() || guestBusy} className="btn-accent w-full">
              {guestBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} strokeWidth={2} />} Gast hinzufügen
            </button>
          </form>
        ) : loading ? (
          <div className="py-8 text-center text-secondary text-sm">Lade Freunde …</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-secondary text-sm">
            Noch keine Freunde — füge erst welche im Profil hinzu, oder nutze den Gast-Tab.
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
