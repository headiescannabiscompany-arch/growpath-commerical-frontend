import { API_URL, apiRequest } from "@/api/apiRequest";
import { createEvidenceAsset, deleteEvidenceAsset } from "@/api/evidence";
import { uploadEvidenceMedia } from "@/api/uploads";

export const TESTIMONIAL_STATUSES = [
  "private",
  "pending_review",
  "published",
  "rejected",
  "hidden",
  "withdrawn"
] as const;
export type TestimonialStatus = (typeof TESTIMONIAL_STATUSES)[number];
export type TestimonialPolicy = {
  version: string;
  statement: string;
  minFeedbackLength: number;
  maxFeedbackLength: number;
  minPublicNameLength: number;
  maxPublicNameLength: number;
  maxPhotos: number;
};
export type TestimonialDraft = {
  publicName: string;
  feedbackText: string;
  photoEvidenceAssetId?: string | null;
};
export type TestimonialPreview = TestimonialDraft & {
  photoEvidenceAssetId: string | null;
  photoSourceVersion: string | null;
  photoPreviewUrl?: string | null;
  contentDigest: string;
  consentVersion: string;
};
export type TestimonialSubmission = TestimonialDraft & {
  id: string;
  clientSubmissionId: string;
  status: TestimonialStatus;
  isCurrent: boolean;
  revision: number;
  photoEvidenceAssetId: string | null;
  photoSourceVersion: string | null;
  photoPreviewUrl?: string | null;
  contentDigest: string;
  synthetic: boolean;
  consent: { granted: boolean; version: string; statement?: string };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  withdrawnAt: string | null;
};
export type MyTestimonials = {
  current: TestimonialSubmission | null;
  history: TestimonialSubmission[];
  nextCursor: string | null;
};
export type AdminTestimonials = {
  submissions: TestimonialSubmission[];
  nextCursor: string | null;
};
export type PublicTestimonial = {
  publicId: string;
  publicName: string;
  quote: string;
  photo: null | { url: string; alt: string };
  publishedAt: string;
};
export type TestimonialSubmitInput = TestimonialDraft & {
  clientSubmissionId: string;
  previewDigest: string;
  consent: { granted: boolean; version: string };
};

const unavailable = () =>
  new Error("Feedback records are unavailable. Refresh and try again.");
const record = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown, max = 2000): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const optionalText = (value: unknown, max = 2000): value is string | null =>
  value === null || text(value, max);
const integer = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string =>
  text(value, 64) && Number.isFinite(Date.parse(value));
function cursor(value: unknown): string | null {
  if (!optionalText(value, 1000)) throw unavailable();
  return value;
}
function photoBinding(value: Record<string, any>) {
  if (
    !optionalText(value.photoEvidenceAssetId, 160) ||
    !optionalText(value.photoSourceVersion, 256) ||
    Boolean(value.photoEvidenceAssetId) !== Boolean(value.photoSourceVersion)
  )
    throw unavailable();
  if (value.photoPreviewUrl != null && !text(value.photoPreviewUrl, 2000))
    throw unavailable();
}
function submission(value: unknown): TestimonialSubmission {
  if (
    !record(value) ||
    !text(value.id, 160) ||
    !text(value.clientSubmissionId, 160) ||
    !TESTIMONIAL_STATUSES.includes(value.status) ||
    typeof value.isCurrent !== "boolean" ||
    !integer(value.revision) ||
    !text(value.publicName, 80) ||
    !text(value.feedbackText, 1500) ||
    !text(value.contentDigest, 160) ||
    typeof value.synthetic !== "boolean" ||
    !record(value.consent) ||
    typeof value.consent.granted !== "boolean" ||
    !text(value.consent.version, 160) ||
    !date(value.createdAt) ||
    !date(value.updatedAt) ||
    !(value.publishedAt === null || date(value.publishedAt)) ||
    !(value.withdrawnAt === null || date(value.withdrawnAt))
  )
    throw unavailable();
  photoBinding(value);
  return value as TestimonialSubmission;
}
function submissions(value: unknown): TestimonialSubmission[] {
  if (!Array.isArray(value)) throw unavailable();
  const rows = value.map(submission);
  if (new Set(rows.map((row) => row.id)).size !== rows.length) throw unavailable();
  return rows;
}

export async function getTestimonialPolicy(
  signal?: AbortSignal
): Promise<TestimonialPolicy> {
  const response = await apiRequest<any>("/api/testimonials/policy", {
    signal,
    cache: "no-store"
  });
  const value = response?.policy;
  if (
    !record(value) ||
    !text(value.version, 160) ||
    !text(value.statement, 3000) ||
    ![
      value.minFeedbackLength,
      value.maxFeedbackLength,
      value.minPublicNameLength,
      value.maxPublicNameLength,
      value.maxPhotos
    ].every(integer) ||
    value.minFeedbackLength < 1 ||
    value.maxFeedbackLength < value.minFeedbackLength ||
    value.maxFeedbackLength > 1500 ||
    value.minPublicNameLength < 1 ||
    value.maxPublicNameLength < value.minPublicNameLength ||
    value.maxPublicNameLength > 80 ||
    value.maxPhotos !== 1
  )
    throw unavailable();
  return value as TestimonialPolicy;
}
export async function previewTestimonial(
  input: TestimonialDraft,
  signal?: AbortSignal
): Promise<TestimonialPreview> {
  const response = await apiRequest<any>("/api/testimonials/preview", {
    method: "POST",
    body: input,
    signal
  });
  const value = response?.preview;
  if (
    !record(value) ||
    !text(value.publicName, 80) ||
    !text(value.feedbackText, 1500) ||
    !text(value.contentDigest, 160) ||
    !text(value.consentVersion, 160)
  )
    throw unavailable();
  photoBinding(value);
  if (value.photoEvidenceAssetId !== (input.photoEvidenceAssetId || null))
    throw unavailable();
  return value as TestimonialPreview;
}
export async function getMyTestimonials(
  nextCursor?: string | null,
  signal?: AbortSignal
): Promise<MyTestimonials> {
  const response = await apiRequest<any>("/api/testimonials/mine", {
    params: { cursor: nextCursor || undefined, limit: 10 },
    signal,
    cache: "no-store"
  });
  if (!record(response) || !(response.current === null || record(response.current)))
    throw unavailable();
  const current = response.current === null ? null : submission(response.current);
  const history = submissions(response.history);
  if (current && (!current.isCurrent || current.status === "withdrawn"))
    throw unavailable();
  if (history.some((row) => row.isCurrent || row.status !== "withdrawn"))
    throw unavailable();
  return { current, history, nextCursor: cursor(response.nextCursor) };
}
export async function submitTestimonial(
  input: TestimonialSubmitInput,
  signal?: AbortSignal
) {
  const response = await apiRequest<any>("/api/testimonials", {
    method: "POST",
    body: input,
    signal,
    retries: 0
  });
  if (typeof response?.replayed !== "boolean") throw unavailable();
  const saved = submission(response.submission);
  if (
    saved.clientSubmissionId !== input.clientSubmissionId ||
    saved.isCurrent !== (saved.status !== "withdrawn") ||
    saved.contentDigest !== input.previewDigest ||
    saved.publicName !== input.publicName ||
    saved.feedbackText !== input.feedbackText ||
    saved.photoEvidenceAssetId !== (input.photoEvidenceAssetId || null) ||
    saved.consent.granted !== input.consent.granted ||
    saved.consent.version !== input.consent.version
  )
    throw unavailable();
  return { submission: saved, replayed: response.replayed };
}
export async function withdrawTestimonial(
  id: string,
  expectedRevision: number,
  signal?: AbortSignal
) {
  const response = await apiRequest<any>(
    `/api/testimonials/${encodeURIComponent(id)}/withdraw`,
    { method: "POST", body: { expectedRevision }, signal, retries: 0 }
  );
  const row = submission(response?.submission);
  if (row.id !== id || row.status !== "withdrawn" || row.isCurrent) throw unavailable();
  return row;
}
export async function getAdminTestimonials(
  status: TestimonialStatus,
  nextCursor?: string | null,
  signal?: AbortSignal
): Promise<AdminTestimonials> {
  const response = await apiRequest<any>("/api/admin/testimonials", {
    params: { status, cursor: nextCursor || undefined, limit: 10 },
    signal,
    cache: "no-store"
  });
  if (!record(response)) throw unavailable();
  return {
    submissions: submissions(response.submissions),
    nextCursor: cursor(response.nextCursor)
  };
}
export async function reviewTestimonial(
  row: TestimonialSubmission,
  action: "publish" | "reject" | "hide",
  reason: string,
  audienceApproved = false,
  signal?: AbortSignal
) {
  const response = await apiRequest<any>(
    `/api/admin/testimonials/${encodeURIComponent(row.id)}/${action}`,
    {
      method: "POST",
      body: {
        expectedRevision: row.revision,
        contentDigest: row.contentDigest,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(action === "publish" ? { audienceApproved } : {})
      },
      signal,
      retries: 0
    }
  );
  const result = submission(response?.submission);
  if (
    result.id !== row.id ||
    result.contentDigest !== row.contentDigest ||
    result.status !==
      ({ publish: "published", reject: "rejected", hide: "hidden" } as const)[action]
  )
    throw unavailable();
  return result;
}

export function testimonialPhotoUrl(path: string, publicOnly = false): string {
  const base = new URL(API_URL);
  const url = new URL(path, base);
  if (
    url.origin !== base.origin ||
    url.username ||
    url.password ||
    url.hash ||
    !(
      publicOnly
        ? /^\/api\/public\/testimonials\/[^/]+\/photo$/
        : /^\/api\/(?:admin\/)?testimonials\/(?:photos\/[^/]+|[^/]+\/photo)$/
    ).test(url.pathname)
  ) {
    throw new Error("This feedback photo is unavailable.");
  }
  return url.href;
}
export async function getPublicTestimonials(
  signal?: AbortSignal
): Promise<PublicTestimonial[]> {
  const response = await apiRequest<any>("/api/public/testimonials", {
    auth: false,
    cache: "no-store",
    signal
  });
  if (!Array.isArray(response?.testimonials)) throw unavailable();
  const rows = response.testimonials.map((value: unknown): PublicTestimonial => {
    if (
      !record(value) ||
      !text(value.publicId, 160) ||
      !text(value.publicName, 80) ||
      !text(value.quote, 1500) ||
      !date(value.publishedAt)
    )
      throw unavailable();
    let photo: PublicTestimonial["photo"] = null;
    if (value.photo !== null) {
      if (!record(value.photo) || !text(value.photo.url) || !text(value.photo.alt, 200))
        throw unavailable();
      photo = { url: testimonialPhotoUrl(value.photo.url, true), alt: value.photo.alt };
      if (
        new URL(photo.url).pathname !==
        `/api/public/testimonials/${encodeURIComponent(value.publicId)}/photo`
      )
        throw unavailable();
    }
    return {
      publicId: value.publicId,
      publicName: value.publicName,
      quote: value.quote,
      photo,
      publishedAt: value.publishedAt
    };
  });
  if (new Set(rows.map((row: PublicTestimonial) => row.publicId)).size !== rows.length)
    throw unavailable();
  return rows;
}

export function newTestimonialRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index++)
      bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10)
  ]
    .map((part) => part.join(""))
    .join("-");
}
export type TestimonialPhotoDraft = {
  uri: string;
  file?: Blob;
  fileName?: string | null;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  clientUploadKey: string;
  uploaded?: any;
  evidenceId?: string;
};
export async function uploadTestimonialPhoto(
  draft: TestimonialPhotoDraft,
  signal?: AbortSignal
): Promise<string> {
  const assertActive = () => {
    if (signal?.aborted) throw new Error("The photo upload was canceled.");
  };
  assertActive();
  if (draft.evidenceId) return draft.evidenceId;
  if (!draft.uploaded)
    draft.uploaded = await uploadEvidenceMedia({
      uri: draft.uri,
      file: draft.file,
      name: draft.fileName || "feedback-photo.jpg",
      mimeType: draft.mimeType,
      fileSizeBytes: draft.fileSize,
      width: draft.width,
      height: draft.height,
      clientUploadKey: draft.clientUploadKey,
      assetType: "photo",
      workspaceType: "personal",
      forceStripMetadata: true,
      signal
    });
  assertActive();
  const upload = draft.uploaded;
  if (!text(upload?.url, 6000))
    throw new Error(
      "The protected photo upload was not confirmed. Retry the selected photo."
    );
  const saved = await createEvidenceAsset(
    {
      assetType: "photo",
      originalUri: upload.url,
      durableUrl: upload.url,
      mimeType: upload.mimeType || draft.mimeType,
      fileName: upload.fileName || "feedback-photo.jpg",
      fileSizeBytes: upload.bytes || draft.fileSize,
      source: "library",
      purpose: "other",
      uploadStatus: "uploaded",
      aiUsable: false,
      workspaceType: "personal",
      clientUploadKey: draft.clientUploadKey,
      qualityWarnings: []
    },
    { signal }
  );
  assertActive();
  const id = saved?._id || saved?.id;
  if (!text(id, 160))
    throw new Error(
      "The protected photo record was not confirmed. Retry the selected photo."
    );
  draft.evidenceId = id;
  return id;
}
export async function removeTestimonialPhoto(id: string, signal?: AbortSignal) {
  return deleteEvidenceAsset(id, { workspaceType: "personal" }, { signal });
}
