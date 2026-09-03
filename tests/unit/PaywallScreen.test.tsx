import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PaywallScreen from "@/screens/PaywallScreen";
import { getSubscription, getSubscriptionSetupStatus } from "@/api/subscription";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "token-1" })
}));

jest.mock("@/api/subscribe", () => ({
  startSubscription: jest.fn()
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  getSubscriptionSetupStatus: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("PaywallScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSubscription as jest.Mock).mockResolvedValue({
      status: "inactive",
      plan: "free"
    });
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      catalogReady: true,
      quotes: {
        pro: {
          monthly: {
            available: true,
            interval: "monthly",
            unitAmount: 1000,
            currency: "usd",
            formattedAmount: "$10"
          }
        }
      }
    });
  });

  it("keeps pro benefits aligned with storefront discovery and pricing navigation", async () => {
    const navigate = jest.fn();
    const screen = render(<PaywallScreen navigation={{ navigate, goBack: jest.fn() }} />);

    expect(screen.getByText("Grow templates and storefront discovery")).toBeTruthy();
    expect(screen.queryByText("Grow Templates and Storefront Offers")).toBeNull();

    await waitFor(() => expect(screen.getByText("View Plans & Pricing")).toBeTruthy());
    fireEvent.press(screen.getByText("View Plans & Pricing"));

    expect(navigate).toHaveBeenCalledWith("PricingMatrix");
  });

  it("shows status instead of trial or subscribe controls for active admin access", async () => {
    (getSubscription as jest.Mock).mockResolvedValueOnce({
      status: "active",
      plan: "pro",
      source: "admin",
      stripeSubscriptionId: "stale-stripe-id"
    });
    const screen = render(
      <PaywallScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
    );

    await waitFor(() =>
      expect(screen.getByText("View Subscription Status")).toBeTruthy()
    );
    expect(screen.queryByText("Start Free Trial in Stripe")).toBeNull();
    expect(screen.queryByText(/Subscribe Now/)).toBeNull();
  });
});
