import { apiRequest } from "./apiRequest";

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

function asTask(row: any): FacilityTask {
  return {
    ...row,
    id: String(row?.id || row?._id || ""),
    status: String(row?.status || "open").toLowerCase() as FacilityTask["status"]
  };
}

function taskFromEnvelope(res: any): FacilityTask {
  return asTask(res?.task ?? res?.updated ?? res?.created ?? res?.data?.task ?? res);
}

function tasksFromEnvelope(res: any): FacilityTask[] {
  const rows = Array.isArray(res)
    ? res
    : (res?.tasks ?? res?.items ?? res?.data?.tasks ?? []);
  return Array.isArray(rows) ? rows.map(asTask) : [];
}

export function getFacilityTasks(facilityId: string) {
  return apiRequest(`/api/facilities/${facilityId}/tasks`).then(tasksFromEnvelope);
}

export function createFacilityTask(facilityId: string, data: Partial<FacilityTask>) {
  return apiRequest(`/api/facilities/${facilityId}/tasks`, {
    method: "POST",
    body: data
  }).then(taskFromEnvelope);
}

export function updateFacilityTask(
  facilityId: string,
  taskId: string,
  data: Partial<FacilityTask>
) {
  return apiRequest(`/api/facilities/${facilityId}/tasks/${taskId}`, {
    method: "PATCH",
    body: data
  }).then(taskFromEnvelope);
}
