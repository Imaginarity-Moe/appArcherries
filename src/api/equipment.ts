import { api, apiCached, apiSWR } from "./client";

export type EquipmentKind = "string" | "tab" | "release" | "other";

export const EQUIPMENT_KIND_LABELS: Record<EquipmentKind, string> = {
  string: "Sehne",
  tab: "Tab / Handschuh",
  release: "Release",
  other: "Sonstiges",
};

export type EquipmentItem = {
  id: number;
  kind: EquipmentKind;
  sub_kind: string | null;
  name: string;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
  image_path: string | null;
  purchase_url: string | null;
  purchased_at: string | null;
  price_cents: number | null;
  retired_at: string | null;
  is_active: boolean;
  specs: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type EquipmentEventKind = "broken" | "lost" | "service" | "added" | "retired";

export const EQUIPMENT_EVENT_LABELS: Record<EquipmentEventKind, string> = {
  broken: "Defekt / gerissen",
  lost: "Verloren",
  service: "Wartung / Service",
  added: "Nachgekauft",
  retired: "Außer Dienst",
};

export type EquipmentEvent = {
  id: number;
  kind: EquipmentEventKind;
  occurred_at: string;
  notes: string | null;
  created_at: string;
};

export async function listEquipment(
  kind?: EquipmentKind,
  onRefresh?: (fresh: { items: EquipmentItem[] }) => void
): Promise<{ items: EquipmentItem[] }> {
  const path = kind ? `/equipment?kind=${kind}` : `/equipment`;
  return onRefresh ? apiSWR(path, onRefresh) : apiCached(path);
}

export async function getEquipment(id: number): Promise<{ item: EquipmentItem }> {
  return apiCached(`/equipment/${id}`);
}

export async function createEquipment(body: Partial<EquipmentItem> & { kind: EquipmentKind; name: string }): Promise<{ item: EquipmentItem }> {
  return api(`/equipment`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateEquipment(id: number, body: Partial<EquipmentItem>): Promise<{ item: EquipmentItem }> {
  return api(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteEquipment(id: number): Promise<{ ok: true }> {
  return api(`/equipment/${id}`, { method: "DELETE" });
}

export async function listEquipmentEvents(id: number): Promise<{ events: EquipmentEvent[] }> {
  return api(`/equipment/${id}/events`);
}

export async function createEquipmentEvent(
  id: number,
  body: { kind: EquipmentEventKind; occurred_at?: string; notes?: string | null }
): Promise<{ events: EquipmentEvent[] }> {
  return api(`/equipment/${id}/events`, { method: "POST", body: JSON.stringify(body) });
}

export async function deleteEquipmentEvent(id: number, eventId: number): Promise<{ events: EquipmentEvent[] }> {
  return api(`/equipment/${id}/events/${eventId}`, { method: "DELETE" });
}
