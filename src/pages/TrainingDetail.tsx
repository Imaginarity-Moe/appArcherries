import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3, Check, Grid3x3, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
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
import TargetPad from "../components/TargetPad";
import ParticipantsBar from "../components/ParticipantsBar";
import StationPhoto from "../components/StationPhoto";
import PhotoMarkers from "../components/PhotoMarkers";
import { fmtDateTime } from "../lib/format";
import { useLivePolling } from "../lib/useLivePolling";
import { useSyncListener } from "../lib/useSyncListener";
import { useConfirm } from "../components/ConfirmDialog";
import { usePageFooter } from "../components/FooterContext";

// Lazy: qrcode.react wird nur beim Öffnen des Einladen-Modals geladen
const InviteModal = lazy(() => import("../components/InviteModal"));
const AddFriendModal = lazy(() => import("../components/AddFriendModal"));

// Anzahl Pfeil-Slots je Disziplin
const SLOTS_BY_DISCIPLINE: Record<Discipline, number> = {
  "3d_wa":          2,
  "3d_ifaa":        3,
  "3d_ifaa_hunter": 1,
  "3d_ifaa_animal": 3,
  "3d_bowhunter":   3,
  "field_wa":       4, // WA-Standard: 4 Pfeile pro Auflage
  "field_ifaa":     4,
  simple:           0,
  target_practice:  3, // Default — Training überschreibt via arrows_per_end
};

/** Disziplinen mit „nur erster treffender Pfeil zählt"-Logik */
const FIRST_HIT_DISCIPLINES: Discipline[] = ["3d_ifaa", "3d_ifaa_animal", "3d_bowhunter"];

/**
 * Lokale Wertungs-Vorschau. Muss synchron bleiben mit `api/lib/Scoring.php` und
 * `src/lib/scoringPreview.ts`. Slot ist 0-indexed, arrow_seq ist (slot + 1).
 */
function previewArrowPoints(
  discipline: Discipline,
  zone: string | null,
  slot: number,
  allZones: (string | null)[],
  nfaa: boolean = false
): number {
  if (!zone || zone === "miss") return 0;

  const isInnerKill = ["inner_kill", "kill_inner", "X", "inner"].includes(zone);
  const isOuterKill = ["outer_kill", "kill_outer", "outer"].includes(zone);
  const isKillAny   = isInnerKill || isOuterKill || ["vital", "kill"].includes(zone);
  const isWound     = ["wound", "body"].includes(zone);

  // Disziplinen mit "nur erster treffender Pfeil zählt"-Logik
  if (FIRST_HIT_DISCIPLINES.includes(discipline)) {
    const firstHit = allZones.findIndex((z) => z && z !== "miss");
    if (firstHit !== slot) return 0;
  }

  if (discipline === "3d_ifaa") {
    // 1: 20/18/16  2: 14/12/10  3: 8/6/4
    const t = [
      { inner: 20, outer: 18, wound: 16 },
      { inner: 14, outer: 12, wound: 10 },
      { inner: 8,  outer: 6,  wound: 4 },
    ];
    if (slot < 0 || slot > 2) return 0;
    if (isInnerKill) return t[slot].inner;
    if (isOuterKill) return t[slot].outer;
    if (isWound)     return t[slot].wound;
    return 0;
  }

  if (discipline === "3d_ifaa_hunter") {
    if (slot !== 0) return 0;
    if (isInnerKill) return 20;
    if (isOuterKill) return 17;
    if (isWound)     return 10;
    return 0;
  }

  if (discipline === "3d_ifaa_animal") {
    // 1: 20/18  2: 16/14  3: 12/10  | NFAA: +1
    const t = [
      { kill: 20, wound: 18 },
      { kill: 16, wound: 14 },
      { kill: 12, wound: 10 },
    ];
    if (slot < 0 || slot > 2) return 0;
    let base = 0;
    if (isKillAny)     base = t[slot].kill;
    else if (isWound)  base = t[slot].wound;
    return base > 0 && nfaa ? base + 1 : base;
  }

  if (discipline === "3d_bowhunter") {
    const t = [
      { kill: 5, wound: 3 },
      { kill: 4, wound: 2 },
      { kill: 3, wound: 1 },
    ];
    if (slot < 0 || slot > 2) return 0;
    if (isKillAny) return t[slot].kill;
    if (isWound)   return t[slot].wound;
    return 0;
  }

  if (discipline === "3d_wa") {
    if (zone === "X") return 11;
    const m: Record<string, number> = { kill_inner: 11, inner_kill: 11, inner: 10, kill_outer: 10, outer_kill: 10, outer: 8, body: 5, wound: 5 };
    return m[zone] ?? 0;
  }

  if (discipline === "field_wa") {
    if (zone === "X") return 6;
    const n = parseInt(zone, 10);
    return n >= 1 && n <= 6 ? n : 0;
  }

  if (discipline === "field_ifaa") {
    const n = parseInt(zone, 10);
    if (n === 5 || n === 4 || n === 3) return n;
    return 0;
  }

  if (discipline === "target_practice") {
    if (zone === "X") return 10;
    const n = parseInt(zone, 10);
    return n >= 1 && n <= 12 ? n : 0;
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

  // Nach erfolgreichem Outbox-Drain: frische Server-Daten holen
  useSyncListener(refresh);

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
  const [showAddFriend, setShowAddFriend] = useState(false);
  const isSimple = training.discipline === "simple";
  // Nur eigene Targets anzeigen — andere Participants haben ihre eigenen
  const myTargets = (training.targets ?? []).filter(
    (t) => !t.participant_id || t.participant_id === training.my_participant_id
  );
  const isOpen = !training.ended_at;
  const nextIndex = (myTargets[myTargets.length - 1]?.target_index ?? 0) + 1;
  const confirm = useConfirm();

  // Page-spezifischer Footer: Zurück + Hauptaktionen je nach Status
  const footerActions = useMemo(() => {
    const actions: Array<
      | { kind: "link"; to: string; icon: React.ReactNode; label: string; primary?: boolean }
      | { kind: "button"; onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean; danger?: boolean }
    > = [
      { kind: "link", to: "/", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
    ];
    if (isOpen && !isSimple) {
      const firstStation = myTargets.length === 0;
      // target_practice: nach num_ends keine "Station N+1" mehr
      const tpMax = training.discipline === "target_practice" && training.num_ends
        ? training.num_ends : null;
      const reachedMax = tpMax !== null && nextIndex > tpMax;
      if (!reachedMax) {
        actions.push({
          kind: "button",
          onClick: () => setSearchParams({ station: String(nextIndex) }),
          icon: <Plus size={20} strokeWidth={2} />,
          label: firstStation ? "Starten" : `Station ${nextIndex}`,
          primary: true,
        });
      }
    }
    if (isOpen) {
      actions.push({
        kind: "button",
        onClick: handleEnd,
        icon: <Check size={20} strokeWidth={1.75} />,
        label: "Beenden",
      });
    }
    if (!isOpen) {
      actions.push({
        kind: "link",
        to: `/trainings/${training.id}/summary`,
        icon: <BarChart3 size={20} strokeWidth={1.75} />,
        label: "Auswertung",
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSimple, nextIndex, training.id]);
  usePageFooter(footerActions);

  async function handleDelete() {
    const ok = await confirm({
      title: "Training löschen?",
      message: "Dieses Training und alle erfassten Pfeile werden endgültig entfernt.",
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
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
            <div className="text-sm text-secondary mt-1">
              {training.bow_name ? `${training.bow_name} · ${BOW_LABELS[training.bow_type]}` : BOW_LABELS[training.bow_type]}
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
            onAddFriend={() => setShowAddFriend(true)}
            isLive={isShared}
            isPolling={isPolling}
          />
        )}

        {!isSimple && myTargets.length > 0 && (
          <div className="mt-4">
            <StationStatusGrid
              targets={myTargets}
              onPick={(idx) => setSearchParams({ station: String(idx) })}
              totalLanes={
                training.discipline === "target_practice"
                  ? training.num_ends
                  : training.parcours_lanes_count
              }
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
          {isOpen && (() => {
            // target_practice: nach num_ends keinen weiteren Add-Button mehr
            const tpMax = training.discipline === "target_practice" && training.num_ends
              ? training.num_ends : null;
            if (tpMax !== null && nextIndex > tpMax) return null;
            return (
              <button
                onClick={() => setSearchParams({ station: String(nextIndex) })}
                className="btn w-full tap-large"
              >
                {myTargets.length === 0
                  ? "Training starten"
                  : t("training:detail.add_station", { n: nextIndex })}
              </button>
            );
          })()}

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

      {showAddFriend && typeof training.id === "number" && (
        <Suspense fallback={null}>
          <AddFriendModal
            trainingId={training.id}
            existingUserIds={(training.participants ?? [])
              .map((p) => p.user_id)
              .filter((id): id is number => typeof id === "number")}
            onClose={() => setShowAddFriend(false)}
            onAdded={() => { setShowAddFriend(false); void onChange(); }}
          />
        </Suspense>
      )}
    </div>
  );
}

function StationStatusGrid({
  targets,
  onPick,
  totalLanes,
}: {
  targets: Target[];
  onPick: (idx: number) => void;
  /** Optional: Soll-Anzahl Bahnen aus dem zugehörigen Parcours. Wenn gesetzt,
   *  begrenzt das Grid auf diese Zahl statt hartem Default 28. */
  totalLanes?: number | null;
}) {
  const byIdx = new Map(targets.map((t) => [t.target_index, t]));
  const fallback = totalLanes && totalLanes > 0 ? totalLanes : 28;
  const max = Math.max(fallback, ...Array.from(byIdx.keys()));
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
  // Bei target_practice kommt die Pfeil-Anzahl aus der Training-Konfiguration
  const slots = training.discipline === "target_practice" && training.arrows_per_end
    ? training.arrows_per_end
    : SLOTS_BY_DISCIPLINE[training.discipline];
  const confirm = useConfirm();

  // Multi-Participant-Score: Owner kann für Gäste (oder andere Participants)
  // scoren. Default = eigene my_participant_id, Switcher oben im Live-Entry.
  const allParticipants = training.participants ?? [];
  const myPid = training.my_participant_id ?? null;
  const [scoringForPid, setScoringForPid] = useState<number | null>(myPid);
  // Bei Training-Refresh oder erstem Mount: scoringForPid auf myPid setzen falls null
  useEffect(() => {
    if (scoringForPid === null && myPid !== null) setScoringForPid(myPid);
  }, [myPid, scoringForPid]);
  // Andere scoring-bare Participants (Owner darf für alle scoren — sonst nur self)
  const isOwner = !!training.is_owner;
  const scoringParticipants = isOwner
    ? allParticipants.filter((p) => p.role !== "viewer")
    : allParticipants.filter((p) => p.id === myPid);

  // Live-Eingabe ist ein Vollbild-Modus — die globale Bottom-Nav (Home/Stats/+…)
  // hat hier keinen Sinn und überlappt sich mit dem "Speichern & weiter"-Button.
  usePageFooter([]);

  // myTargets = Targets des aktuell gewählten Scoring-Participants.
  // Bei normalem Single-Player ist scoringForPid === my_participant_id.
  const myTargets = (training.targets ?? []).filter(
    (t) => !t.participant_id || t.participant_id === scoringForPid
  );
  const existing = myTargets.find((t) => t.target_index === stationIndex);
  // Fallback-Total für Stations-Grid: target_practice nutzt num_ends, Parcours-Training
  // nutzt parcours.lanes_count, sonst Default 28.
  const fallbackTotal = training.discipline === "target_practice" && training.num_ends
    ? training.num_ends
    : training.parcours_lanes_count && training.parcours_lanes_count > 0
      ? training.parcours_lanes_count
      : 28;
  const totalStations = Math.max(fallbackTotal, ...myTargets.map((t) => t.target_index));

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

  // KEY-FIX: Wenn stationIndex wechselt (Speichern&Weiter), Form-State auf das
  // existing-Target der neuen Station zurücksetzen. Sonst behält die Component
  // die Pfeile vom vorigen End.
  useEffect(() => {
    setAnimal(existing?.animal_or_face ?? "");
    setDistance(existing?.distance_m?.toString() ?? "");
    setActiveSlot(0);
    const zArr: (string | null)[] = Array(slots).fill(null);
    const mArr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots) {
          zArr[s.arrow_seq - 1] = s.zone;
          if (s.x_norm != null && s.y_norm != null) {
            mArr[s.arrow_seq - 1] = { x: s.x_norm, y: s.y_norm };
          }
        }
      }
    }
    setZonesPicked(zArr);
    setMarkers(mArr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIndex, existing?.id, slots, scoringForPid]);

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
    const nfaa = !!training.nfaa_mode;
    return zonesPicked.reduce((sum, z, i) => sum + previewArrowPoints(training.discipline, z, i, zonesPicked, nfaa), 0);
  }, [zonesPicked, training.discipline, training.nfaa_mode]);

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
        // Owner kann für anderen Participant (Gast) scoren
        ...(scoringForPid && scoringForPid !== myPid ? { for_participant_id: scoringForPid } : {}),
      });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    await save();
    // Auto-Cycle bei mehreren Schützen:
    // wenn noch andere scoring-Participants existieren UND aktueller scoringForPid
    // war für den letzten in der Liste → nächste Station + erster Participant.
    // Sonst: gleicher Station, nächster Participant.
    if (scoringParticipants.length > 1) {
      const idx = scoringParticipants.findIndex((p) => p.id === scoringForPid);
      const nextIdx = idx + 1;
      if (nextIdx < scoringParticipants.length) {
        // Nächster Schütze, gleiche Station
        setScoringForPid(scoringParticipants[nextIdx].id);
        return;
      }
      // Letzter war an der Reihe → nächste Station, erster Schütze
      setScoringForPid(scoringParticipants[0].id);
    }
    // Bei target_practice Schluss am letzten End — kein "Speichern&weiter" mehr
    const maxEnd = training.discipline === "target_practice" && training.num_ends
      ? training.num_ends : 99;
    if (stationIndex < maxEnd) onNavigate(stationIndex + 1);
    else onClose(); // alle Stations durch → zurück zur Übersicht
  }

  async function deleteStation() {
    if (!existing) return;
    const ok = await confirm({
      title: `Station ${stationIndex} löschen?`,
      message: "Alle Pfeile dieser Station werden entfernt.",
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteTarget(training.id, existing.id);
      await onChange();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  // Bei „Erstpfeil zählt"-Disziplinen die Slots nach dem ersten Treffer ausgrauen
  const firstHitDisableIdx = FIRST_HIT_DISCIPLINES.includes(training.discipline)
    ? zonesPicked.findIndex((z) => z && z !== "miss")
    : -1;

  const hasPhoto = !!existing?.image_path;

  return (
    <div className="fixed inset-0 z-30 bg-canvas dark:bg-canvas-dark overflow-y-auto animate-fade-in">
      {/* Top-Bar: kompakt, mit Live-Score rechts */}
      <header className="sticky top-0 z-10 bg-canvas/95 dark:bg-canvas-dark/95 backdrop-blur border-b border-hairline">
        <div className="flex items-center justify-between px-3 py-2 pt-safe">
          <button onClick={onClose} className="btn-icon" aria-label="Close">
            <X size={20} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setShowStationGrid(true)}
            className="flex items-center gap-1.5 font-display text-base font-semibold no-tap-highlight"
          >
            <Grid3x3 size={16} strokeWidth={1.75} />
            {t("training:live.station_of_total", { current: stationIndex, total: totalStations })}
          </button>
          <div className="flex items-center gap-1">
            <div className="score text-lg leading-none tabular-nums pr-2 text-cherry-600 dark:text-cherry-400" key={previewTotal}>
              {previewTotal}
            </div>
            <button onClick={() => setShowMenu(true)} className="btn-icon" aria-label="Menu">
              <MoreHorizontal size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <div className="container-app py-2 space-y-2.5">
        {/* Participant-Switcher: nur bei ≥2 scoring-Participants. Owner kann
            zwischen sich und Gästen wechseln; Score-Save geht dann an den
            gewählten Participant. */}
        {scoringParticipants.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">Score für:</span>
            {scoringParticipants.map((p) => (
              <button
                key={p.id}
                onClick={() => setScoringForPid(p.id)}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  scoringForPid === p.id
                    ? "bg-cherry-500 text-cream"
                    : "bg-surface text-secondary border border-hairline"
                }`}
              >
                {p.is_self ? "Ich" : p.display_name ?? "—"}
                {p.user_role === "guest" && " · Gast"}
              </button>
            ))}
          </div>
        )}

        {/* Zeile 1: Tier + Distanz + Foto-Trigger — bei target_practice komplett ausblenden,
            dort gibts feste Distance + keine Tiernamen + keinen Foto-Upload */}
        {training.discipline !== "target_practice" && (
          <div className="flex items-center gap-2">
            <input
              className="input flex-1 min-w-0"
              placeholder={t("training:live.animal_or_face")}
              value={animal}
              onChange={(e) => setAnimal(e.target.value)}
            />
            <input
              className="input w-20 shrink-0"
              type="number"
              inputMode="decimal"
              step="0.5"
              placeholder="m"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
            {existing && (
              <div className="shrink-0">
                <StationPhoto
                  trainingId={training.id}
                  targetId={existing.id}
                  imagePath={existing.image_path}
                  onChange={() => onChange()}
                />
              </div>
            )}
          </div>
        )}

        {/* Interaktive Marker auf dem Foto — nur einblenden wenn Foto vorhanden */}
        {hasPhoto && training.discipline !== "target_practice" && (
          <PhotoMarkers
            imagePath={existing!.image_path!}
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

        {/* Pfeil-Slots — kompakter ohne große Punkte-Anzeige (Live-Score steht oben rechts) */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
          {Array.from({ length: slots }).map((_, i) => {
            const z = zonesPicked[i];
            const isActive = activeSlot === i;
            const points = previewArrowPoints(training.discipline, z, i, zonesPicked, !!training.nfaa_mode);
            const isIfaaDisabled = firstHitDisableIdx !== -1 && i > firstHitDisableIdx;
            return (
              <button
                key={i}
                onClick={() => setActiveSlot(i)}
                className={`py-2 rounded-xl flex flex-col items-center justify-center transition active:scale-[0.98] ${
                  isActive
                    ? "bg-cherry-50 dark:bg-cherry-900/30 border-2 border-cherry-500"
                    : z
                    ? "bg-elevated border-2 border-transparent"
                    : "bg-surface border-2 border-dashed border-hairline"
                } ${isIfaaDisabled ? "opacity-40" : ""}`}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted leading-none">
                  {t("training:live.shot_n", { n: i + 1 })}
                </div>
                <div className={`leading-tight mt-0.5 ${z ? "score text-lg" : "text-base text-muted font-bold"}`}>
                  {z ?? "·"}
                </div>
                {z && points > 0 && (
                  <div className="text-[9px] text-cherry-600 dark:text-cherry-400 font-mono tabular-nums leading-none">+{points}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Pad: TargetPad für target_practice (Custom-Ringe + Long-Press-Lupe),
            sonst BullseyePad mit Disziplin-spezifischen Zonen.
            target_practice darf aus dem container-app-Padding ausbrechen
            damit die Scheibe so groß wie möglich ist (100vw - 20px). */}
        {training.discipline === "target_practice" ? (
          <div className="-mx-5 sm:-mx-6">
          <TargetPad
            rings={training.target_rings ?? 10}
            activeSlot={activeSlot}
            markers={zonesPicked.map((z, i) => {
              const m = markers[i];
              if (!m || !z) return null;
              const pts = parseInt(z, 10) || 0;
              return { x: m.x, y: m.y, points: pts };
            })}
            onShot={(points, x, y) => {
              const zone = points === 0 ? "miss" : String(points);
              const nextZ = [...zonesPicked]; nextZ[activeSlot] = zone; setZonesPicked(nextZ);
              const nextM = [...markers]; nextM[activeSlot] = { x, y }; setMarkers(nextM);
              const empty = nextZ.findIndex((z, i) => i > activeSlot && z === null);
              if (empty !== -1) setActiveSlot(empty);
              else if (activeSlot < slots - 1) setActiveSlot(activeSlot + 1);
            }}
            onMoveMarker={(slot, x, y, points) => {
              // Drag im Zoom-Modal: setze sowohl Zone (für Score) als auch Marker (x/y).
              const zone = points === 0 ? "miss" : String(points);
              const nextZ = [...zonesPicked]; nextZ[slot] = zone; setZonesPicked(nextZ);
              const nextM = [...markers]; nextM[slot] = { x, y }; setMarkers(nextM);
            }}
            onClearSlot={(s) => {
              const nextZ = [...zonesPicked]; nextZ[s] = null; setZonesPicked(nextZ);
              const nextM = [...markers]; nextM[s] = null; setMarkers(nextM);
            }}
          />
          </div>
        ) : (
          <BullseyePad
            discipline={training.discipline}
            selectedZone={zonesPicked[activeSlot] ?? null}
            onZoneSelect={(code) => handleZoneSelect(code)}
            disabled={firstHitDisableIdx !== -1 && activeSlot > firstHitDisableIdx}
          />
        )}

        {/* Aktionen: Speichern + (optional) Vorherige */}
        <div className="flex items-center gap-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {stationIndex > 1 && (
            <button
              onClick={() => onNavigate(stationIndex - 1)}
              className="btn-icon shrink-0"
              aria-label="Vorherige Station"
              title="Vorherige Station"
            >
              <ArrowLeft size={20} strokeWidth={1.75} />
            </button>
          )}
          {(() => {
            const maxEnd = training.discipline === "target_practice" && training.num_ends
              ? training.num_ends : null;
            const isLastEnd = maxEnd !== null && stationIndex >= maxEnd;
            const isLastScorer = scoringParticipants.length <= 1 ||
              scoringParticipants[scoringParticipants.length - 1].id === scoringForPid;
            const isFinalSave = isLastEnd && isLastScorer;
            return (
              <button onClick={saveAndNext} className="btn-accent flex-1" disabled={busy}>
                {busy ? t("training:live.saving")
                      : isFinalSave ? "Speichern & beenden"
                      : "Speichern & weiter"} <ArrowRight size={18} strokeWidth={2} />
              </button>
            );
          })()}
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
            totalLanes={training.parcours_lanes_count}
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
