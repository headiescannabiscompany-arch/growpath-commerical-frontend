import { client, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

const isWebEnvironment =
  typeof document !== "undefined" ||
  (typeof navigator !== "undefined" && navigator.product === "ReactNativeWeb") ||
  (typeof window !== "undefined" && typeof window.document !== "undefined");

// Accepts FormData for media upload
export async function createPlant(formData, token) {
  return client.postMultipart(ROUTES.PLANTS.CREATE, formData, token);
}

export async function getPlants(token) {
  return client.get(ROUTES.PLANTS.LIST, token);
}

export async function getPlantWithLogs(id, token) {
  return client.get(ROUTES.PLANTS.DETAIL(id), token);
}

export async function createPlantLog(id, data, token) {
  return client.post(ROUTES.PLANTS.LOGS(id), data, token);
}

export async function getPlantStats(id, token) {
  return client.get(ROUTES.PLANTS.STATS(id), token);
}

export async function exportPlantPdf(plantId) {
  return client.get(ROUTES.PLANTS.EXPORT_PDF(plantId), {
    responseType: "blob"
  });
}

export async function uploadPlantPhoto(file) {
  const form = new FormData();

  if (isWebEnvironment) {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    form.append("photo", blob, file.name || "plant-photo.jpg");
  } else {
    form.append("photo", {
      uri: file.uri,
      name: file.name || "plant-photo.jpg",
      type: file.type || "image/jpeg"
    });
  }

  return postMultipart(ROUTES.PLANTS.UPLOAD_PHOTO, form);
}

export async function updatePlant(id, data) {
  return client(ROUTES.PLANTS.DETAIL(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}
