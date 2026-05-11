import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Target, TrendingUp, Calendar, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  listTrainings,
  type TrainingListItem,
} from "../api/trainings";
import Sparkline from "../components/Sparkline";
import { fmtDate } from "../lib/format";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [items, setItems] = useState<TrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainings(1, 50)
      .then((r) => setItems(r.trainings))
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-semibold leading-tight">
          {t("dashboard:greeting", { name: user?.display_name ?? user?.email?.split("@")[0] })}
        </h1>
        <p className="text-sm text-forest-700 dark:text-forest-300 mt-0.5 capitalize">{today}</p>
      </div>

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
    <div className={`card p-4 ${highlight ? "bg-gradient-to-br from-copper-50 to-elevated dark:from-copper-700/10 dark:to-elevated-dark border-copper-300/40" : ""}`}>
      <div className="flex items-center gap-2 text-forest-700 dark:text-forest-300 text-xs font-medium mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-score-md ${highlight ? "score" : "font-mono tabular-nums font-bold text-forest-900 dark:text-forest-50"}`}>
        {value}
      </div>
    </div>
  );
}

function TrainingCard({ item }: { item: TrainingListItem }) {
  // Achievement-Ahnung der Sparkline: simulieren via Zonen-Tendenz ist nicht möglich auf der List-Seite.
  // Wir nutzen daher den Score-Wert als 1-Punkt-Skala — die echte Sparkline kommt auf der Detail-Seite.
  return (
    <Link to={`/trainings/${item.id}`} className="card-interactive flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-forest-700 dark:text-forest-300 mb-0.5">
          {fmtDate(item.started_at)}
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
