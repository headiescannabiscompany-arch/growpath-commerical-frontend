import { client } from "./client.js";
import ROUTES from "./routes.js";

export function getTodayTasks(token) {
  return client.get(ROUTES.TASKS.TODAY, token);
}

export function getUpcomingTasks(token) {
  return client.get(ROUTES.TASKS.UPCOMING, token);
}

export function getTasks(token) {
  return client.get(ROUTES.TASKS.LIST, token);
}

export function completeTask(id, token) {
  return client.put(ROUTES.TASKS.COMPLETE(id), {}, token);
}

export function reopenTask(id, token) {
  return client.put(ROUTES.TASKS.REOPEN(id), {}, token);
}

export function deleteTask(id, token) {
  return client.delete(ROUTES.TASKS.DELETE(id), token);
}

export function createCustomTask(data, token) {
  return client.post(ROUTES.TASKS.LIST, data, token);
}