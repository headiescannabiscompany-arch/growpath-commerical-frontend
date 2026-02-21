import { apiRequest } from "./apiRequest";
import { postMultipart } from "./client.js";
import apiRoutes from "./routes.js";

export function uploadLabel(uri, token) {
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  return postMultipart(apiRoutes.FEEDING.LABEL, form, token);
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
