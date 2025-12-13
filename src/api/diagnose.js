import { client as api } from "./client";

export function analyzeDiagnosis(payload) {
  return api("/diagnose/analyze", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDiagnosisHistory() {
  return api("/diagnose/history");
}

export function getDiagnosis(id) {
  return api(`/diagnose/${id}`);
}

export function diagnosePhoto(file, symptom) {
  const form = new FormData();
  if (file) form.append("photo", file);
  if (symptom) form.append("symptom", symptom);

  return api("/diagnose", {
    method: "POST",
    body: form
  });
}

export function diagnoseImage(uri) {
  const form = new FormData();
  form.append("photo", { uri, name: "plant.jpg", type: "image/jpeg" });

  return api("/diagnose", {
    method: "POST",
    body: form
  });
}
