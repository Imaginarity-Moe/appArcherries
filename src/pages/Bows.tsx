import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Crosshair, Search, X } from "lucide-react";
import { listBows, type Bow } from "../api/bows";
import { BOW_LABELS } from "../api/trainings";
import { usePageFooter } from "../components/FooterContext";
import EquipmentTabs from "../components/EquipmentTabs";
import { Spinner } from "../components/Spinner";

type SortKey = "default" | "name" | "updated";

export default function Bows() {
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");

  useEffect(() => {
    listBows((fresh) => setBows(fresh.bows))
      .then((r) => setBows(r.bows))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredList = q
      ? bows.filter((b) =>
          [b.name, BOW_LABELS[b.bow_type], b.notes ?? ""].some((s) => s.toLowerCase().includes(q))
        )
      : bows;
    const sorted = [...filteredList];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "updated") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else sorted.sort((a, b) => (a.is_default === b.is_default ? a.name.localeCompare(b.name) : a.is_default ? -1 : 1));
    return sorted;
  }, [bows, query, sort]);

  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: "/profile", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link" as const, to: "/bows/new", icon: <Plus size={20} strokeWidth={2} />, label: "Neu", primary: true },
    ],
    []
  );
  usePageFooter(footerActions);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <h1 className="display text-h2">Equipment</h1>
      <EquipmentTabs />

      {/* Suche + Sortierung */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bogen suchen…"
            className="input pl-9 pr-8 py-1.5 text-sm w-full"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary" aria-label="Leeren">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="input py-1.5 text-sm w-auto pr-8"
          aria-label="Sortieren"
        >
          <option value="default">Standard zuerst</option>
          <option value="name">Name A–Z</option>
          <option value="updated">Zuletzt geändert</option>
        </select>
      </div>

      {loading && <Spinner className="py-2" />}

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

      {!loading && bows.length > 0 && filtered.length === 0 && (
        <div className="card text-center py-6 text-sm text-secondary">Keine Treffer für „{query}"</div>
      )}

      <ul className="space-y-2">
        {filtered.map((b) => (
          <li key={b.id}>
            <Link to={`/bows/${b.id}/edit`} className="card-interactive flex items-center gap-3">
              {b.image_url ? (
                <img src={b.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
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
                  {b.length_inch != null && ` · ${b.length_inch}″`}
                  {b.arrow_spine && ` · Spine ${b.arrow_spine}`}
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
