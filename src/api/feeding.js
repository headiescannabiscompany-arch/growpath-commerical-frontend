import client from "./client";

export function uploadLabel(uri, token) {
  const form = new FormData();
  form.append("photo", { uri, name: "label.jpg", type: "image/jpeg" });
  return client.post("/feeding/label", form, token);
}

export function generateSchedule(data, token) {
  return client.post("/feeding/schedule", data, token);
}

export function convertScheduleToTemplate(data, token) {
  return client.post("/feeding/schedule/to-template", data, token);
}
