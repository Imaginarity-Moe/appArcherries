import { WATargetSVG, AnimalTargetSVG, HelpIllustrationBox } from "./HelpIllustrations";

/**
 * Erklärung der Statistik-Features — was die App alles trackt, wie die
 * Heatmap zu lesen ist, was Pfeil-Konsistenz bedeutet.
 */
export default function HelpStats() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Statistik &amp; Heatmaps</h1>
      <p className="text-secondary">
        Mit jedem erfassten Pfeil baut die App dein persönliches Trefferbild auf. Hier ist eine
        Tour durch die Auswertungen und was sie aussagen.
      </p>

      {/* ─── Heatmap ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Treffer-Heatmap
        </h2>
        <p className="text-primary">
          Die Heatmap zeigt deine Trefferposition auf der Auflage über viele Schüsse
          aggregiert — du erkennst sofort, ob deine Schüsse <b>links</b>, <b>tief</b> oder
          systematisch <b>außerhalb des Vitals</b> sitzen.
        </p>

        <HelpIllustrationBox
          illustration={<AnimalTargetSVG size={200} />}
          caption="3D-Heatmap pro Tier + Distanz"
        >
          <p className="text-primary text-sm">
            Heatmaps gibt es an drei Stellen:
          </p>
          <ul className="text-secondary text-xs list-disc pl-5 mt-1 space-y-0.5">
            <li><b>Training-Zusammenfassung</b> — alle Treffer dieses Trainings, farbcodiert pro Spieler</li>
            <li><b>Statistik-Seite</b> — alle Treffer aller Trainings, gruppiert nach Tier+Distanz oder Bahn</li>
            <li><b>Parcours → Bahnen</b> — was du auf diesem konkreten Parcours getroffen hast</li>
          </ul>
        </HelpIllustrationBox>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Wie die Heatmap entsteht</p>
          <p>
            Wenn du einen Pfeil im BullseyePad antippst, wird die <b>Tap-Position</b> als
            Heatmap-Koordinate gespeichert (nicht nur die Zone). Du kannst den Marker per Drag
            verschieben — die Zone bleibt gleich, nur die Heatmap-Position aktualisiert.
          </p>
          <p className="text-secondary text-xs italic">
            Wer nur die Zone-Button antippt ohne den Pad zu nutzen, hat keine Heatmap-Daten —
            der Marker erscheint trotzdem in der Mitte der Zone.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Wie liest man eine Heatmap?</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Dichte = Stärke der Färbung.</b> Cluster werden dunkler durch Punkte-Overlap.</li>
            <li><b>Streuung.</b> Eng zusammen = konstanter Schuss. Weit verteilt = inkonstanter Anker oder Lösen.</li>
            <li><b>Bias.</b> Ein Cluster, der nicht in der Mitte sitzt = Visier-/Anker-/Spine-Problem (siehe Trainings-Routinen).</li>
            <li><b>Multi-Player.</b> In geteilten Runden sind die Punkte farbcodiert pro Spieler + Legende unten.</li>
          </ul>
        </div>
      </section>

      {/* ─── Pfeil-Konsistenz ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Pfeil-Konsistenz
        </h2>
        <p className="text-primary">
          Auf der Statistik-Seite gibt es ein Balken-Diagramm, das pro Pfeil-Reihenfolge zeigt,
          wie viele Punkte du im Schnitt erzielst — <b>Pfeil 1</b> vs. <b>Pfeil 2</b> vs.
          <b> Pfeil 3</b>, …
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Was ein Drop zu späteren Pfeilen bedeutet</p>
          <p>
            Wenn Pfeil 3 systematisch schlechter ist als Pfeil 1, liegen meist folgende Gründe vor:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-secondary">
            <li><b>Konzentration sinkt</b> — Atmung &amp; Anker werden lascher</li>
            <li><b>Zeitdruck</b> bei IFAA-Wertung (3 Pfeile, nur 1. zählt → man wird unsorgfältig)</li>
            <li><b>Anker-Drift</b> — auf 3D-Stationen verändert sich der Auszug subtil über mehrere Pfeile</li>
          </ul>
          <p className="text-xs text-muted mt-1.5 italic">
            Trainings-Routine zum Üben: 6-Pfeil-Aufnahmen statt 3 — die Daten werden statistisch
            aussagekräftiger, und du merkst die Müdigkeit besser.
          </p>
        </div>
      </section>

      {/* ─── Score-Verlauf ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Score-Verlauf über die Zeit
        </h2>
        <p className="text-primary">
          Pro Disziplin und Bogenklasse siehst du deine Scores als <b>Line-Chart</b> über die
          letzten Trainings — Trend nach oben oder Stagnation/Abwärtstrend.
        </p>

        <div className="card-sunken text-sm space-y-1">
          <p className="font-semibold">Tipp: Gleiche Vergleichsbasis</p>
          <p className="text-secondary">
            Damit der Trend aussagekräftig ist, vergleich nur Trainings derselben Disziplin und
            möglichst desselben Parcours. Die Stats-Seite filtert dir das automatisch — wähle
            die richtigen Toggles oben.
          </p>
        </div>
      </section>

      {/* ─── Distanzschätz-Statistik ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Distanzschätzung — automatisch ausgewertet
        </h2>
        <p className="text-primary">
          Wenn du auf unmarkierten Parcours pro Station eine <b>Schätz-Distanz</b> einträgst und
          später der Veranstalter die echte Distanz nachreicht, kannst du deine Schätzgenauigkeit
          analysieren — &quot;ich schätze bergauf 2 m zu kurz&quot;.
        </p>
        <p className="text-secondary text-xs italic">
          Aktuell siehst du nur deine eingegebenen Distanzen — der Soll-/Ist-Vergleich pro Bahn
          kommt in einer späteren Version, sobald Parcours-Owner echte Distanzen pflegen.
        </p>
      </section>

      {/* ─── Highscore ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Highscore-Position
        </h2>
        <p className="text-primary">
          Wenn du dein Training in den öffentlichen Highscore veröffentlichst (Toggle in der
          Training-Zusammenfassung), siehst du auf der Parcours-Detail-Seite, wo du im Vergleich
          zu anderen Schützen stehst.
        </p>

        <HelpIllustrationBox
          illustration={<WATargetSVG size={180} />}
          caption="Highscore zeigt Top 3 pro Disziplin × Bogenklasse"
        >
          <ul className="text-sm space-y-0.5">
            <li><b>Gold</b> · Top 1</li>
            <li><b>Silber</b> · Top 2</li>
            <li><b>Bronze</b> · Top 3</li>
          </ul>
          <p className="text-xs text-secondary mt-1.5">
            Du siehst Score + Anzeigename + Bogenklasse aller Top-3. Standort, Notizen und
            einzelne Pfeile bleiben privat.
          </p>
        </HelpIllustrationBox>
      </section>
    </div>
  );
}
