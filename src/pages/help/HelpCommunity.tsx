/**
 * Help-Section: Community-Features — öffentliche Parcours, Reviews, Vorlage,
 * Highscore, Favoriten. Eingehängt im Help-Hub als eigene Sektion.
 */
export default function HelpCommunity() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
      <p>
        Archerries ist nicht nur dein persönliches Trainingstagebuch — du kannst Parcours mit
        anderen teilen, Trainings vergleichen und von den Erfahrungen anderer profitieren.
      </p>

      <h3>Öffentliche Parcours</h3>
      <p>
        Jeder Parcours, den du anlegst, gehört zunächst nur dir. Im Bearbeiten-Modus kannst du den
        Schalter <strong>„Öffentlich"</strong> setzen — danach erscheint er für alle eingeloggten
        User unter <strong>Parcours → Öffentliche Parcours anzeigen</strong>. Andere User können den
        Parcours dann auch für ihr eigenes Training auswählen. Stammdaten und Bahnen darfst nur du
        selbst ändern.
      </p>

      <h3>Bewertungen &amp; Kommentare</h3>
      <p>
        Auf der Parcours-Detail-Seite gibst du eine Sterne-Bewertung (1–5) und optional einen
        Kommentar ab. Pro Parcours hast du genau eine Bewertung — Update oder Löschen ist jederzeit
        möglich. Der Durchschnitt und die Anzahl der Bewertungen wird im Parcours-Header gezeigt
        (Cherry-Stern neben den Schwierigkeit-Sternen).
      </p>

      <h3>Aus Vorlage übernehmen</h3>
      <p>
        Beim Anlegen eines neuen Parcours bietet dir die App in einem Dropdown alle eigenen und
        öffentlichen Parcours als Vorlage an. Mit einem Klick kopierst du Stammdaten, Pflöcke und
        alle Bahnen (Distanzen, Tier-Beschreibungen, Notizen). Fotos werden bewusst nicht
        mitkopiert — schieße eigene, sobald du den Parcours das nächste Mal besuchst.
      </p>

      <h3>Highscore</h3>
      <p>
        Nach jedem Training auf einem Parcours mit Score &gt; 0 fragt dich die Auswertungs-Seite
        per Toggle: <em>„In den öffentlichen Highscore aufnehmen?"</em> Aktivierst du den Schalter,
        landet dein Score in der <strong>Top-3-Liste pro Disziplin × Bogenklasse</strong>, sichtbar
        auf der Parcours-Seite für alle eingeloggten User.
      </p>
      <p>
        <strong>Was wird geteilt:</strong> Score, dein Anzeigename, dein Avatar, Bogenklasse,
        Datum. <strong>Was bleibt privat:</strong> Notizen, Standort, einzelne Pfeile, Pflockfarbe.
        Du kannst die Veröffentlichung jederzeit über den gleichen Toggle zurücknehmen.
      </p>

      <h3>Favoriten</h3>
      <p>
        Tippe auf den Stern an einer Disziplin (im Trainings-Assistenten), an einem Parcours-Eintrag
        in der Liste oder auf der Parcours-Detailseite, um deine Lieblingsoptionen zu markieren.
        Favorisierte Disziplinen werden im Trainings-Assistenten zuerst gezeigt, favorisierte
        Parcours kommen ganz oben in deiner Parcours-Liste.
      </p>

      <h3>Datenschutz-Hinweis</h3>
      <p>
        Bewertungen und Highscore-Einträge sind <em>nicht anonym</em> — andere User sehen deinen
        Anzeigenamen und Avatar. Wenn du das nicht möchtest, ändere deinen <em>Anzeigenamen</em> in
        deinem Profil und entferne dein Avatar-Bild.
      </p>
    </div>
  );
}
