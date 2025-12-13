import { client } from "./client";

export function analyzeEnvironment(data, token) {
  return client.post("/environment/analyze", data, token);
}

export function envToTasks(plantId, actions, token) {
  return client.post(`/environment/${plantId}/to-tasks`, { actions }, token);
}
