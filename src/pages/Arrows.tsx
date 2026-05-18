import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Zap, AlertTriangle } from "lucide-react";
import { listArrows, type Arrow } from "../api/arrows";
import { usePageFooter } from "../components/FooterContext";

export default function Arrows() {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listArrows()
      .then((r) => setArrows(r.arrows))
      .finally(() => setLoading(false));
  }, []);

  const footerActions = useMemo(
    () => [
      {
        kind: "link" as const,
        to: "/profile",
        icon: <ArrowLeft size={20} strokeWidth={1.75} />,
        label: "Zurück",
      },
      {
        kind: "link" as const,
        to: "/arrows/new",
        icon: <Plus size={20} strokeWidth={2} />,
        label: "Neu",
        primary: true,
      },
    ],
    []
  );
  usePageFooter(footerActions);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <h1 className="display text-h2">Meine Pfeile</h1>

      {loading && <p className="text-secondary">Lade…</p>}

      {!loading && arrows.length === 0 && (
        <div className="card text-center py-10 space-y-3">
          <Zap size={40} strokeWidth={1.5} className="mx-auto text-muted" />
          <p className="text-secondary">Noch keine Pfeil-Sets angelegt.</p>
          <p className="text-sm text-muted max-w-sm mx-auto">
            Erfasse deine Pfeile mit Spine, Befiederung und Spitzen-Gewicht — und verknüpfe sie mit den passenden Bögen.
          </p>
          <Link to="/arrows/new" className="btn-accent inline-flex items-center gap-2">
            <Plus size={18} strokeWidth={2} /> Erstes Pfeil-Set anlegen
          </Link>
        </div>
      )}

      <ul className="space-y-2">
        {arrows.map((a) => (
          <li key={a.id}>
            <Link
              to={`/arrows/${a.id}/edit`}
              className="card-interactive flex items-center gap-3"
            >
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <Zap size={22} strokeWidth={1.5} className="text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{a.name}</span>
                  {a.is_default && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-cherry-600 dark:text-cherry-400 bg-cherry-50 dark:bg-cherry-900/30 rounded-full px-1.5 py-0.5">
                      <Star size={10} strokeWidth={2} /> Standard
                    </span>
                  )}
                </div>
                <div className="text-sm text-secondary mt-0.5">
                  {[a.manufacturer, a.model].filter(Boolean).join(" · ")}
                  {a.spine && ` · Spine ${a.spine}`}
                  {a.length_inch != null && ` · ${a.length_inch}″`}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  {a.count_total != null && (
                    <span>
                      {Math.max(0, a.count_total - a.count_broken - a.count_lost)}/{a.count_total} verfügbar
                    </span>
                  )}
                  {(a.count_broken > 0 || a.count_lost > 0) && (
                    <span className="inline-flex items-center gap-1 text-cherry-600 dark:text-cherry-400">
                      <AlertTriangle size={11} /> {a.count_broken + a.count_lost} weg
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
