import { useTranslation } from "react-i18next";
import type { Discipline } from "../api/trainings";

type Props = {
  discipline: Discipline;
  /** Aktueller Pfeil-Slot (1-basiert), wird im Header gehighlightet */
  currentArrow?: number;
  /** Welche Zone ist aktuell für den aktiven Slot gewählt */
  selectedZone?: string | null;
  /** Callback wenn eine Zone angetippt wird */
  onZoneSelect: (zoneCode: string) => void;
  /** Falls IFAA und bereits ein Treffer dokumentiert wurde, Slot wird visuell ausgegraut */
  disabled?: boolean;
};

/**
 * Bullseye-Pad — das Herzstück der Live-Eingabe.
 *
 * Statt Button-Reihen ein abstrahiertes Bullseye als SVG mit anklickbaren Ringen.
 * Tap-Targets sind proportional zur tatsächlichen Zone (Body-Treffer ist visuell
 * groß, X-Ring ist klein — entspricht der Schwierigkeit).
 *
 * Für Field-Wertung haben wir 6 Ringe mit WA-Farben (Gold/Rot/Blau/Schwarz/Weiß).
 * Für 3D haben wir die DSB/IFAA-typischen Killzonen.
 */
export default function BullseyePad({
  discipline,
  selectedZone,
  onZoneSelect,
  disabled,
}: Props) {
  const { t } = useTranslation("training");

  if (discipline === "field_wa") {
    return (
      <FieldBullseye onZoneSelect={onZoneSelect} selected={selectedZone} disabled={disabled} />
    );
  }

  // 3D — alle drei Varianten haben Vital/Body/Miss
  return <ThreeDBullseye onZoneSelect={onZoneSelect} selected={selectedZone} disabled={disabled} t={t} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D Bullseye

function ThreeDBullseye({
  onZoneSelect,
  selected,
  disabled,
  t,
}: {
  onZoneSelect: (z: string) => void;
  selected?: string | null;
  disabled?: boolean;
  t: (k: string) => string;
}) {
  const ringClass = (zone: string, color: string) => {
    const isSel = selected === zone;
    return `cursor-pointer transition ${
      disabled ? "opacity-40 pointer-events-none" : ""
    } ${color} ${isSel ? "stroke-copper-500 stroke-[4]" : "stroke-forest-900/20 stroke-[1.5]"}`;
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      <div className="relative aspect-square max-w-[400px] mx-auto w-full">
        <svg viewBox="0 0 200 200" className="w-full h-full no-tap-highlight">
          {/* Body / 5 — größter Ring */}
          <circle
            cx="100"
            cy="100"
            r="95"
            className={ringClass("body", "fill-zone-body")}
            onClick={() => !disabled && onZoneSelect("body")}
          />
          {/* Outer / 8 */}
          <circle
            cx="100"
            cy="100"
            r="70"
            className={ringClass("outer", "fill-zone-outer")}
            onClick={() => !disabled && onZoneSelect("outer")}
          />
          {/* Inner / 10 */}
          <circle
            cx="100"
            cy="100"
            r="45"
            className={ringClass("inner", "fill-zone-inner")}
            onClick={() => !disabled && onZoneSelect("inner")}
          />
          {/* Kill / X / 11 */}
          <circle
            cx="100"
            cy="100"
            r="22"
            className={ringClass("X", "fill-zone-x")}
            onClick={() => !disabled && onZoneSelect("X")}
          />

          {/* Zonen-Labels mittig in jedem Ring */}
          <text x="100" y="103" textAnchor="middle" className="fill-forest-900 font-bold text-[14px] pointer-events-none" style={{ fontFamily: "JetBrains Mono, monospace" }}>X</text>
          <text x="100" y="62" textAnchor="middle" className="fill-forest-900 font-bold text-[12px] pointer-events-none" style={{ fontFamily: "JetBrains Mono, monospace" }}>10</text>
          <text x="100" y="38" textAnchor="middle" className="fill-forest-900 font-bold text-[12px] pointer-events-none" style={{ fontFamily: "JetBrains Mono, monospace" }}>8</text>
          <text x="100" y="14" textAnchor="middle" className="fill-forest-900/70 font-bold text-[10px] pointer-events-none" style={{ fontFamily: "JetBrains Mono, monospace" }}>BODY 5</text>
        </svg>
      </div>

      {/* Miss-Button bewusst räumlich getrennt unten */}
      <button
        type="button"
        onClick={() => !disabled && onZoneSelect("miss")}
        disabled={disabled}
        className={`tap-large w-full rounded-2xl border-2 border-dashed border-zone-miss/40 bg-canvas dark:bg-sunken-dark text-forest-700 dark:text-forest-300 font-semibold transition active:scale-[0.98] ${
          selected === "miss"
            ? "border-copper-500 bg-copper-50 text-copper-700"
            : "hover:bg-sunken"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {t("zone.miss")}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field-Bullseye — WA-Feldbogen-Farben + Ringe

function FieldBullseye({
  onZoneSelect,
  selected,
  disabled,
}: {
  onZoneSelect: (z: string) => void;
  selected?: string | null;
  disabled?: boolean;
}) {
  // WA-Feldbogen-Farben offiziell (vereinfacht):
  // Center X/6 = Gold, 5 = Gold, 4/3 = Schwarz, 2/1 = Weiß
  const rings = [
    { zone: "1", r: 95, fill: "#FFFFFF", stroke: "#1F2418", label: "1", labelY: 14 },
    { zone: "2", r: 80, fill: "#FFFFFF", stroke: "#1F2418", label: "2", labelY: 26 },
    { zone: "3", r: 65, fill: "#1F2418", stroke: "#1F2418", label: "3", labelY: 41, textFill: "#FFFFFF" },
    { zone: "4", r: 50, fill: "#1F2418", stroke: "#1F2418", label: "4", labelY: 55, textFill: "#FFFFFF" },
    { zone: "5", r: 35, fill: "#D4A547", stroke: "#9A5530", label: "5", labelY: 70 },
    { zone: "X", r: 18, fill: "#D4A547", stroke: "#9A5530", label: "X", labelY: 104 },
  ];

  return (
    <div className="flex flex-col gap-4 select-none">
      <div className="relative aspect-square max-w-[400px] mx-auto w-full">
        <svg viewBox="0 0 200 200" className="w-full h-full no-tap-highlight">
          {rings.map((ring) => {
            const isSel = selected === ring.zone;
            return (
              <g key={ring.zone}>
                <circle
                  cx="100"
                  cy="100"
                  r={ring.r}
                  fill={ring.fill}
                  className={`cursor-pointer transition ${
                    disabled ? "opacity-40 pointer-events-none" : ""
                  }`}
                  stroke={isSel ? "#C97B4B" : ring.stroke}
                  strokeWidth={isSel ? 4 : 1.5}
                  onClick={() => !disabled && onZoneSelect(ring.zone)}
                />
              </g>
            );
          })}
          {/* Labels separat darüber */}
          {rings.map((ring) => (
            <text
              key={`l-${ring.zone}`}
              x="100"
              y={ring.labelY}
              textAnchor="middle"
              className="pointer-events-none font-bold text-[11px]"
              fill={ring.textFill ?? "#1F2418"}
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {ring.label}
            </text>
          ))}
        </svg>
      </div>

      <button
        type="button"
        onClick={() => !disabled && onZoneSelect("miss")}
        disabled={disabled}
        className={`tap-large w-full rounded-2xl border-2 border-dashed border-zone-miss/40 bg-canvas dark:bg-sunken-dark text-forest-700 dark:text-forest-300 font-semibold transition active:scale-[0.98] ${
          selected === "miss"
            ? "border-copper-500 bg-copper-50 text-copper-700"
            : "hover:bg-sunken"
        }`}
      >
        Daneben / M
      </button>
    </div>
  );
}
