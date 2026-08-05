import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MB = 1024 * 1024;

// The authenticated image endpoint accepts files up to 5 MB. Leave enough room for
// multipart overhead and browser differences instead of aiming at the hard limit.
export const EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES = Math.floor(4.5 * MB);
export const EVIDENCE_IMAGE_MAX_DIMENSION = 4096;

export type PreparedEvidenceImage = {
  blob: Blob;
  fileName: string;
  mimeType: string;
  originalBytes: number;
  uploadBytes: number;
  optimized: boolean;
};

export type PreparedNativeEvidenceImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  originalBytes: number;
  uploadBytes: number;
  optimized: boolean;
};

type PreparationOptions = { signal?: AbortSignal };

const AI_READY_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function preparationError(message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = "IMAGE_PREPARATION_FAILED";
  return error;
}

function canceledError() {
  const error = new Error("Photo preparation was canceled.") as Error & {
    code?: string;
  };
  error.code = "ABORTED";
  return error;
}

function throwIfCanceled(signal?: AbortSignal) {
  if (signal?.aborted) throw canceledError();
}

function jpegFileName(fileName: string) {
  const safe = String(fileName || "evidence-photo")
    .replace(/[?#].*$/, "")
    .replace(/\.[a-z0-9]{1,8}$/i, "");
  return `${safe || "evidence-photo"}.jpg`;
}

async function nativeFileBytes(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  const bytes = info.exists ? Number(info.size || 0) : 0;
  return Number.isFinite(bytes) && bytes > 0 ? Math.floor(bytes) : 0;
}

export async function discardPreparedNativeEvidenceImage(uri: string) {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Cache cleanup is best effort and must never hide a successfully prepared photo.
  }
}

/**
 * Prepares native picker assets before a signed upload. Expo's image manipulator
 * decodes iOS HEIC/HEIF input and writes a real JPEG, while iterative compression
 * keeps the result below the authenticated endpoint's safety target. Dimensions
 * only ever stay the same or shrink.
 */
export async function prepareNativeEvidenceImageForUpload(
  input: {
    uri: string;
    fileName?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    width?: number;
    height?: number;
  },
  options: PreparationOptions = {}
): Promise<PreparedNativeEvidenceImage> {
  throwIfCanceled(options.signal);
  const originalBytes =
    Number(input.fileSizeBytes || 0) || (await nativeFileBytes(input.uri));
  throwIfCanceled(options.signal);
  if (!originalBytes) {
    throw preparationError("GrowPath could not read the selected photo's file size.");
  }

  const originalType = String(input.mimeType || "").toLowerCase();
  const originalName = String(input.fileName || "evidence-photo");
  const originalExtension = originalName.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  const requiresJpegNormalization =
    !AI_READY_IMAGE_TYPES.has(originalType) ||
    originalExtension === "heic" ||
    originalExtension === "heif";
  if (!requiresJpegNormalization && originalBytes <= EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES) {
    return {
      uri: input.uri,
      fileName: originalName,
      mimeType: originalType,
      originalBytes,
      uploadBytes: originalBytes,
      optimized: false
    };
  }

  throwIfCanceled(options.signal);

  let sourceWidth = Number(input.width || 0);
  let sourceHeight = Number(input.height || 0);
  if (!sourceWidth || !sourceHeight) {
    const sourceRef = await ImageManipulator.manipulate(input.uri).renderAsync();
    throwIfCanceled(options.signal);
    sourceWidth = Number(sourceRef.width || 0);
    sourceHeight = Number(sourceRef.height || 0);
  }
  if (!sourceWidth || !sourceHeight) {
    throw preparationError("The selected photo's dimensions could not be read.");
  }

  let scale = Math.min(
    1,
    EVIDENCE_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  const generatedUris = new Set<string>();

  try {
    for (let resizePass = 0; resizePass < 4; resizePass += 1) {
      throwIfCanceled(options.signal);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const context = ImageManipulator.manipulate(input.uri);
      if (width < sourceWidth || height < sourceHeight) {
        context.resize({ width, height });
      }
      const rendered = await context.renderAsync();
      throwIfCanceled(options.signal);

      for (const quality of [0.9, 0.82, 0.74, 0.66]) {
        const candidate = await rendered.saveAsync({
          compress: quality,
          format: SaveFormat.JPEG
        });
        generatedUris.add(candidate.uri);
        throwIfCanceled(options.signal);
        const bytes = await nativeFileBytes(candidate.uri);
        throwIfCanceled(options.signal);
        if (!bytes) continue;
        if (bytes <= EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES) {
          for (const generatedUri of generatedUris) {
            if (generatedUri !== candidate.uri)
              void discardPreparedNativeEvidenceImage(generatedUri);
          }
          return {
            uri: candidate.uri,
            fileName: jpegFileName(originalName),
            mimeType: "image/jpeg",
            originalBytes,
            uploadBytes: bytes,
            optimized: true
          };
        }
      }
      scale *= 0.82;
    }
  } catch (error) {
    for (const generatedUri of generatedUris)
      void discardPreparedNativeEvidenceImage(generatedUri);
    throw error;
  }

  for (const generatedUri of generatedUris)
    void discardPreparedNativeEvidenceImage(generatedUri);
  throw preparationError(
    "This photo is still too large after GrowPath prepared it. Crop it or choose the phone's Medium or Large photo size, then retry."
  );
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number, signal?: AbortSignal) {
  throwIfCanceled(signal);
  return new Promise<Blob | null>((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      reject(canceledError());
    };
    signal?.addEventListener("abort", abort, { once: true });
    canvas.toBlob(
      (blob) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function loadImage(blob: Blob, signal?: AbortSignal) {
  throwIfCanceled(signal);
  if (
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw preparationError(
      "This photo is larger than the upload limit and this device could not resize it. Choose the phone's Medium or Large photo size, crop it, or export a smaller JPEG, then retry."
    );
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        callback();
      };
      const abort = () => finish(() => reject(canceledError()));
      signal?.addEventListener("abort", abort, { once: true });
      image.onload = () => finish(resolve);
      image.onerror = () =>
        finish(() => reject(preparationError("The selected photo could not be read.")));
      image.src = objectUrl;
    });
    throwIfCanceled(signal);
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareEvidenceImageForUpload(
  blob: Blob,
  fileName = "evidence-photo",
  options: PreparationOptions = {}
): Promise<PreparedEvidenceImage> {
  throwIfCanceled(options.signal);
  const originalBytes = Number(blob?.size || 0);
  const originalType = String(blob?.type || "").toLowerCase();
  const originalExtension = String(fileName || "")
    .toLowerCase()
    .match(/\.([a-z0-9]{1,8})(?:[?#].*)?$/)?.[1];
  const requiresJpegNormalization =
    !AI_READY_IMAGE_TYPES.has(originalType) ||
    originalExtension === "heic" ||
    originalExtension === "heif";
  if (
    !requiresJpegNormalization &&
    (!originalBytes || originalBytes <= EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES)
  ) {
    return {
      blob,
      fileName,
      mimeType: originalType,
      originalBytes,
      uploadBytes: originalBytes,
      optimized: false
    };
  }

  const image = await loadImage(blob, options.signal);
  const sourceWidth = Number(image.naturalWidth || image.width || 0);
  const sourceHeight = Number(image.naturalHeight || image.height || 0);
  if (!sourceWidth || !sourceHeight) {
    throw preparationError(
      "This photo is larger than the upload limit and its dimensions could not be read. Export it as a smaller JPEG, then retry."
    );
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.toBlob !== "function") {
    throw preparationError(
      "This photo is larger than the upload limit and this browser could not resize it. Choose the phone's Medium or Large photo size, crop it, or export a smaller JPEG, then retry."
    );
  }

  let scale = Math.min(
    1,
    EVIDENCE_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  for (let resizePass = 0; resizePass < 4; resizePass += 1) {
    throwIfCanceled(options.signal);
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.82, 0.74, 0.66]) {
      const candidate = await canvasBlob(canvas, quality, options.signal);
      if (!candidate) continue;
      if (candidate.size <= EVIDENCE_IMAGE_UPLOAD_TARGET_BYTES) {
        return {
          blob: candidate,
          fileName: jpegFileName(fileName),
          mimeType: "image/jpeg",
          originalBytes,
          uploadBytes: candidate.size,
          optimized: true
        };
      }
    }

    scale *= 0.82;
  }

  throw preparationError(
    "This photo is still too large after GrowPath prepared it. Crop it or choose the phone's Medium or Large photo size, then retry."
  );
}
