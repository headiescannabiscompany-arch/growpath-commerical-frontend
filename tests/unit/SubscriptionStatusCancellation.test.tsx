import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import SubscriptionStatusScreen from "@/screens/SubscriptionStatusScreen";
import { getSubscriptionStatus } from "@/api/subscribe";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "subscriber-token" })
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) })
}));

jest.mock("@/api/subscribe", () => ({
  cancelSubscription: jest.fn(),
  getSubscriptionStatus: jest.fn()
}));

describe("SubscriptionStatusScreen cancellation state", () => {
  it("shows Commercial paid-through access without a repeat cancel action", async () => {
    (getSubscriptionStatus as jest.Mock).mockResolvedValue({
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
});
