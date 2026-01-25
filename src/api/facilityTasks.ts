import { api } from "./client";

export type FacilityTask = {
  id: string;
  facilityId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "done";
  priority?: "low" | "normal" | "high";
  assignedTo?: string; // userId
  dueAt?: string; // ISO date
  createdAt: string;
};

export function getFacilityTasks(facilityId: string) {
  return api<FacilityTask[]>(`/api/facilities/${facilityId}/tasks`);
}

export function createFacilityTask(facilityId: string, data: Partial<FacilityTask>) {
  return api<FacilityTask>(`/api/facilities/${facilityId}/tasks`, {
    method: "POST",
    body: data
  });
}

export function updateFacilityTask(
  facilityId: string,
  taskId: string,
  data: Partial<FacilityTask>
) {
  return api<FacilityTask>(`/api/facilities/${facilityId}/tasks/${taskId}`, {
    method: "PATCH",
    body: data
  });
}
