import { api } from "./client";

export type Invitation = {
  id: number;
  token: string;
  role: "scorer" | "viewer";
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  url: string;
};

export type JoinPreview = {
  training: {
    id: number;
    started_at: string;
    discipline: string;
    bow_type: string;
    location: string | null;
    owner_name: string | null;
  };
  invitation: {
    role: "scorer" | "viewer";
    expires_at: string | null;
  };
};

export type JoinResponse = {
  ok: true;
  training_id: number;
  /** JWT für neu angelegten Gast-User. Null wenn schon eingeloggt. */
  token: string | null;
};

export async function createInvitation(
  trainingId: number,
  opts: { role?: "scorer" | "viewer"; expires_in_hours?: number | null; max_uses?: number | null } = {}
): Promise<{ invitation: Invitation }> {
  return api(`/trainings/${trainingId}/invitations`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function listInvitations(trainingId: number): Promise<{ invitations: Invitation[] }> {
  return api(`/trainings/${trainingId}/invitations`);
}

export async function revokeInvitation(trainingId: number, invitationId: number): Promise<{ ok: true }> {
  return api(`/trainings/${trainingId}/invitations/${invitationId}`, { method: "DELETE" });
}

export async function getJoinPreview(token: string): Promise<JoinPreview> {
  return api(`/join/${token}`);
}

export async function acceptJoin(token: string, display_name?: string): Promise<JoinResponse> {
  return api(`/join/${token}`, {
    method: "POST",
    body: JSON.stringify(display_name ? { display_name } : {}),
  });
}
