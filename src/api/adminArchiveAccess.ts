import { adminVaultRequest, getAdminStepUpExpiry } from "@/api/adminPasskeys";
import {
  LEGAL_EVIDENCE_ARCHIVE_SCOPES,
  type LegalEvidenceArchiveScope
} from "@/api/adminEvidenceVault";

const BASE = "/api/admin/evidence-vault/removed-accounts";
export type ArchiveAccessProposal = {
  archiveId: string;
  evidenceRequestId: string;
  purpose: string;
  scopes: LegalEvidenceArchiveScope[];
  minimumNecessaryAcknowledged: true;
  confirmation: string;
  prepareExport?: true;
};
export type ArchiveAccessReview = {
  reviewToken: string;
  reviewExpiresAt: string;
  nextConfirmation: string;
  prepareExport?: true;
};
type ArchiveAccessMetadata = {
  archiveId: string;
  evidenceRequestId: string;
  dateWindow: { from: string | null; to: string | null };
  itemCounts: Record<string, number>;
  externalTransmissionPerformed: false;
};
export type ArchiveAccessReceipt = ArchiveAccessMetadata & {
  data: Record<string, unknown>;
};
export type LegalArchivePackage = {
  filename: string;
  content: string;
  sha256: string;
  auditEventId: string;
};
export type LegalArchiveExportReceipt = ArchiveAccessMetadata & {
  exportPackage: LegalArchivePackage;
};

export function archiveAccessConfirmation(archiveId: string, requestId: string, prepareExport = false) {
  return `${prepareExport ? "EXPORT" : "ACCESS"} ${archiveId} FOR ${requestId}`;
}

function checkedProposal(input: ArchiveAccessProposal) {
  if (
    !/^[a-f0-9]{24}$/.test(input.archiveId) ||
    !/^[a-f0-9]{24}$/.test(input.evidenceRequestId) ||
    input.purpose.trim().length < 8 ||
    input.purpose.length > 2000 ||
    input.minimumNecessaryAcknowledged !== true ||
    (input.prepareExport !== undefined && input.prepareExport !== true) ||
    input.confirmation !==
      archiveAccessConfirmation(input.archiveId, input.evidenceRequestId, input.prepareExport) ||
    !Array.isArray(input.scopes) ||
    !input.scopes.length ||
    new Set(input.scopes).size !== input.scopes.length ||
    input.scopes.some((scope) => !LEGAL_EVIDENCE_ARCHIVE_SCOPES.includes(scope))
  )
    throw new Error("Complete the exact scoped archive-access review first.");
  if (input.prepareExport && !(Date.parse(getAdminStepUpExpiry() || "") > Date.now())) {
    throw new Error("Verify your passkey in Admin security before preparing a legal export.");
  }
  return { ...input, purpose: input.purpose.trim(), scopes: [...input.scopes].sort() };
}

export async function reviewArchiveAccess(
  input: ArchiveAccessProposal
): Promise<ArchiveAccessReview> {
  const { archiveId, ...body } = checkedProposal(input);
  const response = await adminVaultRequest<any>(
    `${BASE}/${archiveId}/case-access-review`,
    {
      method: "POST",
      body,
      cache: "no-store",
      retries: 0
    }
  );
  const ttl = Date.parse(response?.reviewExpiresAt) - Date.now();
  if (
    response?.ok !== true ||
    typeof response.reviewToken !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(response.reviewToken) ||
    !Number.isFinite(ttl) ||
    ttl <= 0 ||
    ttl > 5 * 60_000 ||
    response.nextConfirmation !== body.confirmation ||
    response.prepareExport !== body.prepareExport ||
    !Array.isArray(response.scopes) ||
    response.scopes.length !== body.scopes.length ||
    response.scopes.some((scope: unknown, index: number) => scope !== body.scopes[index])
  )
    throw new Error("Invalid archive-access review receipt.");
  return {
    reviewToken: response.reviewToken,
    reviewExpiresAt: response.reviewExpiresAt,
    nextConfirmation: response.nextConfirmation,
    ...(body.prepareExport ? { prepareExport: true } : {})
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validDate(value: unknown) {
  return (
    value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}

function validScopedData(value: unknown, scopes: LegalEvidenceArchiveScope[]) {
  return record(value) &&
    Object.keys(value).length === scopes.length &&
    scopes.every((scope) => Object.prototype.hasOwnProperty.call(value, scope) && record(value[scope]));
}

async function verifiedExportPackage(
  value: unknown,
  metadata: ArchiveAccessMetadata,
  scopes: LegalEvidenceArchiveScope[]
): Promise<LegalArchivePackage> {
  const error = new Error("Invalid legal archive package receipt.");
  if (
    !record(value) ||
    value.filename !== `growpathai-legal-${metadata.evidenceRequestId}.json` ||
    typeof value.content !== "string" ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(value.sha256) ||
    typeof value.auditEventId !== "string" ||
    !/^[a-f0-9]{24}$/.test(value.auditEventId)
  ) throw error;

  const contents: unknown = JSON.parse(value.content);
  if (
    !record(contents) ||
    Object.keys(contents).length !== 8 ||
    contents.version !== 1 ||
    contents.archiveId !== metadata.archiveId ||
    contents.evidenceRequestId !== metadata.evidenceRequestId ||
    typeof contents.createdAt !== "string" || !validDate(contents.createdAt) ||
    !Array.isArray(contents.scopes) ||
    contents.scopes.length !== scopes.length ||
    !scopes.every((scope, index) => (contents.scopes as unknown[])[index] === scope) ||
    !record(contents.dateWindow) ||
    Object.keys(contents.dateWindow).length !== 2 ||
    contents.dateWindow.from !== metadata.dateWindow.from ||
    contents.dateWindow.to !== metadata.dateWindow.to ||
    !record(contents.itemCounts) ||
    Object.keys(contents.itemCounts).length !== Object.keys(metadata.itemCounts).length ||
    !Object.entries(contents.itemCounts).every(([scope, count]) => metadata.itemCounts[scope] === count) ||
    !validScopedData(contents.data, scopes)
  ) throw error;

  const bytes = new TextEncoder().encode(value.content);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hex !== value.sha256) throw error;
  return {
    filename: value.filename,
    content: value.content,
    sha256: value.sha256,
    auditEventId: value.auditEventId
  };
}

export async function openArchiveAccess(
  input: ArchiveAccessProposal,
  review: ArchiveAccessReview
): Promise<ArchiveAccessReceipt | LegalArchiveExportReceipt> {
  const { archiveId, ...body } = checkedProposal(input);
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(review.reviewToken) ||
    !Number.isFinite(Date.parse(review.reviewExpiresAt)) ||
    Date.parse(review.reviewExpiresAt) <= Date.now() ||
    review.nextConfirmation !== body.confirmation ||
    review.prepareExport !== body.prepareExport
  )
    throw new Error("Archive-access review expired. Review again.");
  const response = await adminVaultRequest<any>(`${BASE}/${archiveId}/case-access`, {
    method: "POST",
    body: { ...body, reviewToken: review.reviewToken },
    cache: "no-store",
    retries: 0
  });
  if (
    response?.ok !== true ||
    response.archiveId !== archiveId ||
    response.evidenceRequestId !== body.evidenceRequestId ||
    response.externalTransmissionPerformed !== false ||
    !record(response.itemCounts) ||
    Object.entries(response.itemCounts).some(
      ([key, count]) =>
        !Number.isSafeInteger(count) ||
        (count as number) < 0 ||
        !body.scopes.some((scope) => key === scope || key.startsWith(`${scope}.`))
    ) ||
    !record(response.dateWindow) ||
    !validDate(response.dateWindow.from) ||
    !validDate(response.dateWindow.to) ||
    (response.dateWindow.from &&
      response.dateWindow.to &&
      Date.parse(response.dateWindow.from) > Date.parse(response.dateWindow.to))
  )
    throw new Error("Invalid scoped archive-access receipt.");
  const metadata: ArchiveAccessMetadata = {
    archiveId,
    evidenceRequestId: body.evidenceRequestId,
    dateWindow: { from: response.dateWindow.from, to: response.dateWindow.to },
    itemCounts: response.itemCounts,
    externalTransmissionPerformed: false
  };
  // Allowlist the envelope. Never expose unexpected response metadata or tokens.
  if (body.prepareExport) {
    if (response.data !== undefined) throw new Error("Invalid legal archive package receipt.");
    return { ...metadata, exportPackage: await verifiedExportPackage(response.exportPackage, metadata, body.scopes) };
  }
  if (response.exportPackage !== undefined || !validScopedData(response.data, body.scopes)) {
    throw new Error("Invalid scoped archive-access receipt.");
  }
  return { ...metadata, data: response.data };
}
