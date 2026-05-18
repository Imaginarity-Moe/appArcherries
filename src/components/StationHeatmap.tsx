import { useEffect, useMemo, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import {
  getHeatmap,
  listHeatmapTargets,
  type HeatmapResponse,
  type HeatmapTarget,
} from "../api/stats";

/**
 * Aggregierte Streuungs-Heatmap pro Tier/Auflage.
 * Daten kommen aus shots.x_norm/y_norm (0..1, Tier-relativ).
 *
 * Render: SVG mit Standard-Auflagen-Ringen + Punkte je Treffer.
 * Farbe je Punkte:
 *   ≥9  → gold
 *   ≥7  → cherry
 *   ≥4  → muted orange
 *   ≥1  → grau
 *   miss/null → rot
 */
export default function StationHeatmap() {
  const [targets, setTargets] = useState<HeatmapTarget[]>([]);
  const [target, setTarget] = useState<string>("");
  const [distance, setDistance] = useState<number | "">("");
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(true);

  useEffect(() => {
    listHeatmapTargets()
      .then((r) => {
        setTargets(r.targets);
        if (r.targets.length > 0) setTarget(r.targets[0].name);
      })
      .finally(() => setLoadingTargets(false));
  }, []);

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    getHeatmap({ target, distance: distance === "" ? null : distance })
      .then(setData)
      .finally(() => setLoading(false));
  }, [target, distance]);

  // Distance-Filter zurücksetzen wenn Target wechselt
  useEffect(() => { setDistance(""); }, [target]);

  if (loadingTargets) return null;
  if (targets.length === 0) {
    return (
      <section className="card">
        <h2 className="eyebrow flex items-center gap-1.5 mb-2">
          <Flame size={13} strokeWidth={1.75} /> Treffer-Heatmap
        </h2>
        <p className="text-sm text-muted">
          Sobald du in einer Disziplin mit Klick-Pad (Field-WA / 3D-IFAA) auf einem Tier oder
          einer Auflage trifft, sammelt sich hier deine Streuung über alle Trainings.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-3">
      <h2 className="eyebrow flex items-center gap-1.5">
        <Flame size={13} strokeWidth={1.75} /> Treffer-Heatmap
      </h2>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input py-1.5 text-sm"
          aria-label="Tier oder Auflage"
        >
          {targets.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.shot_count})
            </option>
          ))}
        </select>
        {data && data.distances.length > 1 && (
          <select
            value={distance}
            onChange={(e) => setDistance(e.target.value === "" ? "" : Number(e.target.value))}
            className="input py-1.5 text-sm w-auto"
            aria-label="Distanz"
          >
            <option value="">Alle Distanzen</option>
            {data.distances.map((d) => (
              <option key={d} value={d}>{d} m</option>
            ))}
          </select>
        )}
      </div>

      <div className="text-xs text-secondary flex items-center gap-4">
        <span>{data?.total ?? 0} Pfeile</span>
        <span>Ø {data?.avg_score ?? 0} Pkt</span>
        {loading && <Loader2 size={12} className="animate-spin" />}
      </div>

      {data && data.shots.length > 0 ? (
        <HeatmapSvg shots={data.shots} />
      ) : !loading && (
        <p className="text-sm text-muted">Noch keine Pfeile mit Position für diesen Filter.</p>
      )}
    </section>
  );
}

function HeatmapSvg({ shots }: { shots: { x: number; y: number; points: number | null }[] }) {
  // SVG 200×200, target-Ringe relativ zur Mitte. x/y kommen normalisiert (0..1)
  // mit (0.5, 0.5) als Zentrum.
  const SIZE = 200;
  const CENTER = SIZE / 2;
  const rings = useMemo(() => [0.46, 0.36, 0.28, 0.2, 0.13, 0.07, 0.03], []); // 7 Ringe wie WA 40cm-Auflage

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full aspect-square max-w-md mx-auto bg-surface rounded-xl">
      <defs>
        <radialGradient id="hm-target-bg">
          <stop offset="0%" stopColor="rgb(var(--bg-elevated))" />
          <stop offset="100%" stopColor="rgb(var(--bg-surface))" />
        </radialGradient>
      </defs>
      <rect width={SIZE} height={SIZE} fill="url(#hm-target-bg)" />
      {rings.map((r, i) => (
        <circle
          key={i}
          cx={CENTER}
          cy={CENTER}
          r={r * SIZE}
          fill="none"
          stroke="rgb(var(--border-hairline) / 0.35)"
          strokeWidth={0.6}
        />
      ))}
      {/* Crosshair */}
      <line x1={CENTER} y1={0} x2={CENTER} y2={SIZE} stroke="rgb(var(--border-hairline) / 0.2)" strokeWidth={0.4} />
      <line x1={0} y1={CENTER} x2={SIZE} y2={CENTER} stroke="rgb(var(--border-hairline) / 0.2)" strokeWidth={0.4} />

      {shots.map((s, idx) => {
        const cx = s.x * SIZE;
        const cy = s.y * SIZE;
        const fill = colorForPoints(s.points);
        return (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={2.5}
            fill={fill}
            fillOpacity={0.65}
            stroke={fill}
            strokeOpacity={0.9}
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}

function colorForPoints(p: number | null): string {
  if (p === null || p === 0) return "#dc2626"; // red
  if (p >= 9) return "#d4a017";                 // gold
  if (p >= 7) return "#9b3340";                 // cherry-600
  if (p >= 4) return "#c97a3f";                 // orange
  return "#888888";
}
