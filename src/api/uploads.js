import { Platform } from "react-native";
import { apiRequest } from "./apiRequest";
import { uriToBlob } from "./uriToBlob";

// CONTRACT:
// - apiRequest is the only network client
// - Web blob loading uses XHR (no fetch drift)
// - Native uses { uri, name, type } for FormData

function guessMime(filename) {
  const m = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpeg" || ext === "jpg") return "image/jpeg";
  return "image/jpeg";
}

function guessCourseMediaMime(filename) {
  const m = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "wav") return "audio/wav";
  return "application/octet-stream";
}

function normalizeUploadInput(input, fallbackName) {
  if (typeof input === "string") {
    return {
      uri: input,
      name: String(input).split("/").pop() || fallbackName,
      type: undefined
    };
  }
  return {
    uri: input?.uri,
    name:
      input?.name ||
      input?.fileName ||
      String(input?.uri || "")
        .split("/")
        .pop() ||
      fallbackName,
    type: input?.mimeType || input?.type
  };
}

// Unified upload function: supports web/native, FormData, and Authorization
export async function uploadImage(uri) {
  if (!uri) throw new Error("uploadImage: uri is required");

  const formData = new FormData();
  const filename = String(uri).split("/").pop() || "upload.jpg";
  const type = guessMime(filename);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(uri);
    formData.append("image", blob, filename);
  } else {
    formData.append("image", {
      uri,
      name: filename,
      type
    });
  }

  return apiRequest("/api/uploads/image", {
    method: "POST",
    body: formData
  });
}

export async function uploadCourseMedia(input) {
  const file = normalizeUploadInput(input, "lesson-media");
  if (!file.uri) throw new Error("uploadCourseMedia: uri is required");

  const formData = new FormData();
  const type = file.type || guessCourseMediaMime(file.name);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(file.uri);
    formData.append("media", blob, file.name);
  } else {
    formData.append("media", {
      uri: file.uri,
      name: file.name,
      type
    });
  }

  return apiRequest("/api/uploads/course-media", {
    method: "POST",
    body: formData
  });
}

export async function uploadEvidenceMedia(input) {
  const file = normalizeUploadInput(input, "evidence-media");
  if (!file.uri) throw new Error("uploadEvidenceMedia: uri is required");

  const formData = new FormData();
  const type = file.type || guessCourseMediaMime(file.name);
  const field = type.startsWith("image/") ? "image" : "media";

  if (Platform.OS === "web") {
    const blob = await uriToBlob(file.uri);
    formData.append(field, blob, file.name);
  } else {
    formData.append(field, {
      uri: file.uri,
      name: file.name,
      type
    });
  }

  return apiRequest(
    field === "image" ? "/api/uploads/image" : "/api/uploads/evidence-media",
    { method: "POST", body: formData }
  );
}
