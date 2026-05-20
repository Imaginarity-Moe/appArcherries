import type { Discipline } from "../api/trainings";
import { PAD_RINGS } from "./BullseyePad";

export type HeatmapPoint = {
  pad_x: number;
  pad_y: number;
  zone: string | null;
  points: number;
};

type Props = {
  discipline: Discipline;
  points: HeatmapPoint[];
  /** Optional: Größe für Liste-View. Default 240. */
  size?: number;
};

/**
 * Treffer-Heatmap auf einem abstrakten BullseyePad. Punkte werden mit Alpha
 * geblended — Cluster werden dunkler. Keine KDE — bewusst einfach, damit es
 * auf vielen Datenpunkten performant bleibt.
 */
export default function Heatmap({ discipline, points, size = 240 }: Props) {
  const rings = PAD_RINGS[discipline] ?? [];
  if (rings.length === 0) {
    return (
      <div className="flex items-center justify-center w-full aspect-square bg-surface rounded-lg text-xs text-muted">
        Heatmap nicht verfügbar für diese Disziplin
      </div>
    );
  }

  const maxR = 96;
  const minR = 18;
  const step = (maxR - minR) / Math.max(rings.length - 1, 1);

  return (
    <div className="relative aspect-square" style={{ maxWidth: size }}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Rings: gedämpft (Alpha) damit Punkte hervorstechen */}
        {rings
          .map((ring, idx) => ({ ring, idx, r: minR + idx * step }))
          .slice()
          .reverse()
          .map(({ ring, r }) => (
            <circle
              key={ring.code}
              cx="100"
              cy="100"
              r={r}
              fill={ring.fill}
              fillOpacity={0.45}
              stroke="rgba(28,28,30,0.18)"
              strokeWidth={0.5}
            />
          ))}

        {/* Punkte: kleine Cherry-Dots mit Alpha. Dichte → dunkler durch Overlap. */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.pad_x * 200}
            cy={p.pad_y * 200}
            r={2.4}
            fill="#8E2C3A"
            fillOpacity={0.35}
            stroke="#FAF8F4"
            strokeOpacity={0.4}
            strokeWidth={0.3}
          />
        ))}
      </svg>
    </div>
  );
}
