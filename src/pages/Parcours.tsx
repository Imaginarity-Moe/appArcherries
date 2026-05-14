import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, List as ListIcon, Map as MapIcon, Globe, Download, Star, Search, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { listParcours, type Parcours, type ParcoursListMode } from "../api/parcours";
import FavoriteButton from "../components/FavoriteButton";
import Avatar from "../components/Avatar";
import { useAuth } from "../auth/AuthContext";

const OsmImportModal = lazy(() => import("../components/OsmImportModal"));

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
  const nav = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const [items, setItems] = useState<Parcours[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [mode, setMode] = useState<ParcoursListMode>("mine");
  const [query, setQuery] = useState("");
  const [showOsmImport, setShowOsmImport] = useState(false);

  useEffect(() => {
    setLoading(true);
    listParcours(mode)
      .then((r) => setItems(r.parcours))
      .finally(() => setLoading(false));
  }, [mode]);

  // Suchfilter — pures clientseitiges Filtering nach Name + Adresse
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((p) =>
      [p.name, p.address, p.user_display_name].some((s) => (s ?? "").toLowerCase().includes(q))
    );
  }, [items, query]);

  const withGeo = filtered.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold">{t("parcours:title")}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowOsmImport(true)} className="btn-secondary text-sm">
            <Download size={15} strokeWidth={1.75} /> Aus OSM
          </button>
          <Link to="/parcours/new" className="btn">
            <Plus size={18} /> {t("parcours:new")}
          </Link>
        </div>
      </div>

      {showOsmImport && (
        <Suspense fallback={null}>
          <OsmImportModal
            onClose={() => setShowOsmImport(false)}
            onImported={(id) => {
              setShowOsmImport(false);
              nav(`/parcours/${id}/edit`);
            }}
          />
        </Suspense>
      )}

      {/* Tab-Switcher: Eigene / Öffentlich / Alle */}
      <div className="flex rounded-xl bg-surface p-1 w-full">
        <TabBtn label="Meine" active={mode === "mine"}   onClick={() => setMode("mine")} />
        <TabBtn label="Öffentliche" icon={<Globe size={14} strokeWidth={1.75} />} active={mode === "public"} onClick={() => setMode("public")} />
        <TabBtn label="Alle"  active={mode === "all"}    onClick={() => setMode("all")} />
      </div>

      {/* View + Suche */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-xl bg-surface p-1">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
              view === "list" ? "bg-elevated text-primary shadow-card" : "text-secondary hover:text-primary"
            }`}
            aria-label={t("parcours:map.show_list")}
          >
            <ListIcon size={16} /> <span className="hidden sm:inline">{t("parcours:map.show_list")}</span>
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition ${
              view === "map" ? "bg-elevated text-primary shadow-card" : "text-secondary hover:text-primary"
            }`}
            aria-label={t("parcours:map.show_map")}
          >
            <MapIcon size={16} /> <span className="hidden sm:inline">{t("parcours:map.show_map")}</span>
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen…"
            className="input pl-9 pr-8 py-1.5 text-sm w-full"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-primary"
              aria-label="Suche leeren"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-secondary">{t("common:actions.loading")}</p>}

      {!loading && filtered.length === 0 && (
        <div className="card text-center py-10">
          {query && items.length > 0 ? (
            <p className="text-secondary">Keine Treffer für „{query}"</p>
          ) : mode === "public" ? (
            <p className="text-secondary">Noch keine öffentlichen Parcours von anderen Usern.</p>
          ) : (
            <>
              <p className="text-secondary mb-4">{t("parcours:empty_state")}</p>
              <Link to="/parcours/new" className="btn inline-flex">
                <Plus size={18} /> {t("parcours:create_cta")}
              </Link>
            </>
          )}
        </div>
      )}

      {view === "map" && withGeo.length > 0 && (
        <div className="card overflow-hidden p-0 isolate" style={{ height: 480 }}>
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

      {view === "list" && filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const isMine = currentUserId !== null && p.user_id === currentUserId;
            return (
              <li key={p.id} className="relative">
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
                    <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shrink-0">
                      <MapIcon size={24} className="text-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pr-7">
                    <div className="font-semibold truncate flex items-center gap-2">
                      <span className="truncate">{p.name}</span>
                      {p.is_public && <Globe size={14} className="text-cherry-500 shrink-0" />}
                    </div>
                    {p.address && (
                      <div className="text-sm text-secondary truncate">📍 {p.address}</div>
                    )}
                    {/* Ersteller-Zeile — sichtbar bei fremden öffentlichen Parcours */}
                    {!isMine && p.user_display_name && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
                        <Avatar
                          user={{ display_name: p.user_display_name, avatar_url: p.user_avatar_url }}
                          size="xs"
                        />
                        <span className="truncate">von {p.user_display_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      {p.review_count > 0 && p.avg_rating !== null && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} strokeWidth={1.5} className="fill-cherry-500 text-cherry-500" />
                          <span className="tabular-nums font-semibold text-secondary">{p.avg_rating.toFixed(1)}</span>
                          <span>({p.review_count})</span>
                        </span>
                      )}
                      {p.lanes_count !== null && (
                        <span>{p.lanes_count} Bahnen</span>
                      )}
                    </div>
                  </div>
                </Link>
                {/* Stern in der oberen rechten Ecke der Karte */}
                <div className="absolute top-2 right-2">
                  <FavoriteButton kind="parcours" refValue={String(p.id)} size="md" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TabBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-cherry-500 text-cream shadow-cherry"
          : "text-secondary hover:text-primary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
