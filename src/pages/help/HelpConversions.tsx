import { useState } from "react";
import { ArrowRightLeft, Info } from "lucide-react";

/**
 * Umrechnungstabellen + Live-Konverter für Bogensport-Größen.
 *
 * Vier Klassiker: Zoll↔mm, Grain↔Gramm, Inch↔cm, lbs↔kg.
 * Plus Yards↔Meter und Pfeilspine-Übersicht.
 */
export default function HelpConversions() {
  return (
    <div className="space-y-7">
      <h1 className="font-display text-2xl font-semibold">Umrechnungstabellen &amp; Tools</h1>
      <p className="text-secondary">
        US-Maße sind im Bogensport allgegenwärtig: Pfeile in <b>Zoll</b>, Spitzen in
        <b> Grain</b>, Bogen-Zuggewichte in <b>lbs</b>. Hier findest du die wichtigsten
        Umrechnungen — als Tabelle zum Nachschlagen und als interaktiver Live-Rechner.
      </p>

      {/* ─── Live-Konverter ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Live-Konverter
        </h2>

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

      {/* ─── Zoll → mm Tabelle (Pfeil-Schaft-Standards) ─────────────────── */}
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

      {/* ─── Pfeil-Spine-Orientierung ───────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold border-b border-hairline pb-2">
          Pfeil-Spine — Orientierungswerte
        </h2>
        <div className="card-sunken text-sm flex items-start gap-2">
          <Info size={16} strokeWidth={1.75} className="text-cherry-500 shrink-0 mt-0.5" />
          <p className="text-secondary">
            <b>Spine</b> = Biegesteifigkeit eines Pfeils, in Carbon-Zahl (z.B. 500, 600, 700).
            Niedrige Zahl = steifer = für stärkere Bögen. Diese Tabelle ist nur eine grobe
            Orientierung — Hersteller-Charts (Easton, Gold Tip, …) sind genauer. Wichtige
            Faktoren: Zuggewicht, Pfeillänge, Spitzengewicht, Bogentyp.
          </p>
        </div>
        <Table
          headers={["Zuggewicht (lbs)", "Pfeillänge 27\"", "28\"", "29\"", "30\""]}
          rows={[
            ["25–30",  "800", "700", "700", "600"],
            ["30–35",  "700", "600", "600", "500"],
            ["35–40",  "600", "500", "500", "500"],
            ["40–45",  "500", "500", "400", "400"],
            ["45–50",  "500", "400", "400", "340"],
            ["50–55",  "400", "400", "340", "340"],
            ["55–60",  "400", "340", "340", "300"],
            ["60–65",  "340", "340", "300", "300"],
            ["65–70",  "340", "300", "300", "260"],
          ]}
        />
        <p className="text-xs text-secondary italic">
          Hersteller-Charts: <a href="https://eastonarchery.com/huntingcharts/" className="underline" target="_blank" rel="noreferrer">Easton</a>
          {" · "}<a href="https://www.goldtip.com/spine-charts/" className="underline" target="_blank" rel="noreferrer">Gold Tip</a>
          {" · "}<a href="https://www.victoryarchery.com/spine-chart/" className="underline" target="_blank" rel="noreferrer">Victory</a>
        </p>
      </section>

      <p className="text-xs text-secondary italic text-center pt-3 border-t border-hairline">
        Inspiration für diese Tabellen: <a href="https://www.arrowforge.de" target="_blank" rel="noreferrer" className="underline">arrowforge.de</a>
      </p>
    </div>
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
