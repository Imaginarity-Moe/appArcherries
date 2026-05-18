import { api } from "./client";
import type { User } from "../auth/AuthContext";

export async function updateMe(body: { display_name?: string }): Promise<User> {
  return api<User>("/me", { method: "PATCH", body: JSON.stringify(body) });
}
