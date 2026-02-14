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
