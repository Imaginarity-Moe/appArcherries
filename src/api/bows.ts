import { api, apiCached, apiSWR, getToken } from "./client";
import type { BowType } from "./trainings";
import type { EquipmentKind } from "./equipment";

export type LinkedArrow = {
  id: number;
  name: string;
  manufacturer: string | null;
  model: string | null;
  spine: string | null;
};

export type LinkedEquipment = {
  id: number;
  kind: EquipmentKind;
  sub_kind: string | null;
  name: string;
  manufacturer: string | null;
  model: string | null;
  retired_at: string | null;
  is_active: boolean;
  role: string | null;
};

export type Bow = {
  id: number;
  name: string;
  bow_type: BowType;
  draw_weight_lbs: number | null;
  length_inch: number | null;
  brace_height_inch: number | null;
  let_off_percent: number | null;
  arrow_spine: string | null;
  sight_marks: string | null;
  notes: string | null;
  image_path: string | null;
  image_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  /** Verknüpfte Pfeil-Sets — nur in bow_detail enthalten */
  linked_arrows?: LinkedArrow[];
  /** Verknüpftes Zubehör — nur in bow_detail enthalten */
  linked_equipment?: LinkedEquipment[];
};

export async function listBows(onRefresh?: (fresh: { bows: Bow[] }) => void): Promise<{ bows: Bow[] }> {
  return onRefresh ? apiSWR(`/bows`, onRefresh) : apiCached(`/bows`);
}

export async function getBow(id: number): Promise<{ bow: Bow }> {
  return apiCached(`/bows/${id}`);
}

export async function createBow(body: Partial<Bow> & { arrow_ids?: number[] }): Promise<{ bow: Bow }> {
  return api(`/bows`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateBow(id: number, body: Partial<Bow> & { arrow_ids?: number[] }): Promise<{ bow: Bow }> {
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

// ─── Bow ↔ Equipment-Verknüpfungen ────────────────────────────────────────

export async function addBowEquipment(
  bowId: number,
  body: { equipment_item_id: number; role?: string | null }
): Promise<{ bow: Bow }> {
  return api(`/bows/${bowId}/equipment`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateBowEquipment(
  bowId: number,
  equipmentId: number,
  body: { role?: string | null }
): Promise<{ bow: Bow }> {
  return api(`/bows/${bowId}/equipment/${equipmentId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function removeBowEquipment(bowId: number, equipmentId: number): Promise<{ bow: Bow }> {
  return api(`/bows/${bowId}/equipment/${equipmentId}`, { method: "DELETE" });
}
