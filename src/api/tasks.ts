import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import routes from "./routes.js";

function normalizeTaskList(res: any) {
  const raw = Array.isArray(res) ? res : (res?.tasks ?? res?.data ?? []);
  return Array.isArray(raw)
    ? raw.map((task) => {
        if (!task || typeof task !== "object") return task;
        if (task.id && !task._id) return { ...task, _id: task.id };
        if (task._id && !task.id) return { ...task, id: task._id };
        return task;
      })
    : [];
}

function normalizeTaskEntity(res: any) {
  const task = res?.created ?? res?.updated ?? res?.task ?? res;
  if (!task || typeof task !== "object") return task;
  if (task.id && !task._id) return { ...task, _id: task.id };
  if (task._id && !task.id) return { ...task, id: task._id };
  return task;
}

function toTaskId(value: any) {
  if (value && typeof value === "object") return value.id || value._id || null;
  return value || null;
}

function asLegacyTokenOptions(token?: string) {
  return { auth: token ? true : false };
}

export function getTodayTasks(token?: string) {
  return apiRequest(routes.TASKS.TODAY, asLegacyTokenOptions(token));
}

export function getUpcomingTasks(token?: string) {
  return apiRequest(routes.TASKS.UPCOMING, asLegacyTokenOptions(token));
}

// Phase 2.3.7: Dual-mode helpers (personal + facility) with overloads
export function getTasks(): Promise<PersonalTask[]>;
export function getTasks(facilityId: string): Promise<Task[]>;
export async function getTasks(facilityId?: string): Promise<PersonalTask[] | Task[]> {
  if (facilityId) {
    if (facilityId.startsWith("token") || facilityId.includes(".")) {
      return apiRequest(routes.TASKS.LIST, asLegacyTokenOptions(facilityId));
    }
    const listRes = await apiRequest(endpoints.tasks(facilityId), { method: "GET" });
    return normalizeTaskList(listRes);
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
  const personalCreateRes = await apiRequest(routes.TASKS.LIST, {
    method: "POST",
    body: a
  });
  return personalCreateRes?.task ?? personalCreateRes?.created ?? personalCreateRes;
}

export function completeTask(id: string): Promise<PersonalTask>;
export function completeTask(facilityId: string, id: string, patch?: any): Promise<Task>;
export async function completeTask(a: any, b?: any, c?: any): Promise<any> {
  if (arguments.length >= 2) {
    if (c !== undefined) return updateTask(a, b, c);
    return apiRequest(routes.TASKS.COMPLETE(toTaskId(a)), {
      method: "PUT",
      ...asLegacyTokenOptions(b),
      body: {}
    });
  }
  const completeRes = await apiRequest(`/api/personal/tasks/${a}`, {
    method: "PATCH",
    body: { completed: true }
  });
  return completeRes?.task ?? completeRes?.updated ?? completeRes;
}

export function reopenTask(id: any, token?: string) {
  return apiRequest(routes.TASKS.REOPEN(toTaskId(id)), {
    method: "PUT",
    ...asLegacyTokenOptions(token),
    body: {}
  });
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
  return normalizeTaskEntity(createRes);
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
  return normalizeTaskEntity(updateRes);
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
  if (arguments.length < 2) {
    return apiRequest(routes.TASKS.DELETE(toTaskId(facilityId)), {
      method: "DELETE"
    });
  }
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
  endAt?: string | null;
  allDay?: boolean;
  snoozeUntil?: string | null;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  status?: string;
  calendarType?: string | null;
  sourceStage?: string | null;
  sourceType?: string | null;
  sourceObjectId?: string | null;
  sourceToolRunId?: string | null;
  sourceDiagnosisId?: string | null;
  linkedLogId?: string | null;
  recurrence?: Record<string, any> | null;
  reminderPlan?: Record<string, any> | null;
  linkedGrowId?: string | null;
  linkedPlantId?: string | null;
  linkedToolRunId?: string | null;
  linkedRecipeId?: string | null;
  linkedProductId?: string | null;
  linkedProductBatchId?: string | null;
  linkedProductTrialId?: string | null;
  linkedStorefrontId?: string | null;
  linkedStorefrontSlug?: string | null;
  storefrontSlug?: string | null;
  brandSlug?: string | null;
  publicSlug?: string | null;
  linkedOrderId?: string | null;
  linkedCourseId?: string | null;
  linkedLessonId?: string | null;
  linkedCourseAssignmentId?: string | null;
  linkedLiveId?: string | null;
  actionUrl?: string | null;
  linkedAlertId?: string | null;
  linkedSensorAlertId?: string | null;
  linkedFacilityId?: string | null;
  linkedRoomId?: string | null;
  linkedFacilityRunId?: string | null;
  linkedSopId?: string | null;
  linkedForumThreadId?: string | null;
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
  } catch (_err) {
    return [];
  }
}

export async function createPersonalTask(data: {
  growId: string;
  plantId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  endAt?: string | null;
  allDay?: boolean;
  priority?: "low" | "medium" | "high";
  calendarType?: string | null;
  sourceStage?: string | null;
  snoozeUntil?: string | null;
  sourceType?: string | null;
  sourceObjectId?: string | null;
  sourceToolRunId?: string | null;
  sourceDiagnosisId?: string | null;
  linkedLogId?: string | null;
  recurrence?: Record<string, any> | null;
  reminderPlan?: Record<string, any> | null;
  linkedGrowId?: string | null;
  linkedPlantId?: string | null;
  linkedToolRunId?: string | null;
  linkedRecipeId?: string | null;
  linkedProductId?: string | null;
  linkedProductBatchId?: string | null;
  linkedProductTrialId?: string | null;
  linkedStorefrontId?: string | null;
  linkedOrderId?: string | null;
  linkedCourseId?: string | null;
  linkedLessonId?: string | null;
  linkedCourseAssignmentId?: string | null;
  linkedLiveId?: string | null;
  actionUrl?: string | null;
  linkedAlertId?: string | null;
  linkedFacilityId?: string | null;
  linkedRoomId?: string | null;
  linkedFacilityRunId?: string | null;
  linkedSopId?: string | null;
  linkedForumThreadId?: string | null;
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
      | "reminderPlan"
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
