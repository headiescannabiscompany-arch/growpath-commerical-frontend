import { apiRequest } from "./apiRequest";

export const PERSONAL_GROW_PDF_MAX_BYTES = 25 * 1024 * 1024;
export const PERSONAL_GROW_PDF_TIMEOUT_MS = 60_000;
const BINARY_READ_TIMEOUT_MS = 10_000;
const ERROR_BODY_MAX_BYTES = 32 * 1024;

export type PersonalGrowPdfScope = {
  signal?: AbortSignal;
  isCurrentScope: () => boolean;
};

export type PersonalGrowPdfOptions = PersonalGrowPdfScope & { timeZone: string };

const messages: Record<string, string> = {
  PDF_UPGRADE_REQUIRED: "PDF export is not available on your current plan.",
  PDF_ACCOUNT_UNAVAILABLE: "PDF export is unavailable for this account.",
  PDF_GROW_NOT_FOUND: "This grow is no longer available for PDF export.",
  PDF_INPUT_INVALID: "Choose a valid grow and time zone, then try again.",
  PDF_PHOTO_UNAVAILABLE: "A saved photo could not be included. No PDF was saved.",
  PDF_TEXT_UNSUPPORTED: "Some saved text uses unsupported characters. No PDF was saved.",
  PDF_LIMIT_EXCEEDED: "This report exceeds the PDF export limits. No PDF was saved.",
  PDF_SOURCE_CHANGED:
    "The timeline or export context changed. Refresh before trying again.",
  PDF_BUSY: "Another PDF export is running. Wait for it to finish, then try again.",
  PDF_TIMEOUT: "PDF export timed out. Please try again.",
  PDF_ABORTED: "PDF export was canceled.",
  PDF_GENERATION_FAILED: "The PDF could not be generated. Please try again.",
  PDF_RESPONSE_INVALID: "The PDF response could not be verified. No file was saved.",
  PDF_DELIVERY_UNAVAILABLE: "File saving is unavailable on this device. Try the web app.",
  PDF_DELIVERY_FAILED:
    "The PDF could not be handed off to your device. Please try again.",
  PDF_CLEANUP_FAILED:
    "Temporary PDF cleanup failed. A cached copy may remain on this device.",
  PDF_SIGN_IN_REQUIRED: "Sign in again before exporting a PDF."
};

export class PersonalGrowPdfError extends Error {
  readonly code: string;

  constructor(code: string) {
    const safeCode = Object.hasOwn(messages, code) ? code : "PDF_GENERATION_FAILED";
    super(messages[safeCode]);
    this.code = safeCode;
    this.name = safeCode === "PDF_ABORTED" ? "AbortError" : "PersonalGrowPdfError";
  }
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "PDF_GENERATION_FAILED";
  const value = error as { code?: unknown; name?: unknown; status?: unknown };
  if (typeof value.code === "string" && Object.hasOwn(messages, value.code)) {
    return value.code;
  }
  if (value.name === "AbortError" || value.code === "ABORTED") return "PDF_ABORTED";
  if (value.code === "TIMEOUT") return "PDF_TIMEOUT";
  if (value.status === 401) return "PDF_SIGN_IN_REQUIRED";
  if (value.status === 403) return "PDF_ACCOUNT_UNAVAILABLE";
  if (value.status === 404) return "PDF_GROW_NOT_FOUND";
  if (value.status === 413) return "PDF_LIMIT_EXCEEDED";
  return "PDF_GENERATION_FAILED";
}

/** Never interpolate a transport message, private source path, or server payload. */
export function personalGrowPdfErrorMessage(error: unknown): string {
  return messages[errorCode(error)];
}

export function assertPersonalGrowPdfScope(options: PersonalGrowPdfScope): void {
  if (options.signal?.aborted) throw new PersonalGrowPdfError("PDF_ABORTED");
  if (!options.isCurrentScope()) throw new PersonalGrowPdfError("PDF_SOURCE_CHANGED");
}

export function personalGrowPdfTimeZone(value: string): string {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_+\-/]{0,99}$/.test(value)) {
    throw new PersonalGrowPdfError("PDF_INPUT_INVALID");
  }
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    throw new PersonalGrowPdfError("PDF_INPUT_INVALID");
  }
}

/** FileReader works on native as well as web; cancel its work, listeners and timer. */
export function readPersonalGrowPdfBlob(
  blob: Blob,
  mode: "text" | "dataURL",
  options: PersonalGrowPdfScope
): Promise<string> {
  assertPersonalGrowPdfScope(options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: PersonalGrowPdfError, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      reader.onload = reader.onerror = reader.onabort = null;
      if (error) reject(error);
      else resolve(value || "");
    };
    const stop = (code: string) => {
      finish(new PersonalGrowPdfError(code));
      reader.abort();
    };
    const abort = () => stop("PDF_ABORTED");
    reader.onload = () => {
      try {
        assertPersonalGrowPdfScope(options);
        if (typeof reader.result !== "string") {
          throw new PersonalGrowPdfError("PDF_RESPONSE_INVALID");
        }
        finish(undefined, reader.result);
      } catch (error) {
        finish(new PersonalGrowPdfError(errorCode(error)));
      }
    };
    reader.onerror = () => finish(new PersonalGrowPdfError("PDF_RESPONSE_INVALID"));
    reader.onabort = () => finish(new PersonalGrowPdfError("PDF_ABORTED"));
    options.signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => stop("PDF_TIMEOUT"), BINARY_READ_TIMEOUT_MS);
    try {
      assertPersonalGrowPdfScope(options);
      if (mode === "text") reader.readAsText(blob);
      else reader.readAsDataURL(blob);
    } catch (error) {
      finish(new PersonalGrowPdfError(errorCode(error)));
    }
  });
}

/** Transport validation, not a replacement for the server's parsed-file tests. */
export async function validatePersonalGrowPdfBlob(
  blob: Blob,
  options: PersonalGrowPdfScope
): Promise<void> {
  assertPersonalGrowPdfScope(options);
  if (
    !(blob instanceof Blob) ||
    blob.size <= 0 ||
    blob.type.split(";")[0].trim().toLowerCase() !== "application/pdf"
  ) {
    throw new PersonalGrowPdfError("PDF_RESPONSE_INVALID");
  }
  if (blob.size > PERSONAL_GROW_PDF_MAX_BYTES) {
    throw new PersonalGrowPdfError("PDF_LIMIT_EXCEEDED");
  }
  const header = await readPersonalGrowPdfBlob(blob.slice(0, 16), "text", options);
  if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)/.test(header)) {
    throw new PersonalGrowPdfError("PDF_RESPONSE_INVALID");
  }
  const trailer = await readPersonalGrowPdfBlob(
    blob.slice(Math.max(0, blob.size - 1024)),
    "text",
    options
  );
  if (!/%%EOF[\t\r\n ]*$/.test(trailer)) {
    throw new PersonalGrowPdfError("PDF_RESPONSE_INVALID");
  }
  assertPersonalGrowPdfScope(options);
}

async function safeRequestError(
  error: unknown,
  options: PersonalGrowPdfScope
): Promise<PersonalGrowPdfError> {
  assertPersonalGrowPdfScope(options);
  const data = (error as { data?: unknown } | null)?.data;
  if (
    data instanceof Blob &&
    data.size > 0 &&
    data.size <= ERROR_BODY_MAX_BYTES &&
    data.type.split(";")[0].trim().toLowerCase() === "application/json"
  ) {
    try {
      const payload = JSON.parse(await readPersonalGrowPdfBlob(data, "text", options));
      const code = payload?.error?.code ?? payload?.code;
      if (typeof code === "string" && Object.hasOwn(messages, code)) {
        return new PersonalGrowPdfError(code);
      }
    } catch {
      // Failed/oversized/unrecognized error bodies never become user-visible text.
    }
  }
  assertPersonalGrowPdfScope(options);
  return new PersonalGrowPdfError(errorCode(error));
}

export async function requestPersonalGrowTimelinePdf(
  growId: string,
  options: PersonalGrowPdfOptions
): Promise<Blob> {
  assertPersonalGrowPdfScope(options);
  if (
    typeof growId !== "string" ||
    !growId ||
    growId.length > 128 ||
    growId.trim() !== growId ||
    /[\s/\\?#]/.test(growId) ||
    [...growId].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  ) {
    throw new PersonalGrowPdfError("PDF_INPUT_INVALID");
  }
  const timeZone = personalGrowPdfTimeZone(options.timeZone);
  assertPersonalGrowPdfScope(options);
  let blob: Blob;
  try {
    blob = await apiRequest<Blob>(
      `/api/personal/grows/${encodeURIComponent(growId)}/timeline/pdf`,
      {
        method: "GET",
        params: { timeZone },
        auth: true,
        responseType: "blob",
        cache: "no-store",
        redirect: "error",
        signal: options.signal,
        timeoutMs: PERSONAL_GROW_PDF_TIMEOUT_MS,
        retries: 0,
        invalidateOn401: false
      }
    );
  } catch (error) {
    throw await safeRequestError(error, options);
  }
  await validatePersonalGrowPdfBlob(blob, options);
  return blob;
}
