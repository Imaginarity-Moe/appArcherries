import { api, getToken } from "./client";

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
  created_at: string;
  updated_at: string;
};

export async function listParcours(includePublic = false): Promise<{ parcours: Parcours[] }> {
  return api(`/parcours${includePublic ? "?include_public=1" : ""}`);
}

export async function getParcours(id: number): Promise<{ parcours: Parcours }> {
  return api(`/parcours/${id}`);
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
 * Bild hochladen via FormData — direkter Aufruf, nicht über api() (das macht nur JSON).
 */
export async function uploadParcoursImage(id: number, file: File): Promise<{ image_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
  const res = await fetch(`${base}/parcours/${id}/image`, {
    method: "POST",
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
