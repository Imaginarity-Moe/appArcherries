import { api } from "./client";
import type { Role } from "../auth/AuthContext";

export type AdminUser = {
  id: number;
  email: string;
  display_name: string | null;
  status: "active" | "pending";
  role: Role;
  avatar_url: string | null;
  created_at: string;
  count_trainings: number;
  count_parcours: number;
  count_bows: number;
};

export async function listAdminUsers(): Promise<{ users: AdminUser[] }> {
  return api(`/admin/users`);
}

export async function updateAdminUser(
  id: number,
  body: Partial<{ role: Role; status: "active" | "pending" }>
): Promise<{ user: AdminUser }> {
  return api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
