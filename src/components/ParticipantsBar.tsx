import { UserPlus, Crown } from "lucide-react";
import type { Participant } from "../api/trainings";

type Props = {
  participants: Participant[];
  isOwner: boolean;
  onInvite: () => void;
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
export default function ParticipantsBar({ participants, isOwner, onInvite, isLive, isPolling }: Props) {
  const showInvite = isOwner;
  if (participants.length <= 1 && !showInvite) return null;

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
          className={`flex-shrink-0 flex items-center gap-2 rounded-2xl px-3 py-1.5 ${
            p.is_self
              ? "bg-copper-500 text-white"
              : "bg-elevated dark:bg-elevated-dark border border-forest-100 dark:border-forest-800"
          }`}
        >
          {p.role === "owner" && <Crown size={12} className={p.is_self ? "text-white" : "text-copper-500"} />}
          <span className="text-sm font-medium truncate max-w-[80px]">
            {p.display_name || "—"}
            {p.user_role === "guest" && " (Gast)"}
          </span>
          <span className={`font-mono text-sm font-bold ${p.is_self ? "text-white" : "text-copper-500"}`}>
            {p.total_score}
          </span>
        </div>
      ))}
      {showInvite && (
        <button
          onClick={onInvite}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 border border-dashed border-forest-300 dark:border-forest-700 text-forest-700 dark:text-forest-300 hover:bg-forest-50 dark:hover:bg-forest-900 text-sm font-medium"
        >
          <UserPlus size={14} /> Einladen
        </button>
      )}
    </div>
  );
}
