import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

// Phase 2.3.7: Dual-mode helpers (personal + facility) with overloads
export function getTasks(): Promise<PersonalTask[]>;
export function getTasks(facilityId: string): Promise<Task[]>;
export async function getTasks(facilityId?: string): Promise<PersonalTask[] | Task[]> {
  if (facilityId) {
    const listRes = await apiRequest(endpoints.tasks(facilityId), { method: "GET" });
    // Contract: { tasks: [...] }
    return listRes?.tasks ?? [];
  }
  return listPersonalTasks();
}

export function getFacilityTasks(facilityId: string): Promise<Task[]> {
  return getTasks(facilityId);
}

export function createCustomTask(data: any): Promise<PersonalTask>;
export function createCustomTask(facilityId: string, data: any): Promise<Task>;
export async function createCustomTask(a: any, b?: any): Promise<any> {
  if (typeof a === "string") {
    return createTask(a, b);
  }
  const personalCreateRes = await apiRequest("/api/personal/tasks", {
    method: "POST",
    body: a
  });
  return personalCreateRes?.task ?? personalCreateRes?.created ?? personalCreateRes;
}

export function completeTask(id: string): Promise<PersonalTask>;
export function completeTask(facilityId: string, id: string, patch?: any): Promise<Task>;
export async function completeTask(a: any, b?: any, c?: any): Promise<any> {
  if (arguments.length >= 2) {
    return updateTask(a, b, c ?? { completed: true });
  }
  const completeRes = await apiRequest(`/api/personal/tasks/${a}`, {
    method: "PATCH",
    body: { completed: true }
  });
  return completeRes?.task ?? completeRes?.updated ?? completeRes;
}

export type Task = {
  id: string;
  title?: string;
  description?: string;
  notes?: string;
  dueAt?: string;
  dueDate?: string;
  status?: string;
  assignedTo?: string | { id?: string; _id?: string };
  createdAt?: string;
  // Add fields later as backend schema stabilizes
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function createTask(facilityId: string, data: any): Promise<Task> {
  const createRes = await apiRequest(endpoints.tasks(facilityId), {
    method: "POST",
    body: data
  });
  return createRes?.created ?? createRes?.task ?? createRes;
}

export async function getTask(facilityId: string, id: string): Promise<Task | null> {
  const detailRes = await apiRequest(endpoints.task(facilityId, id), { method: "GET" });
  return detailRes?.task ?? detailRes?.item ?? detailRes?.data?.task ?? detailRes;
}

export async function updateTask(
  facilityId: string,
  id: string,
  patch: any
): Promise<Task> {
  const updateRes = await apiRequest(endpoints.task(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return updateRes?.updated ?? updateRes?.task ?? updateRes;
}

export async function completeFacilityTask(
  facilityId: string,
  id: string,
  completed = true
): Promise<Task> {
  return updateTask(facilityId, id, {
    completed,
    status: completed ? "DONE" : "OPEN",
    completedAt: completed ? new Date().toISOString() : null
  });
}

export async function deleteTask(facilityId: string, id: string) {
  const deleteRes = await apiRequest(endpoints.task(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

export function deleteFacilityTask(facilityId: string, id: string) {
  return deleteTask(facilityId, id);
}

// ===== Personal Mode Tasks (User-Scoped) =====

export interface PersonalTask {
  id: string;
  growId: string;
  plantId?: string | null;
  title: string;
  description: string;
  dueDate: string;
  snoozeUntil?: string | null;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  status?: string;
  sourceType?: string | null;
  sourceObjectId?: string | null;
  sourceToolRunId?: string | null;
  sourceDiagnosisId?: string | null;
  linkedLogId?: string | null;
  recurrence?: Record<string, any> | null;
  createdAt: string;
}

// Removed unused PersonalTasksResponse interface

/**
 * Fetch tasks for the authenticated personal mode user.
 * Optionally filter by growId.
 */
export async function listPersonalTasks(options?: {
  growId?: string;
}): Promise<PersonalTask[]> {
  try {
    const listPersonalRes = await apiRequest("/api/personal/tasks", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
    });

    if (
      typeof listPersonalRes === "object" &&
      listPersonalRes !== null &&
      "data" in listPersonalRes &&
      listPersonalRes.data &&
      "tasks" in listPersonalRes.data
    ) {
      return listPersonalRes.data.tasks as PersonalTask[];
    }
    const tasks = listPersonalRes?.tasks ?? listPersonalRes?.items;
    return Array.isArray(tasks) ? (tasks as PersonalTask[]) : [];
  } catch (err) {
    console.error("[listPersonalTasks] Error:", err);
    return [];
  }
}

export async function createPersonalTask(data: {
  growId: string;
  plantId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
  snoozeUntil?: string | null;
  sourceType?: string | null;
  sourceObjectId?: string | null;
  sourceToolRunId?: string | null;
  sourceDiagnosisId?: string | null;
  linkedLogId?: string | null;
}): Promise<PersonalTask | null> {
  try {
    const res: any = await apiRequest("/api/personal/tasks", {
      method: "POST",
      body: data
    });
    return (res?.task ?? res?.created ?? res?.data?.task ?? res) as PersonalTask;
  } catch (_err) {
    return null;
  }
}

export async function updatePersonalTask(
  id: string,
  patch: Partial<
    Pick<
      PersonalTask,
      | "title"
      | "description"
      | "dueDate"
      | "snoozeUntil"
      | "completed"
      | "priority"
      | "sourceType"
      | "sourceObjectId"
      | "sourceToolRunId"
      | "sourceDiagnosisId"
      | "linkedLogId"
      | "recurrence"
    >
  >
): Promise<PersonalTask | null> {
  try {
    const res: any = await apiRequest(`/api/personal/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch
    });
    return (res?.task ?? res?.updated ?? res?.data?.task ?? res) as PersonalTask;
  } catch (_err) {
    return null;
  }
}

export async function deletePersonalTask(id: string): Promise<boolean> {
  try {
    await apiRequest(`/api/personal/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return true;
  } catch (_err) {
    return false;
  }
}
