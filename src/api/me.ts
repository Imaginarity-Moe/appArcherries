import { api } from "./client";
import type { User } from "../auth/AuthContext";

export async function updateMe(body: { display_name?: string; pro_mode?: boolean }): Promise<User> {
  return api<User>("/me", { method: "PATCH", body: JSON.stringify(body) });
}
