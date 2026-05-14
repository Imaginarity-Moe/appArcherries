import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, TrendingUp, Calendar, Plus, Users, Play } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  listTrainings,
  type TrainingListItem,
} from "../api/trainings";
import Sparkline from "../components/Sparkline";
import { LogoMark } from "../components/Logo";
import { fmtDate } from "../lib/format";
import { useSyncListener } from "../lib/useSyncListener";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [items, setItems] = useState<TrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrainings = () => {
    listTrainings(1, 50)
      .then((r) => setItems(r.trainings))
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTrainings();
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

      {/* Trainings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">{t("dashboard:recent_trainings")}</h2>
          <Link
            to="/trainings/new"
            className="hidden lg:inline-flex btn"
          >
            <Plus size={18} /> {t("dashboard:new_training")}
          </Link>
        </div>

        {loading && <p className="text-forest-700">{t("common:actions.loading")}</p>}
        {error && <p className="text-red-700">{error}</p>}

        {!loading && !error && items.length === 0 && <EmptyState />}

        {items.length > 0 && (
          <ul className="space-y-3">
            {items.slice(0, 10).map((it) => (
              <li key={it.id}>
                <TrainingCard item={it} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
  return (
    <Link to={`/trainings/${item.id}`} className="card-interactive flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-forest-700 dark:text-forest-300 mb-0.5 flex items-center gap-2">
          <span>{fmtDate(item.started_at)}</span>
          {item.is_shared && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-copper-600 bg-copper-50 dark:bg-copper-700/20 rounded-full px-1.5 py-0.5"
              title="Geteilte Runde — du bist Gast"
            >
              <Users size={10} /> Geteilt
            </span>
          )}
        </div>
        <div className="font-semibold truncate">
          {DISCIPLINE_LABELS[item.discipline]} · {BOW_LABELS[item.bow_type]}
        </div>
        {item.location && (
          <div className="text-sm text-forest-700 dark:text-forest-300 truncate">
            📍 {item.location}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="score text-score-md leading-none">{item.total_score}</div>
        <div className="text-[10px] text-forest-300 uppercase tracking-wider">Pkt</div>
        <Sparkline values={[item.total_score]} width={60} height={16} className="mt-1" />
      </div>
    </Link>
  );
}

function EmptyState() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="card text-center py-10">
      <EmptyArcher />
      <p className="text-forest-700 dark:text-forest-300 mt-4 mb-1">{t("no_trainings")}</p>
      <p className="text-forest-700 dark:text-forest-300 text-sm mb-5">{t("empty_cta")}</p>
      <Link to="/trainings/new" className="btn tap-large inline-flex">
        <Plus size={18} /> {t("first_training")}
      </Link>
    </div>
  );
}

function EmptyArcher() {
  // Mini-SVG: stilisierter Bogenschütze als Linien-Schatten in forest-300
  return (
    <svg viewBox="0 0 200 160" width="160" height="128" className="mx-auto opacity-60">
      <g fill="none" stroke="#B5C58A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Kopf */}
        <circle cx="100" cy="32" r="12" />
        {/* Körper */}
        <line x1="100" y1="44" x2="100" y2="100" />
        {/* Linker Arm hält Bogen */}
        <line x1="100" y1="60" x2="60" y2="55" />
        {/* Bogen */}
        <path d="M 60 30 Q 40 55 60 80" />
        {/* Sehne + Pfeil */}
        <line x1="60" y1="55" x2="130" y2="55" />
        <path d="M125 50 L130 55 L125 60" />
        {/* Rechter Arm zur Sehne */}
        <line x1="100" y1="60" x2="125" y2="55" />
        {/* Beine */}
        <line x1="100" y1="100" x2="85" y2="135" />
        <line x1="100" y1="100" x2="115" y2="135" />
      </g>
    </svg>
  );
}
