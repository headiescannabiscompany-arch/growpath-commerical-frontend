import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import { persistImageUri } from "@/utils/photoUploads";

function buildAuthHeaders(token) {
  if (!token) return undefined;
  const raw = String(token);
  const normalized = raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`;
  return { Authorization: normalized };
}

export async function uploadLabel(uri, token) {
  const photoUrl = await persistImageUri(uri);
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  if (photoUrl) form.append("photoUrl", photoUrl);
  const result = await apiRequest(apiRoutes.FEEDING.LABEL, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: form
  });
  return photoUrl && result && typeof result === "object"
    ? { ...result, photoUrl }
    : result;
}

export function generateSchedule(data, token) {
  return apiRequest(apiRoutes.FEEDING.SCHEDULE, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: data
  });
}

export function convertScheduleToTemplate(data, token) {
  return apiRequest(apiRoutes.FEEDING.TO_TEMPLATE, {
    method: "POST",
    headers: buildAuthHeaders(token),
    body: data
  });
}
