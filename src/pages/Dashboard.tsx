import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, TrendingUp, Calendar, Plus, Users, Play, UserPlus, Archive, Trash2, Flame, Ruler, Trophy as TrophyIcon, ArrowRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  listTrainings,
  deleteTraining,
  setTrainingArchived,
  type TrainingListItem,
} from "../api/trainings";
import { listFriends } from "../api/friends";
import SwipeableCard from "../components/SwipeableCard";
import { useConfirm } from "../components/ConfirmDialog";
import { LogoMark } from "../components/Logo";
import { Spinner } from "../components/Spinner";
import { endLabel } from "../lib/format";
import { fmtDate } from "../lib/format";
import { useSyncListener } from "../lib/useSyncListener";
import ChangelogBanner from "../components/ChangelogBanner";

type TrainingsTab = "active" | "ended" | "archived";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [items, setItems] = useState<TrainingListItem[]>([]);
  const [archivedItems, setArchivedItems] = useState<TrainingListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomingCount, setIncomingCount] = useState(0);
  const [tab, setTab] = useState<TrainingsTab>("active");
  const confirm = useConfirm();

  const loadTrainings = () => {
    // SWR: zeigt sofort den IDB-Cache (wenn vorhanden), refresht im Hintergrund.
    // Erstbesuch in einem Browser geht direkt aufs Netz und füllt den Cache.
    listTrainings(1, 50, false, (fresh) => setItems(fresh.trainings))
      .then((r) => setItems(r.trainings))
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  };

  // Archiv lazy laden — erst wenn der User den Tab antippt
  useEffect(() => {
    if (tab === "archived" && archivedItems === null) {
      listTrainings(1, 50, true)
        .then((r) => setArchivedItems(r.trainings))
        .catch(() => setArchivedItems([]));
    }
  }, [tab, archivedItems]);

  useEffect(() => {
    loadTrainings();
    listFriends()
      .then((r) => setIncomingCount(r.incoming.length))
      .catch(() => {});
  }, []);

  // Nach Sync-Drain: Liste neu laden (Server hat ggf. neue Daten z.B. von geteilten Runden)
  useSyncListener(loadTrainings);

  const stats = useMemo(() => {
    if (items.length === 0) return null;
    const total = items.length;
    const scores = items.map((it) => it.total_score).filter((s) => s > 0);
    const pb = scores.length > 0 ? Math.max(...scores) : 0;
    // Avg over last 30 days
    const now = Date.now();
    const recent = items.filter((it) => {
      const d = new Date(it.started_at.replace(" ", "T")).getTime();
      return now - d < 30 * 24 * 60 * 60 * 1000;
    });
    const avg30 =
      recent.length > 0 ? Math.round(recent.reduce((s, it) => s + it.total_score, 0) / recent.length) : 0;
    return { total, pb, avg30 };
  }, [items]);

  // Lokalisierter Tagesheader
  const today = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  }, [i18n.language]);

  // Offenes Training (ended_at IS NULL) für Schnellstart-Banner
  const openTraining = useMemo(
    () => items.find((it) => !it.ended_at) ?? null,
    [items]
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Watermark — flush am unteren Screen-Rand, voll sichtbar, dezent */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 z-0 flex justify-center opacity-[0.05] dark:opacity-[0.07]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        <LogoMark size={260} className="text-primary" />
      </div>

      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-semibold leading-tight">
          {t("dashboard:greeting", { name: user?.display_name ?? user?.email?.split("@")[0] })}
        </h1>
        <p className="text-sm text-secondary mt-0.5 capitalize">{today}</p>
      </div>

      {/* Changelog-Banner: zeigt neue Features seit letztem Besuch */}
      <ChangelogBanner />

      {/* Friend-Request-Banner: offene Anfragen */}
      {incomingCount > 0 && (
        <Link
          to="/friends"
          className="block card-interactive border-cherry-500/40 hover:border-cherry-500"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-cherry-500 text-cream flex items-center justify-center shrink-0">
              <UserPlus size={18} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {incomingCount === 1
                  ? "1 neue Freundes-Anfrage"
                  : `${incomingCount} neue Freundes-Anfragen`}
              </div>
              <div className="text-xs text-secondary mt-0.5">Tippe hier zum Bearbeiten</div>
            </div>
          </div>
        </Link>
      )}

      {/* Schnellstart-Banner: offenes Training fortsetzen */}
      {openTraining && (
        <Link
          to={`/trainings/${openTraining.id}`}
          className="block card-interactive bg-gradient-to-br from-cherry-500 to-cherry-700 text-cream border-transparent shadow-cherry"
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-cream/15 flex items-center justify-center shrink-0">
              <Play size={20} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider opacity-80">Laufendes Training</div>
              <div className="font-semibold truncate">
                {DISCIPLINE_LABELS[openTraining.discipline]}
                {openTraining.location && ` · ${openTraining.location}`}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                Fortsetzen — Score: {openTraining.total_score}
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Glimpse-Karten */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <GlimpseCard
            icon={<Target size={18} />}
            label={t("dashboard:stats.total_trainings")}
            value={stats.total}
          />
          <GlimpseCard
            icon={<TrendingUp size={18} />}
            label={t("dashboard:stats.personal_best")}
            value={stats.pb}
            highlight
          />
          <GlimpseCard
            icon={<Calendar size={18} />}
            label={t("dashboard:stats.avg_4_weeks")}
            value={stats.avg30}
          />
        </div>
      )}

      {/* Quick-Access für neue Features: Streak + Distanz-Training + Achievements */}
      <DashboardFeatureRow />

      {/* Trainings */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-display text-xl font-semibold">{t("dashboard:recent_trainings")}</h2>
          <Link
            to="/trainings/new"
            className="hidden lg:inline-flex btn"
          >
            <Plus size={18} /> {t("dashboard:new_training")}
          </Link>
        </div>

        {/* Tab-Bar: Aktiv / Beendet / Archiv */}
        <TrainingsTabBar
          tab={tab}
          onChange={setTab}
          counts={{
            active:   items.filter((it) => !it.ended_at).length,
            ended:    items.filter((it) =>  it.ended_at).length,
            archived: archivedItems?.length ?? null,
          }}
        />

        {loading && tab === "active" && <Spinner className="py-4" />}
        {error && <p className="text-red-700">{error}</p>}

        <TrainingsTabContent
          tab={tab}
          items={items}
          archivedItems={archivedItems}
          loadTrainings={loadTrainings}
          reloadArchived={() => setArchivedItems(null)}
          confirm={confirm}
        />
      </section>
    </div>
  );
}

/**
 * Quick-Access-Row für die neuen Features (Streak, Distanz-Training, Achievements).
 * Lädt Achievement-Daten via lazy-Import damit Dashboard-Initial-Render nicht blockt.
 */
function DashboardFeatureRow() {
  const [data, setData] = useState<{ streak_current: number; unlocked_count: number; total: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("../api/achievements").then((m) => m.getAchievements()).then((r) => {
      if (!cancelled) setData(r);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
      {/* Streak-Tile */}
      <Link
        to="/profile"
        className="card-sunken flex items-center gap-3 hover:border-cherry-500/30 transition group"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-cherry-50 dark:bg-cherry-900/30 text-cherry-600 dark:text-cherry-200 shrink-0">
          <Flame size={22} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider">Streak</p>
          <p className="font-semibold tabular-nums">
            {data === null ? "—" : data.streak_current === 0 ? "keine aktive" : `${data.streak_current} ${data.streak_current === 1 ? "Tag" : "Tage"}`}
          </p>
        </div>
        <ArrowRight size={14} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition shrink-0" />
      </Link>

      {/* Distanz-Training-Tile */}
      <Link
        to="/train/distance"
        className="card-sunken flex items-center gap-3 hover:border-cherry-500/30 transition group"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-200 shrink-0">
          <Ruler size={22} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider">Schätz-Training</p>
          <p className="font-semibold">Distanz üben</p>
        </div>
        <ArrowRight size={14} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition shrink-0" />
      </Link>

      {/* Achievements-Tile */}
      <Link
        to="/profile"
        className="card-sunken flex items-center gap-3 hover:border-cherry-500/30 transition group"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 shrink-0">
          <TrophyIcon size={22} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider">Erfolge</p>
          <p className="font-semibold tabular-nums">
            {data === null ? "—" : `${data.unlocked_count} / ${data.total}`}
          </p>
        </div>
        <ArrowRight size={14} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition shrink-0" />
      </Link>
    </div>
  );
}

function TrainingsTabBar({
  tab,
  onChange,
  counts,
}: {
  tab: TrainingsTab;
  onChange: (t: TrainingsTab) => void;
  counts: { active: number; ended: number; archived: number | null };
}) {
  const tabs: { k: TrainingsTab; label: string; count: number | null }[] = [
    { k: "active",   label: "Aktiv",    count: counts.active   },
    { k: "ended",    label: "Beendet",  count: counts.ended    },
    { k: "archived", label: "Archiv",   count: counts.archived },
  ];
  return (
    <div className="flex items-center gap-1 mb-3 -mx-1 px-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.k === tab;
        return (
          <button
            key={t.k}
            type="button"
            onClick={() => onChange(t.k)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-[0.97] ${
              active
                ? "bg-cherry-500 text-cream shadow-cherry"
                : "bg-surface text-secondary hover:text-primary border border-hairline"
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`tabular-nums text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-cream/20" : "bg-elevated"}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TrainingsTabContent({
  tab,
  items,
  archivedItems,
  loadTrainings,
  reloadArchived,
  confirm,
}: {
  tab: TrainingsTab;
  items: TrainingListItem[];
  archivedItems: TrainingListItem[] | null;
  loadTrainings: () => void;
  reloadArchived: () => void;
  confirm: ReturnType<typeof useConfirm>;
}) {
  // Filtere für den aktuellen Tab
  let list: TrainingListItem[];
  if (tab === "active") list = items.filter((it) => !it.ended_at);
  else if (tab === "ended") list = items.filter((it) => !!it.ended_at);
  else list = archivedItems ?? [];

  if (tab === "archived" && archivedItems === null) {
    return <Spinner className="py-4" />;
  }

  if (list.length === 0) {
    return (
      <div className="card text-center py-8 text-sm text-secondary">
        {tab === "active"   && 'Aktuell läuft kein Training. Tippe oben rechts auf „Neues Training".'}
        {tab === "ended"    && "Noch keine beendeten Trainings. Wenn du eines abschließt, landet es hier."}
        {tab === "archived" && "Keine archivierten Trainings. Beendete kannst du nach links wischen → Archivieren."}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {list.slice(0, 20).map((it) => (
        <li key={it.id}>
          <SwipeableCard
            leftAction={{
              label: "Löschen",
              color: "#9b3340",
              icon: <Trash2 size={18} strokeWidth={2} />,
              onAction: async () => {
                const ok = await confirm({ title: "Training löschen?", message: "Das Training und alle Pfeile werden unwiderruflich entfernt.", confirmLabel: "Löschen", variant: "danger" });
                if (!ok) return;
                await deleteTraining(it.id);
                loadTrainings();
                reloadArchived();
              },
            }}
            rightAction={
              tab === "archived"
                ? {
                    label: "Aus Archiv",
                    color: "#3F6D5E",
                    icon: <Archive size={18} strokeWidth={2} />,
                    onAction: async () => {
                      await setTrainingArchived(it.id, false);
                      loadTrainings();
                      reloadArchived();
                    },
                  }
                : it.ended_at
                ? {
                    label: "Archivieren",
                    color: "#3F6D5E",
                    icon: <Archive size={18} strokeWidth={2} />,
                    onAction: async () => {
                      const ok = await confirm({
                        title: "Training archivieren?",
                        message: "Verschwindet aus der Hauptliste, bleibt im Archiv aufrufbar.",
                        confirmLabel: "Archivieren",
                      });
                      if (!ok) return;
                      await setTrainingArchived(it.id, true);
                      loadTrainings();
                      reloadArchived();
                    },
                  }
                : undefined
            }
          >
            <TrainingCard item={it} />
          </SwipeableCard>
        </li>
      ))}
    </ul>
  );
}

function GlimpseCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-3 sm:p-4 ${highlight ? "bg-gradient-to-br from-copper-50 to-elevated dark:from-copper-700/10 dark:to-elevated-dark border-copper-300/40" : ""}`}>
      {/* Label und Icon: untereinander auf Mobile, sodass Label 2-zeilig sein darf */}
      <div className="flex items-start gap-1.5 text-forest-700 dark:text-forest-300 text-[11px] sm:text-xs font-medium mb-1 min-h-[2.5em] leading-tight">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <span className="break-words">{label}</span>
      </div>
      <div className={`text-score-md leading-none ${highlight ? "score" : "font-mono tabular-nums font-bold text-forest-900 dark:text-forest-50"}`}>
        {value}
      </div>
    </div>
  );
}

function TrainingCard({ item }: { item: TrainingListItem }) {
  const isEnded = !!item.ended_at;
  const participants = item.participants ?? [];
  // Anzeige-Namen: "Du" für eigenen Eintrag, ansonsten display_name
  const participantLabels = participants.map((p) =>
    p.is_self ? "Du" : (p.display_name ?? "—") + (p.user_role === "guest" ? " (Gast)" : "")
  );
  // Fortschritt nur sinnvoll bei laufenden Trainings MIT bekannter Bahnen-Gesamtzahl.
  const totalLanes = item.parcours_lanes_count ?? 0;
  const doneLanes = item.done_targets ?? 0;
  const showProgress = !isEnded && totalLanes > 0;
  return (
    <Link to={`/trainings/${item.id}`} className="card-interactive flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-forest-700 dark:text-forest-300 mb-0.5 flex items-center gap-2 flex-wrap">
          <span>{fmtDate(item.started_at)}</span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5 ${
              isEnded
                ? "text-secondary bg-surface"
                : "text-cherry-700 dark:text-cherry-300 bg-cherry-50 dark:bg-cherry-900/30"
            }`}
            title={isEnded ? "Training abgeschlossen" : "Training läuft noch"}
          >
            {isEnded ? "Beendet" : "Läuft"}
            {showProgress && (
              <span className="font-mono tabular-nums opacity-90">· {doneLanes}/{totalLanes}</span>
            )}
          </span>
          {item.is_shared && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-copper-700 dark:text-copper-100 bg-copper-50 dark:bg-copper-700/40 rounded-full px-1.5 py-0.5"
              title="Geteilte Runde — du bist Gast"
            >
              <Users size={10} /> Geteilt
            </span>
          )}
        </div>
        <div className="font-semibold truncate">
          {DISCIPLINE_LABELS[item.discipline]} · {BOW_LABELS[item.bow_type]}
        </div>
        {/* Scheibenschießen-Setup als sekundäre Metadaten-Zeile: Pfeile/Aufnahme,
            Distanz, Ringe, Wertungsmodus mit den jeweiligen Schwellen. */}
        {item.discipline === "target_practice" && (
          <div className="text-xs text-secondary truncate mt-0.5 font-mono tabular-nums">
            {item.arrows_per_end ?? 3} Pfeile · {item.num_ends ?? 10} Aufnahmen
            {item.target_distance_m && <> · {item.target_distance_m}m</>}
            {item.target_rings && <> · {item.target_rings} Ringe</>}
            {item.scoring_mode === "legs" && item.legs_to_win && (
              <> · Best of {item.legs_to_win} Legs</>
            )}
            {item.scoring_mode === "sets" && item.sets_to_win && item.legs_to_win && (
              <> · {item.sets_to_win} Sets × {item.legs_to_win} Legs</>
            )}
          </div>
        )}
        {participantLabels.length > 1 && (
          <div className="text-xs text-secondary truncate flex items-center gap-1 mt-0.5">
            <Users size={11} strokeWidth={1.75} /> {participantLabels.join(", ")}
          </div>
        )}
        {item.location && (
          <div className="text-sm text-forest-700 dark:text-forest-300 truncate">
            📍 {item.location}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[64px]">
        <div className="score text-score-md leading-none">{item.total_score}</div>
        <div className="text-[10px] text-muted uppercase tracking-wider">Pkt</div>
        {isEnded && doneLanes > 0 && (
          <div className="text-[10px] text-secondary mt-1 font-mono tabular-nums">
            {doneLanes} {endLabel(item.discipline, doneLanes)}
          </div>
        )}
      </div>
    </Link>
  );
}

