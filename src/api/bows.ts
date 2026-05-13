import { api, apiCached } from "./client";
import type { BowType } from "./trainings";

export type Bow = {
  id: number;
  name: string;
  bow_type: BowType;
  draw_weight_lbs: number | null;
  arrow_spine: string | null;
  sight_marks: string | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBows(): Promise<{ bows: Bow[] }> {
  return apiCached(`/bows`);
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
