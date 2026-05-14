import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, X, Check, Loader2, Trash2 } from "lucide-react";
import Avatar from "./Avatar";
import { useAuth, type User } from "../auth/AuthContext";
import { api, getToken } from "../api/client";
import { useConfirm } from "./ConfirmDialog";

const MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const CROP_OUTPUT_PX = 512;        // serverseitig wird's nochmal auf max 1600 begrenzt

/**
 * Avatar-Upload mit 1:1-Crop, max 1 MB.
 * - Tap → File-Picker
 * - Crop-Modal mit react-easy-crop (drag + zoom)
 * - Upload als JPEG-Blob
 * - Delete via Confirm
 */
export default function AvatarUploader() {
  const { user, refresh } = useAuth();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Datei zu groß. Maximal 1 MB.");
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Nur Bilder erlaubt.");
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    e.target.value = "";
  };

  const closeCrop = () => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    setSrcUrl(null);
    setCropArea(null);
  };

  const upload = async () => {
    if (!srcUrl || !cropArea) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToBlob(srcUrl, cropArea, CROP_OUTPUT_PX);
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
      const token = getToken();
      const res = await fetch(`${base}/me/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Upload fehlgeschlagen (${res.status})`);
      }
      await refresh();
      closeCrop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Avatar entfernen?",
      message: "Du wirst wieder mit deinen Initialen angezeigt.",
      confirmLabel: "Entfernen",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api("/me/avatar", { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar user={user as User} size="xl" />
      <div className="flex flex-col gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-secondary text-sm inline-flex items-center gap-2"
          disabled={busy}
        >
          <Camera size={15} strokeWidth={1.75} /> {user?.avatar_url ? "Ändern" : "Hochladen"}
        </button>
        {user?.avatar_url && (
          <button onClick={handleDelete} className="btn-ghost text-sm inline-flex items-center gap-2 danger" disabled={busy}>
            <Trash2 size={14} strokeWidth={1.75} /> Entfernen
          </button>
        )}
        {error && <p className="text-xs text-cherry-500">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {srcUrl && (
        <CropModal
          src={srcUrl}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, area) => setCropArea(area)}
          onCancel={closeCrop}
          onConfirm={upload}
          busy={busy}
        />
      )}
    </div>
  );
}

function CropModal({
  src,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
  busy,
}: {
  src: string;
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (c: { x: number; y: number }) => void;
  onZoomChange: (z: number) => void;
  onCropComplete: (_: Area, area: Area) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-warm-black/90 flex flex-col animate-fade-in">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 text-cream">
        <button onClick={onCancel} className="btn-icon text-cream" aria-label="Abbrechen">
          <X size={22} strokeWidth={1.75} />
        </button>
        <h2 className="font-display text-base font-semibold">Bild zuschneiden</h2>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="btn-icon text-cream disabled:opacity-50"
          aria-label="Speichern"
        >
          {busy ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} strokeWidth={2} />}
        </button>
      </header>

      <div className="relative flex-1 bg-warm-black overflow-hidden">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="px-6 py-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] bg-warm-black text-cream">
        <label className="text-xs uppercase tracking-wider opacity-60 block mb-2">Zoom</label>
        <input
          type="range"
          min={1}
          max={4}
          step={0.05}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-full accent-cherry-500"
        />
      </div>
    </div>
  );
}

async function cropToBlob(src: string, area: Area, outputPx: number): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputPx;
  canvas.height = outputPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Context nicht verfügbar");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outputPx, outputPx);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop fehlgeschlagen"))), "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
