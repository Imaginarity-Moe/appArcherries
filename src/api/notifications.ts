import { api } from "./client";

export type NotificationKind =
  | "friend_request_received"
  | "friend_request_accepted"
  | "friend_request_rejected"
  | "training_friend_added";

export type Notification = {
  id: number;
  kind: NotificationKind | string;
  payload: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export type NotificationsState = {
  unread_count: number;
  items: Notification[];
};

export async function listNotifications(): Promise<NotificationsState> {
  return api<NotificationsState>("/notifications");
}

export async function markNotificationRead(id: number): Promise<NotificationsState> {
  return api<NotificationsState>(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read: true }),
  });
}

export async function markAllNotificationsRead(): Promise<NotificationsState> {
  return api<NotificationsState>("/notifications/mark-all-read", { method: "POST" });
}

export async function deleteNotification(id: number): Promise<NotificationsState> {
  return api<NotificationsState>(`/notifications/${id}`, { method: "DELETE" });
}
