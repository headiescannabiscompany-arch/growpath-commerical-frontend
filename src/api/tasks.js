import { client } from "./client.js";
import routes from "./routes.js";

export function getTodayTasks(token) {
  return client.get(routes.TASKS.TODAY, token);
}

export function getUpcomingTasks(token) {
  return client.get(routes.TASKS.UPCOMING, token);
}

export function getTasks(token) {
  return client.get(routes.TASKS.LIST, token);
}

export function completeTask(id, token) {
  return client.put(routes.TASKS.COMPLETE(id), {}, token);
}

export function reopenTask(id, token) {
  return client.put(routes.TASKS.REOPEN(id), {}, token);
}

export function deleteTask(id, token) {
  return client.delete(routes.TASKS.DELETE(id), token);
}

export function createCustomTask(data, token) {
  return client.post(routes.TASKS.LIST, data, token);
}
