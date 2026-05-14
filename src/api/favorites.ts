import { api, apiCached } from "./client";

export type FavoriteKind = "discipline" | "parcours" | "bow_type";

export type Favorite = {
  id: number;
  kind: FavoriteKind;
  ref: string;
  created_at: string;
};

export async function listFavorites(): Promise<{ favorites: Favorite[] }> {
  return apiCached(`/favorites`);
}

export async function addFavorite(kind: FavoriteKind, ref: string): Promise<{ ok: true; kind: FavoriteKind; ref: string }> {
  return api(`/favorites`, { method: "POST", body: JSON.stringify({ kind, ref }) });
}

export async function removeFavorite(kind: FavoriteKind, ref: string): Promise<{ ok: true }> {
  const params = new URLSearchParams({ kind, ref });
  return api(`/favorites?${params}`, { method: "DELETE" });
}
