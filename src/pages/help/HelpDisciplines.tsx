export default function HelpDisciplines() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Disziplinen</h1>

      <section>
        <h2 className="text-lg font-semibold mt-2">3D-Parcours</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Auf einem 3D-Parcours stehen ca. 28 lebensgroße Tierattrappen aus Kunstschaum
          im Wald. Pro Station schießt du eine festgelegte Anzahl Pfeile aus der durch
          den Pflock vorgegebenen Distanz. Die Wertung hängt davon ab, in welche Zone
          (Kill / Körper / Daneben) der Pfeil eindringt — und beim IFAA-System auch davon,
          wievielter Pfeil getroffen hat.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-4">Feldbogen (Field-Archery)</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Auf 24 Scheiben werden je 3 Pfeile geschossen, abwechselnd markierte und
          unmarkierte Distanzen. Auflagen gibt es in vier Größen (Ø 20 / 40 / 60 / 80 cm).
          Wertung ist klassisch: Mitte gleich 6 (Center-X), dann 5-4-3-2-1, alles außerhalb
          ist 0.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-4">Scheibenschießen</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Frei konfigurierbares Format für Halle, Outdoor oder Training. Du wählst Distanz,
          Ringzahl der Scheibe, Pfeile pro <b>Aufnahme</b> und Anzahl Aufnahmen. Wertung
          wahlweise als Gesamtsumme, „Best of Legs" (Darts-Style) oder „Sets &amp; Legs"
          (Match-Modus).
        </p>
        <p className="text-forest-700 dark:text-forest-300 mt-2">
          <b>Begrifflichkeit:</b> Ein <b>Set</b> besteht aus mehreren <b>Legs</b>. Ein Leg
          besteht aus mehreren <b>Aufnahmen</b>. Eine Aufnahme besteht aus den N Pfeilen,
          die du in einem Durchgang an die Scheibe abgibst.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-4">Halle / FITA Outdoor</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Diese klassischen Wettkampf-Disziplinen sind in der App derzeit als „Einfach"-Modus
          erfasst — du trägst den Gesamtscore ein. Strukturierte Erfassung kommt in einer
          späteren Version.
        </p>
      </section>
    </div>
  );
}
