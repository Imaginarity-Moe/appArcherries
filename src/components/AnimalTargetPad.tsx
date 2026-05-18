import { useTranslation } from "react-i18next";
import type { AnimalTarget } from "./animalTargets";

type Props = {
  target: AnimalTarget;
  selectedZone?: string | null;
  /**
   * Wird beim Tap aufs Tier gerufen. Zone wird aus data-zone der getroffenen
   * SVG-Form gelesen (inner_kill / outer_kill / wound / miss).
   * pos enthält normalisierte 0..1-Koordinaten innerhalb der SVG (für Heatmap).
   */
  onZoneSelect: (zoneCode: string, pos?: { x: number; y: number }) => void;
  disabled?: boolean;
  /**
   * Optional: x/y-Marker je Pfeil-Slot (0..1) — wenn gesetzt, werden sie
   * als nummerierte Punkte über dem Tier gerendert.
   */
  markers?: ({ x: number; y: number } | null)[];
  activeSlot?: number;
};

const MARKER_COLORS = ["#D4A547", "#B46A76", "#3F6D5E", "#7A5C8A"];

/**
 * Klick-fähige Tier-Silhouette mit eingezeichneten Kill-Zonen.
 * Wird statt BullseyePad gerendert, wenn animal_or_face einem bekannten Tier
 * aus der Registry entspricht (siehe animalTargets/index.tsx).
 */
export default function AnimalTargetPad({
  target,
  selectedZone,
  onZoneSelect,
  disabled,
  markers,
  activeSlot,
}: Props) {
  const { t } = useTranslation("training");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    const el = e.target as Element;
    // Zone aus data-zone des getroffenen Pfads; Fallback "miss" wenn nichts getroffen
    const zone = (el.getAttribute?.("data-zone") as string | null) ?? "miss";

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    onZoneSelect(zone, { x: clamp(x), y: clamp(y) });
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="text-xs text-muted text-center">{target.label}</div>
      <div className="relative w-full max-w-md mx-auto">
        <svg
          viewBox={target.viewBox}
          className={`w-full aspect-[24/17] no-tap-highlight bg-surface rounded-xl ${
            disabled ? "opacity-40 pointer-events-none" : "cursor-crosshair"
          }`}
          onClick={handleClick}
        >
          {/* Transparenter Hintergrund = "miss" wenn man daneben tippt */}
          <rect data-zone="miss" x="0" y="0" width="100%" height="100%" fill="transparent" />
          {target.svg}

          {/* Marker pro Pfeil-Slot */}
          {markers?.map((m, i) => {
            if (!m) return null;
            // Convert normalized 0..1 → viewBox-coords
            const [vbX, vbY, vbW, vbH] = target.viewBox.split(" ").map(Number);
            const cx = vbX + m.x * vbW;
            const cy = vbY + m.y * vbH;
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            const isActive = activeSlot === i;
            return (
              <g key={i} style={{ pointerEvents: "none" }}>
                <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={isActive ? 2 : 1} />
                <text
                  x={cx}
                  y={cy + 2.5}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight="bold"
                  fill="white"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-muted text-center">
        {selectedZone
          ? t("zone.selected", { defaultValue: "Zone: {{zone}}", zone: zoneLabel(selectedZone) })
          : t("zone.hint", "Tippe auf das Tier — Punkte werden berechnet")}
      </p>
    </div>
  );
}

function zoneLabel(code: string): string {
  switch (code) {
    case "inner_kill": return "Inner Kill";
    case "outer_kill": return "Outer Kill";
    case "wound":      return "Wound";
    case "miss":       return "Miss";
    case "vital":      return "Vital";
    default:           return code;
  }
}
