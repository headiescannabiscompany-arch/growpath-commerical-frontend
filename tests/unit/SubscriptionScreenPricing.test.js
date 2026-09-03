import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import SubscriptionScreen from "../../src/screens/SubscriptionScreen";
import { getSubscription, getSubscriptionSetupStatus } from "../../src/api/subscription";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  getSubscriptionSetupStatus: jest.fn()
}));

jest.mock("../../src/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("SubscriptionScreen pricing", () => {
  const navigation = {
    navigate: jest.fn(),
    setOptions: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getSubscription.mockResolvedValue({ status: "inactive", plan: "free" });
    getSubscriptionSetupStatus.mockResolvedValue({
      catalogReady: true,
      quotes: {
        pro: {
          monthly: {
            available: true,
            interval: "monthly",
            unitAmount: 1000,
            currency: "usd",
            formattedAmount: "$10"
          },
          yearly: {
            available: true,
            interval: "yearly",
            unitAmount: 10000,
            currency: "usd",
            formattedAmount: "$100"
          }
        }
      }
    });
  });

  it("uses shared Pro pricing and interval-neutral renewal copy", async () => {
    const screen = render(<SubscriptionScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText("Subscribe $10/month")).toBeTruthy());

    expect(screen.getByText("$10/month or $100/year")).toBeTruthy();
    expect(screen.getByText("Forum/Q&A Access")).toBeTruthy();
    expect(screen.queryByText("Community Access")).toBeNull();
    expect(screen.queryByText(/auto-renew monthly/i)).toBeNull();
    expect(screen.getByText(/auto-renew based on the billing interval/i)).toBeTruthy();
  });

  it("shows management without checkout for cancel-scheduled access", async () => {
    getSubscription.mockResolvedValueOnce({
      status: "active",
      plan: "pro",
      source: "stripe",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: "2030-05-15T18:30:00.000Z"
    });
    const screen = render(<SubscriptionScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText("Manage Subscription")).toBeTruthy());
    expect(screen.queryByText("Subscribe $10/month")).toBeNull();
  });
});
