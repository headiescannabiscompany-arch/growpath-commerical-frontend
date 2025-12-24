import { client, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

export function uploadLabel(uri, token) {
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  return postMultipart(ROUTES.FEEDING.LABEL, form, token);
}

export function generateSchedule(data, token) {
  return client.post(ROUTES.FEEDING.SCHEDULE, data, token);
}

export function convertScheduleToTemplate(data, token) {
  return client.post(ROUTES.FEEDING.TO_TEMPLATE, data, token);
}
