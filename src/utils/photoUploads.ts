import { uploadImage } from "@/api/uploads";
import { API_URL } from "@/api/apiRequest";

export function isPersistedImageUri(uri: string) {
  return (
    /^https?:\/\//i.test(uri) ||
    uri.startsWith("/uploads/") ||
    uri.startsWith("/api/videos/uploads/") ||
    uri.startsWith("/api/evidence-assets/uploads/")
  );
}

export function resolveImageUri(uri: string | null | undefined) {
  const value = String(uri || "")
    .trim()
    .replace(/\\/g, "/");
  if (!value) return "";
  if (/^(file:|data:|blob:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const api = API_URL ? new URL(API_URL) : null;
      const pointsAtLocalApi = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
        parsed.hostname
      );
      const isApiUploadPath =
        parsed.pathname.startsWith("/uploads/") ||
        parsed.pathname.startsWith("/api/videos/uploads/") ||
        parsed.pathname.startsWith("/api/evidence-assets/uploads/");
      const apiRootHost = api?.hostname.replace(/^api\./i, "");
      const pointsAtFirstPartyWebHost = Boolean(
        apiRootHost &&
        (parsed.hostname === apiRootHost || parsed.hostname.endsWith(`.${apiRootHost}`))
      );
      if (
        api &&
        isApiUploadPath &&
        parsed.origin !== api.origin &&
        (pointsAtLocalApi || pointsAtFirstPartyWebHost)
      ) {
        return `${api.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  const apiOrigin = String(API_URL || "").replace(/\/+$/, "");
  if (value.startsWith("/uploads/")) return `${apiOrigin}${value}`;
  if (value.startsWith("/api/videos/uploads/")) return `${apiOrigin}${value}`;
  if (value.startsWith("/api/evidence-assets/uploads/")) {
    return `${apiOrigin}${value}`;
  }
  if (value.startsWith("uploads/")) return `${apiOrigin}/${value}`;
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
