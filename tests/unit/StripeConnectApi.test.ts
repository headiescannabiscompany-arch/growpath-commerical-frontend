const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("Stripe Connect payout API adapter", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
});
