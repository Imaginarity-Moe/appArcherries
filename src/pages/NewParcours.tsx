import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Icon, LatLng } from "leaflet";
import { ArrowLeft, Upload as UploadIcon, X } from "lucide-react";
import { createParcours, uploadParcoursImage } from "../api/parcours";

const customIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 0 C 7 0 0 7 0 16 C 0 26 16 40 16 40 C 16 40 32 26 32 16 C 32 7 25 0 16 0 Z" fill="#C97B4B"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'
    ),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

function ClickToSetMarker({ onPick }: { onPick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function NewParcours() {
  const { t } = useTranslation(["parcours", "common"]);
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>([51.1657, 10.4515]); // Deutschland-Mitte

  useEffect(() => {
    // Versuche, den User-Standort als Start zu nehmen
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createParcours({
        name,
        description: description || null,
        address: address || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        is_public: isPublic,
      });
      if (file) {
        try {
          await uploadParcoursImage(r.parcours.id, file);
        } catch {
          // Bild-Upload-Fehler nicht kritisch — Parcours ist ja angelegt
        }
      }
      nav(`/parcours/${r.parcours.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konnte Parcours nicht speichern");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => nav("/parcours")} className="btn-icon" aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold">{t("parcours:new")}</h1>
        <div className="w-10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-forest-700 mb-1 block">
            {t("parcours:form.name")}
          </label>
          <input
            className="input"
            placeholder={t("parcours:form.name_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-forest-700 mb-1 block">
            {t("parcours:form.description")}
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder={t("parcours:form.description_placeholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-forest-700 mb-1 block">
            {t("parcours:form.address")}
          </label>
          <input
            className="input"
            placeholder={t("parcours:form.address_placeholder")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Karte */}
        <div>
          <label className="text-sm font-medium text-forest-700 mb-2 block">
            {t("parcours:form.coordinates")}
          </label>
          <div className="rounded-2xl overflow-hidden border border-forest-100" style={{ height: 280 }}>
            <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickToSetMarker onPick={(ll) => setCoords({ lat: ll.lat, lng: ll.lng })} />
              {coords && <Marker position={[coords.lat, coords.lng]} icon={customIcon} />}
            </MapContainer>
          </div>
          {coords && (
            <p className="text-xs text-forest-700 mt-1 font-mono">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        {/* Bild */}
        <div>
          <label className="text-sm font-medium text-forest-700 mb-1 block">
            {t("parcours:form.image")}
          </label>
          {filePreview ? (
            <div className="relative">
              <img src={filePreview} className="w-full rounded-2xl border border-forest-100" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setFilePreview(null);
                }}
                className="absolute top-2 right-2 btn-icon bg-elevated/95"
                aria-label="Remove"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <label className="card-sunken flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:bg-sunken">
              <UploadIcon size={24} className="text-forest-700" />
              <span className="text-sm text-forest-700">{t("parcours:form.drop_image")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-5 h-5 rounded text-copper-500 focus:ring-copper-500 mt-0.5"
          />
          <span className="text-forest-700">{t("parcours:form.is_public")}</span>
        </label>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>
        )}

        <button className="btn w-full tap-large" disabled={busy || !name.trim()}>
          {busy ? t("parcours:form.submitting") : t("parcours:form.submit")}
        </button>
      </form>
    </div>
  );
}
