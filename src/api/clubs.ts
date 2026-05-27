import { api, apiCached } from "./client";

export type ClubRole = "admin" | "member";

export type Club = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  invite_code: string;
  created_by: number;
  created_at: string;
  my_role?: ClubRole;
  member_count?: number;
};

export type ClubMember = {
  user_id: number;
  role: ClubRole;
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

export type ClubDetail = { club: Club; members: ClubMember[] };

export async function listMyClubs(): Promise<{ clubs: Club[] }> {
  return apiCached(`/clubs`);
}

export async function getClub(id: number): Promise<ClubDetail> {
  return apiCached(`/clubs/${id}`);
}

export async function createClub(body: { name: string; description?: string | null }): Promise<ClubDetail> {
  return api(`/clubs`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateClub(
  id: number,
  body: { name?: string; description?: string | null }
): Promise<ClubDetail> {
  return api(`/clubs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function deleteClub(id: number): Promise<{ ok: true }> {
  return api(`/clubs/${id}`, { method: "DELETE" });
}

export async function joinClub(invite_code: string): Promise<ClubDetail> {
  return api(`/clubs/join`, { method: "POST", body: JSON.stringify({ invite_code }) });
}

export async function leaveClub(id: number): Promise<{ ok: true }> {
  return api(`/clubs/${id}/members/me`, { method: "DELETE" });
}

export async function removeClubMember(id: number, user_id: number): Promise<ClubDetail> {
  return api(`/clubs/${id}/members/${user_id}`, { method: "DELETE" });
}

export async function regenerateClubInviteCode(id: number): Promise<ClubDetail> {
  return api(`/clubs/${id}/regenerate-code`, { method: "POST" });
}

// ─── Vereins-Stats ─────────────────────────────────────────────────────────

export type ClubMemberRanked = {
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  best_score_30d: number | null;
  best_score_all: number | null;
  count_30d: number;
  count_all: number;
};

export type ClubParcoursRecord = {
  parcours_id: number;
  parcours_name: string;
  discipline: string;
  bow_type: string;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  training_id: number;
  started_at: string;
};

export type ClubStats = {
  members_ranked: ClubMemberRanked[];
  parcours_records: ClubParcoursRecord[];
};

export async function getClubStats(id: number): Promise<ClubStats> {
  return apiCached(`/clubs/${id}/stats`);
}
