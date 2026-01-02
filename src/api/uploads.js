import { Platform } from "react-native";
import { client } from "./client";

export async function uploadImage(uri) {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "upload.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  if (Platform.OS === "web") {
    // For web, we need to fetch the blob
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("image", blob, filename);
  } else {
    // For native, we use the object format
    formData.append("image", {
      uri,
      name: filename,
      type
    });
  }

  return client.post("/api/uploads/image", formData);
}
