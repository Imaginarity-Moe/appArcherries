import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Trash2, Edit2, Check, X } from "lucide-react";
import {
  listBows,
  createBow,
  updateBow,
  deleteBow,
  type Bow,
} from "../api/bows";
import { BOW_LABELS, type BowType } from "../api/trainings";

const BOW_TYPES: BowType[] = ["recurve", "compound", "barebow", "traditional"];

export default function Bows() {
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Bow | "new" | null>(null);

  const refresh = async () => {
    try {
      const r = await listBows();
      setBows(r.bows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Diesen Bogen wirklich löschen?")) return;
    await deleteBow(id);
    refresh();
  };

  const handleSetDefault = async (b: Bow) => {
    await updateBow(b.id, { is_default: true });
    refresh();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-copper-500">
        <ArrowLeft size={16} /> Zurück
      </Link>

      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Meine Bögen</h1>
        <button onClick={() => setEditing("new")} className="btn">
          <Plus size={18} /> Neu
        </button>
      </header>

      {loading && <p className="text-forest-700">Lade…</p>}

      {!loading && bows.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-forest-700 dark:text-forest-300 mb-1">Noch keine Bögen angelegt.</p>
          <p className="text-forest-700 dark:text-forest-300 text-sm mb-5">
            Speichere deine Bögen mit Setup-Daten — wähle sie beim Anlegen eines Trainings einfach aus.
          </p>
          <button onClick={() => setEditing("new")} className="btn">
            <Plus size={18} /> Ersten Bogen anlegen
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {bows.map((b) => (
          <li key={b.id} className="card flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{b.name}</span>
                {b.is_default && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-copper-600 bg-copper-50 dark:bg-copper-700/20 rounded-full px-1.5 py-0.5">
                    <Star size={10} /> Standard
                  </span>
                )}
              </div>
              <div className="text-sm text-forest-700 dark:text-forest-300 mt-0.5">
                {BOW_LABELS[b.bow_type]}
                {b.draw_weight_lbs !== null && ` · ${b.draw_weight_lbs} lbs`}
                {b.arrow_spine && ` · Pfeil ${b.arrow_spine}`}
              </div>
              {b.notes && (
                <div className="text-xs text-forest-600 dark:text-forest-400 mt-1">{b.notes}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!b.is_default && (
                <button onClick={() => handleSetDefault(b)} className="btn-icon" aria-label="Als Standard">
                  <Star size={16} />
                </button>
              )}
              <button onClick={() => setEditing(b)} className="btn-icon" aria-label="Bearbeiten">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDelete(b.id)} className="btn-icon danger" aria-label="Löschen">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <BowFormModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function BowFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Bow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bowType, setBowType] = useState<BowType>(initial?.bow_type ?? "recurve");
  const [drawWeight, setDrawWeight] = useState(initial?.draw_weight_lbs?.toString() ?? "");
  const [arrowSpine, setArrowSpine] = useState(initial?.arrow_spine ?? "");
  const [sightMarks, setSightMarks] = useState(initial?.sight_marks ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError("Name erforderlich");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        bow_type: bowType,
        draw_weight_lbs: drawWeight ? Number(drawWeight) : null,
        arrow_spine: arrowSpine || null,
        sight_marks: sightMarks || null,
        notes: notes || null,
        is_default: isDefault,
      };
      if (initial) await updateBow(initial.id, body);
      else await createBow(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
      <div className="w-full sm:max-w-md bg-elevated dark:bg-elevated-dark rounded-t-3xl sm:rounded-3xl p-6 shadow-lift animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">
            {initial ? "Bogen bearbeiten" : "Neuer Bogen"}
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              Name *
            </label>
            <input
              className="input w-full"
              placeholder="z.B. Mein Recurve"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              Bogenklasse *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BOW_TYPES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBowType(b)}
                  className={`tap-target rounded-xl px-3 py-2 font-medium transition ${
                    b === bowType
                      ? "bg-copper-500 text-white shadow-copper"
                      : "bg-sunken dark:bg-sunken-dark text-forest-700"
                  }`}
                >
                  {BOW_LABELS[b]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
                Zuggewicht (lbs)
              </label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                className="input w-full"
                placeholder="z.B. 38"
                value={drawWeight}
                onChange={(e) => setDrawWeight(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
                Pfeil-Spine
              </label>
              <input
                className="input w-full"
                placeholder="z.B. 700"
                value={arrowSpine}
                onChange={(e) => setArrowSpine(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              Visiermarken
            </label>
            <textarea
              className="input w-full"
              rows={2}
              placeholder="z.B. 18m: 4.2 · 30m: 5.1 · 50m: 6.8"
              value={sightMarks}
              onChange={(e) => setSightMarks(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-1 block">
              Notizen
            </label>
            <textarea
              className="input w-full"
              rows={2}
              placeholder="z.B. Sehne 2025 gewechselt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-forest-700 dark:text-forest-300">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4"
            />
            Als Standard markieren (wird beim neuen Training vorausgewählt)
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <button onClick={save} className="btn w-full" disabled={busy}>
            <Check size={16} /> {busy ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
