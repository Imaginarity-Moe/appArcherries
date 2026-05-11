import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  listTrainings,
  type TrainingListItem,
} from "../api/trainings";

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<TrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrainings()
      .then((r) => setItems(r.trainings))
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Hallo {user?.display_name ?? user?.email}
        </h1>
        <Link to="/trainings/new" className="btn">
          + Neues Training
        </Link>
      </div>

      {loading && <p className="text-archer-700">Lade…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="card text-center">
          <p className="text-archer-700 mb-4">
            Noch kein Training erfasst. Leg los — die App ist auch parcours-tauglich
            auf dem Handy.
          </p>
          <Link to="/trainings/new" className="btn">
            Erstes Training anlegen
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id}>
              <Link
                to={`/trainings/${t.id}`}
                className="card flex items-center justify-between hover:bg-archer-50 transition"
              >
                <div>
                  <div className="font-semibold">
                    {DISCIPLINE_LABELS[t.discipline]} · {BOW_LABELS[t.bow_type]}
                  </div>
                  <div className="text-sm text-archer-700">
                    {formatDate(t.started_at)}
                    {t.location && ` · ${t.location}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-archer-700">
                    {t.total_score}
                  </div>
                  <div className="text-xs text-archer-700">Punkte</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
