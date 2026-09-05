import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import BillingSuccess from "@/features/billing/screens/BillingSuccess";
import SubscriptionStatusScreen from "@/screens/SubscriptionStatusScreen";
import { getSubscriptionStatus as getCanonicalStatus } from "@/api/subscription";
import { getSubscription } from "@/api/subscription";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "token-1" })
}));

jest.mock("@/api/subscription", () => ({
  getSubscriptionStatus: jest.fn(),
  getSubscription: jest.fn()
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn()
}));

describe("trial subscription status", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("treats Stripe trialing as confirmed after checkout", async () => {
    (getCanonicalStatus as jest.Mock).mockResolvedValue({
      plan: "facility",
      subscriptionStatus: "trialing"
    });

    const screen = render(<BillingSuccess />);

    await waitFor(() => expect(screen.getByText("Trial confirmed")).toBeTruthy());
    expect(screen.queryByText(/waiting for confirmation/i)).toBeNull();
  });

  it("shows the correct plan and trial label instead of Free", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      success: true,
      isPro: true,
      plan: "facility",
      status: "trialing",
      trialUsed: true
    });

    const screen = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() =>
      expect(screen.getByText("Facility trial confirmed")).toBeTruthy()
    );
    expect(screen.getByText("Facility Free Trial")).toBeTruthy();
    expect(screen.queryByText("Free")).toBeNull();
  });

  it("keeps a used legacy trial Free and allows paid checkout without another trial", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      success: true,
      isPro: false,
      active: false,
      plan: "free",
      subscriptionStatus: "inactive",
      source: "local_trial",
      paymentState: "nonpaid",
      trialUsed: true,
      trialPlansUsed: ["pro"],
      trialEligibility: {
        enabled: true,
        eligible: false,
        days: 30,
        policy: "one_per_account"
      },
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: true
    });

    const screen = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() => expect(screen.getByText("Free")).toBeTruthy());
    expect(screen.getByText("inactive")).toBeTruthy();
    expect(screen.queryByText(/30-day introductory trial/i)).toBeNull();
    expect(screen.getByText(/Checkout remains available/i)).toBeTruthy();
    expect(screen.getByText("Upgrade to PRO")).toBeTruthy();
    expect(screen.queryByText(/paid confirmed/i)).toBeNull();
  });

  it("fails closed when paid-looking account state has no verified authority", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      success: true,
      isPro: false,
      active: false,
      plan: "free",
      subscriptionStatus: "expired",
      source: "unknown",
      paymentState: "nonpaid",
      trialUsed: true,
      trialPlansUsed: ["pro"],
      trialEligibility: {
        enabled: true,
        eligible: false,
        days: 30,
        policy: "one_per_account"
      },
      canManageBilling: false,
      canCancelSubscription: false,
      canStartCheckout: false,
      checkoutBlockedReason: "billing_reconciliation_required"
    });

    const screen = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() => expect(screen.getByText("Free")).toBeTruthy());
    expect(screen.getByText("Expired")).toBeTruthy();
    expect(screen.getByText(/Checkout is unavailable/i)).toBeTruthy();
    expect(screen.queryByText("Upgrade to PRO")).toBeNull();
    expect(screen.queryByText("Cancel Subscription")).toBeNull();
    expect(screen.queryByText(/paid confirmed/i)).toBeNull();
  });
});
