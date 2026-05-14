export default function HelpShared() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-h1">Gemeinsame Runden</h1>
        <p className="text-secondary mt-2">
          Du kannst Freunde zu deinem Training einladen, damit sie ihre eigenen Pfeile mit-scoren. Per QR-Code
          oder Link — kein Account auf der anderen Seite nötig.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-3">So lädst du jemanden ein</h2>
        <ol className="text-primary list-decimal pl-5 space-y-1.5">
          <li>Lege ein neues Training an (oder öffne ein bestehendes offenes Training).</li>
          <li>Oben in der Teilnehmer-Leiste tippst du auf <strong>„Einladen"</strong>.</li>
          <li>Ein Modal zeigt einen <strong>QR-Code</strong> und einen <strong>Link</strong> (24 Stunden gültig).</li>
          <li>Lass die andere Person den QR-Code mit ihrer Smartphone-Kamera scannen — oder schicke den Link per Messenger.</li>
        </ol>
      </section>

      <section>
        <h2 className="eyebrow mb-3">So tritt der Gast bei</h2>
        <ol className="text-primary list-decimal pl-5 space-y-1.5">
          <li>QR-Code scannen oder Link öffnen → Vorschau-Seite mit Training-Info.</li>
          <li>
            <strong>Mit Account:</strong> Sofort beitreten, kein zusätzlicher Schritt.
            <br />
            <strong>Ohne Account:</strong> Nur den Anzeigenamen eingeben — es wird ein Gast-Profil angelegt. Kein
            Passwort, kein Email-Versand.
          </li>
          <li>Nach dem Beitritt landet der Gast direkt im Training und kann eigene Pfeile eintragen.</li>
        </ol>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Wie das Scoring funktioniert</h2>
        <ul className="text-primary list-disc pl-5 space-y-1.5">
          <li>Jeder Teilnehmer hat seine <strong>eigenen Pfeile</strong> pro Station — ihr seht nur euer eigenes Bullseye-Pad.</li>
          <li>Die <strong>Teilnehmer-Leiste oben</strong> zeigt alle aktiven Scorer mit ihrem aktuellen Punktestand.</li>
          <li>Punkte werden alle 5 Sekunden im Hintergrund aktualisiert — du siehst live, wie weit die anderen sind.</li>
          <li>Owner (du, als Anleger des Trainings) trägt die Krone. Andere sind <em>Scorer</em>.</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Hinweise</h2>
        <ul className="text-secondary list-disc pl-5 space-y-1.5 text-sm">
          <li>Einladungs-Links laufen nach 24 Stunden ab — danach musst du einen neuen erzeugen.</li>
          <li>Gäste sehen das Training auch in ihrer eigenen Trainings-Liste, markiert mit dem „Geteilt"-Badge.</li>
          <li>Nur der Owner kann das Training beenden, löschen oder weitere Einladungen erstellen.</li>
          <li>Pfeile von Mit-Scorern fließen <strong>nicht</strong> in deine persönliche Statistik ein.</li>
        </ul>
      </section>
    </div>
  );
}
