import { api, apiCached, getToken } from "./client";
import { getCached, mutateCached, setCached, invalidateCache } from "../lib/cache";
import { enqueue } from "../lib/outbox";
import { isNetworkError } from "../lib/sync";
import { db } from "../lib/db";
import { scoreTarget } from "../lib/scoringPreview";

export type Discipline =
  | "3d_wa"
  | "3d_ifaa"
  | "3d_ifaa_hunter"
  | "3d_ifaa_animal"
  | "3d_bowhunter"
  | "field_wa"
  | "field_ifaa"
  | "simple"
  | "target_practice";
export type ScoringMode = "points" | "legs" | "sets";
export type BowType = "recurve" | "compound" | "barebow" | "traditional";
export type PegColor = "blue" | "red" | "yellow" | "white";

export type Shot = {
  id?: number;
  arrow_seq: number;
  zone: string | null;
  points: number;
  /** Normalisierte Position auf dem Stations-Foto (0..1). Null = nicht markiert. */
  x_norm?: number | null;
  y_norm?: number | null;
};

export type Target = {
  id: number;
  participant_id?: number;
  target_index: number;
  animal_or_face: string | null;
  distance_m: number | null;
  notes: string | null;
  image_path: string | null;
  shots: Shot[];
  target_total: number;
};

export type Participant = {
  id: number;
  user_id: number;
  display_name: string;
  user_role: string;
  role: "owner" | "scorer" | "viewer";
  joined_at: string;
  total_score: number;
  is_self: boolean;
};

export type Training = {
  id: number | string; // string = lokale temp-ID ("tmp_…")
  started_at: string;
  ended_at: string | null;
  discipline: Discipline;
  nfaa_mode?: boolean;
  bow_type: BowType;
  bow_id?: number | null;
  bow_name?: string | null;
  peg_color: PegColor | null;
  distance_marked: boolean | null;
  location: string | null;
  weather: string | null;
  notes: string | null;
  summary_score: number | null;
  published_to_highscore?: boolean;
  total_score: number;
  parcours_id: number | null;
  parcours_name?: string | null;
  /** Geplante Gesamt-Bahnenzahl des verknüpften Parcours, für Grid/Counter im TrainingDetail */
  parcours_lanes_count?: number | null;
  // target_practice-Konfiguration (nur bei discipline="target_practice" gesetzt)
  arrows_per_end?: number | null;
  num_ends?: number | null;
  target_distance_m?: number | null;
  target_rings?: number | null;
  scoring_mode?: ScoringMode | null;
  legs_to_win?: number | null;
  sets_to_win?: number | null;
  targets?: Target[];
  participants?: Participant[];
  is_owner?: boolean;
  my_participant_id?: number | null;
};

export type TrainingListItem = Omit<Training, "targets"> & {
  is_shared?: boolean;
  owner_user_id?: number;
  bow_name?: string | null;
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  "3d_wa":          "3D · WA / DSB",
  "3d_ifaa":        "3D · IFAA Standard",
  "3d_ifaa_hunter": "3D · IFAA Hunter",
  "3d_ifaa_animal": "3D · IFAA Animal",
  "3d_bowhunter":   "3D · Bowhunter (Liga)",
  "field_wa":       "Feldbogen · WA",
  "field_ifaa":     "Feldbogen · IFAA",
  "simple":         "Einfach (nur Score)",
  "target_practice": "Scheibenschießen",
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
    { code: "X",     label: "X",  hint: "Center 11" },
    { code: "inner", label: "10" },
    { code: "outer", label: "8" },
    { code: "body",  label: "5",  hint: "Körper" },
    { code: "miss",  label: "M",  hint: "Fehl" },
  ],
  // IFAA Standard 3D — drei Trefferzonen
  "3d_ifaa": [
    { code: "inner_kill", label: "Inner Kill", hint: "Innerstes Kill" },
    { code: "outer_kill", label: "Outer Kill", hint: "Äußerer Kill" },
    { code: "wound",      label: "Wound",      hint: "Körper" },
    { code: "miss",       label: "M",          hint: "Fehl" },
  ],
  // IFAA Hunter — 1 Pfeil, drei Trefferzonen
  "3d_ifaa_hunter": [
    { code: "inner_kill", label: "Inner Kill", hint: "20" },
    { code: "outer_kill", label: "Outer Kill", hint: "17" },
    { code: "wound",      label: "Wound",      hint: "10" },
    { code: "miss",       label: "M",          hint: "Fehl" },
  ],
  // IFAA Animal — Kill / Wound (NFAA-Toggle gibt +1)
  "3d_ifaa_animal": [
    { code: "vital", label: "Kill",  hint: "Vital" },
    { code: "wound", label: "Wound", hint: "Körper" },
    { code: "miss",  label: "M",     hint: "Fehl" },
  ],
  "3d_bowhunter": [
    { code: "vital", label: "Kill" },
    { code: "wound", label: "Wound" },
    { code: "miss",  label: "M" },
  ],
  "field_wa": [
    { code: "X",    label: "X", hint: "Tie-Break" },
    { code: "6",    label: "6" },
    { code: "5",    label: "5" },
    { code: "4",    label: "4" },
    { code: "3",    label: "3" },
    { code: "2",    label: "2" },
    { code: "1",    label: "1" },
    { code: "miss", label: "M" },
  ],
  "field_ifaa": [
    { code: "5",    label: "5", hint: "Zentrum" },
    { code: "4",    label: "4" },
    { code: "3",    label: "3" },
    { code: "miss", label: "M" },
  ],
  simple: [],
  target_practice: [], // Pad rendert dynamische Ringe — keine festen Zonen-Buttons
};

const trainingPath = (id: number | string) => `/trainings/${id}`;

function tempId(): string {
  return `tmp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Wenn id eine temp-ID ist, zur echten Server-ID auflösen (nach Sync). */
export async function resolveId(id: number | string): Promise<number | string> {
  if (typeof id === "number") return id;
  if (!id.startsWith("tmp_")) return id;
  const conn = await db();
  const mapping = await conn.get("id_map", id);
  return mapping ? mapping.realId : id;
}

// ============================================================
// READS
// ============================================================

export async function listTrainings(page = 1, limit = 20): Promise<{ trainings: TrainingListItem[]; total: number }> {
  return apiCached(`/trainings?page=${page}&limit=${limit}`);
}

export async function getTraining(id: number | string): Promise<{ training: Training }> {
  const resolved = await resolveId(id);
  return apiCached(trainingPath(resolved));
}

// ============================================================
// WRITES
// ============================================================

export async function createTraining(body: Partial<Training> & {
  start_lane?: number;
  arrows_per_end?: number;
  num_ends?: number;
  target_distance_m?: number;
  target_rings?: number;
  scoring_mode?: ScoringMode;
  legs_to_win?: number;
  sets_to_win?: number;
}): Promise<{ training: Training }> {
  if (navigator.onLine) {
    try {
      const r = await api<{ training: Training }>(`/trainings`, { method: "POST", body: JSON.stringify(body) });
      await setCached(trainingPath(r.training.id), r);
      await invalidateCache(/^\/trainings\?/);
      return r;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  // Offline-Pfad: temp-ID erzeugen, optimistisch cachen, in Outbox queuen
  const tid = tempId();
  const optimistic: Training = {
    id: tid,
    started_at: new Date().toISOString(),
    ended_at: null,
    discipline: (body.discipline as Discipline) ?? "3d_wa",
    bow_type: (body.bow_type as BowType) ?? "recurve",
    peg_color: body.peg_color ?? null,
    distance_marked: body.distance_marked ?? null,
    location: body.location ?? null,
    weather: body.weather ?? null,
    notes: body.notes ?? null,
    summary_score: null,
    total_score: 0,
    parcours_id: body.parcours_id ?? null,
    targets: [],
  };
  await setCached(trainingPath(tid), { training: optimistic });
  await enqueue({ method: "POST", path: "/trainings", body: { ...body, tempId: tid } });
  return { training: optimistic };
}

export async function updateTraining(id: number | string, body: Partial<Training>): Promise<{ training: Training }> {
  const resolved = await resolveId(id);
  if (navigator.onLine && typeof resolved === "number") {
    try {
      const r = await api<{ training: Training }>(trainingPath(resolved), { method: "PATCH", body: JSON.stringify(body) });
      await setCached(trainingPath(resolved), r);
      await invalidateCache(/^\/trainings\?/);
      return r;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  // Offline / temp-ID: Cache patchen, queuen
  await mutateCached<{ training: Training }>(trainingPath(resolved), (curr) => ({
    training: { ...curr.training, ...body },
  }));
  await enqueue({ method: "PATCH", path: trainingPath(resolved), body });
  const cached = await getCached<{ training: Training }>(trainingPath(resolved));
  return cached ?? { training: { ...(body as Training), id: resolved } };
}

export async function deleteTraining(id: number | string): Promise<{ ok: true }> {
  const resolved = await resolveId(id);
  if (navigator.onLine && typeof resolved === "number") {
    try {
      await api(trainingPath(resolved), { method: "DELETE" });
      await invalidateCache(trainingPath(resolved));
      await invalidateCache(/^\/trainings\?/);
      return { ok: true };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  // Offline: aus Caches entfernen + queuen
  await invalidateCache(trainingPath(resolved));
  await invalidateCache(/^\/trainings\?/);
  if (typeof resolved === "number") {
    await enqueue({ method: "DELETE", path: trainingPath(resolved), body: null });
  }
  return { ok: true };
}

type UpsertTargetBody = {
  target_index: number;
  animal_or_face?: string | null;
  distance_m?: number | null;
  notes?: string | null;
  shots?: Array<{ arrow_seq: number; zone: string | null; x_norm?: number | null; y_norm?: number | null }>;
  /** Owner-only: scort für anderen Participant (z.B. Gast ohne Account) */
  for_participant_id?: number;
};

export async function upsertTarget(
  trainingId: number | string,
  body: UpsertTargetBody
): Promise<{ target: Target }> {
  const resolved = await resolveId(trainingId);
  if (navigator.onLine && typeof resolved === "number") {
    try {
      const r = await api<{ target: Target }>(`/trainings/${resolved}/targets`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      // Cache des Trainings invalidieren — wird beim nächsten Aufruf neu geholt
      await invalidateCache(trainingPath(resolved));
      return r;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  // Offline-Pfad: optimistisches Update + queue
  const cached = await getCached<{ training: Training }>(trainingPath(resolved));
  const discipline = cached?.training.discipline ?? "3d_wa";
  const nfaa = !!cached?.training.nfaa_mode;
  const scored = scoreTarget(discipline, body.shots ?? [], nfaa);
  const targetTotal = scored.reduce((s, sh) => s + sh.points, 0);

  if (cached) {
    const targets = cached.training.targets ?? [];
    const idx = targets.findIndex((t) => t.target_index === body.target_index);
    const optimisticTarget: Target = {
      id: idx >= 0 ? targets[idx].id : -body.target_index, // temp negative id
      target_index: body.target_index,
      animal_or_face: body.animal_or_face ?? (idx >= 0 ? targets[idx].animal_or_face : null),
      distance_m: body.distance_m ?? (idx >= 0 ? targets[idx].distance_m : null),
      notes: body.notes ?? (idx >= 0 ? targets[idx].notes : null),
      image_path: idx >= 0 ? targets[idx].image_path : null,
      shots: scored.map((s, i) => {
        const orig = (body.shots ?? []).find((b) => b.arrow_seq === s.arrow_seq);
        return {
          id: -(i + 1),
          arrow_seq: s.arrow_seq,
          zone: s.zone,
          points: s.points,
          x_norm: orig?.x_norm ?? null,
          y_norm: orig?.y_norm ?? null,
        };
      }),
      target_total: targetTotal,
    };
    const nextTargets = idx >= 0
      ? targets.map((t, i) => (i === idx ? optimisticTarget : t))
      : [...targets, optimisticTarget];
    const totalScore = nextTargets.reduce((s, t) => s + t.target_total, 0);
    await setCached(trainingPath(resolved), {
      training: { ...cached.training, targets: nextTargets, total_score: totalScore },
    });
  }
  await enqueue({ method: "POST", path: `/trainings/${resolved}/targets`, body });

  // Optimistische Response
  return {
    target: {
      id: -body.target_index,
      target_index: body.target_index,
      animal_or_face: body.animal_or_face ?? null,
      distance_m: body.distance_m ?? null,
      notes: body.notes ?? null,
      image_path: null,
      shots: scored.map((s, i) => {
        const orig = (body.shots ?? []).find((b) => b.arrow_seq === s.arrow_seq);
        return {
          id: -(i + 1),
          arrow_seq: s.arrow_seq,
          zone: s.zone,
          points: s.points,
          x_norm: orig?.x_norm ?? null,
          y_norm: orig?.y_norm ?? null,
        };
      }),
      target_total: targetTotal,
    },
  };
}

export async function deleteTarget(trainingId: number | string, targetId: number): Promise<{ ok: true }> {
  const resolved = await resolveId(trainingId);
  if (navigator.onLine && typeof resolved === "number" && targetId > 0) {
    try {
      await api(`/trainings/${resolved}/targets/${targetId}`, { method: "DELETE" });
      await invalidateCache(trainingPath(resolved));
      return { ok: true };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  // Offline: Cache aktualisieren + queuen (nur bei positiver/echter target id)
  await mutateCached<{ training: Training }>(trainingPath(resolved), (curr) => {
    const nextTargets = (curr.training.targets ?? []).filter((t) => t.id !== targetId);
    const totalScore = nextTargets.reduce((s, t) => s + t.target_total, 0);
    return { training: { ...curr.training, targets: nextTargets, total_score: totalScore } };
  });
  if (typeof resolved === "number" && targetId > 0) {
    await enqueue({ method: "DELETE", path: `/trainings/${resolved}/targets/${targetId}`, body: null });
  }
  return { ok: true };
}

// ============================================================
// IMAGE UPLOAD (online-only — binary uploads bypassen die Outbox)
// ============================================================

export async function uploadTargetImage(
  trainingId: number | string,
  targetId: number,
  file: File
): Promise<{ image_path: string; image_url: string }> {
  const resolved = await resolveId(trainingId);
  if (typeof resolved !== "number" || targetId <= 0) {
    throw new Error("Bilder können nur für gespeicherte Stationen hochgeladen werden");
  }
  const fd = new FormData();
  fd.append("file", file);
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/index.php";
  const token = getToken();
  const res = await fetch(`${base}/trainings/${resolved}/targets/${targetId}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload fehlgeschlagen: ${res.status}`);
  return res.json();
}

export async function deleteTargetImage(trainingId: number | string, targetId: number): Promise<{ ok: true }> {
  const resolved = await resolveId(trainingId);
  return api(`/trainings/${resolved}/targets/${targetId}/image`, { method: "DELETE" });
}
