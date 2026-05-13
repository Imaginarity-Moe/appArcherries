import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Grid3x3, MoreHorizontal, Trash2, X } from "lucide-react";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  PEG_LABELS,
  deleteTarget,
  deleteTraining,
  getTraining,
  updateTraining,
  upsertTarget,
  type Discipline,
  type Target,
  type Training,
} from "../api/trainings";
import BullseyePad from "../components/BullseyePad";
import ParticipantsBar from "../components/ParticipantsBar";
import StationPhoto from "../components/StationPhoto";
import PhotoMarkers from "../components/PhotoMarkers";
import { fmtDateTime } from "../lib/format";
import { useLivePolling } from "../lib/useLivePolling";

// Lazy: qrcode.react wird nur beim Öffnen des Einladen-Modals geladen
const InviteModal = lazy(() => import("../components/InviteModal"));

// Anzahl Pfeil-Slots je Disziplin
const SLOTS_BY_DISCIPLINE: Record<Discipline, number> = {
  "3d_wa": 2,
  "3d_ifaa": 3,
  "3d_bowhunter": 3, // IFAA-Standard: 3 Pfeile, nur erster treffender zählt
  "field_wa": 3,
  simple: 0,
};

/** Lokale Wertungs-Vorschau (Server berechnet beim Speichern autoritativ neu) */
function previewArrowPoints(discipline: Discipline, zone: string | null, slot: number, allZones: (string | null)[]): number {
  if (!zone || zone === "miss") return 0;

  if (discipline === "3d_ifaa") {
    const firstHit = allZones.findIndex((z) => z && z !== "miss");
    if (firstHit !== slot) return 0;
    const isVital = ["X", "kill", "inner", "vital"].includes(zone);
    if (slot === 0) return isVital ? 20 : 18;
    if (slot === 1) return isVital ? 16 : 14;
    if (slot === 2) return isVital ? 12 : 10;
    return 0;
  }
  if (discipline === "3d_bowhunter") {
    // IFAA Bowhunter Round: 3 Pfeile, nur erster treffender zählt. Vital 5/4/3, Wound 3/2/1.
    const firstHit = allZones.findIndex((z) => z && z !== "miss");
    if (firstHit !== slot) return 0;
    const isVital = ["X", "kill", "inner", "vital"].includes(zone);
    if (slot === 0) return isVital ? 5 : 3;
    if (slot === 1) return isVital ? 4 : 2;
    if (slot === 2) return isVital ? 3 : 1;
    return 0;
  }

  if (discipline === "3d_wa") {
    const m: Record<string, number> = { X: 11, kill: 11, inner: 10, outer: 8, body: 5 };
    return m[zone] ?? 0;
  }
  if (discipline === "field_wa") {
    if (zone === "X") return 6;
    const n = parseInt(zone, 10);
    return n >= 1 && n <= 6 ? n : 0;
  }
  return 0;
}

export default function TrainingDetail() {
  const { id } = useParams();
  const { t } = useTranslation(["training", "common"]);
  const nav = useNavigate();
  // ID kann eine temp-ID sein (offline angelegtes Training, "tmp_…")
  const trainingId: number | string = id?.startsWith("tmp_") ? id : Number(id);
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const stationParam = searchParams.get("station");
  const focusedStation = stationParam ? parseInt(stationParam, 10) : null;

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

  // Live-Sync für geteilte Runden: pollt alle 5s wenn Training offen und shared
  const isShared = (training?.participants?.length ?? 0) > 1;
  const isOpenPoll = training !== null && !training.ended_at;
  const { isPolling } = useLivePolling(refresh, isOpenPoll && isShared, 5000);

  if (loading) return <p className="text-forest-700">{t("common:actions.loading")}</p>;
  if (error || !training) return <p className="text-red-700">{error ?? "Not found"}</p>;

  // Live-Eingabe-Modus: ?station=N → Fokus auf eine Station
  if (focusedStation !== null && training.discipline !== "simple") {
    return (
      <StationLiveEntry
        training={training}
        stationIndex={focusedStation}
        onChange={refresh}
        onClose={() => setSearchParams({})}
        onNavigate={(n) => setSearchParams({ station: String(n) })}
      />
    );
  }

  return <TrainingOverview training={training} onChange={refresh} nav={nav} isPolling={isPolling} isShared={isShared} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Übersicht (Stations-Liste + Header)

function TrainingOverview({
  training,
  onChange,
  nav,
  isPolling = false,
  isShared = false,
}: {
  training: Training;
  onChange: () => Promise<void>;
  nav: (path: string) => void;
  isPolling?: boolean;
  isShared?: boolean;
}) {
  const { t } = useTranslation(["training", "common"]);
  const [, setSearchParams] = useSearchParams();
  const [showInvite, setShowInvite] = useState(false);
  const isSimple = training.discipline === "simple";
  // Nur eigene Targets anzeigen — andere Participants haben ihre eigenen
  const myTargets = (training.targets ?? []).filter(
    (t) => !t.participant_id || t.participant_id === training.my_participant_id
  );
  const isOpen = !training.ended_at;
  const nextIndex = (myTargets[myTargets.length - 1]?.target_index ?? 0) + 1;

  async function handleDelete() {
    if (!confirm(t("training:detail.delete_confirm"))) return;
    await deleteTraining(training.id);
    nav("/");
  }

  async function handleEnd() {
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await updateTraining(training.id, { ended_at: now });
    await onChange();
    nav(`/trainings/${training.id}/summary`);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-copper-500">
        <ArrowLeft size={16} /> {t("common:actions.back")}
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold">
              {DISCIPLINE_LABELS[training.discipline]}
            </h1>
            <div className="text-sm text-forest-700 dark:text-forest-300 mt-1">
              {BOW_LABELS[training.bow_type]}
              {training.peg_color && ` · ${PEG_LABELS[training.peg_color]}`}
              {training.distance_marked !== null &&
                ` · ${training.distance_marked ? t("training:wizard.distance_marked") : t("training:wizard.distance_unmarked")}`}
            </div>
            <div className="text-xs text-forest-300 mt-1">{fmtDateTime(training.started_at)}</div>
            {training.location && (
              <div className="text-sm text-forest-700 dark:text-forest-300 mt-1">📍 {training.location}</div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="score text-score-xl leading-none animate-count-up">{training.total_score}</div>
            <div className="text-[10px] uppercase tracking-wider text-forest-300 mt-1">
              {myTargets.length > 0 ? t("training:detail.n_stations", { count: myTargets.length }) : "Pkt"}
            </div>
          </div>
        </div>

        {training.participants && training.participants.length > 0 && (
          <ParticipantsBar
            participants={training.participants}
            isOwner={!!training.is_owner}
            onInvite={() => setShowInvite(true)}
            isLive={isShared}
            isPolling={isPolling}
          />
        )}

        {!isSimple && myTargets.length > 0 && (
          <div className="mt-4">
            <StationStatusGrid
              targets={myTargets}
              onPick={(idx) => setSearchParams({ station: String(idx) })}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {isOpen && (
            <button onClick={handleEnd} className="btn-secondary">
              <Check size={16} /> {t("training:detail.end_training")}
            </button>
          )}
          <button onClick={handleDelete} className="btn-ghost danger">
            <Trash2 size={16} /> {t("training:detail.delete_training")}
          </button>
        </div>
      </div>

      {/* Simple-Modus */}
      {isSimple ? (
        <SimpleScoreCard training={training} onChange={onChange} />
      ) : (
        <>
          {isOpen && (
            <button
              onClick={() => setSearchParams({ station: String(nextIndex) })}
              className="btn w-full tap-large"
            >
              {t("training:detail.add_station", { n: nextIndex })}
            </button>
          )}

          {/* Stations-Karten */}
          <div className="space-y-2">
            {myTargets.map((tgt) => (
              <StationRow
                key={tgt.id}
                target={tgt}
                onClick={() => setSearchParams({ station: String(tgt.target_index) })}
              />
            ))}
          </div>
        </>
      )}

      {showInvite && typeof training.id === "number" && (
        <Suspense fallback={null}>
          <InviteModal trainingId={training.id} onClose={() => setShowInvite(false)} />
        </Suspense>
      )}
    </div>
  );
}

function StationStatusGrid({
  targets,
  onPick,
}: {
  targets: Target[];
  onPick: (idx: number) => void;
}) {
  const byIdx = new Map(targets.map((t) => [t.target_index, t]));
  const max = Math.max(28, ...Array.from(byIdx.keys()));
  const cells = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
      {cells.map((idx) => {
        const tgt = byIdx.get(idx);
        const filled = tgt && tgt.shots.length > 0;
        return (
          <button
            key={idx}
            onClick={() => onPick(idx)}
            className={`aspect-square rounded-md text-[10px] font-mono tabular-nums font-bold transition hover:scale-110 ${
              filled
                ? "bg-copper-500 text-white"
                : tgt
                ? "bg-copper-100 text-copper-700"
                : "bg-forest-100 dark:bg-forest-800 text-forest-700 dark:text-forest-300"
            }`}
          >
            {idx}
          </button>
        );
      })}
    </div>
  );
}

function StationRow({
  target,
  onClick,
}: {
  target: Target;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-interactive w-full text-left flex items-center justify-between gap-3"
    >
      {target.image_path && (
        <img
          src={target.image_path}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-forest-300">#{target.target_index}</span>
          <span className="font-semibold truncate">{target.animal_or_face || "—"}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {target.shots.map((s) => (
            <span key={s.arrow_seq} className="chip text-[10px] py-0.5">
              {s.zone ?? "—"}
              <span className="text-forest-300">·{s.points}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="score text-score-md">{target.target_total}</div>
    </button>
  );
}

function SimpleScoreCard({
  training,
  onChange,
}: {
  training: Training;
  onChange: () => Promise<void>;
}) {
  const { t } = useTranslation("training");
  const [value, setValue] = useState(training.summary_score?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateTraining(training.id, { summary_score: value === "" ? null : Number(value) });
      await onChange();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card">
      <label className="text-sm font-medium text-forest-700 dark:text-forest-300 mb-2 block">
        {t("detail.summary_score")}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z.B. 287"
        />
        <button onClick={save} className="btn" disabled={busy}>
          {t("detail.save")}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE-Eingabe für eine Station

function StationLiveEntry({
  training,
  stationIndex,
  onChange,
  onClose,
  onNavigate,
}: {
  training: Training;
  stationIndex: number;
  onChange: () => Promise<void>;
  onClose: () => void;
  onNavigate: (n: number) => void;
}) {
  const { t } = useTranslation(["training", "common"]);
  const slots = SLOTS_BY_DISCIPLINE[training.discipline];

  const myTargets = (training.targets ?? []).filter(
    (t) => !t.participant_id || t.participant_id === training.my_participant_id
  );
  const existing = myTargets.find((t) => t.target_index === stationIndex);
  const totalStations = Math.max(28, ...myTargets.map((t) => t.target_index));

  const [animal, setAnimal] = useState(existing?.animal_or_face ?? "");
  const [distance, setDistance] = useState(existing?.distance_m?.toString() ?? "");
  const [activeSlot, setActiveSlot] = useState(0);
  const [zonesPicked, setZonesPicked] = useState<(string | null)[]>(() => {
    const arr: (string | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots) arr[s.arrow_seq - 1] = s.zone;
      }
    }
    return arr;
  });
  const [markers, setMarkers] = useState<({ x: number; y: number } | null)[]>(() => {
    const arr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots && s.x_norm != null && s.y_norm != null) {
          arr[s.arrow_seq - 1] = { x: s.x_norm, y: s.y_norm };
        }
      }
    }
    return arr;
  });
  const [busy, setBusy] = useState(false);
  const [showStationGrid, setShowStationGrid] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Beim Pfeil-Tap: nächsten leeren Slot aktivieren
  function handleZoneSelect(code: string) {
    const next = [...zonesPicked];
    next[activeSlot] = code;
    setZonesPicked(next);
    // Nächsten leeren Slot suchen
    const nextEmpty = next.findIndex((z, i) => i > activeSlot && z === null);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
    else if (activeSlot < slots - 1) setActiveSlot(activeSlot + 1);
  }

  // Lokale Vorschau-Summe
  const previewTotal = useMemo(() => {
    return zonesPicked.reduce((sum, z, i) => sum + previewArrowPoints(training.discipline, z, i, zonesPicked), 0);
  }, [zonesPicked, training.discipline]);

  async function save() {
    setBusy(true);
    try {
      const shots = zonesPicked
        .map((z, i) => ({
          arrow_seq: i + 1,
          zone: z,
          x_norm: markers[i]?.x ?? null,
          y_norm: markers[i]?.y ?? null,
        }))
        .filter((s) => s.zone !== null);
      await upsertTarget(training.id, {
        target_index: stationIndex,
        animal_or_face: animal || null,
        distance_m: distance ? Number(distance) : null,
        shots,
      });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    await save();
    if (stationIndex < 99) onNavigate(stationIndex + 1);
  }

  async function deleteStation() {
    if (!existing || !confirm(t("training:live.delete_station_confirm"))) return;
    setBusy(true);
    try {
      await deleteTarget(training.id, existing.id);
      await onChange();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  // Falls IFAA und schon Treffer dokumentiert: weitere Slots ausgrauen
  const ifaaFirstHit = training.discipline === "3d_ifaa"
    ? zonesPicked.findIndex((z) => z && z !== "miss")
    : -1;

  return (
    <div className="fixed inset-0 z-30 bg-canvas dark:bg-canvas-dark overflow-y-auto animate-fade-in">
      {/* Top-Bar */}
      <header className="sticky top-0 z-10 bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur border-b border-forest-100 dark:border-forest-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <X size={22} />
          </button>
          <button
            onClick={() => setShowStationGrid(true)}
            className="flex items-center gap-2 font-display text-base font-semibold"
          >
            <Grid3x3 size={18} />
            {t("training:live.station_of_total", { current: stationIndex, total: totalStations })}
          </button>
          <button onClick={() => setShowMenu(true)} className="btn-icon" aria-label="Menu">
            <MoreHorizontal size={22} />
          </button>
        </div>
      </header>

      <div className="container-app py-4 space-y-4">
        {/* Inline-Edit für Tier/Distanz */}
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input"
            placeholder={t("training:live.animal_or_face")}
            value={animal}
            onChange={(e) => setAnimal(e.target.value)}
          />
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder={t("training:live.distance_m")}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>

        {/* Foto */}
        {existing && (
          <StationPhoto
            trainingId={training.id}
            targetId={existing.id}
            imagePath={existing.image_path}
            onChange={() => onChange()}
          />
        )}

        {/* Interaktive Marker auf dem Foto */}
        {existing?.image_path && (
          <PhotoMarkers
            imagePath={existing.image_path}
            markers={markers}
            activeSlot={activeSlot}
            onMarkerSet={(slot, x, y) => {
              const next = [...markers];
              next[slot] = { x, y };
              setMarkers(next);
            }}
            onMarkerClear={(slot) => {
              const next = [...markers];
              next[slot] = null;
              setMarkers(next);
            }}
          />
        )}

        {/* Stations-Total */}
        <div className="text-center py-3">
          <div className="score text-display leading-none animate-count-up" key={previewTotal}>
            {previewTotal}
          </div>
          <div className="text-xs uppercase tracking-wider text-forest-300 mt-1">Punkte</div>
        </div>

        {/* Pfeil-Slots */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
          {Array.from({ length: slots }).map((_, i) => {
            const z = zonesPicked[i];
            const isActive = activeSlot === i;
            const points = previewArrowPoints(training.discipline, z, i, zonesPicked);
            const isIfaaDisabled = ifaaFirstHit !== -1 && i > ifaaFirstHit;
            return (
              <button
                key={i}
                onClick={() => setActiveSlot(i)}
                className={`tap-large rounded-2xl flex flex-col items-center justify-center transition active:scale-[0.98] ${
                  isActive
                    ? "bg-copper-50 border-2 border-copper-500"
                    : z
                    ? "bg-sunken dark:bg-sunken-dark border-2 border-transparent"
                    : "bg-canvas dark:bg-canvas-dark border-2 border-dashed border-forest-200 dark:border-forest-700"
                } ${isIfaaDisabled ? "opacity-50" : ""}`}
              >
                <div className="text-[10px] uppercase tracking-wider text-forest-300">
                  {t("training:live.shot_n", { n: i + 1 })}
                </div>
                <div className={z ? "score text-2xl" : "text-2xl text-forest-300 font-bold"}>
                  {z ?? "·"}
                </div>
                {z && points > 0 && (
                  <div className="text-[10px] text-copper-700 font-mono tabular-nums">+{points}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* IFAA-Hinweis */}
        {training.discipline === "3d_ifaa" && (
          <div className="text-xs text-forest-700 dark:text-forest-300 italic px-1 text-center">
            {t("training:live.ifaa_hint")}
          </div>
        )}

        {/* Bullseye-Pad */}
        <BullseyePad
          discipline={training.discipline}
          selectedZone={zonesPicked[activeSlot] ?? null}
          onZoneSelect={(code) => handleZoneSelect(code)}
          disabled={ifaaFirstHit !== -1 && activeSlot > ifaaFirstHit}
        />

        {/* Speichern */}
        <div className="space-y-2 pt-4">
          <button onClick={saveAndNext} className="btn w-full tap-large" disabled={busy}>
            {busy ? t("training:live.saving") : t("training:live.save_station")} <ArrowRight size={18} />
          </button>
          <button onClick={save} className="btn-secondary w-full" disabled={busy}>
            {t("training:live.save_station")}
          </button>
        </div>

        {/* Bottom-Nav: prev/next */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => onNavigate(Math.max(1, stationIndex - 1))}
            disabled={stationIndex <= 1}
            className="btn-ghost"
          >
            <ArrowLeft size={18} /> {t("common:actions.previous")} {stationIndex - 1}
          </button>
          <button onClick={() => onNavigate(stationIndex + 1)} className="btn-ghost">
            {t("common:actions.next")} {stationIndex + 1} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Stations-Grid (Bottom-Sheet-Style) */}
      {showStationGrid && (
        <BottomSheet onClose={() => setShowStationGrid(false)}>
          <h3 className="font-display text-lg font-semibold mb-3">{t("training:detail.stations_title")}</h3>
          <StationStatusGrid
            targets={myTargets}
            onPick={(idx) => {
              setShowStationGrid(false);
              onNavigate(idx);
            }}
          />
        </BottomSheet>
      )}

      {/* Menu (Delete) */}
      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)}>
          {existing && (
            <button onClick={deleteStation} className="btn-ghost danger w-full justify-start" disabled={busy}>
              <Trash2 size={18} /> {t("training:live.delete_station")}
            </button>
          )}
          <button onClick={() => setShowMenu(false)} className="btn-ghost w-full justify-start">
            <X size={18} /> {t("common:actions.close")}
          </button>
        </BottomSheet>
      )}
    </div>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-forest-900/50 animate-fade-in" />
      <div
        className="relative w-full max-w-2xl mx-auto bg-elevated dark:bg-elevated-dark rounded-t-3xl p-5 shadow-lift animate-slide-up pb-[max(env(safe-area-inset-bottom),1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-12 rounded-full bg-forest-200 mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}
