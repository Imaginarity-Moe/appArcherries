import { apiCached } from "./client";

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
