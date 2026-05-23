/**
 * Offline-Modus, PWA-Cache, Sync-Outbox erklärt.
 */
export default function HelpOfflineSync() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Offline-Modus &amp; Sync</h1>
      <p className="text-secondary">
        Archerries läuft auch im Funkloch. Du erfasst Pfeile, Stationen, Fotos — sobald wieder
        Empfang da ist, synchronisiert die App alles im Hintergrund. Hier erklärt, was wann
        passiert.
      </p>

      {/* ─── Drei Schichten ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Wie die App offline funktioniert
        </h2>
        <p className="text-primary">
          Die App ist eine <b>Progressive Web App</b> (PWA). Das bedeutet drei Dinge:
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">1. App-Shell ist gecacht</p>
          <p className="text-secondary">
            Beim ersten Aufruf lädt der Browser HTML, CSS, JS und packt alles in einen
            Service-Worker-Cache. Beim nächsten Öffnen — auch ohne Netz — startet die App
            sofort aus dem Cache.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">2. API-Antworten werden zwischengespeichert</p>
          <p className="text-secondary">
            GET-Anfragen (Trainings-Liste, Parcours, Stats, …) werden in einer lokalen
            Datenbank (<b>IndexedDB</b>) gespeichert. Offline öffnest du das Dashboard, siehst
            deine letzten Trainings, kannst alles durchblättern.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">3. Schreibende Aktionen kommen in eine Queue</p>
          <p className="text-secondary">
            POST/PATCH/DELETE-Aufrufe (Pfeil setzen, Training anlegen, Notiz speichern) werden
            in eine <b>Outbox</b> gepackt, wenn du offline bist. Die App tut so, als wäre alles
            durch — UI updatet optimistisch. Sobald wieder Netz da ist, wird die Queue
            abgearbeitet.
          </p>
        </div>
      </section>

      {/* ─── Status-Indikatoren ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Status erkennen
        </h2>
        <p className="text-primary">
          Rechts oben (oder in der Desktop-Sidebar) siehst du ein Netzwerk-Icon. Drei Zustände:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card-sunken text-sm">
            <div className="w-3 h-3 rounded-full bg-emerald-500 mb-1.5" aria-hidden />
            <p className="font-semibold">Online · grün</p>
            <p className="text-xs text-secondary">Alles synct sofort. Outbox ist leer.</p>
          </div>
          <div className="card-sunken text-sm">
            <div className="w-3 h-3 rounded-full bg-copper-500 mb-1.5 ring-2 ring-copper-500/30" aria-hidden />
            <p className="font-semibold">Pending · kupfer mit Badge</p>
            <p className="text-xs text-secondary">Es gibt Einträge in der Queue, die noch nicht beim Server sind.</p>
          </div>
          <div className="card-sunken text-sm">
            <div className="w-3 h-3 rounded-full bg-cherry-500 mb-1.5" aria-hidden />
            <p className="font-semibold">Offline · rot</p>
            <p className="text-xs text-secondary">Kein Netz — alles wird gequeued.</p>
          </div>
        </div>

        <p className="text-secondary text-sm">
          <b>Tap auf das Icon</b> öffnet ein Popover mit Anzahl pendender Aktionen und einem
          „Jetzt synchronisieren"-Button (falls du nicht warten willst).
        </p>
      </section>

      {/* ─── Foto-Uploads ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Foto-Uploads offline
        </h2>
        <p className="text-primary">
          Bilder (Stations-Foto, Bogen, Pfeil, Parcours-Bahn, Avatar) gehen in eine
          <b> separate Upload-Queue</b>. Du siehst direkt einen Preview als blob: URL, ein
          kleiner <b>Sync-Badge</b> ☁ zeigt an, dass der Upload noch wartet.
        </p>

        <div className="card-sunken text-sm space-y-1.5">
          <p className="font-semibold">Was bedeutet der Sync-Badge?</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary">
            <li>Das Bild ist auf deinem Gerät, aber nicht auf dem Server.</li>
            <li>Sobald online: Upload läuft automatisch im Hintergrund. Du brauchst die App nicht offen zu haben.</li>
            <li>Schließt du die App vor dem Sync: der Preview ist weg, aber das Bild bleibt in der Queue. Beim nächsten Öffnen synct die App alle pending Uploads.</li>
            <li>Wenn der Server „live" geladen wird, ersetzt das Server-Bild den lokalen Preview.</li>
          </ul>
        </div>
      </section>

      {/* ─── Konflikte ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Was passiert bei Konflikten?
        </h2>
        <p className="text-primary">
          Offline angelegte Daten bekommen eine <b>temporäre ID</b>. Beim Sync wird die echte
          Server-ID nachgereicht. Alles, was darauf basiert, wird automatisch umgemapped.
        </p>

        <div className="card-sunken text-sm space-y-1.5">
          <p className="font-semibold">Edge-Cases</p>
          <ul className="list-disc pl-5 space-y-1 text-secondary">
            <li>
              <b>4xx vom Server</b> (Validierungsfehler etc.) verwirft den Eintrag aus der Queue
              — er kann nicht durch Retry gelöst werden.
            </li>
            <li>
              <b>5xx oder Netzfehler</b> bleiben in der Queue, werden alle 30 s erneut probiert.
            </li>
            <li>
              <b>Negative Target-IDs</b> (Offline angelegte Stationen) blockieren Foto-Uploads
              bis die Server-ID da ist — das Foto kommt im nächsten Drain-Zyklus.
            </li>
          </ul>
        </div>
      </section>

      {/* ─── Installation ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          App installieren
        </h2>
        <p className="text-primary">
          Damit die App wie eine native App auf dem Homescreen liegt + Offline-Modus voll
          funktioniert, lohnt sich die Installation:
        </p>

        <div className="card-sunken text-sm">
          <p className="font-semibold mb-1.5">iPhone (Safari)</p>
          <ol className="list-decimal pl-5 space-y-0.5 text-secondary">
            <li>Auf <b>archerries.mossig.de</b> in Safari öffnen</li>
            <li>Teilen-Icon ⬆️ unten antippen</li>
            <li>„Zum Home-Bildschirm" wählen</li>
          </ol>
        </div>

        <div className="card-sunken text-sm">
          <p className="font-semibold mb-1.5">Android (Chrome)</p>
          <ol className="list-decimal pl-5 space-y-0.5 text-secondary">
            <li>Auf <b>archerries.mossig.de</b> in Chrome öffnen</li>
            <li>Menü ⋮ oben rechts</li>
            <li>„App installieren" oder „Zum Startbildschirm hinzufügen"</li>
          </ol>
        </div>

        <p className="text-secondary text-xs italic">
          Auf iOS funktioniert die App offline nur, wenn sie über HTTPS aufgerufen wurde
          (Safari-Regel). Die LAN-IP-Adresse funktioniert nicht — nutze immer die
          <b> archerries.mossig.de</b>-URL.
        </p>
      </section>
    </div>
  );
}
