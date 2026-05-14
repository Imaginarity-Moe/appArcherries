import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { getStatsOverview, type StatsOverview } from "../api/stats";
import { ScoreLineChart, ZoneDistributionBars, ArrowConsistencyBars } from "../components/charts";
import { BOW_LABELS, DISCIPLINE_LABELS, type BowType, type Discipline } from "../api/trainings";
import { fmtDate } from "../lib/format";

const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const BOWS = Object.keys(BOW_LABELS) as BowType[];

export default function Stats() {
  const { t } = useTranslation(["stats", "common"]);
  const [data, setData] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [discFilter, setDiscFilter] = useState<Discipline | "">("");
  const [bowFilter, setBowFilter] = useState<BowType | "">("");

  useEffect(() => {
    setLoading(true);
    getStatsOverview({
      discipline: discFilter || undefined,
      bow: bowFilter || undefined,
    })
      .then(setData)
      .finally(() => setLoading(false));
  }, [discFilter, bowFilter]);

  const trendForChart = useMemo(() => {
    return (data?.trend ?? []).map((d) => ({
      label: fmtDate(d.date),
      score: d.score,
    }));
  }, [data]);

  const hasData = data && data.trend.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="font-display text-2xl font-semibold">{t("stats:title")}</h1>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label={t("stats:filters.all")}
          active={discFilter === ""}
          onClick={() => setDiscFilter("")}
        />
        {DISCIPLINES.map((d) => (
          <FilterChip
            key={d}
            label={DISCIPLINE_LABELS[d]}
            active={discFilter === d}
            onClick={() => setDiscFilter(discFilter === d ? "" : d)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {BOWS.map((b) => (
          <FilterChip
            key={b}
            label={BOW_LABELS[b]}
            active={bowFilter === b}
            onClick={() => setBowFilter(bowFilter === b ? "" : b)}
          />
        ))}
      </div>

      {loading && <p className="text-forest-700">{t("common:actions.loading")}</p>}

      {!loading && !hasData && (
        <div className="card text-center py-10">
          <p className="text-forest-700">{t("stats:no_data")}</p>
        </div>
      )}

      {hasData && (
        <>
          <section className="card">
            <h2 className="font-display text-lg font-semibold mb-3">{t("stats:score_trend")}</h2>
            <ScoreLineChart data={trendForChart} />
          </section>

          {data!.personal_bests.length > 0 && (
            <section className="card">
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy size={18} className="text-cherry-500" />
                {t("stats:personal_bests")}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {data!.personal_bests.map((pb, i) => (
                  <div key={i} className="shrink-0 min-w-[160px] card-sunken">
                    <div className="text-xs text-secondary">
                      {DISCIPLINE_LABELS[pb.discipline as Discipline] ?? pb.discipline}
                    </div>
                    <div className="text-sm font-semibold mb-2">
                      {BOW_LABELS[pb.bow_type as BowType] ?? pb.bow_type}
                    </div>
                    <div className="score text-score-md">{pb.best}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data!.personal_bests_parcours && data!.personal_bests_parcours.length > 0 && (
            <section className="card">
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <Trophy size={18} className="text-cherry-500" />
                Bestleistungen pro Parcours
              </h2>
              <ul className="divide-y divide-hairline">
                {data!.personal_bests_parcours.map((pb, i) => (
                  <li key={i} className="flex items-center gap-3 py-2">
                    <a
                      href={`/parcours/${pb.parcours_id}`}
                      className="font-semibold text-sm flex-1 min-w-0 truncate text-primary hover:text-cherry-500"
                    >
                      {pb.parcours_name ?? `Parcours #${pb.parcours_id}`}
                    </a>
                    <span className="text-xs text-muted shrink-0">
                      {DISCIPLINE_LABELS[pb.discipline as Discipline] ?? pb.discipline} ·{" "}
                      {BOW_LABELS[pb.bow_type as BowType] ?? pb.bow_type}
                    </span>
                    <span className="score text-base tabular-nums shrink-0 w-12 text-right">{pb.best}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data!.zone_distribution.length > 0 && (
            <section className="card">
              <h2 className="font-display text-lg font-semibold mb-3">{t("stats:zone_distribution")}</h2>
              <ZoneDistributionBars data={data!.zone_distribution} />
            </section>
          )}

          {data!.arrow_consistency.length > 0 && (
            <section className="card">
              <h2 className="font-display text-lg font-semibold mb-3">{t("stats:arrow_consistency")}</h2>
              <ArrowConsistencyBars
                data={data!.arrow_consistency.map((a) => ({
                  arrow: `${t("common:shot")} ${a.arrow_seq}`,
                  avg: a.avg,
                }))}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition active:scale-95 ${
        active ? "bg-copper-500 text-white" : "hover:bg-forest-200"
      }`}
    >
      {label}
    </button>
  );
}
