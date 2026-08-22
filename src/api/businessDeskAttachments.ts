import {
  apiRequest,
  uploadBinaryToSignedUrl,
  type SignedBinaryUploadOptions
} from "@/api/apiRequest";
import {
  businessDeskBase,
  type BusinessDeskRequestOptions,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";

export type BusinessDeskAttachmentPurpose = "expense_receipt" | "job_attachment";
export type BusinessDeskAttachmentLifecycle =
  | "uploading"
  | "quarantined"
  | "ready"
  | "rejected"
  | "deleted";

export type BusinessDeskAttachment = {
  id: string;
  purpose: BusinessDeskAttachmentPurpose;
  lifecycle: BusinessDeskAttachmentLifecycle;
  version: number;
  originalFilename: string;
  mimeType: string;
  expectedBytes: number;
  verifiedBytes: number | null;
  expiresAt: string | null;
  confirmedAt: string | null;
  rejectionReasonCode?: string;
  scanStatus?: string;
  scanReasonCode?: string;
  parserStatus?: string;
  parserReasonCode?: string;
};

export type BusinessDeskAttachmentQuota = {
  limitBytes: number;
  reservedBytes: number;
  completedBytes: number;
  remainingBytes: number;
  version: number;
};

export type BusinessDeskAttachmentPacket = {
  attachment: BusinessDeskAttachment;
  quota: BusinessDeskAttachmentQuota;
  idempotentReplay?: boolean;
  cleanupPending?: boolean;
};

export type BusinessDeskAttachmentReservation = BusinessDeskAttachmentPacket & {
  upload: { url: string; expiresInSeconds: number } | null;
};

export type BusinessDeskAttachmentDownload = {
  attachment: BusinessDeskAttachment;
  download: {
    url: string;
    expiresInSeconds: 300;
    contentDisposition: string;
    mimeType: string;
    deliveryStatus: "not_observed";
  };
};

export type BusinessDeskSelectedFile = {
  filename: string;
  mimeType: string;
  bytes: number;
  uri: string;
  body?: Blob;
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const PURPOSES = new Set<BusinessDeskAttachmentPurpose>([
  "expense_receipt",
  "job_attachment"
]);
const LIFECYCLES = new Set<BusinessDeskAttachmentLifecycle>([
  "uploading",
  "quarantined",
  "ready",
  "rejected",
  "deleted"
]);

function envelope(response: any) {
  return response?.data && typeof response.data === "object" ? response.data : response;
}

function positiveInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function nonnegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function attachmentFrom(value: any): BusinessDeskAttachment {
  if (
    !value ||
    typeof value !== "object" ||
    !OBJECT_ID.test(String(value.id || "")) ||
    !PURPOSES.has(value.purpose) ||
    !LIFECYCLES.has(value.lifecycle) ||
    !positiveInteger(value.version) ||
    !String(value.originalFilename || "").trim() ||
    !String(value.mimeType || "").trim() ||
    !positiveInteger(value.expectedBytes) ||
    (value.verifiedBytes !== null &&
      value.verifiedBytes !== undefined &&
      !positiveInteger(value.verifiedBytes))
  ) {
    throw new Error("The protected attachment response was invalid.");
  }
  return {
    id: String(value.id).toLowerCase(),
    purpose: value.purpose,
    lifecycle: value.lifecycle,
    version: Number(value.version),
    originalFilename: String(value.originalFilename),
    mimeType: String(value.mimeType),
    expectedBytes: Number(value.expectedBytes),
    verifiedBytes:
      value.verifiedBytes === null || value.verifiedBytes === undefined
        ? null
        : Number(value.verifiedBytes),
    expiresAt: value.expiresAt || null,
    confirmedAt: value.confirmedAt || null,
    ...(value.rejectionReasonCode
      ? { rejectionReasonCode: String(value.rejectionReasonCode) }
      : {}),
    ...(value.scanStatus ? { scanStatus: String(value.scanStatus) } : {}),
    ...(value.scanReasonCode ? { scanReasonCode: String(value.scanReasonCode) } : {}),
    ...(value.parserStatus ? { parserStatus: String(value.parserStatus) } : {}),
    ...(value.parserReasonCode
      ? { parserReasonCode: String(value.parserReasonCode) }
      : {})
  };
}

function quotaFrom(value: any): BusinessDeskAttachmentQuota {
  if (
    !value ||
    typeof value !== "object" ||
    !positiveInteger(value.limitBytes) ||
    !nonnegativeInteger(value.reservedBytes) ||
    !nonnegativeInteger(value.completedBytes) ||
    !nonnegativeInteger(value.remainingBytes) ||
    !nonnegativeInteger(value.version) ||
    value.completedBytes > value.reservedBytes ||
    value.reservedBytes > value.limitBytes ||
    value.remainingBytes !== value.limitBytes - value.reservedBytes
  ) {
    throw new Error("The protected attachment quota response was invalid.");
  }
  return {
    limitBytes: Number(value.limitBytes),
    reservedBytes: Number(value.reservedBytes),
    completedBytes: Number(value.completedBytes),
    remainingBytes: Number(value.remainingBytes),
    version: Number(value.version)
  };
}

function packetFrom(response: any): BusinessDeskAttachmentPacket {
  const value = envelope(response);
  return {
    attachment: attachmentFrom(value?.attachment),
    quota: quotaFrom(value?.quota),
    ...(typeof value?.idempotentReplay === "boolean"
      ? { idempotentReplay: value.idempotentReplay }
      : {}),
    ...(typeof value?.cleanupPending === "boolean"
      ? { cleanupPending: value.cleanupPending }
      : {})
  };
}

function attachmentBase(workspace: BusinessDeskWorkspace) {
  return `${businessDeskBase(workspace)}/attachments`;
}

export async function reserveBusinessDeskAttachment(
  workspace: BusinessDeskWorkspace,
  input: {
    purpose: BusinessDeskAttachmentPurpose;
    filename: string;
    declaredMimeType: string;
    expectedBytes: number;
    idempotencyKey: string;
  },
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskAttachmentReservation> {
  const response = await apiRequest(`${attachmentBase(workspace)}/reserve`, {
    method: "POST",
    body: input,
    ...(request.signal ? { signal: request.signal } : {})
  });
  const value = envelope(response);
  const packet = packetFrom(value);
  const candidate = value?.upload;
  const upload =
    candidate === null || candidate === undefined
      ? null
      : {
          url: String(candidate.url || ""),
          expiresInSeconds: Number(candidate.expiresInSeconds)
        };
  if (
    (packet.attachment.lifecycle === "uploading" &&
      (!upload ||
        !/^https?:\/\//i.test(upload.url) ||
        !positiveInteger(upload.expiresInSeconds))) ||
    (upload &&
      (!/^https?:\/\//i.test(upload.url) || !positiveInteger(upload.expiresInSeconds)))
  ) {
    throw new Error("The protected attachment upload response was invalid.");
  }
  return { ...packet, upload };
}

export async function completeBusinessDeskAttachment(
  workspace: BusinessDeskWorkspace,
  attachmentId: string,
  input: { expectedVersion: number; idempotencyKey: string },
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskAttachmentPacket> {
  return packetFrom(
    await apiRequest(
      `${attachmentBase(workspace)}/${encodeURIComponent(attachmentId)}/complete`,
      {
        method: "POST",
        body: input,
        ...(request.signal ? { signal: request.signal } : {})
      }
    )
  );
}

export async function getBusinessDeskAttachment(
  workspace: BusinessDeskWorkspace,
  attachmentId: string,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskAttachmentPacket> {
  const url = `${attachmentBase(workspace)}/${encodeURIComponent(attachmentId)}`;
  return packetFrom(
    request.signal
      ? await apiRequest(url, { signal: request.signal })
      : await apiRequest(url)
  );
}

export async function cancelBusinessDeskAttachment(
  workspace: BusinessDeskWorkspace,
  attachmentId: string,
  input: { expectedVersion: number; idempotencyKey: string },
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskAttachmentPacket> {
  return packetFrom(
    await apiRequest(
      `${attachmentBase(workspace)}/${encodeURIComponent(attachmentId)}/cancel`,
      {
        method: "POST",
        body: input,
        ...(request.signal ? { signal: request.signal } : {})
      }
    )
  );
}

export async function prepareBusinessDeskAttachmentDownload(
  workspace: BusinessDeskWorkspace,
  attachmentId: string,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskAttachmentDownload> {
  const value = envelope(
    await apiRequest(
      `${attachmentBase(workspace)}/${encodeURIComponent(attachmentId)}/download`,
      {
        method: "POST",
        body: {},
        ...(request.signal ? { signal: request.signal } : {})
      }
    )
  );
  const attachment = attachmentFrom(value?.attachment);
  const download = value?.download;
  if (
    !download ||
    typeof download !== "object" ||
    !/^https?:\/\//i.test(String(download.url || "")) ||
    download.expiresInSeconds !== 300 ||
    !String(download.contentDisposition || "")
      .toLowerCase()
      .startsWith("attachment;") ||
    !String(download.mimeType || "").trim() ||
    download.deliveryStatus !== "not_observed"
  ) {
    throw new Error("The protected attachment download response was invalid.");
  }
  return { attachment, download } as BusinessDeskAttachmentDownload;
}

export async function uploadBusinessDeskAttachmentBytes(
  reservation: BusinessDeskAttachmentReservation,
  file: Pick<BusinessDeskSelectedFile, "uri" | "body" | "mimeType">,
  options: Pick<SignedBinaryUploadOptions, "signal" | "onProgress"> = {}
) {
  if (!reservation.upload?.url || reservation.attachment.lifecycle !== "uploading") {
    throw new Error("This protected attachment reservation is not uploadable.");
  }
  return uploadBinaryToSignedUrl({
    url: reservation.upload.url,
    uri: file.uri,
    body: file.body,
    mimeType: file.mimeType,
    ...options
  });
}

export const _test = { attachmentFrom, packetFrom, quotaFrom };
