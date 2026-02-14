import { Platform } from "react-native";
import ROUTES from "./routes.js";
import { apiRequest } from "./apiRequest";
import { uriToBlob } from "./uriToBlob";

// CONTRACT:
// - apiRequest is the only network client
// - Web blob loading uses uriToBlob helper (no direct network calls here)
// - Native uses { uri, name, type } for FormData

function guessMimeFromName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  return "image/jpeg";
}

// Accepts FormData for media upload
export async function createPlant(formData, _token) {
  return apiRequest(ROUTES.PLANTS.CREATE, {
    method: "POST",
    body: formData
  });
}

export async function getPlants(_token) {
  return apiRequest(ROUTES.PLANTS.LIST, { method: "GET" });
}

export async function getPlantWithLogs(id, _token) {
  return apiRequest(ROUTES.PLANTS.DETAIL(id), { method: "GET" });
}

export async function createPlantLog(id, data, _token) {
  return apiRequest(ROUTES.PLANTS.LOGS(id), {
    method: "POST",
    body: data
  });
}

export async function getPlantStats(id, _token) {
  return apiRequest(ROUTES.PLANTS.STATS(id), { method: "GET" });
}

export async function exportPlantPdf(plantId) {
  return apiRequest(ROUTES.PLANTS.EXPORT_PDF(plantId), {
    method: "GET",
    responseType: "blob"
  });
}

export async function uploadPlantPhoto(file) {
  if (!file || !file.uri) throw new Error("uploadPlantPhoto: file.uri is required");

  const form = new FormData();
  const name = file.name || "plant-photo.jpg";
  const type = file.type || guessMimeFromName(name);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(file.uri);
    form.append("photo", blob, name);
  } else {
    form.append("photo", {
      uri: file.uri,
      name,
      type
    });
  }

  return apiRequest(ROUTES.PLANTS.UPLOAD_PHOTO, {
    method: "POST",
    body: form
  });
}

export async function updatePlant(id, data) {
  return apiRequest(ROUTES.PLANTS.DETAIL(id), {
    method: "PUT",
    body: data
  });
}
