import { Info } from "lucide-react";
import { AnimalTargetSVG, FieldWATargetSVG, FieldIFAATargetSVG, WATargetSVG, HelpIllustrationBox } from "./HelpIllustrations";

/**
 * Wertungssysteme — pro System: Regel, Zonen-Tabelle, konkretes Rechenbeispiel,
 * + Hinweise zur Reihenfolge-Logik bei IFAA/Bowhunter.
 */
export default function HelpScoring() {
  return (
    <div className="space-y-7">
      <header>
        <h1 className="display text-h1">Wertungssysteme</h1>
        <p className="text-secondary mt-2">
          Übersicht aller in der App unterstützten Wertungen mit Rechenbeispielen. Drei Familien:
          <b> 3D-Parcours</b> (WA / IFAA / Bowhunter), <b>Feldbogen</b> (WA / IFAA), und
          <b> Scheibenschießen / Einfach</b> für Halle &amp; FITA.
        </p>
      </header>

      {/* Verbände-Glossar */}
      <section className="card-sunken">
        <h2 className="eyebrow mb-2 flex items-center gap-1.5">
          <Info size={14} strokeWidth={1.75} /> Verbände — was bedeutet was?
        </h2>
        <ul className="text-sm grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <li><b>WA</b> · World Archery — Olympia-Verband (ehem. FITA)</li>
          <li><b>DSB</b> · Deutscher Schützenbund (WA-DE)</li>
          <li><b>IFAA</b> · International Field Archery Association</li>
          <li><b>DFBV</b> · Deutscher Feldbogensportverband (IFAA-DE)</li>
          <li><b>NFAA</b> · National Field Archery Association (USA)</li>
          <li><b>FITA</b> · alter Name für WA</li>
        </ul>
      </section>

      {/* ═══ 3D · WA / DSB ═════════════════════════════════════════════════ */}
      <section id="3d-wa-dsb" className="space-y-2 scroll-mt-24">
        <h2 className="eyebrow">3D · WA / DSB</h2>
        <p className="text-primary"><b>2 Pfeile pro Ziel, beide werden gewertet.</b></p>
        <HelpIllustrationBox
          illustration={<AnimalTargetSVG size={200} />}
        >
          <ul className="text-primary text-sm space-y-0.5">
            <li><b>11</b> · innerstes Kill (Center-X)</li>
            <li><b>10</b> · zweiter Ring (Inner Kill)</li>
            <li><b>8</b> · äußerer Ring (Outer Kill)</li>
            <li><b>5</b> · Körper (Wound)</li>
            <li><b>0</b> · Fehl / Horn / Huf</li>
          </ul>
        </HelpIllustrationBox>
        <p className="text-secondary text-xs mt-1">
          <b>Linie zählt höher</b> — Berührung der Trennlinie reicht für die bessere Zone.
        </p>

        <div className="card-sunken text-sm mt-2">
          <p className="font-semibold mb-1">Beispiel</p>
          <p>Pfeil 1 = Center-X (11), Pfeil 2 = Outer Kill (8) → Station-Score: <b className="score">19</b></p>
          <p>14 Stationen × 19 = max 308; durchschnittlich gute Schützen liegen bei 230–270.</p>
        </div>
      </section>

      {/* ═══ 3D · IFAA Standard ════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">3D · IFAA Standard</h2>
        <p className="text-primary"><b>Bis zu 3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</b></p>
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
        <p className="text-secondary text-xs mt-1"><b>Linie zählt niedriger</b> — Pfeil muss die Linie eindeutig durchbrechen für die bessere Zone.</p>

        <div className="card-sunken text-sm mt-2 space-y-2">
          <p className="font-semibold">Drei Rechenbeispiele</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted mb-1">Bestcase</p>
              <p>Pfeil 1 = Inner Kill</p>
              <p className="font-mono">→ <b className="score">20</b></p>
              <p className="text-xs text-secondary mt-0.5">Pfeile 2 + 3 sind irrelevant.</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Treffer nach Miss</p>
              <p>Pfeil 1 = Fehl<br />Pfeil 2 = Outer Kill</p>
              <p className="font-mono">→ <b className="score">12</b></p>
              <p className="text-xs text-secondary mt-0.5">Erster <i>treffender</i> Pfeil ist der zweite.</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Spät getroffen</p>
              <p>1 = Fehl, 2 = Fehl<br />3 = Wound</p>
              <p className="font-mono">→ <b className="score">4</b></p>
              <p className="text-xs text-secondary mt-0.5">Nur als letzte Chance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3D · IFAA Hunter ══════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">3D · IFAA Hunter</h2>
        <p className="text-primary"><b>Genau 1 Pfeil pro Ziel.</b></p>
        <ul className="text-primary text-sm list-disc pl-5 space-y-0.5">
          <li><b>20</b> · Inner Kill</li>
          <li><b>17</b> · Outer Kill</li>
          <li><b>10</b> · Körper / Wound</li>
          <li><b>0</b> · Fehl</li>
        </ul>
        <p className="text-secondary text-xs">
          Hunter ist die schnellste 3D-Variante — kein zweiter Pfeil als Backup. Verlangt
          Distanzschätzung &amp; Erste-Treffer-Mentalität.
        </p>
      </section>

      {/* ═══ 3D · IFAA Animal ══════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">3D · IFAA Animal (Tierbildrunde)</h2>
        <p className="text-primary"><b>Bis zu 3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</b></p>
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
        <p className="text-secondary text-sm mt-2">
          <b>NFAA-Modus</b> (optional beim Anlegen aktivierbar): +1 Bonuspunkt auf jeden Treffer —
          21/19 → 17/15 → 13/11. Wird in US-Liga-Veranstaltungen genutzt.
        </p>
      </section>

      {/* ═══ 3D · Bowhunter ═══════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">3D · Bowhunter (Liga)</h2>
        <p className="text-primary"><b>3 Pfeile pro Ziel — nur der erste treffende Pfeil zählt.</b></p>
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
        <p className="text-secondary text-sm mt-2">
          Liga-Variante, kein offizielles IFAA-Format. Wird in deutschen Bowhunter-Ligen und in
          Nachwuchs­wettkämpfen verwendet — kleinere Punktespanne hält die Spannung höher.
        </p>
      </section>

      <div className="hairline" />

      {/* ═══ Feldbogen WA ══════════════════════════════════════════════════ */}
      <section id="feldbogen-wa-dsb" className="space-y-2 scroll-mt-24">
        <h2 className="eyebrow">Feldbogen · WA / DSB</h2>
        <p className="text-primary"><b>24 Scheiben × 4 Pfeile = 96 Pfeile gesamt.</b></p>
        <HelpIllustrationBox
          illustration={<FieldWATargetSVG size={200} />}
        >
          <ul className="text-primary text-sm space-y-0.5">
            <li><b>6</b> · innerer gelber Ring</li>
            <li><b>5</b> · äußerer gelber Ring</li>
            <li><b>4 · 3</b> · schwarze Ringe (innen → außen)</li>
            <li><b>2 · 1</b> · weiße Ringe (innen → außen)</li>
            <li><b>0</b> · Fehl</li>
          </ul>
        </HelpIllustrationBox>
        <p className="text-secondary text-xs">
          <b>Center-X</b> zählt als 6 Punkte, wird aber separat als „X" getrackt — entscheidet bei
          Gleichstand (Tie-Break) am Ende.
        </p>

        <div className="card-sunken text-sm mt-2">
          <p className="font-semibold mb-1">Beispiel-Score pro Scheibe</p>
          <p>Pfeil 1 = X (6), Pfeil 2 = 5, Pfeil 3 = 4, Pfeil 4 = 5 → <b className="score">20</b> Punkte (+1 X)</p>
          <p className="text-secondary text-xs mt-1">Max pro Scheibe: 24. Max pro Runde: 24 × 24 = 576.</p>
        </div>
      </section>

      {/* ═══ Feldbogen IFAA ═══════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">Feldbogen · IFAA (Field &amp; Hunter)</h2>
        <p className="text-primary"><b>Typisch 28 Scheiben × 4 Pfeile.</b></p>
        <HelpIllustrationBox
          illustration={<FieldIFAATargetSVG size={200} />}
        >
          <ul className="text-primary text-sm space-y-0.5">
            <li><b>5</b> · Zentrum (Weiß/Gelb)</li>
            <li><b>4</b> · mittlerer Ring</li>
            <li><b>3</b> · äußerer Ring</li>
            <li><b>0</b> · Fehl</li>
          </ul>
        </HelpIllustrationBox>
        <p className="text-secondary text-xs">
          IFAA hat zwei Untervarianten: <b>Field</b> (alle Distanzen markiert) und <b>Hunter</b>
          (alle Distanzen unmarkiert — du musst schätzen). Wertung ist gleich, nur die
          Distanzangaben unterscheiden sich.
        </p>
      </section>

      <div className="hairline" />

      {/* ═══ Einfach ══════════════════════════════════════════════════════ */}
      <section className="space-y-2">
        <h2 className="eyebrow">Einfach (nur Score)</h2>
        <p className="text-primary">
          Für Trainings, wo du nur eine Gesamtpunktzahl eingeben willst — kein Pfeil-Tracking,
          keine Stations-Verwaltung. Ideal für schnelle Notizen oder Übungseinheiten.
        </p>
      </section>

      {/* ═══ Scheibenschießen ═════════════════════════════════════════════ */}
      <section id="scheibenschiessen" className="space-y-2 scroll-mt-24">
        <h2 className="eyebrow">Scheibenschießen</h2>
        <p className="text-primary">
          Frei konfigurierbar: Du wählst Pfeile pro <b>Aufnahme</b>, Anzahl Aufnahmen, Distanz und
          Ringzahl der Scheibe.
        </p>

        <HelpIllustrationBox
          illustration={<WATargetSVG size={200} />}
          caption="WA-10-Ring (X + 1–10)"
        >
          <p className="font-semibold mb-1 text-sm">Hierarchie der Begriffe</p>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            <li><b>Pfeil</b> — Einzelschuss in eine Zone</li>
            <li><b>Aufnahme</b> — alle Pfeile, die du nacheinander an die Scheibe abgibst</li>
            <li><b>Leg</b> — eine Reihe von Aufnahmen</li>
            <li><b>Set</b> — eine Reihe von Legs</li>
          </ul>
        </HelpIllustrationBox>

        <div className="space-y-2">
          <p className="font-semibold text-sm">Drei Wertungs-Varianten</p>

          <div className="card-sunken">
            <p className="font-semibold text-sm">Gesamtsumme</p>
            <p className="text-sm text-primary">Alle Pfeile aller Aufnahmen werden addiert. Klassische Hallenrunde, FITA Outdoor.</p>
            <p className="text-xs text-secondary mt-1 italic">Beispiel Halle: 10 Aufnahmen × 3 Pfeile × max 10 = 300.</p>
          </div>

          <div className="card-sunken">
            <p className="font-semibold text-sm">Best of Legs</p>
            <p className="text-sm text-primary">
              Höchster End-Score pro Leg gewinnt das Leg. Wer am Ende die meisten Legs gewonnen
              hat, gewinnt insgesamt. Spannender bei Multi-Player.
            </p>
            <p className="text-xs text-secondary mt-1 italic">
              Beispiel: 5 Legs à 6 Pfeile. A gewinnt 3 Legs (60-58, 55-50, 58-56) und B gewinnt 2 Legs.
              → A gewinnt das Match.
            </p>
          </div>

          <div className="card-sunken">
            <p className="font-semibold text-sm">Sets &amp; Legs</p>
            <p className="text-sm text-primary">
              Match-Modus wie Darts. Wer zuerst X Legs hat, gewinnt ein Set. Wer zuerst Y Sets hat,
              gewinnt das Match.
            </p>
            <p className="text-xs text-secondary mt-1 italic">
              Beispiel: First-to-3-legs gewinnt ein Set, first-to-2-sets gewinnt das Match.
              Möglicher Verlauf: A führt 2:0 in Legs, B holt auf, A gewinnt Set 1 mit 3:2 in Legs;
              Set 2 geht 3:0 an A — Match 2:0 für A.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
