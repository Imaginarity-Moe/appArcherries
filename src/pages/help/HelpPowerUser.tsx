/**
 * Power-User-Section — Shortcuts, URL-Tricks, Schnellerfassung.
 * Manche Sachen sind absichtlich unsichtbar, weil sie den Casual-User
 * verwirren würden — hier dokumentiert für die, die's wollen.
 */
export default function HelpPowerUser() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Power-User-Tricks</h1>
      <p className="text-secondary">
        Versteckte Features, Shortcuts und URL-Tricks für routinierte Nutzer.
      </p>

      {/* ─── Deep-Links ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          URL-Deep-Links
        </h2>
        <p className="text-primary">
          Viele Seiten haben strukturierte URLs, die du direkt aufrufen kannst — z.B. um zu
          einer bestimmten Hilfe-Sektion zu springen oder Trainings-Detail zu bookmarken.
        </p>

        <div className="card-sunken text-sm">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-secondary text-xs uppercase border-b border-hairline">
                <th className="text-left pb-2 pr-3">URL-Pfad</th>
                <th className="text-left pb-2 normal-case">Was passiert</th>
              </tr>
            </thead>
            <tbody>
              <UrlRow path="/help/scoring" what="Hilfe öffnet die Wertungs-Sektion automatisch" />
              <UrlRow path="/help#install" what="Hash-Anker funktioniert auch (z.B. von extern verlinkt)" />
              <UrlRow path="/trainings/123/summary" what="Direkt zum Summary-View" />
              <UrlRow path="/parcours?friends_only=1" what="Filtert die Liste auf Freundes-Parcours" />
              <UrlRow path="/trainings/archive" what="Archivierte Trainings" />
            </tbody>
          </table>
        </div>

        <p className="text-secondary text-xs italic">
          Bonus: <b>/email-settings</b> ist dein Notification-Prefs-Magic-Link aus Friend-Mails.
          Funktioniert auch ohne extra Login wenn der Token aus der Mail noch gültig ist.
        </p>
      </section>

      {/* ─── Schnellerfassung ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Schnellerfassung im Live-Modus
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">BullseyePad: Tap + Drag</p>
          <p className="text-secondary">
            Tippe in eine Zone — Pfeil wird gewertet. <b>Halte und ziehe</b> den Marker um die
            Heatmap-Position zu verfeinern, ohne die Zone zu ändern. Reichweite der Drag-Geste
            ist der gesamte Pad-Bereich.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Auto-Save</p>
          <p className="text-secondary">
            Sobald du den letzten Slot einer Aufnahme/Station gefüllt hast, speichert die App
            automatisch (nach 1.2 s Debounce). Du musst nicht „Speichern" drücken.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Lange Druck = Zoom (target_practice)</p>
          <p className="text-secondary">
            Beim Scheibenschießen-Pad öffnet ein <b>langer Druck</b> ein vergrößertes
            Zoom-Pad, damit du auch in der 10er nahe am X präzise tappen kannst.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Pfeil-Slot direkt anwählen</p>
          <p className="text-secondary">
            Tippst du in der Slot-Leiste auf <b>Pfeil 2</b>, springt der Editor zu Pfeil 2 zurück
            — du kannst auch nicht-linear korrigieren.
          </p>
        </div>
      </section>

      {/* ─── Foto-Tricks ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Foto-Marker
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Marker setzen ohne Zone vorher</p>
          <p className="text-secondary">
            Du kannst auf dem Stations-Foto den Marker setzen, <b>bevor</b> du im Pad die Zone
            wählst — der Foto-Marker ist unabhängig vom Score. Beide Daten werden separat
            gespeichert (Foto = x_norm/y_norm, Heatmap = pad_x/pad_y).
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Marker entfernen</p>
          <p className="text-secondary">
            Tippe direkt auf einen bestehenden Marker (groß, nummeriert) — der löscht sich
            sofort. Praktisch wenn du daneben getippt hast.
          </p>
        </div>
      </section>

      {/* ─── Multi-Player-Tricks ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Multi-Player-Tricks
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">QR-Code als Bildschirmfoto teilen</p>
          <p className="text-secondary">
            Wenn der Mitspieler weit weg ist (z.B. anderes Auto auf dem Parkplatz):
            Bildschirmfoto des QR machen, per WhatsApp/Signal schicken — der Link funktioniert
            ohne Scan auch nach Tap aus dem Bild.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Eigene Spieler als Gast hinzufügen</p>
          <p className="text-secondary">
            Du willst für dich + Frau auf einem Handy scoren? QR-Link in deinem eigenen Browser
            in einem zweiten Profil öffnen, oder einfach „Jeder selbst"-Modus nehmen und beide
            Tabs offen lassen.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Force-Übernahme (Owner-Tool)</p>
          <p className="text-secondary">
            Wenn ein Gast im Sync-Modus hängt (Akku leer, weggegangen), kannst du als Owner per
            Button die Turn-Kontrolle übernehmen — der Gast wird automatisch übersprungen.
          </p>
        </div>
      </section>

      {/* ─── Performance ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Performance &amp; Tab-Verhalten
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Polling-Pause im Hintergrund</p>
          <p className="text-secondary">
            Wenn dein Tab unsichtbar ist (anderer Tab aktiv, App im Hintergrund), pausiert das
            Live-Polling — schont Akku. Beim Zurückkommen wird sofort frisch gepullt.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Bundle-Splitting</p>
          <p className="text-secondary">
            Schwere Pages (Stats mit Recharts, Parcours-Liste mit Leaflet) werden erst beim
            ersten Aufruf geladen. Initial-Load bleibt klein → schneller Boot auf langsamem 3G.
          </p>
        </div>
      </section>
    </div>
  );
}

function UrlRow({ path, what }: { path: string; what: string }) {
  return (
    <tr className="border-b border-hairline last:border-0">
      <td className="py-2 pr-3 font-mono text-cherry-700 dark:text-cherry-200">{path}</td>
      <td className="py-2 text-secondary font-sans">{what}</td>
    </tr>
  );
}
