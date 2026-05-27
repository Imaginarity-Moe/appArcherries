/**
 * Schlanker horizontaler Fortschritts-Balken.
 *
 * - `value` 0..1 oder 0..max, je nach gesetztem `max` (default 1).
 * - `tone` wählt die Füll-Farbe: "cherry" (primärer Akzent), "emerald" (positive
 *   Sekundär-Anzeige wie Ø-Score) oder "muted" (neutrale Hintergrund-Balken).
 *
 * Track ist immer `bg-surface` mit `overflow-hidden`. Höhe per `thickness` —
 * "xs" für Sub-Indikatoren, "sm" Standard.
 */
export function ProgressBar({
  value,
  max = 1,
  tone = "cherry",
  thickness = "sm",
  className = "",
}: {
  value: number;
  max?: number;
  tone?: "cherry" | "emerald" | "muted";
  thickness?: "xs" | "sm";
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const heightCls = thickness === "xs" ? "h-1" : "h-1.5";
  const fillCls =
    tone === "emerald" ? "bg-emerald-500/60"
    : tone === "muted" ? "bg-muted/40"
    : "bg-cherry-500/80";
  return (
    <div
      className={`${heightCls} bg-surface rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full ${fillCls} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}
