import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, X, Check, List as ListIcon } from "lucide-react";
import { getParcours, updateParcours, uploadParcoursImage, type Parcours } from "../api/parcours";
import ParcoursForm, { initialFormState, formStateToBody, type ParcoursFormState } from "../components/ParcoursForm";
import { usePageFooter } from "../components/FooterContext";

const FORM_ID = "parcours-edit-form";

export default function ParcoursEdit() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const parcoursId = Number(id);

  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [state, setState] = useState<ParcoursFormState>(initialFormState());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFilePreview, setNewFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!parcoursId) return;
    getParcours(parcoursId)
      .then((r) => {
        setParcours(r.parcours);
        setState(initialFormState(r.parcours));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Konnte Parcours nicht laden"))
      .finally(() => setLoading(false));
  }, [parcoursId]);

  // Context-aware Footer: Abbrechen + Speichern + Bahnen
  const footerActions = useMemo(
    () => parcours ? [
      { kind: "button" as const, icon: <X size={20} strokeWidth={1.75} />, label: "Abbrechen", onClick: () => nav(`/parcours/${parcours.id}`) },
      { kind: "link"   as const, icon: <ListIcon size={20} strokeWidth={1.75} />, label: "Bahnen", to: `/parcours/${parcours.id}/lanes` },
      {
        kind: "button" as const,
        icon: <Check size={20} strokeWidth={2} />,
        label: busy ? "Speichere…" : "Speichern",
        primary: true,
        disabled: busy || !state.name.trim(),
        onClick: () => (document.getElementById(FORM_ID) as HTMLFormElement | null)?.requestSubmit(),
      },
    ] : null,
    [parcours, busy, state.name, nav]
  );
  usePageFooter(footerActions);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("Bild zu groß (max 5 MB)");
      return;
    }
    setNewFile(f);
    setNewFilePreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!state.name.trim() || !parcours) return;
    setBusy(true);
    setError(null);
    try {
      await updateParcours(parcours.id, formStateToBody(state));
      if (newFile) {
        try {
          await uploadParcoursImage(parcours.id, newFile);
        } catch { /* nicht kritisch */ }
      }
      nav(`/parcours/${parcours.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Änderungen nicht speichern");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-secondary p-8">Lade…</p>;
  if (!parcours) return <p className="text-cherry-500 p-8">{error ?? "Parcours nicht gefunden"}</p>;

  const currentImage = parcours.image_url ?? null;
  const previewSrc = newFilePreview ?? currentImage;

  const imageBlock = (
    <section className="space-y-3">
      <h2 className="eyebrow">Hauptbild</h2>
      {previewSrc ? (
        <div className="relative">
          <img src={previewSrc} alt="" className="w-full rounded-2xl border border-hairline" />
          {newFilePreview && (
            <button
              type="button"
              onClick={() => {
                setNewFile(null);
                setNewFilePreview(null);
              }}
              className="absolute top-2 right-2 btn-icon bg-elevated/95 shadow-card"
              aria-label="Neues Bild verwerfen"
            >
              <X size={18} />
            </button>
          )}
          <label className="block mt-2">
            <span className="text-xs text-secondary">Bild ersetzen:</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block mt-1 text-sm"
              onChange={onFileChange}
            />
          </label>
        </div>
      ) : (
        <label className="card-sunken flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:bg-surface transition">
          <UploadIcon size={22} strokeWidth={1.75} className="text-muted" />
          <span className="text-sm text-secondary">Bild hinzufügen</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
        </label>
      )}
    </section>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => nav(`/parcours/${parcours.id}`)} className="btn-icon" aria-label="Zurück">
          <ArrowLeft size={22} strokeWidth={1.75} />
        </button>
        <h1 className="display text-h2 flex-1 truncate">Bearbeiten: {parcours.name}</h1>
      </div>

      <ParcoursForm
        formId={FORM_ID}
        hideSubmitButton
        state={state}
        setState={setState}
        onSubmit={handleSubmit}
        submitLabel="Änderungen speichern"
        busy={busy}
        error={error}
        extraFields={imageBlock}
        parcoursId={parcours.id}
        lanesDetailedCount={parcours.lanes_detailed_count}
      />
    </div>
  );
}
