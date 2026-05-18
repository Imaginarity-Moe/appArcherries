import { api } from "./client";

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type FriendUser = {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Friendship = {
  id: number;
  status: FriendshipStatus;
  requested_at: string;
  responded_at: string | null;
  user: FriendUser;
  i_am: "requester" | "recipient";
};

export type FriendsState = {
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
  blocked: Friendship[];
};

export async function listFriends(): Promise<FriendsState> {
  return api<FriendsState>("/friends");
}

export async function sendFriendRequest(email: string): Promise<FriendsState> {
  return api<FriendsState>("/friends/requests", { method: "POST", body: JSON.stringify({ email }) });
}

export async function respondFriendRequest(id: number, action: "accept" | "reject" | "block"): Promise<FriendsState> {
  return api<FriendsState>(`/friends/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
}

export async function removeFriendship(id: number): Promise<FriendsState> {
  return api<FriendsState>(`/friends/${id}`, { method: "DELETE" });
}
