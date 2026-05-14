import { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import { listHighscores, type HighscoreGroup } from "../api/highscore";
import { BOW_LABELS, DISCIPLINE_LABELS } from "../api/trainings";
import Avatar from "./Avatar";

type Props = {
  parcoursId: number;
};

/**
 * Top-3 Scores pro (Disziplin, Bow-Type) für einen Parcours.
 * Nur Trainings mit published_to_highscore=1 werden gelistet.
 */
export default function HighscoreCard({ parcoursId }: Props) {
  const [groups, setGroups] = useState<HighscoreGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHighscores(parcoursId)
      .then((r) => setGroups(r.groups))
      .finally(() => setLoading(false));
  }, [parcoursId]);

  if (loading) return null;
  if (groups.length === 0) {
    return (
      <section className="card">
        <h2 className="eyebrow flex items-center gap-2 mb-2">
          <Trophy size={14} strokeWidth={1.75} /> Highscore
        </h2>
        <p className="text-sm text-muted">
          Noch keine veröffentlichten Scores. Beende ein Training auf diesem Parcours und tippe „in
          Highscore aufnehmen" auf der Auswertung.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <h2 className="eyebrow flex items-center gap-2">
        <Trophy size={14} strokeWidth={1.75} /> Highscore
      </h2>
      {groups.map((g) => (
        <div key={`${g.discipline}-${g.bow_type}`} className="space-y-2">
          <div className="text-xs text-muted">
            {DISCIPLINE_LABELS[g.discipline]} · {BOW_LABELS[g.bow_type]}
          </div>
          <ol className="space-y-1.5">
            {g.scores.map((s, i) => (
              <li key={s.training_id} className="flex items-center gap-2.5">
                <RankIcon rank={i + 1} />
                <Avatar
                  user={{ display_name: s.display_name, avatar_url: s.avatar_url }}
                  size="sm"
                />
                <span className="flex-1 min-w-0 text-sm font-medium truncate">
                  {s.display_name ?? "Anonym"}
                </span>
                <span className="score text-base tabular-nums">{s.score}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

function RankIcon({ rank }: { rank: number }) {
  const colorClass =
    rank === 1
      ? "bg-gold text-warm-black"
      : rank === 2
      ? "bg-stone-300 text-warm-black"
      : rank === 3
      ? "bg-amber-700 text-cream"
      : "bg-surface text-secondary";
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
      {rank === 1 ? <Medal size={14} strokeWidth={2} /> : rank}
    </div>
  );
}
