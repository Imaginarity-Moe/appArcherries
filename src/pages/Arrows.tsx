import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Zap, AlertTriangle, Search, X, ExternalLink } from "lucide-react";
import { listArrows, type Arrow } from "../api/arrows";
import { usePageFooter } from "../components/FooterContext";
import EquipmentTabs from "../components/EquipmentTabs";

type SortKey = "default" | "name" | "manufacturer" | "updated" | "stock";

function stockAvail(a: Arrow): number {
  if (a.count_total == null) return 0;
  return Math.max(0, a.count_total - a.count_broken - a.count_lost);
}

export default function Arrows() {
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");
  const [onlyDamaged, setOnlyDamaged] = useState(false);

  useEffect(() => {
    listArrows()
      .then((r) => setArrows(r.arrows))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = arrows;
    if (q) {
      list = list.filter((a) =>
        [a.name, a.manufacturer ?? "", a.model ?? "", a.spine ?? "", a.notes ?? ""]
          .some((s) => s.toLowerCase().includes(q))
      );
    }
    if (onlyDamaged) {
      list = list.filter((a) => a.count_broken > 0 || a.count_lost > 0);
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "manufacturer") sorted.sort((a, b) => (a.manufacturer ?? "").localeCompare(b.manufacturer ?? ""));
    else if (sort === "updated") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sort === "stock") sorted.sort((a, b) => stockAvail(a) - stockAvail(b));
    else sorted.sort((a, b) => (a.is_default === b.is_default ? a.name.localeCompare(b.name) : a.is_default ? -1 : 1));
    return sorted;
  }, [arrows, query, sort, onlyDamaged]);

  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: "/profile", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link" as const, to: "/arrows/new", icon: <Plus size={20} strokeWidth={2} />, label: "Neu", primary: true },
    ],
    []
  );
  usePageFooter(footerActions);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <h1 className="display text-h2">Equipment</h1>
      <EquipmentTabs />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hersteller, Modell, Spine…"
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
          <option value="manufacturer">Hersteller A–Z</option>
          <option value="updated">Zuletzt geändert</option>
          <option value="stock">Wenig Bestand zuerst</option>
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={onlyDamaged}
            onChange={(e) => setOnlyDamaged(e.target.checked)}
            className="w-4 h-4 accent-cherry-500"
          />
          <AlertTriangle size={12} /> nur defekte
        </label>
      </div>

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

      {!loading && arrows.length > 0 && filtered.length === 0 && (
        <div className="card text-center py-6 text-sm text-secondary">
          Keine Treffer{query ? ` für „${query}"` : onlyDamaged ? " — keine defekten Pfeil-Sets" : ""}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li key={a.id} className="relative">
            <Link to={`/arrows/${a.id}/edit`} className="card-interactive flex items-center gap-3">
              {a.image_url ? (
                <img src={a.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shrink-0">
                  <Zap size={22} strokeWidth={1.5} className="text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1 pr-7">
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
                    <span>{stockAvail(a)}/{a.count_total} verfügbar</span>
                  )}
                  {(a.count_broken > 0 || a.count_lost > 0) && (
                    <span className="inline-flex items-center gap-1 text-cherry-600 dark:text-cherry-400">
                      <AlertTriangle size={11} /> {a.count_broken + a.count_lost} weg
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {a.purchase_url && (
              <a
                href={a.purchase_url}
                target="_blank"
                rel="noreferrer"
                className="absolute top-2 right-2 btn-icon"
                aria-label="Im Shop nachbestellen"
                title="Shop-Link öffnen"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={14} strokeWidth={1.75} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
