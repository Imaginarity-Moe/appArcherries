import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Ruler, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getHeatmap, getStatsOverview, type HeatmapResponse, type StatsOverview } from "../api/stats";
import { ScoreLineChart, ZoneDistributionBars, ArrowConsistencyBars } from "../components/charts";
import { BOW_LABELS, DISCIPLINE_LABELS, type BowType, type Discipline } from "../api/trainings";
import { fmtDate } from "../lib/format";
import { useSyncListener } from "../lib/useSyncListener";
import { Spinner } from "../components/Spinner";

const Heatmap = lazy(() => import("../components/Heatmap"));

const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const BOWS = Object.keys(BOW_LABELS) as BowType[];

export default function Stats() {
  const { t } = useTranslation(["stats", "common"]);
  const [data, setData] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [discFilter, setDiscFilter] = useState<Discipline | "">("");
  const [bowFilter, setBowFilter] = useState<BowType | "">("");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [hmGroupBy, setHmGroupBy] = useState<"tier" | "lane">("tier");

  const loadStats = useCallback(() => {
    setLoading(true);
    getStatsOverview(
      { discipline: discFilter || undefined, bow: bowFilter || undefined },
      (fresh) => setData(fresh)
    )
      .then(setData)
      .finally(() => setLoading(false));
  }, [discFilter, bowFilter]);

  const loadHeatmap = useCallback(() => {
    getHeatmap(hmGroupBy, {
      discipline: discFilter || undefined,
      bow: bowFilter || undefined,
    })
      .then(setHeatmap)
      .catch(() => setHeatmap(null));
  }, [hmGroupBy, discFilter, bowFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  // Nach Outbox-Drain: Stats neu laden (neue Scores ggf. eingegangen)
  useSyncListener(loadStats);
  useSyncListener(loadHeatmap);

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

      {/* CTA-Banner für Distanz-Schätz-Training */}
      <Link
        to="/train/distance"
        className="card-sunken flex items-center gap-3 hover:border-cherry-500/40 transition group"
      >
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cherry-50 dark:bg-cherry-900/30 text-cherry-600 dark:text-cherry-200 shrink-0">
          <Ruler size={20} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Distanzschätz-Training</p>
          <p className="text-sm text-secondary">
            Übung für unmarkierte 3D-Parcours — App nennt eine Distanz, du schätzt, App misst die Abweichung.
          </p>
        </div>
        <ArrowRight size={16} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition shrink-0" />
      </Link>

      {loading && <Spinner className="py-2" />}

      {!loading && !hasData && (
        <div className="card text-center py-10 space-y-4">
          <div className="text-5xl">📊</div>
          <p className="font-semibold text-lg">Noch keine Statistik-Daten</p>
          <p className="text-secondary max-w-md mx-auto">
            Sobald du dein erstes Training mit der Pfeil-genauen Erfassung beendet hast, siehst du
            hier deinen Score-Verlauf, Trefferbild, Pfeil-Konsistenz und persönliche Bestleistungen.
          </p>
          <a href="/trainings/new" className="btn-accent inline-flex items-center gap-1.5">
            🎯 Erstes Training starten
          </a>
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
              <h2 className="font-display text-lg font-semibold mb-3">
                {t("stats:zone_distribution")} <span className="text-xs font-normal text-secondary">· 3D (Tier-Zonen)</span>
              </h2>
              <ZoneDistributionBars data={data!.zone_distribution} />
            </section>
          )}

          {(data!.zone_distribution_target?.length ?? 0) > 0 && (
            <section className="card">
              <h2 className="font-display text-lg font-semibold mb-3">
                {t("stats:zone_distribution")} <span className="text-xs font-normal text-secondary">· Scheibe (Ringe)</span>
              </h2>
              <ZoneDistributionBars data={data!.zone_distribution_target!} />
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

          <MoodStatsSection />


          <section className="card">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display text-lg font-semibold">Treffer-Heatmap</h2>
              <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-hairline">
                <button
                  onClick={() => setHmGroupBy("tier")}
                  className={`px-3 py-1 rounded text-xs font-medium tap-target transition ${
                    hmGroupBy === "tier" ? "bg-cherry-500 text-cream" : "text-secondary"
                  }`}
                >
                  Pro Tier+Distanz
                </button>
                <button
                  onClick={() => setHmGroupBy("lane")}
                  className={`px-3 py-1 rounded text-xs font-medium tap-target transition ${
                    hmGroupBy === "lane" ? "bg-cherry-500 text-cream" : "text-secondary"
                  }`}
                >
                  Pro Bahn
                </button>
              </div>
            </div>
            {(heatmap?.groups.length ?? 0) === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                Noch keine Heatmap-Daten. Beim Antippen eines Rings im BullseyePad wird die Trefferposition erfasst — Daten erscheinen hier ab der nächsten Station.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {heatmap!.groups.map((g) => (
                  <div key={g.key} className="card-sunken">
                    <div className="text-xs text-secondary">
                      {DISCIPLINE_LABELS[g.discipline] ?? g.discipline}
                    </div>
                    <div className="text-sm font-semibold mb-2">{g.label}</div>
                    <Suspense fallback={<Spinner className="py-2" />}>
                      <Heatmap discipline={g.discipline} points={g.points} />
                    </Suspense>
                    <div className="text-xs text-muted mt-2 text-center">{g.shot_count} Pfeile</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ─── Mood-Verlauf + Korrelation Mood↔Score ────────────────────────────────

const MOOD_DISPLAY: Record<string, { emoji: string; label: string; order: number }> = {
  great:      { emoji: "🤩", label: "Top-Lauf",   order: 1 },
  good:       { emoji: "😊", label: "Gut",        order: 2 },
  neutral:    { emoji: "😐", label: "Mittel",     order: 3 },
  tired:      { emoji: "😴", label: "Müde",       order: 4 },
  frustrated: { emoji: "😤", label: "Frustriert", order: 5 },
};

function MoodStatsSection() {
  const [data, setData] = useState<import("../api/stats").MoodStats | null>(null);

  useEffect(() => {
    import("../api/stats").then((m) => m.getMoodStats()).then(setData).catch(() => setData(null));
  }, []);

  if (!data || data.with_mood === 0) return null;

  const sortedEntries = [...data.entries].sort((a, b) => {
    return (MOOD_DISPLAY[a.mood]?.order ?? 99) - (MOOD_DISPLAY[b.mood]?.order ?? 99);
  });
  const maxCount = Math.max(...sortedEntries.map((e) => e.count), 1);
  // Avg-Score-Maximum für Score-Balken
  const maxAvg = Math.max(...sortedEntries.map((e) => e.avg_score ?? 0), 1);

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-display text-lg font-semibold">Stimmungs-Verteilung</h2>
        <span className="text-xs text-muted tabular-nums">
          {data.with_mood} von {data.total_trainings} Trainings getaggt
        </span>
      </div>
      <p className="text-sm text-secondary mb-3">
        Wie oft du jede Stimmung erlebt hast — und wie sich dein Ø-Score dazu verhält.
      </p>
      <ul className="space-y-2">
        {sortedEntries.map((e) => {
          const disp = MOOD_DISPLAY[e.mood];
          const widthCount = (e.count / maxCount) * 100;
          const widthScore = e.avg_score ? (e.avg_score / maxAvg) * 100 : 0;
          return (
            <li key={e.mood} className="flex items-center gap-3">
              <span className="text-2xl shrink-0 w-8 text-center">
                {disp?.emoji ?? "❓"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{disp?.label ?? e.mood}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {e.count}× {e.avg_score !== null && <>· Ø <b className="text-primary">{e.avg_score}</b> Pkt</>}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cherry-500/80"
                    style={{ width: `${widthCount}%` }}
                  />
                </div>
                {e.avg_score !== null && (
                  <div className="mt-1 h-1 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60"
                      style={{ width: `${widthScore}%` }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted mt-3 flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-1.5 bg-cherry-500/80 rounded-sm" /> Häufigkeit
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-1 bg-emerald-500/60 rounded-sm" /> Ø Score
        </span>
      </p>
    </section>
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
