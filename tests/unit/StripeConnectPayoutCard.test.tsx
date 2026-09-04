import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StripeConnectPayoutCard from "@/components/account/StripeConnectPayoutCard";

const mockGetStatus = jest.fn();
const mockStartOnboarding = jest.fn();
const mockDashboardLink = jest.fn();
const mockOpenExternalUrl = jest.fn();

jest.mock("@/api/stripeConnect", () => ({
  getConnectPayoutStatus: (...args: any[]) => mockGetStatus(...args),
  startConnectPayoutOnboarding: (...args: any[]) => mockStartOnboarding(...args),
  createConnectPayoutDashboardLink: (...args: any[]) => mockDashboardLink(...args)
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: (...args: any[]) => mockOpenExternalUrl(...args)
}));

function connectStatus(overrides: Record<string, unknown> = {}) {
  return {
    connected: false,
    onboardingStatus: "none",
    chargesEnabled: false,
    transfersEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirements: {
      disabledReason: "",
      currentlyDueCount: 0,
      eventuallyDueCount: 0,
      pastDueCount: 0,
      pendingVerificationCount: 0
    },
    payoutManagement: "stripe_connect_dashboard",
    ...overrides
  };
}

describe("StripeConnectPayoutCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatus.mockResolvedValue(connectStatus());
    mockStartOnboarding.mockResolvedValue({
      url: "https://connect.stripe.com/setup/test",
      status: connectStatus({ connected: true, onboardingStatus: "pending" }),
      payoutManagement: "stripe_connect_dashboard"
    });
    mockDashboardLink.mockResolvedValue({
      url: "https://connect.stripe.com/express/test",
      status: connectStatus(),
      payoutManagement: "stripe_connect_dashboard"
    });
    mockOpenExternalUrl.mockResolvedValue(undefined);
  });

  it("starts server-controlled onboarding for a disconnected seller", async () => {
    const screen = render(<StripeConnectPayoutCard />);
    const action = await screen.findByText("Set up Stripe payouts");

    fireEvent.press(action);

    await waitFor(() => expect(mockStartOnboarding).toHaveBeenCalledTimes(1));
    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://connect.stripe.com/setup/test"
    );
  });

  it("uses a resume action when Stripe reports incomplete onboarding", async () => {
    mockGetStatus.mockResolvedValue(
      connectStatus({ connected: true, onboardingStatus: "pending" })
    );

    const screen = render(<StripeConnectPayoutCard />);

    expect(await screen.findByText("Setup in progress")).toBeTruthy();
    expect(screen.getByText("Resume Stripe setup")).toBeTruthy();
  });

  it("opens Stripe payout management only after provider-verified readiness", async () => {
    mockGetStatus.mockResolvedValue(
      connectStatus({
        connected: true,
        onboardingStatus: "complete",
        transfersEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true
      })
    );

    const screen = render(<StripeConnectPayoutCard />);
    const action = await screen.findByText("Open Stripe payouts");
    fireEvent.press(action);

    await waitFor(() => expect(mockDashboardLink).toHaveBeenCalledTimes(1));
    expect(mockStartOnboarding).not.toHaveBeenCalled();
    expect(mockOpenExternalUrl).toHaveBeenCalledWith(
      "https://connect.stripe.com/express/test"
    );
  });

  it("refuses a payout-management URL outside Stripe Connect", async () => {
    mockStartOnboarding.mockResolvedValue({
      url: "https://example.com/not-stripe",
      status: connectStatus(),
      payoutManagement: "stripe_connect_dashboard"
    });

    const screen = render(<StripeConnectPayoutCard />);
    fireEvent.press(await screen.findByText("Set up Stripe payouts"));

    expect(
      await screen.findByText("Stripe returned an invalid payout-management link.")
    ).toBeTruthy();
    expect(mockOpenExternalUrl).not.toHaveBeenCalled();
  });

  it("does not load or render outside the caller's entitlement boundary", () => {
    const screen = render(<StripeConnectPayoutCard enabled={false} />);

    expect(screen.toJSON()).toBeNull();
    expect(mockGetStatus).not.toHaveBeenCalled();
  });
});
