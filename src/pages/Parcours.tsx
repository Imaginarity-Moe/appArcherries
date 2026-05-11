import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, List as ListIcon, Map as MapIcon, Globe } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { listParcours, type Parcours } from "../api/parcours";

// Leaflet's default icons require workaround for bundlers.
// We use a custom inline icon instead.
const customIcon = new Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 0 C 7 0 0 7 0 16 C 0 26 16 40 16 40 C 16 40 32 26 32 16 C 32 7 25 0 16 0 Z" fill="#C97B4B"/><circle cx="16" cy="16" r="6" fill="white"/></svg>'
    ),
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

export default function ParcoursList() {
  const { t } = useTranslation(["parcours", "common"]);
  const [items, setItems] = useState<Parcours[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [includePublic, setIncludePublic] = useState(false);

  useEffect(() => {
    setLoading(true);
    listParcours(includePublic)
      .then((r) => setItems(r.parcours))
      .finally(() => setLoading(false));
  }, [includePublic]);

  const withGeo = items.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">{t("parcours:title")}</h1>
        <Link to="/parcours/new" className="btn">
          <Plus size={18} /> {t("parcours:new")}
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-xl bg-sunken p-1">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
              view === "list" ? "bg-elevated shadow-soft" : "text-forest-700"
            }`}
          >
            <ListIcon size={16} /> {t("parcours:map.show_list")}
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
              view === "map" ? "bg-elevated shadow-soft" : "text-forest-700"
            }`}
          >
            <MapIcon size={16} /> {t("parcours:map.show_map")}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-forest-700">
          <input
            type="checkbox"
            checked={includePublic}
            onChange={(e) => setIncludePublic(e.target.checked)}
            className="w-4 h-4 rounded text-copper-500 focus:ring-copper-500"
          />
          <Globe size={14} /> {t("parcours:public_parcours")}
        </label>
      </div>

      {loading && <p className="text-forest-700">{t("common:actions.loading")}</p>}

      {!loading && items.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-forest-700 mb-4">{t("parcours:empty_state")}</p>
          <Link to="/parcours/new" className="btn inline-flex">
            <Plus size={18} /> {t("parcours:create_cta")}
          </Link>
        </div>
      )}

      {view === "map" && withGeo.length > 0 && (
        <div className="card overflow-hidden p-0" style={{ height: 480 }}>
          <MapContainer
            center={[withGeo[0].lat!, withGeo[0].lng!]}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withGeo.map((p) => (
              <Marker key={p.id} position={[p.lat!, p.lng!]} icon={customIcon}>
                <Popup>
                  <div className="font-semibold">{p.name}</div>
                  {p.address && <div className="text-xs text-forest-700">{p.address}</div>}
                  <Link to={`/parcours/${p.id}`} className="text-copper-500 text-sm">
                    Details →
                  </Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {view === "list" && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/parcours/${p.id}`}
                className="card-interactive flex items-center gap-3"
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-forest-100 dark:bg-forest-800 flex items-center justify-center shrink-0">
                    <MapIcon size={24} className="text-forest-700" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.name}</div>
                  {p.address && (
                    <div className="text-sm text-forest-700 dark:text-forest-300 truncate">📍 {p.address}</div>
                  )}
                  {p.description && (
                    <div className="text-xs text-forest-700 dark:text-forest-300 line-clamp-1 mt-0.5">
                      {p.description}
                    </div>
                  )}
                </div>
                {p.is_public && <Globe size={14} className="text-copper-500 shrink-0" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
