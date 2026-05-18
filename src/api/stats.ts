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

export type HeatmapTarget = { name: string; shot_count: number };
export type HeatmapShot = {
  x: number;
  y: number;
  points: number | null;
  zone: string | null;
  discipline: string;
};
export type HeatmapResponse = {
  target: string;
  shots: HeatmapShot[];
  total: number;
  avg_score: number;
  distances: number[];
};

export async function listHeatmapTargets(): Promise<{ targets: HeatmapTarget[] }> {
  return apiCached("/stats/heatmap/targets");
}

export async function getHeatmap(filters: {
  target: string;
  distance?: number | null;
  discipline?: string | null;
  bow_type?: string | null;
}): Promise<HeatmapResponse> {
  const qs = new URLSearchParams({ target: filters.target });
  if (filters.distance) qs.set("distance", String(filters.distance));
  if (filters.discipline) qs.set("discipline", filters.discipline);
  if (filters.bow_type) qs.set("bow_type", filters.bow_type);
  return apiCached(`/stats/heatmap?${qs.toString()}`);
}
