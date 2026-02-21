import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

// Phase 2.3.7: Dual-mode helpers (personal + facility) with overloads
export function getTasks(): Promise<PersonalTask[]>;
export function getTasks(facilityId: string): Promise<Task[]>;
export async function getTasks(facilityId?: string): Promise<PersonalTask[] | Task[]> {
  if (facilityId) {
    const res = await apiRequest(endpoints.tasks(facilityId), { method: "GET" });
    // Contract: { tasks: [...] }
    return res?.tasks ?? [];
  }
  return listPersonalTasks();
}

export function createCustomTask(data: any): Promise<PersonalTask>;
export function createCustomTask(facilityId: string, data: any): Promise<Task>;
export async function createCustomTask(a: any, b?: any): Promise<any> {
  if (typeof a === "string") {
    return createTask(a, b);
  }
  const res = await apiRequest("/api/personal/tasks", { method: "POST", body: a });
  return res?.task ?? res?.created ?? res;
}

export function completeTask(id: string): Promise<PersonalTask>;
export function completeTask(facilityId: string, id: string, patch?: any): Promise<Task>;
export async function completeTask(a: any, b?: any, c?: any): Promise<any> {
  if (arguments.length >= 2) {
    return updateTask(a, b, c ?? { completed: true });
  }
  const res = await apiRequest(`/api/personal/tasks/${a}`, {
    method: "PATCH",
    body: { completed: true }
  });
  return res?.task ?? res?.updated ?? res;
}

export type Task = {
  id: string;
  title?: string;
  dueAt?: string;
  createdAt?: string;
  // Add fields later as backend schema stabilizes
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function createTask(facilityId: string, data: any): Promise<Task> {
  const res = await apiRequest(endpoints.tasks(facilityId), {
    method: "POST",
    body: data
  });
  return res?.created ?? res?.task ?? res;
}

export async function updateTask(
  facilityId: string,
  id: string,
  patch: any
): Promise<Task> {
  const res = await apiRequest(endpoints.task(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return res?.updated ?? res?.task ?? res;
}

export async function deleteTask(facilityId: string, id: string) {
  const res = await apiRequest(endpoints.task(facilityId, id), { method: "DELETE" });
  return res?.deleted ?? res?.ok ?? res;
}

// ===== Personal Mode Tasks (User-Scoped) =====

export interface PersonalTask {
  id: string;
  growId: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
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
    const res = await apiRequest("/api/personal/tasks", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
    });

    if (
      typeof res === "object" &&
      res !== null &&
      "data" in res &&
      res.data &&
      "tasks" in res.data
    ) {
      return res.data.tasks as PersonalTask[];
    }
    return [];
  } catch (err) {
    console.error("[listPersonalTasks] Error:", err);
    return [];
  }
}
