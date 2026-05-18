/**
 * Help-Section: Equipment — Bögen, Pfeile, M:N-Verknüpfung, Spine-Tabelle,
 * Verlauf, Shop-Link, Foto-Upload.
 */
export default function HelpEquipment() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-5">
      <p>
        Im Equipment-Bereich pflegst du <strong>Bögen</strong> und <strong>Pfeil-Sets</strong> mit
        allen relevanten Specs. Du erreichst beides aus dem Profil — und switchst mit dem
        Tab-Switcher oben auf der Seite blitzschnell zwischen <em>Bögen</em> und <em>Pfeile</em>.
      </p>

      <h3>Bögen</h3>
      <p>Eingebbar:</p>
      <ul>
        <li><strong>Name</strong> (Pflicht) — z.B. „Indoor-Recurve" oder „Mathews Compound 2026"</li>
        <li><strong>Klasse</strong> — Recurve, Compound, Blank/Barebow, Lang/Instinktiv/Trad</li>
        <li><strong>Zuggewicht</strong> in lbs (z.B. 36, 50, 60)</li>
        <li><strong>Länge</strong> in Inch — typisch 66–70 für Recurve, 58–66 für Compound</li>
        <li><strong>Standhöhe</strong> (Brace-Height) in Inch — Recurve meist 8.5–9.5, Compound 6.5–7.5</li>
        <li><strong>Let-Off</strong> (%) — <em>nur bei Compound sichtbar</em>, typisch 65–90</li>
        <li><strong>Pfeil-Spine</strong> — empfohlener Carbon-Spine (siehe Tabelle unten)</li>
        <li><strong>Visiermarken</strong> — als Klartext (z.B. „18m: 4.2 · 30m: 5.1 · 50m: 6.8")</li>
        <li><strong>Notizen</strong> — Wartung, Setup-Changes</li>
        <li><strong>Foto</strong> — wird nach erstem Speichern hochladbar</li>
        <li><strong>Standard-Bogen</strong> (Stern) — wird beim NewTraining-Wizard vorausgewählt</li>
      </ul>

      <h3>Pfeil-Sets</h3>
      <p>
        Ein <em>Pfeil-Set</em> ist eine Gruppe gleicher Pfeile — typisch 6 oder 12 Stück mit
        identischer Spine, Länge, Spitze, Befiederung. Felder:
      </p>
      <ul>
        <li><strong>Identität</strong>: Name, Hersteller (z.B. Easton, Gold Tip), Modell (X10, Pierce, Spider)</li>
        <li><strong>Schaft</strong>: Material (Carbon / Aluminium / Carbon-Aluminium / Holz / Fiberglas), Durchmesser in mm, Spine, Länge in Inch, GPI (grains per inch)</li>
        <li><strong>Befiederung</strong>: Typ (Naturfeder / Plastik-Vane / Spin-Vane), Länge in Inch, Anzahl (3 oder 4), Helix ja/nein, Farben</li>
        <li><strong>Nocken</strong>: Typ (Press-fit / Pin / Anders), Hersteller, Farbe</li>
        <li><strong>Spitzen</strong>: Typ (Field/Target/Bullet/Broadhead), Gewicht in grains, austauschbar ja/nein</li>
        <li><strong>Bestand</strong>: Gesamtanzahl, defekt, verloren, Kaufdatum, Preis pro Pfeil</li>
        <li><strong>Shop-Link</strong> für schnellen Nachkauf — externer Link öffnet in neuem Tab</li>
        <li><strong>Foto</strong>, <strong>Notizen</strong>, <strong>Standard-Set</strong>-Flag</li>
      </ul>

      <h3>Verlauf der Verluste &amp; Defekte</h3>
      <p>
        Pro Pfeil-Set kannst du einzelne <strong>Ereignisse</strong> erfassen: <em>defekt</em>,
        <em>verloren</em>, <em>nachgekauft</em>, <em>repariert/ersetzt</em> mit Anzahl, Datum und
        Notiz. Die Gesamt-Counter (Defekt / Verloren / Gesamt) werden automatisch aktualisiert.
        Falls du ein Ereignis löschst, wird der Counter wieder zurückgerechnet.
      </p>

      <h3>Bogen ↔ Pfeile verknüpfen (M:N)</h3>
      <p>
        Im Bogen-Edit kannst du auswählen, welche Pfeil-Sets zu diesem Bogen passen, und im
        Pfeil-Edit umgekehrt. Beide Richtungen bleiben synchron. Ein Pfeil-Set kann zu mehreren
        Bögen passen — typisch z.B. dieselben Easton X10 für Indoor- und Outdoor-Recurve.
      </p>
      <p>
        Direkt unter der Chip-Auswahl gibt's „Direkt zum Bogen/Pfeil-Set springen"-Links — so
        wechselst du ohne Umweg übers Profil zwischen den Edit-Pages.
      </p>

      <h3>Carbon-Spine-Empfehlung</h3>
      <p>
        Faustregel für Recurve mit 28″ Pfeil und 100-grain-Spitze (Easton-Norm).
        Bei längeren Pfeilen schwächer (höhere Zahl), bei höherem Spitzengewicht ebenfalls.
        Compound: dynamischer Spine ist anders — Easton-Selektor nutzen.
      </p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-hairline">
            <th className="text-left py-1.5">Zuggewicht (lbs)</th>
            <th className="text-left py-1.5">Empfohlener Spine</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["≤ 24", "1000–1200"],
            ["25–28", "900–1000"],
            ["29–33", "700–800"],
            ["34–37", "600–700"],
            ["38–42", "500–600"],
            ["43–47", "400–500"],
            ["48–52", "350–400"],
            ["≥ 53", "300–350"],
          ].map(([w, s]) => (
            <tr key={w} className="border-b border-hairline/60">
              <td className="py-1.5 font-mono tabular-nums">{w}</td>
              <td className="py-1.5 font-mono tabular-nums">{s}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Das sind grobe Richtwerte — Bogenbauer und Sportlehrer kennen dein Setup besser. Bei
        Compound: nutze den Easton- oder Gold-Tip-Selektor mit deinem dynamischen Spine.
      </p>

      <h3>Foto-Upload</h3>
      <p>
        Im Bogen-/Pfeil-Set-Edit ist der Foto-Block prominent am Anfang. Erst nach dem
        ersten <em>Speichern</em> erscheint der Upload (eine Bahn-/Bogen-ID muss vorhanden
        sein, bevor das Bild zugeordnet werden kann). Auf dem Handy öffnet sich direkt die
        Kamera (<code>capture="environment"</code>).
      </p>

      <h3>Bogen-Wahl im Training</h3>
      <p>
        Im NewTraining-Wizard erscheint dein Standard-Bogen automatisch — du kannst aber jeden
        deiner Bögen auswählen. Die Bow-ID wird mitgespeichert und im Training-Header
        angezeigt. So lässt sich später in der Statistik filtern, mit welchem Bogen welche
        Scores erzielt wurden.
      </p>
    </div>
  );
}
