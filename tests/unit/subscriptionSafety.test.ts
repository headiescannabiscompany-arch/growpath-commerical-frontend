import { resolveSubscriptionSafety } from "@/features/billing/subscriptionSafety";

describe("subscription safety", () => {
  it("keeps an unverified trial non-cancellable", () => {
    const result = resolveSubscriptionSafety({ status: "trialing", plan: "pro" });

    expect(result.source).toBe("trial");
    expect(result.canCancel).toBe(false);
  });

  it("allows an authorized confirmed Stripe trial to cancel before renewal", () => {
    const result = resolveSubscriptionSafety({
      status: "trialing",
      plan: "facility",
      billingSource: "stripe",
      canManageBilling: true,
      canCancelSubscription: true
    });

    expect(result.source).toBe("stripe");
    expect(result.active).toBe(true);
    expect(result.canCancel).toBe(true);
  });
});
