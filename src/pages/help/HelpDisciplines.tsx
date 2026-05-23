import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Info } from "lucide-react";
import {
  AnimalTargetSVG,
  WATargetSVG,
  FieldWATargetSVG,
  FieldIFAATargetSVG,
  HelpIllustrationBox,
} from "./HelpIllustrations";

/**
 * Eingebettete Sub-Akkordeons — Section bleibt visuell ruhig, Detail
 * öffnet sich nur wenn der User sich tiefer einlesen will.
 */
function SubSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="group">
      <summary className="cursor-pointer list-none flex items-center gap-2 py-1.5 text-secondary hover:text-primary transition">
        <ChevronDown size={14} strokeWidth={1.75} className={`transition ${open ? "rotate-180" : ""}`} />
        <span className="font-medium">{title}</span>
      </summary>
      <div className="pt-1.5 pl-5 space-y-2">{children}</div>
    </details>
  );
}

/** Hinweis-Banner über jeder Disziplin-Sektion, der auf das volle Wertungs-Detail verweist. */
function ScoringReference({ anchor }: { anchor: string }) {
  return (
    <Link
      to={`/help/scoring#${anchor}`}
      className="card-sunken flex items-center gap-2 text-sm text-secondary hover:text-cherry-600 dark:hover:text-cherry-200 transition group"
    >
      <Info size={16} strokeWidth={1.75} className="text-cherry-500 shrink-0" />
      <span className="flex-1">Punkte, Zonen und Rechenbeispiele findest du im Detail unter <b className="text-primary">Wertungssysteme</b>.</span>
      <ArrowRight size={14} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition" />
    </Link>
  );
}

export default function HelpDisciplines() {
  return (
    <div className="space-y-7">
      <h1 className="font-display text-2xl font-semibold">Disziplinen</h1>
      <p className="text-secondary">
        Bogensport wird in drei großen Familien geschossen: <b>3D-Parcours</b> (Tierattrappen im Wald),
        <b> Feldbogen</b> (Auflagen auf Holzscheiben im Wald) und <b>Scheibenschießen</b> (klassische
        Ringauflagen in Halle oder draußen). Hier findest du jede Disziplin mit Trefferzonen,
        Wertungsregeln und einem typischen Spielbeispiel.
      </p>

      {/* ─── Verbände-Glossar ────────────────────────────────────────────── */}
      <section className="card-sunken">
        <h2 className="eyebrow mb-2 flex items-center gap-1.5">
          <Info size={14} strokeWidth={1.75} /> Verbände — was bedeutet was?
        </h2>
        <p className="text-sm text-secondary mb-2.5">
          Die Wertungen unterscheiden sich je nach Verband. Hier die wichtigsten Kürzel:
        </p>
        <ul className="text-sm grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <li><b>WA</b> · World Archery — weltweiter Olympia-Verband (ehem. FITA)</li>
          <li><b>DSB</b> · Deutscher Schützenbund — WA-Vertretung in Deutschland</li>
          <li><b>IFAA</b> · International Field Archery Association</li>
          <li><b>DFBV</b> · Deutscher Feldbogensportverband — IFAA-Vertretung in Deutschland</li>
          <li><b>NFAA</b> · National Field Archery Association (USA)</li>
          <li><b>FITA</b> · alter Name für World Archery (heute WA)</li>
        </ul>
      </section>

      {/* ═══ 3D-Parcours ═══════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">3D-Parcours</h2>
        <p className="text-primary">
          Auf einem 3D-Parcours stehen typisch 14–28 lebensgroße Tierattrappen aus Hartschaum verteilt
          im Wald — Reh, Wildschwein, Bär, Puma, Truthahn. Pro Station schießt du eine festgelegte
          Zahl Pfeile aus der durch den <b>Pflock</b> vorgegebenen Distanz (typisch 5–45 m, oft
          unmarkiert — du musst die Entfernung schätzen).
        </p>

        <ScoringReference anchor="3d-wa-dsb" />

        <HelpIllustrationBox
          illustration={<AnimalTargetSVG size={240} />}
          caption="Vereinfachte Tier-Auflage mit Trefferzonen"
        >
          <p className="text-primary mb-2">
            Punkte hängen von <b>Trefferzone</b> ab (Inner Kill → Outer Kill → Wound), und bei
            IFAA-Systemen zusätzlich davon, ob du mit dem 1., 2. oder 3. Pfeil getroffen hast.
          </p>
          <ul className="text-secondary text-sm space-y-1">
            <li><span className="inline-block w-2 h-2 rounded-full bg-warm-black mr-1.5 align-middle" /> <b>Inner Kill</b> — kleinster, innerster Fleck (höchste Punkte)</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-cherry-500 mr-1.5 align-middle" /> <b>Outer Kill</b> — der größere Vitalbereich</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5 align-middle" /> <b>Wound</b> — Körperbereich außerhalb der Kill-Zonen</li>
            <li><span className="inline-block w-2 h-2 rounded-full bg-secondary/40 mr-1.5 align-middle" /> <b>Miss</b> — daneben, Horn, Huf, Boden</li>
          </ul>
        </HelpIllustrationBox>

        <SubSection title="Welche 3D-Wertungssysteme gibt es?">
          <p className="text-sm">Die App unterstützt fünf 3D-Wertungen — welches du nutzt, ist Sache des Veranstalters:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li><b>3D · WA / DSB</b> — 2 Pfeile, beide werden gewertet (11/10/8/5)</li>
            <li><b>3D · IFAA Standard</b> — bis zu 3 Pfeile, nur erster Treffer zählt (20/18/16)</li>
            <li><b>3D · IFAA Hunter</b> — 1 Pfeil, fest (20/17/10)</li>
            <li><b>3D · IFAA Animal</b> — bis zu 3 Pfeile (20/18 → 16/14 → 12/10)</li>
            <li><b>3D · Bowhunter (Liga)</b> — 3 Pfeile, ähnlich IFAA aber Wertskala 5/4/3</li>
          </ul>
          <p className="text-secondary text-sm italic">Details + Rechenbeispiele unter <Link to="/help/scoring" className="text-cherry-600 dark:text-cherry-200 underline">Wertungssysteme</Link>.</p>
        </SubSection>

        <SubSection title="Typischer Ablauf einer Runde">
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>Du registrierst dich am Veranstalter-Stand, bekommst eine Startbahn zugewiesen</li>
            <li>Pro Station: Pflock suchen → Distanz schätzen → schießen → Pfeile aus dem Tier ziehen → Punkte notieren</li>
            <li>Nach der letzten Station: zum Auswerter zurückkehren, Karten abgeben</li>
            <li>Die App ersetzt die Zettelwirtschaft — Score, Pfeile, Heatmap, Foto pro Station</li>
          </ol>
        </SubSection>

        <SubSection title="Tipps für Anfänger">
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <b>Distanz schätzen ist die halbe Miete.</b> Auf den ersten 5–10 Bahnen bewusst trainieren — die App speichert deine Schätzdistanzen pro Bahn-Tier.
            </li>
            <li>
              <b>Standpunkt-Regel beachten.</b> Wo genau du stehen musst, regelt der Verband:
              bei <b>WA</b> stehen beide Füße auf einer Linie mit dem Pflock,
              bei <b>IFAA</b> muss mindestens ein Fuß den Pflock berühren oder direkt neben ihm aufliegen.
              Im Zweifel beim Veranstalter / Schiedsrichter nachfragen.
              Details siehe <Link to="/help/pegs" className="text-cherry-600 dark:text-cherry-200 underline">Pflöcke &amp; Distanzen</Link>.
            </li>
            <li>
              <b>Pfeil-Verlust ist normal.</b> Plane 2–3 Verlustpfeile pro Jahr ein. In den Pfeil-Sets der App kannst du Verluste und Defekte mitführen.
            </li>
            <li>
              <b>Auf öffentlichen Parcours</b> kannst du Reviews lesen und vorab Fotos der Bahnen ansehen — wenn andere User welche hochgeladen haben.
            </li>
          </ul>
        </SubSection>
      </section>

      {/* ═══ Feldbogen ════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">Feldbogen</h2>
        <p className="text-primary">
          Beim Feldbogen schießt du auf <b>klassische Ringauflagen</b> (Papier oder Folie) auf
          Holzscheiben, verteilt im Wald. Im Gegensatz zu 3D gibt es keine Tier-Silhouette — nur
          den Ringkern. Auflagen kommen in vier Größen (Ø 20 / 40 / 60 / 80 cm).
        </p>

        <ScoringReference anchor="feldbogen-wa-dsb" />

        <div className="grid sm:grid-cols-2 gap-3">
          <HelpIllustrationBox
            illustration={<FieldWATargetSVG size={180} />}
            caption="WA-Field-Auflage (6er-Wertung)"
          >
            <p className="font-semibold mb-1">Feldbogen · WA / DSB</p>
            <p className="text-secondary text-sm mb-1.5">24 Scheiben × 4 Pfeile = 96 Pfeile gesamt</p>
            <ul className="text-sm space-y-0.5">
              <li><b>6</b> · innerer gelber Ring</li>
              <li><b>5</b> · äußerer gelber Ring</li>
              <li><b>4 · 3</b> · schwarze Ringe</li>
              <li><b>2 · 1</b> · weiße Ringe</li>
              <li><b>X</b> · Center, Tie-Break-Marker</li>
            </ul>
          </HelpIllustrationBox>

          <HelpIllustrationBox
            illustration={<FieldIFAATargetSVG size={180} />}
            caption="IFAA-Field/Hunter-Auflage"
          >
            <p className="font-semibold mb-1">Feldbogen · IFAA</p>
            <p className="text-secondary text-sm mb-1.5">28 Scheiben × 4 Pfeile</p>
            <ul className="text-sm space-y-0.5">
              <li><b>5</b> · Zentrum (Weiß)</li>
              <li><b>4</b> · mittlerer Ring</li>
              <li><b>3</b> · äußerer Ring</li>
              <li><b>0</b> · Fehl</li>
            </ul>
          </HelpIllustrationBox>
        </div>

        <SubSection title="Markierte vs. unmarkierte Distanzen">
          <p className="text-sm">
            Im WA-Field werden Distanzen pro Scheibe <b>angegeben</b> (5–60 m je nach Auflagengröße).
            Im IFAA-Hunter sind die Distanzen <b>unmarkiert</b> — du musst schätzen, wie weit es zur
            Scheibe ist. Beim IFAA-Field gibt es beide Varianten je nach Veranstaltung.
          </p>
        </SubSection>

        <SubSection title="Tipp: Drei-Pfeil-Ende vs. Vier-Pfeil-Ende">
          <p className="text-sm">
            Bei IFAA-Hunter und manchen WA-Field-Varianten gibt es 3 statt 4 Pfeile pro Scheibe.
            Beim Anlegen eines Trainings in der App wählst du die Disziplin — die Pfeilanzahl
            ist dann voreingestellt.
          </p>
        </SubSection>
      </section>

      {/* ═══ Scheibenschießen ═════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">Scheibenschießen</h2>
        <p className="text-primary">
          Frei konfigurierbares Format für <b>Halle, Outdoor oder Training</b>. Du wählst alles
          selbst: Distanz, Ringzahl der Scheibe, Pfeile pro Aufnahme und Anzahl Aufnahmen.
        </p>

        <ScoringReference anchor="scheibenschiessen" />

        <HelpIllustrationBox
          illustration={<WATargetSVG size={220} />}
          caption="WA-Standardauflage (10 Ringe + X)"
        >
          <p className="text-primary mb-2">
            <b>Hierarchie</b> der Begriffe:
          </p>
          <ul className="text-sm space-y-0.5">
            <li><b>Pfeil</b> — Einzelschuss in eine Ringzone</li>
            <li><b>Aufnahme</b> — alle N Pfeile, die du am Stück abgibst (typisch 3 oder 6)</li>
            <li><b>Leg</b> — eine Folge von Aufnahmen</li>
            <li><b>Set</b> — eine Folge von Legs</li>
          </ul>
          <p className="text-secondary text-sm mt-2 italic">
            Bei Halle 18m üblich: 30 Pfeile in 10 Aufnahmen à 3 Pfeilen, 600 max.
          </p>
        </HelpIllustrationBox>

        <SubSection title="Wertungsvarianten">
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li>
              <b>Gesamtsumme</b> — klassisch. Alle Punkte werden addiert. Geeignet für Halle 18m,
              FITA 70m, Hallenturniere.
            </li>
            <li>
              <b>Best of Legs</b> — Darts-Style. Wer das höhere End-Total pro Leg hat, gewinnt das
              Leg. Wer zuerst X Legs hat, gewinnt.
            </li>
            <li>
              <b>Sets &amp; Legs</b> — Match-Modus (wie WA-Olympiarunde). Wer zuerst X Legs hat,
              gewinnt ein Set; wer zuerst Y Sets hat, gewinnt das Match.
            </li>
          </ul>
        </SubSection>

        <SubSection title="Multi-Player-Modi">
          <p className="text-sm">
            Beim Anlegen eines Scheibenschießen-Trainings mit mehreren Teilnehmern wählst du
            zwischen zwei Modi:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              <b>„Einer scort"</b> — der Owner trägt alle Pfeile für alle Spieler ein. Eine Person
              hat das Gerät in der Hand, die anderen schauen zu.
            </li>
            <li>
              <b>„Jeder selbst"</b> — jeder Spieler scort am eigenen Gerät, parallel. Treffer-Heatmap
              zeigt alle Spieler farbcodiert.
            </li>
          </ul>
        </SubSection>
      </section>

      {/* ═══ Halle / FITA ═════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">Halle &amp; FITA-Outdoor</h2>
        <p className="text-primary">
          Klassische Wettkampf-Disziplinen — strukturierte Erfassung pro Pfeil gibt's am
          schnellsten über <b>Scheibenschießen</b> (oben), wo du Pfeile-pro-Aufnahme + Ringzahl selbst wählst.
          Alternativ trägst du im Modus <b>„Einfach"</b> nur die Gesamtpunktzahl ein — ideal für eine
          schnelle Notiz nach dem Schießen.
        </p>
      </section>
    </div>
  );
}
