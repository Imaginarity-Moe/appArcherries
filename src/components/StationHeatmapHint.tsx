import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Discipline } from "../api/trainings";
import { getHeatmap, type HeatmapGroup } from "../api/stats";
import { Spinner } from "./Spinner";

const Heatmap = lazy(() => import("./Heatmap"));

type Props = {
  parcoursId: number | null;
  animalOrFace: string | null;
  distanceM: number | null;
  discipline: Discipline;
};

/**
 * Aufklappbare Mini-Heatmap mit historischen Pad-Daten für die aktuelle Station.
 * Stille Render-Lücke, wenn keine zuordenbaren Daten (kein parcours_id, kein Tier).
 */
export default function StationHeatmapHint({
  parcoursId,
  animalOrFace,
  distanceM,
  discipline,
}: Props) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<HeatmapGroup | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!parcoursId || !animalOrFace) { setGroup(null); return; }
    setLoading(true);
    getHeatmap("tier", { parcours_id: parcoursId })
      .then((r) => {
        // Match: gleicher Tier-Name + (Distanz egal, wenn nicht gesetzt)
        const match = r.groups.find((g) =>
          g.animal_or_face === animalOrFace &&
          (distanceM == null || g.distance_m == null || Math.abs((g.distance_m as number) - distanceM) < 0.01)
        );
        setGroup(match ?? null);
      })
      .catch(() => setGroup(null))
      .finally(() => setLoading(false));
  }, [open, parcoursId, animalOrFace, distanceM]);

  // Wenn kein Parcours-Kontext oder Tier — komplett ausblenden
  if (!parcoursId || !animalOrFace) return null;

  return (
    <details className="card-sunken text-xs" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer list-none flex items-center justify-between">
        <span className="text-secondary">Historisches Trefferbild</span>
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </summary>
      <div className="mt-2">
        {loading && <Spinner className="py-2" />}
        {!loading && !group && (
          <p className="text-muted text-center py-2">Noch keine historischen Daten für diese Station</p>
        )}
        {!loading && group && (
          <div className="max-w-[200px] mx-auto">
            <Suspense fallback={<Spinner className="py-1" />}>
              <Heatmap discipline={discipline} points={group.points} size={200} />
            </Suspense>
            <p className="text-muted text-center mt-1">{group.shot_count} Pfeile</p>
          </div>
        )}
      </div>
    </details>
  );
}
