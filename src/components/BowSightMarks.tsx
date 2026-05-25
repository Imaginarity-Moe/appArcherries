import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Check, X, Crosshair, Info } from "lucide-react";
import {
  listSightMarks, createSightMark, deleteSightMark,
  type SightMark,
} from "../api/bows";

/**
 * Sight-Marks-Calculator: User trägt bekannte (Distanz, Markenwert)-Paare ein,
 * App interpoliert per quadratischer Regression alle Zwischen-Distanzen.
 *
 * Mathematik:
 *  - ≥3 Punkte: quadratische Regression (Least-Squares) y = ax² + bx + c
 *  - 2 Punkte: lineare Interpolation
 *  - 1 Punkt: konstante Anzeige + Hinweis "mehr Punkte nötig"
 *  - 0 Punkte: nur Eingabe-Formular
 *
 * Die Markenwert-Skala ist beliebig (mm, Skalen­einheiten, Schraub­schritte) —
 * der Calculator skaliert linear.
 */
export default function BowSightMarks({ bowId }: { bowId: number }) {
  const [marks, setMarks] = useState<SightMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add-Form
  const [newDist, setNewDist] = useState("");
  const [newMark, setNewMark] = useState("");

  useEffect(() => {
    if (!bowId) return;
    listSightMarks(bowId).then((r) => setMarks(r.marks)).catch((e) => setError(e instanceof Error ? e.message : "Konnte Marken nicht laden")).finally(() => setLoading(false));
  }, [bowId]);

  async function addMark() {
    const d = parseFloat(newDist.replace(",", "."));
    const m = parseFloat(newMark.replace(",", "."));
    if (Number.isNaN(d) || Number.isNaN(m)) {
      setError("Bitte beide Felder ausfüllen");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await createSightMark(bowId, { distance_m: d, mark_value: m });
      setMarks(r.marks);
      setNewDist("");
      setNewMark("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Marke nicht hinzufügen");
    } finally {
      setBusy(false);
    }
  }

  async function removeMark(smId: number) {
    setBusy(true);
    try {
      const r = await deleteSightMark(bowId, smId);
      setMarks(r.marks);
    } finally {
      setBusy(false);
    }
  }

  const regression = useMemo(() => fitRegression(marks), [marks]);

  if (loading) return <div className="card-sunken text-sm text-secondary">Lade Visiermarken…</div>;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Crosshair size={18} strokeWidth={1.75} className="text-cherry-500" />
        <h2 className="eyebrow flex-1">Visiermarken (Sight-Marks-Calculator)</h2>
        <span className="text-xs text-muted tabular-nums">{marks.length} {marks.length === 1 ? "Eintrag" : "Einträge"}</span>
      </div>

      <div className="card-sunken text-sm flex items-start gap-2">
        <Info size={14} strokeWidth={1.75} className="text-cherry-500 shrink-0 mt-0.5" />
        <div className="text-secondary">
          Trage <b>2 oder mehr bekannte Visier­marken</b> ein (z.B. „18 m → 8.4", „30 m → 6.2", „50 m → 4.1"
          oder Visier-Skalen­einheiten). Ab 3 Marken interpoliert die App quadratisch — du bekommst
          eine komplette Marken-Tabelle für alle Distanzen. Die Einheit ist beliebig (mm,
          Skalen­schritte, Schraub­umdrehungen).
        </div>
      </div>

      {error && <div className="text-sm text-cherry-600">{error}</div>}

      {/* Bestehende Marken */}
      {marks.length > 0 && (
        <div className="card-sunken space-y-2">
          <p className="text-xs text-muted uppercase tracking-wider">Deine Marken</p>
          <ul className="space-y-1">
            {marks.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono tabular-nums w-16 shrink-0">{m.distance_m} m</span>
                <span className="text-muted">→</span>
                <span className="font-mono tabular-nums flex-1 font-semibold">{m.mark_value}</span>
                <button
                  type="button"
                  onClick={() => removeMark(m.id)}
                  disabled={busy}
                  className="btn-icon shrink-0"
                  aria-label="Entfernen"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add-Form */}
      <div className="card-sunken space-y-2">
        <p className="text-xs text-muted uppercase tracking-wider">Neue Marke hinzufügen</p>
        <div className="flex items-center gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-1.5 bg-canvas rounded-lg border border-hairline px-2.5 py-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={newDist}
              onChange={(e) => setNewDist(e.target.value)}
              placeholder="18"
              className="flex-1 min-w-0 w-0 bg-transparent border-0 outline-none text-base font-mono tabular-nums"
              aria-label="Distanz"
            />
            <span className="text-xs text-muted shrink-0">m</span>
          </label>
          <span className="text-muted">→</span>
          <label className="flex-1 min-w-0 flex items-center gap-1.5 bg-canvas rounded-lg border border-hairline px-2.5 py-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={newMark}
              onChange={(e) => setNewMark(e.target.value)}
              placeholder="8.4"
              className="flex-1 min-w-0 w-0 bg-transparent border-0 outline-none text-base font-mono tabular-nums"
              aria-label="Markenwert"
            />
            <span className="text-xs text-muted shrink-0">Marke</span>
          </label>
          <button
            type="button"
            onClick={addMark}
            disabled={busy || !newDist || !newMark}
            className="btn-accent shrink-0 inline-flex items-center gap-1"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Interpolierte Tabelle */}
      {regression && (
        <div className="card-sunken">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-muted uppercase tracking-wider">
              Interpolierte Marken — {regression.kind === "quadratic" ? "Quadratische Regression" : "Lineare Interpolation"}
            </p>
            <span className="text-xs text-muted">
              {regression.kind === "quadratic" && `R² = ${regression.r2.toFixed(3)}`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono tabular-nums">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wider text-secondary/70">
                  <th className="py-1.5 px-2 text-left">Distanz</th>
                  <th className="py-1.5 px-2 text-right">Marke</th>
                  <th className="py-1.5 px-2 text-right">Quelle</th>
                </tr>
              </thead>
              <tbody>
                {buildInterpolationTable(marks, regression).map((row, i) => (
                  <tr key={i} className={`border-b border-hairline last:border-0 ${row.source === "input" ? "bg-cherry-50/30 dark:bg-cherry-900/10" : ""}`}>
                    <td className="py-1.5 px-2 text-left">{row.distance} m</td>
                    <td className={`py-1.5 px-2 text-right ${row.source === "input" ? "font-semibold" : ""}`}>{row.markText}</td>
                    <td className="py-1.5 px-2 text-right text-xs text-muted">
                      {row.source === "input" ? "eingegeben" : "interpoliert"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {marks.length === 1 && (
        <div className="card-sunken text-sm text-secondary text-center py-3">
          Eine Marke reicht für keine Interpolation. <b>Trage mindestens 2 Marken ein</b> —
          mit 3+ wird die Rechnung präzise (quadratische Anpassung).
        </div>
      )}

      {marks.length === 0 && (
        <div className="card-sunken text-sm text-secondary text-center py-3">
          Keine Marken hinterlegt. Trage oben deine ersten bekannten Visier­einstellungen ein.
        </div>
      )}
    </section>
  );
}

// ─── Mathematik ──────────────────────────────────────────────────────────────

type RegResult =
  | { kind: "quadratic"; a: number; b: number; c: number; r2: number }
  | { kind: "linear";    m: number; c: number }
  | null;

/** Quadratische Regression Least-Squares oder lineare Interpolation. */
function fitRegression(marks: SightMark[]): RegResult {
  const n = marks.length;
  if (n < 2) return null;

  if (n === 2) {
    const [p0, p1] = marks;
    const dx = p1.distance_m - p0.distance_m;
    if (dx === 0) return null;
    const slope = (p1.mark_value - p0.mark_value) / dx;
    const intercept = p0.mark_value - slope * p0.distance_m;
    return { kind: "linear", m: slope, c: intercept };
  }

  // 3+ Punkte: quadratische Regression y = ax² + bx + c
  // Normal-Gleichungen lösen:
  //   [Σx⁴ Σx³ Σx²][a]   [Σx²y]
  //   [Σx³ Σx² Σx ][b] = [Σxy ]
  //   [Σx² Σx  n ][c]   [Σy  ]
  let Sx = 0, Sx2 = 0, Sx3 = 0, Sx4 = 0, Sy = 0, Sxy = 0, Sx2y = 0;
  for (const p of marks) {
    const x = p.distance_m;
    const y = p.mark_value;
    const x2 = x * x;
    Sx += x; Sx2 += x2; Sx3 += x2 * x; Sx4 += x2 * x2;
    Sy += y; Sxy += x * y; Sx2y += x2 * y;
  }

  // 3x3-Gauss
  const A = [
    [Sx4, Sx3, Sx2, Sx2y],
    [Sx3, Sx2, Sx,  Sxy ],
    [Sx2, Sx,  n,   Sy  ],
  ];

  for (let i = 0; i < 3; i++) {
    // Pivotwahl
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) return null; // singulär
    for (let j = i; j < 4; j++) A[i][j] /= pivot;
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const f = A[k][i];
      for (let j = i; j < 4; j++) A[k][j] -= f * A[i][j];
    }
  }
  const a = A[0][3], b = A[1][3], c = A[2][3];

  // R² berechnen
  const yMean = Sy / n;
  let ssRes = 0, ssTot = 0;
  for (const p of marks) {
    const yPred = a * p.distance_m * p.distance_m + b * p.distance_m + c;
    ssRes += (p.mark_value - yPred) ** 2;
    ssTot += (p.mark_value - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return { kind: "quadratic", a, b, c, r2 };
}

/** Wert an Distanz auswerten. */
function predict(reg: RegResult, x: number): number | null {
  if (!reg) return null;
  if (reg.kind === "linear") return reg.m * x + reg.c;
  return reg.a * x * x + reg.b * x + reg.c;
}

/** Tabelle mit Schritten von 5m, Min/Max ±5m um den Eingabebereich. */
function buildInterpolationTable(
  marks: SightMark[],
  reg: RegResult
): { distance: number; markText: string; source: "input" | "interp" }[] {
  if (marks.length === 0 || !reg) return [];
  const inputDist = new Set(marks.map((m) => m.distance_m));
  const minD = Math.min(...marks.map((m) => m.distance_m));
  const maxD = Math.max(...marks.map((m) => m.distance_m));
  // Tabelle von max(5, minD-5) bis maxD+10, Schritt 5m
  const start = Math.max(5, Math.floor((minD - 5) / 5) * 5);
  const end   = Math.ceil((maxD + 10) / 5) * 5;
  const rows: { distance: number; markText: string; source: "input" | "interp" }[] = [];
  for (let d = start; d <= end; d += 5) {
    const isInput = inputDist.has(d);
    if (isInput) {
      const m = marks.find((mm) => mm.distance_m === d)!;
      rows.push({ distance: d, markText: m.mark_value.toFixed(2), source: "input" });
    } else {
      const v = predict(reg, d);
      rows.push({
        distance: d,
        markText: v === null ? "—" : v.toFixed(2),
        source: "interp",
      });
    }
  }
  // Auch nicht-5er Marken (z.B. 18m, 22m) mit aufnehmen wenn sie nicht im Raster sind
  for (const m of marks) {
    if (m.distance_m % 5 !== 0) {
      const idx = rows.findIndex((r) => r.distance > m.distance_m);
      const row = { distance: m.distance_m, markText: m.mark_value.toFixed(2), source: "input" as const };
      if (idx === -1) rows.push(row);
      else rows.splice(idx, 0, row);
    }
  }
  return rows;
}

// Suppress unused-import warnings if Check/X aren't used yet
void Check; void X;
