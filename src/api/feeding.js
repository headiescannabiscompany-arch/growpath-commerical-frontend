import { client, postMultipart } from "./client.js";
import apiRoutes from "./routes.js";

export function uploadLabel(uri, token) {
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  return postMultipart(apiRoutes.FEEDING.LABEL, form, token);
}

export function generateSchedule(data, token) {
  return client.post(apiRoutes.FEEDING.SCHEDULE, data, token);
}

export function convertScheduleToTemplate(data, token) {
  return client.post(apiRoutes.FEEDING.TO_TEMPLATE, data, token);
}
