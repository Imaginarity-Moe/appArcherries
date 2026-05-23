import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * FAQ — häufige Fragen + Stolperfallen aus täglicher Nutzung.
 * Jeder Eintrag ist ein eigenes Details-Element, damit man scannen + gezielt
 * aufklappen kann.
 */
export default function HelpFAQ() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold">Häufige Fragen</h1>
      <p className="text-secondary">
        Antworten auf wiederkehrende Fragen. Wenn dein Problem nicht dabei ist: schick uns
        gerne Feedback (siehe „Über die App").
      </p>

      <div className="space-y-2">
        <Q q="Ich sehe meinen letzten Pfeil nicht auf der Heatmap.">
          Die Heatmap nutzt <b>pad_x/pad_y</b> aus dem BullseyePad-Tap — wenn du die Zone nur
          per Button-Klick gewählt hast (statt auf dem Pad zu tippen), gibt es keine
          Heatmap-Position. Lösung: Beim nächsten Mal direkt im Pad antippen.
        </Q>

        <Q q="Mein Foto wird nicht hochgeladen.">
          <p>Mögliche Ursachen:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>Du bist offline → der Sync-Badge ☁ am Bild zeigt das an. Sobald wieder Netz da ist, läuft der Upload automatisch.</li>
            <li>Datei {">"} 5 MB → der Server lehnt ab. Foto kleiner machen (z.B. mit der Foto-App) und erneut versuchen.</li>
            <li>Die Station wurde noch nicht gespeichert (negative ID) → erst „Speichern" drücken, dann Foto-Upload.</li>
          </ul>
        </Q>

        <Q q={'Mein Training startet im Sync-Modus, ich will aber „Jeder selbst".'}>
          Sync-Modus ist in der aktuellen UI deaktiviert. Wenn du trotzdem ein Sync-Training in
          deiner Liste siehst, ist das ein altes Training von vor der Umstellung. Du kannst es
          als Owner über die Übernahme-Funktion entsperren oder beenden.
        </Q>

        <Q q="Ich kann meinen eigenen Status oder meine Rolle im Admin nicht ändern.">
          Das ist Absicht. Eigene Rolle nicht änderbar (sonst sperrst du dich aus), und
          mindestens ein aktiver Admin muss übrig bleiben. Wenn du wirklich raus willst: einen
          anderen User zum Admin machen, dann den ändert er dich.
        </Q>

        <Q q="Mein Score ist nicht im Highscore zu sehen, obwohl ich veröffentlicht habe.">
          <p>Drei Bedingungen:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li><b>Toggle in Training-Summary aktiv</b> — Häkchen bei „In den öffentlichen Highscore aufnehmen"</li>
            <li><b>Score &gt; 0</b> — Trainings mit 0 Punkten werden ausgefiltert</li>
            <li><b>Top 3 pro Disziplin × Bogenklasse</b> — du musst zur Top 3 dieser Kombination gehören. Plätze 4+ erscheinen nicht.</li>
          </ul>
        </Q>

        <Q q="Die App fragt nicht nach Foto-Berechtigung.">
          Web-Apps fragen erst beim ersten Tap auf den Foto-Button. Falls du die Berechtigung
          mal abgelehnt hast, kannst du sie in den iOS-/Android-Einstellungen für die App
          (oder den Browser) wieder aktivieren.
        </Q>

        <Q q="Ich finde meinen Bogen-Standard-Pflock nicht beim Anlegen eines Trainings.">
          Die App nutzt deinen <b>Default-Bogen</b> als Voreinstellung. Hat dein Bogen die
          Klasse <i>recurve</i> oder <i>compound</i>, wird Pflock <b>Blau</b> vorgeschlagen,
          bei <i>barebow</i> / <i>traditional</i> wird <b>Rot</b> vorgeschlagen. Du kannst es
          jederzeit überschreiben.
        </Q>

        <Q q="Wieso sieht das geteilte Training so anders aus für Gäste?">
          Gäste haben eine andere Rolle im Training (scorer/viewer statt owner). Sie sehen das
          Training in ihrer eigenen Liste, können scoren (wenn scorer), sehen die Multi-Player-
          Heatmap. Sie haben aber keinen Zugang zur Owner-Übernahme oder zur Foto-Löschung.
        </Q>

        <Q q="Die Hilfe lädt nicht alles auf einmal.">
          Die Hilfe-Sektionen sind als Accordion gebaut — nur die offenen werden ausführlich
          gerendert. Suche oben: tippe „heatmap" oder „ifaa" — Sektionen, die das Schlagwort
          enthalten, öffnen sich automatisch.
        </Q>

        <Q q="Wo finde ich meine offline angelegten Trainings nach dem Sync?">
          Sie behalten ihre Anzeige in der Liste, bekommen aber im Hintergrund eine echte
          Server-ID. Die URL ändert sich nach dem Sync entsprechend — bookmarkst du also ein
          frisch angelegtes Training, bookmarkst du am besten erst, nachdem der Sync durch
          ist.
        </Q>

        <Q q="Wie installiere ich die App auf dem iPhone?">
          Safari öffnen, <b>archerries.mossig.de</b> aufrufen, Teilen-Icon ⬆️ unten antippen, „Zum
          Home-Bildschirm". Danach läuft sie im Vollbildmodus + offline.
        </Q>

        <Q q="Was passiert, wenn ich mein Konto löschen lasse?">
          Aktuell ist die Löschen-Funktion deaktiviert (Button disabled). Wenn du löschen
          willst, schreib uns via E-Mail. Inhalte wie öffentliche Parcours-Reviews bleiben dann
          erhalten, aber dein Display-Name wird anonymisiert.
        </Q>

        <Q q="Ich habe ein Bug entdeckt.">
          Mail an <span className="font-mono">markus@mossig.de</span> oder GitHub-Issue. Bitte
          mit Screenshot + URL aus der Adresszeile + Build-Tag aus dem Header (zeigt
          die Version).
        </Q>
      </div>
    </div>
  );
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="card-sunken group"
    >
      <summary className="cursor-pointer list-none flex items-center gap-2 text-primary">
        <ChevronDown size={16} strokeWidth={1.75} className={`text-secondary transition ${open ? "rotate-180" : ""} shrink-0`} />
        <span className="font-medium text-sm">{q}</span>
      </summary>
      <div className="pt-2 pl-6 pr-2 text-sm text-secondary space-y-1">{children}</div>
    </details>
  );
}
