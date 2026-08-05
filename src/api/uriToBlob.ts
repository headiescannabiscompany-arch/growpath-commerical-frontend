// src/api/uriToBlob.ts
// CONTRACT:
// - Web-only helper to convert a local/remote URI into a Blob without using fetch().
// - Intended for FormData uploads on web when you have a URI.

type UriToBlobOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

function blobReadError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

export function uriToBlob(uri: string, options: UriToBlobOptions = {}): Promise<Blob> {
  if (!uri) return Promise.reject(new Error("uriToBlob: uri is required"));
  if (options.signal?.aborted) {
    return Promise.reject(blobReadError("ABORTED", "The file read was canceled."));
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const abort = () => xhr.abort();
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", abort);
      callback();
    };
    xhr.open("GET", uri, true);
    xhr.responseType = "blob";
    xhr.timeout = Math.max(0, Number(options.timeoutMs || 0));
    options.signal?.addEventListener("abort", abort, { once: true });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        finish(() => resolve(xhr.response as Blob));
      } else {
        finish(() => reject(new Error(`Blob load failed (${xhr.status})`)));
      }
    };

    xhr.onerror = () =>
      finish(() => reject(new Error("Blob load failed (network error)")));
    xhr.onabort = () =>
      finish(() => reject(blobReadError("ABORTED", "The file read was canceled.")));
    xhr.ontimeout = () =>
      finish(() =>
        reject(blobReadError("TIMEOUT", "Reading the selected file timed out."))
      );
    xhr.send(null);
  });
}
