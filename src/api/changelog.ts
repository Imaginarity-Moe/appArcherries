import { api } from "./client";

export type ChangelogItem = {
  key: string;
  released_at: string;
  icon: string;
  title: string;
  desc: string;
  link?: string;
};

export type ChangelogResponse = {
  items: ChangelogItem[];
  last_seen: string | null;
  unseen_count: number;
};

export async function getChangelog(): Promise<ChangelogResponse> {
  return api(`/me/changelog`);
}

export async function markChangelogSeen(): Promise<{ ok: true }> {
  return api(`/me/changelog/seen`, { method: "POST" });
}
