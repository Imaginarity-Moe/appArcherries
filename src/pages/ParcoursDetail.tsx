import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Map as MapIcon, Play, Trash2, Globe } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
import { deleteParcours, getParcours, type Parcours } from "../api/parcours";

const customIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 0 C 7 0 0 7 0 16 C 0 26 16 40 16 40 C 16 40 32 26 32 16 C 32 7 25 0 16 0 Z" fill="#C97B4B"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'
    ),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

export default function ParcoursDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation(["parcours", "common"]);
  const [p, setP] = useState<Parcours | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getParcours(Number(id))
      .then((r) => setP(r.parcours))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!p) return;
    if (!confirm(t("parcours:detail.delete_confirm"))) return;
    await deleteParcours(p.id);
    nav("/parcours");
  }

  if (loading) return <p className="text-forest-700">{t("common:actions.loading")}</p>;
  if (!p) return <p className="text-red-700">Not found</p>;

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
      <Link to="/parcours" className="inline-flex items-center gap-1 text-sm text-forest-700 hover:text-copper-500">
        <ArrowLeft size={16} /> {t("common:actions.back")}
      </Link>

      {p.image_url && (
        <img src={p.image_url} alt={p.name} className="w-full rounded-2xl object-cover max-h-80" />
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold">{p.name}</h1>
            {p.address && (
              <div className="text-sm text-forest-700 mt-1">📍 {p.address}</div>
            )}
          </div>
          {p.is_public && (
            <div className="chip-copper">
              <Globe size={14} /> Öffentlich
            </div>
          )}
        </div>

        {p.description && (
          <p className="text-forest-900 dark:text-forest-100 mt-3 whitespace-pre-wrap">{p.description}</p>
        )}

        {p.lat != null && p.lng != null && (
          <div className="rounded-xl overflow-hidden mt-4 border border-forest-100" style={{ height: 240 }}>
            <MapContainer center={[p.lat, p.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[p.lat, p.lng]} icon={customIcon} />
            </MapContainer>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <Link to={`/trainings/new?parcours=${p.id}`} className="btn">
            <Play size={16} /> {t("parcours:detail.start_training")}
          </Link>
          {p.lat != null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=15/${p.lat}/${p.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <MapIcon size={16} /> {t("parcours:detail.open_map")}
            </a>
          )}
          <button onClick={handleDelete} className="btn-ghost danger ml-auto">
            <Trash2 size={16} /> {t("parcours:detail.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
