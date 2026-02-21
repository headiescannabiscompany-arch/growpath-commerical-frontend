import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function analyzeEnvironment(data, token) {
  return apiRequest(apiRoutes.ENVIRONMENT.ANALYZE, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}

export function envToTasks(plantId, actions, token) {
  return apiRequest(apiRoutes.ENVIRONMENT.TO_TASKS(plantId), {
    method: "POST",
    auth: token ? true : false,
    body: { actions }
  });
}
