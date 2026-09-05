import { ApiError, apiRequest } from "@/api/apiRequest";

const BASE = "/api/admin/evidence-vault";

export type EvidenceVaultCapabilities = {
  configured: boolean;
  capabilities: {
    accountRemovalOwner: boolean;
    evidenceAccess: boolean;
    evidenceApproval: boolean;
    severeHarmReview: boolean;
  };
};

export type AccountRemovalCategory =
  | "test_cleanup"
  | "user_request"
  | "policy_enforcement"
  | "security_fraud"
  | "legal_process"
  | "other";

export type AccountRemovalInput = {
  expectedEmail: string;
  removalCategory: AccountRemovalCategory;
  reason: string;
  caseReference: string;
};

export type AccountRemovalReview = {
  allowed: boolean;
  target: { id: string; email: string };
  blockers: string[];
  advisories: {
    facilityOwnership: number;
    courseOwnership: number;
    storefrontOwnership: number;
  };
  stripe: {
    verified: boolean;
    customerCount: number;
    subscriptionCount: number;
    unsettledInvoiceCount: number;
  };
  billingEffect: {
    automaticCancellationPerformed: false;
    automaticRefundPerformed: false;
    requiredAction: string;
  };
  retentionDays: number;
  nextConfirmation: string;
  reviewToken?: string;
  reviewExpiresAt?: string;
};

export type AccountQuarantineReceipt = {
  archiveId: string;
  targetUserId: string;
  quarantineStatus: "quarantined";
  quarantinedAt: string;
  purgeAfter: string;
  reversible: true;
};

export type RemovedAccountSummary = {
  archiveId: string;
  anonymousAccountLabel: string;
  status: string;
  removalStatus: string;
  quarantineStatus: string;
  archivedAt: string | null;
  quarantinedAt: string | null;
  restoredAt: string | null;
  purgeAfter: string | null;
  legalHold: boolean;
  legalHoldAuthority: string;
  legalHoldExpiresAt: string | null;
  purgedAt: string | null;
  operationalIssue: boolean;
};

export type RestoreReview = {
  target: { id: string; email: string };
  archiveId: string;
  nextConfirmation: string;
  reviewToken: string;
  reviewExpiresAt: string;
};

export type RestrictedCaseSummary = {
  id: string;
  restricted: true;
  status: string;
  severity: string;
  assigned: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type RestrictedCaseRecord = {
  id: string;
  caseId: string;
  recordType: "case_note" | "manual_external_report";
  actorUserId: string;
  agencyCategory: string;
  submittedAt: string | null;
  createdAt: string;
  data: {
    note?: string;
    agencyReference?: string;
    reportReference?: string;
    summary?: string;
  };
};

export async function getEvidenceVaultCapabilities() {
  const response = await apiRequest<{ ok: true } & EvidenceVaultCapabilities>(
    `${BASE}/capabilities`,
    { cache: "no-store" }
  );
  if (response?.ok !== true || !response.capabilities) {
    throw new Error("GrowPath returned an invalid evidence-vault capability receipt.");
  }
  return { configured: response.configured, capabilities: response.capabilities };
}

export async function reviewAccountRemoval(userId: string, input: AccountRemovalInput) {
  let response: { ok: boolean; review: AccountRemovalReview };
  try {
    response = await apiRequest<{ ok: boolean; review: AccountRemovalReview }>(
      `${BASE}/users/${encodeURIComponent(userId)}/removal-review`,
      { method: "POST", body: input, cache: "no-store" }
    );
  } catch (error) {
    // A completed review can intentionally return 409 with named safety blockers.
    // Preserve that reviewed result; all other failures remain failures.
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.data?.review &&
      Array.isArray(error.data.review.blockers)
    ) {
      response = error.data as { ok: boolean; review: AccountRemovalReview };
    } else {
      throw error;
    }
  }
  if (!response?.review) {
    throw new Error("GrowPath returned an invalid account-removal review.");
  }
  return response.review;
}

export async function quarantineAccount(
  userId: string,
  input: AccountRemovalInput & { reviewToken: string; confirmation: string }
) {
  const response = await apiRequest<{ ok: true; quarantine: AccountQuarantineReceipt }>(
    `${BASE}/users/${encodeURIComponent(userId)}/quarantine`,
    { method: "POST", body: input, cache: "no-store" }
  );
  if (response?.ok !== true || response.quarantine?.quarantineStatus !== "quarantined") {
    throw new Error("GrowPath returned an invalid quarantine receipt.");
  }
  return response.quarantine;
}

export async function listRemovedAccounts(cursor?: string) {
  const response = await apiRequest<{
    ok: true;
    accounts: RemovedAccountSummary[];
    nextCursor: string | null;
  }>(`${BASE}/removed-accounts`, {
    params: { limit: 10, ...(cursor ? { cursor } : {}) },
    cache: "no-store"
  });
  if (response?.ok !== true || !Array.isArray(response.accounts)) {
    throw new Error("GrowPath returned an invalid removed-account list.");
  }
  return { accounts: response.accounts, nextCursor: response.nextCursor || null };
}

export async function reviewAccountRestore(archiveId: string) {
  const response = await apiRequest<{ ok: true; review: RestoreReview }>(
    `${BASE}/removed-accounts/${encodeURIComponent(archiveId)}/restore-review`,
    { method: "POST", body: {}, cache: "no-store" }
  );
  if (response?.ok !== true || !response.review?.reviewToken) {
    throw new Error("GrowPath returned an invalid restore review.");
  }
  return response.review;
}

export async function restoreQuarantinedAccount(
  archiveId: string,
  input: { reviewToken: string; confirmation: string }
) {
  const response = await apiRequest<{
    ok: true;
    restore: { archiveId: string; targetUserId: string; quarantineStatus: "restored" };
  }>(`${BASE}/removed-accounts/${encodeURIComponent(archiveId)}/restore`, {
    method: "POST",
    body: input,
    cache: "no-store"
  });
  if (response?.ok !== true || response.restore?.quarantineStatus !== "restored") {
    throw new Error("GrowPath returned an invalid restore receipt.");
  }
  return response.restore;
}

export async function listRestrictedCases() {
  const response = await apiRequest<{ ok: true; cases: RestrictedCaseSummary[] }>(
    `${BASE}/restricted-cases`,
    { cache: "no-store" }
  );
  if (response?.ok !== true || !Array.isArray(response.cases)) {
    throw new Error("GrowPath returned an invalid restricted-case list.");
  }
  return response.cases;
}

export async function listRestrictedCaseRecords(caseId: string) {
  const response = await apiRequest<{ ok: true; records: RestrictedCaseRecord[] }>(
    `${BASE}/restricted-cases/${encodeURIComponent(caseId)}/records`,
    { cache: "no-store" }
  );
  if (response?.ok !== true || !Array.isArray(response.records)) {
    throw new Error("GrowPath returned an invalid restricted-case record list.");
  }
  return response.records;
}

export async function addRestrictedCaseNote(
  caseId: string,
  input: { note: string; confirmation: string }
) {
  const response = await apiRequest<{ ok: true; record: { id: string } }>(
    `${BASE}/restricted-cases/${encodeURIComponent(caseId)}/records`,
    {
      method: "POST",
      body: { recordType: "case_note", ...input },
      cache: "no-store"
    }
  );
  if (response?.ok !== true || !response.record?.id) {
    throw new Error("GrowPath returned an invalid restricted-note receipt.");
  }
  return response.record;
}

export async function recordRestrictedExternalReport(
  caseId: string,
  input: {
    agencyCategory: "local" | "state" | "federal" | "ncmec" | "other";
    agencyReference: string;
    reportReference: string;
    submittedAt: string;
    summary: string;
    confirmation: string;
  }
) {
  const response = await apiRequest<{
    ok: true;
    record: { id: string; externalTransmissionPerformed: false };
  }>(`${BASE}/restricted-cases/${encodeURIComponent(caseId)}/records`, {
    method: "POST",
    body: { recordType: "manual_external_report", ...input },
    cache: "no-store"
  });
  if (
    response?.ok !== true ||
    !response.record?.id ||
    response.record.externalTransmissionPerformed !== false
  ) {
    throw new Error("GrowPath returned an invalid external-report record receipt.");
  }
  return response.record;
}
