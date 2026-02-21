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
    // Remove trailing slash from API_URL if present to avoid double slash,
    // though usually API_URL doesn't have it, and uri has it.
    // API_URL is typically "http://localhost:5001"
    const baseUrl = API_URL.replace(/\/$/, "");
    return `${baseUrl}${uri}`;
  }
  return uri;
}
