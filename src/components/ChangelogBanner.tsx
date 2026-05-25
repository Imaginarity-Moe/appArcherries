import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { getChangelog, markChangelogSeen, type ChangelogItem } from "../api/changelog";

/**
 * "Was ist neu seit deinem letzten Besuch"-Banner für das Dashboard.
 *
 * Holt /me/changelog. Wenn unseen_count > 0: Banner sichtbar. User kann
 * einzelne Items aufklappen, schließt mit X oder „Verstanden" → markiert
 * als gesehen (POST /me/changelog/seen).
 */
export default function ChangelogBanner() {
  const [items, setItems] = useState<ChangelogItem[]>([]);
  const [open, setOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getChangelog()
      .then((r) => setItems(r.items))
      .catch(() => {/* still */})
      .finally(() => setLoaded(true));
  }, []);

  async function dismiss() {
    setOpen(false);
    try {
      await markChangelogSeen();
    } catch {/* still */}
  }

  if (!loaded || items.length === 0 || !open) return null;

  return (
    <section className="card border-cherry-500/30 bg-cherry-50/50 dark:bg-cherry-900/15 animate-fade-in">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cherry-100 dark:bg-cherry-900/40 text-cherry-600 dark:text-cherry-200 shrink-0">
          <Sparkles size={20} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h2 className="font-display text-lg font-semibold">
              Neu seit deinem letzten Besuch
            </h2>
            <span className="text-xs text-muted tabular-nums shrink-0">
              {items.length} {items.length === 1 ? "Update" : "Updates"}
            </span>
          </div>
          <p className="text-sm text-secondary">
            Wir haben einiges gebaut — hier eine Übersicht:
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="btn-icon text-secondary hover:text-cherry-500 shrink-0 -mt-1 -mr-1"
          aria-label="Banner schließen"
          title="Banner schließen und als gesehen markieren"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            {item.link ? (
              <Link
                to={item.link}
                className="card-sunken flex items-start gap-3 hover:border-cherry-500/30 transition group"
              >
                <ItemContent item={item} />
                <ArrowRight size={14} strokeWidth={2} className="text-muted group-hover:text-cherry-500 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
              </Link>
            ) : (
              <div className="card-sunken flex items-start gap-3">
                <ItemContent item={item} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="btn-secondary text-sm"
        >
          Verstanden — Banner schließen
        </button>
      </div>
    </section>
  );
}

function ItemContent({ item }: { item: ChangelogItem }) {
  const date = new Date(item.released_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="text-xl shrink-0">{item.icon}</span>
        <span className="font-semibold text-sm">{item.title}</span>
        <span className="text-xs text-muted shrink-0 ml-auto">{date}</span>
      </div>
      <p className="text-xs text-secondary mt-0.5 pl-7">{item.desc}</p>
    </div>
  );
}
