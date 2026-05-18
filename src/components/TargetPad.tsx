import { useRef, useState } from "react";

/** Marker-Koordinaten sind immer 0..1 (DB-Konvention). TargetPad skaliert intern auf viewBox. */
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
  /** Marker von anderen Spielern (collab-mode) — nur Anzeige, nicht editierbar */
  foreignMarkers?: Array<{ x: number; y: number; points: number; label: string; color: string }>;
};

/**
 * Standard-WA-Farbpalette paarweise von INNEN:
 *   9-10 gold, 7-8 rot, 5-6 cyan, 3-4 schwarz, 1-2 weiß
 */
const RING_COLOR_PAIRS = ["#D4A547", "#C0464F", "#3FA6C9", "#1F1F1F", "#F5F2EB"];
const TEXT_ON_COLOR = (fill: string): string =>
  fill === "#1F1F1F" || fill === "#C0464F" ? "#FAF8F4" : "#1F1F1F";
const MARKER_COLORS = ["#1F1F1F", "#C0464F", "#3FA6C9", "#D4A547"];

// viewBox in 100-Einheiten — vermeidet Sub-Pixel-Rounding bei Labels
const VB = 100;
const CX = 50;
const CY = 50;
const OUTER_R = 47;

function pointsForRadius(rings: number, r: number): number {
  if (r > OUTER_R) return 0;
  const ringIdx = Math.min(rings - 1, Math.floor((r / OUTER_R) * rings));
  return rings - ringIdx; // außen=1, innen=rings
}

/**
 * Pad für discipline="target_practice".
 * Tap → setzt Pfeil. Long-Press 350ms → Lupe an Finger-Position; durch Bewegen
 * mit dem Finger wird der nächste Marker mitgezogen, mit OFFSET damit der
 * Finger den Treffpunkt nicht verdeckt.
 */
export default function TargetPad({ rings, activeSlot, markers, onShot, onMoveMarker, disabled, foreignMarkers }: Props) {
  // Drag-State
  const [magnifier, setMagnifier] = useState<{ x: number; y: number; slot: number } | null>(null);
  const [draft, setDraft] = useState<Marker | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Offset für Drag: Finger ist FINGER_OFFSET_Y svg-Einheiten UNTER dem Treffpunkt.
  // Bei viewBox 100 entsprechen 8 Einheiten ca. 8% der Höhe = ~32px bei 400px Größe.
  const FINGER_OFFSET_Y = 10;

  /** Klick-Position in VIEWBOX-Einheiten (0..VB) — wird intern für Geometrie genutzt. */
  function relPosVB(clientX: number, clientY: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VB,
      y: ((clientY - rect.top) / rect.height) * VB,
    };
  }
  /** Klick-Position normalisiert (0..1) — wird nach OUTSIDE rausgegeben. */
  function relPosNorm(clientX: number, clientY: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  /** xNorm/yNorm sind 0..1, markers ebenfalls 0..1. */
  function pickClosestSlot(xNorm: number, yNorm: number): number {
    let best = activeSlot;
    let bestDist = Infinity;
    markers.forEach((m, i) => {
      if (!m) return;
      const d = Math.hypot(m.x - xNorm, m.y - yNorm);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return bestDist < 0.08 ? best : activeSlot;
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      const svg = svgRef.current;
      if (!svg) return;
      const norm = relPosNorm(e.clientX, e.clientY, svg);
      const slot = pickClosestSlot(norm.x, norm.y);
      // Target-Y mit Finger-Offset, in VIEWBOX-Einheiten umgerechnet
      const finger = relPosVB(e.clientX, e.clientY, svg);
      const targetVBY = finger.y - FINGER_OFFSET_Y;
      const r = Math.hypot(finger.x - CX, targetVBY - CY);
      const points = pointsForRadius(rings, r);
      // magnifier/draft halten ebenfalls normalisierte 0..1-Werte
      setMagnifier({ x: norm.x, y: norm.y, slot });
      setDraft({ x: norm.x, y: targetVBY / VB, points });
    }, 350);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    if (magnifier === null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const norm = relPosNorm(e.clientX, e.clientY, svg);
    const finger = relPosVB(e.clientX, e.clientY, svg);
    const targetVBY = finger.y - FINGER_OFFSET_Y;
    const r = Math.hypot(finger.x - CX, targetVBY - CY);
    const points = pointsForRadius(rings, r);
    setMagnifier({ x: norm.x, y: norm.y, slot: magnifier.slot });
    setDraft({ x: norm.x, y: targetVBY / VB, points });
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    if (magnifier && draft) {
      onMoveMarker(magnifier.slot, draft.x, draft.y, draft.points);
      setMagnifier(null);
      setDraft(null);
      return;
    }
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const svg = svgRef.current;
      if (!svg) return;
      const norm = relPosNorm(e.clientX, e.clientY, svg);
      // VB-Distanz für pointsForRadius (CX/CY/OUTER_R sind in VB-Einheiten)
      const r = Math.hypot(norm.x * VB - CX, norm.y * VB - CY);
      const points = pointsForRadius(rings, r);
      onShot(points, norm.x, norm.y);
    }
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setMagnifier(null);
    setDraft(null);
  }

  return (
    <div className="w-full flex justify-center">
      <div
        className="relative w-full"
        style={{
          // Maximal-Breite: Mobile 100vw - 20px, Desktop 480px.
          maxWidth: "min(calc(100vw - 20px), 480px)",
          aspectRatio: "1 / 1",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB} ${VB}`}
          className={`block w-full h-full select-none touch-none ${disabled ? "opacity-40 pointer-events-none" : "cursor-crosshair"}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <TargetRings rings={rings} />
          {/* Marker anderer Spieler (collab-mode): farbcodiert, kleiner, nicht editierbar.
              fm.x/y sind 0..1 normalisiert. */}
          {foreignMarkers?.map((fm, i) => (
            <g key={`f-${i}`} style={{ pointerEvents: "none" }}>
              <circle cx={fm.x * VB} cy={fm.y * VB} r={2} fill={fm.color} stroke="white" strokeWidth={0.4} fillOpacity={0.7} />
              <text
                x={fm.x * VB}
                y={fm.y * VB + 0.8}
                textAnchor="middle"
                fontSize={2.2}
                fontWeight="bold"
                fill="white"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {fm.label}
              </text>
            </g>
          ))}
          {/* Eigene Marker (während Drag: getrackter durch draft ersetzt) */}
          {markers.map((m, i) => {
            const display = magnifier?.slot === i && draft ? draft : m;
            if (!display) return null;
            return <ArrowMarker key={i} index={i} marker={display} active={i === activeSlot} />;
          })}

          {/* Lupe: erscheint nur im Long-Press-Mode an der Finger-Position */}
          {magnifier && draft && (
            <Magnifier rings={rings} centerX={magnifier.x} centerY={magnifier.y} target={draft} fingerOffsetY={FINGER_OFFSET_Y} markerIndex={magnifier.slot} />
          )}
        </svg>
      </div>
    </div>
  );
}

function TargetRings({ rings }: { rings: number }) {
  const ringWidth = OUTER_R / rings;
  // OUTER zuerst → INNER zuletzt
  return (
    <>
      <rect x="0" y="0" width={VB} height={VB} fill="rgba(0,0,0,0.04)" />
      {Array.from({ length: rings }, (_, i) => {
        const r = OUTER_R - i * ringWidth;
        const ringIdxFromCenter = rings - 1 - i;
        const pairIdx = Math.floor(ringIdxFromCenter / 2);
        const fill = RING_COLOR_PAIRS[Math.min(pairIdx, RING_COLOR_PAIRS.length - 1)];
        // Border-Farbe: bei dunklem Ring weißer Trennstrich (sonst schwarz-auf-schwarz
        // an Übergang Schwarz-Ring zu Schwarz-Ring nicht sichtbar). Bei hellem Ring
        // dunkler Strich.
        const isDarkRing = fill === "#1F1F1F" || fill === "#C0464F";
        return (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={r}
            fill={fill}
            stroke={isDarkRing ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.3)"}
            strokeWidth={0.25}
          />
        );
      })}
      {/* Labels: innen-Center groß, andere am 12-Uhr-Bandrand */}
      {Array.from({ length: rings }, (_, i) => {
        const r = OUTER_R - i * ringWidth;
        const innerR = i === rings - 1 ? 0 : OUTER_R - (i + 1) * ringWidth;
        const pointsVal = i + 1;
        const ringIdxFromCenter = rings - 1 - i;
        const pairIdx = Math.floor(ringIdxFromCenter / 2);
        const fill = RING_COLOR_PAIRS[Math.min(pairIdx, RING_COLOR_PAIRS.length - 1)];
        const isCenter = i === rings - 1;
        const labelY = isCenter ? CY + 1.8 : CY - (r + innerR) / 2 + 1.5;
        return (
          <text
            key={`l-${i}`}
            x={CX}
            y={labelY}
            textAnchor="middle"
            fontSize={isCenter ? 5.5 : Math.max(2.6, 3.2 - i * 0.05)}
            fontWeight="bold"
            fill={TEXT_ON_COLOR(fill)}
            style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: 0, pointerEvents: "none", userSelect: "none" }}
          >
            {pointsVal}
          </text>
        );
      })}
    </>
  );
}

function ArrowMarker({ index, marker, active }: { index: number; marker: Marker; active: boolean }) {
  // marker.x/y sind 0..1 normalisiert → in viewBox-Einheiten skalieren
  const cx = marker.x * VB;
  const cy = marker.y * VB;
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={2.4}
        fill={MARKER_COLORS[index % MARKER_COLORS.length]}
        stroke="white"
        strokeWidth={active ? 0.7 : 0.4}
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        fontSize={2.8}
        fontWeight="bold"
        fill="white"
        style={{ fontFamily: "JetBrains Mono, monospace" }}
      >
        {index + 1}
      </text>
    </g>
  );
}

/**
 * Lupe: rendert einen vergrößerten Ausschnitt um (target.x, target.y) als
 * Overlay neben dem Finger. Center der Lupe sitzt FINGER_OFFSET_Y über dem
 * Finger, sodass der User durch nichts hindurch klicken muss.
 */
function Magnifier({
  rings, centerX, centerY, target, fingerOffsetY, markerIndex,
}: {
  rings: number;
  centerX: number;     // 0..1 normalisiert (Finger-Position)
  centerY: number;
  target: Marker;      // 0..1 normalisiert (Treffpunkt = Finger - offset)
  fingerOffsetY: number; // in viewBox-Einheiten
  markerIndex: number;
}) {
  const RADIUS = 14;
  const ZOOM = 3.5;
  // In viewBox-Koordinaten umrechnen (markers + Finger sind normalisiert)
  const fingerVBX = centerX * VB;
  const fingerVBY = centerY * VB;
  const targetVBX = target.x * VB;
  const targetVBY = target.y * VB;

  const lupeCX = fingerVBX;
  const lupeCY = fingerVBY - fingerOffsetY - RADIUS - 2;
  const finalCY = lupeCY - RADIUS < 0 ? fingerVBY + fingerOffsetY + RADIUS + 2 : lupeCY;

  const ringWidth = OUTER_R / rings;

  return (
    <g>
      <circle cx={lupeCX} cy={finalCY} r={RADIUS + 0.8} fill="rgba(0,0,0,0.4)" />
      <defs>
        <clipPath id="lupe-clip">
          <circle cx={lupeCX} cy={finalCY} r={RADIUS} />
        </clipPath>
      </defs>
      <g clipPath="url(#lupe-clip)">
        <g transform={`translate(${lupeCX} ${finalCY}) scale(${ZOOM}) translate(${-targetVBX} ${-targetVBY})`}>
          <rect x="0" y="0" width={VB} height={VB} fill="rgba(0,0,0,0.04)" />
          {Array.from({ length: rings }, (_, i) => {
            const r = OUTER_R - i * ringWidth;
            const ringIdxFromCenter = rings - 1 - i;
            const pairIdx = Math.floor(ringIdxFromCenter / 2);
            const fill = RING_COLOR_PAIRS[Math.min(pairIdx, RING_COLOR_PAIRS.length - 1)];
            return <circle key={i} cx={CX} cy={CY} r={r} fill={fill} stroke="rgba(0,0,0,0.3)" strokeWidth={0.2} />;
          })}
          <circle cx={targetVBX} cy={targetVBY} r={1.5} fill={MARKER_COLORS[markerIndex % MARKER_COLORS.length]} stroke="white" strokeWidth={0.4} />
          <line x1={targetVBX - 3} y1={targetVBY} x2={targetVBX + 3} y2={targetVBY} stroke="white" strokeWidth={0.3} />
          <line x1={targetVBX} y1={targetVBY - 3} x2={targetVBX} y2={targetVBY + 3} stroke="white" strokeWidth={0.3} />
        </g>
      </g>
      <circle cx={lupeCX} cy={finalCY} r={RADIUS} fill="none" stroke="white" strokeWidth={0.6} />
      <rect x={lupeCX - 7} y={finalCY - RADIUS - 5} width="14" height="4.5" rx="1" fill="rgba(0,0,0,0.8)" />
      <text x={lupeCX} y={finalCY - RADIUS - 1.5} textAnchor="middle" fontSize="3.2" fontWeight="bold" fill="white"
            style={{ fontFamily: "JetBrains Mono, monospace" }}>
        {target.points} Pkt
      </text>
    </g>
  );
}
