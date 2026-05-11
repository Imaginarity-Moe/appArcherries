import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  PEG_LABELS,
  ZONES_BY_DISCIPLINE,
  deleteTarget,
  deleteTraining,
  getTraining,
  updateTraining,
  upsertTarget,
  type Discipline,
  type Target,
  type Training,
  type ZoneDef,
} from "../api/trainings";

// Anzahl Pfeil-Slots je Disziplin
const SLOTS_BY_DISCIPLINE: Record<Discipline, number> = {
  "3d_wa": 2,
  "3d_ifaa": 3,
  "3d_bowhunter": 4,
  "field_wa": 3,
  simple: 0,
};

export default function TrainingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const trainingId = Number(id);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await getTraining(trainingId);
      setTraining(r.training);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete() {
    if (!confirm("Dieses Training wirklich löschen?")) return;
    await deleteTraining(trainingId);
    nav("/");
  }

  async function handleEnd() {
    await updateTraining(trainingId, {
      ended_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
    await refresh();
  }

  if (loading) return <p className="text-archer-700">Lade…</p>;
  if (error || !training) return <p className="text-red-600">{error ?? "Nicht gefunden"}</p>;

  const isSimple = training.discipline === "simple";
  const targets = training.targets ?? [];
  const isOpen = !training.ended_at;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-sm text-archer-700">
              <Link to="/" className="hover:underline">
                ← zurück
              </Link>
            </div>
            <h1 className="text-2xl font-semibold">
              {DISCIPLINE_LABELS[training.discipline]}
            </h1>
            <div className="text-sm text-archer-700">
              {BOW_LABELS[training.bow_type]}
              {training.peg_color && ` · Pflock ${PEG_LABELS[training.peg_color]}`}
              {training.distance_marked !== null &&
                ` · ${training.distance_marked ? "markiert" : "unmarkiert"}`}
            </div>
            {training.location && (
              <div className="text-sm text-archer-700">📍 {training.location}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-archer-700">{training.total_score}</div>
            <div className="text-xs text-archer-700">
              Gesamt {targets.length > 0 && `· ${targets.length} Stationen`}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {isOpen && (
            <button className="btn-ghost" onClick={handleEnd}>
              Training beenden
            </button>
          )}
          <button className="btn-ghost text-red-600" onClick={handleDelete}>
            Löschen
          </button>
        </div>
      </div>

      {isSimple ? (
        <SimpleScoreForm training={training} onChange={refresh} />
      ) : (
        <>
          <h2 className="text-lg font-semibold mt-4">Stationen</h2>
          {targets.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              discipline={training.discipline}
              trainingId={training.id}
              onChange={refresh}
            />
          ))}
          {isOpen && (
            <AddTargetButton
              discipline={training.discipline}
              trainingId={training.id}
              nextIndex={(targets[targets.length - 1]?.target_index ?? 0) + 1}
              onAdded={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Simple-Modus ─────────────────────────────────────────────────────────────

function SimpleScoreForm({
  training,
  onChange,
}: {
  training: Training;
  onChange: () => Promise<void>;
}) {
  const [value, setValue] = useState(training.summary_score?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateTraining(training.id, {
        summary_score: value === "" ? null : Number(value),
      });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <label className="block">
        <span className="text-sm font-medium text-archer-700 mb-1 block">
          Gesamt-Score
        </span>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn" onClick={save} disabled={busy}>
            Speichern
          </button>
        </div>
      </label>
    </div>
  );
}

// ─── Station-Karte ────────────────────────────────────────────────────────────

function TargetCard({
  target,
  discipline,
  trainingId,
  onChange,
}: {
  target: Target;
  discipline: Discipline;
  trainingId: number;
  onChange: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TargetEditor
        discipline={discipline}
        trainingId={trainingId}
        initial={target}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await onChange();
        }}
      />
    );
  }

  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold">Station {target.target_index}</div>
        <div className="text-sm text-archer-700">
          {target.animal_or_face || "—"}
          {target.distance_m != null && ` · ${target.distance_m} m`}
        </div>
        <div className="text-sm text-archer-700 mt-1">
          {target.shots.map((s) => (
            <span
              key={s.arrow_seq}
              className="inline-block mr-1 px-2 py-0.5 bg-archer-100 rounded text-xs"
            >
              {s.zone ?? "—"} ({s.points})
            </span>
          ))}
        </div>
      </div>
      <div className="text-right ml-2">
        <div className="text-2xl font-bold text-archer-700">{target.target_total}</div>
        <button
          className="text-xs text-archer-700 hover:underline mt-1"
          onClick={() => setEditing(true)}
        >
          Bearbeiten
        </button>
      </div>
    </div>
  );
}

// ─── Neue Station hinzufügen ──────────────────────────────────────────────────

function AddTargetButton({
  discipline,
  trainingId,
  nextIndex,
  onAdded,
}: {
  discipline: Discipline;
  trainingId: number;
  nextIndex: number;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="btn w-full" onClick={() => setOpen(true)}>
        + Station {nextIndex} hinzufügen
      </button>
    );
  }
  return (
    <TargetEditor
      discipline={discipline}
      trainingId={trainingId}
      initial={{
        id: 0,
        target_index: nextIndex,
        animal_or_face: null,
        distance_m: null,
        notes: null,
        shots: [],
        target_total: 0,
      }}
      onCancel={() => setOpen(false)}
      onSaved={async () => {
        setOpen(false);
        await onAdded();
      }}
    />
  );
}

// ─── Station-Editor mit Zonen-Buttons ─────────────────────────────────────────

function TargetEditor({
  discipline,
  trainingId,
  initial,
  onCancel,
  onSaved,
}: {
  discipline: Discipline;
  trainingId: number;
  initial: Target;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const slots = SLOTS_BY_DISCIPLINE[discipline];
  const zones = ZONES_BY_DISCIPLINE[discipline];

  const [animal, setAnimal] = useState(initial.animal_or_face ?? "");
  const [distance, setDistance] = useState(initial.distance_m?.toString() ?? "");
  const [zonesPicked, setZonesPicked] = useState<(string | null)[]>(() => {
    const arr: (string | null)[] = Array(slots).fill(null);
    for (const s of initial.shots) {
      if (s.arrow_seq >= 1 && s.arrow_seq <= slots) arr[s.arrow_seq - 1] = s.zone;
    }
    return arr;
  });
  const [busy, setBusy] = useState(false);

  function setZone(idx: number, code: string) {
    const next = [...zonesPicked];
    next[idx] = code;
    setZonesPicked(next);
  }

  async function save() {
    setBusy(true);
    try {
      const shots = zonesPicked
        .map((z, i) => ({ arrow_seq: i + 1, zone: z }))
        .filter((s) => s.zone !== null);
      await upsertTarget(trainingId, {
        target_index: initial.target_index,
        animal_or_face: animal || null,
        distance_m: distance ? Number(distance) : null,
        shots,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (initial.id === 0) {
      onCancel();
      return;
    }
    if (!confirm("Station wirklich löschen?")) return;
    setBusy(true);
    try {
      await deleteTarget(trainingId, initial.id);
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Station {initial.target_index}</h3>
        <div className="text-xl font-bold text-archer-700">
          {computePreviewTotal(discipline, zonesPicked, zones)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="text-xs text-archer-700">Tier / Auflage</span>
          <input
            className="input"
            placeholder="z. B. Reh, 80cm"
            value={animal}
            onChange={(e) => setAnimal(e.target.value)}
          />
        </label>
        <label>
          <span className="text-xs text-archer-700">Distanz (m)</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </label>
      </div>

      {Array.from({ length: slots }).map((_, i) => (
        <div key={i}>
          <div className="text-xs text-archer-700 mb-1">Pfeil {i + 1}</div>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
            {zones.map((z) => {
              const sel = zonesPicked[i] === z.code;
              return (
                <button
                  key={z.code}
                  type="button"
                  onClick={() => setZone(i, z.code)}
                  className={
                    "py-3 rounded-md font-bold transition " +
                    (sel
                      ? "bg-archer-700 text-white"
                      : "bg-archer-100 text-archer-900 hover:bg-archer-50")
                  }
                  title={z.hint}
                >
                  {z.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          Abbrechen
        </button>
        {initial.id > 0 && (
          <button
            type="button"
            className="btn-ghost text-red-600"
            onClick={remove}
            disabled={busy}
          >
            Löschen
          </button>
        )}
        <button className="btn flex-1" onClick={save} disabled={busy}>
          {busy ? "Speichere…" : "Station speichern"}
        </button>
      </div>
    </div>
  );
}

function computePreviewTotal(
  discipline: Discipline,
  zonesPicked: (string | null)[],
  zones: ZoneDef[]
): number {
  // Lokale Vorschau-Berechnung — der Server berechnet beim Speichern erneut autoritativ.
  // Für 3D-WA / Feld: jeder Pfeil unabhängig
  const codeMap = new Map(zones.map((z) => [z.code, z]));
  if (discipline === "3d_ifaa" || discipline === "3d_bowhunter") {
    // Nur erster Treffer zählt
    let firstHit = -1;
    for (let i = 0; i < zonesPicked.length; i++) {
      const z = zonesPicked[i];
      if (z && z !== "miss") {
        firstHit = i;
        break;
      }
    }
    if (firstHit < 0) return 0;
    const z = zonesPicked[firstHit];
    if (discipline === "3d_ifaa") {
      const vital = z === "vital";
      const seq = firstHit + 1;
      const tbl: Record<string, number> = {
        "true_1": 20, "true_2": 16, "true_3": 12,
        "false_1": 18, "false_2": 14, "false_3": 10,
      };
      return tbl[`${vital}_${seq}`] ?? 0;
    }
    return 0;
  }
  let sum = 0;
  for (const code of zonesPicked) {
    if (!code || code === "miss") continue;
    if (discipline === "field_wa") {
      if (code === "X") sum += 6;
      else sum += parseInt(code, 10) || 0;
    } else if (discipline === "3d_wa") {
      const m: Record<string, number> = { X: 11, inner: 10, outer: 8, body: 5 };
      sum += m[code] ?? 0;
    }
    void codeMap;
  }
  return sum;
}
