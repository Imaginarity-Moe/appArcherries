import { PegStakeSVG } from "./HelpIllustrations";

/**
 * Pflöcke & Distanzen — visualisiert + Distanz-Tabelle pro Bogenklasse.
 * Distanzen sind orientierende Richtwerte — Verbände regeln das je nach
 * Veranstaltung leicht unterschiedlich.
 */
export default function HelpPegs() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Pflöcke &amp; Distanzen</h1>
      <p className="text-secondary">
        Auf 3D-Parcours markieren farbige Pflöcke die Position, von der geschossen wird.
        Welcher Pflock für dich gilt, hängt von deiner <b>Bogenklasse</b> und gegebenenfalls
        deinem Alter ab.
      </p>

      {/* Pflock-Übersicht */}
      <section className="card-sunken">
        <h2 className="eyebrow mb-3">Die vier Pflock-Farben</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PegCard color="#3B82F6" label="Blau" subtitle="Visiere" />
          <PegCard color="#DC2626" label="Rot" subtitle="Trad / Blank" />
          <PegCard color="#F5C137" label="Gelb" subtitle="Jugend" />
          <PegCard color="#FFFFFF" label="Weiß" subtitle="Kinder / Anfänger" />
        </div>
      </section>

      {/* Distanztabelle */}
      <section className="space-y-2">
        <h2 className="eyebrow">Richtwerte für die Distanzen (3D)</h2>
        <div className="card-sunken text-sm overflow-x-auto">
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-secondary text-xs uppercase border-b border-hairline">
                <th className="text-left pb-2 pr-3">Pflock</th>
                <th className="text-right pb-2 px-2">Min</th>
                <th className="text-right pb-2 px-2">Max</th>
                <th className="text-left pb-2 pl-3 normal-case">Typisch für</th>
              </tr>
            </thead>
            <tbody className="text-primary">
              <PegRow color="#3B82F6" label="Blau"  min="10 m" max="45 m" hint="Recurve + Visier, Compound" />
              <PegRow color="#DC2626" label="Rot"   min="5 m"  max="35 m" hint="Trad, Lang, Blank, Instinktiv" />
              <PegRow color="#F5C137" label="Gelb"  min="3 m"  max="20 m" hint="Jugend &amp; Schüler" />
              <PegRow color="#FFFFFF" label="Weiß"  min="3 m"  max="15 m" hint="Kinder &amp; Anfänger" />
            </tbody>
          </table>
        </div>
        <p className="text-secondary text-xs italic">
          Die Distanzen variieren leicht zwischen Verbänden (DSB/WA, DFBV/IFAA) und auch zwischen
          einzelnen Parcours. Im Zweifel beim Veranstalter nachsehen.
        </p>
      </section>

      {/* Markiert vs. unmarkiert */}
      <section className="space-y-2">
        <h2 className="eyebrow">Markierte vs. unmarkierte Distanzen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card-sunken">
            <p className="font-semibold text-sm">Markiert</p>
            <p className="text-sm text-secondary mt-1">
              Die Distanz steht am Pflock (z.B. „14 m"). Vorteil: du kannst gezielt visieren
              ohne Schätzfehler. Typisch bei Anfänger­veranstaltungen und WA-Field.
            </p>
          </div>
          <div className="card-sunken">
            <p className="font-semibold text-sm">Unmarkiert</p>
            <p className="text-sm text-secondary mt-1">
              Keine Distanz angegeben — du schätzt selbst. Klassisch bei IFAA-Hunter und
              ambitionierten 3D-Parcours. Macht 3D anspruchsvoll.
            </p>
          </div>
        </div>
        <p className="text-secondary text-xs italic">
          In der App kannst du beim Anlegen eines Trainings auf einem Parcours den
          „Distanzen-markiert"-Toggle setzen.
        </p>
      </section>

      {/* Standpunkt-Regeln */}
      <section className="space-y-2">
        <h2 className="eyebrow">Standpunkt-Regeln</h2>
        <p className="text-sm text-secondary">
          Wo genau du beim Schuss stehen musst, regeln die Verbände unterschiedlich. Die
          Kernregeln:
        </p>

        <div className="card-sunken space-y-1.5">
          <p className="font-semibold text-sm">WA / DSB</p>
          <p className="text-sm text-secondary">
            Beide Füße stehen <b>auf einer gedachten Linie</b> durch den Pflock — die Schießlinie
            verläuft quer zur Schussrichtung am Pflock entlang. Der Pflock selbst markiert die
            Linie, du stehst hinter ihm. Niemand darf näher zur Scheibe stehen als der Pflock.
          </p>
        </div>

        <div className="card-sunken space-y-1.5">
          <p className="font-semibold text-sm">IFAA / DFBV</p>
          <p className="text-sm text-secondary">
            Mindestens <b>ein Fuß muss den Pflock berühren</b> oder direkt daneben aufliegen (es gilt
            der Standpunkt am Pflock). Der zweite Fuß kann frei stehen, solange er nicht näher zur
            Scheibe ist als der Pflock.
          </p>
        </div>

        <div className="card-sunken space-y-1.5">
          <p className="font-semibold text-sm">Was passiert bei Verstößen?</p>
          <p className="text-sm text-secondary">
            Schiedsrichter können einen Schuss <b>annullieren</b> (= 0 Punkte) wenn der Standpunkt
            falsch war. Bei Wiederholung kann es zu Disqualifikation einer Runde kommen.
            Bei Übungs- und Trainingsrunden ist das meist egal, bei Wettkämpfen aber strikt.
          </p>
        </div>

        <p className="text-sm text-secondary italic">
          Im Zweifel beim Schiedsrichter / Veranstalter nachfragen — manche Parcours haben
          zusätzliche Hausregeln (z.B. Pflock-Markierungslinie auf dem Boden).
        </p>
      </section>

      {/* Etikette & Fairness */}
      <section className="space-y-2">
        <h2 className="eyebrow">Pflock-Etikette</h2>
        <ul className="list-disc pl-5 text-primary space-y-1.5">
          <li>
            <b>Den richtigen Pflock wählen.</b> Vor dem Schießen kontrollieren — wenn du
            Recurve mit Visier schießt und am Roten Pflock startest, gilt deine Wertung nicht.
            Bei Recurve/Compound ist standardmäßig <b>Blau</b>, bei Trad/Blank <b>Rot</b>.
          </li>
          <li>
            <b>Distanz nicht aktiv messen.</b> Auf unmarkierten Parcours (IFAA Hunter,
            unmarkierte 3D-Veranstaltungen) ist das Verwenden von Laser-Entfernungsmessern oder
            das aktive Ausschreiten der Distanz <b>regelwidrig</b>. Die App nutzt deshalb auch
            kein GPS — nur deine manuelle Schätzdistanz.
          </li>
          <li>
            <b>Pfeile erst ziehen wenn alle aus der Gruppe fertig sind.</b> Sicherheits-Standard
            auf allen Veranstaltungen.
          </li>
          <li>
            <b>Hinter dem Pflock warten.</b> Wer nicht am Pflock steht, hält Abstand zur
            Schießlinie — sonst Ablenkung und Sicherheitsrisiko.
          </li>
        </ul>
      </section>
    </div>
  );
}

function PegCard({ color, label, subtitle }: { color: string; label: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <PegStakeSVG color={color} label={label} size={56} />
      <div className="font-semibold text-sm mt-1">{label}</div>
      <div className="text-xs text-muted">{subtitle}</div>
    </div>
  );
}

function PegRow({ color, label, min, max, hint }: { color: string; label: string; min: string; max: string; hint: string }) {
  return (
    <tr className="border-b border-hairline last:border-0">
      <td className="py-2 pr-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-warm-graphite/30" style={{ backgroundColor: color }} />
          {label}
        </span>
      </td>
      <td className="py-2 px-2 text-right">{min}</td>
      <td className="py-2 px-2 text-right">{max}</td>
      <td className="py-2 pl-3 text-secondary font-sans">{hint}</td>
    </tr>
  );
}
