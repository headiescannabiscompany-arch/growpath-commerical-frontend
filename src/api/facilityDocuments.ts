import { Platform } from "react-native";
import { ApiError, apiRequest, type ApiRequestOptions } from "./apiRequest";
import { uriToBlob } from "./uriToBlob";
import { getToken } from "@/auth/tokenStore";

export type DocumentStatus = {
  assetId: string;
  status: "active" | "scan_pending" | "pending" | "held" | "released";
  activationAllowed: boolean;
  url?: string;
};
export type DocumentFile = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  file?: Blob;
};
export type RecentDocument = DocumentStatus & {
  filename: string;
  mimeType: string;
  createdAt: string | null;
  bytes: number;
};
const ID = /^[a-f0-9]{24}$/;
export const DOCUMENT_FORMATS = Object.freeze({
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx"
});
export type DocumentUploadPolicy = { mimeTypes: string[] };
// Correlation only, never an authentication or permission token.
export function newDocumentRequestKey() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `document-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
  );
}
function base(facilityId: string) {
  if (!/^[A-Za-z0-9_:-]{1,128}$/.test(facilityId))
    throw new Error("Select the Facility again.");
  return `/api/facility/${encodeURIComponent(facilityId)}/course-documents`;
}
export function documentStatus(value: any): DocumentStatus {
  if (
    value?.ok !== true ||
    !ID.test(value?.assetId || "") ||
    !["active", "pending", "scan_pending", "held", "released"].includes(value?.status) ||
    typeof value?.activationAllowed !== "boolean" ||
    (value.status === "active") !== value.activationAllowed ||
    (value.activationAllowed && value.url !== `/api/course-media/${value.assetId}/file`)
  )
    throw new Error(
      "The document status could not be verified. Check again before attaching it."
    );
  return {
    assetId: value.assetId,
    status: value.status,
    activationAllowed: value.activationAllowed,
    ...(value.activationAllowed ? { url: value.url } : {})
  };
}
async function scopedRequest(
  path: string,
  bearer: string,
  options: ApiRequestOptions = {}
) {
  if (!bearer || (await getToken()) !== bearer || options.signal?.aborted)
    throw new Error("Your session changed. Reopen this editor.");
  const result = await apiRequest(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${bearer}` },
    cache: "no-store",
    retries: 0,
    invalidateOn401: false,
    timeoutMs: 45000
  });
  if ((await getToken()) !== bearer || options.signal?.aborted)
    throw new Error("Your session changed. Reopen this editor.");
  return result;
}
export async function getDocumentUploadPolicy(
  facilityId: string,
  bearer: string,
  signal?: AbortSignal
) {
  let result;
  try {
    result = await scopedRequest(`${base(facilityId)}/capabilities`, bearer, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.code === "DOCUMENT_UPLOADS_DISABLED")
      return null;
    throw error;
  }
  if (
    !(
      result?.ok === true &&
      result.enabled === true &&
      result.maxBytes === 10 * 1024 * 1024 &&
      Array.isArray(result.mimeTypes) &&
      result.mimeTypes.includes("application/pdf")
    )
  )
    return null;
  return {
    mimeTypes: Object.keys(DOCUMENT_FORMATS).filter((mime) =>
      result.mimeTypes.includes(mime)
    )
  };
}
export async function getDocumentCapabilities(
  facilityId: string,
  bearer: string,
  signal?: AbortSignal
) {
  return Boolean(await getDocumentUploadPolicy(facilityId, bearer, signal));
}
export function validateFacilityDocumentInput(
  file: DocumentFile,
  allowedMimeTypes: string[]
) {
  const entry = Object.entries(DOCUMENT_FORMATS).find(
    ([, ext]) =>
      typeof file.name === "string" && file.name.toLowerCase().endsWith(`.${ext}`)
  );
  if (
    !entry ||
    !allowedMimeTypes.includes(entry[0]) ||
    !file.uri ||
    file.name.length > 160 ||
    /[/\\]/.test(file.name) ||
    Array.from(file.name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127
    ) ||
    (file.mimeType && file.mimeType !== entry[0]) ||
    (file.size != null &&
      (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024))
  )
    throw new Error(
      "Choose a supported document of 10 MB or less with its original file extension."
    );
  return entry[0];
}
export function validateFacilityPdfInput(file: DocumentFile) {
  if (
    !file.uri ||
    !/\.pdf$/i.test(file.name) ||
    (file.mimeType && file.mimeType !== "application/pdf") ||
    (file.size != null &&
      (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > 10 * 1024 * 1024))
  )
    throw new Error("Choose a PDF of 10 MB or less.");
}
export async function uploadFacilityPdf(
  facilityId: string,
  file: DocumentFile,
  key: string,
  bearer: string,
  signal?: AbortSignal
) {
  validateFacilityPdfInput(file);
  return uploadFacilityDocument(facilityId, file, key, bearer, signal, [
    "application/pdf"
  ]);
}
export async function uploadFacilityDocument(
  facilityId: string,
  file: DocumentFile,
  key: string,
  bearer: string,
  signal: AbortSignal | undefined,
  allowedMimeTypes: string[]
) {
  const mimeType = validateFacilityDocumentInput(file, allowedMimeTypes);
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(key)) throw new Error("Invalid upload attempt.");
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = file.file || (await uriToBlob(file.uri, { signal, timeoutMs: 30000 }));
    if (blob.size < 1 || blob.size > 10 * 1024 * 1024)
      throw new ApiError("DOCUMENT_FILE_REJECTED", 422);
    if (blob.type && blob.type !== mimeType)
      throw new ApiError("DOCUMENT_FILE_REJECTED", 422);
    // Missing browser MIME metadata is common. Preserve bytes, supplying only
    // the allowlisted multipart type; server byte validation remains mandatory.
    form.append(
      "document",
      blob.type ? blob : blob.slice(0, blob.size, mimeType),
      file.name
    );
  } else {
    form.append("document", {
      uri: file.uri,
      name: file.name,
      type: mimeType
    } as any);
  }
  return documentStatus(
    await scopedRequest(base(facilityId), bearer, {
      method: "POST",
      body: form,
      signal,
      headers: { "Idempotency-Key": key }
    })
  );
}
export async function findFacilityDocument(
  facilityId: string,
  key: string,
  bearer: string,
  signal?: AbortSignal
) {
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(key)) throw new Error("Invalid document reference.");
  return documentStatus(
    await scopedRequest(`${base(facilityId)}/uploads/by-key/${key}`, bearer, { signal })
  );
}
export async function promoteFacilityDocument(
  facilityId: string,
  assetId: string,
  bearer: string,
  signal?: AbortSignal
) {
  if (!ID.test(assetId)) throw new Error("Invalid document reference.");
  return documentStatus(
    await scopedRequest(`${base(facilityId)}/${assetId}/promote`, bearer, {
      method: "POST",
      body: {},
      signal
    })
  );
}
export async function getFacilityDocument(
  facilityId: string,
  assetId: string,
  bearer: string,
  signal?: AbortSignal
) {
  if (!ID.test(assetId)) throw new Error("Invalid document reference.");
  return documentStatus(
    await scopedRequest(`${base(facilityId)}/${assetId}`, bearer, { signal })
  );
}
export async function listRecentFacilityDocuments(
  facilityId: string,
  bearer: string,
  signal?: AbortSignal
): Promise<RecentDocument[]> {
  const result = await scopedRequest(`${base(facilityId)}/uploads/recent`, bearer, {
    signal
  });
  if (result?.ok !== true || !Array.isArray(result.items) || result.items.length > 10)
    throw new Error("Recent uploads could not be verified.");
  const seen = new Set<string>();
  return result.items.map((item: any) => {
    const status = documentStatus({ ...item, ok: true });
    if (
      seen.has(status.assetId) ||
      typeof item.filename !== "string" ||
      item.filename.length > 160 ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes < 1 ||
      item.bytes > 10 * 1024 * 1024 ||
      (item.createdAt !== null &&
        (typeof item.createdAt !== "string" ||
          !Number.isFinite(Date.parse(item.createdAt))))
    )
      throw new Error("Recent uploads could not be verified.");
    seen.add(status.assetId);
    // Older PDF-only servers omitted MIME. Never infer Office support from a name.
    const mimeType =
      item.mimeType ??
      (item.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    validateFacilityDocumentInput(
      { uri: "recovery-metadata", name: item.filename, size: item.bytes, mimeType },
      [mimeType]
    );
    if (!Object.hasOwn(DOCUMENT_FORMATS, mimeType))
      throw new Error("Recent uploads could not be verified.");
    return {
      ...status,
      filename: item.filename,
      mimeType,
      createdAt: item.createdAt,
      bytes: item.bytes
    };
  });
}
