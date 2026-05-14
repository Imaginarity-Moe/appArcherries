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

export async function listHighscores(parcoursId: number): Promise<{ groups: HighscoreGroup[] }> {
  return apiCached(`/highscore?parcours_id=${parcoursId}`);
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
