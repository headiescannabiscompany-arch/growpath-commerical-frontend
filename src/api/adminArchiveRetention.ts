import { adminVaultRequest } from "@/api/adminPasskeys";

const BASE = "/api/admin/evidence-vault";
export const RETENTION_AUTHORITIES = [
  "legal_hold",
  "2703f",
  "2258a",
  "emergency"
] as const;
export type RetentionAuthority = (typeof RETENTION_AUTHORITIES)[number];
export type RetentionAction = "apply" | "renew" | "release";
export type RetentionProposal = {
  archiveId: string;
  evidenceRequestId: string;
  action: RetentionAction;
  authority: RetentionAuthority;
  reason: string;
  authorityReference: string;
  agencyReference?: string;
  reportSubmittedAt?: string;
};
export type RetentionReceipt = {
  archiveId: string;
  evidenceRequestId: string;
  preservationHold: boolean;
  authority: RetentionAuthority | "none";
  expiresAt: string | null;
  renewalCount: number;
  externalTransmissionPerformed: false;
};

export function retentionConfirmation(input: RetentionProposal) {
  const prefix =
    input.action === "release"
      ? "RELEASE HOLD"
      : input.action === "renew"
        ? "RENEW 2703F"
        : `PRESERVE ${input.authority.toUpperCase()}`;
  return `${prefix} ${input.archiveId} FOR ${input.evidenceRequestId}`;
}

export function validateRetentionProposal(input: RetentionProposal) {
  const valid =
    /^[a-f0-9]{24}$/.test(input.archiveId) &&
    /^[a-f0-9]{24}$/.test(input.evidenceRequestId) &&
    ["apply", "renew", "release"].includes(input.action) &&
    RETENTION_AUTHORITIES.includes(input.authority) &&
    (input.action !== "renew" || input.authority === "2703f") &&
    input.reason.trim().length >= 8 &&
    input.reason.length <= 1000 &&
    input.authorityReference.trim().length >= 3 &&
    input.authorityReference.length <= 1000 &&
    (input.agencyReference || "").length <= 1000;
  if (!valid) throw new Error("Complete the exact retention proposal first.");
  if (
    input.action === "apply" &&
    ["2258a", "emergency"].includes(input.authority) &&
    !input.agencyReference?.trim()
  )
    throw new Error("An agency or incident reference is required.");
  if (
    input.action === "apply" &&
    input.authority === "2258a" &&
    (!input.reportSubmittedAt ||
      !Number.isFinite(Date.parse(input.reportSubmittedAt)) ||
      Date.parse(input.reportSubmittedAt) > Date.now())
  )
    throw new Error("Choose the completed report submission time.");
  // Explicitly allowlist fields. Never accept a client-supplied actor or expiry.
  return {
    archiveId: input.archiveId,
    evidenceRequestId: input.evidenceRequestId,
    action: input.action,
    authority: input.authority,
    reason: input.reason.trim(),
    authorityReference: input.authorityReference.trim(),
    ...(input.agencyReference?.trim()
      ? { agencyReference: input.agencyReference.trim() }
      : {}),
    ...(input.action === "apply" && input.authority === "2258a"
      ? { reportSubmittedAt: input.reportSubmittedAt }
      : {})
  };
}

/** This endpoint supplies a phrase, not an eligibility decision or dry run. */
export async function prepareRetentionConfirmation(input: RetentionProposal) {
  const proposal = validateRetentionProposal(input);
  const query = new URLSearchParams({
    archiveId: proposal.archiveId,
    evidenceRequestId: proposal.evidenceRequestId,
    action: proposal.action,
    authority: proposal.authority
  });
  const result = await adminVaultRequest<{ ok: boolean; nextConfirmation: string }>(
    `${BASE}/retention-confirmation?${query}`,
    { cache: "no-store", retries: 0 }
  );
  if (result?.ok !== true || result.nextConfirmation !== retentionConfirmation(proposal))
    throw new Error("Invalid retention confirmation receipt.");
  return result.nextConfirmation;
}

export async function changeArchiveRetention(
  input: RetentionProposal,
  confirmation: string
): Promise<RetentionReceipt> {
  const proposal = validateRetentionProposal(input);
  if (confirmation !== retentionConfirmation(proposal))
    throw new Error("Exact retention confirmation required.");
  const { archiveId, ...body } = proposal;
  const response = await adminVaultRequest<{ ok: boolean; retention: RetentionReceipt }>(
    `${BASE}/removed-accounts/${archiveId}/retention`,
    { method: "POST", body: { ...body, confirmation }, cache: "no-store", retries: 0 }
  );
  const receipt = response?.retention;
  const releasing = input.action === "release";
  if (
    response?.ok !== true ||
    !receipt ||
    receipt.archiveId !== archiveId ||
    receipt.evidenceRequestId !== input.evidenceRequestId ||
    receipt.preservationHold !== !releasing ||
    receipt.authority !== (releasing ? "none" : input.authority) ||
    !Number.isSafeInteger(receipt.renewalCount) ||
    receipt.renewalCount < 0 ||
    receipt.renewalCount > 1 ||
    (input.action === "renew" && receipt.renewalCount !== 1) ||
    receipt.externalTransmissionPerformed !== false ||
    (releasing || input.authority === "legal_hold"
      ? receipt.expiresAt !== null
      : typeof receipt.expiresAt !== "string" ||
        !Number.isFinite(Date.parse(receipt.expiresAt)))
  )
    throw new Error(
      "Retention outcome was not confirmed. Verify saved state before retrying."
    );
  return {
    archiveId,
    evidenceRequestId: receipt.evidenceRequestId,
    preservationHold: receipt.preservationHold,
    authority: receipt.authority,
    expiresAt: receipt.expiresAt,
    renewalCount: receipt.renewalCount,
    externalTransmissionPerformed: false
  };
}
