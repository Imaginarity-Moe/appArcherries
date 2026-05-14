export default function HelpScoring() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="display text-h1">Wertungssysteme</h1>
        <p className="text-secondary mt-2">
          Übersicht aller in der App unterstützten Wertungen. Drei Familien: 3D-Parcours
          (WA/IFAA/Bowhunter), Feldbogen (WA/IFAA), und „Einfach" für reine Total-Eingabe.
        </p>
      </header>

      <section>
        <h2 className="eyebrow mb-3">3D · WA / DSB</h2>
        <p className="text-primary mb-2"><strong>2 Pfeile pro Ziel, beide werden gewertet.</strong></p>
        <ul className="text-primary list-disc pl-5 space-y-1">
          <li><strong>11</strong> · innerstes Kill</li>
          <li><strong>10</strong> · zweiter Ring</li>
          <li><strong>8</strong> · äußerer Ring</li>
          <li><strong>5</strong> · Körper</li>
          <li><strong>0</strong> · Fehl / Horn / Huf</li>
        </ul>
        <p className="text-secondary text-sm mt-2">Linie zählt höher — Berührung der Trennlinie reicht für die bessere Zone.</p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">3D · IFAA Standard</h2>
        <p className="text-primary mb-2"><strong>Bis zu 3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</strong></p>
        <div className="card-sunken text-sm">
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-secondary text-xs uppercase">
                <th className="text-left pb-2">Pfeil</th>
                <th className="text-right pb-2">Inner Kill</th>
                <th className="text-right pb-2">Outer Kill</th>
                <th className="text-right pb-2">Wound</th>
              </tr>
            </thead>
            <tbody className="text-primary">
              <tr><td>1.</td><td className="text-right">20</td><td className="text-right">18</td><td className="text-right">16</td></tr>
              <tr><td>2.</td><td className="text-right">14</td><td className="text-right">12</td><td className="text-right">10</td></tr>
              <tr><td>3.</td><td className="text-right">8</td><td className="text-right">6</td><td className="text-right">4</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-secondary text-sm mt-2">Linie zählt niedriger — Pfeil muss die Linie durchbrechen/anreißen.</p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">3D · IFAA Hunter</h2>
        <p className="text-primary mb-2"><strong>Genau 1 Pfeil pro Ziel.</strong></p>
        <ul className="text-primary list-disc pl-5 space-y-1">
          <li><strong>20</strong> · Inner Kill</li>
          <li><strong>17</strong> · Outer Kill</li>
          <li><strong>10</strong> · Körper / Wound</li>
          <li><strong>0</strong> · Fehl</li>
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-3">3D · IFAA Animal (Tierbildrunde)</h2>
        <p className="text-primary mb-2"><strong>Bis zu 3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</strong></p>
        <div className="card-sunken text-sm">
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-secondary text-xs uppercase">
                <th className="text-left pb-2">Pfeil</th>
                <th className="text-right pb-2">Kill (Vital)</th>
                <th className="text-right pb-2">Wound (Körper)</th>
              </tr>
            </thead>
            <tbody className="text-primary">
              <tr><td>1.</td><td className="text-right">20</td><td className="text-right">18</td></tr>
              <tr><td>2.</td><td className="text-right">16</td><td className="text-right">14</td></tr>
              <tr><td>3.</td><td className="text-right">12</td><td className="text-right">10</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-secondary text-sm mt-3">
          <strong>NFAA-Modus</strong> (optional beim Anlegen aktivierbar): +1 Bonuspunkt auf jeden Treffer —
          21/19 → 17/15 → 13/11.
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">3D · Bowhunter (Liga)</h2>
        <p className="text-primary mb-2"><strong>3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</strong></p>
        <div className="card-sunken text-sm">
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-secondary text-xs uppercase">
                <th className="text-left pb-2">Pfeil</th>
                <th className="text-right pb-2">Kill</th>
                <th className="text-right pb-2">Wound</th>
              </tr>
            </thead>
            <tbody className="text-primary">
              <tr><td>1.</td><td className="text-right">5</td><td className="text-right">3</td></tr>
              <tr><td>2.</td><td className="text-right">4</td><td className="text-right">2</td></tr>
              <tr><td>3.</td><td className="text-right">3</td><td className="text-right">1</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-secondary text-sm mt-2">Liga-Variante, kein offizielles IFAA-Format.</p>
      </section>

      <div className="hairline" />

      <section>
        <h2 className="eyebrow mb-3">Feldbogen · WA / DSB</h2>
        <p className="text-primary mb-2"><strong>24 Scheiben × 4 Pfeile = 96 Pfeile gesamt.</strong></p>
        <ul className="text-primary list-disc pl-5 space-y-1">
          <li><strong>6</strong> · innerer gelber Ring</li>
          <li><strong>5</strong> · äußerer gelber Ring</li>
          <li><strong>4 · 3</strong> · schwarze Ringe (innen → außen)</li>
          <li><strong>2 · 1</strong> · weiße Ringe (innen → außen)</li>
          <li><strong>0</strong> · Fehl</li>
        </ul>
        <p className="text-secondary text-sm mt-2">
          <strong>Center-X</strong> zählt als 6 Punkte, wird aber separat als „X" getrackt — entscheidet bei
          Gleichstand (Tie-Break).
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Feldbogen · IFAA (Field &amp; Hunter)</h2>
        <p className="text-primary mb-2"><strong>Typisch 28 Scheiben × 4 Pfeile.</strong></p>
        <ul className="text-primary list-disc pl-5 space-y-1">
          <li><strong>5</strong> · Zentrum (Weiß/Gelb)</li>
          <li><strong>4</strong> · mittlerer Ring</li>
          <li><strong>3</strong> · äußerer Ring</li>
          <li><strong>0</strong> · Fehl</li>
        </ul>
      </section>

      <div className="hairline" />

      <section>
        <h2 className="eyebrow mb-3">Einfach (nur Score)</h2>
        <p className="text-primary">
          Für Trainings, wo du nur eine Gesamtpunktzahl eingeben willst — kein Pfeil-Tracking, keine
          Stations-Verwaltung. Ideal für schnelle Notizen oder Übungseinheiten.
        </p>
      </section>
    </div>
  );
}
