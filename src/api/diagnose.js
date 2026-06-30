import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";
import { persistImageUri } from "@/utils/photoUploads";

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

export function getDiagnosisProviderStatus() {
  return apiRequest(apiRoutes.DIAGNOSE.PROVIDER_STATUS);
}

export function submitDiagnosisFeedback(id, payload) {
  if (!id) throw new Error("Diagnosis id is required to save feedback.");
  return apiRequest(apiRoutes.DIAGNOSE.FEEDBACK(id), {
    method: "POST",
    body: payload
  });
}

async function promptForDiagnosisPhotoAttachment(photoUrl, options = {}) {
  try {
    await maybePromptAttachPhotosToGrow(photoUrl ? [photoUrl] : [], {
      skip: Boolean(options.growId)
    });
  } catch (_error) {
    // A failed optional attachment should not discard the diagnosis result.
  }
}

export async function diagnosePhoto(file, symptom, options = {}) {
  const photoUrl =
    options.photoUrl || (typeof file === "string" ? await persistImageUri(file) : null);
  const formDataPhoto = new FormData();
  if (file) formDataPhoto.append("photo", file);
  if (symptom) formDataPhoto.append("symptom", symptom);
  if (options.growId) formDataPhoto.append("growId", options.growId);
  if (options.plantId) formDataPhoto.append("plantId", options.plantId);
  if (photoUrl) formDataPhoto.append("photoUrl", photoUrl);
  formDataPhoto.append(
    "context",
    JSON.stringify({
      ...(options.context || {}),
      photoUrl
    })
  );

  const response = await apiRequest(apiRoutes.DIAGNOSE.CREATE, {
    method: "POST",
    body: formDataPhoto
  });
  await promptForDiagnosisPhotoAttachment(photoUrl, options);
  return response;
}

export async function diagnoseImage(uri, options = {}) {
  const photoUrl = await persistImageUri(uri);
  const formDataImage = new FormData();
  formDataImage.append("photo", { uri, name: "plant.jpg", type: "image/jpeg" });
  if (options.growId) formDataImage.append("growId", options.growId);
  if (options.plantId) formDataImage.append("plantId", options.plantId);
  if (photoUrl) formDataImage.append("photoUrl", photoUrl);
  formDataImage.append(
    "context",
    JSON.stringify({
      ...(options.context || {}),
      photoUrl
    })
  );

  const response = await apiRequest(apiRoutes.DIAGNOSE.CREATE, {
    method: "POST",
    body: formDataImage
  });
  await promptForDiagnosisPhotoAttachment(photoUrl, options);
  return response;
}
