import { apiRequest } from "./apiRequest";
import type { Notification } from "../types/notification";

export function listNotifications(facilityId: string) {
  return apiRequest<Notification[]>(`/api/facilities/${facilityId}/notifications`);
}

export function markNotificationRead(facilityId: string, notificationId: string) {
  return apiRequest(`/api/facilities/${facilityId}/notifications/${notificationId}`, {
    method: "PATCH",
    body: { read: true }
  });
}
