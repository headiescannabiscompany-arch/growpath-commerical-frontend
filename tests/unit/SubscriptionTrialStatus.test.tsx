import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import BillingSuccess from "@/features/billing/screens/BillingSuccess";
import SubscriptionStatusScreen from "@/screens/SubscriptionStatusScreen";
import { getSubscriptionStatus as getCanonicalStatus } from "@/api/subscription";
import { getSubscriptionStatus as getLegacyStatus } from "@/api/subscribe";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "token-1" })
}));

jest.mock("@/api/subscription", () => ({
  getSubscriptionStatus: jest.fn()
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn(),
  getSubscriptionStatus: jest.fn()
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
    (getLegacyStatus as jest.Mock).mockResolvedValue({
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
});
