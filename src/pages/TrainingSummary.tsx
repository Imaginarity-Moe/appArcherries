import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3, Plus, Trophy } from "lucide-react";
import { getTrainingStats, type TrainingStats } from "../api/stats";
import { StationSparkline, ZoneDistributionBars, ArrowConsistencyBars } from "../components/charts";
import { BOW_LABELS, DISCIPLINE_LABELS, getTraining, updateTraining, type BowType, type Discipline, type Training } from "../api/trainings";
import { fmtDate } from "../lib/format";
import { usePageFooter } from "../components/FooterContext";
import { PageSpinner, Spinner } from "../components/Spinner";

const Heatmap = lazy(() => import("../components/Heatmap"));

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

  async function setMood(mood: string | null) {
    if (!training) return;
    try {
      const r = await updateTraining(training.id, { mood } as Partial<Training>);
      setTraining(r.training);
    } catch { /* silent */ }
  }

  if (loading || !data) return <PageSpinner />;

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

      {/* Stimmungs-Tagebuch — wie hat sich's angefühlt? */}
      {training && <MoodPicker mood={training.mood ?? null} onChange={setMood} />}

      {/* Notizen-Editor mit Auto-Save */}
      {training && (
        <NotesEditor
          initial={training.notes ?? ""}
          onSave={async (notes) => {
            const r = await updateTraining(training.id, { notes });
            setTraining(r.training);
          }}
        />
      )}

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
            {data.training.discipline === "target_practice" ? "Aufnahmen-Verlauf" : "Stations-Verlauf"}
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

      {/* Treffer-Heatmap aller Teilnehmer (nur bei target_practice mit
          x/y-Koordinaten und ≥1 Treffer) */}
      {training && training.discipline === "target_practice" && (
        <ParticipantsHeatmap training={training} />
      )}

      {/* Pad-Heatmap für 3D + Feldbogen (nutzt pad_x/pad_y aus BullseyePad) */}
      {training && training.discipline !== "target_practice" && training.discipline !== "simple" && (
        <ParticipantsPadHeatmap training={training} />
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

/**
 * Statische Heatmap: alle Pfeile aller Participants als farbcodierte Punkte
 * auf einem WA-Auflage-SVG. Pro Spieler eine Farbe + Legende.
 */
const HEATMAP_COLORS = ["#C0464F", "#3F6D5E", "#3FA6C9", "#D4A547", "#7A5C8A", "#A85A47"];
const HEATMAP_RING_COLORS = ["#D4A547", "#C0464F", "#3FA6C9", "#1F1F1F", "#F5F2EB"];
// ─── Notes-Editor mit Debounce-Auto-Save ───────────────────────────────────

function NotesEditor({ initial, onSave }: { initial: string; onSave: (notes: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSaved = useRef(initial);
  const pendingValue = useRef(initial);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  // Externes initial-Update synchronisieren (Training-Refresh nach Mood-Change etc.)
  useEffect(() => {
    setValue(initial);
    lastSaved.current = initial;
    pendingValue.current = initial;
  }, [initial]);

  // Save-Aufruf zentral, damit flush-on-unmount und Debounce dieselbe Logik nutzen.
  // `flushedValue` ist die Momentaufnahme zum Zeitpunkt des Aufrufs — wichtig, weil
  // der State zwischen Timer-Fire und await sich noch ändern kann.
  const triggerSave = useCallback(
    async (flushedValue: string) => {
      if (savingRef.current) return; // schon ein Save in flight, lassen wir den durchlaufen
      if (flushedValue === lastSaved.current) return;
      savingRef.current = true;
      setStatus("saving");
      try {
        await onSave(flushedValue);
        lastSaved.current = flushedValue;
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [onSave]
  );

  useEffect(() => {
    pendingValue.current = value;
    if (value === lastSaved.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => triggerSave(value), 800);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [value, triggerSave]);

  // Beim Unmount: wenn noch ungespeicherte Änderungen offen sind, sofort flush.
  // Verhindert verlorenen Text bei schneller Navigation (User tippt + tap Zurück).
  // Wir nutzen sendBeacon-mäßig die normale Save-Funktion — die Outbox fängt
  // Netzwerk-Fails ab, daher wartet die Promise hier nicht.
  useEffect(() => {
    return () => {
      if (pendingValue.current !== lastSaved.current) {
        // fire-and-forget — wir können nicht awaiten beim Unmount.
        // onSave schreibt in die Outbox, falls offline.
        void triggerSave(pendingValue.current);
      }
    };
  }, [triggerSave]);

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="eyebrow">Notizen</h2>
        <span
          className={`text-xs transition ${
            status === "saving" ? "text-secondary" :
            status === "saved"  ? "text-emerald-600 dark:text-emerald-300" :
            status === "error"  ? "text-cherry-500" :
            "text-muted opacity-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {status === "saving" && "Speichern…"}
          {status === "saved"  && "✓ Gespeichert"}
          {status === "error"  && "Speichern fehlgeschlagen"}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="input text-base min-h-32"
        placeholder="Was ist dir aufgefallen? Anker-Drift, Wind, Form-Insights, Pfeil-Wahl …"
      />
      <p className="text-xs text-muted mt-1.5">
        Automatisches Speichern nach kurzer Pause. Sichtbar nur für dich.
      </p>
    </section>
  );
}

// ─── Mood-Picker (Trainings-Tagebuch) ──────────────────────────────────────

// Kurze Labels — 5er-Grid auf 390px iPhone gibt ~70 px pro Zelle. Längere
// Wörter wie „Top-Lauf"/„Frustriert" wrappen sonst auf zwei Zeilen.
const MOOD_OPTIONS: { key: string; emoji: string; label: string }[] = [
  { key: "great",      emoji: "🤩", label: "Spitze" },
  { key: "good",       emoji: "😊", label: "Gut" },
  { key: "neutral",    emoji: "😐", label: "Mittel" },
  { key: "tired",      emoji: "😴", label: "Müde" },
  { key: "frustrated", emoji: "😤", label: "Frust" },
];

function MoodPicker({ mood, onChange }: { mood: string | null; onChange: (m: string | null) => void }) {
  return (
    <section className="card">
      <h2 className="eyebrow mb-2">Wie war's?</h2>
      <p className="text-sm text-secondary mb-3">
        Deine Stimmung zum Training — optional, nur für dein Tagebuch.
      </p>
      <div className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((opt) => {
          const active = mood === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(active ? null : opt.key)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition active:scale-[0.96] ${
                active
                  ? "border-cherry-500 bg-cherry-50 dark:bg-cherry-900/20"
                  : "border-hairline bg-surface hover:border-hairline-strong"
              }`}
              title={opt.label}
              aria-pressed={active}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className={`text-xs ${active ? "text-cherry-600 dark:text-cherry-200 font-semibold" : "text-secondary"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ParticipantsHeatmap({ training }: { training: Training }) {
  const rings = training.target_rings ?? 10;
  const participants = (training.participants ?? []).filter((p) => p.role !== "viewer");
  const points: Array<{ x: number; y: number; color: string; player: string }> = [];
  const totalsByPlayer = new Map<number, { total: number; count: number; color: string; name: string }>();
  participants.forEach((p, idx) => {
    const color = HEATMAP_COLORS[idx % HEATMAP_COLORS.length];
    const name = p.is_self ? "Du" : (p.display_name ?? "—");
    let total = 0, count = 0;
    (training.targets ?? [])
      .filter((t) => t.participant_id === p.id)
      .forEach((t) => {
        t.shots.forEach((sh) => {
          if (sh.x_norm == null || sh.y_norm == null) return;
          points.push({ x: sh.x_norm, y: sh.y_norm, color, player: name });
          total += sh.points ?? 0;
          count++;
        });
      });
    if (count > 0) totalsByPlayer.set(p.id, { total, count, color, name });
  });
  if (points.length === 0) return null;

  // SVG-Geometrie (viewBox 0..100, dieselbe wie TargetPad)
  const VB = 100;
  const CX = 50;
  const CY = 50;
  const OUTER_R = 47;
  const ringWidth = OUTER_R / rings;

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold mb-3">Treffer-Heatmap (alle Spieler)</h2>
      <div className="w-full max-w-md mx-auto">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="block w-full h-auto bg-surface rounded-xl">
          <rect x="0" y="0" width={VB} height={VB} fill="rgba(0,0,0,0.04)" />
          {Array.from({ length: rings }, (_, i) => {
            const r = OUTER_R - i * ringWidth;
            const ringIdxFromCenter = rings - 1 - i;
            const pairIdx = Math.floor(ringIdxFromCenter / 2);
            const fill = HEATMAP_RING_COLORS[Math.min(pairIdx, HEATMAP_RING_COLORS.length - 1)];
            const isDark = fill === "#1F1F1F" || fill === "#C0464F";
            return (
              <circle key={i} cx={CX} cy={CY} r={r} fill={fill}
                      stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"} strokeWidth={0.2} />
            );
          })}
          {points.map((pt, i) => (
            <circle key={i} cx={pt.x * VB} cy={pt.y * VB} r={1.6}
                    fill={pt.color} fillOpacity={0.75} stroke="white" strokeWidth={0.3} />
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 justify-center text-xs">
        {Array.from(totalsByPlayer.values()).map((row, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
            <span className="font-medium">{row.name}</span>
            <span className="text-muted">· {row.count} Pfeile · {row.total} Pkt</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Pad-Heatmap des aktuellen Trainings für 3D + Feldbogen.
 * Aggregiert alle pad_x/pad_y aller scoring-Participants über alle Stationen,
 * farbcodiert pro Spieler. Bei Solo-Trainings: 1 Farbe, Legende ausgeblendet.
 */
function ParticipantsPadHeatmap({ training }: { training: Training }) {
  const { points, legend } = useMemo(() => {
    const participants = (training.participants ?? []).filter((p) => p.role !== "viewer");
    // Fallback (z.B. Trainings ohne participants-Field): nur eigener Spieler
    const effective = participants.length > 0 ? participants : null;
    const pts: Array<{ pad_x: number; pad_y: number; zone: string | null; points: number; color: string }> = [];
    const totals = new Map<number, { count: number; total: number; color: string; name: string }>();

    if (effective) {
      effective.forEach((p, idx) => {
        const color = HEATMAP_COLORS[idx % HEATMAP_COLORS.length];
        const name = p.is_self ? "Du" : (p.display_name ?? "—");
        let count = 0, total = 0;
        for (const tg of training.targets ?? []) {
          if (tg.participant_id !== p.id) continue;
          for (const sh of tg.shots) {
            if (sh.pad_x == null || sh.pad_y == null) continue;
            pts.push({
              pad_x: sh.pad_x,
              pad_y: sh.pad_y,
              zone: sh.zone,
              points: sh.points ?? 0,
              color,
            });
            count++;
            total += sh.points ?? 0;
          }
        }
        if (count > 0) totals.set(p.id, { count, total, color, name });
      });
    } else {
      // Kein Participants-Field → alle pad-Treffer mit Default-Farbe rendern
      for (const tg of training.targets ?? []) {
        for (const sh of tg.shots) {
          if (sh.pad_x == null || sh.pad_y == null) continue;
          pts.push({
            pad_x: sh.pad_x,
            pad_y: sh.pad_y,
            zone: sh.zone,
            points: sh.points ?? 0,
            color: HEATMAP_COLORS[0],
          });
        }
      }
    }

    return { points: pts, legend: Array.from(totals.values()) };
  }, [training]);

  if (points.length === 0) return null;

  const showLegend = legend.length >= 2;
  const heading = showLegend ? "Treffer-Heatmap (alle Spieler)" : "Treffer-Heatmap";

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold mb-3">{heading}</h2>
      <div className="mx-auto" style={{ maxWidth: 360 }}>
        <Suspense fallback={<Spinner className="py-2" />}>
          <Heatmap discipline={training.discipline} points={points} size={360} />
        </Suspense>
      </div>
      {showLegend ? (
        <div className="flex flex-wrap gap-2 mt-3 justify-center text-xs">
          {legend.map((row, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
              <span className="font-medium">{row.name}</span>
              <span className="text-muted">· {row.count} Pfeile · {row.total} Pkt</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted text-center mt-2">{points.length} Pfeile in diesem Training</p>
      )}
    </div>
  );
}
