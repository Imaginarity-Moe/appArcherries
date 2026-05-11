export default function HelpPegs() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Pflöcke & Distanzen</h1>
      <p className="text-forest-700 dark:text-forest-300">
        Auf 3D-Parcours markieren farbige Pflöcke die Position, von der geschossen wird.
        Welcher Pflock für dich gilt, hängt von deiner Bogenklasse und gegebenenfalls
        deinem Alter ab.
      </p>

      <div className="space-y-3">
        <PegRow color="#3B82F6" label="Blau" desc="Visiere Bögen — Recurve mit Visier, Compound. Distanzen unmarkiert typisch 10–45 m." />
        <PegRow color="#DC2626" label="Rot" desc="Traditionelle Bögen — Blank, Lang, Instinktiv, Trad. Unmarkiert typisch 5–30 m." />
        <PegRow color="#F5C137" label="Gelb" desc="Jugend, je nach Klasse." />
        <PegRow color="#FFFFFF" label="Weiß" desc="Kinder / Anfänger, kürzeste Distanzen." />
      </div>

      <p className="text-sm text-forest-700 dark:text-forest-300 italic mt-4">
        Hinweis: Pflock-Regelungen variieren leicht zwischen Verbänden (DSB/WA, DFBV/IFAA) und
        zwischen einzelnen Parcours. Im Zweifel beim Veranstalter nachsehen.
      </p>
    </div>
  );
}

function PegRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-soft"
        style={{ backgroundColor: color }}
      />
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-sm text-forest-700 dark:text-forest-300">{desc}</div>
      </div>
    </div>
  );
}
