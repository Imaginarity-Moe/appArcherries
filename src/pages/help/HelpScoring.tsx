export default function HelpScoring() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Wertungssysteme</h1>

      <section>
        <h2 className="text-lg font-semibold">3D nach WA / DSB</h2>
        <ul className="text-forest-700 dark:text-forest-300 list-disc pl-5 space-y-1 mt-2">
          <li><b>2 Pfeile</b> pro Tier, beide werden gewertet</li>
          <li>Innerstes Kill = <span className="score">11</span></li>
          <li>Zweiter Ring = <span className="score">10</span></li>
          <li>Äußerer Ring = <span className="score">8</span></li>
          <li>Körpertreffer = <span className="score">5</span></li>
          <li>Fehl / Horn / Huf = <span className="score">0</span></li>
          <li>Linie zählt höher: Berührung reicht für die bessere Zone</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-4">3D nach IFAA (Standard 3-Pfeil-Runde)</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-2">
          Bis zu 3 Pfeile pro Tier, aber <b>nur der erste treffende</b> Pfeil zählt.
          Wertung hängt davon ab, der wievielte Pfeil getroffen hat:
        </p>
        <table className="w-full mt-3 text-sm border border-forest-100 rounded-xl overflow-hidden">
          <thead className="bg-sunken">
            <tr>
              <th className="text-left p-2">Pfeil</th>
              <th className="text-left p-2">Vital (Kill)</th>
              <th className="text-left p-2">Wound (Körper)</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            <tr><td className="p-2">1.</td><td className="p-2 score">20</td><td className="p-2 score">18</td></tr>
            <tr className="bg-sunken/50"><td className="p-2">2.</td><td className="p-2 score">16</td><td className="p-2 score">14</td></tr>
            <tr><td className="p-2">3.</td><td className="p-2 score">12</td><td className="p-2 score">10</td></tr>
          </tbody>
        </table>
        <p className="text-forest-700 dark:text-forest-300 text-sm mt-2 italic">
          Linie zählt niedriger — der Pfeil muss die bessere Zone deutlich anreißen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-4">Feldbogen WA</h2>
        <ul className="text-forest-700 dark:text-forest-300 list-disc pl-5 space-y-1 mt-2">
          <li><b>24 Scheiben × 3 Pfeile = 72 Pfeile</b></li>
          <li>Wertung pro Pfeil: 6 (innen) – 5 – 4 – 3 – 2 – 1 – 0 (Fehl)</li>
          <li>Center-X zählt als 6, dient aber als Tie-Break</li>
          <li>12 markierte + 12 unmarkierte Distanzen, vier Auflagen-Durchmesser</li>
        </ul>
      </section>
    </div>
  );
}
