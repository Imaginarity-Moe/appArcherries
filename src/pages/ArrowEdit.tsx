import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X, Check, Loader2, Star, Camera, Trash2, ExternalLink, History, Plus, CloudOff } from "lucide-react";
import { PageSpinner } from "../components/Spinner";
import {
  createArrow,
  createArrowEvent,
  deleteArrow,
  deleteArrowEvent,
  deleteArrowImage,
  EVENT_LABELS,
  getArrow,
  listArrowEvents,
  updateArrow,
  uploadArrowImage,
  type Arrow,
  type ArrowEvent,
  type ArrowEventKind,
  type ArrowMaterial,
  type FletchingType,
  type NockType,
  type TipType,
  MATERIAL_LABELS,
  FLETCHING_LABELS,
  NOCK_LABELS,
  TIP_LABELS,
} from "../api/arrows";
import { listBows, type Bow } from "../api/bows";
import { BOW_LABELS } from "../api/trainings";
import { usePageFooter } from "../components/FooterContext";
import { useConfirm } from "../components/ConfirmDialog";

const MATERIALS:  ArrowMaterial[] = ["carbon", "aluminium", "carbon_aluminium", "wood", "fiberglass"];
const FLETCHINGS: FletchingType[] = ["natural", "vane", "spin_vane"];
const NOCKS:      NockType[]      = ["press_fit", "pin", "other"];
const TIPS:       TipType[]       = ["field", "target", "bullet", "broadhead"];

const FORM_ID = "arrow-form";

type Mode = "new" | "edit";

export default function ArrowEdit({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const confirm = useConfirm();

  const [arrow, setArrow] = useState<Arrow | null>(null);
  const [proMode, setProMode] = useState(false);
  const [allBows, setAllBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State (alle Felder)
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [material, setMaterial] = useState<ArrowMaterial | "">("");
  const [diameter, setDiameter] = useState("");
  const [spine, setSpine] = useState("");
  const [lengthInch, setLengthInch] = useState("");
  const [gpi, setGpi] = useState("");
  const [fletchingType, setFletchingType] = useState<FletchingType | "">("");
  const [fletchingLength, setFletchingLength] = useState("");
  const [fletchingCount, setFletchingCount] = useState("");
  const [fletchingHelix, setFletchingHelix] = useState<boolean | null>(null);
  const [fletchingColors, setFletchingColors] = useState("");
  const [nockType, setNockType] = useState<NockType | "">("");
  const [nockMfr, setNockMfr] = useState("");
  const [nockColor, setNockColor] = useState("");
  const [tipType, setTipType] = useState<TipType | "">("");
  const [tipWeight, setTipWeight] = useState("");
  const [tipMfr, setTipMfr] = useState("");
  const [tipReplaceable, setTipReplaceable] = useState<boolean | null>(null);
  const [countTotal, setCountTotal] = useState("");
  const [countBroken, setCountBroken] = useState("");
  const [countLost, setCountLost] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [pricePerArrow, setPricePerArrow] = useState(""); // Euro mit Komma
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [purchaseUrlShaft, setPurchaseUrlShaft] = useState("");
  const [purchaseUrlFletching, setPurchaseUrlFletching] = useState("");
  const [purchaseUrlNocks, setPurchaseUrlNocks] = useState("");
  const [purchaseUrlTips, setPurchaseUrlTips] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bowIds, setBowIds] = useState<Set<number>>(new Set());
  const [events, setEvents] = useState<ArrowEvent[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto);
    };
  }, [pendingPhoto]);

  useEffect(() => {
    listBows().then((r) => setAllBows(r.bows)).catch(() => {});
    if (mode !== "edit" || !id) return;
    getArrow(Number(id))
      .then((r) => {
        const a = r.arrow;
        setArrow(a);
        setName(a.name);
        setManufacturer(a.manufacturer ?? "");
        setModel(a.model ?? "");
        setMaterial(a.material ?? "");
        setDiameter(a.diameter_mm?.toString() ?? "");
        setSpine(a.spine ?? "");
        setLengthInch(a.length_inch?.toString() ?? "");
        setGpi(a.gpi?.toString() ?? "");
        setFletchingType(a.fletching_type ?? "");
        setFletchingLength(a.fletching_length_inch?.toString() ?? "");
        setFletchingCount(a.fletching_count?.toString() ?? "");
        setFletchingHelix(a.fletching_helix);
        setFletchingColors(a.fletching_colors ?? "");
        setNockType(a.nock_type ?? "");
        setNockMfr(a.nock_manufacturer ?? "");
        setNockColor(a.nock_color ?? "");
        setTipType(a.tip_type ?? "");
        setTipWeight(a.tip_weight_grains?.toString() ?? "");
        setTipMfr(a.tip_manufacturer ?? "");
        setTipReplaceable(a.tip_replaceable);
        setCountTotal(a.count_total?.toString() ?? "");
        setCountBroken(a.count_broken.toString());
        setCountLost(a.count_lost.toString());
        setPurchasedAt(a.purchased_at ?? "");
        setPricePerArrow(a.price_per_arrow_cents != null ? (a.price_per_arrow_cents / 100).toFixed(2).replace(".", ",") : "");
        setPurchaseUrl(a.purchase_url ?? "");
        setPurchaseUrlShaft(a.purchase_url_shaft ?? "");
        setPurchaseUrlFletching(a.purchase_url_fletching ?? "");
        setPurchaseUrlNocks(a.purchase_url_nocks ?? "");
        setPurchaseUrlTips(a.purchase_url_tips ?? "");
        setNotes(a.notes ?? "");
        setIsDefault(a.is_default);
        setProMode(a.pro_mode);
        setBowIds(new Set((a.linked_bows ?? []).map((b) => b.id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Pfeil-Set nicht laden"))
      .finally(() => setLoading(false));

    // Events nachladen (nur Edit-Modus)
    if (id) {
      listArrowEvents(Number(id))
        .then((r) => setEvents(r.events))
        .catch(() => {});
    }
  }, [mode, id]);

  async function addEvent(kind: ArrowEventKind, count: number, when: string, notes: string) {
    if (!arrow) return;
    setBusy(true);
    try {
      const r = await createArrowEvent(arrow.id, { kind, count, occurred_at: when || undefined, notes: notes || null });
      setEvents(r.events);
      // Aggregate aktualisieren (Server hat die Counter geupdated)
      const fresh = await getArrow(arrow.id);
      setArrow(fresh.arrow);
      setCountBroken(fresh.arrow.count_broken.toString());
      setCountLost(fresh.arrow.count_lost.toString());
      setCountTotal(fresh.arrow.count_total?.toString() ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(eventId: number) {
    if (!arrow) return;
    setBusy(true);
    try {
      const r = await deleteArrowEvent(arrow.id, eventId);
      setEvents(r.events);
      const fresh = await getArrow(arrow.id);
      setArrow(fresh.arrow);
      setCountBroken(fresh.arrow.count_broken.toString());
      setCountLost(fresh.arrow.count_lost.toString());
      setCountTotal(fresh.arrow.count_total?.toString() ?? "");
    } finally {
      setBusy(false);
    }
  }

  const footerActions = useMemo(() => {
    const actions: Array<
      | { kind: "button"; onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean; danger?: boolean; disabled?: boolean }
    > = [
      { kind: "button", icon: <X size={20} strokeWidth={1.75} />, label: "Abbrechen", onClick: () => nav("/arrows") },
    ];
    if (mode === "edit" && arrow) {
      actions.push({
        kind: "button",
        icon: <Trash2 size={20} strokeWidth={1.75} />,
        label: "Löschen",
        danger: true,
        onClick: handleDelete,
        disabled: busy,
      });
    }
    actions.push({
      kind: "button",
      icon: <Check size={20} strokeWidth={2} />,
      label: busy ? "Speichere…" : "Speichern",
      primary: true,
      disabled: busy || !name.trim(),
      onClick: () => (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit(),
    });
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, arrow, busy, name, nav]);
  usePageFooter(footerActions);

  function toggleBow(id: number) {
    setBowIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function priceCents(): number | null {
    if (!pricePerArrow.trim()) return null;
    const num = parseFloat(pricePerArrow.replace(",", "."));
    if (isNaN(num)) return null;
    return Math.round(num * 100);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name erforderlich"); return; }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        manufacturer: manufacturer || null,
        model: model || null,
        material: material || null,
        diameter_mm: diameter ? Number(diameter.replace(",", ".")) : null,
        spine: spine || null,
        length_inch: lengthInch ? Number(lengthInch.replace(",", ".")) : null,
        gpi: gpi ? Number(gpi.replace(",", ".")) : null,
        fletching_type: fletchingType || null,
        fletching_length_inch: fletchingLength ? Number(fletchingLength.replace(",", ".")) : null,
        fletching_count: fletchingCount ? Number(fletchingCount) : null,
        fletching_helix: fletchingHelix,
        fletching_colors: fletchingColors || null,
        nock_type: nockType || null,
        nock_manufacturer: nockMfr || null,
        nock_color: nockColor || null,
        tip_type: tipType || null,
        tip_weight_grains: tipWeight ? Number(tipWeight) : null,
        tip_manufacturer: tipMfr || null,
        tip_replaceable: tipReplaceable,
        count_total: countTotal ? Number(countTotal) : null,
        count_broken: countBroken ? Number(countBroken) : 0,
        count_lost: countLost ? Number(countLost) : 0,
        purchased_at: purchasedAt || null,
        price_per_arrow_cents: priceCents(),
        purchase_url: purchaseUrl || null,
        purchase_url_shaft: purchaseUrlShaft || null,
        purchase_url_fletching: purchaseUrlFletching || null,
        purchase_url_nocks: purchaseUrlNocks || null,
        purchase_url_tips: purchaseUrlTips || null,
        notes: notes || null,
        is_default: isDefault,
        pro_mode: proMode,
        bow_ids: [...bowIds],
      };
      if (mode === "edit" && arrow) {
        const r = await updateArrow(arrow.id, body);
        setArrow(r.arrow);
        nav("/arrows");
      } else {
        const r = await createArrow(body);
        nav(`/arrows/${r.arrow.id}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!arrow) return;
    const ok = await confirm({
      title: "Pfeil-Set löschen?",
      message: `„${arrow.name}" wird endgültig entfernt.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteArrow(arrow.id);
      nav("/arrows");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!arrow) return;
    setBusy(true);
    try {
      const r = await uploadArrowImage(arrow.id, file);
      if (r.pending) {
        if (pendingPhoto) URL.revokeObjectURL(pendingPhoto);
        setPendingPhoto(r.pendingUrl);
      } else {
        if (pendingPhoto) {
          URL.revokeObjectURL(pendingPhoto);
          setPendingPhoto(null);
        }
        setArrow(r.data.arrow);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto-Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageDelete() {
    if (!arrow) return;
    const ok = await confirm({
      title: "Foto entfernen?",
      message: "Das Pfeil-Foto wird vom Server gelöscht.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await deleteArrowImage(arrow.id);
      setArrow(r.arrow);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (mode === "edit" && !arrow) return <p className="text-cherry-500 p-8">{error ?? "Pfeil-Set nicht gefunden"}</p>;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav("/arrows")} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h2 flex-1 truncate">
          {mode === "edit" ? `Bearbeiten: ${arrow!.name}` : "Neues Pfeil-Set"}
        </h1>
      </div>

      {error && <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>}

      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {/* Foto */}
        {mode === "edit" && arrow && (
          <section className="card">
            <ArrowPhotoBlock arrow={arrow} busy={busy} pendingPhoto={pendingPhoto} onUpload={handleImageUpload} onDelete={handleImageDelete} />
          </section>
        )}
        {mode === "new" && (
          <div className="text-xs text-muted italic">Foto-Upload erscheint nach dem ersten Speichern.</div>
        )}

        {/* Identität */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Identität</h2>
          <Field label="Name" required>
            <input className="input" placeholder="z.B. Indoor-Pfeile 2026" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus={mode === "new"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hersteller">
              <input className="input" placeholder="Easton, Gold Tip, …" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
            </Field>
            <Field label="Modell">
              <input className="input" placeholder="X10, Pierce, Spider 4MM, …" value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field label="Spine">
              <input className="input" placeholder="z.B. 700" value={spine} onChange={(e) => setSpine(e.target.value)} />
            </Field>
            <Field label="Länge (inch)">
              <input type="number" step="0.1" inputMode="decimal" className="input" placeholder="z.B. 28.5" value={lengthInch} onChange={(e) => setLengthInch(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Pro-Modus-Toggle: schaltet Komponenten-Details (Schaft-Material,
            Befiederung, Nocken, Spitzen, Komponenten-Shop-Links) sichtbar. */}
        <section className="card flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold text-sm flex items-center gap-1.5">
              <Star size={14} strokeWidth={1.75} className="text-cherry-500" /> Profi-Modus für dieses Set
            </div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              Aktiviere, wenn du den Pfeil selbst zusammenstellst und Schaft, Befiederung,
              Nocken und Spitzen einzeln pflegen willst (inkl. Komponenten-Shop-Links).
              Für gekaufte „von-der-Stange"-Pfeile reichen die Basis-Felder oben.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setProMode((v) => !v)}
            role="switch"
            aria-checked={proMode}
            className={`shrink-0 mt-0.5 relative inline-flex h-6 w-11 items-center rounded-full transition ${
              proMode ? "bg-cherry-500" : "bg-surface border border-hairline"
            }`}
            aria-label="Profi-Modus umschalten"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-cream transition ${
                proMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </section>

        {proMode && (
        <>
        {/* Schaft (Pro) */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Schaft</h2>
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Material</label>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <ChipBtn key={m} active={material === m} onClick={() => setMaterial(material === m ? "" : m)}>
                  {MATERIAL_LABELS[m]}
                </ChipBtn>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Durchmesser (mm)">
              <input type="number" step="0.01" inputMode="decimal" className="input" placeholder="z.B. 5.69" value={diameter} onChange={(e) => setDiameter(e.target.value)} />
            </Field>
            <Field label="GPI (grains/inch)">
              <input type="number" step="0.1" inputMode="decimal" className="input" placeholder="z.B. 8.7" value={gpi} onChange={(e) => setGpi(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Befiederung */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Befiederung</h2>
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Typ</label>
            <div className="flex flex-wrap gap-2">
              {FLETCHINGS.map((f) => (
                <ChipBtn key={f} active={fletchingType === f} onClick={() => setFletchingType(fletchingType === f ? "" : f)}>
                  {FLETCHING_LABELS[f]}
                </ChipBtn>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Länge (inch)">
              <input type="number" step="0.1" inputMode="decimal" className="input" placeholder="z.B. 4" value={fletchingLength} onChange={(e) => setFletchingLength(e.target.value)} />
            </Field>
            <Field label="Anzahl">
              <input type="number" inputMode="numeric" className="input" placeholder="3 oder 4" value={fletchingCount} onChange={(e) => setFletchingCount(e.target.value)} />
            </Field>
          </div>
          <Field label="Farben">
            <input className="input" placeholder="z.B. 2× Weiß + 1× Rot (Cock)" value={fletchingColors} onChange={(e) => setFletchingColors(e.target.value)} />
          </Field>
          <TriCheck label="Helix" value={fletchingHelix} onChange={setFletchingHelix} />
        </section>

        {/* Nocken */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Nocken</h2>
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Typ</label>
            <div className="flex flex-wrap gap-2">
              {NOCKS.map((n) => (
                <ChipBtn key={n} active={nockType === n} onClick={() => setNockType(nockType === n ? "" : n)}>
                  {NOCK_LABELS[n]}
                </ChipBtn>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hersteller">
              <input className="input" placeholder="z.B. Beiter, G-Nock" value={nockMfr} onChange={(e) => setNockMfr(e.target.value)} />
            </Field>
            <Field label="Farbe">
              <input className="input" placeholder="z.B. Rot" value={nockColor} onChange={(e) => setNockColor(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Spitzen */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Spitzen</h2>
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Typ</label>
            <div className="flex flex-wrap gap-2">
              {TIPS.map((t) => (
                <ChipBtn key={t} active={tipType === t} onClick={() => setTipType(tipType === t ? "" : t)}>
                  {TIP_LABELS[t]}
                </ChipBtn>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gewicht (grains)">
              <input type="number" inputMode="numeric" className="input" placeholder="z.B. 100" value={tipWeight} onChange={(e) => setTipWeight(e.target.value)} />
            </Field>
            <Field label="Hersteller">
              <input className="input" placeholder="z.B. Saunders" value={tipMfr} onChange={(e) => setTipMfr(e.target.value)} />
            </Field>
          </div>
          <TriCheck label="Spitzen austauschbar" value={tipReplaceable} onChange={setTipReplaceable} />
        </section>
        </>
        )}

        {/* Bestand */}
        <section className="card space-y-3">
          <h2 className="eyebrow">Bestand</h2>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Gesamt">
              <input type="number" inputMode="numeric" className="input" placeholder="12" value={countTotal} onChange={(e) => setCountTotal(e.target.value)} />
            </Field>
            <Field label="Defekt">
              <input type="number" inputMode="numeric" className="input" placeholder="0" value={countBroken} onChange={(e) => setCountBroken(e.target.value)} />
            </Field>
            <Field label="Verloren">
              <input type="number" inputMode="numeric" className="input" placeholder="0" value={countLost} onChange={(e) => setCountLost(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Angeschafft am">
              <input type="date" className="input" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </Field>
            <Field label="Preis pro Pfeil (€)">
              <input inputMode="decimal" className="input" placeholder="z.B. 24,90" value={pricePerArrow} onChange={(e) => setPricePerArrow(e.target.value)} />
            </Field>
          </div>
          <Field label="Shop-Link für Nachkauf">
            <div className="flex items-stretch gap-2">
              <input
                type="url"
                className="input flex-1"
                placeholder="https://shop.example.com/easton-x10"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
              />
              {purchaseUrl && (
                <a
                  href={purchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary inline-flex items-center gap-1"
                  aria-label="Shop öffnen"
                >
                  <ExternalLink size={14} strokeWidth={1.75} />
                </a>
              )}
            </div>
          </Field>

          {proMode && (
            <details className="rounded-xl bg-surface border border-hairline overflow-hidden">
              <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <ExternalLink size={12} strokeWidth={1.75} /> Komponenten einzeln nachbestellen
              </summary>
              <div className="px-3 pb-3 space-y-2.5">
                <ComponentUrlField label="Schaft" value={purchaseUrlShaft} onChange={setPurchaseUrlShaft} />
                <ComponentUrlField label="Befiederung" value={purchaseUrlFletching} onChange={setPurchaseUrlFletching} />
                <ComponentUrlField label="Nocken" value={purchaseUrlNocks} onChange={setPurchaseUrlNocks} />
                <ComponentUrlField label="Spitzen" value={purchaseUrlTips} onChange={setPurchaseUrlTips} />
              </div>
            </details>
          )}
        </section>

        {/* Ereignisse (nur im Edit-Modus) */}
        {mode === "edit" && arrow && (
          <ArrowEventsSection
            events={events}
            busy={busy}
            onAdd={addEvent}
            onRemove={removeEvent}
          />
        )}

        {/* Verknüpfte Bögen */}
        <section className="card space-y-2">
          <h2 className="eyebrow">Passt zu folgenden Bögen</h2>
          {allBows.length === 0 ? (
            <p className="text-sm text-muted">Du hast noch keine Bögen angelegt — leg im Bogen-Bereich zuerst einen an.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {allBows.map((b) => (
                  <ChipBtn key={b.id} active={bowIds.has(b.id)} onClick={() => toggleBow(b.id)}>
                    {b.name} <span className="opacity-70">· {BOW_LABELS[b.bow_type]}</span>
                  </ChipBtn>
                ))}
              </div>
              {/* Direkt-Links zu den verknüpften Bögen */}
              {bowIds.size > 0 && (
                <div className="pt-2 border-t border-hairline">
                  <div className="text-xs text-muted mb-1.5">Direkt zum Bogen springen:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allBows.filter((b) => bowIds.has(b.id)).map((b) => (
                      <Link
                        key={b.id}
                        to={`/bows/${b.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs text-cherry-600 dark:text-cherry-400 hover:underline"
                      >
                        {b.name} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Notizen + Standard */}
        <section className="card space-y-3">
          <Field label="Notizen">
            <textarea className="input" rows={2} placeholder="Wechsel, Verluste, Auffälligkeiten…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 accent-cherry-500" />
            <span className="text-sm text-secondary inline-flex items-center gap-1.5">
              <Star size={14} strokeWidth={1.75} />
              Als Standard markieren
            </span>
          </label>
        </section>
      </form>
    </div>
  );
}

function ComponentUrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] text-muted mb-1">{label}</div>
      <div className="flex items-stretch gap-2">
        <input
          type="url"
          className="input flex-1 text-sm py-2"
          placeholder={`https://shop.example.com/${label.toLowerCase()}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center gap-1 px-3"
            aria-label={`${label}-Shop öffnen`}
          >
            <ExternalLink size={12} strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-secondary mb-1 block">
        {label}{required && " *"}
      </span>
      {children}
    </label>
  );
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
        active
          ? "bg-cherry-500 text-cream shadow-cherry"
          : "bg-surface text-secondary hover:text-primary border border-hairline"
      }`}
    >
      {children}
    </button>
  );
}

function ArrowEventsSection({
  events,
  busy,
  onAdd,
  onRemove,
}: {
  events: ArrowEvent[];
  busy: boolean;
  onAdd: (kind: ArrowEventKind, count: number, when: string, notes: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [kind, setKind] = useState<ArrowEventKind>("broken");
  const [count, setCount] = useState("1");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  const KINDS: ArrowEventKind[] = ["broken", "lost", "added", "replaced"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.max(1, parseInt(count, 10) || 1);
    await onAdd(kind, n, when, notes);
    setCount("1");
    setNotes("");
    setWhen("");
  }

  return (
    <section className="card space-y-3">
      <h2 className="eyebrow flex items-center gap-1.5">
        <History size={14} strokeWidth={1.75} /> Verlauf
      </h2>

      <form onSubmit={submit} className="space-y-2.5 pb-3 border-b border-hairline">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <ChipBtn key={k} active={kind === k} onClick={() => setKind(k)}>
              {EVENT_LABELS[k]}
            </ChipBtn>
          ))}
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <input type="number" min={1} className="input" placeholder="1" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Anzahl" />
          <input type="date" className="input" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Datum (optional, heute wenn leer)" />
        </div>
        <input className="input" placeholder={"Notiz (optional, z.B. „Wettkampf Hannover“)"} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit" disabled={busy} className="btn-secondary text-sm inline-flex items-center gap-1.5">
          <Plus size={14} strokeWidth={2} /> Ereignis erfassen
        </button>
      </form>

      {events.length === 0 ? (
        <p className="text-sm text-muted">Noch keine Ereignisse erfasst.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2 text-sm">
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${kindBg(ev.kind)}`}>
                {ev.count}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {EVENT_LABELS[ev.kind]}
                  <span className="text-muted font-normal"> · {fmtDate(ev.occurred_at)}</span>
                </div>
                {ev.notes && <div className="text-xs text-muted truncate">{ev.notes}</div>}
              </div>
              <button
                type="button"
                onClick={() => onRemove(ev.id)}
                disabled={busy}
                className="btn-icon"
                aria-label="Ereignis entfernen"
                title="Ereignis entfernen"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function kindBg(kind: ArrowEventKind): string {
  switch (kind) {
    case "broken":   return "bg-cherry-500/15 text-cherry-700 dark:text-cherry-300";
    case "lost":     return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "added":    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "replaced": return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

/** Drei-Zustand-Checkbox: null = nicht gesetzt, true / false. */
function TriCheck({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-secondary mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <ChipBtn active={value === true}  onClick={() => onChange(value === true ? null : true)}>Ja</ChipBtn>
        <ChipBtn active={value === false} onClick={() => onChange(value === false ? null : false)}>Nein</ChipBtn>
        <ChipBtn active={value === null}  onClick={() => onChange(null)}>k. A.</ChipBtn>
      </div>
    </div>
  );
}

function ArrowPhotoBlock({
  arrow, busy, pendingPhoto, onUpload, onDelete,
}: {
  arrow: Arrow; busy: boolean; pendingPhoto: string | null; onUpload: (f: File) => void; onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const displayUrl = pendingPhoto ?? arrow.image_url;
  const isPending = !!pendingPhoto;
  if (displayUrl) {
    return (
      <div>
        <label className="text-sm font-medium text-secondary mb-1.5 block">Foto</label>
        <div className="flex items-start gap-3">
          <div className="relative">
            <img src={displayUrl} alt="" className="w-24 h-24 rounded-xl object-cover border border-hairline" />
            {isPending && (
              <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-1.5 py-0.5 text-[10px] font-medium" title="Foto wartet auf Sync">
                <CloudOff size={10} strokeWidth={2} /> Sync
              </span>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary text-xs inline-flex items-center gap-1.5">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={1.75} />} Foto ersetzen
            </button>
            {!isPending && (
              <button type="button" onClick={onDelete} disabled={busy} className="btn-ghost danger text-xs inline-flex items-center gap-1.5">
                <Trash2 size={14} strokeWidth={1.75} /> Entfernen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="text-sm font-medium text-secondary mb-1.5 block">Foto</label>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="card-sunken w-full inline-flex flex-col items-center gap-1 py-6 cursor-pointer hover:bg-surface transition">
        <Camera size={22} strokeWidth={1.75} className="text-muted" />
        <span className="text-sm text-secondary">Foto aufnehmen oder hochladen</span>
      </button>
    </div>
  );
}

