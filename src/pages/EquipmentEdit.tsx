import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, History, Plus, Star, Trash2, X } from "lucide-react";
import { PageSpinner, Spinner } from "../components/Spinner";
import {
  createEquipment,
  createEquipmentEvent,
  deleteEquipment,
  deleteEquipmentEvent,
  EQUIPMENT_EVENT_LABELS,
  EQUIPMENT_KIND_LABELS,
  getEquipment,
  listEquipmentEvents,
  updateEquipment,
  type EquipmentEvent,
  type EquipmentEventKind,
  type EquipmentItem,
  type EquipmentKind,
} from "../api/equipment";
import { usePageFooter } from "../components/FooterContext";
import { useConfirm } from "../components/ConfirmDialog";
import { fmtDate } from "../lib/format";

const KINDS: EquipmentKind[] = ["string", "tab", "release", "other"];
const EVENT_KINDS: EquipmentEventKind[] = ["broken", "lost", "service", "added", "retired"];

type Mode = "new" | "edit";

export default function EquipmentEdit({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const confirm = useConfirm();

  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [events, setEvents] = useState<EquipmentEvent[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [kind, setKind] = useState<EquipmentKind>("string");
  const [subKind, setSubKind] = useState("");
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [price, setPrice] = useState(""); // Euro mit Komma
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    Promise.all([getEquipment(Number(id)), listEquipmentEvents(Number(id))])
      .then(([r, ev]) => {
        const it = r.item;
        setItem(it);
        setKind(it.kind);
        setSubKind(it.sub_kind ?? "");
        setName(it.name);
        setManufacturer(it.manufacturer ?? "");
        setModel(it.model ?? "");
        setNotes(it.notes ?? "");
        setPurchaseUrl(it.purchase_url ?? "");
        setPurchasedAt(it.purchased_at ?? "");
        setPrice(it.price_cents != null ? (it.price_cents / 100).toFixed(2).replace(".", ",") : "");
        setIsDefault(it.is_default);
        setEvents(ev.events);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Item nicht laden"))
      .finally(() => setLoading(false));
  }, [id, mode]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name erforderlich"); return; }
    setError(null);
    setBusy(true);
    try {
      const priceCents = price ? Math.round(parseFloat(price.replace(",", ".")) * 100) : null;
      const body = {
        kind,
        sub_kind: subKind.trim() || null,
        name: name.trim(),
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        notes: notes.trim() || null,
        purchase_url: purchaseUrl.trim() || null,
        purchased_at: purchasedAt || null,
        price_cents: priceCents,
        is_default: isDefault,
      };
      if (mode === "new") {
        const r = await createEquipment(body);
        nav(`/equipment/${r.item.id}/edit`, { replace: true });
      } else if (id) {
        const r = await updateEquipment(Number(id), body);
        setItem(r.item);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!item) return;
    const ok = await confirm({
      title: `${item.name} löschen?`,
      message: "Alle Events dieses Items werden ebenfalls entfernt.",
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteEquipment(item.id);
      nav("/equipment");
    } finally {
      setBusy(false);
    }
  }

  async function onAddEvent(eventKind: EquipmentEventKind) {
    if (!id) return;
    setBusy(true);
    try {
      const r = await createEquipmentEvent(Number(id), { kind: eventKind });
      setEvents(r.events);
      // Re-fetch item to reflect retired_at update
      const fresh = await getEquipment(Number(id));
      setItem(fresh.item);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteEvent(eventId: number) {
    if (!id) return;
    setBusy(true);
    try {
      const r = await deleteEquipmentEvent(Number(id), eventId);
      setEvents(r.events);
      const fresh = await getEquipment(Number(id));
      setItem(fresh.item);
    } finally {
      setBusy(false);
    }
  }

  usePageFooter([
    { kind: "button", icon: <ArrowLeft size={20} strokeWidth={1.75} />, label: "Zurück", onClick: () => nav("/equipment") },
    {
      kind: "button",
      icon: <Check size={20} strokeWidth={2} />,
      label: "Speichern",
      primary: true,
      onClick: () => {
        const form = document.getElementById("equipment-form") as HTMLFormElement | null;
        form?.requestSubmit();
      },
    },
  ]);

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav("/equipment")} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted uppercase tracking-wider">
            {mode === "new" ? "Neues Zubehör" : "Zubehör bearbeiten"}
          </div>
          <h1 className="display text-h2 truncate">{name || EQUIPMENT_KIND_LABELS[kind]}</h1>
        </div>
      </div>

      {error && <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>}

      <form id="equipment-form" onSubmit={onSave} className="space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="label">Kategorie</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`py-2 rounded-lg text-xs font-medium tap-target transition ${
                    kind === k ? "bg-cherry-500 text-cream" : "bg-surface text-secondary border border-hairline"
                  }`}
                >
                  {EQUIPMENT_KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          {kind === "other" && (
            <div>
              <label className="label">Sub-Kategorie</label>
              <input
                className="input"
                value={subKind}
                onChange={(e) => setSubKind(e.target.value)}
                placeholder="z.B. Köcher, Nockpunkt, D-Loop"
              />
            </div>
          )}

          <div>
            <label className="label">Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hersteller</label>
              <input className="input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </div>
            <div>
              <label className="label">Modell</label>
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-display text-lg font-semibold">Kauf-Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kaufdatum</label>
              <input type="date" className="input" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </div>
            <div>
              <label className="label">Preis (€)</label>
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="label">Shop-Link</label>
            <input
              type="url"
              className="input"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-cherry-500"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <Star size={14} className="text-cherry-500" />
            Standard für {EQUIPMENT_KIND_LABELS[kind]}
          </label>
        </div>
      </form>

      {mode === "edit" && item && (
        <div className="card space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <History size={16} strokeWidth={1.75} /> Verlauf
          </h2>
          {!item.is_active && (
            <div className="text-xs text-muted">
              Außer Dienst seit {item.retired_at}.
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {EVENT_KINDS.map((ek) => (
              <button
                key={ek}
                type="button"
                onClick={() => onAddEvent(ek)}
                disabled={busy}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-surface text-secondary border border-hairline hover:border-cherry-500/40 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Plus size={12} strokeWidth={2} />
                {EQUIPMENT_EVENT_LABELS[ek]}
              </button>
            ))}
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-muted text-center py-2">Noch keine Events</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-xs font-medium text-secondary w-24 shrink-0">{fmtDate(e.occurred_at)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{EQUIPMENT_EVENT_LABELS[e.kind]}</span>
                    {e.notes && <span className="text-xs text-muted ml-2">· {e.notes}</span>}
                  </span>
                  <button
                    onClick={() => onDeleteEvent(e.id)}
                    disabled={busy}
                    className="btn-icon text-muted hover:text-cherry-500"
                    aria-label="Event löschen"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "edit" && item && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="btn-danger w-full justify-center"
        >
          <Trash2 size={16} strokeWidth={1.75} /> Item löschen
        </button>
      )}

      {busy && (
        <div className="fixed bottom-24 right-4 z-50">
          <Spinner />
        </div>
      )}
    </div>
  );
}
