/**
 * Dickhornschaf-Silhouette mit Kill-Zonen, stilisiert anhand des 3D-Schaum-Ziels.
 * Tier blickt nach rechts, Standhaltung. Charakteristisch: das große gebogene Horn.
 *
 * ViewBox: 240×170 (Landscape, ähnlich Bild-Seitenverhältnis).
 * Kill-Zonen liegen auf der vorderen Schulter (Herz/Lunge), wie beim echten 3D-Ziel.
 *
 * Die `data-zone`-Attribute werden vom AnimalTargetPad-onClick gelesen, um die
 * getroffene Zone (inner_kill / outer_kill / wound / miss) zu bestimmen.
 */
export default function DickhornschafSvg() {
  return (
    <g>
      {/* Körper (wound) — bauchige Rumpf-Form */}
      <path
        data-zone="wound"
        d="M 50 75 Q 50 60 65 60 L 145 60 Q 165 60 170 72 L 172 95 Q 168 110 155 112 L 60 112 Q 48 110 48 95 Z"
        fill="#8b6f4e"
      />
      {/* Hals nach vorn (rechts) zum Kopf, wound */}
      <path
        data-zone="wound"
        d="M 165 65 Q 188 55 200 50 L 210 50 Q 215 55 213 62 L 200 75 Q 185 78 168 75 Z"
        fill="#8b6f4e"
      />
      {/* Kopf — kleines Oval rechts */}
      <ellipse data-zone="wound" cx="215" cy="55" rx="14" ry="10" fill="#8b6f4e" />
      {/* Schnauze */}
      <ellipse data-zone="wound" cx="226" cy="60" rx="6" ry="4" fill="#6b5238" />
      {/* Ohr */}
      <path data-zone="wound" d="M 210 44 Q 213 35 219 38 Q 220 44 215 47 Z" fill="#6b5238" />

      {/* Iconisches gebogenes Horn (curve back & down) — wound */}
      <path
        data-zone="wound"
        d="M 208 50 Q 195 28 175 28 Q 158 30 158 50 Q 160 65 180 65 Q 195 62 198 50"
        fill="none"
        stroke="#3d2e1f"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Horn-Ridges */}
      <path d="M 168 52 Q 174 50 178 52" fill="none" stroke="#2a1d0f" strokeWidth="1.5" />
      <path d="M 175 42 Q 181 40 186 43" fill="none" stroke="#2a1d0f" strokeWidth="1.5" />
      <path d="M 185 35 Q 191 34 196 38" fill="none" stroke="#2a1d0f" strokeWidth="1.5" />

      {/* Auge */}
      <circle cx="220" cy="53" r="1.5" fill="#1c1c1e" />

      {/* Beine (wound) — 4 stilisierte Rechtecke */}
      <rect data-zone="wound" x="62" y="108" width="9" height="38" rx="2" fill="#6b5238" />
      <rect data-zone="wound" x="82" y="108" width="9" height="38" rx="2" fill="#6b5238" />
      <rect data-zone="wound" x="140" y="108" width="9" height="38" rx="2" fill="#6b5238" />
      <rect data-zone="wound" x="158" y="108" width="9" height="38" rx="2" fill="#6b5238" />

      {/* Bauch-Highlight (weißlich) — kosmetisch */}
      <path
        data-zone="wound"
        d="M 60 105 Q 100 115 150 110 L 150 112 Q 100 118 60 112 Z"
        fill="#d4c2a0"
      />
      {/* Po-Highlight */}
      <ellipse data-zone="wound" cx="56" cy="85" rx="10" ry="14" fill="#d4c2a0" />

      {/* Schwanz (klein, am Hinterteil) */}
      <ellipse data-zone="wound" cx="46" cy="76" rx="4" ry="3" fill="#6b5238" />

      {/* === Kill-Zonen === */}
      {/* Outer Kill (Lunge) — größere Ellipse auf der vorderen Schulter */}
      <ellipse
        data-zone="outer_kill"
        cx="138"
        cy="85"
        rx="20"
        ry="15"
        fill="#b46a76"
        fillOpacity="0.85"
        stroke="#8e2c3a"
        strokeWidth="1"
      />
      {/* Inner Kill (Herz) — kleinere Ellipse zentral */}
      <ellipse
        data-zone="inner_kill"
        cx="138"
        cy="86"
        rx="9"
        ry="7"
        fill="#d4a547"
        stroke="#8e2c3a"
        strokeWidth="1.2"
      />
    </g>
  );
}
