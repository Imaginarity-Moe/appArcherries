import { useEffect, useRef, useState } from "react";
import { Camera, ImageOff, X, Loader2, CloudOff } from "lucide-react";
import { uploadTargetImage, deleteTargetImage } from "../api/trainings";
import { useConfirm } from "./ConfirmDialog";

type Props = {
  trainingId: number | string;
  targetId: number;
  imagePath: string | null;
  onChange: (newPath: string | null) => void;
};

/**
 * Foto-Upload pro Station. Auf Mobile öffnet sich direkt die Kamera (capture="environment").
 * Bild wird serverseitig auf max 1600px resized + JPEG-Re-Encoded.
 * Bei Offline/Netzfehler: in upload_outbox queuen, blob-Preview für die laufende Session.
 */
export default function StationPhoto({ trainingId, targetId, imagePath, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  // Lokaler Session-Preview wenn Upload in der Queue liegt (blob: URL).
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const confirm = useConfirm();

  // Stationen die noch nicht gespeichert sind (kein echtes id) können kein Bild bekommen
  const canUpload = targetId > 0 && typeof trainingId === "number";

  // Wenn das Server-image_path eintrudelt (z.B. nach Sync), lokalen Preview verwerfen + URL freigeben
  useEffect(() => {
    if (imagePath && pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
      setPendingPreview(null);
    }
  }, [imagePath, pendingPreview]);

  // Beim Unmount: blob URL freigeben
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const displayPath = pendingPreview ?? imagePath;
  const isPending = !!pendingPreview;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const r = await uploadTargetImage(trainingId, targetId, file);
      if (r.pending) {
        // Vorigen Preview freigeben falls einer existiert
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setPendingPreview(r.image_path);
      } else {
        onChange(r.image_path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
      e.target.value = ""; // reset so dass dieselbe Datei nochmal gewählt werden kann
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Foto entfernen?",
      message: "Das Stations-Foto wird vom Server gelöscht.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteTargetImage(trainingId, targetId);
      onChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  if (!canUpload && !displayPath) {
    return (
      <div className="text-xs text-forest-600 dark:text-forest-400 flex items-center gap-1">
        <ImageOff size={12} /> Foto erst nach erstem Speichern möglich
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {displayPath ? (
        <div className="relative inline-block">
          <button type="button" onClick={() => setZoom(true)} className="block">
            <img
              src={displayPath}
              alt="Station"
              className="rounded-xl w-24 h-24 object-cover"
              loading="lazy"
            />
          </button>
          {isPending && (
            <span
              className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/70 text-white px-1.5 py-0.5 text-[10px] font-medium"
              title="Foto wartet auf Sync"
            >
              <CloudOff size={10} strokeWidth={2} /> Sync
            </span>
          )}
          {!isPending && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-soft hover:bg-red-700 disabled:opacity-50"
              aria-label="Foto entfernen"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || !canUpload}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {busy ? "Hochladen…" : "Foto"}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-700 mt-1">{error}</div>
      )}

      {/* Zoom-Overlay */}
      {zoom && displayPath && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoom(false)}
        >
          <img
            src={displayPath}
            alt="Station"
            className="max-w-full max-h-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 btn-icon bg-white/20 text-white"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
