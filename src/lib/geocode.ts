/**
 * Nominatim (OpenStreetMap) — kostenlose Geocoding-API.
 * Usage-Policy: max 1 req/sec, eindeutiger User-Agent / Referer.
 *
 * Wir senden NUR vom Browser direkt — Nominatim sieht den Referer.
 * Für Bulk-Queries müsste man auf einen eigenen Tile-Server umsteigen.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export type GeocodeResult = {
  display_name: string;
  lat: number;
  lng: number;
  /** Strukturierte Adress-Bestandteile, je nach OSM-Daten unterschiedlich gefüllt */
  address: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
};

/** Adress-Suche → Vorschläge. Gibt bis zu 5 Treffer zurück. */
export async function searchAddresses(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "de,en" },
    signal,
  });
  if (!res.ok) throw new Error(`Nominatim search: ${res.status}`);
  const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string; address?: GeocodeResult["address"] }>;
  return json.map((r) => ({
    display_name: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    address: r.address ?? {},
  }));
}

/** Reverse-Geocode: lat/lng → Adresse */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "de,en" },
    signal,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { display_name?: string; lat?: string; lon?: string; address?: GeocodeResult["address"] };
  if (!json.display_name) return null;
  return {
    display_name: json.display_name,
    lat: parseFloat(json.lat ?? String(lat)),
    lng: parseFloat(json.lon ?? String(lng)),
    address: json.address ?? {},
  };
}

/** Kurzformat für UI: "Straße HausNr, PLZ Stadt" */
export function formatAddress(a: GeocodeResult["address"]): string {
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const cityZip = [a.postcode, a.city || a.town || a.village].filter(Boolean).join(" ");
  return [street, cityZip].filter(Boolean).join(", ");
}
