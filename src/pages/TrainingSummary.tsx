import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3, Plus, Trophy } from "lucide-react";
import { getTrainingStats, type TrainingStats } from "../api/stats";
import { StationSparkline, ZoneDistributionBars, ArrowConsistencyBars } from "../components/charts";
import { BOW_LABELS, DISCIPLINE_LABELS, getTraining, updateTraining, type BowType, type Discipline, type Training } from "../api/trainings";
import { fmtDate } from "../lib/format";
import { usePageFooter } from "../components/FooterContext";

/**
 * End-of-Training-Auswertung. Wird nach „Training beenden" angesteuert.
 */
export default function TrainingSummary() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation(["stats", "common"]);
  const [data, setData] = useState<TrainingStats | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Footer-Actions: Zurück | Training-Details | Neues Training
  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: `/trainings/${id}`, icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Training" },
      { kind: "link" as const, to: "/stats", icon: <BarChart3 size={20} strokeWidth={1.75} />, label: "Statistik" },
      { kind: "button" as const, onClick: () => nav("/trainings/new"), icon: <Plus size={20} strokeWidth={2} />, label: "Neu", primary: true },
    ],
    [id, nav]
  );
  usePageFooter(footerActions);

  useEffect(() => {
    const tid = Number(id);
    Promise.all([getTrainingStats(tid), getTraining(tid)])
      .then(([stats, tr]) => {
        setData(stats);
        setTraining(tr.training);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function togglePublish() {
    if (!training) return;
    setPublishing(true);
    try {
      const r = await updateTraining(training.id, {
        published_to_highscore: !training.published_to_highscore,
      });
      setTraining(r.training);
    } finally {
      setPublishing(false);
    }
  }

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

      {/* Multi-Player-Vergleich: wenn ≥2 Participants gescored haben, zeige
          pro-Spieler-Karten mit Total, Avg, ggf. Legs/Sets. */}
      {data.participants && data.participants.length > 1 && (
        <section className="card space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            Vergleich
            {data.training.scoring_mode && data.training.scoring_mode !== "points" && (
              <span className="text-xs font-normal text-secondary">
                · {data.training.scoring_mode === "legs" ? "Best of Legs" : "Sets & Legs"}
              </span>
            )}
          </h2>
          <ul className="space-y-2">
            {[...data.participants]
              .sort((a, b) => {
                // Sortieren: bei legs/sets nach Legs absteigend, sonst nach Score
                const legA = data.sets_legs?.find((l) => l.participant_id === a.participant_id)?.legs_won ?? 0;
                const legB = data.sets_legs?.find((l) => l.participant_id === b.participant_id)?.legs_won ?? 0;
                if (data.training.scoring_mode === "legs" || data.training.scoring_mode === "sets") {
                  if (legA !== legB) return legB - legA;
                }
                return b.total_score - a.total_score;
              })
              .map((p, idx) => {
                const legs = data.sets_legs?.find((l) => l.participant_id === p.participant_id)?.legs_won ?? null;
                const isWinner = idx === 0;
                return (
                  <li
                    key={p.participant_id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl ${
                      isWinner ? "bg-cherry-50 dark:bg-cherry-900/20 border border-cherry-300/40" : "bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isWinner ? "bg-cherry-500 text-cream" : "bg-elevated text-secondary"}`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {p.is_self ? "Du" : p.display_name ?? "—"}
                          {p.user_role === "guest" && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted font-normal">Gast</span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {p.station_count} {p.station_count === 1 ? "Durchgang" : "Durchgänge"} · Ø {p.avg_per_station}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {legs !== null && (
                        <div className="text-sm font-mono font-bold tabular-nums text-cherry-600 dark:text-cherry-400">
                          {legs} Legs
                        </div>
                      )}
                      <div className="score text-score-md leading-none">{p.total_score}</div>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

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

      {/* Highscore-Veröffentlichung — nur für Trainings auf einem Parcours mit Score > 0 */}
      {training && training.parcours_id && data.total_score > 0 && (
        <div className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!training.published_to_highscore}
              onChange={togglePublish}
              disabled={publishing}
              className="w-5 h-5 mt-0.5 accent-cherry-500 shrink-0"
            />
            <div className="flex-1">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={1.75} /> In den öffentlichen Highscore aufnehmen
              </div>
              <div className="text-xs text-secondary mt-0.5">
                Dein Score, Anzeigename und Bogenklasse werden anderen Usern auf der Parcours-Seite
                gezeigt (Top 3 pro Disziplin × Bogen). Standort, Notizen und einzelne Pfeile
                bleiben privat. Du kannst die Veröffentlichung jederzeit zurücknehmen.
              </div>
            </div>
          </label>
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
