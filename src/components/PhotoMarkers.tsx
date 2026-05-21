import { useRef } from "react";
import { Crosshair } from "lucide-react";

export type Marker = { x: number; y: number } | null;
export type ForeignMarker = { x: number; y: number; label: string; color: string; points?: number };

type Props = {
  imagePath: string;
  /** Markers indexiert nach 0..slotsCount-1 entsprechend arrow_seq-1 */
  markers: Marker[];
  /** Slot der gerade aktiv editiert wird */
  activeSlot: number;
  onMarkerSet: (slot: number, x: number, y: number) => void;
  onMarkerClear: (slot: number) => void;
  /** Read-only Marker anderer Spieler (collab-Mode). Annahme: gleiche Foto-Geometrie. */
  foreignMarkers?: ForeignMarker[];
};

const MARKER_COLORS = [
  "bg-copper-500",
  "bg-forest-500",
  "bg-blue-500",
  "bg-purple-500",
];

/**
 * Stations-Foto im Live-Eingabe-Modus: Tap aufs Bild setzt den Marker
 * für den aktiven Pfeil-Slot. Bestehende Marker sind sichtbar + tap-baren-löschbar.
 */
export default function PhotoMarkers({ imagePath, markers, activeSlot, onMarkerSet, onMarkerClear, foreignMarkers }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onMarkerSet(activeSlot, x, y);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-forest-700 dark:text-forest-300 mb-1.5">
        <Crosshair size={12} />
        <span>
          Tippe aufs Foto, um Pfeil <span className="font-bold text-copper-600">#{activeSlot + 1}</span> zu markieren
        </span>
      </div>
      <div className="relative inline-block w-full max-w-md select-none">
        <img
          ref={imgRef}
          src={imagePath}
          alt="Station"
          className="rounded-xl w-full"
          draggable={false}
          loading="lazy"
        />
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleClick}
        />
        {/* Foreign Marker zuerst — eigene liegen oben drauf für Hit-Target-Priorität */}
        {(foreignMarkers ?? []).map((fm, i) => (
          <span
            key={`fm-${i}`}
            style={{
              position: "absolute",
              left: `${fm.x * 100}%`,
              top: `${fm.y * 100}%`,
              transform: "translate(-50%, -50%)",
              background: fm.color,
            }}
            className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-card ring-2 ring-white/80 pointer-events-none"
            title={`${fm.label}${fm.points != null ? ` · ${fm.points}` : ""}`}
            aria-hidden
          >
            {fm.label}
          </span>
        ))}
        {markers.map((m, i) =>
          m ? (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClear(i);
              }}
              style={{
                position: "absolute",
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lift ring-2 ring-white ${
                MARKER_COLORS[i % MARKER_COLORS.length]
              } ${activeSlot === i ? "scale-110" : ""}`}
              aria-label={`Marker Pfeil ${i + 1}`}
            >
              {i + 1}
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}
