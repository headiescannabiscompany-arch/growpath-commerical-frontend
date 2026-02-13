import { Platform } from "react-native";
import { apiRequest } from "./apiRequest";

export async function uploadImage(uri) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "upload.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
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
