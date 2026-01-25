import { api } from "./client";
import type { Notification } from "../types/notification";

export function listNotifications(facilityId: string) {
  return api<Notification[]>(`/api/facilities/${facilityId}/notifications`);
}

export function markNotificationRead(facilityId: string, notificationId: string) {
  return api(`/api/facilities/${facilityId}/notifications/${notificationId}`, {
    method: "PATCH",
    body: { read: true }
  });
}
