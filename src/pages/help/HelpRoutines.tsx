/**
 * Trainings-Routinen, Distanzschätzung üben, Wettkampf-Vorbereitung.
 * Praxisnahe Tipps fürs Schießen.
 */
export default function HelpRoutines() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Tipps &amp; Trainings-Routinen</h1>
      <p className="text-secondary">
        Eine Sammlung erprobter Routinen — was du in der App machst, wenn du gezielt besser
        werden willst, nicht nur „einen Score" haben.
      </p>

      {/* ─── Strukturierte Trainings ──────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Strukturierte Hallen-Trainings
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Warm-up · 5 × 3 Pfeile / 18 m</p>
          <p className="text-secondary">
            In der App: <b>Scheibenschießen</b> anlegen mit 3 Pfeile/Aufnahme, 5 Aufnahmen,
            18 m, 10 Ringe. Wertung „Gesamtsumme". Ziel: warm werden, lockerer Anker, kein
            Fokus auf Score.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Konzentration · 10 × 3 Pfeile / 18 m</p>
          <p className="text-secondary">
            Klassische Hallen-Runde. Ringauflage 40 cm WA. Ziel: 30 Pfeile fokussiert
            durchziehen. <b>Tipp:</b> nach Aufnahme 5 kurze Pause, Schulter rollen.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Match-Modus · Best-of-7-Legs gegen dich selbst</p>
          <p className="text-secondary">
            Scheibenschießen mit Wertung <b>Best of Legs</b>, 7 Legs à 3 Pfeile. Du spielst gegen
            deinen letzten Trainings-Score (Solo-Variante) oder gegen einen Freund (geteilte
            Runde, „Jeder selbst"-Modus).
          </p>
        </div>
      </section>

      {/* ─── Distanzschätzung üben ──────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Distanzschätzung trainieren
        </h2>
        <p className="text-primary">
          Auf unmarkierten 3D-Parcours macht die Schätzung die halbe Wertung aus. So gehst du
          systematisch ran:
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Schritt 1 · Wahrnehmungs-Anker setzen</p>
          <p className="text-secondary">
            Vor dem ersten Wettkampf einen Parcours mehrfach besuchen und Distanzen <i>nicht</i>
            schätzen, sondern <b>schreiten oder messen</b>. So baust du dir Referenz: „Das Tier
            wirkt so groß = 22 m".
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Schritt 2 · Schätzdistanz in der App eintragen</p>
          <p className="text-secondary">
            Bei jeder Station beim Live-Scoren das Distanz-Feld nutzen. Selbst wenn du
            danebenliegst — die Daten zeigen dir, wo du systematisch zu lang oder zu kurz
            schätzt.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Schritt 3 · Heatmap als Diagnose</p>
          <p className="text-secondary">
            Wenn deine Heatmap pro Tier+Distanz systematisch tief sitzt: zu kurz geschätzt
            (Pfeil unter Mitte). Wenn hoch: zu lang geschätzt. Korrektur ist meist 10–20 % der
            Schätzdistanz.
          </p>
        </div>
      </section>

      {/* ─── Wettkampf-Vorbereitung ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Wettkampf-Vorbereitung
        </h2>
        <p className="text-primary">
          Vor einem Wettkampf nicht „mehr schießen", sondern <b>gezielter</b> schießen.
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">2 Wochen vorher · Sim-Runden</p>
          <p className="text-secondary">
            Lege ein <b>Simulationstraining</b> mit der exakten Wettkampf-Konfiguration an
            (Disziplin, Pfeile pro Ziel, Ringe, Distanz). Mehrfach durchspielen, Score notieren.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">1 Woche vorher · Routine festigen</p>
          <p className="text-secondary">
            Schießroutine (Stand, Anker, Zielen, Lösen) immer gleich durchziehen. Score ist
            sekundär — Konsistenz priorisieren. Die <b>Pfeil-Konsistenz-Grafik</b> sollte
            möglichst flach sein (Pfeil 1 ≈ Pfeil 3).
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Wettkampftag · Locker bleiben</p>
          <p className="text-secondary">
            Erste 2 Stationen bewusst <b>nicht</b> auf Punktmax schießen — Anker aufbauen, in
            den Rhythmus kommen. Score erst ab Station 3 ernst nehmen.
          </p>
        </div>
      </section>

      {/* ─── Equipment-Routinen ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Equipment-Routinen
        </h2>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Pfeil-Set pflegen</p>
          <p className="text-secondary">
            Im <b>Equipment</b>-Bereich pro Pfeil-Set <b>Defekte, Verluste und Nachkäufe</b>
            tracken. Sobald Bestand &lt; 6 → rechtzeitig nachkaufen, gleiche Spine, sonst Heatmap-Drift.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Sehnen-Wechsel-Plan</p>
          <p className="text-secondary">
            Sehne als <b>Equipment-Item</b> mit „Aktiviert am"-Datum anlegen. Nach 6–9 Monaten
            Stretch +Verzug — neue Sehne, alte als Reserve markieren.
          </p>
        </div>
      </section>
    </div>
  );
}
