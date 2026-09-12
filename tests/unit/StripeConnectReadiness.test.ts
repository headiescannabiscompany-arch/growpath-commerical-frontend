import { isStripeConnectPayoutReady } from "@/features/billing/stripeConnectReadiness";
import type { StripeConnectPayoutStatus } from "@/api/stripeConnect";

const ready = {
  connected: true,
  onboardingStatus: "complete",
  transfersEnabled: true,
  payoutsEnabled: true,
  detailsSubmitted: true
} as StripeConnectPayoutStatus;

describe("shared provider-verified seller readiness", () => {
  it("requires a verified complete status", () => {
    expect(isStripeConnectPayoutReady(ready)).toBe(true);
    expect(isStripeConnectPayoutReady(null)).toBe(false);
  });
  it.each(["connected", "transfersEnabled", "payoutsEnabled", "detailsSubmitted"])(
    "does not accept missing %s",
    (field) => {
      expect(isStripeConnectPayoutReady({ ...ready, [field]: false })).toBe(false);
    }
  );
  it.each(["none", "pending", "restricted", "unknown"] as const)(
    "does not accept %s onboarding",
    (onboardingStatus) => {
      expect(isStripeConnectPayoutReady({ ...ready, onboardingStatus })).toBe(false);
    }
  );
});
