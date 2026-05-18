import { apiCached } from "./client";

export type StatsOverview = {
  trend: Array<{ id: number; date: string; discipline: string; bow_type: string; score: number }>;
  zone_distribution: Array<{ zone: string; count: number; pct: number }>;
  arrow_consistency: Array<{ arrow_seq: number; avg: number; count: number }>;
  personal_bests: Array<{ discipline: string; bow_type: string; best: number }>;
  personal_bests_parcours: Array<{
    parcours_id: number;
    parcours_name: string;
    discipline: string;
    bow_type: string;
    best: number;
  }>;
};

export type TrainingStats = {
  training: { id: number; discipline: string; bow_type: string; started_at: string };
  total_score: number;
  station_count: number;
  avg_per_station: number;
  best_station: number;
  worst_station: number;
  stations: Array<{ station: number; score: number }>;
  zone_distribution: Array<{ zone: string; count: number; pct: number }>;
  arrow_consistency: Array<{ arrow_seq: number; avg: number; count: number }>;
};

export async function getStatsOverview(filters: { discipline?: string; bow?: string } = {}): Promise<StatsOverview> {
  const qs = new URLSearchParams();
  if (filters.discipline) qs.set("discipline", filters.discipline);
  if (filters.bow) qs.set("bow", filters.bow);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiCached(`/stats${suffix}`);
}

export async function getTrainingStats(trainingId: number): Promise<TrainingStats> {
  return apiCached(`/stats/training/${trainingId}`);
}
