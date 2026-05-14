export default function HelpApp() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-h1">Über die App</h1>
        <p className="text-secondary mt-2">
          Archerries ist ein Tracker für Bogensport — speziell 3D-Parcours und Feldbogen. Mobile-first, gemacht
          für draußen am Parcours, funktioniert genauso am Desktop für ruhige Auswertung.
        </p>
      </header>

      <div className="rounded-2xl bg-cherry-500/10 border border-cherry-500/20 px-4 py-3 text-sm text-primary">
        <strong className="text-cherry-500">In Entwicklung.</strong> Archerries wächst aktiv — neue Features
        landen regelmäßig live. Wenn etwas hakt oder du eine Idee hast: melden hilft. Updates erscheinen über
        einen Cherry-Banner oben im Bildschirm.
      </div>

      <section>
        <h2 className="eyebrow mb-3">Was die App bereits kann</h2>
        <ul className="text-primary list-disc pl-5 space-y-1.5">
          <li><strong>Vier Wertungssysteme:</strong> 3D-WA, 3D-IFAA, 3D-Bowhunter, Feldbogen-WA, plus „Simple" für reine Total-Eingabe</li>
          <li><strong>Bullseye-Pad:</strong> Zonen tippen statt Zahlen — Punkte werden automatisch berechnet</li>
          <li><strong>Bogen-Profile:</strong> Mehrere Bögen mit Setup-Daten speichern und beim Anlegen auswählen</li>
          <li><strong>Parcours-Verwaltung:</strong> Mit Karten-Position, Foto, öffentlich/privat</li>
          <li><strong>Stations-Fotos:</strong> Pro Station ein Foto + Marker für Pfeil-Positionen</li>
          <li><strong>Gemeinsame Runden:</strong> Per QR-Code mit Freunden scoren — auch ohne deren Account</li>
          <li><strong>PWA + Offline:</strong> Installierbar auf Homescreen, funktioniert ohne Empfang</li>
          <li><strong>Statistik:</strong> Verlauf, Personal Bests, Zonen-Verteilung, Pfeil-Konsistenz</li>
          <li><strong>Dark Mode</strong> &amp; <strong>Deutsch/Englisch</strong> umschaltbar im Profil</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Was bewusst NICHT eingebaut ist</h2>
        <ul className="text-secondary list-disc pl-5 space-y-1.5">
          <li>Keine Levels, XP oder „Streaks" — Bogensport ist meditativ, kein Endorphin-Knopf</li>
          <li>Keine Confetti-Animationen bei Treffern</li>
          <li>Keine Social-Feeds</li>
          <li>Misses werden nicht rot dargestellt — verfehlt ist neutral, nicht „falsch"</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Hosting &amp; Daten</h2>
        <p className="text-primary">
          Die App läuft auf einem IONOS-Server in Deutschland. Deine Daten liegen in einer MySQL-Datenbank.
          Bilder werden auf max. 1600 px Breite reskaliert und neu komprimiert. Avatare sind auf 1 MB beschränkt
          und werden quadratisch zugeschnitten.
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Geplante Features</h2>
        <ul className="text-secondary list-disc pl-5 space-y-1.5">
          <li>Equipment-Loadout pro Training — Stats-Filter pro einzelnem Bogen</li>
          <li>Material-Tracking (Pfeile, Sehnen, Wechsel-Daten)</li>
          <li>Heatmap-Ansicht: Pfeil-Positionen über mehrere Trainings auf dem gleichen Tier</li>
          <li>Druckbare Scorecards</li>
          <li>Voice-Notes &amp; Wetter-Felder strukturiert</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Feedback</h2>
        <p className="text-secondary text-sm">
          Hast du Wünsche oder Fehler entdeckt? Schreib eine Mail an{" "}
          <a href="mailto:noreply@creativecluster.de" className="text-cherry-500 hover:underline">
            noreply@creativecluster.de
          </a>{" "}
          — mit Screenshot oder kurzer Beschreibung. Danke!
        </p>
      </section>
    </div>
  );
}
