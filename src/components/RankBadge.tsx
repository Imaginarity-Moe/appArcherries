import { Medal } from "lucide-react";

/**
 * Rang-Anzeige für Top-Listen (Top-3 mit Gold/Silber/Bronze, ab 4 dezenter).
 *
 * - Rang 1: Gold-Background + Medal-Icon (Wettkampf-Feeling)
 * - Rang 2: Silber (stone-300)
 * - Rang 3: Bronze (amber-700)
 * - Rang 4+: dezenter surface-Ton mit Nummer
 *
 * Genutzt in HighscoreCard und ClubDetail::ClubStatsSection — single source
 * of truth, damit die Optik konsistent bleibt.
 */
export function RankBadge({ rank, size = "md" }: { rank: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs";
  const iconSize = size === "sm" ? 11 : 14;
  const tone =
    rank === 1 ? "bg-gold text-warm-black"
    : rank === 2 ? "bg-stone-300 text-warm-black"
    : rank === 3 ? "bg-amber-700 text-cream"
    : "bg-surface text-secondary";
  return (
    <div className={`${dim} shrink-0 rounded-full flex items-center justify-center font-bold tabular-nums ${tone}`}>
      {rank === 1 ? <Medal size={iconSize} strokeWidth={2} aria-hidden /> : rank}
    </div>
  );
}
