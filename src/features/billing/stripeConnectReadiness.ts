import type { StripeConnectPayoutStatus } from "@/api/stripeConnect";

export function isStripeConnectPayoutReady(status: StripeConnectPayoutStatus | null) {
  return Boolean(
    status?.connected &&
    status.onboardingStatus === "complete" &&
    status.transfersEnabled &&
    status.payoutsEnabled &&
    status.detailsSubmitted
  );
}
