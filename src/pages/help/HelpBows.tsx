export default function HelpBows() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Bogenklassen</h1>
      <p className="text-forest-700 dark:text-forest-300">
        In der App wählst du eine von vier Hauptklassen. Spezifischere Unterscheidungen
        (Hunting-Recurve, Reiterbogen etc.) können wir später ergänzen.
      </p>

      <div className="space-y-3">
        <Bow name="Recurve" desc="Klassischer olympischer Bogen mit Visier und Stabilisator. Stark verbreitet im Wettkampf." />
        <Bow name="Compound" desc="Bogen mit Umlenkrollen (Cams), Visier mit Scope, Release-Auslöser. Hohe Präzision auf weite Distanzen." />
        <Bow name="Blankbogen / Barebow" desc="Recurve ohne Visier, ohne Stabilisator. Reduziert auf Wesentliches — gezielt wird über die Pfeilspitze oder String-Walking." />
        <Bow name="Traditionell" desc="Langbogen, Instinktivbogen, Jagdrecurve, Reiterbogen, Primitivbogen — alle Holz/Naturmaterial-Bögen ohne moderne Anbauteile, oft instinktiv geschossen." />
      </div>
    </div>
  );
}

function Bow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="card-sunken">
      <div className="font-semibold">{name}</div>
      <div className="text-sm text-forest-700 dark:text-forest-300 mt-1">{desc}</div>
    </div>
  );
}
