import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArchiveRestore, Trash2, Archive } from "lucide-react";
import {
  BOW_LABELS,
  DISCIPLINE_LABELS,
  deleteTraining,
  listTrainings,
  setTrainingArchived,
  type TrainingListItem,
} from "../api/trainings";
import SwipeableCard from "../components/SwipeableCard";
import { useConfirm } from "../components/ConfirmDialog";
import { usePageFooter } from "../components/FooterContext";
import { Spinner } from "../components/Spinner";
import { fmtDate } from "../lib/format";

export default function TrainingArchive() {
  const [items, setItems] = useState<TrainingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    listTrainings(1, 100, true)
      .then((r) => setItems(r.trainings))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: "/", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
    ],
    []
  );
  usePageFooter(footerActions);

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <header>
        <h1 className="display text-h1 flex items-center gap-2">
          <Archive size={24} strokeWidth={1.75} /> Archiv
        </h1>
        <p className="text-secondary text-sm mt-1">
          Archivierte Trainings. Swipe nach rechts zum Wiederherstellen, links zum endgültigen Löschen.
        </p>
      </header>

      {loading && <Spinner className="py-2" />}
      {!loading && items.length === 0 && (
        <div className="card text-center py-10 text-secondary text-sm">
          Keine archivierten Trainings. Wische auf der Übersicht eine Karte nach rechts um sie hier abzulegen.
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <SwipeableCard
                leftAction={{
                  label: "Löschen",
                  color: "#9b3340",
                  icon: <Trash2 size={18} strokeWidth={2} />,
                  onAction: async () => {
                    const ok = await confirm({
                      title: "Training löschen?",
                      message: "Endgültig entfernen — kann nicht wiederhergestellt werden.",
                      confirmLabel: "Löschen",
                      variant: "danger",
                    });
                    if (!ok) return;
                    await deleteTraining(it.id);
                    load();
                  },
                }}
                rightAction={{
                  label: "Wiederherstellen",
                  color: "#3F6D5E",
                  icon: <ArchiveRestore size={18} strokeWidth={2} />,
                  onAction: async () => {
                    await setTrainingArchived(it.id, false);
                    load();
                  },
                }}
              >
                <Link to={`/trainings/${it.id}`} className="card-interactive flex items-center justify-between gap-3 opacity-80">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted mb-0.5">{fmtDate(it.started_at)}</div>
                    <div className="font-medium truncate">
                      {DISCIPLINE_LABELS[it.discipline]} · {BOW_LABELS[it.bow_type]}
                    </div>
                    {it.location && <div className="text-xs text-muted truncate">📍 {it.location}</div>}
                  </div>
                  <div className="score text-base shrink-0">{it.total_score}</div>
                </Link>
              </SwipeableCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
