import { apiRequest } from "./apiRequest";

export type ComplimentaryGrantPlan = "pro" | "commercial" | "facility";
export type ComplimentaryGrantDuration = "month" | "year";

export type ComplimentaryGrant = {
  id: string;
  recipientEmail: string;
  recipientName: string;
  message: string;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
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
  message: string;
  complimentary: true;
  paymentState: "nonpaid";
  renews: false;
};

export async function previewComplimentaryGrant(
  token: string
): Promise<ComplimentaryClaimSummary> {
  const response = await apiRequest(
    "/api/subscription/complimentary-grants/claim/preview",
    { method: "POST", auth: false, cache: "no-store", body: { token } }
  );
  return (response?.data ?? response)?.grant;
}

export async function claimComplimentaryGrant(token: string) {
  const response = await apiRequest("/api/subscription/complimentary-grants/claim", {
    method: "POST",
    cache: "no-store",
    body: { token }
  });
  return response?.data ?? response;
}

export async function listComplimentaryGrants({
  limit = 50,
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
  return {
    grants: Array.isArray(payload?.grants) ? payload.grants : [],
    nextCursor: typeof payload?.nextCursor === "string" ? payload.nextCursor : null
  };
}

export async function issueComplimentaryGrant(input: {
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  plan: ComplimentaryGrantPlan;
  duration: ComplimentaryGrantDuration;
  reason: string;
}): Promise<{ grant: ComplimentaryGrant; deliveryAccepted: boolean }> {
  const response = await apiRequest("/api/admin/complimentary-grants", {
    method: "POST",
    body: input
  });
  return response?.data ?? response;
}

export async function revokeComplimentaryGrant(id: string, reason: string) {
  const response = await apiRequest(
    `/api/admin/complimentary-grants/${encodeURIComponent(id)}/revoke`,
    { method: "POST", body: { reason } }
  );
  return (response?.data ?? response)?.grant as ComplimentaryGrant;
}

export async function resendComplimentaryGrant(id: string, reason: string) {
  const response = await apiRequest(
    `/api/admin/complimentary-grants/${encodeURIComponent(id)}/resend`,
    { method: "POST", body: { reason } }
  );
  return response?.data ?? response;
}
