import { api, apiCached, getToken } from "./client";

export type ArrowMaterial = "carbon" | "aluminium" | "carbon_aluminium" | "wood" | "fiberglass";
export type FletchingType = "natural" | "vane" | "spin_vane";
export type NockType      = "press_fit" | "pin" | "other";
export type TipType       = "field" | "target" | "bullet" | "broadhead";

export const MATERIAL_LABELS: Record<ArrowMaterial, string> = {
  carbon: "Carbon",
  aluminium: "Aluminium",
  carbon_aluminium: "Carbon-Aluminium",
  wood: "Holz",
  fiberglass: "Fiberglas",
};
export const FLETCHING_LABELS: Record<FletchingType, string> = {
  natural: "Naturfeder",
  vane: "Plastik-Vane",
  spin_vane: "Spin-Vane",
};
export const NOCK_LABELS: Record<NockType, string> = {
  press_fit: "Press-fit",
  pin: "Pin-Nock",
  other: "Anders",
};
export const TIP_LABELS: Record<TipType, string> = {
  field: "Field-Tip",
  target: "Target",
  bullet: "Bullet",
  broadhead: "Broadhead (Jagd)",
};

export type LinkedBow = { id: number; name: string; bow_type: string };

export type Arrow = {
  id: number;
  name: string;
  manufacturer: string | null;
  model: string | null;

  material: ArrowMaterial | null;
  diameter_mm: number | null;
  spine: string | null;
  length_inch: number | null;
  gpi: number | null;

  fletching_type: FletchingType | null;
  fletching_length_inch: number | null;
  fletching_count: number | null;
  fletching_helix: boolean | null;
  fletching_colors: string | null;

  nock_type: NockType | null;
  nock_manufacturer: string | null;
  nock_color: string | null;

  tip_type: TipType | null;
  tip_weight_grains: number | null;
  tip_manufacturer: string | null;
  tip_replaceable: boolean | null;

  count_total: number | null;
  count_broken: number;
  count_lost: number;
  purchased_at: string | null;
  price_per_arrow_cents: number | null;

  notes: string | null;
  image_path: string | null;
  image_url: string | null;
  is_default: boolean;

  created_at: string;
  updated_at: string;

  // nur in arrow_detail enthalten
  linked_bows?: LinkedBow[];
};

export async function listArrows(): Promise<{ arrows: Arrow[] }> {
  return apiCached(`/arrows`);
}

export async function getArrow(id: number): Promise<{ arrow: Arrow }> {
  return apiCached(`/arrows/${id}`);
}

export async function createArrow(body: Partial<Arrow> & { bow_ids?: number[] }): Promise<{ arrow: Arrow }> {
  return api(`/arrows`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateArrow(id: number, body: Partial<Arrow> & { bow_ids?: number[] }): Promise<{ arrow: Arrow }> {
  return api(`/arrows/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteArrow(id: number): Promise<{ ok: true }> {
  return api(`/arrows/${id}`, { method: "DELETE" });
}

export async function uploadArrowImage(id: number, file: File): Promise<{ arrow: Arrow }> {
  const fd = new FormData();
  fd.append("file", file);
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
  const res = await fetch(`${base}/arrows/${id}/image`, {
    method: "POST",
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function deleteArrowImage(id: number): Promise<{ arrow: Arrow }> {
  return api(`/arrows/${id}/image`, { method: "DELETE" });
}
