import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function analyzeDiagnosis(payload) {
  return apiRequest(apiRoutes.DIAGNOSE.ANALYZE, {
    method: "POST",
    body: payload
  });
}

export function getDiagnosisHistory() {
  return apiRequest(apiRoutes.DIAGNOSE.HISTORY);
}

export function getDiagnosis(id) {
  return apiRequest(apiRoutes.DIAGNOSE.DETAIL(id));
}

export function diagnosePhoto(file, symptom) {
  const formDataPhoto = new FormData();
  if (file) formDataPhoto.append("photo", file);
  if (symptom) formDataPhoto.append("symptom", symptom);

  return apiRequest(apiRoutes.DIAGNOSE.CREATE, { method: "POST", body: formDataPhoto });
}

export function diagnoseImage(uri) {
  const formDataImage = new FormData();
  formDataImage.append("photo", { uri, name: "plant.jpg", type: "image/jpeg" });

  return apiRequest(apiRoutes.DIAGNOSE.CREATE, { method: "POST", body: formDataImage });
}
