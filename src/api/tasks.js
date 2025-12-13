import { client } from "./client";

export function getTodayTasks(token) {
  return client.get("/tasks/today", token);
}

export function getUpcomingTasks(token) {
  return client.get("/tasks/upcoming", token);
}

export function getTasks(token) {
  return client.get("/tasks", token);
}

export function completeTask(id, token) {
  return client.post(`/tasks/${id}/complete`, {}, token);
}

export function createCustomTask(data, token) {
  return client.post("/tasks", data, token);
}
