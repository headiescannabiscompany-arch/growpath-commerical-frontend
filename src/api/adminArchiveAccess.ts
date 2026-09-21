import { adminVaultRequest } from "@/api/adminPasskeys";
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
};
export type ArchiveAccessReview = {
  reviewToken: string;
  reviewExpiresAt: string;
  nextConfirmation: string;
};
export type ArchiveAccessReceipt = {
  archiveId: string;
  evidenceRequestId: string;
  dateWindow: { from: string | null; to: string | null };
  itemCounts: Record<string, number>;
  data: Record<string, unknown>;
  externalTransmissionPerformed: false;
};

export function archiveAccessConfirmation(archiveId: string, requestId: string) {
  return `ACCESS ${archiveId} FOR ${requestId}`;
}

function checkedProposal(input: ArchiveAccessProposal) {
  if (
    !/^[a-f0-9]{24}$/.test(input.archiveId) ||
    !/^[a-f0-9]{24}$/.test(input.evidenceRequestId) ||
    input.purpose.trim().length < 8 ||
    input.purpose.length > 2000 ||
    input.minimumNecessaryAcknowledged !== true ||
    input.confirmation !==
      archiveAccessConfirmation(input.archiveId, input.evidenceRequestId) ||
    !Array.isArray(input.scopes) ||
    !input.scopes.length ||
    new Set(input.scopes).size !== input.scopes.length ||
    input.scopes.some((scope) => !LEGAL_EVIDENCE_ARCHIVE_SCOPES.includes(scope))
  )
    throw new Error("Complete the exact scoped archive-access review first.");
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
    !Array.isArray(response.scopes) ||
    response.scopes.length !== body.scopes.length ||
    response.scopes.some((scope: unknown, index: number) => scope !== body.scopes[index])
  )
    throw new Error("Invalid archive-access review receipt.");
  return {
    reviewToken: response.reviewToken,
    reviewExpiresAt: response.reviewExpiresAt,
    nextConfirmation: response.nextConfirmation
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

export async function openArchiveAccess(
  input: ArchiveAccessProposal,
  review: ArchiveAccessReview
): Promise<ArchiveAccessReceipt> {
  const { archiveId, ...body } = checkedProposal(input);
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(review.reviewToken) ||
    !Number.isFinite(Date.parse(review.reviewExpiresAt)) ||
    Date.parse(review.reviewExpiresAt) <= Date.now() ||
    review.nextConfirmation !== body.confirmation
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
    !record(response.data) ||
    Object.keys(response.data).length !== body.scopes.length ||
    Object.keys(response.data).some(
      (scope) => !body.scopes.includes(scope as LegalEvidenceArchiveScope)
    ) ||
    Object.values(response.data).some((value) => !record(value)) ||
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
  // Allowlist the envelope. Never expose unexpected response metadata or tokens.
  return {
    archiveId,
    evidenceRequestId: body.evidenceRequestId,
    dateWindow: { from: response.dateWindow.from, to: response.dateWindow.to },
    itemCounts: response.itemCounts,
    data: response.data,
    externalTransmissionPerformed: false
  };
}
