import { uploadImage } from "@/api/uploads";
import { API_URL } from "@/api/apiRequest";

export function isPersistedImageUri(uri: string) {
  return /^https?:\/\//i.test(uri) || uri.startsWith("/uploads/");
}

export function resolveImageUri(uri: string | null | undefined) {
  const value = String(uri || "").trim();
  if (!value) return "";
  if (/^(file:|data:|blob:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const api = API_URL ? new URL(API_URL) : null;
      const pointsAtLocalApi = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
        parsed.hostname
      );
      if (api && pointsAtLocalApi && !["localhost", "127.0.0.1"].includes(api.hostname)) {
        return `${api.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  if (value.startsWith("/uploads/")) return `${API_URL}${value}`;
  if (value.startsWith("uploads/")) return `${API_URL}/${value}`;
  return value;
}

export async function persistImageUris(uris: string[]) {
  const persisted: string[] = [];
  for (const uri of uris) {
    if (!uri) continue;
    if (isPersistedImageUri(uri)) {
      persisted.push(uri);
      continue;
    }
    const uploaded = await uploadImage(uri);
    if (!uploaded?.url) {
      throw new Error("Image upload did not return a URL.");
    }
    persisted.push(uploaded.url);
  }
  return persisted;
}

export async function persistImageUri(uri: string | null | undefined) {
  if (!uri) return null;
  return (await persistImageUris([uri]))[0] || null;
}
