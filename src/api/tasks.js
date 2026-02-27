import { apiRequest } from "./apiRequest";
import routes from "./routes.js";
import { endpoints } from "./endpoints";

function normalizeTaskList(res) {
  const raw = Array.isArray(res) ? res : res?.tasks ?? res?.data ?? [];
  return Array.isArray(raw)
    ? raw.map((task) => {
        if (!task || typeof task !== "object") return task;
        if (task.id && !task._id) return { ...task, _id: task.id };
        if (task._id && !task.id) return { ...task, id: task._id };
        return task;
      })
    : [];
}

function normalizeTaskEntity(res) {
  const task = res?.created ?? res?.updated ?? res?.task ?? res;
  if (!task || typeof task !== "object") return task;
  if (task.id && !task._id) return { ...task, _id: task.id };
  if (task._id && !task.id) return { ...task, id: task._id };
  return task;
}

function toTaskId(value) {
  if (value && typeof value === "object") return value.id || value._id || null;
  return value || null;
}

export function getTodayTasks(token) {
  return apiRequest(routes.TASKS.TODAY, { auth: token ? true : false });
}

export function getUpcomingTasks(token) {
  return apiRequest(routes.TASKS.UPCOMING, { auth: token ? true : false });
}

export function getTasks(token) {
  return apiRequest(routes.TASKS.LIST, { auth: token ? true : false });
}

export async function getFacilityTasks(facilityId) {
  const listRes = await apiRequest(endpoints.tasks(facilityId), { method: "GET" });
  return normalizeTaskList(listRes);
}

export function completeTask(id, token) {
  const taskId = toTaskId(id);
  return apiRequest(routes.TASKS.COMPLETE(taskId), {
    method: "PUT",
    auth: token ? true : false,
    body: {}
  });
}

export function reopenTask(id, token) {
  const taskId = toTaskId(id);
  return apiRequest(routes.TASKS.REOPEN(taskId), {
    method: "PUT",
    auth: token ? true : false,
    body: {}
  });
}

export function deleteTask(id, token) {
  const taskId = toTaskId(id);
  return apiRequest(routes.TASKS.DELETE(taskId), {
    method: "DELETE",
    auth: token ? true : false
  });
}

export function createCustomTask(data, token) {
  return apiRequest(routes.TASKS.LIST, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}

export async function createTask(facilityId, data) {
  const createRes = await apiRequest(endpoints.tasks(facilityId), {
    method: "POST",
    body: data
  });
  return normalizeTaskEntity(createRes);
}

export async function updateTask(facilityId, id, patch) {
  const updateRes = await apiRequest(endpoints.task(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return normalizeTaskEntity(updateRes);
}

export async function deleteFacilityTask(facilityId, id) {
  const deleteRes = await apiRequest(endpoints.task(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

export async function listPersonalTasks(options = {}) {
  try {
    const listRes = await apiRequest("/api/personal/tasks", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
    });
    if (typeof listRes === "object" && listRes !== null && listRes.data) {
      return listRes.data.tasks ?? [];
    }
    return [];
  } catch (_err) {
    return [];
  }
}

export async function createPersonalTask(data) {
  try {
    const res = await apiRequest("/api/personal/tasks", {
      method: "POST",
      body: data
    });
    return res?.task ?? res?.created ?? res?.data?.task ?? res;
  } catch (_err) {
    return null;
  }
}

export async function updatePersonalTask(id, patch) {
  try {
    const res = await apiRequest(`/api/personal/tasks/${id}`, {
      method: "PATCH",
      body: patch
    });
    return res?.task ?? res?.updated ?? res?.data?.task ?? res;
  } catch (_err) {
    return null;
  }
}
