import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, UserPlus, Check, X, Ban, Trash2, Mail, Users } from "lucide-react";
import {
  listFriends,
  sendFriendRequest,
  respondFriendRequest,
  removeFriendship,
  type Friendship,
  type FriendsState,
} from "../api/friends";
import Avatar from "../components/Avatar";
import { useConfirm } from "../components/ConfirmDialog";
import { usePageFooter } from "../components/FooterContext";

export default function Friends() {
  const confirm = useConfirm();
  const [state, setState] = useState<FriendsState>({ friends: [], incoming: [], outgoing: [], blocked: [] });
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    listFriends()
      .then(setState)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: "/profile", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
    ],
    []
  );
  usePageFooter(footerActions);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const next = await sendFriendRequest(email.trim());
      setState(next);
      setEmail("");
      setInfo("Anfrage gesendet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function respond(id: number, action: "accept" | "reject" | "block") {
    setBusy(true);
    try {
      setState(await respondFriendRequest(id, action));
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: Friendship, label: string) {
    const want = await confirm({ title: label, message: `Wirklich ${label.toLowerCase()}?`, confirmLabel: label, variant: "danger" });
    if (!want) return;
    setBusy(true);
    try {
      setState(await removeFriendship(f.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <header>
        <h1 className="display text-h1 flex items-center gap-2">
          <Users size={24} strokeWidth={1.75} /> Freunde
        </h1>
        <p className="text-secondary text-sm mt-1">
          Schließe Freundschaften per E-Mail-Anfrage. Geräteübergreifend gespeichert.
        </p>
      </header>

      {/* Eingehende Anfragen — oben weil action-required */}
      {state.incoming.length > 0 && (
        <section className="card">
          <h2 className="eyebrow mb-3">Anfragen an dich ({state.incoming.length})</h2>
          <ul className="space-y-2.5">
            {state.incoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3">
                <Avatar user={{ avatar_url: f.user.avatar_url ?? null, display_name: f.user.display_name }} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.user.display_name ?? f.user.email}</div>
                  <div className="text-xs text-muted truncate">{f.user.email}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => respond(f.id, "accept")} disabled={busy} className="btn-icon text-cherry-500" aria-label="Annehmen">
                    <Check size={18} strokeWidth={2} />
                  </button>
                  <button onClick={() => respond(f.id, "reject")} disabled={busy} className="btn-icon" aria-label="Ablehnen">
                    <X size={18} strokeWidth={2} />
                  </button>
                  <button onClick={() => respond(f.id, "block")} disabled={busy} className="btn-icon text-muted" aria-label="Blockieren">
                    <Ban size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Freund hinzufügen */}
      <section className="card space-y-3">
        <h2 className="eyebrow flex items-center gap-1.5">
          <UserPlus size={13} strokeWidth={1.75} /> Freund hinzufügen
        </h2>
        <form onSubmit={onSubmit} className="space-y-2">
          <div className="relative">
            <Mail size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="input pl-10"
              placeholder="freund@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-cherry-500">{error}</div>}
          {info && <div className="text-sm text-secondary">{info}</div>}
          <button type="submit" disabled={busy || !email.trim()} className="btn-accent w-full">
            <UserPlus size={15} strokeWidth={2} /> Anfrage senden
          </button>
        </form>
      </section>

      {/* Freunde */}
      {state.friends.length > 0 ? (
        <section className="card">
          <h2 className="eyebrow mb-3">Meine Freunde ({state.friends.length})</h2>
          <ul className="space-y-2.5">
            {state.friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3">
                <Avatar user={{ avatar_url: f.user.avatar_url ?? null, display_name: f.user.display_name }} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.user.display_name ?? f.user.email}</div>
                  <div className="text-xs text-muted truncate">{f.user.email}</div>
                </div>
                <button onClick={() => remove(f, "Entfernen")} disabled={busy} className="btn-icon text-muted" aria-label="Freund entfernen">
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        !loading && state.incoming.length === 0 && state.outgoing.length === 0 && (
          <section className="card text-center py-6 text-sm text-secondary">
            Noch keine Freunde. Sende deine erste Anfrage oben.
          </section>
        )
      )}

      {/* Eigene ausstehende Anfragen */}
      {state.outgoing.length > 0 && (
        <section className="card">
          <h2 className="eyebrow mb-3">Ausstehende Anfragen von dir ({state.outgoing.length})</h2>
          <ul className="space-y-2.5">
            {state.outgoing.map((f) => (
              <li key={f.id} className="flex items-center gap-3">
                <Avatar user={{ avatar_url: f.user.avatar_url ?? null, display_name: f.user.display_name }} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.user.display_name ?? f.user.email}</div>
                  <div className="text-xs text-muted truncate">wartet auf Bestätigung</div>
                </div>
                <button onClick={() => remove(f, "Zurückziehen")} disabled={busy} className="btn-icon text-muted" aria-label="Anfrage zurückziehen">
                  <X size={16} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Blockierte */}
      {state.blocked.length > 0 && (
        <section className="card">
          <h2 className="eyebrow mb-3 text-muted">Blockiert ({state.blocked.length})</h2>
          <ul className="space-y-2.5">
            {state.blocked.map((f) => (
              <li key={f.id} className="flex items-center gap-3 opacity-70">
                <Avatar user={{ avatar_url: f.user.avatar_url ?? null, display_name: f.user.display_name }} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.user.display_name ?? f.user.email}</div>
                  <div className="text-xs text-muted truncate">{f.user.email}</div>
                </div>
                <button onClick={() => remove(f, "Aufheben")} disabled={busy} className="btn-icon text-muted" aria-label="Blockierung aufheben">
                  <Check size={15} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
