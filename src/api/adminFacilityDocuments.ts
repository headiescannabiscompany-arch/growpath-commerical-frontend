import { adminVaultRequest } from "./adminPasskeys";
const BASE = "/api/admin/facility-documents",
  ID = /^[a-f0-9]{24}$/;
export type DocumentRecoveryRow = {
  assetId: string;
  code: string;
  instruction: string;
  cleanupClaim?: { reviewId: string; executionId: string };
};
export type DocumentReview = {
  reviewId: string | null;
  current: boolean;
  code: string;
  disposition: "retain" | "request_cleanup";
  cleanupAuthorized: false;
};
function id(value: string) {
  if (typeof value !== "string" || !ID.test(value))
    throw new Error("Invalid document review reference.");
  return value;
}
export function newDocumentControlId() {
  const bytes = new Uint8Array(12);
  if (!globalThis.crypto?.getRandomValues)
    throw new Error("Use a supported secure browser.");
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
}
export async function readDocumentRecovery(afterId = "") {
  const value = await adminVaultRequest(
    `${BASE}/recovery?limit=20${afterId ? `&afterId=${id(afterId)}` : ""}`
  );
  if (
    !value?.ok ||
    !Array.isArray(value.rows) ||
    value.rows.length > 20 ||
    value.rows.some(
      (row: any) =>
        !ID.test(row?.assetId || "") ||
        typeof row.code !== "string" ||
        typeof row.instruction !== "string"
    ) ||
    (value.nextAfterId != null && !ID.test(value.nextAfterId))
  )
    throw new Error("Document review list is unavailable.");
  return {
    rows: value.rows.map((row: DocumentRecoveryRow) => ({
      assetId: row.assetId,
      code: row.code,
      instruction: row.instruction,
      ...(row.code === "REVOKED_CLEANUP_RECHECK_REQUIRED" &&
      typeof row.cleanupClaim?.reviewId === "string" &&
      typeof row.cleanupClaim?.executionId === "string" &&
      ID.test(row.cleanupClaim.reviewId) &&
      ID.test(row.cleanupClaim.executionId) &&
      new Set([row.assetId, row.cleanupClaim.reviewId, row.cleanupClaim.executionId])
        .size === 3
        ? {
            cleanupClaim: {
              reviewId: row.cleanupClaim.reviewId,
              executionId: row.cleanupClaim.executionId
            }
          }
        : {})
    })) as DocumentRecoveryRow[],
    nextAfterId: (value.nextAfterId ?? null) as string | null
  };
}
export async function reassignDocumentCleanup(
  assetId: string,
  previousExecutionId: string,
  reviewId: string,
  executionId: string,
  confirmation: string
) {
  const references = [assetId, previousExecutionId, reviewId, executionId].map(id);
  if (
    new Set(references).size !== 4 ||
    confirmation !== `REASSIGN REVOKED ${assetId} ${previousExecutionId}`
  )
    throw new Error("Enter the exact reassignment confirmation.");
  const value = await adminVaultRequest(`${BASE}/${assetId}/cleanup-handoff`, {
    method: "POST",
    body: { previousExecutionId, reviewId, executionId, confirmation }
  });
  if (
    value?.ok !== true ||
    value.reassigned !== true ||
    typeof value.alreadyReassigned !== "boolean" ||
    typeof value.released !== "boolean" ||
    value.reviewId !== reviewId ||
    value.executionId !== executionId ||
    value.activationAllowed !== false ||
    value.cleanupAuthorized !== false
  )
    throw new Error("Reassignment was not confirmed. Retry the same request.");
  return { reviewId, executionId, released: value.released as boolean };
}
function review(value: any): DocumentReview {
  if (
    !value?.ok ||
    typeof value.current !== "boolean" ||
    typeof value.code !== "string" ||
    !["retain", "request_cleanup"].includes(value.disposition) ||
    value.cleanupAuthorized !== false ||
    (value.reviewId != null && !ID.test(value.reviewId))
  )
    throw new Error("Document review could not be verified.");
  return {
    reviewId: value.reviewId,
    current: value.current,
    code: value.code,
    disposition: value.disposition,
    cleanupAuthorized: false
  };
}
export async function inspectDocumentReview(assetId: string) {
  return review(await adminVaultRequest(`${BASE}/${id(assetId)}/review`));
}
export async function recordDocumentReview(
  assetId: string,
  reviewId: string,
  disposition: "retain" | "request_cleanup",
  confirmation: string
) {
  if (
    !["retain", "request_cleanup"].includes(disposition) ||
    confirmation !== `REVIEW ${id(assetId)} ${disposition}`
  )
    throw new Error("Enter the exact review confirmation.");
  return review(
    await adminVaultRequest(`${BASE}/${assetId}/review`, {
      method: "POST",
      body: { reviewId: id(reviewId), disposition, confirmation }
    })
  );
}
export async function cleanupReviewedDocument(
  assetId: string,
  reviewId: string,
  executionId: string,
  confirmation: string
) {
  if (confirmation !== `DELETE REVOKED ${id(assetId)} ${id(reviewId)}`)
    throw new Error("Enter the exact removal confirmation.");
  const value = await adminVaultRequest(`${BASE}/${assetId}/cleanup`, {
    method: "POST",
    body: { reviewId, executionId: id(executionId), confirmation }
  });
  if (value?.ok !== true || value.released !== true || value.activationAllowed !== false)
    throw new Error("Removal was not confirmed. Recheck before retrying.");
  return true;
}
