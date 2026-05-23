import { api } from "./client";
import type { Role } from "../auth/AuthContext";

export type UserStatus = "active" | "pending";

export type AdminUser = {
  id: number;
  email: string;
  display_name: string | null;
  status: UserStatus;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
  count_trainings: number;
  count_parcours: number;
  count_bows: number;
};

export type AdminUserDetail = {
  id: number;
  email: string;
  display_name: string | null;
  status: UserStatus;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
  last_seen_at: string | null;
  count_trainings: number;
  count_parcours: number;
  count_bows: number;
  count_arrows: number;
  count_equipment: number;
  count_reviews: number;
  count_friends: number;
};

export type AdminTrainingItem = {
  id: number;
  discipline: string;
  bow_type: string;
  started_at: string;
  ended_at: string | null;
  summary_score: number | null;
  published_to_highscore: boolean;
  parcours_name: string | null;
};

export type AdminParcoursItem = {
  id: number;
  name: string;
  is_public: boolean;
  lanes_count: number | null;
  reviews_count: number;
  created_at: string;
};

export type AdminBowItem = {
  id: number;
  name: string;
  bow_type: string;
  draw_weight_lbs: number | null;
  is_default: boolean;
  image_url: string | null;
  created_at: string;
};

export type AdminArrowItem = {
  id: number;
  name: string;
  manufacturer: string | null;
  model: string | null;
  spine: string | null;
  count_total: number | null;
  count_broken: number;
  count_lost: number;
  created_at: string;
};

export type AdminEquipmentItem = {
  id: number;
  kind: string;
  sub_kind: string | null;
  name: string;
  manufacturer: string | null;
  model: string | null;
  retired_at: string | null;
  created_at: string;
};

export type AdminFriendItem = {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

export type AdminReviewItem = {
  id: number;
  parcours_id: number;
  parcours_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type AdminUserDetailResponse = {
  user: AdminUserDetail;
  trainings: AdminTrainingItem[];
  parcours: AdminParcoursItem[];
  bows: AdminBowItem[];
  arrows: AdminArrowItem[];
  equipment: AdminEquipmentItem[];
  friends: AdminFriendItem[];
  reviews: AdminReviewItem[];
};

export async function listAdminUsers(): Promise<{ users: AdminUser[] }> {
  return api(`/admin/users`);
}

export async function getAdminUser(id: number): Promise<AdminUserDetailResponse> {
  return api(`/admin/users/${id}`);
}

export async function updateAdminUser(
  id: number,
  body: Partial<{ role: Role; status: UserStatus }>
): Promise<{ user: AdminUser }> {
  return api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteAdminUser(id: number, confirmEmail: string): Promise<{ ok: true; deleted_user_id: number }> {
  return api(`/admin/users/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirm_email: confirmEmail }),
  });
}
