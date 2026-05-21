import { api, apiCached, apiSWR } from "./client";
import { tryUploadOrQueue, type UploadResult } from "../lib/uploadOutbox";

export type Parcours = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_path: string | null;
  image_url: string | null;
  is_public: boolean;
  // Stammdaten-Erweiterung (Sprint A)
  lanes_count: number | null;
  /** Anzahl Bahnen, die der Owner mit Detail-Daten (animal, distances, foto)
   *  über die Bahnen-Verwaltung erfasst hat. Aggregat aus parcours_lanes-Tabelle. */
  lanes_detailed_count: number;
  price_info: string | null;
  opening_hours: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  difficulty: number | null;       // 1..5
  terrain: string | null;           // comma-separated
  peg_blue: boolean;
  peg_red: boolean;
  peg_yellow: boolean;
  peg_white: boolean;
  duration_min: number | null;
  season_note: string | null;
  access_note: string | null;
  last_refresh_date: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  // Reviews-Aggregate
  review_count: number;
  avg_rating: number | null;
  // Ersteller (für Card + Detail-Anzeige)
  user_display_name: string | null;
  user_avatar_url: string | null;
};

export type ParcoursReview = {
  id: number;
  parcours_id: number;
  user_id: number;
  rating: number;        // 1..5
  comment: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export const TERRAIN_OPTIONS = ["wald", "huegel", "berg", "flach", "wiese", "felsen"] as const;
export type TerrainKey = (typeof TERRAIN_OPTIONS)[number];

export const TERRAIN_LABELS: Record<TerrainKey, string> = {
  wald:    "Wald",
  huegel:  "Hügel",
  berg:    "Berg",
  flach:   "Flach",
  wiese:   "Wiese",
  felsen:  "Felsen",
};

export type ParcoursListMode = "mine" | "public" | "all";

export async function listParcours(
  modeOrInclude: ParcoursListMode | boolean = "mine",
  onRefresh?: (fresh: { parcours: Parcours[] }) => void
): Promise<{ parcours: Parcours[] }> {
  // Legacy: boolean wird auf "all" / "mine" abgebildet
  const mode: ParcoursListMode =
    typeof modeOrInclude === "boolean" ? (modeOrInclude ? "all" : "mine") : modeOrInclude;
  const path = `/parcours?mode=${mode}`;
  return onRefresh ? apiSWR(path, onRefresh) : apiCached(path);
}

export async function getParcours(id: number): Promise<{ parcours: Parcours }> {
  return apiCached(`/parcours/${id}`);
}

export async function createParcours(body: Partial<Parcours>): Promise<{ parcours: Parcours }> {
  return api(`/parcours`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateParcours(id: number, body: Partial<Parcours>): Promise<{ parcours: Parcours }> {
  return api(`/parcours/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteParcours(id: number): Promise<{ ok: true }> {
  return api(`/parcours/${id}`, { method: "DELETE" });
}

/**
 * Bild hochladen mit Offline-Fallback — bei Netzfehler queuet die Datei
 * in upload_outbox und gibt {pending:true, pendingUrl} als blob: URL zurück.
 */
export async function uploadParcoursImage(id: number, file: File): Promise<UploadResult<{ image_url: string }>> {
  return tryUploadOrQueue<{ image_url: string }>({
    path: `/parcours/${id}/image`,
    file,
    filename: file.name,
    kind: "parcours_image",
    meta: { parcours_id: id },
  });
}

// ─── Bahnen (Parcours-Lanes) ──────────────────────────────────────────────

export type ParcoursLane = {
  id: number;
  parcours_id: number;
  lane_number: number;
  animal_description: string | null;
  distance_blue:   number | null;
  distance_red:    number | null;
  distance_yellow: number | null;
  distance_white:  number | null;
  notes: string | null;
  image_path: string | null;
  image_url:  string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ParcoursLaneInput = {
  lane_number: number;
  animal_description?: string | null;
  distance_blue?:   number | null;
  distance_red?:    number | null;
  distance_yellow?: number | null;
  distance_white?:  number | null;
  notes?: string | null;
  sort_order?: number;
};

export async function listParcoursLanes(parcoursId: number): Promise<{ lanes: ParcoursLane[] }> {
  return apiCached(`/parcours/${parcoursId}/lanes`);
}

export async function upsertParcoursLane(parcoursId: number, body: ParcoursLaneInput): Promise<{ lane: ParcoursLane }> {
  return api(`/parcours/${parcoursId}/lanes`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateParcoursLane(parcoursId: number, laneId: number, body: Partial<ParcoursLaneInput>): Promise<{ lane: ParcoursLane }> {
  return api(`/parcours/${parcoursId}/lanes/${laneId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteParcoursLane(parcoursId: number, laneId: number): Promise<{ ok: true }> {
  return api(`/parcours/${parcoursId}/lanes/${laneId}`, { method: "DELETE" });
}

export async function uploadParcoursLaneImage(
  parcoursId: number,
  laneId: number,
  file: File
): Promise<UploadResult<{ lane: ParcoursLane }>> {
  return tryUploadOrQueue<{ lane: ParcoursLane }>({
    path: `/parcours/${parcoursId}/lanes/${laneId}/image`,
    file,
    filename: file.name,
    kind: "parcours_lane_image",
    meta: { parcours_id: parcoursId, lane_id: laneId },
  });
}

export async function deleteParcoursLaneImage(parcoursId: number, laneId: number): Promise<{ lane: ParcoursLane }> {
  return api(`/parcours/${parcoursId}/lanes/${laneId}/image`, { method: "DELETE" });
}

// ─── Reviews ───────────────────────────────────────────────────────────────

export async function listParcoursReviews(parcoursId: number): Promise<{ reviews: ParcoursReview[] }> {
  return apiCached(`/parcours/${parcoursId}/reviews`);
}

export async function upsertParcoursReview(
  parcoursId: number,
  body: { rating: number; comment?: string | null }
): Promise<{ review: ParcoursReview }> {
  return api(`/parcours/${parcoursId}/reviews`, { method: "POST", body: JSON.stringify(body) });
}

export async function deleteParcoursReview(parcoursId: number, reviewId: number): Promise<{ ok: true }> {
  return api(`/parcours/${parcoursId}/reviews/${reviewId}`, { method: "DELETE" });
}

// ─── Clone (Vorlage übernehmen) ───────────────────────────────────────────

export async function cloneParcours(sourceId: number, name?: string): Promise<{ parcours: Parcours }> {
  return api(`/parcours/${sourceId}/clone`, {
    method: "POST",
    body: JSON.stringify(name ? { name } : {}),
  });
}
