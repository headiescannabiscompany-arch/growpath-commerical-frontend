import { API_URL } from "../api/apiRequest";

/**
 * Resolves an image URI.
 * If it's a relative path (starts with /), prepends the API_URL.
 * Otherwise returns it as is.
 *
 * @param {string} uri
 * @returns {string}
 */
export function resolveImageUrl(uri) {
  if (!uri) return null;
  if (uri.startsWith("/")) {
    if (!API_URL) {
      throw new Error("API_URL_NOT_CONFIGURED");
    }
    const baseUrl = API_URL.replace(/\/$/, "");
    return `${baseUrl}${uri}`;
  }
  return uri;
}
