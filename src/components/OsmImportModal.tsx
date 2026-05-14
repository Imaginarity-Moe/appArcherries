import { useEffect, useState } from "react";
import { Loader2, MapPin, X, Globe, Crosshair, Check, ExternalLink } from "lucide-react";
import { searchOsmArchery, haversine, type OsmParcours } from "../lib/overpass";
import { createParcours } from "../api/parcours";
import { reverseGeocode } from "../lib/geocode";

type Props = {
  onClose: () => void;
  onImported: (newParcoursId: number) => void;
};

const RADII = [10, 25, 50, 100, 200];

/**
 * Modal zur Suche existierender Bogensport-Locations in OpenStreetMap.
 * - Default: Standort des Users (Geolocation) oder Deutschland-Mitte als Fallback
 * - Radius einstellbar
 * - Liste der gefundenen Locations mit „Importieren"-Aktion
 * - 3D-Parcours (target_type=3d) sind oben sortiert
 */
export default function OsmImportModal({ onClose, onImported }: Props) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [centerLabel, setCenterLabel] = useState<string>("");
  const [radius, setRadius] = useState(50);
  const [results, setResults] = useState<OsmParcours[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  // Initial: Geolocation-Anfrage
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setCenter({ lat: 51.1657, lng: 10.4515 }); // Deutschland-Mitte
      setCenterLabel("Deutschland (Mitte)");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCenterLabel("Dein aktueller Standort");
      },
      () => {
        setCenter({ lat: 51.1657, lng: 10.4515 });
        setCenterLabel("Deutschland (Mitte) — Standort nicht freigegeben");
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  // Suche ausführen wenn center/radius sich ändert
  useEffect(() => {
    if (!center) return;
    const ctrl = new AbortController();
    setSearching(true);
    setError(null);
    searchOsmArchery(center.lat, center.lng, radius, ctrl.signal)
      .then((r) => setResults(r))
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
        setResults([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSearching(false);
      });
    return () => ctrl.abort();
  }, [center, radius]);

  const handleImport = async (item: OsmParcours) => {
    setImporting(item.osm_id);
    try {
      // Wenn keine Adresse aus OSM, dann via Reverse-Geocode nachholen
      let address = item.address;
      if (!address) {
        try {
          const r = await reverseGeocode(item.lat, item.lng);
          address = r?.display_name;
        } catch { /* ignore */ }
      }
      const created = await createParcours({
        name: item.name,
        description: item.is_3d ? "Aus OpenStreetMap importiert (3D-Parcours)." : "Aus OpenStreetMap importiert.",
        address: address ?? null,
        lat: item.lat,
        lng: item.lng,
        is_public: false,
        website: item.website ?? null,
        opening_hours: item.opening_hours ?? null,
        contact_phone: item.phone ?? null,
        contact_email: item.email ?? null,
      });
      onImported(created.parcours.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen");
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label="Schließen" tabIndex={-1} />
      <div className="relative w-full sm:max-w-lg bg-elevated rounded-3xl shadow-lift border border-hairline overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="display text-h3">Aus OpenStreetMap importieren</h2>
            <p className="text-xs text-muted mt-1">
              Community-pflegte Bogensport-Locations weltweit. 3D-Parcours sind markiert.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon -mt-1 -mr-1" aria-label="Schließen">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 pb-3 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <Crosshair size={14} strokeWidth={1.75} className="text-cherry-500" />
            <span className="text-secondary">Suchgebiet:</span>
            <span className="text-primary font-medium truncate">{centerLabel || "…"}</span>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1.5">Suchradius</label>
            <div className="flex gap-1.5 flex-wrap">
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`chip transition ${radius === r ? "bg-cherry-500 text-cream border-cherry-500" : ""}`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hairline" />

        {/* Ergebnisse */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {searching && (
            <div className="flex items-center justify-center gap-2 py-12 text-secondary">
              <Loader2 size={18} className="animate-spin" /> Suche in OpenStreetMap…
            </div>
          )}
          {!searching && error && (
            <div className="m-3 rounded-xl bg-cherry-50 dark:bg-cherry-900/30 border border-cherry-200 dark:border-cherry-800 text-cherry-700 dark:text-cherry-200 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          {!searching && !error && results.length === 0 && (
            <div className="text-center py-12 text-secondary text-sm px-6">
              Keine Bogensport-Locations im Umkreis von {radius} km gefunden.
              <br />
              <span className="text-muted">Versuch's mit einem größeren Radius.</span>
            </div>
          )}
          {!searching && results.length > 0 && (
            <ul className="space-y-1.5">
              {results.map((r) => {
                const distance = center ? haversine(center.lat, center.lng, r.lat, r.lng) : 0;
                const isImporting = importing === r.osm_id;
                return (
                  <li
                    key={r.osm_id}
                    className="rounded-xl bg-surface hover:bg-canvas border border-hairline px-3 py-2.5 flex items-center gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-primary truncate">{r.name}</span>
                        {r.is_3d && (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-cherry-500 text-cream rounded-full px-1.5 py-0.5">
                            3D
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-secondary mt-0.5">
                        <span>{distance.toFixed(1)} km</span>
                        {r.address && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin size={11} strokeWidth={1.75} /> {r.address}
                          </span>
                        )}
                      </div>
                      {(r.website || r.opening_hours) && (
                        <div className="flex items-center gap-3 text-xs text-muted mt-1">
                          {r.website && (
                            <a
                              href={r.website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 hover:text-cherry-500"
                            >
                              <Globe size={11} strokeWidth={1.75} /> Website
                            </a>
                          )}
                          <a
                            href={`https://www.openstreetmap.org/${r.type}/${r.osm_id.split("/")[1]}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-cherry-500"
                          >
                            <ExternalLink size={11} strokeWidth={1.75} /> OSM
                          </a>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleImport(r)}
                      disabled={isImporting}
                      className="btn-accent text-sm px-3 py-1.5 shrink-0 disabled:opacity-60"
                    >
                      {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />}
                      {isImporting ? "" : "Importieren"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-hairline text-xs text-muted">
          Daten von{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-cherry-500 hover:underline">
            OpenStreetMap-Mitwirkenden
          </a>{" "}
          unter ODbL-Lizenz.
        </div>
      </div>
    </div>
  );
}
