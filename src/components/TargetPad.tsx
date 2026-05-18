import { useRef, useState } from "react";

type Marker = { x: number; y: number; points: number };

type Props = {
  /** Anzahl konzentrischer Ringe (1..N, innerstes = höchster Wert) */
  rings: number;
  /** Aktueller Pfeil-Slot — Marker wird mit dieser Nummer beschriftet */
  activeSlot: number;
  /** Bestehende Marker pro Slot (0..arrows-1) */
  markers: (Marker | null)[];
  onShot: (points: number, x: number, y: number) => void;
  /** Marker präzise neu platzieren (verschoben per Drag) */
  onMoveMarker: (slot: number, x: number, y: number, points: number) => void;
  onClearSlot: (slot: number) => void;
  disabled?: boolean;
};

/**
 * Standard-WA-Farbpalette von INNEN nach AUSSEN paarweise:
 *   9-10 gold, 7-8 rot, 5-6 cyan, 3-4 schwarz, 1-2 weiß
 */
const RING_COLOR_PAIRS = ["#D4A547", "#C0464F", "#3FA6C9", "#1F1F1F", "#F5F2EB"];
const TEXT_ON_COLOR = (fill: string): string => (fill === "#1F1F1F" || fill === "#C0464F" ? "#FAF8F4" : "#1F1F1F");
const MARKER_COLORS = ["#1F1F1F", "#C0464F", "#3FA6C9", "#D4A547"];
const OUTER_R = 0.47;

function pointsForRadius(rings: number, r: number): number {
  if (r > OUTER_R) return 0;
  const ringIdx = Math.min(rings - 1, Math.floor((r / OUTER_R) * rings));
  return rings - ringIdx; // 1 (außen) .. rings (zentrum)
}

/**
 * Custom-Target-Pad für discipline="target_practice".
 * Tap → setzt Pfeil. Long-Press 350ms → Zoom-Modal mit Drag-Modus, in dem
 * der nächstgelegene Marker per Finger-Bewegung präzise neu platziert wird.
 */
export default function TargetPad({ rings, activeSlot, markers, onShot, onMoveMarker, disabled }: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);
  // Im Zoom-Modal wird der gerade aktive Slot per Drag bewegt. Wir behalten
  // einen lokalen "draft"-Marker während des Drags und schicken erst beim
  // PointerUp den finalen Wert raus, damit der Live-Score nicht flackert.
  const [draft, setDraft] = useState<Marker | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pickClosestSlot(x: number, y: number): number {
    let best = activeSlot;
    let bestDist = Infinity;
    markers.forEach((m, i) => {
      if (!m) return;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    // Wenn kein Marker in der Nähe → activeSlot nehmen
    return bestDist < 0.06 ? best : activeSlot;
  }

  function relPos(clientX: number, clientY: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown() {
    if (disabled) return;
    longPressTimer.current = setTimeout(() => {
      setZoomOpen(true);
      longPressTimer.current = null;
    }, 350);
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const { x, y } = relPos(e.clientX, e.clientY, e.currentTarget);
      const points = pointsForRadius(rings, Math.hypot(x - 0.5, y - 0.5));
      onShot(points, x, y);
    }
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // Drag im Zoom-Modal
  function zoomPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = relPos(e.clientX, e.clientY, e.currentTarget);
    const slot = pickClosestSlot(x, y);
    setDragSlot(slot);
    const points = pointsForRadius(rings, Math.hypot(x - 0.5, y - 0.5));
    setDraft({ x, y, points });
  }

  function zoomPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragSlot === null) return;
    const { x, y } = relPos(e.clientX, e.clientY, e.currentTarget);
    const points = pointsForRadius(rings, Math.hypot(x - 0.5, y - 0.5));
    setDraft({ x, y, points });
  }

  function zoomPointerUp() {
    if (dragSlot === null || !draft) return;
    onMoveMarker(dragSlot, draft.x, draft.y, draft.points);
    setDragSlot(null);
    setDraft(null);
  }

  function closeZoom() {
    setZoomOpen(false);
    setDragSlot(null);
    setDraft(null);
  }

  // Marker im Zoom-Modal — wenn gedraggt wird, ersetze den draft-Marker
  const zoomMarkers = markers.map((m, i) => (i === dragSlot && draft ? draft : m));

  return (
    <>
      <TargetSvg
        rings={rings}
        markers={markers}
        activeSlot={activeSlot}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        disabled={disabled}
        size={300}
      />
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-3"
          onClick={closeZoom}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <TargetSvg
              rings={rings}
              markers={zoomMarkers}
              activeSlot={dragSlot ?? activeSlot}
              onPointerDown={zoomPointerDown}
              onPointerMove={zoomPointerMove}
              onPointerUp={zoomPointerUp}
              onPointerCancel={() => { setDragSlot(null); setDraft(null); }}
              disabled={disabled}
              size={Math.min(typeof window !== "undefined" ? window.innerHeight * 0.7 : 600, 600)}
              showPreview={!!draft}
              previewPoints={draft?.points}
            />
            <p className="text-center text-cream text-sm mt-3">
              {dragSlot !== null
                ? `Pfeil ${dragSlot + 1} präzise platzieren — Finger loslassen zum Übernehmen.`
                : "Tippe & ziehe auf den Marker. Schließen mit Tap außerhalb."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function TargetSvg({
  rings, markers, activeSlot, onPointerDown, onPointerUp, onPointerCancel, onPointerMove,
  disabled, size, showPreview, previewPoints,
}: {
  rings: number;
  markers: (Marker | null)[];
  activeSlot: number;
  onPointerDown: ((e: React.PointerEvent<SVGSVGElement>) => void) | (() => void);
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerCancel: () => void;
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void;
  disabled?: boolean;
  size: number;
  showPreview?: boolean;
  previewPoints?: number;
}) {
  const cx = 0.5;
  const cy = 0.5;
  const outerR = OUTER_R;
  const ringWidth = outerR / rings;

  type RingDef = { r: number; points: number; fill: string };
  const ringData: RingDef[] = [];
  for (let i = 0; i < rings; i++) {
    const r = outerR - i * ringWidth;
    const pointsVal = i + 1; // außen=1, innen=rings
    const ringIdxFromCenter = rings - 1 - i;
    const pairIdx = Math.floor(ringIdxFromCenter / 2);
    const fill = RING_COLOR_PAIRS[Math.min(pairIdx, RING_COLOR_PAIRS.length - 1)];
    ringData.push({ r, points: pointsVal, fill });
  }

  return (
    <svg
      viewBox="0 0 1 1"
      className={`block w-full h-auto select-none touch-none ${disabled ? "opacity-40 pointer-events-none" : "cursor-crosshair"}`}
      style={{ maxWidth: size, margin: "0 auto" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      <rect x="0" y="0" width="1" height="1" fill="rgba(0,0,0,0.04)" />
      {ringData.map((rd, idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={rd.r}
          fill={rd.fill}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth={0.0015}
        />
      ))}

      {/* Punkt-Labels — am OBEREN Bandrand jedes Rings (12-Uhr). Center extra groß. */}
      {ringData.map((rd, idx) => {
        const innerR = idx === ringData.length - 1 ? 0 : ringData[idx + 1].r;
        const isCenter = idx === ringData.length - 1;
        // Label-Y: Mitte des oberen Bandstückes
        const labelY = isCenter ? cy + 0.015 : cy - (rd.r + innerR) / 2 + 0.013;
        return (
          <text
            key={`l-${idx}`}
            x={cx}
            y={labelY}
            textAnchor="middle"
            fontSize={isCenter ? 0.05 : Math.max(0.02, 0.03 - idx * 0.0008)}
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
              r={0.022}
              fill={MARKER_COLORS[i % MARKER_COLORS.length]}
              stroke="white"
              strokeWidth={i === activeSlot ? 0.006 : 0.0035}
            />
            <text
              x={m.x}
              y={m.y + 0.01}
              textAnchor="middle"
              fontSize={0.026}
              fontWeight="bold"
              fill="white"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {i + 1}
            </text>
          </g>
        ) : null
      )}

      {/* Live-Preview im Zoom-Drag: aktuelle Punkte am oberen Rand */}
      {showPreview && previewPoints !== undefined && (
        <g style={{ pointerEvents: "none" }}>
          <rect x="0.36" y="0.02" width="0.28" height="0.07" rx="0.012" fill="rgba(0,0,0,0.7)" />
          <text x={cx} y="0.07" textAnchor="middle" fontSize="0.04" fontWeight="bold" fill="white"
                style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {previewPoints} Pkt
          </text>
        </g>
      )}
    </svg>
  );
}
