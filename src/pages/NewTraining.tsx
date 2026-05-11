import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  PEG_LABELS,
  createTraining,
  type BowType,
  type Discipline,
  type PegColor,
} from "../api/trainings";

const DISCIPLINES = Object.keys(DISCIPLINE_LABELS) as Discipline[];
const BOWS = Object.keys(BOW_LABELS) as BowType[];
const PEGS = Object.keys(PEG_LABELS) as PegColor[];

export default function NewTraining() {
  const nav = useNavigate();
  const [discipline, setDiscipline] = useState<Discipline>("3d_wa");
  const [bowType, setBowType] = useState<BowType>("recurve");
  const [pegColor, setPegColor] = useState<PegColor | "">("");
  const [distanceMarked, setDistanceMarked] = useState<"" | "yes" | "no">("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is3d = discipline.startsWith("3d_");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await createTraining({
        discipline,
        bow_type: bowType,
        peg_color: is3d && pegColor ? pegColor : null,
        distance_marked: distanceMarked === "" ? null : distanceMarked === "yes",
        location: location || null,
        notes: notes || null,
      });
      nav(`/trainings/${r.training.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Training nicht anlegen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Neues Training</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Disziplin / Wertung">
          <select
            className="input"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as Discipline)}
          >
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {DISCIPLINE_LABELS[d]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Bogen">
          <select
            className="input"
            value={bowType}
            onChange={(e) => setBowType(e.target.value as BowType)}
          >
            {BOWS.map((b) => (
              <option key={b} value={b}>
                {BOW_LABELS[b]}
              </option>
            ))}
          </select>
        </Field>

        {is3d && (
          <>
            <Field label="Pflock-Farbe (optional)">
              <select
                className="input"
                value={pegColor}
                onChange={(e) => setPegColor(e.target.value as PegColor | "")}
              >
                <option value="">— nicht angegeben —</option>
                {PEGS.map((p) => (
                  <option key={p} value={p}>
                    {PEG_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Distanz">
              <select
                className="input"
                value={distanceMarked}
                onChange={(e) => setDistanceMarked(e.target.value as "" | "yes" | "no")}
              >
                <option value="">— nicht angegeben —</option>
                <option value="yes">Markiert</option>
                <option value="no">Unmarkiert (geschätzt)</option>
              </select>
            </Field>
          </>
        )}

        <Field label="Ort (optional)">
          <input
            className="input"
            placeholder="z. B. Parcours XY"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>

        <Field label="Notiz (optional)">
          <textarea
            className="input"
            rows={2}
            placeholder="Wind, Stimmung, Ausrüstungs-Setup, …"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => nav("/")}>
            Abbrechen
          </button>
          <button className="btn flex-1" disabled={busy}>
            {busy ? "Lege an…" : "Training starten"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-archer-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
