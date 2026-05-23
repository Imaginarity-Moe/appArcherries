/**
 * Statische SVG-Visualisierungen für die Hilfe-Seiten.
 * Kein User-Interaction, nur didaktische Diagramme.
 *
 * Farben sind explizit gesetzt damit Light/Dark-Mode beide hübsch aussehen —
 * die Auflagen-Originalfarben sind ohnehin festgelegt durch die Verbände.
 */
import type { ReactNode } from "react";

type Props = { size?: number; className?: string };

// ─── 3D-Tier (Reh/Hirsch-Profil mit klar abgegrenzten Kill-Zonen) ──────────
export function AnimalTargetSVG({ size = 240, className = "" }: Props) {
  return (
    <svg viewBox="0 0 240 180" width={size} className={className} role="img" aria-label="3D-Tierattrappe (Reh) mit Trefferzonen">
      {/* Schatten unter dem Tier */}
      <ellipse cx="130" cy="170" rx="80" ry="5" fill="#000" opacity="0.12" />

      {/* ─── Reh-Silhouette nach LINKS gerichtet (Kopf links, Schwanz rechts) ─── */}

      {/* Hinterbeine — Standbein vorn, Spielbein leicht versetzt */}
      <path d="M 178 105 L 175 158 L 180 158 L 184 110 Z" fill="#6B4226" stroke="#3F2715" strokeWidth="1" strokeLinejoin="round" />
      <path d="M 193 108 L 192 158 L 197 158 L 200 113 Z" fill="#5A3520" stroke="#3F2715" strokeWidth="1" strokeLinejoin="round" />

      {/* Vorderbeine — analog, etwas dünner */}
      <path d="M 80 100 L 76 158 L 82 158 L 86 105 Z" fill="#6B4226" stroke="#3F2715" strokeWidth="1" strokeLinejoin="round" />
      <path d="M 96 103 L 94 158 L 100 158 L 102 108 Z" fill="#5A3520" stroke="#3F2715" strokeWidth="1" strokeLinejoin="round" />

      {/* Rumpf — ovaler Körper mit leichter Rücken-Schwingung */}
      <path
        d="M 70 95
           C 65 75, 80 60, 110 60
           L 165 60
           C 195 60, 215 75, 210 100
           C 210 112, 200 118, 185 117
           L 90 117
           C 78 117, 68 110, 70 95 Z"
        fill="#7B4D2E"
        stroke="#3F2715"
        strokeWidth="1.5"
      />

      {/* Hals — schräg nach oben-links zum Kopf */}
      <path
        d="M 68 85
           C 60 70, 50 50, 38 35
           L 32 40
           C 45 60, 55 78, 64 95 Z"
        fill="#7B4D2E"
        stroke="#3F2715"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Kopf — länglich, leicht nach unten geneigt */}
      <ellipse cx="28" cy="35" rx="14" ry="8" transform="rotate(-15 28 35)" fill="#7B4D2E" stroke="#3F2715" strokeWidth="1.3" />

      {/* Nase — dunkler Punkt vorn */}
      <ellipse cx="16" cy="40" rx="2.5" ry="1.8" fill="#2A1810" />
      {/* Auge */}
      <circle cx="30" cy="32" r="1.4" fill="#1A1208" />

      {/* Ohren — zwei kleine Spitzen am Kopf */}
      <path d="M 32 25 L 36 14 L 39 26 Z" fill="#6B4226" stroke="#3F2715" strokeWidth="0.8" />
      <path d="M 38 26 L 43 17 L 45 28 Z" fill="#5A3520" stroke="#3F2715" strokeWidth="0.8" />

      {/* Geweih — angedeutet als zwei kleine Y-Linien */}
      <path d="M 38 20 L 34 10 M 38 20 L 42 8 M 42 8 L 46 6 M 42 8 L 40 4" fill="none" stroke="#3F2715" strokeWidth="1.2" strokeLinecap="round" />

      {/* Schwanz — kleiner Stub hinten oben */}
      <path d="M 208 78 Q 218 76 220 70 Q 222 80 215 86 Z" fill="#7B4D2E" stroke="#3F2715" strokeWidth="0.8" />

      {/* ─── Trefferzonen — am Brustkorb hinter dem Vorderbein ─── */}
      {/* Wound (großer äußerer Oval, gelb-gold) */}
      <ellipse cx="125" cy="92" rx="38" ry="22" fill="#D4A547" fillOpacity="0.85" stroke="#3F2715" strokeWidth="0.8" />
      {/* Outer Kill (mittlerer Oval, cherry) */}
      <ellipse cx="128" cy="92" rx="22" ry="13" fill="#C0464F" fillOpacity="0.95" stroke="#3F2715" strokeWidth="0.8" />
      {/* Inner Kill (kleiner Spot, schwarz) */}
      <ellipse cx="128" cy="92" rx="8" ry="5" fill="#1F1F1F" stroke="#FFFFFF" strokeWidth="0.7" />
      {/* X-Markierung mittig */}
      <text x="128" y="95" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="monospace">X</text>

      {/* ─── Beschriftungen ─── */}
      <Label x={205} y={48} text="Wound" color="#7A5C1F" anchor={[160, 80]} />
      <Label x={210} y={138} text="Outer Kill" color="#7A2532" anchor={[148, 98]} />
      <Label x={55} y={155} text="Inner Kill" color="#1A1A1A" anchor={[125, 95]} />
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

// ─── Bogen-Silhouetten — anatomisch erkennbar ──────────────────────────────

// Recurve: Riser mittig, Wurfarme mit recurved Tips, Visier vorn, Stabilisator + V-Bar
export function RecurveBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 140" width={size} className={className} role="img" aria-label="Recurve-Bogen">
      {/* Sehne — gerade vertikal */}
      <line x1="50" y1="14" x2="50" y2="126" stroke="#888" strokeWidth="0.5" />

      {/* Wurfarme — geschwungen mit recurved Tips (Enden biegen nach vorn) */}
      <path d="M 50 14 Q 30 28 34 50 Q 38 65 50 70"
            fill="none" stroke="#3F2715" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 50 70 Q 38 75 34 90 Q 30 112 50 126"
            fill="none" stroke="#3F2715" strokeWidth="3.5" strokeLinecap="round" />

      {/* Riser — rechteckiges Mittelteil */}
      <rect x="46" y="58" width="8" height="24" rx="2" fill="#1F1F1F" stroke="#000" strokeWidth="0.5" />

      {/* Visierfenster mit Korn vorn */}
      <line x1="50" y1="62" x2="80" y2="55" stroke="#1F1F1F" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="80" cy="55" r="3" fill="none" stroke="#1F1F1F" strokeWidth="1" />
      <circle cx="80" cy="55" r="0.8" fill="#C0464F" />

      {/* Pfeilauflage */}
      <circle cx="55" cy="70" r="1.2" fill="#666" />

      {/* Langer Stabilisator nach vorn (lange Stange) */}
      <line x1="54" y1="78" x2="92" y2="92" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="92" r="2.5" fill="#1F1F1F" />

      {/* V-Bar mit zwei kurzen Seitenstabis */}
      <line x1="54" y1="78" x2="68" y2="108" stroke="#3F3F3F" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="68" cy="108" r="2" fill="#3F3F3F" />

      {/* Griff/Wickelung */}
      <rect x="46" y="66" width="8" height="10" fill="#6B4226" />
    </svg>
  );
}

// Compound: zwei sichtbare Cams oben/unten, gerader Riser, Cable Guard, Scope mit Peep
export function CompoundBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 140" width={size} className={className} role="img" aria-label="Compound-Bogen">
      {/* Sehne (gerade) + Buss-Kabel (gebogen, läuft über Cable Guard) */}
      <line x1="50" y1="18" x2="50" y2="122" stroke="#888" strokeWidth="0.5" />

      {/* Top Cam — größeres Rad */}
      <circle cx="50" cy="18" r="9" fill="#222" stroke="#000" strokeWidth="1" />
      <circle cx="50" cy="18" r="4.5" fill="none" stroke="#888" strokeWidth="0.6" />
      <circle cx="50" cy="18" r="1" fill="#888" />

      {/* Bottom Cam */}
      <circle cx="50" cy="122" r="9" fill="#222" stroke="#000" strokeWidth="1" />
      <circle cx="50" cy="122" r="4.5" fill="none" stroke="#888" strokeWidth="0.6" />
      <circle cx="50" cy="122" r="1" fill="#888" />

      {/* Wurfarme — kurze gerade Stutzen die in die Cams gehen */}
      <rect x="46" y="22" width="8" height="16" fill="#3F2715" stroke="#000" strokeWidth="0.5" />
      <rect x="46" y="102" width="8" height="16" fill="#3F2715" stroke="#000" strokeWidth="0.5" />

      {/* Riser — gerader Mittelteil */}
      <rect x="46" y="40" width="8" height="58" rx="1" fill="#1F1F1F" stroke="#000" strokeWidth="0.5" />

      {/* Cable Guard — biegt die Kabel nach rechts */}
      <line x1="54" y1="58" x2="60" y2="70" stroke="#3F3F3F" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 60 25 Q 65 58 60 100" fill="none" stroke="#666" strokeWidth="0.7" />

      {/* Griff */}
      <rect x="46" y="62" width="8" height="14" fill="#6B4226" />

      {/* Scope (großer Durchmesser, mit Cross-Hair) */}
      <line x1="54" y1="65" x2="78" y2="55" stroke="#1F1F1F" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="82" cy="50" r="6" fill="#0A0A0A" stroke="#1F1F1F" strokeWidth="1" />
      <line x1="76" y1="50" x2="88" y2="50" stroke="#C0464F" strokeWidth="0.5" />
      <line x1="82" y1="44" x2="82" y2="56" stroke="#C0464F" strokeWidth="0.5" />
      <circle cx="82" cy="50" r="1" fill="#D4A547" />

      {/* Peep in der Sehne */}
      <circle cx="50" cy="55" r="1.5" fill="none" stroke="#888" strokeWidth="0.6" />

      {/* Pfeilauflage */}
      <circle cx="55" cy="72" r="1.2" fill="#666" />

      {/* Stabilisator */}
      <line x1="54" y1="78" x2="92" y2="90" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="90" r="2.5" fill="#1F1F1F" />
    </svg>
  );
}

// Barebow: Recurve-Wurfarme, Riser ohne Visier/Stabi, optional kleines Gegengewicht
export function BarebowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 140" width={size} className={className} role="img" aria-label="Blankbogen / Barebow">
      {/* Sehne */}
      <line x1="50" y1="14" x2="50" y2="126" stroke="#888" strokeWidth="0.5" />

      {/* Recurved Wurfarme */}
      <path d="M 50 14 Q 30 28 34 50 Q 38 65 50 70"
            fill="none" stroke="#3F2715" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 50 70 Q 38 75 34 90 Q 30 112 50 126"
            fill="none" stroke="#3F2715" strokeWidth="3.5" strokeLinecap="round" />

      {/* Riser — gerader Mittelteil, schlicht */}
      <rect x="46" y="58" width="8" height="24" rx="2" fill="#1F1F1F" stroke="#000" strokeWidth="0.5" />

      {/* Griff/Wickelung */}
      <rect x="46" y="66" width="8" height="10" fill="#6B4226" />

      {/* Pfeilauflage */}
      <circle cx="55" cy="70" r="1.2" fill="#666" />

      {/* Internes Gegengewicht (klein, im Mittelteil — keine externen Stabis) */}
      <circle cx="50" cy="80" r="2" fill="#444" />
    </svg>
  );
}

// Traditional / Langbogen: einteilig, D-förmig, Wickelung am Griff
export function TraditionalBowSVG({ size = 80, className = "" }: Props) {
  return (
    <svg viewBox="0 0 100 140" width={size} className={className} role="img" aria-label="Langbogen / Traditioneller Bogen">
      {/* Sehne */}
      <line x1="50" y1="10" x2="50" y2="130" stroke="#888" strokeWidth="0.5" />

      {/* D-Form — sanfter Bogen ohne recurve */}
      <path
        d="M 50 10 C 36 30, 32 60, 38 70 C 32 80, 36 110, 50 130"
        fill="none"
        stroke="#6B4226"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Holzmaserung — feine helle Linie */}
      <path
        d="M 50 14 C 38 32, 34 60, 40 70 C 34 80, 38 108, 50 126"
        fill="none"
        stroke="#A87850"
        strokeWidth="0.6"
        opacity="0.7"
      />

      {/* Wickelung am Griff (Leder-/Stoffwicklung) */}
      <rect x="40" y="62" width="8" height="16" fill="#3F2715" />
      <line x1="40" y1="65" x2="48" y2="65" stroke="#6B4226" strokeWidth="0.5" />
      <line x1="40" y1="68" x2="48" y2="68" stroke="#6B4226" strokeWidth="0.5" />
      <line x1="40" y1="71" x2="48" y2="71" stroke="#6B4226" strokeWidth="0.5" />
      <line x1="40" y1="74" x2="48" y2="74" stroke="#6B4226" strokeWidth="0.5" />

      {/* Pfeilauflage — über die Hand (klassisch ohne mechanische Rest) */}
      <line x1="40" y1="62" x2="36" y2="68" stroke="#A87850" strokeWidth="0.8" />
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
