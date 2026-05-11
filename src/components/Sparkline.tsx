type Props = {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
};

/**
 * Mini-Sparkline ohne externe Library — sehr leichter SVG-Path.
 * Zeigt z.B. Stations-Scores eines Trainings als visueller Hook in der Liste.
 */
export default function Sparkline({
  values,
  width = 120,
  height = 28,
  className = "",
  stroke = "#C97B4B",
}: Props) {
  if (values.length === 0) return null;
  if (values.length === 1) {
    return (
      <svg width={width} height={height} className={className}>
        <circle cx={width / 2} cy={height / 2} r="2" fill={stroke} />
      </svg>
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
