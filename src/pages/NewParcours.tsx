import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, X, Check, Copy } from "lucide-react";
import { cloneParcours, createParcours, listParcours, uploadParcoursImage, type Parcours } from "../api/parcours";
import ParcoursForm, { initialFormState, formStateToBody, type ParcoursFormState } from "../components/ParcoursForm";
import { usePageFooter } from "../components/FooterContext";

const FORM_ID = "parcours-new-form";

export default function NewParcours() {
  const nav = useNavigate();

  const [state, setState] = useState<ParcoursFormState>(initialFormState());
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vorlage übernehmen — Liste eigener + öffentlicher Parcours zur Auswahl
  const [templates, setTemplates] = useState<Parcours[]>([]);
  const [cloneFrom, setCloneFrom] = useState<number | "">("");
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    listParcours(true)
      .then((r) => setTemplates(r.parcours))
      .catch(() => {});
  }, []);

  async function handleCloneSelect(srcId: number) {
    if (!srcId) return;
    setCloning(true);
    setError(null);
    try {
      const r = await cloneParcours(srcId);
      // Zum frisch geklonten Parcours navigieren — User kann dort weiter editieren
      nav(`/parcours/${r.parcours.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Klonen fehlgeschlagen");
      setCloneFrom("");
    } finally {
      setCloning(false);
    }
  }

  // Context-aware Footer: nur Abbrechen + Speichern
  const footerActions = useMemo(
    () => [
      { kind: "button" as const, icon: <X size={20} strokeWidth={1.75} />, label: "Abbrechen", onClick: () => nav("/parcours") },
      {
        kind: "button" as const,
        icon: <Check size={20} strokeWidth={2} />,
        label: busy ? "Speichere…" : "Speichern",
        primary: true,
        disabled: busy || !state.name.trim(),
        onClick: () => {
          const f = document.getElementById(FORM_ID) as HTMLFormElement | null;
          f?.requestSubmit();
        },
      },
    ],
    [busy, state.name, nav]
  );
  usePageFooter(footerActions);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Bild zu groß (max 5 MB)");
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!state.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createParcours(formStateToBody(state));
      if (file) {
        try {
          const up = await uploadParcoursImage(r.parcours.id, file);
          if (up.pending) {
            sessionStorage.setItem("parcours_photo_pending", String(r.parcours.id));
          }
        } catch { /* nicht kritisch */ }
      }
      nav(`/parcours/${r.parcours.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Parcours nicht speichern");
    } finally {
      setBusy(false);
    }
  }

  const imageBlock = (
    <section className="space-y-3">
      <h2 className="eyebrow">Hauptbild</h2>
      {filePreview ? (
        <div className="relative">
          <img src={filePreview} alt="" className="w-full rounded-2xl border border-hairline" />
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setFilePreview(null);
            }}
            className="absolute top-2 right-2 btn-icon bg-elevated/95 shadow-card"
            aria-label="Entfernen"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <label className="card-sunken flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:bg-surface transition">
          <UploadIcon size={22} strokeWidth={1.75} className="text-muted" />
          <span className="text-sm text-secondary">Bild hinzufügen — JPEG, PNG, WebP (max 5 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
        </label>
      )}
    </section>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => nav("/parcours")} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h2">Neuer Parcours</h1>
      </div>

      {/* Vorlage übernehmen — optional. Spart Zeit wenn ein ähnlicher Parcours schon existiert. */}
      {templates.length > 0 && (
        <section className="card-sunken mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary mb-2">
            <Copy size={14} strokeWidth={1.75} /> Aus Vorlage übernehmen (optional)
          </label>
          <select
            className="input"
            value={cloneFrom}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              setCloneFrom(val);
              if (val) handleCloneSelect(val);
            }}
            disabled={cloning}
          >
            <option value="">— Leer starten —</option>
            {templates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.is_public ? " (öffentlich)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1.5">
            Stammdaten + Bahnen werden kopiert (Foto nicht — lade ein eigenes hoch).
          </p>
        </section>
      )}

      <ParcoursForm
        formId={FORM_ID}
        hideSubmitButton
        state={state}
        setState={setState}
        onSubmit={handleSubmit}
        submitLabel="Parcours speichern"
        busy={busy}
        error={error}
        extraFields={imageBlock}
      />
    </div>
  );
}
