import { api } from "./client";

export type Achievement = {
  key: string;
  icon: string;
  label: string;
  desc: string;
  unlocked: boolean;
  unlocked_at: string | null;
  is_new: boolean;
};

export type AchievementsResponse = {
  achievements: Achievement[];
  unlocked_count: number;
  total: number;
  streak_current: number;
};

export async function getAchievements(): Promise<AchievementsResponse> {
  return api(`/me/achievements`);
}
