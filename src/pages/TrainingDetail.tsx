import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, BarChart3, Check, Grid3x3, Loader2, MoreHorizontal, Plus, Trash2, Users, X } from "lucide-react";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  PEG_LABELS,
  deleteTarget,
  deleteTraining,
  getTraining,
  updateTraining,
  upsertTarget,
  setTrainingTurn,
  type Discipline,
  type Participant,
  type Target,
  type Training,
} from "../api/trainings";
import BullseyePad from "../components/BullseyePad";
import StationHeatmapHint from "../components/StationHeatmapHint";
import TargetPad from "../components/TargetPad";
import ParticipantsBar from "../components/ParticipantsBar";
import StationPhoto from "../components/StationPhoto";
import PhotoMarkers from "../components/PhotoMarkers";
import { PageSpinner } from "../components/Spinner";
import { fmtDateTime, endLabel } from "../lib/format";
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
  // Sync-Modus: 5s-Polling (zeitkritisch für Turn-Wechsel + Live-Mirror).
  // Solo/Collab in geteilten Trainings: 10s reicht — schont IONOS-PHP-Worker.
  const pollInterval = training?.shared_scoring_mode === "sync" ? 5000 : 10000;
  const { isPolling } = useLivePolling(refresh, isOpenPoll && isShared, pollInterval);

  // Nach erfolgreichem Outbox-Drain: frische Server-Daten holen
  useSyncListener(refresh);

  // Sync-Modus: GAST-Auto-Open. Nur Mitspieler (nicht-Owner) springen automatisch
  // zur Live-Eingabe — Owner bleibt in der Übersicht, um Freunde einzuladen und
  // bewusst per "Training starten" loszulegen.
  useEffect(() => {
    if (!training) return;
    if (training.shared_scoring_mode !== "sync") return;
    if (training.ended_at) return;
    if (focusedStation !== null) return; // schon im Live-Modus
    if (training.discipline === "simple") return;
    if (training.is_owner) return; // Owner-Setup-Phase NICHT abkürzen
    const serverStation = training.current_station_index;
    if (serverStation && serverStation >= 1) {
      setSearchParams({ station: String(serverStation) }, { replace: true });
    }
  }, [training, focusedStation, setSearchParams]);

  if (loading) return <PageSpinner />;
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
  // Beendetes Training: Tabelle + alle Teilnehmer als Default — User möchte direkt
  // den Vergleich sehen, ohne erst umzuschalten.
  const [viewMode, setViewMode] = useState<"cards" | "table">(
    training.ended_at ? "table" : "cards"
  );
  const [showAllInTable, setShowAllInTable] = useState(!!training.ended_at);
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
          label: firstStation ? "Starten" : `${endLabel(training.discipline, 1)} ${nextIndex}`,
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
              {myTargets.length > 0
                ? `${myTargets.length} ${endLabel(training.discipline, myTargets.length)}`
                : "Pkt"}
            </div>
          </div>
        </div>

        {training.participants && training.participants.length > 0 && (
          <ParticipantsBar
            participants={training.participants}
            isOwner={!!training.is_owner}
            onInvite={isOpen ? () => setShowInvite(true) : undefined}
            onAddFriend={isOpen ? () => setShowAddFriend(true) : undefined}
            isLive={isShared}
            isPolling={isPolling}
          />
        )}

        {/* Start-Spieler-Wahl: nur bei target_practice, Multi-Player, noch keine Targets,
            User ist Owner. Wer hier gewählt wird, beginnt Leg 1 — Reihenfolge rotiert
            danach pro Leg automatisch. */}
        {training.discipline === "target_practice"
          && training.is_owner
          && (training.participants?.filter((p) => p.role !== "viewer").length ?? 0) >= 2
          && (training.targets?.length ?? 0) === 0 && (
          <StartPlayerPicker training={training} onChange={onChange} />
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
                  : `${endLabel(training.discipline, 1)} ${nextIndex} hinzufügen`}
              </button>
            );
          })()}

          {/* View-Toggle: Karten / Tabelle */}
          {myTargets.length > 0 && (
            <div className="flex items-center gap-2 justify-between mb-2 flex-wrap">
              <div className="inline-flex p-0.5 bg-surface rounded-lg">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1 text-xs font-medium rounded ${viewMode === "cards" ? "bg-elevated text-primary" : "text-secondary"}`}
                >
                  Karten
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs font-medium rounded ${viewMode === "table" ? "bg-elevated text-primary" : "text-secondary"}`}
                >
                  Tabelle
                </button>
              </div>
              {viewMode === "table" && (training.participants?.length ?? 0) > 1 && (
                <label className="inline-flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllInTable}
                    onChange={(e) => setShowAllInTable(e.target.checked)}
                    className="accent-cherry-500"
                  />
                  Alle Teilnehmer
                </label>
              )}
            </div>
          )}

          {viewMode === "cards" ? (
            <div className="space-y-2">
              {myTargets.map((tgt) => (
                <StationRow
                  key={tgt.id}
                  target={tgt}
                  onClick={() => setSearchParams({ station: String(tgt.target_index) })}
                />
              ))}
            </div>
          ) : (
            <StationsTable
              training={training}
              myParticipantId={training.my_participant_id ?? null}
              showAll={showAllInTable}
              onPickStation={(idx) => setSearchParams({ station: String(idx) })}
            />
          )}
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

/**
 * UI für die Wahl des Start-Spielers bei Multi-Player target_practice.
 * Speichert starting_participant_id im Training. Rotation pro Leg passiert
 * dann im Live-Entry automatisch (siehe scoringParticipants useMemo).
 */
/**
 * Im collab-Mode: sammle die Pfeile aller ANDEREN Participants für die aktuelle
 * Station und gib sie als foreignMarkers für das TargetPad zurück. Pro Spieler
 * eine eindeutige Farbe + Initial-Label.
 */
const FOREIGN_COLORS = ["#3F6D5E", "#7A5C8A", "#D4A547", "#3FA6C9", "#A85A47", "#5C7AAA"];
function computeForeignMarkers(training: Training, stationIndex: number, myPid: number | null) {
  const out: { x: number; y: number; points: number; label: string; color: string }[] = [];
  const participants = (training.participants ?? []).filter((p) => p.role !== "viewer" && p.id !== myPid);
  participants.forEach((p, pIdx) => {
    const t = (training.targets ?? []).find((tt) => tt.participant_id === p.id && tt.target_index === stationIndex);
    if (!t) return;
    const color = FOREIGN_COLORS[pIdx % FOREIGN_COLORS.length];
    const label = (p.display_name ?? "?").slice(0, 1).toUpperCase();
    for (const sh of t.shots) {
      if (sh.x_norm == null || sh.y_norm == null) continue;
      // DB-Werte sind 0..1 normalisiert; TargetPad rendert daraus selbst die viewBox-Position.
      out.push({
        x: sh.x_norm,
        y: sh.y_norm,
        points: sh.points ?? 0,
        label,
        color,
      });
    }
  });
  return out;
}

/**
 * Tabellen-Ansicht der Stations: Zeilen = Stationen, Spalten = Pfeile.
 * Bei showAll: zusätzliche Spalten pro Mit-Spieler mit deren Gesamt-Score
 * pro End. Klick auf eine Zeile öffnet die Station-Live-Eingabe.
 */
function StationsTable({
  training,
  myParticipantId,
  showAll,
  onPickStation,
}: {
  training: Training;
  myParticipantId: number | null;
  showAll: boolean;
  onPickStation: (idx: number) => void;
}) {
  const allTargets = training.targets ?? [];
  const allParticipants = (training.participants ?? []).filter((p) => p.role !== "viewer");
  const me = allParticipants.find((p) => p.id === myParticipantId) ?? allParticipants[0];
  const otherPlayers = allParticipants.filter((p) => p.id !== me?.id);

  // Anzahl Pfeil-Spalten = max(arrows_per_end, observed shots)
  const slotsPerStation = training.discipline === "target_practice" && training.arrows_per_end
    ? training.arrows_per_end
    : SLOTS_BY_DISCIPLINE[training.discipline];

  // Sammle alle target_index, die im aktuellen Modus angezeigt werden sollen
  const allIndexes = Array.from(new Set(
    allTargets.filter((t) =>
      showAll ? true : t.participant_id === me?.id || !t.participant_id
    ).map((t) => t.target_index)
  )).sort((a, b) => a - b);

  const ownTargetByIdx = new Map<number, Target>();
  allTargets.filter((t) => t.participant_id === me?.id).forEach((t) => ownTargetByIdx.set(t.target_index, t));

  const sumShots = (t?: Target) =>
    t ? t.shots.reduce((s, sh) => s + (sh.points ?? 0), 0) : null;

  return (
    <div className="card overflow-x-auto px-3 sm:px-5 py-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.08em] text-secondary/60 border-b border-hairline">
            <th className="text-left px-3 py-3 font-semibold">#</th>
            {Array.from({ length: slotsPerStation }, (_, i) => (
              <th key={i} className="px-2 py-3 font-semibold text-center">P{i + 1}</th>
            ))}
            <th className="px-3 py-3 font-semibold text-right">{me?.is_self ? "Du" : me?.display_name ?? "—"}</th>
            {showAll && otherPlayers.map((p) => (
              <th key={p.id} className="px-3 py-3 font-semibold text-right">
                {p.is_self ? "Du" : p.display_name ?? "—"}
                {p.user_role === "guest" && <span className="opacity-70 font-normal"> (Gast)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {allIndexes.map((idx) => {
            const own = ownTargetByIdx.get(idx);
            const ownTotal = sumShots(own);
            return (
              <tr
                key={idx}
                onClick={() => onPickStation(idx)}
                className="cursor-pointer hover:bg-surface transition"
              >
                <td className="px-3 py-2.5 font-medium text-secondary">{idx}</td>
                {Array.from({ length: slotsPerStation }, (_, i) => {
                  const sh = own?.shots.find((s) => s.arrow_seq === i + 1);
                  return (
                    <td key={i} className="px-2 py-2.5 text-center font-mono tabular-nums">
                      {sh ? (
                        <span className={sh.points && sh.points > 0 ? "text-primary" : "text-muted"}>
                          {sh.zone ?? "—"}
                        </span>
                      ) : (
                        <span className="text-muted">·</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-cherry-600 dark:text-cherry-400">
                  {ownTotal ?? "·"}
                </td>
                {showAll && otherPlayers.map((p) => {
                  const t = allTargets.find((tt) => tt.target_index === idx && tt.participant_id === p.id);
                  const total = sumShots(t);
                  return (
                    <td key={p.id} className="px-3 py-2.5 text-right font-mono tabular-nums text-secondary">
                      {total ?? "·"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {allIndexes.length === 0 && (
            <tr>
              <td colSpan={slotsPerStation + 2} className="px-3 py-6 text-center text-secondary text-sm">
                Noch keine Durchgänge erfasst.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StartPlayerPicker({
  training,
  onChange,
}: {
  training: Training;
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const scoringPs = (training.participants ?? []).filter((p) => p.role !== "viewer");
  const currentStart = training.starting_participant_id ?? scoringPs[0]?.id;
  async function pick(pid: number) {
    if (busy) return;
    setBusy(true);
    try {
      await updateTraining(training.id, { starting_participant_id: pid } as Partial<Training>);
      await onChange();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card mt-3 space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted">Wer beginnt Leg 1?</div>
      <div className="flex flex-wrap gap-1.5">
        {scoringPs.map((p) => (
          <button
            key={p.id}
            onClick={() => pick(p.id)}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              currentStart === p.id
                ? "bg-cherry-500 text-cream"
                : "bg-surface text-secondary border border-hairline"
            }`}
          >
            {p.is_self ? "Ich" : p.display_name ?? "—"}
            {p.user_role === "guest" && " · Gast"}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        Die Reihenfolge rotiert pro Leg — Spieler 1 startet Leg 1, Spieler 2 startet Leg 2, usw.
      </p>
    </section>
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
          {target.animal_or_face && (
            <span className="font-semibold truncate">{target.animal_or_face}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {target.shots.map((s) => (
            <span key={s.arrow_seq} className="chip text-[10px] py-0.5">
              {s.zone ?? "—"}
              {s.zone && String(s.points) !== s.zone && (
                <span className="text-forest-300">·{s.points}</span>
              )}
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
  // Sync-Modus: scoringForPid zwingen auf den aktuellen Turn-Spieler. Damit zeigt
  // jeder das gleiche Target — Owner-Switcher entfällt.
  useEffect(() => {
    if (training.shared_scoring_mode === "sync" && training.current_turn_participant_id != null) {
      setScoringForPid(training.current_turn_participant_id);
    }
  }, [training.shared_scoring_mode, training.current_turn_participant_id]);
  // Sync-Modus: stationIndex mit Server-Wert (current_station_index) synchronisieren.
  // Wenn Backend rotiert (alle Spieler durch → station++), springt URL auf B's Gerät automatisch.
  // Nach ended_at NICHT automatisch zurück zur Übersicht — User soll noch korrigieren können.
  useEffect(() => {
    if (training.shared_scoring_mode !== "sync") return;
    if (training.ended_at) return;
    const serverStation = training.current_station_index;
    if (serverStation != null && serverStation !== stationIndex) {
      onNavigate(serverStation);
    }
  }, [training.shared_scoring_mode, training.current_station_index, training.ended_at, stationIndex, onNavigate]);
  // Andere scoring-bare Participants. Im collab-Mode: jeder scort nur für sich.
  // Im solo-Mode: Owner kann für alle scoren (mit Switcher), nicht-Owner nur self.
  const isOwner = !!training.is_owner;
  const isCollabMode = training.discipline === "target_practice" && training.shared_scoring_mode === "collab";
  // sync-Modus: Mutex auf das Scoring. Nur current_turn_participant_id darf eingeben;
  // alle anderen sehen das Pad read-only und denselben Stand.
  const isSyncMode = training.shared_scoring_mode === "sync";
  const currentTurnPid = training.current_turn_participant_id ?? null;
  const isMyTurn =
    !isSyncMode ||
    allParticipants.length <= 1 ||
    currentTurnPid === null ||
    currentTurnPid === myPid;
  const currentTurnPlayer = isSyncMode && currentTurnPid
    ? allParticipants.find((p) => p.id === currentTurnPid) ?? null
    : null;
  const baseScoringParticipants = isCollabMode
    ? allParticipants.filter((p) => p.id === myPid)
    : isSyncMode
      ? allParticipants.filter((p) => p.id === currentTurnPid).length > 0
        ? allParticipants.filter((p) => p.id === currentTurnPid)
        : allParticipants.filter((p) => p.role !== "viewer").slice(0, 1)
      : isOwner
        ? allParticipants.filter((p) => p.role !== "viewer")
        : allParticipants.filter((p) => p.id === myPid);

  // Start-Player-Rotation pro Leg/Set: bei target_practice mit Multi-Player
  // bestimmt starting_participant_id, wer Leg 1 startet. Leg N (1-indexed)
  // wird vom Spieler an Position ((startIdx + (N-1)) mod n) gestartet.
  // scoringParticipants ist also pro Station eine ROTIERTE Liste.
  const scoringParticipants = useMemo(() => {
    if (baseScoringParticipants.length <= 1) return baseScoringParticipants;
    const startPid = training.starting_participant_id ?? baseScoringParticipants[0].id;
    const startIdx = Math.max(0, baseScoringParticipants.findIndex((p) => p.id === startPid));
    const n = baseScoringParticipants.length;
    const offset = (startIdx + (stationIndex - 1)) % n;
    return [...baseScoringParticipants.slice(offset), ...baseScoringParticipants.slice(0, offset)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseScoringParticipants, training.starting_participant_id, stationIndex]);

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
  // Pad-Positionen (BullseyePad-Tap-Position, getrennt von markers=Foto-Marker).
  // Wird für Heatmap-Aggregation gespeichert.
  const [padPositions, setPadPositions] = useState<({ x: number; y: number } | null)[]>(() => {
    const arr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots && s.pad_x != null && s.pad_y != null) {
          arr[s.arrow_seq - 1] = { x: s.pad_x, y: s.pad_y };
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
    const pArr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots) {
          zArr[s.arrow_seq - 1] = s.zone;
          if (s.x_norm != null && s.y_norm != null) {
            mArr[s.arrow_seq - 1] = { x: s.x_norm, y: s.y_norm };
          }
          if (s.pad_x != null && s.pad_y != null) {
            pArr[s.arrow_seq - 1] = { x: s.pad_x, y: s.pad_y };
          }
        }
      }
    }
    setZonesPicked(zArr);
    setMarkers(mArr);
    setPadPositions(pArr);
    // existing?.id BEWUSST nicht in deps: im sync-Mode würde sonst der debounced
    // POST → Polling-Refresh den lokalen State direkt nach dem ersten Pfeil
    // überschreiben (zonesPicked auf [shot1] gesetzt → kurz danach re-init aus
    // gerade gespeichertem existing → Slot wird wieder „aktiv" → erster Pfeil
    // muss doppelt geklickt werden). Initialisierung erfolgt nur bei echtem
    // Kontext-Wechsel: andere Station oder anderer scoringForPid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIndex, slots, scoringForPid]);

  // Sync-Mirror: wenn ich NICHT dran bin, läuft das Display passiv aus existing.shots —
  // jeder Polling-Refresh, der A's neuen Pfeil bringt, wird sofort gerendert.
  // Signature über (arrow_seq, zone) damit ein Polling-Tick mit gleicher length+zones
  // keinen Re-Render macht.
  const existingShotsSig = useMemo(
    () => (existing?.shots ?? []).map((s) => `${s.arrow_seq}:${s.zone ?? ""}`).join(","),
    [existing?.shots]
  );
  useEffect(() => {
    if (!isSyncMode || isMyTurn) return;
    const zArr: (string | null)[] = Array(slots).fill(null);
    const mArr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    const pArr: ({ x: number; y: number } | null)[] = Array(slots).fill(null);
    if (existing) {
      for (const s of existing.shots) {
        if (s.arrow_seq >= 1 && s.arrow_seq <= slots) {
          zArr[s.arrow_seq - 1] = s.zone;
          if (s.x_norm != null && s.y_norm != null) {
            mArr[s.arrow_seq - 1] = { x: s.x_norm, y: s.y_norm };
          }
          if (s.pad_x != null && s.pad_y != null) {
            pArr[s.arrow_seq - 1] = { x: s.pad_x, y: s.pad_y };
          }
        }
      }
    }
    setZonesPicked(zArr);
    setMarkers(mArr);
    setPadPositions(pArr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncMode, isMyTurn, slots, existingShotsSig]);

  // Sync-Live-Push: wenn ICH dran bin, schiebe jeden Pfeil-Click auf den Server
  // (debounced 1.2s). Längeres Debounce reduziert API-Last auf IONOS-Shared —
  // der Mirror auf dem Gegner-Gerät kommt durch das nächste Live-Poll-Tick.
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isSyncMode || !isMyTurn) return;
    // Beim Mount/Reset (keine Pfeile) nicht pushen — sonst würden wir gleich
    // beim Turn-Empfang ein leeres Target speichern.
    if (zonesPicked.every((z) => z === null)) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void save({ yieldTurn: false }).catch(() => {});
    }, 1200);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonesPicked, markers, isSyncMode, isMyTurn]);

  // Beim Pfeil-Tap: nächsten leeren Slot aktivieren
  function handleZoneSelect(code: string, pos?: { x: number; y: number }) {
    const next = [...zonesPicked];
    next[activeSlot] = code;
    setZonesPicked(next);
    if (pos) {
      const nextPad = [...padPositions];
      nextPad[activeSlot] = pos;
      setPadPositions(nextPad);
    }
    // Nächsten leeren Slot suchen
    const nextEmpty = next.findIndex((z, i) => i > activeSlot && z === null);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
    else if (activeSlot < slots - 1) setActiveSlot(activeSlot + 1);
  }

  // Drag-Refine des Pad-Markers — Zone bleibt, nur Position ändert sich
  function handlePadPositionUpdate(pos: { x: number; y: number }) {
    const next = [...padPositions];
    next[activeSlot] = pos;
    setPadPositions(next);
  }

  // Lokale Vorschau-Summe
  const previewTotal = useMemo(() => {
    const nfaa = !!training.nfaa_mode;
    return zonesPicked.reduce((sum, z, i) => sum + previewArrowPoints(training.discipline, z, i, zonesPicked, nfaa), 0);
  }, [zonesPicked, training.discipline, training.nfaa_mode]);

  async function save(opts: { yieldTurn?: boolean } = {}) {
    setBusy(true);
    try {
      const shots = zonesPicked
        .map((z, i) => ({
          arrow_seq: i + 1,
          zone: z,
          x_norm: markers[i]?.x ?? null,
          y_norm: markers[i]?.y ?? null,
          pad_x: padPositions[i]?.x ?? null,
          pad_y: padPositions[i]?.y ?? null,
        }))
        .filter((s) => s.zone !== null);
      await upsertTarget(training.id, {
        target_index: stationIndex,
        animal_or_face: animal || null,
        distance_m: distance ? Number(distance) : null,
        shots,
        // Owner kann für anderen Participant (Gast) scoren
        ...(scoringForPid && scoringForPid !== myPid ? { for_participant_id: scoringForPid } : {}),
        ...(opts.yieldTurn ? { yield: true } : {}),
      });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    // sync-Modus: Speichern + Turn an nächsten Spieler weiterreichen.
    // Nicht selbst zur nächsten Station navigieren — Backend rotiert den Turn,
    // beim Polling auf B's Gerät springt das Display dann automatisch.
    if (isSyncMode) {
      await save({ yieldTurn: true });
      return;
    }
    await save();
    // Auto-Cycle bei mehreren Schützen mit Leg-Start-Rotation:
    // Innerhalb des aktuellen Ends: nächster Spieler in der rotierten Liste.
    // Wenn alle durch sind: nächste Station — DORT wird die rotierte Liste
    // neu berechnet (Spieler rotiert um 1 weiter).
    if (scoringParticipants.length > 1) {
      const idx = scoringParticipants.findIndex((p) => p.id === scoringForPid);
      const nextIdx = idx + 1;
      if (nextIdx < scoringParticipants.length) {
        setScoringForPid(scoringParticipants[nextIdx].id);
        return;
      }
      // Alle durch in diesem End → zur nächsten Station. Beim Re-Render mit
      // neuem stationIndex wird scoringParticipants rotiert. Wir setzen
      // scoringForPid auf das erste Element der ROTIERTEN Liste — das wird
      // im useEffect unten erledigt (siehe stationIndex-Dependency).
      setScoringForPid(null); // signalisiert "neu setzen"
    }
    const maxEnd = training.discipline === "target_practice" && training.num_ends
      ? training.num_ends : 99;
    if (stationIndex < maxEnd) onNavigate(stationIndex + 1);
    else onClose();
  }

  // Bei Station-Wechsel: scoringForPid auf den ersten Spieler der ROTIERTEN
  // Liste setzen (=Spieler, der das End beginnt). Nur wenn aktuell null
  // (Signal aus saveAndNext) oder beim ersten Mount.
  useEffect(() => {
    if (scoringParticipants.length === 0) return;
    if (scoringForPid === null) {
      setScoringForPid(scoringParticipants[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIndex, scoringParticipants]);

  async function deleteStation() {
    if (!existing) return;
    const unitS = endLabel(training.discipline, 1);
    const ok = await confirm({
      title: `${unitS} ${stationIndex} löschen?`,
      message: `Alle Pfeile dieser ${unitS} werden entfernt.`,
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

  // Zwischenergebnis bei target_practice: pro Participant total points
  // sowie gewonnene Legs (bei legs/sets-Modus). Wird nur bei ≥2 Scoring-Participants angezeigt.
  const standings = useMemo(() => {
    if (training.discipline !== "target_practice") return [];
    if (scoringParticipants.length < 2) return [];
    const allTargets = training.targets ?? [];
    const sums = scoringParticipants.map((p) => {
      const ts = allTargets.filter((t) => t.participant_id === p.id);
      const total = ts.reduce((s, tt) => s + tt.shots.reduce((x, sh) => x + (sh.points ?? 0), 0), 0);
      return { p, total, ts };
    });
    // Legs gewonnen pro End: höchster End-Score gewinnt
    if (training.scoring_mode === "legs" || training.scoring_mode === "sets") {
      const numEnds = training.num_ends ?? 5;
      const legsWon = new Map<number, number>();
      for (let endIdx = 1; endIdx <= numEnds; endIdx++) {
        const scores = sums.map(({ p, ts }) => {
          const t = ts.find((tt) => tt.target_index === endIdx);
          const total = t ? t.shots.reduce((s, sh) => s + (sh.points ?? 0), 0) : null;
          return { pid: p.id, total };
        });
        // Alle Participants müssen das End gescored haben, sonst kein Leg-Gewinner
        if (scores.some((s) => s.total === null)) continue;
        const max = Math.max(...scores.map((s) => s.total!));
        const winners = scores.filter((s) => s.total === max);
        if (winners.length === 1) {
          legsWon.set(winners[0].pid, (legsWon.get(winners[0].pid) ?? 0) + 1);
        }
      }
      return sums.map((s) => ({ ...s, legs: legsWon.get(s.p.id) ?? 0 }));
    }
    return sums.map((s) => ({ ...s, legs: 0 }));
  }, [training.targets, training.discipline, training.scoring_mode, training.num_ends, scoringParticipants]);

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
            {`${endLabel(training.discipline, 1)} ${stationIndex} / ${totalStations}`}
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
        {/* Sync-Modus: Turn-Status-Banner. Sichtbar nur wenn ≥2 Spieler dabei sind. */}
        {isSyncMode && allParticipants.length > 1 && (
          <div
            className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-sm ${
              isMyTurn
                ? "bg-cherry-50 dark:bg-cherry-900/30 border border-cherry-500/40 text-cherry-700 dark:text-cherry-300"
                : "bg-elevated border border-hairline text-secondary"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Users size={15} strokeWidth={1.75} className="shrink-0" />
              <span className="font-semibold truncate">
                {isMyTurn ? "Du bist dran" : `${currentTurnPlayer?.display_name ?? "Anderer Spieler"} scort gerade`}
              </span>
            </div>
            {!isMyTurn && isOwner && myPid !== null && (
              <button
                onClick={async () => {
                  await setTrainingTurn(training.id, myPid);
                  await onChange();
                }}
                className="text-[11px] uppercase tracking-wider font-bold px-2 py-1 rounded-md bg-cherry-500 text-cream hover:bg-cherry-600 shrink-0"
              >
                Übernehmen
              </button>
            )}
            {!isMyTurn && !isOwner && (
              <span className="text-[10px] uppercase tracking-wider opacity-80 shrink-0">Sync</span>
            )}
          </div>
        )}

        {/* Darts-Style-Übersicht: aktueller Leg-Score, Legs (im aktuellen Set), Sets pro Spieler.
            Sichtbar sobald ≥2 scoring-fähige Spieler dabei sind — unabhängig vom Lock-Modus
            (sync zeigt nur 1 in scoringParticipants, deswegen direkt allParticipants prüfen). */}
        {training.discipline === "target_practice" &&
          allParticipants.filter((p) => p.role !== "viewer").length >= 2 && (
          <DartsStandings
            training={training}
            stationIndex={stationIndex}
            participants={allParticipants.filter((p) => p.role !== "viewer")}
          />
        )}

        {/* Participant-Switcher: nur bei ≥2 scoring-Participants. Owner kann
            zwischen sich und Gästen wechseln; Score-Save geht dann an den
            gewählten Participant. */}
        {scoringParticipants.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">Score für:</span>
            {scoringParticipants.map((p) => {
              const st = standings.find((s) => s.p.id === p.id);
              const isLegMode = training.scoring_mode === "legs" || training.scoring_mode === "sets";
              return (
                <button
                  key={p.id}
                  onClick={() => setScoringForPid(p.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    scoringForPid === p.id
                      ? "bg-cherry-500 text-cream"
                      : "bg-surface text-secondary border border-hairline"
                  }`}
                >
                  <span>{p.is_self ? "Ich" : p.display_name ?? "—"}{p.user_role === "guest" && " · Gast"}</span>
                  {st && (
                    <span className={`font-mono tabular-nums text-[11px] ${scoringForPid === p.id ? "text-cream/80" : "text-cherry-500"}`}>
                      {isLegMode ? `${st.legs} Legs · ${st.total}` : st.total}
                    </span>
                  )}
                </button>
              );
            })}
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
            foreignMarkers={isCollabMode ? computeForeignMarkers(training, stationIndex, myPid) : undefined}
          />
        )}

        {/* Pfeil-Slots — kompakter ohne große Punkte-Anzeige (Live-Score steht oben rechts) */}
        <div className={`grid gap-1.5 ${!isMyTurn ? "opacity-60 pointer-events-none" : ""}`} style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
          {Array.from({ length: slots }).map((_, i) => {
            const z = zonesPicked[i];
            const isActive = activeSlot === i;
            const points = previewArrowPoints(training.discipline, z, i, zonesPicked, !!training.nfaa_mode);
            const isIfaaDisabled = firstHitDisableIdx !== -1 && i > firstHitDisableIdx;
            return (
              <button
                key={i}
                onClick={() => setActiveSlot(i)}
                disabled={!isMyTurn}
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
                <div className={`leading-tight mt-0.5 ${z ? "score text-xl font-bold" : "text-base text-muted font-bold"}`}>
                  {z ?? "·"}
                </div>
                {/* Punkte nur anzeigen wenn die Zone nicht identisch zum Punktwert ist
                    (bei target_practice ist zone = Ring-Zahl = Punkte → wäre Doppelung) */}
                {z && points > 0 && String(points) !== z && (
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
          <div className={`-mx-5 sm:-mx-6 ${!isMyTurn ? "opacity-60 pointer-events-none" : ""}`}>
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
            foreignMarkers={isCollabMode ? computeForeignMarkers(training, stationIndex, myPid) : undefined}
          />
          </div>
        ) : (
          <div className={!isMyTurn ? "opacity-60 pointer-events-none" : ""}>
            <BullseyePad
              discipline={training.discipline}
              selectedZone={zonesPicked[activeSlot] ?? null}
              selectedPos={padPositions[activeSlot] ?? null}
              onZoneSelect={(code, pos) => handleZoneSelect(code, pos)}
              onPositionUpdate={handlePadPositionUpdate}
              disabled={(firstHitDisableIdx !== -1 && activeSlot > firstHitDisableIdx) || !isMyTurn}
            />
            <div className="mt-2">
              <StationHeatmapHint
                parcoursId={training.parcours_id}
                animalOrFace={animal || null}
                distanceM={distance ? Number(distance) : null}
                discipline={training.discipline}
              />
            </div>
          </div>
        )}

        {/* Aktionen: Speichern + (optional) Vorherige */}
        <div className="flex items-center gap-2 pt-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {stationIndex > 1 && (
            <button
              onClick={() => onNavigate(stationIndex - 1)}
              className="btn-icon shrink-0"
              aria-label={`Vorherige ${endLabel(training.discipline, 1)}`}
              title={`Vorherige ${endLabel(training.discipline, 1)}`}
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
              <button
                onClick={saveAndNext}
                className="btn-accent flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={busy || !isMyTurn}
                title={!isMyTurn ? "Du bist gerade nicht dran" : undefined}
              >
                {busy ? (
                  <>
                    <Loader2 size={18} strokeWidth={2} className="animate-spin" />
                    {t("training:live.saving")}
                  </>
                ) : isSyncMode ? (
                  <>
                    Speichern & nächster Spieler
                    <ArrowRight size={18} strokeWidth={2} />
                  </>
                ) : (
                  <>
                    {isFinalSave ? "Speichern & beenden" : "Speichern & weiter"}
                    <ArrowRight size={18} strokeWidth={2} />
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Stations-Grid (Bottom-Sheet-Style) */}
      {showStationGrid && (
        <BottomSheet onClose={() => setShowStationGrid(false)}>
          <h3 className="font-display text-lg font-semibold mb-3">{endLabel(training.discipline, 2)}</h3>
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

/**
 * Darts-Style-Anzeige: pro Spieler aktueller Leg-Score, Legs (im aktuellen Set)
 * und Sets. Iteriert chronologisch über alle Stations, vergibt Leg-Sieger pro
 * End. Bei scoring_mode='sets': legs_to_win Legs → 1 Set gewonnen + Legs zurücksetzen.
 */
function DartsStandings({
  training,
  stationIndex,
  participants,
}: {
  training: Training;
  stationIndex: number;
  participants: Participant[];
}) {
  const standings = useMemo(() => {
    const numEnds = training.num_ends ?? 0;
    const legsToWin = training.legs_to_win ?? 0;
    const setsToWin = training.sets_to_win ?? 0;
    const mode = training.scoring_mode;
    const targets = training.targets ?? [];

    // Pro Participant: Punkte pro Leg (target_index 1..numEnds)
    const perLeg = participants.map((p) => {
      const ts = targets.filter((t) => t.participant_id === p.id);
      return {
        pid: p.id,
        isSelf: !!p.is_self,
        name: p.display_name ?? "—",
        scores: Array.from({ length: numEnds }, (_, i) => {
          const t = ts.find((tt) => tt.target_index === i + 1);
          return t ? t.shots.reduce((s, sh) => s + (sh.points ?? 0), 0) : null;
        }),
        currentLegScore: (() => {
          const t = ts.find((tt) => tt.target_index === stationIndex);
          return t ? t.shots.reduce((s, sh) => s + (sh.points ?? 0), 0) : 0;
        })(),
      };
    });

    // Iterate Legs in Reihenfolge — Leg-Gewinner + Set-Logik
    const legsInSet = new Map<number, number>();
    const sets = new Map<number, number>();
    for (let i = 0; i < numEnds; i++) {
      const scores = perLeg.map((p) => ({ pid: p.pid, total: p.scores[i] }));
      if (scores.some((s) => s.total === null)) continue;
      const max = Math.max(...scores.map((s) => s.total as number));
      const winners = scores.filter((s) => s.total === max);
      if (winners.length !== 1) continue;
      const wpid = winners[0].pid;
      legsInSet.set(wpid, (legsInSet.get(wpid) ?? 0) + 1);
      if (mode === "sets" && legsToWin > 0 && (legsInSet.get(wpid) ?? 0) >= legsToWin) {
        sets.set(wpid, (sets.get(wpid) ?? 0) + 1);
        legsInSet.clear();
      }
    }

    return perLeg.map((p) => ({
      pid: p.pid,
      name: p.isSelf ? "Du" : p.name,
      currentLegScore: p.currentLegScore,
      legsInSet: legsInSet.get(p.pid) ?? 0,
      setsWon: sets.get(p.pid) ?? 0,
      isSelf: p.isSelf,
      legsToWin,
      setsToWin,
      showSets: mode === "sets",
      showLegs: mode === "legs" || mode === "sets",
    }));
  }, [training, stationIndex, participants]);

  if (standings.length === 0) return null;
  const showLegs = standings[0].showLegs;
  const showSets = standings[0].showSets;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(standings.length, 2)}, minmax(0, 1fr))` }}>
      {standings.map((s) => (
        <div
          key={s.pid}
          className={`rounded-xl border px-3 py-2 ${
            s.isSelf
              ? "border-cherry-500/50 bg-cherry-50/40 dark:bg-cherry-900/20"
              : "border-hairline bg-elevated"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider text-muted truncate">{s.name}</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="score text-2xl tabular-nums leading-none">{s.currentLegScore}</span>
            <span className="text-[10px] text-muted">Leg</span>
          </div>
          {(showLegs || showSets) && (
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-2 font-mono tabular-nums">
              {showLegs && (
                <span>L <strong className="text-primary">{s.legsInSet}</strong>{showSets ? <span className="opacity-50">/{s.legsToWin}</span> : null}</span>
              )}
              {showSets && (
                <span>S <strong className="text-primary">{s.setsWon}</strong><span className="opacity-50">/{s.setsToWin}</span></span>
              )}
            </div>
          )}
        </div>
      ))}
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
