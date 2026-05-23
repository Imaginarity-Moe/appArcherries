import { UserPlus, Crown, Users } from "lucide-react";
import type { Participant } from "../api/trainings";
import Avatar from "./Avatar";

type Props = {
  participants: Participant[];
  isOwner: boolean;
  /** Optional: per QR/Token einladen. Bei undefined wird der QR-Button ausgeblendet (z.B. Training beendet). */
  onInvite?: () => void;
  /** Optional: Freund 1-Tap-Hinzufügen. Wenn weggelassen, wird der Button ausgeblendet. */
  onAddFriend?: () => void;
  /** True wenn das Training mehr als einen Teilnehmer hat → Live-Indikator zeigen */
  isLive?: boolean;
  /** True während ein Refresh läuft (kurzer Puls) */
  isPolling?: boolean;
};

/**
 * Horizontale Liste aller Participants mit Total-Score.
 * Owner sieht einen "+ Einladen"-Button am Ende.
 * Nur sichtbar wenn mind. 2 Participants ODER User ist Owner.
 */
export default function ParticipantsBar({ participants, isOwner, onInvite, onAddFriend, isLive, isPolling }: Props) {
  const showInvite = isOwner && !!onInvite;
  const showAddFriend = isOwner && !!onAddFriend;
  if (participants.length <= 1 && !showInvite && !showAddFriend) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto -mx-2 px-2 py-2">
      {isLive && (
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-forest-700 dark:text-forest-300 font-bold">
          <span className={`w-1.5 h-1.5 rounded-full bg-forest-500 ${isPolling ? "animate-pulse" : ""}`} />
          Live
        </span>
      )}
      {participants.map((p) => (
        <div
          key={p.id}
          className={`flex-shrink-0 flex items-center gap-2 rounded-full pl-1 pr-3 py-1 ${
            p.is_self
              ? "bg-cherry-500 text-cream"
              : "bg-surface text-secondary border border-hairline"
          }`}
        >
          <Avatar user={{ display_name: p.display_name, avatar_url: p.avatar_url ?? null, last_seen_at: p.last_seen_at ?? null }} size="xs" showPresence={!p.is_self} />
          {p.role === "owner" && <Crown size={11} strokeWidth={1.75} className={p.is_self ? "text-cream" : "text-cherry-500"} />}
          <span className="text-xs font-medium truncate max-w-[80px]">
            {p.display_name || "—"}
            {p.user_role === "guest" && " · Gast"}
          </span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${p.is_self ? "text-cream" : "text-cherry-500"}`}>
            {p.total_score}
          </span>
        </div>
      ))}
      {showAddFriend && (
        <button
          onClick={onAddFriend}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 bg-cherry-500 text-cream text-sm font-medium hover:bg-cherry-600"
          aria-label="Freund hinzufügen"
        >
          <Users size={14} /> Freund
        </button>
      )}
      {showInvite && (
        <button
          onClick={onInvite}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 border border-dashed border-hairline text-secondary hover:bg-surface text-sm font-medium"
          aria-label="Per QR-Code einladen"
        >
          <UserPlus size={14} /> QR
        </button>
      )}
    </div>
  );
}
