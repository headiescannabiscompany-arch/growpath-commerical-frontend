import { Platform } from "react-native";
import { API_URL, apiRequest } from "../api/apiRequest";
import {
  downloadMarketplaceContent,
  marketplaceDownloadUrl,
  MARKETPLACE_BUYER_ROUTES
} from "../api/marketplaceBuyer";
import { openAuthorizedExternalUrl } from "./openAuthorizedExternalUrl";

export const MARKETPLACE_FILE_MIMES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav"
];
export const MARKETPLACE_FILE_MAX_BYTES = 10 * 1024 * 1024;

function checkActive(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("Download canceled.");
}

function filenameForDownload(value: string, mime: string) {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav"
  };
  const stem =
    String(value || "offer")
      .split(/[\\/]/)
      .pop()!
      .replace(/\.[^.]*$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 100) || "offer";
  return `${stem}.${extensions[mime]}`;
}

export async function saveMarketplaceBlob(
  blob: Blob,
  filename: string,
  signal?: AbortSignal
) {
  checkActive(signal);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    try {
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      checkActive(signal);
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return;
  }
  // Match the existing optional native export path; web never loads these modules.
  const fileSystem: typeof import("expo-file-system/legacy") = require("expo-file-system/legacy");
  const sharing: typeof import("expo-sharing") = require("expo-sharing");
  if (!fileSystem.cacheDirectory || !(await sharing.isAvailableAsync())) {
    throw new Error(
      "File saving is unavailable on this device. Download from the web app."
    );
  }
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to prepare the downloaded file."));
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
  checkActive(signal);
  const uri = `${fileSystem.cacheDirectory}marketplace-${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
  try {
    await fileSystem.writeAsStringAsync(uri, encoded, {
      encoding: fileSystem.EncodingType.Base64
    });
    checkActive(signal);
    await sharing.shareAsync(uri, { mimeType: blob.type, dialogTitle: filename });
  } finally {
    await fileSystem.deleteAsync(uri, { idempotent: true });
  }
}

/** Each click authorizes the receipt AND byte request; a receipt is not a bearer link. */
export async function downloadAndSaveMarketplaceContent(
  contentId: string,
  options: {
    signal?: AbortSignal;
    allowLegacyExternal?: boolean;
    saveBlob?: typeof saveMarketplaceBlob;
  } = {}
) {
  const { signal } = options;
  checkActive(signal);
  const response = await downloadMarketplaceContent(contentId, { signal });
  checkActive(signal);
  const receipt = response?.data || response;
  if (receipt?.deliveryType === "protected_asset" || receipt?.downloadPath) {
    const path = MARKETPLACE_BUYER_ROUTES.FILE(contentId);
    const assetId = String(receipt.expectedAssetId || "");
    const mime = String(receipt.mimeType || "").toLowerCase();
    if (
      receipt.deliveryType !== "protected_asset" ||
      receipt.downloadPath !== path ||
      !/^[a-f0-9]{24}$/i.test(assetId) ||
      !MARKETPLACE_FILE_MIMES.includes(mime)
    ) {
      throw new Error(
        "The server returned an invalid protected download. Refresh and try again."
      );
    }
    const blob = await apiRequest<Blob>(path, {
      method: "GET",
      params: { assetId },
      auth: true,
      responseType: "blob",
      cache: "no-store",
      redirect: "error",
      signal,
      timeoutMs: 60000
    });
    checkActive(signal);
    if (
      !(blob instanceof Blob) ||
      blob.size <= 0 ||
      blob.size > MARKETPLACE_FILE_MAX_BYTES ||
      blob.type.split(";")[0].trim().toLowerCase() !== mime
    ) {
      throw new Error(
        "The protected file response could not be verified. Nothing was saved."
      );
    }
    await (options.saveBlob || saveMarketplaceBlob)(
      blob,
      filenameForDownload(receipt.filename || "offer", mime),
      signal
    );
    return;
  }
  // Only explicitly free legacy offers retain an external-file handoff.
  const url = marketplaceDownloadUrl(response);
  if (!options.allowLegacyExternal || !url || !/^(https?:\/\/|\/uploads\/)/i.test(url)) {
    throw new Error(
      "Protected delivery is unavailable. Ask the seller to upload a protected offer file."
    );
  }
  checkActive(signal);
  const destination = new URL(url, `${new URL(API_URL).origin}/`);
  if (
    !["http:", "https:"].includes(destination.protocol) ||
    destination.username ||
    destination.password
  ) {
    throw new Error("The legacy file address is invalid.");
  }
  await openAuthorizedExternalUrl(destination.href);
}
