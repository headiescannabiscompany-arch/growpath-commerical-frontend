import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export function getTodayTasks(token) {
  return apiRequest(routes.TASKS.TODAY, { auth: token ? true : false });
}

export function getUpcomingTasks(token) {
  return apiRequest(routes.TASKS.UPCOMING, { auth: token ? true : false });
}

export function getTasks(token) {
  return apiRequest(routes.TASKS.LIST, { auth: token ? true : false });
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
