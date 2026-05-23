/**
 * Datenschutz & Sicherheit — was wird wo gespeichert, was sehen andere,
 * was bleibt privat, was kann der Admin.
 */
export default function HelpPrivacy() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Datenschutz &amp; Sicherheit</h1>
      <p className="text-secondary">
        Was speichert die App, wer sieht was, und wie kontrollierst du das?
      </p>

      {/* ─── Wo werden Daten gespeichert ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Wo liegen meine Daten?
        </h2>
        <p className="text-primary">
          Drei Orte, je nach Datentyp:
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Server-Datenbank (IONOS, Deutschland)</p>
          <p className="text-secondary">
            Trainings, Pfeile, Stationen, Parcours, Bögen, Pfeil-Sets, Reviews, Highscores. MySQL-DB
            auf einem deutschen Shared-Hosting (IONOS). Backup-Strategie: täglich snapshot
            durch den Hoster.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Server-Dateisystem (Upload-Ordner)</p>
          <p className="text-secondary">
            Avatar-Bilder, Stations-Fotos, Bogen-/Pfeil-Bilder, Parcours-Fotos. Apache serviert
            sie direkt. Pfade sind nicht öffentlich aufzählbar, aber wer einen Pfad kennt, kann
            das Bild laden — keine Auth-Wall vor den Uploads (kommt evtl. in einer späteren
            Version für sensible Bilder).
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Browser-Storage (lokal auf deinem Gerät)</p>
          <p className="text-secondary">
            JWT-Token im <b>localStorage</b>, GET-Antworten + Outbox-Queue in
            <b> IndexedDB</b>. Bei Logout wird alles aus localStorage gelöscht, IDB-Cache
            bleibt aber bestehen — wer ohne Logout den Browser teilt, riskiert dass jemand
            anderes deine letzten Daten sieht.
          </p>
        </div>
      </section>

      {/* ─── Was sehen andere ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Was sehen andere User von dir?
        </h2>

        <div className="card-sunken text-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-secondary text-xs uppercase border-b border-hairline">
                <th className="text-left pb-1.5">Daten</th>
                <th className="text-left pb-1.5">Wer sieht's?</th>
              </tr>
            </thead>
            <tbody>
              <Row what="E-Mail-Adresse" who="Nur du" />
              <Row what="Display-Name + Avatar" who="Andere User in geteilten Runden, Reviews, Highscore" />
              <Row what="Eigene Trainings" who="Nur du (außer Highscore-Veröffentlichung)" />
              <Row what="Privatparcours" who="Nur du (Standard)" />
              <Row what="Öffentlicher Parcours" who="Alle User können ihn sehen, klonen, Reviews schreiben, Highscores einsehen" />
              <Row what="Parcours-Review" who="Alle User (nicht anonym — display_name sichtbar)" />
              <Row what="Highscore-Eintrag" who="Nur Top 3 pro Disziplin × Bogenklasse, mit Score + Name + Bogenklasse" />
              <Row what="Bögen, Pfeile, Specs" who="Nur du" />
              <Row what="Friendship-Anfragen" who="Empfänger sieht display_name + Avatar des Anfragers (per E-Mail-Notif)" />
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Was sieht der Admin ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Was sieht der App-Admin?
        </h2>
        <p className="text-primary">
          Der Admin (aktuell nur der App-Betreiber, <span className="font-mono">markus@mossig.de</span>) hat
          erweiterte Rechte in der DB. Was er konkret sieht:
        </p>

        <div className="card-sunken text-sm space-y-1.5">
          <p className="font-semibold">In der Admin-UI</p>
          <ul className="list-disc pl-5 text-secondary space-y-0.5">
            <li>User-Liste mit E-Mail, Display-Name, Rolle, Status, Created-At</li>
            <li>Anzahl deiner Trainings, Parcours, Bögen (nur Aggregat-Counts)</li>
            <li>Role-Toggle: kann dich zu admin/user/guest setzen</li>
            <li>Status-Toggle: kann dich deaktivieren (status = pending)</li>
          </ul>
        </div>

        <div className="card-sunken text-sm space-y-1.5">
          <p className="font-semibold">Technisch: per direktem DB-Zugriff</p>
          <p className="text-secondary">
            Der Admin hätte mit direktem MySQL-Zugriff theoretisch Einblick in alle Inhalte. In
            der Praxis nutzen wir das nur für Bug-Diagnose. Reviews, Trainings,
            Parcours-Notizen — wir lesen nichts aus, was nicht explizit für die Diagnose
            relevant ist.
          </p>
        </div>
      </section>

      {/* ─── Wie kontrollierst du Veröffentlichungen ────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Wie kontrolliere ich, was öffentlich ist?
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Parcours: privat oder öffentlich</p>
          <p className="text-secondary">
            Beim Anlegen ist ein Parcours <b>privat</b>. Im Edit-Formular kannst du den
            „Öffentlich"-Toggle setzen — danach sehen andere User den Parcours, können ihn
            klonen, Reviews schreiben, Highscores einsehen. Du kannst jederzeit wieder
            privat schalten.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Trainings: privat (Standard) oder Highscore-veröffentlicht</p>
          <p className="text-secondary">
            Alle deine Trainings sind privat — sichtbar nur für dich (und ggf. eingeladene
            Mitspieler). In der Training-Summary kannst du ein <b>Häkchen</b> setzen, das
            Score + Display-Name + Bogenklasse in den öffentlichen Highscore aufnimmt. Notizen,
            Standort, einzelne Pfeile bleiben privat. Häkchen wieder entfernen → sofort weg aus
            dem Highscore.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Reviews: dein Name, dein Avatar, dein Text</p>
          <p className="text-secondary">
            Reviews sind <b>nicht anonym</b>. Andere User sehen deinen Display-Name + Avatar +
            Sternchen + Kommentar. Wenn du anonym bleiben willst: keinen Review schreiben.
          </p>
        </div>
      </section>

      {/* ─── E-Mail-Benachrichtigungen ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          E-Mail-Notifications
        </h2>
        <p className="text-primary">
          Standardmäßig versendet die App E-Mails bei:
        </p>
        <ul className="text-secondary text-sm list-disc pl-5 space-y-0.5">
          <li>Registrierung (Bestätigungs-Link)</li>
          <li>Passwort-Reset (Reset-Link)</li>
          <li>Eingehende Freundschaftsanfrage</li>
          <li>Angenommene oder abgelehnte Anfrage</li>
        </ul>
        <p className="text-primary mt-2">
          Du kannst alle nicht-Sicherheits-Mails granular unter <b>Profil → Benachrichtigungen</b>
          (oder via Magic-Link aus jeder Mail) abschalten. Account-relevante Mails (Reset,
          Verifizierung) gehen immer raus — sonst kann man sich aussperren.
        </p>
      </section>

      {/* ─── Recht auf Vergessenwerden ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Recht auf Datenexport &amp; Vergessenwerden
        </h2>
        <p className="text-primary">
          DSGVO: du kannst jederzeit eine Datenkopie anfordern oder eine Löschung beantragen.
          Aktuell läuft das per E-Mail an <span className="font-mono">markus@mossig.de</span>.
          In einer späteren Version wird ein Self-Service-Export im Profile-Bereich verfügbar
          sein.
        </p>
        <p className="text-secondary text-xs italic">
          Hinweis: Wenn andere User auf deine veröffentlichten Inhalte (öffentlicher Parcours,
          Reviews, Highscore) bereits referenzieren, bleiben Aggregate erhalten — dein
          Display-Name wird anonymisiert (z.B. „Gelöschter User").
        </p>
      </section>
    </div>
  );
}

function Row({ what, who }: { what: string; who: string }) {
  return (
    <tr className="border-b border-hairline last:border-0">
      <td className="py-1.5 pr-3 font-medium text-primary">{what}</td>
      <td className="py-1.5 text-secondary">{who}</td>
    </tr>
  );
}
