import { useState } from "react";
import { ArrowRightLeft, Info } from "lucide-react";

/**
 * Umrechnungstabellen + Live-Konverter für Bogensport-Größen.
 *
 * Vier Klassiker: Zoll↔mm, Grain↔Gramm, Inch↔cm, lbs↔kg.
 * Plus Yards↔Meter und Pfeilspine-Übersicht.
 */
type Mode = "converter" | "tables";

export default function HelpConversions() {
  const [mode, setMode] = useState<Mode>("converter");
  return (
    <div className="space-y-7">
      <h1 className="font-display text-2xl font-semibold">Umrechnungstabellen &amp; Tools</h1>
      <p className="text-secondary">
        US-Maße sind im Bogensport allgegenwärtig: Pfeile in <b>Zoll</b>, Spitzen in
        <b> Grain</b>, Bogen-Zuggewichte in <b>lbs</b>. Wähle, ob du schnell rechnen
        willst oder Werte nachschlagen.
      </p>

      {/* ─── Pill-Switch: Konverter ↔ Tabellen ─────────────────────────── */}
      <div className="flex items-center gap-1 -mx-1 px-1 overflow-x-auto">
        <PillButton active={mode === "converter"} onClick={() => setMode("converter")}>
          Live-Konverter
        </PillButton>
        <PillButton active={mode === "tables"} onClick={() => setMode("tables")}>
          Umrechnungstabellen
        </PillButton>
      </div>

      {/* ─── Live-Konverter ─────────────────────────────────────────────── */}
      {mode === "converter" && (
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Converter
            label="Zoll ↔ Millimeter"
            unitA="in"
            unitB="mm"
            factor={25.4}
            tip="Pfeil-Innen-/Außen-Durchmesser, Schaft-Längen"
          />
          <Converter
            label="Grain ↔ Gramm"
            unitA="gr"
            unitB="g"
            factor={0.06479891}
            tip="Spitzen-, Inserts-, Pfeilgewicht"
          />
          <Converter
            label="Zoll ↔ Zentimeter"
            unitA="in"
            unitB="cm"
            factor={2.54}
            tip="Pfeillänge, Brace Height, Stabilisator"
          />
          <Converter
            label="Pfund ↔ Kilogramm"
            unitA="lbs"
            unitB="kg"
            factor={0.45359237}
            tip="Zuggewicht, Sehnen-Vorspannung"
          />
          <Converter
            label="Yards ↔ Meter"
            unitA="yd"
            unitB="m"
            factor={0.9144}
            tip="US-Tournament-Distanzen (z.B. 70 yd ≈ 64 m)"
          />
          <Converter
            label="Fuß ↔ Meter"
            unitA="ft"
            unitB="m"
            factor={0.3048}
            tip="Selten gebraucht — manchmal bei 3D-Distanzen"
          />
        </div>
      </section>
      )}

      {/* ─── Umrechnungstabellen ─────────────────────────────────────────── */}
      {mode === "tables" && (
      <div className="space-y-7">
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Zoll (Bruchteile) → Millimeter
        </h2>
        <p className="text-sm text-secondary">
          Pfeil-Innen- und Außendurchmesser werden klassisch in Zoll-Brüchen angegeben. So findest
          du die richtige Nocke / das richtige Tube zu deinem Schaft.
        </p>
        <Table
          headers={["Zoll", "Bruch", "mm"]}
          rows={[
            ["1/8",   "0,125", "3,18"],
            ["3/16",  "0,188", "4,76"],
            ["7/32",  "0,219", "5,56"],
            ["1/4",   "0,250", "6,35"],
            ["9/32",  "0,281", "7,14"],
            ["5/16",  "0,313", "7,94"],
            ["11/32", "0,344", "8,73"],
            ["23/64", "0,359", "9,13"],
            ["3/8",   "0,375", "9,53"],
            ["13/32", "0,406", "10,32"],
            ["7/16",  "0,438", "11,11"],
            ["1\"",   "1,000", "25,40"],
          ]}
        />
      </section>

      {/* ─── Grain → Gramm ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Grain → Gramm (Spitzen + Pfeilgewicht)
        </h2>
        <p className="text-sm text-secondary">
          Spitzen werden im Bogensport fast immer in <b>Grain</b> angegeben (1 gr = 0,0648 g).
          Typische Field-Tip-Gewichte für Field-/3D-Pfeile: 75–125 grain. Für Outdoor-Recurve:
          80–110 grain. Für Compound-Outdoor: 100–150 grain.
        </p>
        <Table
          headers={["Grain", "Gramm"]}
          rows={[
            ["10",  "0,65"],
            ["30",  "1,94"],
            ["50",  "3,24"],
            ["75",  "4,86"],
            ["80",  "5,18"],
            ["90",  "5,83"],
            ["100", "6,48"],
            ["120", "7,78"],
            ["125", "8,10"],
            ["150", "9,72"],
            ["175", "11,34"],
            ["200", "12,96"],
          ]}
        />
      </section>

      {/* ─── Inch → cm ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Zoll → Zentimeter (Pfeillänge, Brace Height)
        </h2>
        <p className="text-sm text-secondary">
          Pfeil-Längen und Bogen-Maße sind häufig in vollen Zoll angegeben. Typische
          Pfeil-Längen: 25–32 Zoll je nach Auszugslänge. Brace Height: 7–9 Zoll.
        </p>
        <Table
          headers={["Zoll", "cm"]}
          rows={[
            ["6",  "15,2"],
            ["7",  "17,8"],
            ["8",  "20,3"],
            ["9",  "22,9"],
            ["20", "50,8"],
            ["25", "63,5"],
            ["26", "66,0"],
            ["27", "68,6"],
            ["28", "71,1"],
            ["29", "73,7"],
            ["30", "76,2"],
            ["31", "78,7"],
            ["32", "81,3"],
            ["60", "152,4"],
            ["68", "172,7"],
            ["70", "177,8"],
          ]}
        />
      </section>

      {/* ─── lbs → kg (Zuggewicht) ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Pfund → Kilogramm (Bogen-Zuggewicht)
        </h2>
        <p className="text-sm text-secondary">
          Bogen-Zuggewichte sind in <b>lbs</b> (pounds @ 28&quot; Auszug) angegeben.
          Typische Werte:
        </p>
        <ul className="text-sm text-secondary list-disc pl-5 space-y-0.5">
          <li><b>Anfänger Recurve</b>: 18–24 lbs (8–11 kg)</li>
          <li><b>Erwachsene Recurve</b>: 26–36 lbs (12–16 kg)</li>
          <li><b>Compound Hunting</b>: 50–70 lbs (23–32 kg)</li>
          <li><b>3D-Compound</b>: 40–55 lbs (18–25 kg)</li>
        </ul>
        <Table
          headers={["lbs", "kg"]}
          rows={[
            ["10",  "4,54"],
            ["15",  "6,80"],
            ["20",  "9,07"],
            ["25", "11,34"],
            ["30", "13,61"],
            ["35", "15,88"],
            ["40", "18,14"],
            ["45", "20,41"],
            ["50", "22,68"],
            ["55", "24,95"],
            ["60", "27,22"],
            ["70", "31,75"],
          ]}
        />
      </section>

      {/* ─── Yards → Meter (FITA & US-Tournament) ───────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Yards → Meter (US-Tournament-Distanzen)
        </h2>
        <p className="text-sm text-secondary">
          US-Wettkämpfe arbeiten oft mit Yards. So findest du die Meter-Entsprechung
          für FITA-Vergleiche.
        </p>
        <Table
          headers={["Yards", "Meter"]}
          rows={[
            ["10",   "9,14"],
            ["20",  "18,29"],
            ["30",  "27,43"],
            ["40",  "36,58"],
            ["50",  "45,72"],
            ["60",  "54,86"],
            ["70",  "64,01"],
            ["80",  "73,15"],
            ["90",  "82,30"],
            ["100", "91,44"],
          ]}
        />
      </section>
      </div>
      )}

      {/* ─── Auszugslänge & Pfeillänge (immer sichtbar) ──────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Auszugslänge &amp; Pfeillänge
        </h2>
        <p className="text-sm text-secondary">
          Pfeillänge und Auszugslänge sind <b>nicht dasselbe</b> — der Pfeil ist meist etwas
          länger als dein tatsächlicher Auszug. Beide Werte zu kennen ist die Grundlage für
          die richtige Spine-Wahl.
        </p>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Wichtig: Auszugslänge vs. AMO-Maß</p>
          <p className="text-secondary">
            Es gibt zwei Maße, die oft verwechselt werden:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-secondary mt-1">
            <li>
              <b>Tatsächliche Auszugslänge</b> (deine reale Auszugsweite, gemessen am Bogen
              im vollen Auszug): das ist das, was du beim Schießen wirklich machst.
            </li>
            <li>
              <b>AMO-Draw-Length</b>: ein technisches Standardmaß ≈ tatsächliche Auszugslänge
              + 1,75&quot;. Wird in Hersteller-Charts und Compound-Specs verwendet.
            </li>
          </ul>
          <p className="text-secondary text-xs italic mt-1">
            Beispiel: Wer 28&quot; tatsächlichen Auszug hat, hat AMO-Draw-Length ≈ 29,75&quot;.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Auszugslänge messen — drei Methoden</p>
          <ol className="list-decimal pl-5 space-y-1 text-secondary">
            <li>
              <b>Armspannweite ÷ 2,5</b>: Arme seitlich ausstrecken, Mittelfinger-zu-Mittelfinger
              messen, durch 2,5 teilen. Das ergibt die <b>AMO-Draw-Length</b> — die tatsächliche
              Auszugslänge ist davon etwa 1,75&quot; kleiner. Beispiel: 188 cm Spannweite ÷ 2,5
              ≈ 75 cm ≈ 29,6&quot; AMO → tatsächlicher Auszug ≈ 27,8&quot;. Pfeillänge dann
              ~29–30&quot; (mit Sicherheits-Puffer).
            </li>
            <li>
              <b>Im Bogenladen messen lassen</b> (genaueste Methode): Mess-Pfeil mit
              Zoll-Markierungen, Verkäufer:in liest am Anker ab. Liefert direkt die
              tatsächliche Auszugslänge.
            </li>
            <li>
              <b>Selbst nachmessen</b>: Mit ausgezogenem Pfeil im echten Bogen einen Marker
              an der Stelle setzen, an der die Pfeilauflage anliegt. Distanz zum Nockenende =
              tatsächliche Auszugslänge.
            </li>
          </ol>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Pfeillänge wählen — Faustregel</p>
          <p className="text-secondary">
            Die Pfeillänge (von Sehnen­nut bis Ende des Schafts, ohne Spitze) sollte
            <b> mindestens deine tatsächliche Auszugslänge erreichen, mit 1–2 Zoll Puffer</b>:
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-secondary">
            <li><b>Anfänger / Jugend</b>: tatsächlicher Auszug + 2&quot; (1 Zoll Sicherheits-Reserve, 1 Zoll für Wachstum / Anker-Drift)</li>
            <li><b>Erfahrene Recurve / Blank</b>: tatsächlicher Auszug + 1 bis 1,5&quot;</li>
            <li><b>Compound mit Release</b>: Auszugslänge ist durch Wall + Cam fest definiert — Pfeil = Auszug + 0,5 bis 1&quot;</li>
          </ul>
          <p className="text-secondary text-xs italic mt-1">
            <b>Sicherheit:</b> Der Pfeil darf bei vollem Auszug niemals hinter der Pfeilauflage liegen.
            Sonst kann er beim Lösen abrutschen — schwere Verletzungsgefahr.
          </p>
        </div>

        <div className="card-sunken text-sm space-y-2">
          <p className="font-semibold">Typische tatsächliche Auszugslängen pro Statur</p>
          <div className="flex items-start gap-2 text-xs text-secondary">
            <Info size={14} strokeWidth={1.75} className="text-cherry-500 shrink-0 mt-0.5" />
            <p>
              <b>Das sind gängige Standardwerte.</b> Die echte Auszugslänge ist individuell
              und hängt von Körperproportionen, Schulter­beweglichkeit, Anker­position,
              Bogenklasse und Schießtechnik ab. Zwei Schützen gleicher Größe können
              durchaus 2–3 Zoll auseinander liegen. Verlasse dich nicht ausschließlich
              auf diese Tabelle — lass dich im Bogenladen ausmessen.
            </p>
          </div>
          <Table
            headers={["Zielgruppe", "Auszug", "Pfeillänge"]}
            rows={[
              ["Kinder (6–10 Jahre)",            "17–20\"",   "19–22\""],
              ["Jugend (11–15 Jahre)",           "20–24\"",   "22–26\""],
              ["Erwachsene klein (155–170 cm)",  "23–26\"",   "25–28\""],
              ["Erwachsene mittel (170–185 cm)", "26–28\"",   "27–30\""],
              ["Erwachsene groß (185+ cm)",      "28–30\"",   "29–31\""],
            ]}
          />
        </div>
      </section>

      {/* ─── Pfeil-Spine-Orientierung ───────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Pfeil-Spine — Orientierungswerte
        </h2>
        <div className="card-sunken text-sm flex items-start gap-2">
          <Info size={16} strokeWidth={1.75} className="text-cherry-500 shrink-0 mt-0.5" />
          <div className="text-secondary space-y-1">
            <p>
              <b>Spine</b> = Biegesteifigkeit eines Pfeils, in Carbon-Zahl (z.B. 500, 700, 1000).
              <b> Niedrige Zahl = steifer</b> = für stärkere Bögen. Bei niedrigen Zuggewichten
              (Kinder, Jugend, leichte Trainings­bögen) brauchst du sehr flexible Pfeile mit
              hoher Spine-Zahl.
            </p>
            <p>
              <b>Gängige Standardwerte für Carbon-Pfeile mit ~100&nbsp;gr Spitze.</b> Der optimale
              Spine ist individuell — Spitzen­gewicht, Befiederung, Bogentyp, Cam-Aggressivität
              und Schießstil verschieben das deutlich. Zwei Schützen mit gleichem Setup können
              unterschiedliche Spines bevorzugen. Im Zweifel: Setup in einem Bogenladen prüfen
              lassen.
            </p>
          </div>
        </div>
        <div className="card-sunken text-sm overflow-x-auto p-0">
          <table className="w-full text-sm font-mono tabular-nums">
            <thead>
              <tr className="border-b border-hairline text-secondary/80 font-semibold text-xs uppercase tracking-wider">
                <th className="py-2 px-3 text-left">Zuggewicht</th>
                <th className="py-2 px-3 text-right">Pfeil 22&quot;</th>
                <th className="py-2 px-3 text-right">24&quot;</th>
                <th className="py-2 px-3 text-right">26&quot;</th>
                <th className="py-2 px-3 text-right">28&quot;</th>
                <th className="py-2 px-3 text-right">30&quot;</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["10–15 lbs", "1500", "1400", "1300", "1200", "—"],
                ["15–20 lbs", "1300", "1200", "1100", "1000",  "—"],
                ["20–25 lbs", "1100", "1000",  "900",  "800",  "—"],
                ["25–30 lbs",  "900",  "800",  "700",  "700",  "600"],
                ["30–35 lbs",  "700",  "700",  "600",  "600",  "500"],
                ["35–40 lbs",  "600",  "600",  "500",  "500",  "500"],
                ["40–45 lbs",  "500",  "500",  "500",  "500",  "400"],
                ["45–50 lbs",  "500",  "500",  "500",  "400",  "400"],
                ["50–55 lbs",  "—",    "400",  "400",  "400",  "340"],
                ["55–60 lbs",  "—",    "400",  "400",  "340",  "340"],
                ["60–65 lbs",  "—",    "—",    "340",  "340",  "300"],
                ["65–70 lbs",  "—",    "—",    "340",  "300",  "300"],
              ].map((r, i) => (
                <tr key={i} className="border-b border-hairline last:border-0 hover:bg-elevated/30 transition">
                  <td className="py-2 px-3 text-left font-semibold">{r[0]}</td>
                  {r.slice(1).map((c, j) => (
                    <td key={j} className={`py-2 px-3 text-right ${c === "—" ? "text-muted/40" : "text-secondary"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-secondary italic">
          Sehr leichte Bögen (unter 15 lbs) + sehr kurze Pfeile sind nicht in jedem
          Carbon-Sortiment abgedeckt. Hier sind Holz- oder Aluminium-Pfeile oft die bessere
          Wahl — frag in deinem Bogenladen nach.
        </p>
      </section>
    </div>
  );
}

// ─── Pill-Button für Mode-Switch ────────────────────────────────────────────

function PillButton({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
        active
          ? "bg-cherry-500 text-cream shadow-cherry"
          : "bg-surface text-secondary hover:text-primary border border-hairline"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Live-Konverter mit Live-Update beider Felder ───────────────────────────

function Converter({
  label,
  unitA,
  unitB,
  factor,
  tip,
}: {
  label: string;
  unitA: string;
  unitB: string;
  factor: number; // 1 unitA = factor unitB
  tip?: string;
}) {
  const [a, setA] = useState("1");
  const [b, setB] = useState((1 * factor).toFixed(2));

  function changeA(v: string) {
    setA(v);
    const num = parseFloat(v.replace(",", "."));
    if (!Number.isNaN(num)) setB((num * factor).toFixed(2));
    else setB("");
  }
  function changeB(v: string) {
    setB(v);
    const num = parseFloat(v.replace(",", "."));
    if (!Number.isNaN(num)) setA((num / factor).toFixed(2));
    else setA("");
  }

  return (
    <div className="card-sunken space-y-2">
      <p className="font-semibold text-sm flex items-center gap-1.5">
        <ArrowRightLeft size={14} strokeWidth={1.75} className="text-cherry-500" />
        {label}
      </p>
      <div className="flex items-center gap-2 min-w-0">
        <label className="flex-1 min-w-0 flex items-center gap-1.5 bg-canvas rounded-lg border border-hairline px-2.5 py-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={a}
            onChange={(e) => changeA(e.target.value)}
            className="flex-1 min-w-0 w-0 bg-transparent border-0 outline-none text-sm font-mono tabular-nums"
            aria-label={unitA}
          />
          <span className="text-xs text-muted shrink-0">{unitA}</span>
        </label>
        <ArrowRightLeft size={14} strokeWidth={1.75} className="text-muted shrink-0" aria-hidden />
        <label className="flex-1 min-w-0 flex items-center gap-1.5 bg-canvas rounded-lg border border-hairline px-2.5 py-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={b}
            onChange={(e) => changeB(e.target.value)}
            className="flex-1 min-w-0 w-0 bg-transparent border-0 outline-none text-sm font-mono tabular-nums"
            aria-label={unitB}
          />
          <span className="text-xs text-muted shrink-0">{unitB}</span>
        </label>
      </div>
      {tip && <p className="text-xs text-muted">{tip}</p>}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="card-sunken overflow-x-auto p-0">
      <table className="w-full text-sm font-mono tabular-nums">
        <thead>
          <tr className="border-b border-hairline text-secondary/80 font-semibold text-xs uppercase tracking-wider">
            {headers.map((h, i) => (
              <th key={i} className={`py-2 px-3 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-hairline last:border-0 hover:bg-elevated/30 transition">
              {r.map((c, j) => (
                <td key={j} className={`py-2 px-3 ${j === 0 ? "text-left font-semibold" : "text-right text-secondary"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
