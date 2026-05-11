export default function HelpGlossary() {
  const terms: Array<[string, string]> = [
    ["Spot", "Innerster Gold-Ring der Wettkampf-Auflage (Halle / Outdoor 10/X)."],
    ["X-Ring", "Innerstes Feld der Auflage — zählt wie Maximum, dient bei Gleichstand als Tie-Break."],
    ["Killzone", "Beim 3D-Tier das markierte Trefferfeld im Bereich der inneren Organe."],
    ["Vital / Wound", "Bei IFAA: Vital = Kill-Zone, Wound = restlicher Körper."],
    ["Pflock", "Markierung im Boden, von der aus geschossen wird. Farbe = Klasse."],
    ["Passe", "Gruppe von zusammen geschossenen Pfeilen (z.B. 6 Pfeile beim WA-Outdoor)."],
    ["Auflage", "Papier- oder Pappscheibe mit aufgedrucktem Zielmuster (Field, Halle, FITA)."],
    ["Recurve", "Bogen mit nach vorn gebogenen Wurfarm-Spitzen. Wettkampfstandard."],
    ["Compound", "Cam-Bogen mit Kraft-Reduktion (Let-Off) am Auszug. Höchste Präzision."],
    ["Blankbogen", "Recurve ohne Zielhilfe und ohne Stabilisator."],
    ["Stringwalking", "Visiertechnik bei Blankbogen: Position des Auszugsfingers an der Sehne variiert je Distanz."],
    ["Auszug", "Vorgang des Bogenspannens. Die Auszugslänge ist die nominale Länge zum Ankerpunkt."],
    ["Ankerpunkt", "Wiederholbarer Bezugspunkt am Kopf (Mundwinkel, Wangenknochen), bei dem die Sehne angelegt wird."],
    ["Spine", "Steifigkeit eines Pfeils — muss zur Bogenstärke und Auszugslänge passen."],
    ["Befiederung", "Federn am hinteren Pfeilende, stabilisieren den Flug."],
  ];
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Glossar</h1>
      <dl className="space-y-3">
        {terms.map(([term, def]) => (
          <div key={term} className="card-sunken">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-sm text-forest-700 dark:text-forest-300 mt-1">{def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
