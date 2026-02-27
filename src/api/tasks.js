import { apiRequest } from "./apiRequest";
import routes from "./routes.js";
import { endpoints } from "./endpoints";

function normalizeTaskList(res) {
  if (Array.isArray(res)) return res;
  return res?.tasks ?? res?.data ?? [];
}

function normalizeTaskEntity(res) {
  return res?.created ?? res?.updated ?? res?.task ?? res;
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
  return apiRequest(routes.TASKS.COMPLETE(id), {
    method: "PUT",
    auth: token ? true : false,
    body: {}
  });
}

export function reopenTask(id, token) {
  return apiRequest(routes.TASKS.REOPEN(id), {
    method: "PUT",
    auth: token ? true : false,
    body: {}
  });
}

export function deleteTask(id, token) {
  return apiRequest(routes.TASKS.DELETE(id), {
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
