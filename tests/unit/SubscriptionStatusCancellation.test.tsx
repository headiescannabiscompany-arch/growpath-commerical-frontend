import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import SubscriptionStatusScreen from "@/screens/SubscriptionStatusScreen";
import { getSubscription } from "@/api/subscription";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "subscriber-token" })
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) })
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn()
}));

jest.mock("@/api/subscription", () => ({
  getSubscription: jest.fn()
}));

describe("SubscriptionStatusScreen cancellation state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows Commercial paid-through access without a repeat cancel action", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "commercial",
      status: "active",
      isPro: true,
      expiry: "2030-05-15T18:30:00.000Z",
      currentPeriodEnd: "2030-05-15T18:30:00.000Z",
      cancelAtPeriodEnd: true,
      trialPlansUsed: ["commercial"]
    });

    const screen = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() =>
      expect(screen.getByText("Commercial paid confirmed")).toBeTruthy()
    );
    expect(screen.getByText("Access through:")).toBeTruthy();
    expect(
      screen.getByText(
        "Renewal is canceled. Paid features remain available through the date above."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Cancel Subscription")).toBeNull();
  });

  it("offers cancellation only for explicitly manageable Stripe access", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "pro",
      status: "active",
      isPro: true,
      source: "stripe",
      canManageBilling: true,
      canCancelSubscription: true
    });

    const screen = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );

    await waitFor(() => expect(screen.getByText("Cancel Subscription")).toBeTruthy());
  });

  it.each(["gift", "iap", "admin", null])(
    "does not trust stale Stripe IDs for %s-managed access",
    async (source) => {
      (getSubscription as jest.Mock).mockResolvedValue({
        plan: "pro",
        status: "active",
        isPro: true,
        source,
        stripeSubscriptionId: "sub_stale",
        canManageBilling: true,
        canCancelSubscription: true
      });

      const screen = render(
        <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
      );
      await waitFor(() => expect(screen.getByText("Pro paid confirmed")).toBeTruthy());
      expect(screen.queryByText("Cancel Subscription")).toBeNull();
      screen.unmount();
    }
  );

  it("shows one account-wide trial only when the backend says it remains eligible", async () => {
    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "free",
      status: "inactive",
      isPro: false,
      trialUsed: false,
      trialPlansUsed: [],
      trialEligibility: {
        enabled: true,
        eligible: true,
        days: 30,
        policy: "one_per_account"
      }
    });

    const eligible = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );
    await waitFor(() =>
      expect(eligible.getByText(/one 30-day introductory trial/i)).toBeTruthy()
    );
    expect(eligible.queryByText(/separate.*trial/i)).toBeNull();
    eligible.unmount();

    (getSubscription as jest.Mock).mockResolvedValue({
      plan: "free",
      status: "inactive",
      isPro: false,
      trialUsed: true,
      trialPlansUsed: ["commercial"],
      trialEligibility: {
        enabled: true,
        eligible: false,
        days: 30,
        policy: "one_per_account"
      }
    });
    const used = render(
      <SubscriptionStatusScreen navigation={{ navigate: jest.fn() }} />
    );
    await waitFor(() =>
      expect(used.queryByText(/one 30-day introductory trial/i)).toBeNull()
    );
  });
});
