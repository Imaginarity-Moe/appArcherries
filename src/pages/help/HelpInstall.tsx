export default function HelpInstall() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-h1">App installieren & Offline nutzen</h1>
        <p className="text-secondary mt-2">
          Archerries kann wie eine native App auf deinem Smartphone-Homescreen installiert werden — ohne App-Store.
          Einmal installiert, läuft sie auch ohne Internetverbindung.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-3">iPhone (iOS Safari)</h2>
        <ol className="text-primary list-decimal pl-5 space-y-1.5">
          <li>Öffne <strong>https://archerries.mossig.de</strong> in <strong>Safari</strong> (nicht Chrome oder einem In-App-Browser).</li>
          <li>Tippe auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben — meist unten mittig).</li>
          <li>Scrolle im Menü zu <strong>„Zum Home-Bildschirm"</strong> und tippe darauf.</li>
          <li>Bestätige mit <strong>„Hinzufügen"</strong> oben rechts.</li>
          <li>Das Archerries-Icon erscheint auf deinem Homescreen — Tap öffnet die App im Vollbildmodus, ohne Browser-Leisten.</li>
        </ol>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Android (Chrome / Edge / Brave)</h2>
        <ol className="text-primary list-decimal pl-5 space-y-1.5">
          <li>Öffne <strong>https://archerries.mossig.de</strong> in <strong>Chrome</strong> oder einem Chromium-Browser.</li>
          <li>Tippe auf das <strong>Drei-Punkte-Menü</strong> oben rechts.</li>
          <li>Wähle <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm zufügen"</strong>.</li>
          <li>Bestätige im Dialog.</li>
          <li>Optional: viele Android-Geräte zeigen oben in der Adressleiste eine Install-Eingabeaufforderung direkt an.</li>
        </ol>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Desktop (Chrome / Edge)</h2>
        <p className="text-primary">
          In der Adressleiste rechts erscheint ein kleines Computer-mit-Pfeil-Icon — klicke darauf und bestätige
          „Installieren". Archerries läuft danach als eigenes Fenster, separat vom Browser.
        </p>
      </section>

      <div className="hairline" />

      <section>
        <h2 className="eyebrow mb-3">Offline-Funktion</h2>
        <p className="text-primary mb-3">
          Archerries funktioniert nach dem ersten Login auch ohne Internetverbindung — perfekt für Parcours mit
          Funkloch. Folgendes ist offline möglich:
        </p>
        <ul className="text-primary list-disc pl-5 space-y-1.5">
          <li><strong>Lesen:</strong> Trainings, Stationen, Parcours-Liste, Statistik, Bogenprofile</li>
          <li><strong>Schreiben:</strong> Pfeile eingeben, Stationen anlegen, Training beenden, Notizen ändern</li>
          <li><strong>Punkte-Vorschau:</strong> Werden lokal berechnet — du siehst sofort, wie viele Punkte ein Pfeil bringt</li>
        </ul>
        <p className="text-secondary mt-3 text-sm">
          Foto-Uploads (Stations- und Avatar-Bilder) benötigen eine aktive Verbindung. Versuch's später, wenn du
          wieder Empfang hast.
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Wie das funktioniert</h2>
        <p className="text-primary">
          Während du offline bist, sammelt die App deine Eingaben in einer lokalen Warteschlange. Sobald wieder
          Verbindung besteht, wird automatisch synchronisiert. Den Status erkennst du am Symbol oben rechts neben
          deinem Avatar:
        </p>
        <ul className="text-primary list-disc pl-5 space-y-1.5 mt-2">
          <li><strong>Grün:</strong> Online, alles synchron</li>
          <li><strong>Kupferrot mit Zahl:</strong> Online, X Änderungen warten auf Sync — Tap öffnet Details</li>
          <li><strong>Rot:</strong> Offline, Änderungen werden lokal gepuffert</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Speicherplatz freigeben</h2>
        <p className="text-secondary text-sm">
          Falls dein Gerät Speicherplatz braucht: in den iOS-Einstellungen unter „Safari → Erweitert →
          Website-Daten" kannst du den Cache von archerries.mossig.de zurücksetzen. Du verlierst dabei nur den
          lokalen Cache — Daten auf dem Server bleiben erhalten und werden beim nächsten Login neu geladen.
        </p>
      </section>
    </div>
  );
}
