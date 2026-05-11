export default function HelpApp() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Über die App</h1>
      <p className="text-forest-700 dark:text-forest-300">
        <b>Archerries</b> ist ein Tracker für Bogensport, speziell 3D-Parcours und Feldbogen.
        Die App ist mobile-first gebaut — dafür gemacht, draußen auf dem Parcours mit dem
        Smartphone benutzt zu werden — und funktioniert genauso am Desktop, wenn du
        Statistiken in Ruhe anschauen willst.
      </p>

      <section>
        <h2 className="text-lg font-semibold mt-3">Was wir bewusst NICHT eingebaut haben</h2>
        <ul className="text-forest-700 dark:text-forest-300 list-disc pl-5 space-y-1 mt-1">
          <li>Keine Levels, XP oder „Streaks" — Bogensport ist meditativ, kein Endorphin-Knopf</li>
          <li>Keine Confetti-Animationen bei Treffern</li>
          <li>Keine Social-Feeds</li>
          <li>Misses werden nicht rot dargestellt — verfehlt ist neutral, nicht „falsch"</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-3">Hosting & Daten</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Die App läuft auf einem IONOS-Server in Deutschland. Deine Daten liegen in einer
          MySQL-Datenbank. Bilder werden zu max. 1600 px Breite reskaliert und komprimiert.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mt-3">Geplante Features</h2>
        <ul className="text-forest-700 dark:text-forest-300 list-disc pl-5 space-y-1 mt-1">
          <li>Gemeinsame Runden via QR-Code-Einladung — Freunde scoren mit</li>
          <li>Detailliertere 3D-Bowhunter-Wertung</li>
          <li>Foto pro Station (Heatmap)</li>
          <li>Offline-Modus mit Sync</li>
          <li>Druckbare Scorecards</li>
        </ul>
      </section>
    </div>
  );
}
