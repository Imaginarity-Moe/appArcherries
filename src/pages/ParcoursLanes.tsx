import { FormEvent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, X, Check, Camera, Loader2, ChevronDown, ChevronUp, CloudOff,
} from "lucide-react";
import { PageSpinner, Spinner } from "../components/Spinner";
import {
  getParcours,
  listParcoursLanes,
  upsertParcoursLane,
  updateParcoursLane,
  deleteParcoursLane,
  uploadParcoursLaneImage,
  deleteParcoursLaneImage,
  setLaneDistanceEstimate,
  type Parcours,
  type ParcoursLane,
} from "../api/parcours";
import { getHeatmap, type HeatmapResponse } from "../api/stats";
import { DISCIPLINE_LABELS, type Discipline } from "../api/trainings";
import { useConfirm } from "../components/ConfirmDialog";
import { usePageFooter } from "../components/FooterContext";
import { useAuth } from "../auth/AuthContext";

const Heatmap = lazy(() => import("../components/Heatmap"));

type EditState = {
  lane_number: string;
  animal_description: string;
  distance_blue: string;
  distance_red: string;
  distance_yellow: string;
  distance_white: string;
  notes: string;
};

function blankEdit(nextNumber: number): EditState {
  return {
    lane_number: String(nextNumber),
    animal_description: "",
    distance_blue: "",
    distance_red: "",
    distance_yellow: "",
    distance_white: "",
    notes: "",
  };
}

function laneToEdit(l: ParcoursLane): EditState {
  return {
    lane_number: String(l.lane_number),
    animal_description: l.animal_description ?? "",
    distance_blue:   l.distance_blue   != null ? String(l.distance_blue)   : "",
    distance_red:    l.distance_red    != null ? String(l.distance_red)    : "",
    distance_yellow: l.distance_yellow != null ? String(l.distance_yellow) : "",
    distance_white:  l.distance_white  != null ? String(l.distance_white)  : "",
    notes: l.notes ?? "",
  };
}

export default function ParcoursLanes() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const confirm = useConfirm();
  const { user } = useAuth();
  const parcoursId = Number(id);

  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [lanes, setLanes] = useState<ParcoursLane[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // editingId: null = nicht im Editor, "new" = neue Bahn, number = editieren
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [edit, setEdit] = useState<EditState>(blankEdit(1));
  const [busy, setBusy] = useState(false);
  // laneId → blob: URL für offline geladene Lane-Fotos, die noch in der Queue liegen
  const [pendingPhotos, setPendingPhotos] = useState<Record<number, string>>({});

  // Beim Unmount alle blob: URLs freigeben
  useEffect(() => {
    return () => {
      Object.values(pendingPhotos).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wenn der Server beim Refresh ein image_url für eine Bahn liefert, lokalen Pending freigeben
  useEffect(() => {
    setPendingPhotos((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const lane of lanes) {
        if (lane.image_url && next[lane.id]) {
          URL.revokeObjectURL(next[lane.id]);
          delete next[lane.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [lanes]);

  const isOwner = !!(parcours && user && parcours.user_id === user.id);

  useEffect(() => {
    if (!parcoursId) return;
    Promise.all([getParcours(parcoursId), listParcoursLanes(parcoursId)])
      .then(([p, l]) => {
        setParcours(p.parcours);
        setLanes(l.lanes);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Bahnen nicht laden"))
      .finally(() => setLoading(false));
  }, [parcoursId]);

  // Footer-Actions: Owner kriegt "Neue Bahn", andere nur "Zurück"
  const footerActions = useMemo(() => {
    if (!parcours) return null;
    const back = {
      kind: "button" as const,
      icon: <ArrowLeft size={20} strokeWidth={1.75} />,
      label: "Zurück",
      onClick: () => nav(`/parcours/${parcours.id}`),
    };
    if (!isOwner) return [back];
    return [
      back,
      {
        kind: "button" as const,
        icon: <Plus size={20} strokeWidth={2} />,
        label: "Neue Bahn",
        primary: true,
        disabled: editingId !== null,
        onClick: () => {
          const next = (lanes[lanes.length - 1]?.lane_number ?? 0) + 1;
          setEdit(blankEdit(next));
          setEditingId("new");
        },
      },
    ];
  }, [parcours, lanes, editingId, isOwner, nav]);
  usePageFooter(footerActions);

  async function saveEdit(e?: FormEvent) {
    e?.preventDefault();
    if (!parcours || editingId === null) return;
    const num = parseInt(edit.lane_number, 10);
    if (!num || num < 1) {
      setError("Bahn-Nummer muss mindestens 1 sein");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        lane_number: num,
        animal_description: edit.animal_description.trim() || null,
        distance_blue:   edit.distance_blue   === "" ? null : Number(edit.distance_blue),
        distance_red:    edit.distance_red    === "" ? null : Number(edit.distance_red),
        distance_yellow: edit.distance_yellow === "" ? null : Number(edit.distance_yellow),
        distance_white:  edit.distance_white  === "" ? null : Number(edit.distance_white),
        notes: edit.notes.trim() || null,
        sort_order: num,
      };
      let savedLaneId: number | null = null;
      if (editingId === "new") {
        const r = await upsertParcoursLane(parcours.id, body);
        savedLaneId = r.lane?.id ?? null;
      } else {
        await updateParcoursLane(parcours.id, editingId, body);
        savedLaneId = editingId;
      }
      const refreshed = await listParcoursLanes(parcours.id);
      setLanes(refreshed.lanes);
      // Nach Neuanlage im Editor BLEIBEN — der User kann jetzt noch ein Foto
      // hochladen (das setzt eine existierende lane.id voraus). Bei Edit-Save
      // dagegen schließt der Editor.
      if (editingId === "new" && savedLaneId) {
        setEditingId(savedLaneId);
        setEdit(laneToEdit(refreshed.lanes.find((l) => l.id === savedLaneId)!));
      } else {
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(lane: ParcoursLane) {
    const ok = await confirm({
      title: `Bahn ${lane.lane_number} löschen?`,
      message: `„${lane.animal_description ?? "ohne Tier"}" inkl. Foto wird entfernt.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok || !parcours) return;
    setBusy(true);
    try {
      await deleteParcoursLane(parcours.id, lane.id);
      const refreshed = await listParcoursLanes(parcours.id);
      setLanes(refreshed.lanes);
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(lane: ParcoursLane, direction: -1 | 1) {
    if (!parcours) return;
    const idx = lanes.findIndex((l) => l.id === lane.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= lanes.length) return;
    const other = lanes[swapIdx];
    // Tausche sort_order via individuelle PATCHes
    setBusy(true);
    try {
      await updateParcoursLane(parcours.id, lane.id,  { sort_order: other.sort_order });
      await updateParcoursLane(parcours.id, other.id, { sort_order: lane.sort_order });
      const refreshed = await listParcoursLanes(parcours.id);
      setLanes(refreshed.lanes);
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(lane: ParcoursLane, file: File) {
    if (!parcours) return;
    setBusy(true);
    try {
      const r = await uploadParcoursLaneImage(parcours.id, lane.id, file);
      if (r.pending) {
        setPendingPhotos((prev) => {
          if (prev[lane.id]) URL.revokeObjectURL(prev[lane.id]);
          return { ...prev, [lane.id]: r.pendingUrl };
        });
      } else {
        const refreshed = await listParcoursLanes(parcours.id);
        setLanes(refreshed.lanes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto-Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleEstimateSubmit(lane: ParcoursLane, distance: number | null) {
    if (!parcours) return;
    const r = await setLaneDistanceEstimate(parcours.id, lane.id, distance);
    // Punktuell ersetzen, statt komplettes Refresh
    setLanes((prev) => prev.map((l) => (l.id === lane.id ? r.lane : l)));
  }

  async function handleImageDelete(lane: ParcoursLane) {
    if (!parcours) return;
    const ok = await confirm({
      title: "Foto entfernen?",
      message: "Das Stations-Foto wird vom Server gelöscht.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteParcoursLaneImage(parcours.id, lane.id);
      const refreshed = await listParcoursLanes(parcours.id);
      setLanes(refreshed.lanes);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!parcours) return <p className="text-cherry-500 p-8">{error ?? "Parcours nicht gefunden"}</p>;

  const enabledPegs = {
    blue: parcours.peg_blue,
    red: parcours.peg_red,
    yellow: parcours.peg_yellow,
    white: parcours.peg_white,
  };
  const anyPegEnabled = enabledPegs.blue || enabledPegs.red || enabledPegs.yellow || enabledPegs.white;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav(`/parcours/${parcours.id}`)} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted uppercase tracking-wider">Bahnen verwalten</div>
          <h1 className="display text-h2 truncate">{parcours.name}</h1>
        </div>
      </div>

      {error && (
        <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>
      )}

      {!anyPegEnabled && (
        <div className="card-sunken text-xs text-secondary">
          Hinweis: Im Parcours sind aktuell keine Pflockfarben aktiviert. Distanzen pro Pflock können trotzdem gepflegt werden — sinnvoller ist es aber, die verfügbaren Pflöcke zuerst in den Parcours-Stammdaten zu setzen.
        </div>
      )}

      {/* Heatmaps der eigenen Trainings auf diesem Parcours */}
      <ParcoursHeatmaps parcoursId={parcoursId} />


      {/* Neue Bahn — Editor inline (nur Owner) */}
      {isOwner && editingId === "new" && (
        <LaneEditor
          edit={edit}
          setEdit={setEdit}
          onCancel={() => setEditingId(null)}
          onSave={saveEdit}
          enabledPegs={enabledPegs}
          busy={busy}
          title="Neue Bahn"
        />
      )}

      {/* Liste */}
      {lanes.length === 0 && editingId !== "new" && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-muted text-sm">
            {isOwner ? "Noch keine Bahnen erfasst" : "Für diesen Parcours wurden noch keine Bahnen erfasst"}
          </div>
          {isOwner && (
            <button
              onClick={() => {
                setEdit(blankEdit(1));
                setEditingId("new");
              }}
              className="btn-accent inline-flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={2} /> Erste Bahn anlegen
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {lanes.map((lane, idx) => (
          <div key={lane.id} className="card space-y-3">
            {isOwner && editingId === lane.id ? (
              <LaneEditor
                edit={edit}
                setEdit={setEdit}
                onCancel={() => setEditingId(null)}
                onSave={saveEdit}
                enabledPegs={enabledPegs}
                busy={busy}
                title={`Bahn ${lane.lane_number} bearbeiten`}
                existingLane={lane}
                pendingPhoto={pendingPhotos[lane.id] ?? null}
                onImageUpload={(f) => handleImageUpload(lane, f)}
                onImageDelete={() => handleImageDelete(lane)}
              />
            ) : (
              <LaneRow
                lane={lane}
                isFirst={idx === 0}
                isLast={idx === lanes.length - 1}
                readOnly={!isOwner}
                pendingPhoto={pendingPhotos[lane.id] ?? null}
                onEdit={() => {
                  setEdit(laneToEdit(lane));
                  setEditingId(lane.id);
                }}
                onDelete={() => handleDelete(lane)}
                onMoveUp={() => handleMove(lane, -1)}
                onMoveDown={() => handleMove(lane, +1)}
                onImageUpload={(f) => handleImageUpload(lane, f)}
                onImageDelete={() => handleImageDelete(lane)}
                onEstimateSubmit={(d) => handleEstimateSubmit(lane, d)}
                busy={busy}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────

function LaneEditor({
  edit,
  setEdit,
  onCancel,
  onSave,
  enabledPegs,
  busy,
  title,
  existingLane,
  pendingPhoto,
  onImageUpload,
  onImageDelete,
}: {
  edit: EditState;
  setEdit: (s: EditState) => void;
  onCancel: () => void;
  onSave: (e?: FormEvent) => void;
  enabledPegs: { blue: boolean; red: boolean; yellow: boolean; white: boolean };
  busy: boolean;
  title: string;
  /** Wenn gesetzt: existierende Bahn → Foto-Upload-Bereich wird gerendert */
  existingLane?: ParcoursLane;
  /** Blob-URL für ein offline-hochgeladenes Foto, das noch in der Sync-Queue wartet */
  pendingPhoto?: string | null;
  onImageUpload?: (f: File) => void;
  onImageDelete?: () => void;
}) {
  const editorFileRef = useRef<HTMLInputElement>(null);
  const displayImageUrl = pendingPhoto ?? existingLane?.image_url;
  const isPending = !!pendingPhoto;
  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="eyebrow">{title}</h3>
        <button type="button" onClick={onCancel} className="btn-icon" aria-label="Abbrechen">
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-2">
        <label className="block">
          <span className="text-xs text-muted">Bahn-Nr.</span>
          <input
            type="number"
            min={1}
            className="input mt-1"
            value={edit.lane_number}
            onChange={(e) => setEdit({ ...edit, lane_number: e.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Tier / Auflage</span>
          <input
            type="text"
            className="input mt-1"
            placeholder="z.B. Rehbock, Wildschwein, …"
            value={edit.animal_description}
            onChange={(e) => setEdit({ ...edit, animal_description: e.target.value })}
            maxLength={160}
          />
        </label>
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">Distanzen pro Pflockfarbe (m)</div>
        <div className="grid grid-cols-2 gap-2">
          <DistanceField
            color="bg-blue-500"
            label="Blau"
            value={edit.distance_blue}
            onChange={(v) => setEdit({ ...edit, distance_blue: v })}
            dimmed={!enabledPegs.blue}
          />
          <DistanceField
            color="bg-red-500"
            label="Rot"
            value={edit.distance_red}
            onChange={(v) => setEdit({ ...edit, distance_red: v })}
            dimmed={!enabledPegs.red}
          />
          <DistanceField
            color="bg-yellow-400"
            label="Gelb"
            value={edit.distance_yellow}
            onChange={(v) => setEdit({ ...edit, distance_yellow: v })}
            dimmed={!enabledPegs.yellow}
          />
          <DistanceField
            color="bg-white border border-warm-graphite/20"
            label="Weiß"
            value={edit.distance_white}
            onChange={(v) => setEdit({ ...edit, distance_white: v })}
            dimmed={!enabledPegs.white}
          />
        </div>
      </div>

      <label className="block">
        <span className="text-xs text-muted">Notizen</span>
        <textarea
          className="input mt-1"
          rows={2}
          placeholder="Hangschuss, Engstelle, …"
          value={edit.notes}
          onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
        />
      </label>

      {/* Foto: bei neuer Bahn (noch keine ID) erst nach erstem Speichern verfügbar */}
      {!existingLane && (
        <div className="text-xs text-muted italic">
          Foto-Upload erscheint nach dem ersten Speichern (eine Bahn-Nr braucht erst eine ID).
        </div>
      )}
      {existingLane && (
        <div>
          <div className="text-xs text-muted mb-1.5">Foto der Bahn</div>
          {displayImageUrl ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={displayImageUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
                {isPending && (
                  <span
                    className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-1.5 py-0.5 text-[10px] font-medium"
                    title="Foto wartet auf Sync"
                  >
                    <CloudOff size={10} strokeWidth={2} /> Sync
                  </span>
                )}
              </div>
              <input
                ref={editorFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && onImageUpload) onImageUpload(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => editorFileRef.current?.click()}
                  disabled={busy}
                  className="btn-secondary text-xs inline-flex items-center gap-1.5"
                >
                  <Camera size={14} strokeWidth={1.75} /> Foto ersetzen
                </button>
                {onImageDelete && !isPending && (
                  <button
                    type="button"
                    onClick={onImageDelete}
                    disabled={busy}
                    className="btn-ghost danger text-xs inline-flex items-center gap-1.5"
                  >
                    <Trash2 size={14} strokeWidth={1.75} /> Entfernen
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <input
                ref={editorFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && onImageUpload) onImageUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => editorFileRef.current?.click()}
                disabled={busy}
                className="card-sunken w-full inline-flex flex-col items-center gap-1 py-5 cursor-pointer hover:bg-surface transition"
              >
                <Camera size={20} strokeWidth={1.75} className="text-muted" />
                <span className="text-sm text-secondary">Foto aufnehmen oder hochladen</span>
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">
          Abbrechen
        </button>
        <button type="submit" className="btn-accent flex-1" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2} />}
          Speichern
        </button>
      </div>
    </form>
  );
}

function DistanceField({
  color,
  label,
  value,
  onChange,
  dimmed,
}: {
  color: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  dimmed?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 ${dimmed ? "opacity-50" : ""}`}>
      <span className={`w-3 h-3 rounded-full ${color} shrink-0`} aria-hidden />
      <span className="text-xs text-secondary w-10 shrink-0">{label}</span>
      <input
        type="number"
        min={0}
        step={0.5}
        className="input flex-1 min-w-0"
        placeholder="m"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// ─── Read-Only-Zeile ───────────────────────────────────────────────────────

function LaneRow({
  lane,
  isFirst,
  isLast,
  readOnly,
  pendingPhoto,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onImageUpload,
  onImageDelete,
  onEstimateSubmit,
  busy,
}: {
  lane: ParcoursLane;
  isFirst: boolean;
  isLast: boolean;
  readOnly: boolean;
  pendingPhoto?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onImageUpload: (f: File) => void;
  onImageDelete: () => void;
  onEstimateSubmit: (distance: number | null) => Promise<void>;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const displayImageUrl = pendingPhoto ?? lane.image_url;
  const isPending = !!pendingPhoto;

  // Read-Only: einfache Zeile ohne Aktionen
  if (readOnly) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-surface text-secondary flex items-center justify-center font-bold tabular-nums">
            {lane.lane_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{lane.animal_description ?? "—"}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lane.distance_blue   != null && <DistanceChip color="bg-blue-500"   value={lane.distance_blue} />}
              {lane.distance_red    != null && <DistanceChip color="bg-red-500"    value={lane.distance_red} />}
              {lane.distance_yellow != null && <DistanceChip color="bg-yellow-400" value={lane.distance_yellow} />}
              {lane.distance_white  != null && <DistanceChip color="bg-white border border-warm-graphite/20" value={lane.distance_white} />}
            </div>
            {lane.notes && <div className="text-xs text-muted mt-1 line-clamp-2">{lane.notes}</div>}
          </div>
          {displayImageUrl && (
            <button
              type="button"
              onClick={() => setZoomImage(displayImageUrl)}
              className="shrink-0"
              aria-label="Foto vergrößern"
            >
              <img src={displayImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
            </button>
          )}
        </div>
        <CrowdDistanceWidget lane={lane} onSubmit={onEstimateSubmit} busy={busy} />
        {zoomImage && (
          <div
            className="fixed inset-0 z-50 bg-warm-black/85 flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <img src={zoomImage} alt="" className="max-w-full max-h-full rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="w-10 h-10 shrink-0 rounded-xl bg-cherry-50 dark:bg-cherry-900/30 text-cherry-700 dark:text-cherry-300 flex items-center justify-center font-bold tabular-nums"
          aria-label="Bearbeiten"
        >
          {lane.lane_number}
        </button>

        <div className="flex-1 min-w-0">
          <button type="button" onClick={onEdit} className="block text-left w-full">
            <div className="font-semibold truncate">{lane.animal_description ?? "—"}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lane.distance_blue   != null && <DistanceChip color="bg-blue-500"   value={lane.distance_blue} />}
              {lane.distance_red    != null && <DistanceChip color="bg-red-500"    value={lane.distance_red} />}
              {lane.distance_yellow != null && <DistanceChip color="bg-yellow-400" value={lane.distance_yellow} />}
              {lane.distance_white  != null && <DistanceChip color="bg-white border border-warm-graphite/20" value={lane.distance_white} />}
            </div>
          </button>
          {lane.notes && <div className="text-xs text-muted mt-1 line-clamp-2">{lane.notes}</div>}
        </div>

        {/* Foto */}
        <div className="shrink-0">
          {displayImageUrl ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setZoomImage(displayImageUrl)}
                aria-label="Foto vergrößern"
              >
                <img src={displayImageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
              </button>
              {isPending ? (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center shadow-card"
                  title="Foto wartet auf Sync"
                >
                  <CloudOff size={11} strokeWidth={2} />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onImageDelete}
                  disabled={busy}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cherry-500 text-white flex items-center justify-center shadow-card disabled:opacity-50"
                  aria-label="Foto entfernen"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImageUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="btn-icon"
                aria-label="Foto hochladen"
                title="Foto hochladen"
              >
                <Camera size={18} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2">
        <CrowdDistanceWidget lane={lane} onSubmit={onEstimateSubmit} busy={busy} />
      </div>

      {/* Untere Aktionen */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-hairline">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || busy}
            className="btn-icon disabled:opacity-30"
            aria-label="Nach oben"
          >
            <ChevronUp size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || busy}
            className="btn-icon disabled:opacity-30"
            aria-label="Nach unten"
          >
            <ChevronDown size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDelete} disabled={busy} className="btn-ghost danger text-xs">
            <Trash2 size={14} strokeWidth={1.75} /> Löschen
          </button>
        </div>
      </div>

      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-warm-black/85 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

// ─── Crowdsourced-Distanz: Median + eigene Schätzung ──────────────────────

function CrowdDistanceWidget({
  lane,
  onSubmit,
  busy,
}: {
  lane: ParcoursLane;
  onSubmit: (distance: number | null) => Promise<void>;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState<string>(
    lane.my_distance_estimate != null ? String(lane.my_distance_estimate) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync input mit Lane-State, wenn Lane sich extern ändert
  useEffect(() => {
    setInput(lane.my_distance_estimate != null ? String(lane.my_distance_estimate) : "");
  }, [lane.my_distance_estimate]);

  const hasOfficial =
    lane.distance_blue != null ||
    lane.distance_red != null ||
    lane.distance_yellow != null ||
    lane.distance_white != null;

  const hasCrowd = lane.crowd_distance_count > 0;
  const hasMine = lane.my_distance_estimate != null;

  // Wenn weder Crowd noch eigene Schätzung existieren und der Owner schon
  // offizielle Distanzen gepflegt hat, dann verstecke das Widget komplett —
  // nicht jeder will hier Schätzungen abgeben. Es bleibt sichtbar, sobald
  // jemand schätzt, oder wenn keine offiziellen Distanzen existieren.
  if (!hasCrowd && !hasMine && hasOfficial) return null;

  async function save() {
    const v = parseFloat(input.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0 || v > 200) {
      setErr("Bitte zwischen 1 und 200 m eingeben");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await onSubmit(v);
      setExpanded(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setErr(null);
    setSaving(true);
    try {
      await onSubmit(null);
      setInput("");
      setExpanded(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="text-xs">
      {/* Toggle-Zeile: bei wenig Platz (Mobile) wrappen die Teile, statt zu überlaufen. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-secondary hover:text-primary transition text-left max-w-full"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted">Crowdsourced</span>
          {hasCrowd ? (
            <span className="tabular-nums">
              <b className="text-primary">~{lane.crowd_distance_median}</b> m
              <span className="text-muted ml-1">(n={lane.crowd_distance_count})</span>
            </span>
          ) : (
            <span className="text-muted italic">noch keine Schätzungen</span>
          )}
          <ChevronDown
            size={12}
            strokeWidth={1.75}
            className={`transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
        {hasMine && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cherry-50 dark:bg-cherry-900/30 text-cherry-700 dark:text-cherry-200 px-1.5 py-0.5 tabular-nums">
            Du: {lane.my_distance_estimate} m
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 card-sunken space-y-2">
          <div className="text-[11px] text-muted">
            {hasOfficial
              ? "Deine Schätzung hilft anderen, die unmarkierte Distanz besser einzuordnen."
              : "Diese Bahn hat keine offiziellen Distanzen. Deine Schätzung wird anonym aggregiert."}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 min-w-0">
              <input
                type="number"
                min={1}
                max={200}
                step={0.5}
                inputMode="decimal"
                className="input text-sm"
                placeholder="z.B. 22"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            <span className="text-xs text-muted">m</span>
            <button
              type="button"
              onClick={save}
              disabled={busy || saving || input === ""}
              className="btn-accent text-xs px-3 py-1.5"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2} />}
              {hasMine ? "Aktualisieren" : "Schätzen"}
            </button>
            {hasMine && (
              <button
                type="button"
                onClick={clear}
                disabled={busy || saving}
                className="btn-ghost danger text-xs px-2 py-1.5"
                aria-label="Schätzung zurückziehen"
              >
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
          {hasCrowd && lane.crowd_distance_min !== lane.crowd_distance_max && (
            <div className="text-[11px] text-muted">
              Spannweite: {lane.crowd_distance_min} – {lane.crowd_distance_max} m
            </div>
          )}
          {err && <div className="text-[11px] text-cherry-500">{err}</div>}
        </div>
      )}
    </div>
  );
}

function DistanceChip({ color, value }: { color: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} aria-hidden />
      <span className="font-mono tabular-nums text-secondary">{value} m</span>
    </span>
  );
}

/**
 * Aggregierte Pad-Heatmaps der eigenen Trainings auf diesem Parcours.
 * Gruppiert nach (Tier + Distanz). Versteckt sich, wenn keine Daten existieren.
 */
function ParcoursHeatmaps({ parcoursId }: { parcoursId: number }) {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parcoursId) return;
    setLoading(true);
    getHeatmap("tier", { parcours_id: parcoursId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [parcoursId]);

  if (loading) return null; // Stille beim Laden, keine Spinner-Flicker
  if (!data || data.groups.length === 0) return null;

  return (
    <details className="card group" open>
      <summary className="cursor-pointer list-none flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Deine Trefferbilder</h2>
        <ChevronDown size={18} className="transition group-open:rotate-180 text-secondary" />
      </summary>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
        {data.groups.map((g) => (
          <div key={g.key} className="card-sunken">
            <div className="text-[11px] text-secondary truncate" title={DISCIPLINE_LABELS[g.discipline as Discipline] ?? g.discipline}>
              {DISCIPLINE_LABELS[g.discipline as Discipline] ?? g.discipline}
            </div>
            <div className="text-xs font-semibold mb-1.5 truncate" title={g.label}>{g.label}</div>
            <Suspense fallback={<Spinner className="py-1" />}>
              <Heatmap discipline={g.discipline as Discipline} points={g.points} size={180} />
            </Suspense>
            <div className="text-[11px] text-muted text-center mt-1">{g.shot_count} Pfeile</div>
          </div>
        ))}
      </div>
    </details>
  );
}
