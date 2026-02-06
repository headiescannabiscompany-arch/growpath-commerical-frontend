import { api } from "./client";
import { endpoints } from "./endpoints";

export type Task = {
  id: string;
  title?: string;
  dueAt?: string;
  createdAt?: string;
  // Add fields later as backend schema stabilizes
};

// CONTRACT: facility-scoped resources must use endpoints.ts and canonical envelopes.

export async function getTasks(facilityId: string): Promise<Task[]> {
  const res = await api.get(endpoints.tasks(facilityId));
  // Contract: { tasks: [...] }
  return res?.tasks ?? [];
}

export async function createTask(facilityId: string, data: any): Promise<Task> {
  const res = await api.post(endpoints.tasks(facilityId), data);
  return res?.created ?? res?.task ?? res;
}

export async function updateTask(
  facilityId: string,
  id: string,
  patch: any
): Promise<Task> {
  const res = await api.patch(endpoints.task(facilityId, id), patch);
  return res?.updated ?? res?.task ?? res;
}

export async function deleteTask(facilityId: string, id: string) {
  const res = await api.delete(endpoints.task(facilityId, id));
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

interface PersonalTasksResponse {
  ok: boolean;
  data: {
    tasks: PersonalTask[];
  };
}

/**
 * Fetch tasks for the authenticated personal mode user.
 * Optionally filter by growId.
 */
export async function listPersonalTasks(options?: {
  growId?: string;
}): Promise<PersonalTask[]> {
  try {
    const query = options?.growId ? `?growId=${encodeURIComponent(options.growId)}` : "";
    const res = await api.get(`/personal/tasks${query}`);

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
