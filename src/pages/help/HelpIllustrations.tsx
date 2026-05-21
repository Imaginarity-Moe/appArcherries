/**
 * Statische SVG-Visualisierungen für die Hilfe-Seiten.
 * Kein User-Interaction, nur didaktische Diagramme.
 *
 * Farben sind explizit gesetzt damit Light/Dark-Mode beide hübsch aussehen —
 * die Auflagen-Originalfarben sind ohnehin festgelegt durch die Verbände.
 */
import type { ReactNode } from "react";

type Props = { size?: number; className?: string };

// ─── 3D-Tier (vereinfachte Wildschwein-Silhouette mit Kill-Zonen) ──────────
export function AnimalTargetSVG({ size = 240, className = "" }: Props) {
  return (
    <svg viewBox="0 0 240 160" width={size} className={className} role="img" aria-label="3D-Tierattrappe mit Trefferzonen">
      {/* Körper-Silhouette — schaut nach links, vereinfachte Boar-Form */}
      <path
        d="M 30 110 C 25 90, 30 70, 60 65 L 70 50 C 75 45, 85 45, 90 55 L 100 65
           C 130 60, 170 60, 195 75 C 215 85, 215 110, 200 115 L 195 130
           C 192 138, 182 138, 178 130 L 175 120 L 75 120 L 72 130 C 68 138, 58 138, 55 130 L 50 120 Z"
        fill="#6B4226"
        stroke="#3F2715"
        strokeWidth="1.5"
      />
      {/* Wound-Zone (großer äußerer Oval, Körper) */}
      <ellipse cx="135" cy="95" rx="42" ry="22" fill="#D4A547" fillOpacity="0.85" stroke="#3F2715" strokeWidth="0.8" />
      {/* Outer Kill (mittlerer Oval) */}
      <ellipse cx="138" cy="93" rx="22" ry="13" fill="#C0464F" fillOpacity="0.95" stroke="#3F2715" strokeWidth="0.8" />
      {/* Inner Kill (kleiner Spot) */}
      <ellipse cx="138" cy="93" rx="8" ry="5" fill="#2A2A2A" stroke="#FFFFFF" strokeWidth="0.6" />
      {/* X-Markierung mittig */}
      <text x="138" y="96" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="monospace">X</text>
      {/* Beschriftungen — gestrichelt, dezente Farbe */}
      <Label x={210} y={70} text="Wound" color="#7A5C1F" anchor={[180, 85]} />
      <Label x={205} y={130} text="Outer Kill" color="#7A2532" anchor={[160, 100]} />
      <Label x={45}  y={45}  text="Inner Kill" color="#1A1A1A" anchor={[135, 92]} />
    </svg>
  );
}

// ─── WA-Standardauflage 10er (für target_practice + Halle) ─────────────────
export function WATargetSVG({ size = 220, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} className={className} role="img" aria-label="WA-Standardauflage mit 10 Ringen">
      {/* Ringe von außen nach innen: 1=2=Weiß, 3=4=Schwarz, 5=6=Blau, 7=8=Rot, 9=10/X=Gold */}
      {[
        { r: 49, fill: "#F5F2EB" }, // 1
        { r: 44, fill: "#F5F2EB" }, // 2
        { r: 39, fill: "#1F1F1F" }, // 3
        { r: 34, fill: "#1F1F1F" }, // 4
        { r: 29, fill: "#3FA6C9" }, // 5
        { r: 24, fill: "#3FA6C9" }, // 6
        { r: 19, fill: "#C0464F" }, // 7
        { r: 14, fill: "#C0464F" }, // 8
        { r: 9,  fill: "#D4A547" }, // 9
        { r: 5,  fill: "#D4A547" }, // 10
      ].map((c, i) => (
        <circle key={i} cx="50" cy="50" r={c.r} fill={c.fill} stroke="rgba(0,0,0,0.35)" strokeWidth="0.3" />
      ))}
      {/* X-Spot */}
      <circle cx="50" cy="50" r="1.8" fill="none" stroke="#1F1F1F" strokeWidth="0.4" />
      {/* Ring-Werte */}
      <text x="50" y="51.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">X</text>
      <text x="50" y="44.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#1F1F1F">10</text>
      <text x="50" y="38.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#FFFFFF">9</text>
      <text x="50" y="32.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#FFFFFF">8</text>
      <text x="50" y="26.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#FFFFFF">7</text>
      <text x="50" y="20.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#FFFFFF">6</text>
      <text x="50" y="14.5" textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#FFFFFF">5</text>
      <text x="50" y="8.5"  textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#1F1F1F">4</text>
      <text x="50" y="3.5"  textAnchor="middle" fontSize="2.2" fontFamily="monospace" fill="#1F1F1F">3</text>
    </svg>
  );
}

// ─── Field-WA-Auflage (Gelb/Schwarz/Weiß-Ringe) ────────────────────────────
export function FieldWATargetSVG({ size = 220, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} className={className} role="img" aria-label="WA-Field-Auflage">
      {[
        { r: 47, fill: "#F5F2EB", val: "1" }, // 1
        { r: 40, fill: "#F5F2EB", val: "2" }, // 2
        { r: 33, fill: "#1F1F1F", val: "3" }, // 3
        { r: 26, fill: "#1F1F1F", val: "4" }, // 4
        { r: 19, fill: "#D4A547", val: "5" }, // 5
        { r: 12, fill: "#D4A547", val: "6" }, // 6
      ].map((c, i) => (
        <circle key={i} cx="50" cy="50" r={c.r} fill={c.fill} stroke="rgba(0,0,0,0.35)" strokeWidth="0.3" />
      ))}
      {/* Center-X */}
      <circle cx="50" cy="50" r="3" fill="#D4A547" stroke="#7A2532" strokeWidth="0.6" />
      <text x="50" y="51.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">X</text>
      {/* Ring-Werte */}
      <text x="50" y="45.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">6</text>
      <text x="50" y="38.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">5</text>
      <text x="50" y="31.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#FFFFFF">4</text>
      <text x="50" y="24.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#FFFFFF">3</text>
      <text x="50" y="17.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">2</text>
      <text x="50" y="10.5" textAnchor="middle" fontSize="2.4" fontFamily="monospace" fill="#1F1F1F">1</text>
    </svg>
  );
}

// ─── Field-IFAA-Auflage (5/4/3-Wertung, Weiß/Schwarz) ─────────────────────
export function FieldIFAATargetSVG({ size = 220, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 100" width={size} className={className} role="img" aria-label="IFAA-Field-Auflage">
      <circle cx="50" cy="50" r="47" fill="#1F1F1F" stroke="rgba(0,0,0,0.35)" strokeWidth="0.3" />
      <circle cx="50" cy="50" r="32" fill="#1F1F1F" stroke="#F5F2EB" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="20" fill="#F5F2EB" stroke="rgba(0,0,0,0.35)" strokeWidth="0.3" />
      <circle cx="50" cy="50" r="6"  fill="#F5F2EB" stroke="#1F1F1F" strokeWidth="0.6" />
      <text x="50" y="51.5" textAnchor="middle" fontSize="3" fontFamily="monospace" fill="#1F1F1F">5</text>
      <text x="50" y="32"   textAnchor="middle" fontSize="3" fontFamily="monospace" fill="#1F1F1F">4</text>
      <text x="50" y="14"   textAnchor="middle" fontSize="3" fontFamily="monospace" fill="#F5F2EB">3</text>
    </svg>
  );
}

// ─── Bogen-Silhouetten — sehr stilisiert ───────────────────────────────────
export function RecurveBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 80 120" width={size} className={className} role="img" aria-label="Recurve-Bogen">
      <path d="M 40 10 C 22 25, 22 45, 40 50 C 22 55, 22 75, 40 90" fill="none" stroke="#6B4226" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 10 C 35 22, 38 40, 40 50 C 42 60, 35 78, 40 90" fill="none" stroke="#888" strokeWidth="0.6" />
      {/* Stabilisator */}
      <line x1="40" y1="50" x2="60" y2="58" stroke="#1F1F1F" strokeWidth="1.5" />
      <circle cx="60" cy="58" r="2" fill="#1F1F1F" />
      {/* Visier */}
      <line x1="40" y1="50" x2="48" y2="38" stroke="#1F1F1F" strokeWidth="1.2" />
      <circle cx="48" cy="38" r="2" fill="none" stroke="#1F1F1F" strokeWidth="0.8" />
    </svg>
  );
}

export function CompoundBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 80 120" width={size} className={className} role="img" aria-label="Compound-Bogen">
      {/* Wurfarme + Cams */}
      <circle cx="40" cy="15" r="6" fill="none" stroke="#1F1F1F" strokeWidth="1.5" />
      <circle cx="40" cy="85" r="6" fill="none" stroke="#1F1F1F" strokeWidth="1.5" />
      {/* Mittelteil — gerader Riser */}
      <line x1="40" y1="21" x2="40" y2="79" stroke="#6B4226" strokeWidth="4" strokeLinecap="round" />
      {/* String — Doppellinie */}
      <line x1="40" y1="15" x2="40" y2="85" stroke="#888" strokeWidth="0.4" />
      <path d="M 34 15 L 34 50 L 40 55 L 34 60 L 34 85" fill="none" stroke="#888" strokeWidth="0.6" />
      {/* Scope */}
      <line x1="40" y1="50" x2="52" y2="38" stroke="#1F1F1F" strokeWidth="1.2" />
      <circle cx="52" cy="38" r="3" fill="none" stroke="#1F1F1F" strokeWidth="0.9" />
      <circle cx="52" cy="38" r="1" fill="#C0464F" />
    </svg>
  );
}

export function BarebowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 80 120" width={size} className={className} role="img" aria-label="Blankbogen / Barebow">
      <path d="M 40 10 C 22 25, 22 45, 40 50 C 22 55, 22 75, 40 90" fill="none" stroke="#6B4226" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 10 C 35 22, 38 40, 40 50 C 42 60, 35 78, 40 90" fill="none" stroke="#888" strokeWidth="0.6" />
      {/* Kein Visier, kein Stabilisator — bewusst */}
    </svg>
  );
}

export function TraditionalBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 80 120" width={size} className={className} role="img" aria-label="Traditioneller Bogen / Langbogen">
      {/* D-shaped Langbogen */}
      <path d="M 40 5 C 28 30, 28 70, 40 95" fill="none" stroke="#6B4226" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="5" x2="40" y2="95" stroke="#888" strokeWidth="0.6" />
    </svg>
  );
}

// ─── Pflöcke-Visualisierung ─────────────────────────────────────────────────
export function PegStakeSVG({ color, label, size = 60 }: { color: string; label: string; size?: number }) {
  return (
    <svg viewBox="0 0 60 100" width={size} role="img" aria-label={`${label}-Pflock`}>
      {/* Boden — stilisiert */}
      <ellipse cx="30" cy="92" rx="20" ry="4" fill="#6B4226" opacity="0.3" />
      {/* Pflock — Holzpfahl */}
      <rect x="25" y="40" width="10" height="50" fill="#6B4226" stroke="#3F2715" strokeWidth="0.8" rx="1" />
      {/* Spitze unten */}
      <polygon points="25,90 30,98 35,90" fill="#3F2715" />
      {/* Farbiger Kopf */}
      <circle cx="30" cy="35" r="14" fill={color} stroke="#3F2715" strokeWidth="1" />
      <text x="30" y="38" textAnchor="middle" fontSize="6" fontWeight="bold" fill={color === "#FFFFFF" || color === "#F5C137" ? "#1F1F1F" : "#FFFFFF"}>
        {label.charAt(0)}
      </text>
    </svg>
  );
}

// ─── Helper: kleine Beschriftung mit Pfeil-Linie ────────────────────────────
function Label({ x, y, text, color, anchor }: { x: number; y: number; text: string; color: string; anchor: [number, number] }) {
  return (
    <>
      <line x1={x} y1={y} x2={anchor[0]} y2={anchor[1]} stroke={color} strokeWidth="0.5" strokeDasharray="1.5,1" />
      <text x={x} y={y} textAnchor="middle" fontSize="6" fill={color} fontWeight="600">{text}</text>
    </>
  );
}

// ─── Section-Wrapper: Illustration + Inhalt nebeneinander auf Desktop ───────
export function HelpIllustrationBox({
  illustration,
  caption,
  children,
}: {
  illustration: ReactNode;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card-sunken">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="shrink-0 mx-auto sm:mx-0">
          {illustration}
          {caption && (
            <div className="text-xs text-muted text-center mt-1 italic">{caption}</div>
          )}
        </div>
        {children && <div className="flex-1 min-w-0 text-sm">{children}</div>}
      </div>
    </div>
  );
}
