import { client } from "./client.js";
import ROUTES from "./routes.js";

export function analyzeEnvironment(data, token) {
  return client.post(ROUTES.ENVIRONMENT.ANALYZE, data, token);
}

export function envToTasks(plantId, actions, token) {
  return client.post(ROUTES.ENVIRONMENT.TO_TASKS(plantId), { actions }, token);
}
