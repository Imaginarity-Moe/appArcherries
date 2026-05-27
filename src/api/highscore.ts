import { apiCached } from "./client";
import type { BowType, Discipline } from "./trainings";

export type HighscoreEntry = {
  training_id: number;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bow_type: BowType;
  score: number;
  started_at: string;
};

export type HighscoreGroup = {
  discipline: Discipline;
  bow_type: BowType;
  scores: HighscoreEntry[];
};

export type HighscorePeriod = "month" | "year" | "all";

export type HighscoreScope =
  | { kind: "global" }
  | { kind: "friends" }
  | { kind: "club"; club_id: number };

export async function listHighscores(
  parcoursId: number,
  scope: HighscoreScope | boolean = { kind: "global" },
  period: HighscorePeriod = "all"
): Promise<{ groups: HighscoreGroup[]; period: HighscorePeriod }> {
  // Legacy: boolean = friends_only
  const resolved: HighscoreScope =
    typeof scope === "boolean"
      ? scope ? { kind: "friends" } : { kind: "global" }
      : scope;
  const params = new URLSearchParams({ parcours_id: String(parcoursId), period });
  if (resolved.kind === "friends") params.set("friends_only", "1");
  if (resolved.kind === "club") params.set("club_id", String(resolved.club_id));
  return apiCached(`/highscore?${params}`);
}

export async function getHighscore(
  parcoursId: number,
  discipline: Discipline,
  bowType?: BowType,
  limit = 3
): Promise<{ scores: HighscoreEntry[] }> {
  const params = new URLSearchParams({
    parcours_id: String(parcoursId),
    discipline,
    limit: String(limit),
  });
  if (bowType) params.set("bow_type", bowType);
  return apiCached(`/highscore?${params}`);
}
