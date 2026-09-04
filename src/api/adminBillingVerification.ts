import { apiRequest } from "@/api/apiRequest";

export type StripeBillingVerificationClassification =
  | "verified_active"
  | "verified_trialing"
  | "verified_canceling"
  | "provider_blocking"
  | "provider_inactive_local_paid_drift"
  | "source_less_paid_flag"
  | "verified_no_recurring_stripe"
  | "verified_free"
  | "ambiguous_multiple_active"
  | "unavailable";

export type AdminStripeBillingVerification = {
  readOnly: true;
  inspectedAt: string;
  complete: boolean;
  classification: StripeBillingVerificationClassification;
  consistency: "consistent" | "local_sync_needed" | "review_needed" | "unavailable";
  requiresReview: boolean;
  reason: string;
  local: {
    requestedPlan: string;
    effectivePlan: string;
    status: string;
    source: string;
    active: boolean;
    paymentState: string;
    renews: boolean;
    cancelAtPeriodEnd: boolean;
    accessEndsAt: string | null;
    currentPeriodEnd: string | null;
    trialExpiry: string | null;
    trialUsed: boolean;
    aiTokens: number;
    maxTokens: number;
    stripeCustomerLinked: boolean;
    stripeSubscriptionLinked: boolean;
    lastStripeVerificationAt: string | null;
    consistency: string;
  };
  provider: {
    customerCount: number;
    relevantSubscriptionCount: number;
    activeSubscriptionCount: number;
    blockingSubscriptionCount: number;
    storedCustomerBinding: string;
    selected: {
      status: string;
      plan: string | null;
      interval: string | null;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string | null;
      subscriptionReference: string | null;
      customerReference: string | null;
    } | null;
  };
};

export async function verifyAdminAccountBilling(userId: string) {
  const response = await apiRequest<{
    ok: true;
    verification: AdminStripeBillingVerification;
  }>(`/api/admin/users/${encodeURIComponent(userId)}/billing-verification`);
  if (response?.ok !== true || response.verification?.readOnly !== true) {
    throw new Error("GrowPath returned an invalid billing-verification receipt.");
  }
  return response.verification;
}
