import { api } from "./client";

export type NotifCategory = "social" | "invitations";
export type NotifChannel = "email" | "in_app";

/** Map<category, Map<channel, enabled>> */
export type NotifPrefs = Record<NotifCategory, Record<NotifChannel, boolean>>;

export async function getNotificationPrefs(): Promise<{ prefs: NotifPrefs }> {
  return api("/me/notification-prefs");
}

export async function saveNotificationPrefs(prefs: NotifPrefs): Promise<{ prefs: NotifPrefs }> {
  return api("/me/notification-prefs", {
    method: "PUT",
    body: JSON.stringify({ prefs }),
  });
}
