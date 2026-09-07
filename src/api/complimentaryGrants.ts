import { apiRequest } from "./apiRequest";

export type ComplimentaryGrantPlan = "pro" | "commercial" | "facility";
export type ComplimentaryGrantDuration = "month" | "year";

export type ComplimentaryFacilityWorkspace = {
  facilityId: string;
  name: string;
  workspaceReference: string | null;
};

export type ComplimentaryGrant = {
  id: string;
  recipientEmail: string;
  recipientName: string;
  message: string;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
  facilityId: string | null;
  status: "pending" | "active" | "expired" | "revoked";
  reason: string;
  issuedAt: string | null;
  claimExpiresAt: string | null;
  entitlementEndsAt: string | null;
  revocationReason: string;
  complimentary: true;
  paymentState: "nonpaid";
  renews: false;
  emailDelivery: {
    status: "pending" | "sending" | "sent" | "failed" | "canceled";
    attempts: number;
    lastAttemptAt: string | null;
    sentAt: string | null;
    failureKind: "retryable" | "ambiguous" | "permanent" | null;
    nextAttemptAt: string | null;
    exhaustedAt: string | null;
    lastErrorCode: string;
  };
};

export type ComplimentaryClaimSummary = {
  recipientEmail: string;
  recipientName: string;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
  facilityId: string | null;
  message: string;
  complimentary: true;
  paymentState: "nonpaid";
  renews: false;
};

export type ComplimentaryClaimResult = {
  claimed: true;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
  facilityId: string | null;
  expiresAt: string;
  complimentary: true;
  paymentState: "nonpaid";
  renews: false;
  nextPath: "/account/billing";
};

const GRANT_PLANS = new Set<ComplimentaryGrantPlan>(["pro", "commercial", "facility"]);
const GRANT_DURATIONS = new Set<ComplimentaryGrantDuration>(["month", "year"]);
const GRANT_STATUSES = new Set(["pending", "active", "expired", "revoked"]);
const DELIVERY_STATUSES = new Set(["pending", "sending", "sent", "failed", "canceled"]);
const FAILURE_KINDS = new Set(["retryable", "ambiguous", "permanent"]);

function invalidResponse(): never {
  throw new Error("GrowPathAI received an invalid complimentary-access response.");
}

function record(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function stringOrNull(value: unknown) {
  return value === null || typeof value === "string";
}

function normalizedEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function validFacilityId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function validFacilityBinding(
  plan: ComplimentaryGrantPlan,
  facilityId: unknown,
  allowLegacyFacilityNull: boolean
) {
  if (plan !== "facility") return facilityId === null;
  return validFacilityId(facilityId) || (allowLegacyFacilityNull && facilityId === null);
}

function validPlan(value: unknown): value is ComplimentaryGrantPlan {
  return GRANT_PLANS.has(value as ComplimentaryGrantPlan);
}

function validDuration(value: unknown): value is ComplimentaryGrantDuration {
  return GRANT_DURATIONS.has(value as ComplimentaryGrantDuration);
}

function checkedGrant(value: unknown): ComplimentaryGrant {
  const grant = record(value);
  const delivery = record(grant?.emailDelivery);
  if (
    !grant ||
    typeof grant.id !== "string" ||
    !grant.id.trim() ||
    typeof grant.recipientEmail !== "string" ||
    !grant.recipientEmail.trim() ||
    typeof grant.recipientName !== "string" ||
    typeof grant.message !== "string" ||
    !validPlan(grant.plan) ||
    !validDuration(grant.duration) ||
    !validFacilityBinding(grant.plan, grant.facilityId, true) ||
    !GRANT_STATUSES.has(grant.status) ||
    typeof grant.reason !== "string" ||
    !stringOrNull(grant.issuedAt) ||
    !stringOrNull(grant.claimExpiresAt) ||
    !stringOrNull(grant.entitlementEndsAt) ||
    typeof grant.revocationReason !== "string" ||
    grant.complimentary !== true ||
    grant.paymentState !== "nonpaid" ||
    grant.renews !== false ||
    !delivery ||
    !DELIVERY_STATUSES.has(delivery.status) ||
    !Number.isInteger(delivery.attempts) ||
    delivery.attempts < 0 ||
    !stringOrNull(delivery.lastAttemptAt) ||
    !stringOrNull(delivery.sentAt) ||
    !(delivery.failureKind === null || FAILURE_KINDS.has(delivery.failureKind)) ||
    !stringOrNull(delivery.nextAttemptAt) ||
    !stringOrNull(delivery.exhaustedAt) ||
    typeof delivery.lastErrorCode !== "string"
  ) {
    return invalidResponse();
  }
  return grant as ComplimentaryGrant;
}

function checkedClaimSummary(value: unknown): ComplimentaryClaimSummary {
  const summary = record(value);
  if (
    !summary ||
    typeof summary.recipientEmail !== "string" ||
    !summary.recipientEmail.trim() ||
    typeof summary.recipientName !== "string" ||
    !validPlan(summary.plan) ||
    !validDuration(summary.duration) ||
    !validFacilityBinding(summary.plan, summary.facilityId, true) ||
    typeof summary.message !== "string" ||
    summary.complimentary !== true ||
    summary.paymentState !== "nonpaid" ||
    summary.renews !== false
  ) {
    return invalidResponse();
  }
  return summary as ComplimentaryClaimSummary;
}

function checkedClaimResult(value: unknown): ComplimentaryClaimResult {
  const result = record(value);
  if (
    !result ||
    result.claimed !== true ||
    !validPlan(result.plan) ||
    !validDuration(result.duration) ||
    !validFacilityBinding(result.plan, result.facilityId, true) ||
    typeof result.expiresAt !== "string" ||
    !result.expiresAt.trim() ||
    result.complimentary !== true ||
    result.paymentState !== "nonpaid" ||
    result.renews !== false ||
    result.nextPath !== "/account/billing"
  ) {
    return invalidResponse();
  }
  return result as ComplimentaryClaimResult;
}

export async function previewComplimentaryGrant(
  token: string
): Promise<ComplimentaryClaimSummary> {
  const response = await apiRequest(
    "/api/subscription/complimentary-grants/claim/preview",
    { method: "POST", auth: false, cache: "no-store", body: { token } }
  );
  return checkedClaimSummary((response?.data ?? response)?.grant);
}

export async function claimComplimentaryGrant(
  token: string
): Promise<ComplimentaryClaimResult> {
  const response = await apiRequest("/api/subscription/complimentary-grants/claim", {
    method: "POST",
    cache: "no-store",
    body: { token }
  });
  return checkedClaimResult(response?.data ?? response);
}

export async function listComplimentaryGrants({
  limit = 5,
  cursor
}: {
  limit?: number;
  cursor?: string | null;
} = {}): Promise<{ grants: ComplimentaryGrant[]; nextCursor: string | null }> {
  const response = await apiRequest("/api/admin/complimentary-grants", {
    method: "GET",
    cache: "no-store",
    params: { limit, cursor }
  });
  const payload = response?.data ?? response;
  if (!Array.isArray(payload?.grants)) return invalidResponse();
  if (!(payload?.nextCursor === null || typeof payload?.nextCursor === "string")) {
    return invalidResponse();
  }
  return {
    grants: payload.grants.map(checkedGrant),
    nextCursor: payload.nextCursor
  };
}

export async function issueComplimentaryGrant(input: {
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
  facilityId?: string;
  reason: string;
}): Promise<{ grant: ComplimentaryGrant; deliveryAccepted: boolean }> {
  const expectedFacilityId = input.plan === "facility" ? input.facilityId : null;
  if (
    !validFacilityBinding(input.plan, expectedFacilityId, false) ||
    (input.plan !== "facility" && input.facilityId !== undefined)
  ) {
    return invalidResponse();
  }
  const response = await apiRequest("/api/admin/complimentary-grants", {
    method: "POST",
    body: input
  });
  const payload = record(response?.data ?? response);
  if (!payload || typeof payload.deliveryAccepted !== "boolean") {
    return invalidResponse();
  }
  const grant = checkedGrant(payload.grant);
  if (
    grant.plan !== input.plan ||
    grant.duration !== input.duration ||
    normalizedEmail(grant.recipientEmail) !== normalizedEmail(input.recipientEmail) ||
    grant.facilityId !== expectedFacilityId
  ) {
    return invalidResponse();
  }
  return {
    grant,
    deliveryAccepted: payload.deliveryAccepted
  };
}

export async function listComplimentaryFacilityWorkspaces(
  recipientEmail: string
): Promise<{
  recipientEmail: string;
  workspaces: ComplimentaryFacilityWorkspace[];
}> {
  const response = await apiRequest(
    "/api/admin/complimentary-grants/facility-workspaces",
    {
      method: "GET",
      cache: "no-store",
      params: { recipientEmail }
    }
  );
  const payload = record(response?.data ?? response);
  const expectedRecipientEmail = normalizedEmail(recipientEmail);
  if (
    !payload ||
    typeof payload.recipientEmail !== "string" ||
    normalizedEmail(payload.recipientEmail) !== expectedRecipientEmail ||
    !expectedRecipientEmail ||
    !Array.isArray(payload.workspaces)
  ) {
    return invalidResponse();
  }
  const workspaces = payload.workspaces.map((value: unknown) => {
    const workspace = record(value);
    if (
      !workspace ||
      !validFacilityId(workspace.facilityId) ||
      typeof workspace.name !== "string" ||
      !workspace.name.trim() ||
      !stringOrNull(workspace.workspaceReference)
    ) {
      return invalidResponse();
    }
    return workspace as ComplimentaryFacilityWorkspace;
  });
  if (
    new Set(workspaces.map((workspace) => workspace.facilityId)).size !==
    workspaces.length
  ) {
    return invalidResponse();
  }
  return { recipientEmail: expectedRecipientEmail, workspaces };
}

export async function revokeComplimentaryGrant(id: string, reason: string) {
  const response = await apiRequest(
    `/api/admin/complimentary-grants/${encodeURIComponent(id)}/revoke`,
    { method: "POST", body: { reason } }
  );
  return checkedGrant((response?.data ?? response)?.grant);
}

export async function resendComplimentaryGrant(
  id: string,
  reason: string
): Promise<{ grant: ComplimentaryGrant; deliveryAccepted: boolean }> {
  const response = await apiRequest(
    `/api/admin/complimentary-grants/${encodeURIComponent(id)}/resend`,
    { method: "POST", body: { reason } }
  );
  const payload = record(response?.data ?? response);
  if (!payload || typeof payload.deliveryAccepted !== "boolean") {
    return invalidResponse();
  }
  return {
    grant: checkedGrant(payload.grant),
    deliveryAccepted: payload.deliveryAccepted
  };
}
