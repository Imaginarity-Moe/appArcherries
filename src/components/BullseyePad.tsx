import { useTranslation } from "react-i18next";
import type { Discipline } from "../api/trainings";

type Props = {
  discipline: Discipline;
  selectedZone?: string | null;
  /**
   * Wird beim Tap auf einen Ring gerufen.
   * pos enthält die normalisierte Klick-Position innerhalb der SVG (0..1 für x und y,
   * (0.5, 0.5) = Mitte) — wird für die Treffer-Heatmap auf /stats genutzt.
   */
  onZoneSelect: (zoneCode: string, pos?: { x: number; y: number }) => void;
  disabled?: boolean;
};

type Ring = {
  code: string;
  label: string;
  fill: string;       // CSS color (hex)
  textFill?: string;  // override for label color
};

/**
 * Ringe pro Disziplin von INNEN nach AUSSEN. Der äußerste Ring ist immer „M" (Miss).
 * Konsistent: höchster Wert in der Mitte, jeder Ring eine andere Farbe.
 */
const PAD_RINGS: Record<Discipline, Ring[]> = {
  "3d_wa": [
    { code: "X",     label: "X",  fill: "#D4A547" },  // gold
    { code: "inner", label: "10", fill: "#E8B894" },  // dusty rose
    { code: "outer", label: "8",  fill: "#7A8B7A" },  // sage
    { code: "body",  label: "5",  fill: "#A89980" },  // muted khaki
    { code: "miss",  label: "M",  fill: "#3D3933", textFill: "#FAF8F4" }, // dunkel
  ],
  "3d_ifaa": [
    { code: "inner_kill", label: "20/14/8", fill: "#D4A547" },              // gold
    { code: "outer_kill", label: "18/12/6", fill: "#B46A76" },              // dusty rose tieferer Ton
    { code: "wound",      label: "16/10/4", fill: "#7A8B7A" },              // sage
    { code: "miss",       label: "M",       fill: "#3D3933", textFill: "#FAF8F4" },
  ],
  "3d_ifaa_hunter": [
    { code: "inner_kill", label: "20", fill: "#D4A547" },
    { code: "outer_kill", label: "17", fill: "#B46A76" },
    { code: "wound",      label: "10", fill: "#7A8B7A" },
    { code: "miss",       label: "M",  fill: "#3D3933", textFill: "#FAF8F4" },
  ],
  "3d_ifaa_animal": [
    { code: "vital", label: "Kill",  fill: "#D4A547" },
    { code: "wound", label: "Wound", fill: "#7A8B7A" },
    { code: "miss",  label: "M",     fill: "#3D3933", textFill: "#FAF8F4" },
  ],
  "3d_bowhunter": [
    { code: "vital", label: "Kill",  fill: "#D4A547" },
    { code: "wound", label: "Wound", fill: "#7A8B7A" },
    { code: "miss",  label: "M",     fill: "#3D3933", textFill: "#FAF8F4" },
  ],
  "field_wa": [
    { code: "X",    label: "X", fill: "#D4A547" },                            // Center Gold (Tie-Break)
    { code: "6",    label: "6", fill: "#E0B868" },                            // Inner Gold
    { code: "5",    label: "5", fill: "#F0CB85" },                            // Outer Gold
    { code: "4",    label: "4", fill: "#1F2418", textFill: "#FAF8F4" },       // Black inner
    { code: "3",    label: "3", fill: "#3D3933", textFill: "#FAF8F4" },       // Black outer
    { code: "2",    label: "2", fill: "#E8E0CB" },                            // White inner
    { code: "1",    label: "1", fill: "#F5F2EB" },                            // White outer
    { code: "miss", label: "M", fill: "#A89980", textFill: "#FAF8F4" },       // dunkler Rand
  ],
  "field_ifaa": [
    { code: "5",    label: "5", fill: "#D4A547" },
    { code: "4",    label: "4", fill: "#B46A76" },
    { code: "3",    label: "3", fill: "#7A8B7A" },
    { code: "miss", label: "M", fill: "#3D3933", textFill: "#FAF8F4" },
  ],
  simple: [],
};

export default function BullseyePad({ discipline, selectedZone, onZoneSelect, disabled }: Props) {
  const { t } = useTranslation("training");
  const rings = PAD_RINGS[discipline] ?? [];
  if (rings.length === 0) return null;

  // Radien: rings[0] ist der INNERSTE (höchster Wert / Bullseye), letzter Ring ist außen (Miss)
  const maxR = 96;
  const minR = 18;
  const step = (maxR - minR) / Math.max(rings.length - 1, 1);

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="relative aspect-square max-w-[300px] mx-auto w-full">
        <svg viewBox="0 0 200 200" className="w-full h-full no-tap-highlight">
          {/* Außen nach innen rendern: größerer Ring zuerst, damit kleinere darüber liegen und Klick-Treffer auf den richtigen Ring geht */}
          {rings
            .map((ring, idx) => ({ ring, idx, r: minR + idx * step }))
            .slice()
            .reverse()
            .map(({ ring, r }) => {
              const isSel = selectedZone === ring.code;
              return (
                <circle
                  key={ring.code}
                  cx="100"
                  cy="100"
                  r={r}
                  fill={ring.fill}
                  stroke={isSel ? "#8E2C3A" : "rgba(28,28,30,0.18)"}
                  strokeWidth={isSel ? 4 : 1}
                  className={`cursor-pointer transition ${disabled ? "opacity-40 pointer-events-none" : ""}`}
                  onClick={(e) => {
                    if (disabled) return;
                    // Klick-Position in SVG-Koordinaten → normalisiert auf 0..1
                    const svg = e.currentTarget.ownerSVGElement;
                    if (svg) {
                      const rect = svg.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      const y = (e.clientY - rect.top) / rect.height;
                      const clamp = (v: number) => Math.max(0, Math.min(1, v));
                      onZoneSelect(ring.code, { x: clamp(x), y: clamp(y) });
                    } else {
                      onZoneSelect(ring.code);
                    }
                  }}
                  aria-label={ring.label}
                />
              );
            })}

          {/* Labels: innerstes Label im Zentrum, äußere Labels OBEN im Ringbereich */}
          {rings.map((ring, idx) => {
            const rOuter = minR + idx * step;
            const rInner = idx === 0 ? 0 : minR + (idx - 1) * step;
            const isInnermost = idx === 0;
            // Innerstes: zentriert. Andere: in der oberen Mitte des jeweiligen Rings.
            const labelY = isInnermost ? 103 : 100 - (rOuter + rInner) / 2;
            return (
              <text
                key={`l-${ring.code}`}
                x="100"
                y={labelY}
                textAnchor="middle"
                className="pointer-events-none font-bold"
                fill={ring.textFill ?? "#1F2418"}
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: isInnermost ? 11 : Math.max(8, 11 - idx),
                }}
              >
                {ring.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Hint-Text statt separatem Miss-Button — Miss ist jetzt ein Ring */}
      <p className="text-xs text-muted text-center">
        {t("zone.hint", "Tippe einen Ring — Punkte werden berechnet")}
      </p>
    </div>
  );
}
