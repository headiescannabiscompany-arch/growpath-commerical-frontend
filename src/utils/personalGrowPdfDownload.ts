import { Platform } from "react-native";
import {
  assertPersonalGrowPdfScope,
  PersonalGrowPdfError,
  PersonalGrowPdfOptions,
  PersonalGrowPdfScope,
  readPersonalGrowPdfBlob,
  requestPersonalGrowTimelinePdf,
  validatePersonalGrowPdfBlob
} from "../api/personalGrowPdf";

const FILENAME = "growpath-timeline.pdf";
const PREPARATION_TIMEOUT_MS = 10_000;
const OBJECT_URL_MAX_LIFETIME_MS = 60_000;
// A native system sheet belongs to the process, not one mounted React screen.
let nativeHandoffInFlight = false;

export type PersonalGrowPdfDelivery = {
  filename: string;
  method: "web-download" | "native-share-file";
  dispose: () => void;
};

function boundedOperation<T>(
  operation: Promise<T>,
  options: PersonalGrowPdfScope,
  timeoutMs = PREPARATION_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(value as T);
    };
    const abort = () => finish(new PersonalGrowPdfError("PDF_ABORTED"));
    const timer = setTimeout(
      () => finish(new PersonalGrowPdfError("PDF_TIMEOUT")),
      timeoutMs
    );
    options.signal?.addEventListener("abort", abort, { once: true });
    operation.then(
      (value) => finish(undefined, value),
      (error) => finish(error)
    );
    try {
      assertPersonalGrowPdfScope(options);
    } catch (error) {
      finish(error);
    }
  });
}

function saveWeb(blob: Blob, options: PersonalGrowPdfScope): PersonalGrowPdfDelivery {
  assertPersonalGrowPdfScope(options);
  const url = URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | undefined;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", dispose);
    URL.revokeObjectURL(url);
  };
  options.signal?.addEventListener("abort", dispose, { once: true });
  try {
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = FILENAME;
    document.body.appendChild(anchor);
    assertPersonalGrowPdfScope(options);
    anchor.click();
    assertPersonalGrowPdfScope(options);
    // Keep bytes alive through browser handoff. Caller disposes on scope/unmount;
    // an upper bound also protects callers that forget to dispose.
    timer = setTimeout(dispose, OBJECT_URL_MAX_LIFETIME_MS);
    return { filename: FILENAME, method: "web-download", dispose };
  } catch (error) {
    dispose();
    throw error;
  } finally {
    anchor?.remove();
  }
}

async function saveNative(
  blob: Blob,
  options: PersonalGrowPdfScope
): Promise<PersonalGrowPdfDelivery> {
  if (nativeHandoffInFlight) throw new PersonalGrowPdfError("PDF_BUSY");
  const fileSystem: typeof import("expo-file-system/legacy") = require("expo-file-system/legacy");
  const sharing: typeof import("expo-sharing") = require("expo-sharing");
  assertPersonalGrowPdfScope(options);
  if (
    !fileSystem.cacheDirectory ||
    !(await boundedOperation(sharing.isAvailableAsync(), options))
  ) {
    throw new PersonalGrowPdfError("PDF_DELIVERY_UNAVAILABLE");
  }
  const encoded = await readPersonalGrowPdfBlob(blob, "dataURL", options);
  const match = /^data:application\/pdf(?:;[^,]*)?;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    encoded
  );
  if (!match) throw new PersonalGrowPdfError("PDF_RESPONSE_INVALID");
  assertPersonalGrowPdfScope(options);
  const uri = `${fileSystem.cacheDirectory}growpath-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}-${FILENAME}`;
  let write: Promise<void> | undefined;
  let handoffError: unknown;
  const cleanup = () => fileSystem.deleteAsync(uri, { idempotent: true });
  const abortHandoff = () => {
    // This removes our cached source; it cannot close the OS sheet or recall any
    // bytes already copied by another app. Final cleanup is retried on settlement.
    void Promise.resolve()
      .then(cleanup)
      .catch(() => {});
  };
  try {
    write = fileSystem.writeAsStringAsync(uri, match[1], {
      encoding: fileSystem.EncodingType.Base64
    });
    await boundedOperation(write, options);
    assertPersonalGrowPdfScope(options);
    if (nativeHandoffInFlight) throw new PersonalGrowPdfError("PDF_BUSY");
    options.signal?.addEventListener("abort", abortHandoff, { once: true });
    nativeHandoffInFlight = true;
    try {
      assertPersonalGrowPdfScope(options);
      // The OS share sheet has no cancellation API. Keep admission locked until
      // its actual promise settles, including after cancellation or unmount.
      await sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: FILENAME
      });
    } finally {
      nativeHandoffInFlight = false;
      options.signal?.removeEventListener("abort", abortHandoff);
    }
    assertPersonalGrowPdfScope(options);
  } catch (error) {
    handoffError = error;
  }
  // Native writes cannot be canceled. A late completion must delete again even
  // if abort/timeout already removed the partially written cache file.
  void write?.then(cleanup, cleanup).catch(() => {});
  try {
    await boundedOperation(cleanup(), { isCurrentScope: () => true });
  } catch {
    throw new PersonalGrowPdfError("PDF_CLEANUP_FAILED");
  }
  if (handoffError) throw handoffError;
  return { filename: FILENAME, method: "native-share-file", dispose: () => {} };
}

/** A browser click/share handoff is not proof that the person saved a file. */
export async function saveTimelinePdfBlob(
  blob: Blob,
  options: PersonalGrowPdfScope
): Promise<PersonalGrowPdfDelivery> {
  try {
    await validatePersonalGrowPdfBlob(blob, options);
    assertPersonalGrowPdfScope(options);
    return Platform.OS === "web"
      ? saveWeb(blob, options)
      : await saveNative(blob, options);
  } catch (error) {
    if (error instanceof PersonalGrowPdfError) throw error;
    throw new PersonalGrowPdfError("PDF_DELIVERY_FAILED");
  }
}

export async function downloadPersonalGrowTimelinePdf(
  growId: string,
  options: PersonalGrowPdfOptions
): Promise<PersonalGrowPdfDelivery> {
  const blob = await requestPersonalGrowTimelinePdf(growId, options);
  assertPersonalGrowPdfScope(options);
  return saveTimelinePdfBlob(blob, options);
}
