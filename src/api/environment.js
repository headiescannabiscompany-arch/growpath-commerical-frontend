import { client } from "./client.js";
import apiRoutes from "./routes.js";

export function analyzeEnvironment(data, token) {
  return client.post(apiRoutes.ENVIRONMENT.ANALYZE, data, token);
}

export function envToTasks(plantId, actions, token) {
  return client.post(apiRoutes.ENVIRONMENT.TO_TASKS(plantId), { actions }, token);
}
