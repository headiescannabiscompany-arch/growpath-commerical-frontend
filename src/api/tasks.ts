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
