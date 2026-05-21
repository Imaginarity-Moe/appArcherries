import { RecurveBowSVG, CompoundBowSVG, BarebowSVG, TraditionalBowSVG } from "./HelpIllustrations";

/**
 * Bogenklassen — Silhouette + Charakteristik + typische Disziplinen.
 * Vier Hauptklassen, die in der App ausgewählt werden können.
 */
export default function HelpBows() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Bogenklassen</h1>
      <p className="text-secondary">
        In der App wählst du eine von vier Hauptklassen pro Bogen. Die Klasse beeinflusst
        Highscore-Gruppierung, voreingestellte Pflockfarbe und die typische Disziplin-Auswahl.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BowCard
          svg={<RecurveBowSVG />}
          name="Recurve"
          summary={'Olympia-Bogen mit Visier und Stabilisator. Wurfarme schwingen am Ende nach vorn („recurved").'}
          characteristics={[
            "Visier mit Korn-Punkten",
            "Lange Stabilisator-Stange + Seiten-Stabis",
            "Pfeil­abreißer + Druckpunkt",
          ]}
          disciplines={["FITA Outdoor", "Halle 18m", "3D-WA", "Field-WA"]}
          peg="Blau"
        />

        <BowCard
          svg={<CompoundBowSVG />}
          name="Compound"
          summary="Bogen mit Umlenkrollen (Cams) — Let-Off senkt das Halte­gewicht ab Vollauszug. Sehr präzise auf weite Distanzen."
          characteristics={[
            "Cams + Let-Off (50–90%)",
            "Scope mit Vergrößerung",
            "Release-Auslöser (Trigger)",
            "Peep-Sight in der Sehne",
          ]}
          disciplines={["FITA Compound", "Field-WA Compound", "3D-WA"]}
          peg="Blau"
        />

        <BowCard
          svg={<BarebowSVG />}
          name="Blankbogen / Barebow"
          summary="Recurve ohne Visier, ohne Stabilisator. Zielen über die Pfeil­spitze oder mit String-Walking."
          characteristics={[
            "Kein Visier, kein Stabi",
            "Gegen­gewicht innerhalb des Mittelteils erlaubt",
            "String-Walking-Marker am Pfeil",
          ]}
          disciplines={["3D · Barebow", "Field-WA Barebow", "IFAA Barebow"]}
          peg="Rot"
        />

        <BowCard
          svg={<TraditionalBowSVG />}
          name="Traditionell"
          summary="Langbogen, Instinktiv­bogen, Jagd­recurve, Reiter­bogen, Primitiv­bogen — alle Holz/Naturmaterial-Bögen ohne moderne Anbau­teile."
          characteristics={[
            "Meist instinktiv geschossen",
            "Holz oder Komposit-Naturlaminat",
            "Pfeile oft Holz, Federn statt Vanes",
          ]}
          disciplines={["3D · Trad", "IFAA Longbow", "IFAA Trad Recurve"]}
          peg="Rot"
        />
      </div>

      <section className="card-sunken">
        <h2 className="eyebrow mb-2">Wie wechsele ich die Klasse?</h2>
        <p className="text-sm text-primary">
          Klasse ist eine Eigenschaft pro <b>Bogen</b>, nicht pro User. Du kannst mehrere
          Bögen verschiedener Klassen anlegen und beim Anlegen eines Trainings den passenden
          auswählen. So bleiben deine Highscores klar nach Klasse getrennt.
        </p>
      </section>

      <section className="card-sunken">
        <h2 className="eyebrow mb-2">Welche Klasse passt zu mir?</h2>
        <ul className="text-sm text-primary list-disc pl-5 space-y-1.5">
          <li>
            <b>Neu im Bogensport?</b> Meistens Recurve oder Blank — beide sind verbreitet, günstig
            einzusteigen, und decken alle Disziplinen ab.
          </li>
          <li>
            <b>Will maximale Präzision auf 50–90 m?</b> Compound. Hohe Anschaffung, aber sehr
            verzeihend.
          </li>
          <li>
            <b>Geht's um Tradition und Bauchgefühl?</b> Traditionell. Wenig Technik, viel Übung,
            schöne 3D-Erfahrung.
          </li>
          <li>
            <b>Will FITA / Olympia­bahn schießen?</b> Recurve mit Visier. Das ist die Klasse, in
            der Olympiaschützen antreten.
          </li>
        </ul>
      </section>

      <p className="text-xs text-secondary italic">
        Spezifischere Unterscheidungen (Hunting-Recurve, Reiterbogen, Asiatischer Bogen)
        können wir später als Sub-Klassen ergänzen, wenn der Bedarf steigt.
      </p>
    </div>
  );
}

function BowCard({
  svg,
  name,
  summary,
  characteristics,
  disciplines,
  peg,
}: {
  svg: React.ReactNode;
  name: string;
  summary: string;
  characteristics: string[];
  disciplines: string[];
  peg: string;
}) {
  return (
    <div className="card-sunken flex gap-3">
      <div className="shrink-0">{svg}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="font-semibold text-base">{name}</h3>
          <span className="text-xs text-muted">Pflock: <b>{peg}</b></span>
        </div>
        <p className="text-sm text-primary">{summary}</p>
        <div className="mt-2">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Merkmale</p>
          <ul className="text-xs text-secondary list-disc pl-4 space-y-0.5">
            {characteristics.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
        <div className="mt-2">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Typische Disziplinen</p>
          <div className="flex flex-wrap gap-1">
            {disciplines.map((d, i) => (
              <span key={i} className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-surface text-secondary">{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
