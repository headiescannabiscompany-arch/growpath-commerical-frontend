import { resolveSubscriptionSafety } from "@/features/billing/subscriptionSafety";

describe("subscription safety", () => {
  const pastDue = {
    plan: "free",
    effectivePlan: "free",
    subscriptionStatus: "past_due",
    source: "stripe",
    active: false,
    isPro: false,
    hasActiveSubscription: false,
    currentPeriodEnd: "2030-05-15T18:30:00.000Z",
    paidThrough: null,
    endsAt: null,
    canManageBilling: true,
    canCancelSubscription: true,
    canStartCheckout: false
  };

  it("allows server-authorized past-due billing cancellation without granting paid access or checkout", () => {
    const result = resolveSubscriptionSafety(pastDue, {
      effectivePlan: "free",
      hasPaidCapability: false
    });
    expect(result.active).toBe(false);
    expect(result.plan).toBe("free");
    expect(result.canCancel).toBe(true);
    expect(result.canOpenCheckout).toBe(false);
    expect(result.paidThrough).toBeNull();
    expect(result.message).toContain("No active paid access");
  });

  it("does not manufacture paid access when a past-due subscription has scheduled cancellation", () => {
    const result = resolveSubscriptionSafety({ ...pastDue, cancelAtPeriodEnd: true });
    expect(result.active).toBe(false);
    expect(result.cancelScheduled).toBe(true);
    expect(result.canCancel).toBe(false);
    expect(result.canOpenCheckout).toBe(false);
    expect(result.paidThrough).toBeNull();
    expect(result.message).not.toMatch(/access remains available/);
  });

  it.each([
    [{ canManageBilling: false }, {}],
    [{ canCancelSubscription: false }, {}],
    [{ source: "gift" }, {}],
    [{}, { loaded: false }]
  ])(
    "retains cancellation authorization boundaries for inactive access",
    (overrides, context) => {
      expect(
        resolveSubscriptionSafety({ ...pastDue, ...overrides }, context).canCancel
      ).toBe(false);
    }
  );

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

  it("fails closed on cancellation until the billing record is loaded", () => {
    const result = resolveSubscriptionSafety(
      {
        status: "active",
        plan: "pro",
        billingSource: "stripe",
        canManageBilling: true,
        canCancelSubscription: true
      },
      { loaded: false }
    );

    expect(result.active).toBe(true);
    expect(result.canCancel).toBe(false);
  });

  it("keeps complimentary access nonpaid and non-cancellable", () => {
    const result = resolveSubscriptionSafety({
      plan: "commercial",
      subscriptionStatus: "active",
      source: "complimentary",
      complimentaryEntitlementEndsAt: "2030-05-15T18:30:00.000Z",
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: false
    });

    expect(result.source).toBe("complimentary");
    expect(result.active).toBe(true);
    expect(result.canCancel).toBe(false);
    expect(result.canOpenCheckout).toBe(false);
    expect(result.paidThrough).toBe("2030-05-15T18:30:00.000Z");
    expect(result.message).toContain("No payment was made");
  });

  it.each([
    ["platform", "platform-provided access is nonpaid"],
    ["test", "test access is nonpaid"]
  ])("describes %s access as nonpaid and non-renewing", (source, message) => {
    const result = resolveSubscriptionSafety({
      plan: "pro",
      subscriptionStatus: "active",
      source,
      paymentState: "nonpaid",
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: false
    });

    expect(result.source).toBe(source);
    expect(result.canCancel).toBe(false);
    expect(result.canOpenCheckout).toBe(false);
    expect(result.message.toLowerCase()).toContain(message);
    expect(result.message).toContain("does not renew");
  });

  it("requires explicit backend permission before opening checkout", () => {
    const blocked = resolveSubscriptionSafety({
      plan: "free",
      subscriptionStatus: "expired",
      source: "free"
    });
    expect(blocked.canOpenCheckout).toBe(false);
    expect(blocked.message).toContain("Checkout is unavailable");

    const allowed = resolveSubscriptionSafety({
      plan: "free",
      subscriptionStatus: "expired",
      source: "free",
      canStartCheckout: true
    });
    expect(allowed.canOpenCheckout).toBe(true);
    expect(allowed.message).toContain("Checkout remains available");
  });
});
