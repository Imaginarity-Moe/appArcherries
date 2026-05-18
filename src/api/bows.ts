import { api, apiCached, getToken } from "./client";
import type { BowType } from "./trainings";

export type Bow = {
  id: number;
  name: string;
  bow_type: BowType;
  draw_weight_lbs: number | null;
  arrow_spine: string | null;
  sight_marks: string | null;
  notes: string | null;
  image_path: string | null;
  image_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBows(): Promise<{ bows: Bow[] }> {
  return apiCached(`/bows`);
}

export async function getBow(id: number): Promise<{ bow: Bow }> {
  return apiCached(`/bows/${id}`);
}

export async function createBow(body: Partial<Bow>): Promise<{ bow: Bow }> {
  return api(`/bows`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateBow(id: number, body: Partial<Bow>): Promise<{ bow: Bow }> {
  return api(`/bows/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteBow(id: number): Promise<{ ok: true }> {
  return api(`/bows/${id}`, { method: "DELETE" });
}

export async function uploadBowImage(id: number, file: File): Promise<{ bow: Bow }> {
  const fd = new FormData();
  fd.append("file", file);
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
  const res = await fetch(`${base}/bows/${id}/image`, {
    method: "POST",
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function deleteBowImage(id: number): Promise<{ bow: Bow }> {
  return api(`/bows/${id}/image`, { method: "DELETE" });
}
