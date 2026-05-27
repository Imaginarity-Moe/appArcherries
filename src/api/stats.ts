import { apiCached, apiSWR } from "./client";
import type { Discipline } from "./trainings";

export type MoodStats = {
  entries: Array<{ mood: string; count: number; avg_score: number | null }>;
  total_trainings: number;
  with_mood: number;
};

export async function getMoodStats(): Promise<MoodStats> {
  return apiCached(`/stats/mood`);
}

export type StatsOverview = {
  trend: Array<{ id: number; date: string; discipline: string; bow_type: string; score: number }>;
  /** Zonen-Verteilung für 3D-Disziplinen (inner_kill, outer_kill, wound, miss) */
  zone_distribution: Array<{ zone: string; count: number; pct: number }>;
  /** Zonen-Verteilung für Scheiben-Disziplinen (Field-WA, target_practice — numerische Ringe 1..10/X) */
  zone_distribution_target?: Array<{ zone: string; count: number; pct: number }>;
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

export type ParticipantStats = {
  participant_id: number;
  user_id: number;
  display_name: string | null;
  user_role: string;
  role: string;
  is_self: boolean;
  total_score: number;
  station_count: number;
  avg_per_station: number;
  best_station: number;
  worst_station: number;
  stations: Array<{ station: number; score: number }>;
  zone_distribution: Array<{ zone: string; count: number; pct: number }>;
  arrow_consistency: Array<{ arrow_seq: number; avg: number; count: number }>;
};

export type SetsLegsRow = { participant_id: number; legs_won: number };

export type TrainingStats = {
  training: {
    id: number;
    discipline: string;
    bow_type: string;
    started_at: string;
    scoring_mode?: "points" | "legs" | "sets" | null;
    num_ends?: number | null;
    legs_to_win?: number | null;
    sets_to_win?: number | null;
    arrows_per_end?: number | null;
    target_distance_m?: number | null;
    target_rings?: number | null;
  };
  total_score: number;
  station_count: number;
  avg_per_station: number;
  best_station: number;
  worst_station: number;
  stations: Array<{ station: number; score: number }>;
  zone_distribution: Array<{ zone: string; count: number; pct: number }>;
  arrow_consistency: Array<{ arrow_seq: number; avg: number; count: number }>;
  /** Pro-Participant-Stats für Multi-Player-Vergleich */
  participants?: ParticipantStats[];
  /** Legs-Vergleich bei target_practice legs/sets-Modi */
  sets_legs?: SetsLegsRow[] | null;
};

export async function getStatsOverview(
  filters: { discipline?: string; bow?: string } = {},
  onRefresh?: (fresh: StatsOverview) => void
): Promise<StatsOverview> {
  const qs = new URLSearchParams();
  if (filters.discipline) qs.set("discipline", filters.discipline);
  if (filters.bow) qs.set("bow", filters.bow);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const path = `/stats${suffix}`;
  return onRefresh ? apiSWR<StatsOverview>(path, onRefresh) : apiCached<StatsOverview>(path);
}

export async function getTrainingStats(trainingId: number): Promise<TrainingStats> {
  return apiCached(`/stats/training/${trainingId}`);
}

export type HeatmapGroup = {
  key: string;
  label: string;
  discipline: Discipline;
  animal_or_face: string | null;
  distance_m: number | null;
  parcours_id: number | null;
  parcours_name: string | null;
  shot_count: number;
  points: Array<{ pad_x: number; pad_y: number; zone: string | null; points: number }>;
};

export type HeatmapResponse = {
  group_by: "tier" | "lane";
  groups: HeatmapGroup[];
};

export async function getHeatmap(
  group_by: "tier" | "lane" = "tier",
  filters: { discipline?: string; bow?: string; parcours_id?: number } = {}
): Promise<HeatmapResponse> {
  const qs = new URLSearchParams();
  qs.set("group_by", group_by);
  if (filters.discipline) qs.set("discipline", filters.discipline);
  if (filters.bow) qs.set("bow", filters.bow);
  if (filters.parcours_id) qs.set("parcours_id", String(filters.parcours_id));
  return apiCached<HeatmapResponse>(`/stats/heatmap?${qs.toString()}`);
}
