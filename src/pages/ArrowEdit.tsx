import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X, Check, Loader2, Star, Camera, Trash2 } from "lucide-react";
import {
  createArrow,
  deleteArrow,
  deleteArrowImage,
  getArrow,
  updateArrow,
  uploadArrowImage,
  type Arrow,
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
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [bowIds, setBowIds] = useState<Set<number>>(new Set());

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
        setNotes(a.notes ?? "");
        setIsDefault(a.is_default);
        setBowIds(new Set((a.linked_bows ?? []).map((b) => b.id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Pfeil-Set nicht laden"))
      .finally(() => setLoading(false));
  }, [mode, id]);

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
        notes: notes || null,
        is_default: isDefault,
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
      setArrow(r.arrow);
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

  if (loading) return <p className="text-secondary p-8">Lade…</p>;
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
            <ArrowPhotoBlock arrow={arrow} busy={busy} onUpload={handleImageUpload} onDelete={handleImageDelete} />
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
          </div>
        </section>

        {/* Schaft */}
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
            <Field label="Spine">
              <input className="input" placeholder="z.B. 700" value={spine} onChange={(e) => setSpine(e.target.value)} />
            </Field>
            <Field label="Länge (inch)">
              <input type="number" step="0.1" inputMode="decimal" className="input" placeholder="z.B. 28.5" value={lengthInch} onChange={(e) => setLengthInch(e.target.value)} />
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
        </section>

        {/* Verknüpfte Bögen */}
        <section className="card space-y-2">
          <h2 className="eyebrow">Passt zu folgenden Bögen</h2>
          {allBows.length === 0 ? (
            <p className="text-sm text-muted">Du hast noch keine Bögen angelegt — leg im Bogen-Bereich zuerst einen an.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allBows.map((b) => (
                <ChipBtn key={b.id} active={bowIds.has(b.id)} onClick={() => toggleBow(b.id)}>
                  {b.name} <span className="opacity-70">· {BOW_LABELS[b.bow_type]}</span>
                </ChipBtn>
              ))}
            </div>
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
  arrow, busy, onUpload, onDelete,
}: {
  arrow: Arrow; busy: boolean; onUpload: (f: File) => void; onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  if (arrow.image_url) {
    return (
      <div>
        <label className="text-sm font-medium text-secondary mb-1.5 block">Foto</label>
        <div className="flex items-start gap-3">
          <img src={arrow.image_url} alt="" className="w-24 h-24 rounded-xl object-cover border border-hairline" />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-secondary text-xs inline-flex items-center gap-1.5">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={1.75} />} Foto ersetzen
            </button>
            <button type="button" onClick={onDelete} disabled={busy} className="btn-ghost danger text-xs inline-flex items-center gap-1.5">
              <Trash2 size={14} strokeWidth={1.75} /> Entfernen
            </button>
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

