// src/api/uriToBlob.ts
// CONTRACT:
// - Web-only helper to convert a local/remote URI into a Blob without using fetch().
// - Intended for FormData uploads on web when you have a URI.

export function uriToBlob(uri: string): Promise<Blob> {
  if (!uri) return Promise.reject(new Error("uriToBlob: uri is required"));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", uri, true);
    xhr.responseType = "blob";

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Blob load failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Blob load failed (network error)"));
    xhr.send(null);
  });
}
