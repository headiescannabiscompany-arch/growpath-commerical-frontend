import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

function buildAuthHeaders(token) {
  if (!token) return undefined;
  const raw = String(token);
  const normalized = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
  return { Authorization: normalized };
}

export function analyzeEnvironment(data, token) {
  return apiRequest("/api/tools/environment-analysis", {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: data
  }).then((response) => {
    const body = response?.data ?? response ?? {};
    return {
      ...body,
      data: body.outputs || body.data || {},
      aiCreditsUsed: 0
    };
  });
}

export function envToTasks(plantId, actions, token) {
  return apiRequest(apiRoutes.ENVIRONMENT.TO_TASKS(plantId), {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: { actions }
  });
}
