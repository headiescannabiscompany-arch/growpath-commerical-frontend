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

export function diagnosePhoto(file, symptom, options = {}) {
  const formDataPhoto = new FormData();
  if (file) formDataPhoto.append("photo", file);
  if (symptom) formDataPhoto.append("symptom", symptom);
  if (options.growId) formDataPhoto.append("growId", options.growId);
  if (options.plantId) formDataPhoto.append("plantId", options.plantId);
  formDataPhoto.append("context", JSON.stringify(options.context || {}));

  return apiRequest(apiRoutes.DIAGNOSE.CREATE, { method: "POST", body: formDataPhoto });
}

export function diagnoseImage(uri, options = {}) {
  const formDataImage = new FormData();
  formDataImage.append("photo", { uri, name: "plant.jpg", type: "image/jpeg" });
  if (options.growId) formDataImage.append("growId", options.growId);
  if (options.plantId) formDataImage.append("plantId", options.plantId);
  formDataImage.append("context", JSON.stringify(options.context || {}));

  return apiRequest(apiRoutes.DIAGNOSE.CREATE, { method: "POST", body: formDataImage });
}
