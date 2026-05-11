import { api } from "./client";

export type Discipline = "3d_wa" | "3d_ifaa" | "3d_bowhunter" | "field_wa" | "simple";
export type BowType = "recurve" | "compound" | "barebow" | "traditional";
export type PegColor = "blue" | "red" | "yellow" | "white";

export type Shot = {
  id?: number;
  arrow_seq: number;
  zone: string | null;
  points: number;
};

export type Target = {
  id: number;
  target_index: number;
  animal_or_face: string | null;
  distance_m: number | null;
  notes: string | null;
  shots: Shot[];
  target_total: number;
};

export type Training = {
  id: number;
  started_at: string;
  ended_at: string | null;
  discipline: Discipline;
  bow_type: BowType;
  peg_color: PegColor | null;
  distance_marked: boolean | null;
  location: string | null;
  weather: string | null;
  notes: string | null;
  summary_score: number | null;
  total_score: number;
  targets?: Target[];
};

export type TrainingListItem = Omit<Training, "targets">;

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  "3d_wa": "3D · WA / DSB",
  "3d_ifaa": "3D · IFAA",
  "3d_bowhunter": "3D · Bowhunter",
  "field_wa": "Feldbogen · WA",
  "simple": "Einfach (nur Score)",
};

export const BOW_LABELS: Record<BowType, string> = {
  recurve: "Recurve",
  compound: "Compound",
  barebow: "Blank / Barebow",
  traditional: "Lang / Instinktiv / Trad",
};

export const PEG_LABELS: Record<PegColor, string> = {
  blue: "Blau (Visier)",
  red: "Rot (Trad / Blank)",
  yellow: "Gelb (Jugend)",
  white: "Weiß (Kinder / Anfänger)",
};

// Zonen-Definitionen pro Disziplin — für UI-Buttons
export type ZoneDef = { code: string; label: string; hint?: string };

export const ZONES_BY_DISCIPLINE: Record<Discipline, ZoneDef[]> = {
  "3d_wa": [
    { code: "X", label: "X", hint: "Center 11" },
    { code: "inner", label: "10" },
    { code: "outer", label: "8" },
    { code: "body", label: "5", hint: "Körper" },
    { code: "miss", label: "M", hint: "Fehl" },
  ],
  "3d_ifaa": [
    { code: "vital", label: "Vital", hint: "Kill" },
    { code: "body", label: "Wound", hint: "Körper" },
    { code: "miss", label: "M", hint: "Fehl" },
  ],
  "3d_bowhunter": [
    { code: "vital", label: "Vital" },
    { code: "body", label: "Wound" },
    { code: "miss", label: "M" },
  ],
  "field_wa": [
    { code: "X", label: "X", hint: "Center 6" },
    { code: "5", label: "5" },
    { code: "4", label: "4" },
    { code: "3", label: "3" },
    { code: "2", label: "2" },
    { code: "1", label: "1" },
    { code: "miss", label: "M" },
  ],
  simple: [],
};

export async function listTrainings(page = 1, limit = 20): Promise<{ trainings: TrainingListItem[]; total: number }> {
  return api(`/trainings?page=${page}&limit=${limit}`);
}

export async function createTraining(body: Partial<Training>): Promise<{ training: Training }> {
  return api(`/trainings`, { method: "POST", body: JSON.stringify(body) });
}

export async function getTraining(id: number): Promise<{ training: Training }> {
  return api(`/trainings/${id}`);
}

export async function updateTraining(id: number, body: Partial<Training>): Promise<{ training: Training }> {
  return api(`/trainings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteTraining(id: number): Promise<{ ok: true }> {
  return api(`/trainings/${id}`, { method: "DELETE" });
}

export async function upsertTarget(
  trainingId: number,
  body: {
    target_index: number;
    animal_or_face?: string | null;
    distance_m?: number | null;
    notes?: string | null;
    shots?: Array<{ arrow_seq: number; zone: string | null }>;
  }
): Promise<{ target: Target }> {
  return api(`/trainings/${trainingId}/targets`, { method: "POST", body: JSON.stringify(body) });
}

export async function deleteTarget(trainingId: number, targetId: number): Promise<{ ok: true }> {
  return api(`/trainings/${trainingId}/targets/${targetId}`, { method: "DELETE" });
}
