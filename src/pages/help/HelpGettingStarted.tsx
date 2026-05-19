import { Link } from "react-router-dom";

export default function HelpGettingStarted() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Erste Schritte</h1>

      <section>
        <h2 className="text-lg font-semibold">1. Neues Training anlegen</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Tippe auf den großen <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-copper-500 text-white font-bold text-xs align-middle">+</span> in der unteren Mitte. Wähle in drei Schritten Disziplin, Bogen und (für 3D) Pflock/Distanz.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. Stationen / Aufnahmen schießen &amp; eintragen</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Tippe auf „<b>+ Station 1 hinzufügen</b>" (bei 3D / Field) bzw. „<b>+ Aufnahme 1 hinzufügen</b>"
          (beim Scheibenschießen). Du landest auf dem <b>Bullseye-Pad</b> — tippe für jeden Pfeil einen
          Ring. Die Punkte werden live oben angezeigt. Mit „Speichern" geht's zur nächsten.
        </p>
        <p className="text-forest-700 dark:text-forest-300 mt-2 italic">
          Tipp: Auf dem Parcours funktioniert die App einhändig mit dem Daumen. Die Tap-Targets sind extra groß, auch mit Winterhandschuhen bedienbar.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">3. Training beenden</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Wenn alle Durchgänge erfasst sind, tippe „Training beenden". Du siehst eine <b>Auswertungs-Seite</b> mit deinem Gesamt-Score, Verlauf und Trefferzonen-Analyse.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">4. Parcours speichern (optional)</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Lege deine Stamm-Parcours unter <Link to="/parcours" className="text-copper-500 underline">Parcours</Link> an. Mit Bild, Karten-Pin und optional als öffentlich für andere Schützen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">5. Statistik einsehen</h2>
        <p className="text-forest-700 dark:text-forest-300 mt-1">
          Unter <Link to="/stats" className="text-copper-500 underline">Statistik</Link> findest du deinen Punkte-Verlauf, persönliche Bestleistungen und Zonen-Verteilung. Mit Filtern kannst du z.B. nur „3D-WA mit Recurve" ansehen.
        </p>
      </section>
    </div>
  );
}
