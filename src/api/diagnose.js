import { client as api, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

export function analyzeDiagnosis(payload) {
  return api(ROUTES.DIAGNOSE.ANALYZE, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDiagnosisHistory() {
  return api(ROUTES.DIAGNOSE.HISTORY);
}

export function getDiagnosis(id) {
  return api(ROUTES.DIAGNOSE.DETAIL(id));
}

export function diagnosePhoto(file, symptom) {
  const form = new FormData();
  if (file) form.append("photo", file);
  if (symptom) form.append("symptom", symptom);

  return postMultipart(ROUTES.DIAGNOSE.CREATE, form);
}

export function diagnoseImage(uri) {
  const form = new FormData();
  form.append("photo", { uri, name: "plant.jpg", type: "image/jpeg" });

  return postMultipart(ROUTES.DIAGNOSE.CREATE, form);
}
