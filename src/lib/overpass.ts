/**
 * OpenStreetMap Overpass API — community-pflegte 3D-Parcours abfragen.
 * Kostenlos, weltweit, ohne API-Key.
 *
 * Rate-Limits: ~10000 Anfragen/Tag pro IP, max 25s pro Query.
 * Manche Endpoints sind zeitweise down — wir nutzen den main + Fallbacks.
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export type OsmParcours = {
  /** "node/123" oder "way/456" — eindeutige OSM-ID */
  osm_id: string;
  type: "node" | "way";
  name: string;
  lat: number;
  lng: number;
  /** Reine Tags zur Filterung im UI (target_type, fee, sport etc.) */
  tags: Record<string, string>;
  address?: string;
  website?: string;
  opening_hours?: string;
  phone?: string;
  email?: string;
  /** target_type=3d → primärer 3D-Parcours; sonst allgemein Bogensport */
  is_3d: boolean;
};

/**
 * Sucht 3D-Parcours (und allgemeine Bogensport-Locations als Fallback) im Umkreis.
 *
 * @param centerLat
 * @param centerLng
 * @param radiusKm  Suchradius in km (default 50)
 */
export async function searchOsmArchery(
  centerLat: number,
  centerLng: number,
  radiusKm = 50,
  signal?: AbortSignal
): Promise<OsmParcours[]> {
  const radius = Math.round(radiusKm * 1000);
  const query = `
    [out:json][timeout:25];
    (
      node(around:${radius},${centerLat},${centerLng})["sport"="archery"]["target_type"="3d"];
      way(around:${radius},${centerLat},${centerLng})["sport"="archery"]["target_type"="3d"];
      node(around:${radius},${centerLat},${centerLng})["sport"="archery"];
      way(around:${radius},${centerLat},${centerLng})["sport"="archery"];
    );
    out center tags;
  `.trim();

  let lastErr: unknown = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        signal,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements: OsmElement[] };
      return parseAndDedupe(json.elements);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
      // nächsten Endpoint probieren
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Overpass-Anfrage fehlgeschlagen");
}

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function parseAndDedupe(elements: OsmElement[]): OsmParcours[] {
  const map = new Map<string, OsmParcours>();
  for (const el of elements) {
    if (el.type !== "node" && el.type !== "way") continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const tags = el.tags ?? {};
    const name = tags["name"] || tags["operator"] || tags["club"] || "(unbenannt)";
    const isTargetType3d = (tags["target_type"] ?? "").toLowerCase() === "3d";
    const key = `${el.type}/${el.id}`;
    if (map.has(key)) continue;
    map.set(key, {
      osm_id:        key,
      type:          el.type,
      name,
      lat,
      lng,
      tags,
      address:       formatOsmAddress(tags),
      website:       tags["website"] || tags["contact:website"] || undefined,
      opening_hours: tags["opening_hours"] || undefined,
      phone:         tags["phone"] || tags["contact:phone"] || undefined,
      email:         tags["email"] || tags["contact:email"] || undefined,
      is_3d:         isTargetType3d,
    });
  }
  // 3D-Parcours zuerst, dann allgemeine Bogensport-Spots
  return [...map.values()].sort((a, b) => Number(b.is_3d) - Number(a.is_3d));
}

function formatOsmAddress(tags: Record<string, string>): string | undefined {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const cityZip = [tags["addr:postcode"], tags["addr:city"] || tags["addr:village"]].filter(Boolean).join(" ");
  const parts = [street, cityZip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** Euklidische Distanz in km (für UI-Anzeige — schnell und genau genug bei kleinem Radius). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
