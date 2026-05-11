import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";
import { getTrainingStats, type TrainingStats } from "../api/stats";
import { StationSparkline, ZoneDistributionBars, ArrowConsistencyBars } from "../components/charts";
import { BOW_LABELS, DISCIPLINE_LABELS, type BowType, type Discipline } from "../api/trainings";
import { fmtDate } from "../lib/format";

/**
 * End-of-Training-Auswertung. Wird nach „Training beenden" angesteuert.
 */
export default function TrainingSummary() {
  const { id } = useParams();
  const { t } = useTranslation(["stats", "common"]);
  const [data, setData] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainingStats(Number(id))
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !data) return <p className="text-forest-700">{t("common:actions.loading")}</p>;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <Link to={`/trainings/${id}`} className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-copper-500">
        <ArrowLeft size={16} /> {t("common:actions.back")}
      </Link>

      <div className="card text-center bg-gradient-to-br from-copper-50 to-elevated dark:from-copper-700/10 dark:to-elevated-dark border-copper-300/40">
        <div className="text-sm uppercase tracking-wider text-forest-700">{t("stats:training_summary.title")}</div>
        <div className="score text-display leading-none my-3 animate-count-up">{data.total_score}</div>
        <div className="text-sm text-forest-700">
          {fmtDate(data.training.started_at)} ·{" "}
          {DISCIPLINE_LABELS[data.training.discipline as Discipline] ?? data.training.discipline} ·{" "}
          {BOW_LABELS[data.training.bow_type as BowType] ?? data.training.bow_type}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-sunken">
          <div className="text-xs text-forest-700">{t("stats:training_summary.stations")}</div>
          <div className="text-score-md font-mono tabular-nums font-bold text-forest-900 dark:text-forest-50">{data.station_count}</div>
        </div>
        <div className="card-sunken">
          <div className="text-xs text-forest-700">{t("stats:training_summary.avg_per_station")}</div>
          <div className="score text-score-md">{data.avg_per_station}</div>
        </div>
        <div className="card-sunken">
          <div className="text-xs text-forest-700">{t("stats:training_summary.best_station")}</div>
          <div className="score text-score-md">{data.best_station}</div>
        </div>
        <div className="card-sunken">
          <div className="text-xs text-forest-700">{t("stats:training_summary.worst_station")}</div>
          <div className="score text-score-md">{data.worst_station}</div>
        </div>
      </div>

      {data.stations.length > 0 && (
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-2">
            Stations-Verlauf
          </h2>
          <StationSparkline data={data.stations} />
        </div>
      )}

      {data.zone_distribution.length > 0 && (
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-3">{t("stats:training_summary.by_zone")}</h2>
          <ZoneDistributionBars data={data.zone_distribution} />
        </div>
      )}

      {data.arrow_consistency.length > 0 && (
        <div className="card">
          <h2 className="font-display text-lg font-semibold mb-3">{t("stats:training_summary.by_arrow")}</h2>
          <ArrowConsistencyBars
            data={data.arrow_consistency.map((a) => ({ arrow: `${t("common:shot")} ${a.arrow_seq}`, avg: a.avg }))}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Link to="/" className="btn-secondary flex-1 justify-center">
          {t("common:nav.home")}
        </Link>
        <Link to="/stats" className="btn flex-1 justify-center">
          <BarChart3 size={16} /> {t("common:nav.stats")}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
