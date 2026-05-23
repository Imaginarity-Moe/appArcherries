import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Check, Target, TrendingUp } from "lucide-react";

/**
 * Distanzschätz-Training: Die App nennt eine Distanz (z.B. „24 m"), der
 * User schätzt, wie weit das für ihn aussieht. App speichert die Abweichung
 * pro Versuch lokal (localStorage) — daraus entstehen persönliche Stats.
 *
 * Variante zwei (in V2): App zeigt ein Foto eines 3D-Tiers und der User
 * schätzt — derzeit aber keine Foto-Datenbank mit echten Distanzen vorhanden.
 *
 * Min/Max-Range orientiert sich an typischen 3D-Distanzen (5–45 m).
 */

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 45;
const STORAGE_KEY = "archerries.distance_training_stats";

type Attempt = {
  target: number;
  guess: number;
  ts: number;
};

type Stats = {
  total: number;
  perfect: number;       // exakt richtig
  under_2m: number;
  under_5m: number;
  avg_abs_error_m: number;
  best_streak: number;   // längste Serie unter 2m
};

function loadAttempts(): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAttempts(attempts: Attempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-200)));
  } catch { /* localStorage full o.ä. — ignorieren */ }
}

function computeStats(attempts: Attempt[]): Stats {
  if (attempts.length === 0) {
    return { total: 0, perfect: 0, under_2m: 0, under_5m: 0, avg_abs_error_m: 0, best_streak: 0 };
  }
  let perfect = 0;
  let under_2 = 0;
  let under_5 = 0;
  let sum_err = 0;
  let streak = 0;
  let best_streak = 0;
  for (const a of attempts) {
    const err = Math.abs(a.target - a.guess);
    sum_err += err;
    if (err === 0)   perfect++;
    if (err <= 2)    under_2++;
    if (err <= 5)    under_5++;
    if (err <= 2) {
      streak++;
      if (streak > best_streak) best_streak = streak;
    } else {
      streak = 0;
    }
  }
  return {
    total: attempts.length,
    perfect,
    under_2m: under_2,
    under_5m: under_5,
    avg_abs_error_m: sum_err / attempts.length,
    best_streak,
  };
}

function pickDistance(): number {
  // Diskrete Schritte zu typischen 3D-Distanzen, gewichtet leicht zu mittleren Werten
  // (häufiger ~15-25m als sehr nah/sehr weit)
  const r = Math.random();
  // 5–45m, Schritte von 1m, leicht gauss-ähnlich um 22m
  const mean = 22;
  const variance = 11;
  let d = Math.round(mean + variance * (Math.random() + Math.random() - 1) * 2);
  if (d < MIN_DISTANCE) d = MIN_DISTANCE;
  if (d > MAX_DISTANCE) d = MAX_DISTANCE;
  if (r < 0.05) d = MIN_DISTANCE + Math.floor(Math.random() * 5); // ab und zu nahe
  if (r > 0.95) d = MAX_DISTANCE - Math.floor(Math.random() * 5); // ab und zu weit
  return d;
}

export default function DistanceTraining() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<"prompt" | "feedback">("prompt");
  const [target, setTarget] = useState(() => pickDistance());
  const [guess, setGuess] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts());

  useEffect(() => { saveAttempts(attempts); }, [attempts]);

  const stats = computeStats(attempts);

  function submitGuess(g: number) {
    setGuess(g);
    setAttempts((prev) => [...prev, { target, guess: g, ts: Date.now() }]);
    setPhase("feedback");
  }

  function nextRound() {
    setTarget(pickDistance());
    setGuess(null);
    setPhase("prompt");
  }

  function resetStats() {
    setAttempts([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const err = guess !== null ? target - guess : 0;
  const absErr = Math.abs(err);
  const feedbackTone =
    absErr === 0 ? "perfect" : absErr <= 2 ? "great" : absErr <= 5 ? "ok" : "off";

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 animate-fade-in space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(-1)} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h2 flex-1">Distanzschätz-Training</h1>
      </div>

      <p className="text-sm text-secondary">
        Auf 3D-Parcours sind Distanzen oft unmarkiert. Trainier deine Schätzung hier abstrakt —
        die App nennt eine Distanz, du sagst was sie für dich aussieht.
      </p>

      {phase === "prompt" && (
        <section className="card space-y-5">
          <div className="text-center">
            <div className="text-sm text-secondary mb-2 uppercase tracking-wider">Soll-Distanz</div>
            <div className="text-7xl font-bold tabular-nums text-cherry-500">{target} m</div>
            <p className="text-sm text-secondary mt-3 max-w-md mx-auto">
              Wie weit fühlt sich das auf einer realen Bahn an? Wähle deine Schätzung —
              du wirst sehen ob du systematisch zu kurz oder zu lang schätzt.
            </p>
          </div>

          {/* Range-Slider mit großen Tap-Buttons */}
          <DistanceSlider value={null} onSelect={(g) => submitGuess(g)} />
        </section>
      )}

      {phase === "feedback" && guess !== null && (
        <section className={`card space-y-4 ${
          feedbackTone === "perfect" ? "border-cherry-500/40 bg-cherry-50/40 dark:bg-cherry-900/20" :
          feedbackTone === "great"   ? "border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-900/20" :
          feedbackTone === "ok"      ? "border-amber-500/30 bg-amber-50/40 dark:bg-amber-900/20" :
          "border-cherry-500/30"
        }`}>
          <div className="text-center">
            {feedbackTone === "perfect" && <div className="text-5xl mb-2">🎯</div>}
            {feedbackTone === "great"   && <div className="text-5xl mb-2">✨</div>}
            {feedbackTone === "ok"      && <div className="text-5xl mb-2">👍</div>}
            {feedbackTone === "off"     && <div className="text-5xl mb-2">📏</div>}

            <p className="font-display text-2xl font-semibold">
              {feedbackTone === "perfect" && "Perfekt!"}
              {feedbackTone === "great"   && "Sehr gut!"}
              {feedbackTone === "ok"      && "Okay."}
              {feedbackTone === "off"     && "Daneben."}
            </p>
            <p className="text-secondary mt-1">
              Soll: <b>{target} m</b> · Du: <b>{guess} m</b> · Abweichung: <b className="font-mono tabular-nums">{err > 0 ? `+${err}` : err} m</b>
            </p>
            <p className="text-sm text-secondary mt-1 italic">
              {err === 0  && "Genau richtig — beeindruckend."}
              {err > 0    && err <= 5  && "Du hast zu kurz geschätzt. Auf realen Bahnen ergibt das tiefe Treffer."}
              {err > 5                 && "Deutlich zu kurz. Pfeile würden auf 3D-Tieren tief im Bauch oder Boden landen."}
              {err < 0    && err >= -5 && "Du hast zu lang geschätzt. Treffer wären hoch (Rücken / Geweih)."}
              {err < -5                && "Deutlich zu lang. Pfeile würden hoch ins Geweih / über die Scheibe gehen."}
            </p>
          </div>

          <button onClick={nextRound} className="btn-accent w-full inline-flex items-center justify-center gap-2">
            <Target size={18} strokeWidth={2} /> Nächste Distanz
          </button>
        </section>
      )}

      {/* Stats */}
      <section className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow flex items-center gap-1.5">
            <TrendingUp size={14} strokeWidth={1.75} /> Deine Schätz-Bilanz
          </h2>
          <span className="text-sm text-muted tabular-nums">{stats.total} Versuche</span>
        </div>

        {stats.total === 0 ? (
          <p className="text-sm text-secondary">
            Noch keine Versuche. Starte oben mit einer ersten Schätzung.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <StatTile label="Perfekt" value={stats.perfect} suffix={`/ ${stats.total}`} />
              <StatTile label="≤ 2 m Abw." value={stats.under_2m} suffix={`/ ${stats.total}`} />
              <StatTile label="≤ 5 m Abw." value={stats.under_5m} suffix={`/ ${stats.total}`} />
              <StatTile label="Ø Abw." value={stats.avg_abs_error_m.toFixed(1)} suffix="m" />
            </div>
            {stats.best_streak >= 3 && (
              <div className="card-sunken text-sm text-secondary mt-3">
                🔥 <b>Beste Serie:</b> {stats.best_streak} Schätzungen in Folge unter 2 m Abweichung.
              </div>
            )}
            <button
              onClick={resetStats}
              className="btn-ghost text-sm w-full mt-3 inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} strokeWidth={1.75} /> Statistik zurücksetzen
            </button>
          </>
        )}
      </section>

      <p className="text-xs text-secondary italic text-center">
        Daten werden nur lokal auf diesem Gerät gespeichert — keine Server-Übertragung.
      </p>
    </div>
  );
}

function DistanceSlider({ onSelect }: { value: number | null; onSelect: (n: number) => void }) {
  const [v, setV] = useState(22);
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-secondary mb-1 uppercase tracking-wider">Deine Schätzung</div>
        <div className="text-5xl font-bold tabular-nums">{v} m</div>
      </div>

      <input
        type="range"
        min={MIN_DISTANCE}
        max={MAX_DISTANCE}
        step={1}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="w-full accent-cherry-500"
        aria-label="Distanzschätzung"
      />
      <div className="flex justify-between text-xs text-muted px-1">
        <span>{MIN_DISTANCE} m</span>
        <span>15 m</span>
        <span>25 m</span>
        <span>35 m</span>
        <span>{MAX_DISTANCE} m</span>
      </div>

      <button onClick={() => onSelect(v)} className="btn-accent w-full inline-flex items-center justify-center gap-2">
        <Check size={18} strokeWidth={2} /> Schätzung abgeben
      </button>

      {/* Schnellauswahl-Buttons für typische Distanzen */}
      <div className="grid grid-cols-5 gap-1.5">
        {[10, 15, 20, 25, 30, 35, 40, 45, 50, 12].slice(0, 5).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className="btn-secondary text-sm py-2"
          >
            {d} m
          </button>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="card-sunken text-center py-3">
      <div className="text-xl font-bold tabular-nums">
        {value}
        {suffix && <span className="text-sm text-muted ml-0.5">{suffix}</span>}
      </div>
      <div className="text-xs text-muted uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
