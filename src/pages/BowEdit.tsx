import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X, Check, Loader2, Star, Camera, Trash2, CloudOff } from "lucide-react";
import { PageSpinner } from "../components/Spinner";
import {
  addBowEquipment,
  createBow,
  deleteBow,
  deleteBowImage,
  getBow,
  removeBowEquipment,
  updateBow,
  uploadBowImage,
  type Bow,
  type LinkedEquipment,
} from "../api/bows";
import { listArrows, type Arrow } from "../api/arrows";
import {
  EQUIPMENT_KIND_LABELS,
  listEquipment,
  type EquipmentItem,
} from "../api/equipment";
import { BOW_LABELS, type BowType } from "../api/trainings";
import { usePageFooter } from "../components/FooterContext";
import { useConfirm } from "../components/ConfirmDialog";

const BOW_TYPES: BowType[] = ["recurve", "compound", "barebow", "traditional"];

const FORM_ID = "bow-form";

type Mode = "new" | "edit";

export default function BowEdit({ mode }: { mode: Mode }) {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const confirm = useConfirm();

  const [bow, setBow] = useState<Bow | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form-State
  const [name, setName] = useState("");
  const [bowType, setBowType] = useState<BowType>("recurve");
  const [drawWeight, setDrawWeight] = useState("");
  const [lengthInch, setLengthInch] = useState("");
  const [braceHeight, setBraceHeight] = useState("");
  const [letOff, setLetOff] = useState("");
  const [arrowSpine, setArrowSpine] = useState("");
  const [sightMarks, setSightMarks] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [allArrows, setAllArrows] = useState<Arrow[]>([]);
  const [arrowIds, setArrowIds] = useState<Set<number>>(new Set());
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [linkedEquipment, setLinkedEquipment] = useState<LinkedEquipment[]>([]);
  const [equipmentBusy, setEquipmentBusy] = useState(false);
  // Session-Preview wenn Foto offline in upload_outbox liegt (blob: URL).
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  // Beim Unmount: blob URL freigeben
  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto);
    };
  }, [pendingPhoto]);

  // Initial laden (Edit-Modus + Pfeil-Liste + Equipment-Liste)
  useEffect(() => {
    listArrows().then((r) => setAllArrows(r.arrows)).catch(() => {});
    listEquipment().then((r) => setAllEquipment(r.items)).catch(() => {});
    if (mode !== "edit" || !id) return;
    getBow(Number(id))
      .then((r) => {
        setBow(r.bow);
        setName(r.bow.name);
        setBowType(r.bow.bow_type);
        setDrawWeight(r.bow.draw_weight_lbs?.toString() ?? "");
        setLengthInch(r.bow.length_inch?.toString() ?? "");
        setBraceHeight(r.bow.brace_height_inch?.toString() ?? "");
        setLetOff(r.bow.let_off_percent?.toString() ?? "");
        setArrowSpine(r.bow.arrow_spine ?? "");
        setSightMarks(r.bow.sight_marks ?? "");
        setNotes(r.bow.notes ?? "");
        setIsDefault(r.bow.is_default);
        setArrowIds(new Set((r.bow.linked_arrows ?? []).map((a) => a.id)));
        setLinkedEquipment(r.bow.linked_equipment ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Bogen nicht laden"))
      .finally(() => setLoading(false));
  }, [mode, id]);

  async function onAddEquipment(eqId: number) {
    if (!id || !eqId) return;
    setEquipmentBusy(true);
    try {
      const r = await addBowEquipment(Number(id), { equipment_item_id: eqId });
      setLinkedEquipment(r.bow.linked_equipment ?? []);
    } finally {
      setEquipmentBusy(false);
    }
  }

  async function onRemoveEquipment(eqId: number) {
    if (!id) return;
    setEquipmentBusy(true);
    try {
      const r = await removeBowEquipment(Number(id), eqId);
      setLinkedEquipment(r.bow.linked_equipment ?? []);
    } finally {
      setEquipmentBusy(false);
    }
  }

  function toggleArrow(aid: number) {
    setArrowIds((cur) => {
      const next = new Set(cur);
      if (next.has(aid)) next.delete(aid);
      else next.add(aid);
      return next;
    });
  }

  // Custom Footer: Abbrechen / Speichern, im Edit-Modus zusätzlich Löschen
  const footerActions = useMemo(
    () => {
      const actions: Array<
        | { kind: "button"; onClick: () => void; icon: React.ReactNode; label: string; primary?: boolean; danger?: boolean; disabled?: boolean }
      > = [
        {
          kind: "button" as const,
          icon: <X size={20} strokeWidth={1.75} />,
          label: "Abbrechen",
          onClick: () => nav("/bows"),
        },
      ];
      if (mode === "edit" && bow) {
        actions.push({
          kind: "button" as const,
          icon: <Trash2 size={20} strokeWidth={1.75} />,
          label: "Löschen",
          danger: true,
          onClick: handleDelete,
          disabled: busy,
        });
      }
      actions.push({
        kind: "button" as const,
        icon: <Check size={20} strokeWidth={2} />,
        label: busy ? "Speichere…" : "Speichern",
        primary: true,
        disabled: busy || !name.trim(),
        onClick: () => (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit(),
      });
      return actions;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, bow, busy, name, nav]
  );
  usePageFooter(footerActions);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name erforderlich");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        bow_type: bowType,
        draw_weight_lbs: drawWeight ? Number(drawWeight.replace(",", ".")) : null,
        length_inch: lengthInch ? Number(lengthInch.replace(",", ".")) : null,
        brace_height_inch: braceHeight ? Number(braceHeight.replace(",", ".")) : null,
        let_off_percent: letOff ? Number(letOff) : null,
        arrow_spine: arrowSpine || null,
        sight_marks: sightMarks || null,
        notes: notes || null,
        is_default: isDefault,
        arrow_ids: [...arrowIds],
      };
      if (mode === "edit" && bow) {
        const r = await updateBow(bow.id, body);
        setBow(r.bow);
      } else {
        const r = await createBow(body);
        // Nach Anlage: in den Edit-Modus → User kann jetzt ein Foto hochladen
        nav(`/bows/${r.bow.id}/edit`, { replace: true });
        return;
      }
      nav("/bows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!bow) return;
    const ok = await confirm({
      title: "Bogen löschen?",
      message: `„${bow.name}" wird endgültig entfernt. Bisherige Trainings bleiben unangetastet.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteBow(bow.id);
      nav("/bows");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!bow) return;
    setBusy(true);
    try {
      const r = await uploadBowImage(bow.id, file);
      if (r.pending) {
        if (pendingPhoto) URL.revokeObjectURL(pendingPhoto);
        setPendingPhoto(r.pendingUrl);
      } else {
        if (pendingPhoto) {
          URL.revokeObjectURL(pendingPhoto);
          setPendingPhoto(null);
        }
        setBow(r.data.bow);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto-Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageDelete() {
    if (!bow) return;
    const ok = await confirm({
      title: "Foto entfernen?",
      message: "Das Bogen-Foto wird vom Server gelöscht.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await deleteBowImage(bow.id);
      setBow(r.bow);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (mode === "edit" && !bow) return <p className="text-cherry-500 p-8">{error ?? "Bogen nicht gefunden"}</p>;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => nav("/bows")} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h2 flex-1 truncate">
          {mode === "edit" ? `Bearbeiten: ${bow!.name}` : "Neuer Bogen"}
        </h1>
      </div>

      {error && (
        <div className="card border-cherry-500/30 text-cherry-600 text-sm">{error}</div>
      )}

      <form id={FORM_ID} onSubmit={handleSubmit} className="card space-y-4">
        {/* Foto-Bereich — nur im Edit-Modus, vor allen Form-Feldern */}
        {mode === "edit" && bow && (
          <BowPhotoBlock
            bow={bow}
            busy={busy}
            pendingPhoto={pendingPhoto}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
          />
        )}

        {mode === "new" && (
          <div className="text-xs text-muted italic">
            Foto-Upload erscheint nach dem ersten Speichern.
          </div>
        )}

        <Field label="Name" required>
          <input
            className="input"
            placeholder="z.B. Mein Recurve"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus={mode === "new"}
          />
        </Field>

        <div>
          <label className="text-sm font-medium text-secondary mb-1.5 block">Bogenklasse *</label>
          <div className="grid grid-cols-2 gap-2">
            {BOW_TYPES.map((b) => {
              const sel = b === bowType;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBowType(b)}
                  className={`tap-target rounded-xl px-3 py-2.5 font-medium transition active:scale-[0.98] ${
                    sel
                      ? "bg-cherry-500 text-cream shadow-cherry"
                      : "bg-surface text-secondary hover:text-primary border border-hairline"
                  }`}
                >
                  {BOW_LABELS[b]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Zuggewicht (lbs)">
            <input type="number" step="0.5" inputMode="decimal" className="input" placeholder="z.B. 38" value={drawWeight} onChange={(e) => setDrawWeight(e.target.value)} />
          </Field>
          <Field label="Pfeil-Spine">
            <input className="input" placeholder="z.B. 700" value={arrowSpine} onChange={(e) => setArrowSpine(e.target.value)} />
          </Field>
          <Field label="Länge (inch)">
            <input type="number" step="0.1" inputMode="decimal" className="input" placeholder="z.B. 68" value={lengthInch} onChange={(e) => setLengthInch(e.target.value)} />
          </Field>
          <Field label="Standhöhe (inch)">
            <input type="number" step="0.05" inputMode="decimal" className="input" placeholder="z.B. 8.75" value={braceHeight} onChange={(e) => setBraceHeight(e.target.value)} />
          </Field>
          {bowType === "compound" && (
            <Field label="Let-Off (%)">
              <input type="number" inputMode="numeric" className="input" placeholder="z.B. 75" value={letOff} onChange={(e) => setLetOff(e.target.value)} />
            </Field>
          )}
        </div>

        <Field label="Visiermarken">
          <textarea className="input" rows={2} placeholder="z.B. 18m: 4.2 · 30m: 5.1 · 50m: 6.8" value={sightMarks} onChange={(e) => setSightMarks(e.target.value)} />
        </Field>

        <Field label="Notizen">
          <textarea className="input" rows={2} placeholder="z.B. Sehne 2025 gewechselt" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {/* Verknüpfte Pfeil-Sets */}
        <div>
          <label className="text-sm font-medium text-secondary mb-1.5 block">Genutzte Pfeil-Sets</label>
          {allArrows.length === 0 ? (
            <p className="text-sm text-muted">
              Du hast noch keine Pfeil-Sets angelegt.{" "}
              <Link to="/arrows/new" className="text-cherry-600 dark:text-cherry-400 underline">
                Jetzt anlegen →
              </Link>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {allArrows.map((a) => {
                  const sel = arrowIds.has(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleArrow(a.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                        sel
                          ? "bg-cherry-500 text-cream shadow-cherry"
                          : "bg-surface text-secondary hover:text-primary border border-hairline"
                      }`}
                    >
                      {a.name}{a.spine && <span className="opacity-70"> · {a.spine}</span>}
                    </button>
                  );
                })}
              </div>
              {arrowIds.size > 0 && (
                <div className="pt-2 mt-2 border-t border-hairline">
                  <div className="text-xs text-muted mb-1.5">Direkt zum Pfeil-Set springen:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allArrows.filter((a) => arrowIds.has(a.id)).map((a) => (
                      <Link
                        key={a.id}
                        to={`/arrows/${a.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs text-cherry-600 dark:text-cherry-400 hover:underline"
                      >
                        {a.name} →
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Verknüpftes Zubehör (Sehnen, Tabs, Releases, Sonstiges) */}
        {mode === "edit" && bow && (
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Zubehör</label>
            {allEquipment.length === 0 ? (
              <p className="text-sm text-muted">
                Du hast noch kein Zubehör angelegt.{" "}
                <Link to="/equipment/new" className="text-cherry-600 dark:text-cherry-400 underline">
                  Jetzt anlegen →
                </Link>
              </p>
            ) : (
              <>
                {linkedEquipment.length > 0 ? (
                  <ul className="space-y-1.5 mb-2">
                    {linkedEquipment.map((eq) => (
                      <li
                        key={eq.id}
                        className={`flex items-center gap-2 rounded-lg bg-surface border border-hairline px-3 py-2 text-sm ${eq.is_active ? "" : "opacity-60"}`}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary/70 shrink-0 w-16">
                          {EQUIPMENT_KIND_LABELS[eq.kind]}
                        </span>
                        <Link
                          to={`/equipment/${eq.id}/edit`}
                          className="flex-1 min-w-0 truncate font-medium text-primary hover:text-cherry-500"
                        >
                          {eq.name}
                          {(eq.manufacturer || eq.model) && (
                            <span className="text-xs text-muted ml-1.5">
                              · {[eq.manufacturer, eq.model].filter(Boolean).join(" ")}
                            </span>
                          )}
                          {!eq.is_active && <span className="text-xs text-muted ml-1.5">· außer Dienst</span>}
                        </Link>
                        <button
                          type="button"
                          onClick={() => onRemoveEquipment(eq.id)}
                          disabled={equipmentBusy}
                          className="btn-icon text-muted hover:text-cherry-500 shrink-0"
                          aria-label="Verknüpfung entfernen"
                          title="Verknüpfung entfernen"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted mb-2">Noch kein Zubehör mit diesem Bogen verknüpft.</p>
                )}
                {(() => {
                  const linkedIds = new Set(linkedEquipment.map((e) => e.id));
                  const available = allEquipment.filter((e) => !linkedIds.has(e.id));
                  if (available.length === 0) return null;
                  return (
                    <select
                      className="input text-sm"
                      value=""
                      disabled={equipmentBusy}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v > 0) onAddEquipment(v);
                        e.target.value = "";
                      }}
                    >
                      <option value="">+ Zubehör hinzufügen</option>
                      {available.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {EQUIPMENT_KIND_LABELS[eq.kind]} · {eq.name}
                          {(eq.manufacturer || eq.model) ? ` (${[eq.manufacturer, eq.model].filter(Boolean).join(" ")})` : ""}
                          {!eq.is_active ? " — außer Dienst" : ""}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </>
            )}
          </div>
        )}
        {mode === "new" && (
          <div>
            <label className="text-sm font-medium text-secondary mb-1.5 block">Zubehör</label>
            <p className="text-xs text-muted">Nach dem Speichern kannst du hier Zubehör (Sehnen, Tabs, Releases) verknüpfen.</p>
          </div>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 accent-cherry-500"
          />
          <span className="text-sm text-secondary inline-flex items-center gap-1.5">
            <Star size={14} strokeWidth={1.75} />
            Als Standard markieren (wird beim neuen Training vorausgewählt)
          </span>
        </label>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-secondary mb-1.5 block">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}

function BowPhotoBlock({
  bow,
  busy,
  pendingPhoto,
  onUpload,
  onDelete,
}: {
  bow: Bow;
  busy: boolean;
  pendingPhoto: string | null;
  onUpload: (f: File) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const displayUrl = pendingPhoto ?? bow.image_url;
  const isPending = !!pendingPhoto;

  if (displayUrl) {
    return (
      <div>
        <label className="text-sm font-medium text-secondary mb-1.5 block">Foto</label>
        <div className="flex items-start gap-3">
          <div className="relative">
            <img src={displayUrl} alt="" className="w-24 h-24 rounded-xl object-cover border border-hairline" />
            {isPending && (
              <span
                className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-1.5 py-0.5 text-[10px] font-medium"
                title="Foto wartet auf Sync"
              >
                <CloudOff size={10} strokeWidth={2} /> Sync
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} strokeWidth={1.75} />}
              Foto ersetzen
            </button>
            {!isPending && (
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="btn-ghost danger text-xs inline-flex items-center gap-1.5"
              >
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
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="card-sunken w-full inline-flex flex-col items-center gap-1 py-6 cursor-pointer hover:bg-surface transition"
      >
        <Camera size={22} strokeWidth={1.75} className="text-muted" />
        <span className="text-sm text-secondary">Foto aufnehmen oder hochladen</span>
      </button>
    </div>
  );
}
