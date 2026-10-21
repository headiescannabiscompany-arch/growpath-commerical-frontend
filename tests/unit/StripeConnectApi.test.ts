const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("Stripe Connect payout API adapter", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("course-payment request pins the current session, explicit intent and quiet no-retry transport", async () => {
    mockApiRequest.mockResolvedValue({ coursePayments: { status: "pending", canResume: true }, url: "https://accounts.stripe.com/r/test" });
    const { startConnectCoursePaymentOnboarding } = require("@/api/stripeConnect");
    const response = await startConnectCoursePaymentOnboarding("synthetic-session");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator/onboard", expect.objectContaining({
      headers: { Authorization: "Bearer synthetic-session" },
      body: { purpose: "course_payments", confirmCoursePayments: true },
      retries: 0, notifyTokenBalance: false, invalidateOn401: false, cache: "no-store"
    }));
    expect(response.status.coursePayments).toEqual({ status: "pending", canStart: false, canResume: true });
  });
  it.each([undefined, { status: "unknown", canStart: true }, { status: "ready", canResume: true }])("course-payment projection fails closed for unexpected action flags: %p", async (coursePayments) => {
    const { normalizeStripeConnectStatus } = require("@/api/stripeConnect");
    const result = normalizeStripeConnectStatus({ coursePayments, chargesEnabled: true, transfersEnabled: true });
    expect(result.coursePayments.canStart).toBe(false); expect(result.coursePayments.canResume).toBe(false);
  });
  it("course-payment requests require a current sign-in token", async () => {
    const { startConnectCoursePaymentOnboarding } = require("@/api/stripeConnect");
    await expect(startConnectCoursePaymentOnboarding("")).rejects.toThrow("Sign in again");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("normalizes provider status without trusting a local payout marker", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      status: {
        connected: true,
        onboardingStatus: "complete",
        transfersEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        requirements: { pendingVerificationCount: 0 }
      },
      payoutManagement: {
        provider: "stripe_connect",
        bankPayoutStatusSource: "stripe_dashboard"
      }
    });
    const { getConnectPayoutStatus } = require("@/api/stripeConnect");

    const status = await getConnectPayoutStatus();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/earnings/connect-status", {
      method: "GET"
    });
    expect(status).toMatchObject({
      connected: true,
      onboardingStatus: "complete",
      transfersEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      payoutManagement: {
        provider: "stripe_connect",
        bankPayoutStatusSource: "stripe_dashboard"
      }
    });
  });

  it("starts onboarding without sending browser-owned redirect or account data", async () => {
    mockApiRequest.mockResolvedValue({
      url: "https://connect.stripe.com/setup/test",
      connected: true,
      onboardingStatus: "pending"
    });
    const { startConnectPayoutOnboarding } = require("@/api/stripeConnect");

    await startConnectPayoutOnboarding();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator/onboard", {
      method: "POST"
    });
  });

  it("requests an ephemeral Stripe dashboard link without a local payout mutation", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      url: "https://connect.stripe.com/express/test"
    });
    const { createConnectPayoutDashboardLink } = require("@/api/stripeConnect");

    const result = await createConnectPayoutDashboardLink();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/earnings/connect-dashboard-link", {
      method: "POST"
    });
    expect(result.url).toBe("https://connect.stripe.com/express/test");
  });

  it("sends only the explicit country choice for new seller onboarding", async () => {
    mockApiRequest.mockResolvedValue({ url: "https://accounts.stripe.com/r/test" });
    const { startConnectPayoutOnboarding } = require("@/api/stripeConnect");
    await startConnectPayoutOnboarding(" ca ");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator/onboard", {
      method: "POST",
      body: { country: "CA" }
    });
  });

  it.each([
    [" ca ", { method: "POST", body: { country: "CA" } }],
    [undefined, { method: "POST" }]
  ])(
    "preserves the legacy wrapper country/resume contract: %p",
    async (country, request) => {
      mockApiRequest.mockResolvedValue({ url: "https://accounts.stripe.com/r/test" });
      const { onboardCreator } = require("@/api/users");

      await onboardCreator(country);

      expect(mockApiRequest).toHaveBeenCalledTimes(1);
      expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator/onboard", request);
    }
  );
});
