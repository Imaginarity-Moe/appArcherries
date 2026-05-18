import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Crosshair } from "lucide-react";
import { listBows, type Bow } from "../api/bows";
import { BOW_LABELS } from "../api/trainings";
import { usePageFooter } from "../components/FooterContext";

export default function Bows() {
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listBows()
      .then((r) => setBows(r.bows))
      .finally(() => setLoading(false));
  }, []);

  // Custom-Footer: Zurück + Neu (auf Mobile als Pill, auf Desktop als sticky Action-Bar)
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
        to: "/bows/new",
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
      <h1 className="display text-h2">Meine Bögen</h1>

      {loading && <p className="text-secondary">Lade…</p>}

      {!loading && bows.length === 0 && (
        <div className="card text-center py-10 space-y-3">
          <Crosshair size={40} strokeWidth={1.5} className="mx-auto text-muted" />
          <p className="text-secondary">Noch keine Bögen angelegt.</p>
          <p className="text-sm text-muted max-w-sm mx-auto">
            Speichere deine Bögen mit Setup-Daten — wähle sie beim Anlegen eines Trainings einfach aus.
          </p>
          <Link to="/bows/new" className="btn-accent inline-flex items-center gap-2">
            <Plus size={18} strokeWidth={2} /> Ersten Bogen anlegen
          </Link>
        </div>
      )}

      <ul className="space-y-2">
        {bows.map((b) => (
          <li key={b.id}>
            <Link
              to={`/bows/${b.id}/edit`}
              className="card-interactive flex items-center gap-3"
            >
              {b.image_url ? (
                <img
                  src={b.image_url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <Crosshair size={22} strokeWidth={1.5} className="text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{b.name}</span>
                  {b.is_default && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-cherry-600 dark:text-cherry-400 bg-cherry-50 dark:bg-cherry-900/30 rounded-full px-1.5 py-0.5">
                      <Star size={10} strokeWidth={2} /> Standard
                    </span>
                  )}
                </div>
                <div className="text-sm text-secondary mt-0.5">
                  {BOW_LABELS[b.bow_type]}
                  {b.draw_weight_lbs !== null && ` · ${b.draw_weight_lbs} lbs`}
                  {b.arrow_spine && ` · Pfeil ${b.arrow_spine}`}
                </div>
                {b.notes && (
                  <div className="text-xs text-muted mt-1 line-clamp-1">{b.notes}</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
