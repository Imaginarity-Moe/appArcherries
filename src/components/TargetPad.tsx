import { useRef, useState } from "react";

type Props = {
  /** Anzahl konzentrischer Ringe (1..N, innerstes = höchster Wert) */
  rings: number;
  /** Aktueller Pfeil-Slot — Marker wird mit dieser Nummer beschriftet */
  activeSlot: number;
  /** Bestehende Marker pro Slot (0..arrows-1) */
  markers: ({ x: number; y: number; points: number } | null)[];
  onShot: (points: number, x: number, y: number) => void;
  onClearSlot: (slot: number) => void;
  disabled?: boolean;
};

/**
 * Standard-WA-Farbpalette von INNEN nach AUSSEN:
 *   9-10 gold/yellow, 7-8 red, 5-6 light-blue/cyan, 3-4 black, 1-2 white
 * Bei Ring-Anzahl < 10: Paare schrumpfen entsprechend (z.B. bei 5 Ringen: gold, red, cyan, black, white).
 */
const RING_COLOR_PAIRS = ["#D4A547", "#C0464F", "#3FA6C9", "#1F1F1F", "#F5F2EB"];
// Text-Kontrast je nach Background
const TEXT_ON_COLOR = (fill: string): string => {
  // grobe Heuristik: dunkle bg → cream, helle bg → graphit
  return fill === "#1F1F1F" ? "#FAF8F4" : "#1F1F1F";
};

const MARKER_COLORS = ["#1F1F1F", "#C0464F", "#3FA6C9", "#D4A547"];

/**
 * Custom-Target-Pad für discipline="target_practice".
 * Renderiert N konzentrische Ringe in WA-Standardfarben (gold-rot-cyan-black-white).
 * Klick auf einen Ring → Ring-Wert + normalisierte x/y für Heatmap.
 * Long-Press (500ms) → Zoom-Modal für präzise Markierung.
 */
export default function TargetPad({ rings, activeSlot, markers, onShot, onClearSlot, disabled }: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePointerDown() {
    if (disabled) return;
    // Long-Press = 500ms → Zoom-Modal
    longPressTimer.current = setTimeout(() => {
      setZoomOpen(true);
      longPressTimer.current = null;
    }, 500);
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      // Kurzer Tap → normaler Klick auf Ring
      shootAt(e.clientX, e.clientY, e.currentTarget);
    }
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function shootAt(clientX: number, clientY: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy);
    // Außenradius (am Rand der äußersten Ring-Mitte) ist ca. 0.47 (siehe SVG-Geometrie unten)
    const outerR = 0.47;
    if (r > outerR) {
      // Außerhalb der Auflage = Miss
      onShot(0, x, y);
      return;
    }
    const ringIdx = Math.min(rings - 1, Math.floor((r / outerR) * rings));
    const points = rings - ringIdx; // 1 (außen) .. rings (zentrum)
    onShot(points, x, y);
  }

  return (
    <>
      <TargetSvg
        rings={rings}
        markers={markers}
        activeSlot={activeSlot}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMarkerClear={onClearSlot}
        disabled={disabled}
        size={300}
      />
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3"
          onClick={() => setZoomOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <TargetSvg
              rings={rings}
              markers={markers}
              activeSlot={activeSlot}
              onPointerDown={() => {}}
              onPointerUp={(e) => {
                shootAt(e.clientX, e.clientY, e.currentTarget);
                setZoomOpen(false);
              }}
              onPointerCancel={() => {}}
              onMarkerClear={onClearSlot}
              disabled={disabled}
              size={600}
            />
            <p className="text-center text-cream text-sm mt-3">
              Tippe für präzise Markierung — schließen mit Tap außerhalb.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function TargetSvg({
  rings, markers, activeSlot, onPointerDown, onPointerUp, onPointerCancel,
  disabled, size,
}: {
  rings: number;
  markers: ({ x: number; y: number; points: number } | null)[];
  activeSlot: number;
  onPointerDown: () => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
  onMarkerClear: (slot: number) => void;
  disabled?: boolean;
  size: number;
}) {
  // viewBox 0..1; aller Ringe Mitte = (0.5, 0.5); outer = 0.47
  const cx = 0.5;
  const cy = 0.5;
  const outerR = 0.47;
  const ringWidth = outerR / rings;

  // Ringe von OUTER nach INNER rendern, damit innere oben drauf liegen.
  // i=0 ist Außenring (=1 Punkt), i=rings-1 ist Zentrum (=rings Punkte).
  type RingDef = { r: number; points: number; fill: string };
  const ringData: RingDef[] = [];
  for (let i = 0; i < rings; i++) {
    const r = outerR - i * ringWidth;
    const pointsVal = i + 1; // außen=1, innen=rings — KEY FIX
    // Farb-Mapping: gold-gold-rot-rot-cyan-cyan-schwarz-schwarz-weiß-weiß von INNEN.
    // ringIdxFromCenter = 0 (innen) .. rings-1 (außen). pairIdx wechselt alle 2 Ringe.
    const ringIdxFromCenter = rings - 1 - i;
    const pairIdx = Math.floor(ringIdxFromCenter / 2);
    const fill = RING_COLOR_PAIRS[Math.min(pairIdx, RING_COLOR_PAIRS.length - 1)];
    ringData.push({ r, points: pointsVal, fill });
  }

  return (
    <svg
      viewBox="0 0 1 1"
      className={`block w-full h-auto select-none touch-manipulation ${disabled ? "opacity-40 pointer-events-none" : "cursor-crosshair"}`}
      style={{ maxWidth: size, margin: "0 auto" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Hintergrund (= Miss-Zone) */}
      <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.04)" />
      {ringData.map((rd, idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={rd.r}
          fill={rd.fill}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={0.001}
        />
      ))}
      {/* Punkt-Labels: bei Ring 1 (außen) bis rings-1 am OBEREN Bandrand (12 Uhr),
          Zentrum-Wert (rings) direkt im Center. */}
      {ringData.map((rd, idx) => {
        const innerR = idx === ringData.length - 1 ? 0 : ringData[idx + 1].r;
        const isCenter = idx === ringData.length - 1;
        // Y-Position: für Ringe oben am Rand zwischen rd.r (außen-Kante) und innerR
        // Wir nehmen ~30% von außen, damit das Label gut im Band liegt
        const labelY = isCenter ? cy + 0.012 : cy - (rd.r + (rd.r - innerR) * -0.1) + (rd.r - innerR) * 0.4;
        return (
          <text
            key={`l-${idx}`}
            x={cx}
            y={labelY}
            textAnchor="middle"
            fontSize={isCenter ? 0.045 : Math.max(0.018, 0.027 - idx * 0.0008)}
            fontWeight="bold"
            fill={TEXT_ON_COLOR(rd.fill)}
            style={{ fontFamily: "JetBrains Mono, monospace", pointerEvents: "none", userSelect: "none" }}
          >
            {rd.points}
          </text>
        );
      })}

      {/* Marker */}
      {markers.map((m, i) =>
        m ? (
          <g key={i} style={{ pointerEvents: "none" }}>
            <circle
              cx={m.x}
              cy={m.y}
              r={0.018}
              fill={MARKER_COLORS[i % MARKER_COLORS.length]}
              stroke="white"
              strokeWidth={i === activeSlot ? 0.005 : 0.003}
            />
            <text
              x={m.x}
              y={m.y + 0.008}
              textAnchor="middle"
              fontSize={0.022}
              fontWeight="bold"
              fill="white"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {i + 1}
            </text>
          </g>
        ) : null
      )}
    </svg>
  );
}
