import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

function buildAuthHeaders(token) {
  if (!token) return undefined;
  const raw = String(token);
  const normalized = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
  return { Authorization: normalized };
}

export function uploadLabel(uri, token) {
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  return apiRequest(apiRoutes.FEEDING.LABEL, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: form
  });
}

export function generateSchedule(data, token) {
  return apiRequest(apiRoutes.FEEDING.SCHEDULE, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}

export function convertScheduleToTemplate(data, token) {
  return apiRequest(apiRoutes.FEEDING.TO_TEMPLATE, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}
