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

export const LEGAL_EVIDENCE_ARCHIVE_SCOPES = [
  "account.identity",
  "account.profile",
  "account.subscription",
  "account.security",
  "grow.lifecycle",
  "ai.activity",
  "communications.activity",
  "community.activity",
  "commerce.activity",
  "courses.activity",
  "payments.activity",
  "moderation.safety",
  "media.activity",
  "businessdesk.commercial",
  "businessdesk.facility_activity",
  "account.operations",
  "facility.membership",
  "grow.commercial_tools",
  "facility.operations",
  "creator.profile"
] as const;

export type LegalEvidenceArchiveScope = (typeof LEGAL_EVIDENCE_ARCHIVE_SCOPES)[number];

export type EvidenceVerificationRecord = {
  verified?: boolean;
  method?: string;
  reference?: string;
};

export type EvidenceJurisdictionReview = {
  reviewed?: boolean;
  determination?: string;
  reference?: string;
};

export type AdminEvidenceRequestView = {
  _id: string;
  requestType: string;
  status: string;
  preservationHold: boolean;
  targetBound: boolean;
  restricted: boolean;
  detailsAvailable: boolean;
  requesterName: string;
  requesterOrganization?: string;
  requesterEmail?: string;
  authorityDescription?: string;
  jurisdiction?: string;
  targetUserId?: string | null;
  scope: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  preservationAuthority?: string;
  preservationStartedAt?: string | null;
  preservationExpiresAt?: string | null;
  preservationRenewalCount?: number;
  requesterIdentityVerification?: EvidenceVerificationRecord | null;
  requesterAuthorityVerification?: EvidenceVerificationRecord | null;
  jurisdictionReview?: EvidenceJurisdictionReview | null;
  minimumNecessaryScope?: string;
  userNoticeStatus?: string;
  approvedArchiveScopes?: string[];
  legalReview?: Record<string, unknown> | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  evidenceItems?: Array<{
    _id?: string;
    sourceType: string;
    sourceId: string;
    description?: string;
    sha256?: string;
    preservedAt?: string | null;
    preservedBy?: string | { _id?: string; email?: string } | null;
  }>;
  createdBy?: string | { _id?: string; email?: string } | null;
  reviewedBy?: string | { _id?: string; email?: string } | null;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
};

export type LegalEvidenceApprovalProposal = {
  targetUserId: string;
  scopes: LegalEvidenceArchiveScope[];
  reason: string;
  legalReview: {
    decision: "approve";
    approverName: string;
    approverEmail: string;
    approverRole: string;
    reference: string;
  };
};

export type LegalEvidenceApprovalReview = {
  evidenceRequestId: string;
  targetUserId: string;
  scopes: LegalEvidenceArchiveScope[];
  reviewToken: string;
  reviewExpiresAt: string;
  nextConfirmation: string;
  externalTransmissionPerformed: false;
};

export type LegalEvidenceApprovalReceipt = {
  evidenceRequestId: string;
  targetUserId: string;
  status: "approved";
  approvedArchiveScopes: LegalEvidenceArchiveScope[];
  approvedAt: string;
  approvedBy: string;
  externalTransmissionPerformed: false;
};

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function referenceId(value: unknown) {
  const source = record(value);
  return text(typeof value === "string" ? value : source._id || source.id) || null;
}

export function normalizeAdminEvidenceRequest(value: unknown): AdminEvidenceRequestView {
  const source = record(value);
  const requester = record(source.requester);
  const preservation = record(source.preservation);
  const detailsAvailable =
    Object.prototype.hasOwnProperty.call(source, "requester") ||
    [
      "requesterName",
      "requesterEmail",
      "authorityDescription",
      "jurisdiction",
      "targetUserId",
      "scope"
    ].some((field) => Object.prototype.hasOwnProperty.call(source, field));
  const targetUserId = referenceId(source.targetUserId);
  return {
    _id: text(source.id || source._id),
    requestType: text(source.requestType) || "restricted_request",
    status: text(source.status) || "unknown",
    preservationHold: source.preservationHold === true,
    targetBound: source.targetBound === true || Boolean(targetUserId),
    restricted: source.restricted !== false,
    detailsAvailable,
    requesterName: text(requester.name || source.requesterName),
    requesterOrganization: text(requester.organization || source.requesterOrganization),
    requesterEmail: text(requester.email || source.requesterEmail).toLowerCase(),
    authorityDescription: text(source.authorityDescription),
    jurisdiction: text(source.jurisdiction),
    targetUserId,
    scope: text(source.scope),
    dateFrom: source.dateFrom || null,
    dateTo: source.dateTo || null,
    preservationAuthority: text(preservation.authority || source.preservationAuthority),
    preservationStartedAt: preservation.startedAt || source.preservationStartedAt || null,
    preservationExpiresAt: preservation.expiresAt || source.preservationExpiresAt || null,
    preservationRenewalCount: Math.max(
      Number(preservation.renewalCount ?? source.preservationRenewalCount) || 0,
      0
    ),
    requesterIdentityVerification: source.requesterIdentityVerification || null,
    requesterAuthorityVerification: source.requesterAuthorityVerification || null,
    jurisdictionReview: source.jurisdictionReview || null,
    minimumNecessaryScope: text(source.minimumNecessaryScope),
    userNoticeStatus: text(source.userNoticeStatus),
    approvedArchiveScopes: Array.isArray(source.approvedArchiveScopes)
      ? source.approvedArchiveScopes.map(text).filter(Boolean)
      : [],
    legalReview: source.legalReview || null,
    approvedAt: source.approvedAt || null,
    approvedBy: referenceId(source.approvedBy),
    evidenceItems: Array.isArray(source.evidenceItems) ? source.evidenceItems : [],
    createdBy: source.createdBy || null,
    reviewedBy: source.reviewedBy || null,
    createdAt: source.createdAt || undefined,
    updatedAt: source.updatedAt || undefined,
    closedAt: source.closedAt || null
  };
}

export function normalizeAdminEvidenceRequests(values: unknown) {
  return Array.isArray(values)
    ? values.map(normalizeAdminEvidenceRequest).filter((item) => Boolean(item._id))
    : [];
}

export async function listAdminEvidenceRequests() {
  const response = await apiRequest<{ ok: true; requests: unknown[] }>(
    "/api/admin/evidence-requests",
    { cache: "no-store" }
  );
  if (response?.ok !== true || !Array.isArray(response.requests)) {
    throw new Error("GrowPath returned an invalid evidence-request list.");
  }
  return normalizeAdminEvidenceRequests(response.requests);
}

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

export async function updateLegalEvidenceRequestReview(
  evidenceRequestId: string,
  input:
    | {
        requesterIdentityVerification: {
          verified: true;
          method: string;
          reference: string;
        };
        requesterAuthorityVerification: {
          verified: true;
          method: string;
          reference: string;
        };
        reason: string;
      }
    | {
        jurisdiction: string;
        jurisdictionReview: {
          reviewed: true;
          determination: string;
          reference: string;
        };
        minimumNecessaryScope: string;
        userNoticeStatus: "permitted" | "delayed" | "prohibited" | "sent";
        reason: string;
      }
) {
  const response = await apiRequest<{ ok: true; request: unknown }>(
    `/api/admin/evidence-requests/${encodeURIComponent(evidenceRequestId)}`,
    { method: "PATCH", body: input, cache: "no-store" }
  );
  if (response?.ok !== true || !response.request) {
    throw new Error("GrowPath returned an invalid evidence-review receipt.");
  }
  return normalizeAdminEvidenceRequest(response.request);
}

export async function reviewLegalEvidenceApproval(
  evidenceRequestId: string,
  input: LegalEvidenceApprovalProposal
) {
  const response = await apiRequest<{ ok: true; review: LegalEvidenceApprovalReview }>(
    `${BASE}/evidence-requests/${encodeURIComponent(evidenceRequestId)}/approval-review`,
    { method: "POST", body: input, cache: "no-store" }
  );
  if (
    response?.ok !== true ||
    !response.review?.reviewToken ||
    response.review.evidenceRequestId !== evidenceRequestId ||
    response.review.targetUserId !== input.targetUserId ||
    response.review.nextConfirmation !==
      `APPROVE EVIDENCE REQUEST ${evidenceRequestId} FOR ${input.targetUserId}` ||
    !Array.isArray(response.review.scopes) ||
    response.review.scopes.length !== input.scopes.length ||
    response.review.scopes.some((scope, index) => scope !== input.scopes[index]) ||
    Number.isNaN(new Date(response.review.reviewExpiresAt).getTime()) ||
    new Date(response.review.reviewExpiresAt).getTime() <= Date.now() ||
    response.review.externalTransmissionPerformed !== false
  ) {
    throw new Error("GrowPath returned an invalid legal-approval review.");
  }
  return response.review;
}

export async function approveLegalEvidenceRequest(
  evidenceRequestId: string,
  input: LegalEvidenceApprovalProposal & {
    reviewToken: string;
    confirmation: string;
  }
) {
  const response = await apiRequest<{
    ok: true;
    approval: LegalEvidenceApprovalReceipt;
  }>(`${BASE}/evidence-requests/${encodeURIComponent(evidenceRequestId)}/approval`, {
    method: "POST",
    body: input,
    cache: "no-store"
  });
  if (
    response?.ok !== true ||
    response.approval?.status !== "approved" ||
    response.approval.evidenceRequestId !== evidenceRequestId ||
    response.approval.targetUserId !== input.targetUserId ||
    !Array.isArray(response.approval.approvedArchiveScopes) ||
    response.approval.approvedArchiveScopes.length !== input.scopes.length ||
    response.approval.approvedArchiveScopes.some(
      (scope, index) => scope !== input.scopes[index]
    ) ||
    response.approval.externalTransmissionPerformed !== false
  ) {
    throw new Error("GrowPath returned an invalid legal-approval receipt.");
  }
  return response.approval;
}
