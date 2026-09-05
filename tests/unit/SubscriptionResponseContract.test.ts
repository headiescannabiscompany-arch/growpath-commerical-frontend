import {
  getSubscription,
  getSubscriptionSetupStatus,
  getVerifiedRecurringPriceQuote,
  openSubscriptionPortal
} from "@/api/subscription";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

function recurringQuote(
  plan: "pro" | "commercial" | "facility",
  interval: "monthly" | "yearly",
  overrides: Record<string, unknown> = {}
) {
  return {
    plan,
    interval,
    available: true,
    unitAmount: interval === "monthly" ? 1000 : 10000,
    currency: "usd",
    formattedAmount: interval === "monthly" ? "$10.00" : "$100.00",
    verifiedAt: "2026-09-04T12:00:00.000Z",
    trialTerms: {
      days: 30,
      eligibility: "one_per_account",
      paymentMethodRequired: true,
      renewsUnlessCanceled: true
    },
    ...overrides
  };
}

function recurringCatalog() {
  return Object.fromEntries(
    (["pro", "commercial", "facility"] as const).map((plan) => [
      plan,
      {
        monthly: recurringQuote(plan, "monthly"),
        yearly: recurringQuote(plan, "yearly")
      }
    ])
  );
}

describe("subscription billing response contract", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it.each(["paid", "nonpaid"])("accepts paymentState %s", async (paymentState) => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: paymentState === "paid" ? "stripe" : "platform",
      paymentState,
      paymentKind: paymentState === "paid" ? "provider" : "nonpaid"
    });

    await expect(getSubscription()).resolves.toMatchObject({ paymentState });
  });

  it("rejects provider when it is incorrectly returned as paymentState", async () => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      paymentState: "provider",
      paymentKind: "provider"
    });

    await expect(getSubscription()).rejects.toThrow(
      "The subscription billing response was invalid."
    );
  });

  it("fails closed when paymentState is omitted", async () => {
    mockApiRequest.mockResolvedValue({
      plan: "pro",
      subscriptionStatus: "active",
      source: "stripe",
      paymentKind: "provider"
    });

    await expect(getSubscription()).rejects.toThrow(
      "The subscription billing response was invalid."
    );
  });

  it("accepts only an HTTPS Stripe Billing Portal URL", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      url: "https://billing.stripe.com/p/session/test_portal"
    });

    await expect(openSubscriptionPortal()).resolves.toBe(
      "https://billing.stripe.com/p/session/test_portal"
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/subscribe/portal", {
      method: "POST",
      body: {}
    });
  });

  it.each([
    "http://billing.stripe.com/p/session/insecure",
    "https://billing.stripe.com.attacker.example/p/session/fake",
    "https://attacker.example/p/session/fake",
    "not-a-url"
  ])("rejects an untrusted Billing Portal URL: %s", async (url) => {
    mockApiRequest.mockResolvedValue({ success: true, url });

    await expect(openSubscriptionPortal()).rejects.toThrow(
      "Stripe subscription management returned an invalid link."
    );
  });

  it("accepts all six identity-bound recurring quotes", async () => {
    mockApiRequest.mockResolvedValue({
      mode: "test",
      catalogReady: true,
      quotes: recurringCatalog()
    });

    const status = await getSubscriptionSetupStatus();

    expect(status.catalogReady).toBe(true);
    expect(
      getVerifiedRecurringPriceQuote(status.quotes, "commercial", "yearly")
    ).toMatchObject({
      plan: "commercial",
      interval: "yearly",
      available: true
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/subscription/status", {
      method: "GET",
      cache: "no-store"
    });
  });

  it.each([
    ["wrong nested plan", { plan: "facility" }],
    ["fractional amount", { unitAmount: 999.5 }],
    ["uppercase currency", { currency: "USD" }],
    ["unverified timestamp", { verifiedAt: "not-a-date" }],
    [
      "optional payment method",
      {
        trialTerms: {
          days: 30,
          eligibility: "one_per_account",
          paymentMethodRequired: false,
          renewsUnlessCanceled: true
        }
      }
    ]
  ])(
    "strips a malformed %s quote and marks the catalog unavailable",
    async (_label, bad) => {
      const quotes = recurringCatalog() as Record<string, any>;
      quotes.pro.monthly = recurringQuote("pro", "monthly", bad);
      mockApiRequest.mockResolvedValue({ catalogReady: true, quotes });

      const status = await getSubscriptionSetupStatus();

      expect(status.catalogReady).toBe(false);
      expect(getVerifiedRecurringPriceQuote(status.quotes, "pro", "monthly")).toBeNull();
      expect(status.quotes.pro?.yearly).toBeTruthy();
    }
  );

  it("preserves a well-formed unavailable quote without treating it as a price", async () => {
    const quotes = recurringCatalog() as Record<string, any>;
    quotes.facility.yearly = {
      plan: "facility",
      interval: "yearly",
      available: false,
      unitAmount: null,
      currency: null,
      formattedAmount: null,
      verifiedAt: null,
      unavailableReason: "STRIPE_CATALOG_LOOKUP_FAILED",
      trialTerms: {
        days: 30,
        eligibility: "one_per_account",
        paymentMethodRequired: true,
        renewsUnlessCanceled: true
      }
    };
    mockApiRequest.mockResolvedValue({ catalogReady: false, quotes });

    const status = await getSubscriptionSetupStatus();

    expect(status.quotes.facility?.yearly?.available).toBe(false);
    expect(
      getVerifiedRecurringPriceQuote(status.quotes, "facility", "yearly")
    ).toBeNull();
  });
});
