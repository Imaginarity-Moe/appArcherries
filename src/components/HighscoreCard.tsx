import { useEffect, useState } from "react";
import { Trophy, Medal, Globe, Users, Calendar, Building2 } from "lucide-react";
import { listHighscores, type HighscoreGroup, type HighscorePeriod, type HighscoreScope } from "../api/highscore";
import { listMyClubs, type Club } from "../api/clubs";
import { BOW_LABELS, DISCIPLINE_LABELS } from "../api/trainings";
import Avatar from "./Avatar";
import { Spinner } from "./Spinner";

type Props = {
  parcoursId: number;
};

type Tab = "global" | "friends" | "club";

/**
 * Top-3 Scores pro (Disziplin, Bow-Type) für einen Parcours.
 * Tabs: Global (alle) / Freunde (akzeptierte Freunde + ich) / Verein (Mitglieder).
 * Period-Pill: Monat / Jahr / Alle.
 */
export default function HighscoreCard({ parcoursId }: Props) {
  const [tab, setTab] = useState<Tab>("global");
  const [period, setPeriod] = useState<HighscorePeriod>("all");
  const [groups, setGroups] = useState<HighscoreGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Verein-State: nur laden wenn relevant, einmal beim Mount
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  useEffect(() => {
    listMyClubs()
      .then((r) => {
        setMyClubs(r.clubs);
        if (r.clubs.length > 0 && selectedClubId === null) {
          setSelectedClubId(r.clubs[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "club" && selectedClubId === null) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const scope: HighscoreScope =
      tab === "friends" ? { kind: "friends" }
      : tab === "club" && selectedClubId !== null ? { kind: "club", club_id: selectedClubId }
      : { kind: "global" };
    listHighscores(parcoursId, scope, period)
      .then((r) => setGroups(r.groups))
      .finally(() => setLoading(false));
  }, [parcoursId, tab, period, selectedClubId]);

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="eyebrow flex items-center gap-2">
          <Trophy size={14} strokeWidth={1.75} /> Highscore
        </h2>
        <div className="inline-flex items-center gap-0.5 rounded-full bg-surface p-0.5">
          <TabBtn active={tab === "global"} onClick={() => setTab("global")}>
            <Globe size={12} strokeWidth={1.75} /> Global
          </TabBtn>
          <TabBtn active={tab === "friends"} onClick={() => setTab("friends")}>
            <Users size={12} strokeWidth={1.75} /> Freunde
          </TabBtn>
          {myClubs.length > 0 && (
            <TabBtn active={tab === "club"} onClick={() => setTab("club")}>
              <Building2 size={12} strokeWidth={1.75} /> Verein
            </TabBtn>
          )}
        </div>
      </div>

      {/* Verein-Switcher: nur wenn Tab=club UND mehr als 1 Verein */}
      {tab === "club" && myClubs.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {myClubs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClubId(c.id)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                selectedClubId === c.id
                  ? "bg-cherry-100 text-cherry-700 dark:bg-cherry-900/40 dark:text-cherry-200 border border-cherry-300 dark:border-cherry-700"
                  : "bg-surface text-secondary border border-hairline hover:text-primary"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar size={12} strokeWidth={1.75} className="text-muted shrink-0" />
        <PeriodBtn active={period === "month"} onClick={() => setPeriod("month")}>30 Tage</PeriodBtn>
        <PeriodBtn active={period === "year"} onClick={() => setPeriod("year")}>365 Tage</PeriodBtn>
        <PeriodBtn active={period === "all"} onClick={() => setPeriod("all")}>Alle</PeriodBtn>
      </div>

      {loading && <Spinner />}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-muted">
          {tab === "friends" && "Keine Freundes-Scores auf diesem Parcours. Lade Freunde ein oder schalte auf Global."}
          {tab === "club" && 'Noch keine Vereins-Scores auf diesem Parcours. Mitglieder müssen ein Training mit „in Highscore aufnehmen" abschließen.'}
          {tab === "global" && period === "month" && 'Keine Scores in den letzten 30 Tagen. Schalte oben auf „Alle", um die Allzeit-Liste zu sehen.'}
          {tab === "global" && period === "year"  && 'Keine Scores im letzten Jahr. Schalte oben auf „Alle", um die Allzeit-Liste zu sehen.'}
          {tab === "global" && period === "all"   && 'Noch keine veröffentlichten Scores. Beende ein Training und tippe „in Highscore aufnehmen".'}
        </p>
      )}
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

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active ? "bg-cherry-500 text-cream" : "text-secondary hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function PeriodBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
        active
          ? "bg-cherry-100 text-cherry-700 dark:bg-cherry-900/40 dark:text-cherry-200 border border-cherry-300 dark:border-cherry-700"
          : "bg-surface text-secondary border border-hairline hover:text-primary"
      }`}
    >
      {children}
    </button>
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
