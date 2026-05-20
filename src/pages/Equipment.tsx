import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Star, Wrench, AlertTriangle, ExternalLink } from "lucide-react";
import {
  listEquipment,
  EQUIPMENT_KIND_LABELS,
  type EquipmentItem,
  type EquipmentKind,
} from "../api/equipment";
import { usePageFooter } from "../components/FooterContext";
import EquipmentTabs from "../components/EquipmentTabs";
import { Spinner } from "../components/Spinner";

const KINDS: EquipmentKind[] = ["string", "tab", "release", "other"];

export default function Equipment() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEquipment(undefined, (fresh) => setItems(fresh.items))
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, []);

  const byKind = useMemo(() => {
    const map = new Map<EquipmentKind, EquipmentItem[]>();
    for (const k of KINDS) map.set(k, []);
    for (const it of items) map.get(it.kind)!.push(it);
    return map;
  }, [items]);

  const footerActions = useMemo(
    () => [
      { kind: "link" as const, to: "/profile", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück" },
      { kind: "link" as const, to: "/equipment/new", icon: <Plus size={20} strokeWidth={2} />, label: "Neu", primary: true },
    ],
    []
  );
  usePageFooter(footerActions);

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <h1 className="display text-h2">Equipment</h1>
      <EquipmentTabs />

      {loading && <Spinner className="py-6" />}

      {!loading && items.length === 0 && (
        <div className="card text-center py-10 space-y-3">
          <Wrench size={32} strokeWidth={1.5} className="mx-auto text-muted" />
          <p className="text-secondary">Noch kein Zubehör erfasst</p>
          <p className="text-xs text-muted">Sehnen, Tabs, Release-Aids und Sonstiges mit Verlauf tracken.</p>
          <Link to="/equipment/new" className="btn-accent inline-flex items-center gap-2">
            <Plus size={16} strokeWidth={2} /> Erstes Item anlegen
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-5">
          {KINDS.map((k) => {
            const list = byKind.get(k) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={k} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary/70 px-1">
                  {EQUIPMENT_KIND_LABELS[k]}
                </h2>
                <div className="space-y-2">
                  {list.map((it) => (
                    <EquipmentCard key={it.id} item={it} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EquipmentCard({ item }: { item: EquipmentItem }) {
  const retired = !item.is_active;
  return (
    <Link
      to={`/equipment/${item.id}/edit`}
      className={`card flex items-center gap-3 hover:border-cherry-500/40 transition ${retired ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.is_default && <Star size={12} className="text-cherry-500 fill-cherry-500 shrink-0" />}
          <span className="font-semibold truncate">{item.name}</span>
          {item.sub_kind && <span className="text-xs text-muted shrink-0">· {item.sub_kind}</span>}
        </div>
        {(item.manufacturer || item.model) && (
          <div className="text-xs text-secondary truncate">
            {[item.manufacturer, item.model].filter(Boolean).join(" · ")}
          </div>
        )}
        {retired && (
          <div className="text-xs text-muted mt-0.5 inline-flex items-center gap-1">
            <AlertTriangle size={11} strokeWidth={1.75} />
            Außer Dienst seit {item.retired_at}
          </div>
        )}
      </div>
      {item.purchase_url && (
        <a
          href={item.purchase_url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          className="btn-icon shrink-0"
          aria-label="Shop-Link"
        >
          <ExternalLink size={16} strokeWidth={1.75} />
        </a>
      )}
    </Link>
  );
}
