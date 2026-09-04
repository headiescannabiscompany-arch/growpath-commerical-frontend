import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export type StripeConnectRequirementSummary = {
  disabledReason: string;
  currentlyDueCount: number;
  eventuallyDueCount: number;
  pastDueCount: number;
  pendingVerificationCount: number;
};

export type StripeConnectPayoutStatus = {
  connected: boolean;
  onboardingStatus: "none" | "pending" | "restricted" | "complete" | "unknown";
  chargesEnabled: boolean;
  transfersEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: StripeConnectRequirementSummary;
  payoutManagement: unknown;
};

export type StripeConnectLinkResult = {
  url: string | null;
  status: StripeConnectPayoutStatus;
  payoutManagement: unknown;
};

const EMPTY_REQUIREMENTS: StripeConnectRequirementSummary = {
  disabledReason: "",
  currentlyDueCount: 0,
  eventuallyDueCount: 0,
  pastDueCount: 0,
  pendingVerificationCount: 0
};

function unwrap(value: any) {
  return value?.data ?? value ?? {};
}

function safeCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function onboardingStatus(value: unknown): StripeConnectPayoutStatus["onboardingStatus"] {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["none", "pending", "restricted", "complete"].includes(normalized)) {
    return normalized as StripeConnectPayoutStatus["onboardingStatus"];
  }
  return "unknown";
}

export function normalizeStripeConnectStatus(
  payload: unknown
): StripeConnectPayoutStatus {
  const envelope = unwrap(payload);
  const source = unwrap(envelope?.status ?? envelope);
  const requirements = source?.requirements || {};

  return {
    connected: source?.connected === true,
    onboardingStatus: onboardingStatus(source?.onboardingStatus),
    chargesEnabled: source?.chargesEnabled === true,
    transfersEnabled: source?.transfersEnabled === true,
    payoutsEnabled: source?.payoutsEnabled === true,
    detailsSubmitted: source?.detailsSubmitted === true,
    requirements: {
      ...EMPTY_REQUIREMENTS,
      disabledReason: String(requirements?.disabledReason || "").trim(),
      currentlyDueCount: safeCount(requirements?.currentlyDueCount),
      eventuallyDueCount: safeCount(requirements?.eventuallyDueCount),
      pastDueCount: safeCount(requirements?.pastDueCount),
      pendingVerificationCount: safeCount(requirements?.pendingVerificationCount)
    },
    payoutManagement: envelope?.payoutManagement ?? source?.payoutManagement ?? null
  };
}

function normalizeLinkResult(payload: unknown): StripeConnectLinkResult {
  const envelope = unwrap(payload);
  return {
    url:
      typeof envelope?.url === "string" && envelope.url.trim()
        ? envelope.url.trim()
        : null,
    status: normalizeStripeConnectStatus(envelope),
    payoutManagement: envelope?.payoutManagement ?? null
  };
}

export async function getConnectPayoutStatus() {
  const response = await apiRequest(apiRoutes.CREATOR.CONNECT_PAYOUT_STATUS, {
    method: "GET"
  });
  return normalizeStripeConnectStatus(response);
}

export async function startConnectPayoutOnboarding() {
  // Return and refresh destinations are server-owned. Never accept or forward a
  // browser-supplied redirect, connected-account ID, or user ID here.
  const response = await apiRequest(apiRoutes.USER.ONBOARD_CREATOR, {
    method: "POST"
  });
  return normalizeLinkResult(response);
}

export async function createConnectPayoutDashboardLink() {
  const response = await apiRequest(apiRoutes.CREATOR.CONNECT_PAYOUT_DASHBOARD, {
    method: "POST"
  });
  return normalizeLinkResult(response);
}
