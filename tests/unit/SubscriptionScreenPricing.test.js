import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { PRO_PLAN_PRICE_DISPLAY } from "../../src/constants/pricing";
import SubscriptionScreen from "../../src/screens/SubscriptionScreen";
import { getSubscription } from "../../src/api/subscription";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn()
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
  });

  it("uses shared Pro pricing and interval-neutral renewal copy", async () => {
    const screen = render(<SubscriptionScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText("Subscribe Now")).toBeTruthy());

    expect(screen.getByText(PRO_PLAN_PRICE_DISPLAY)).toBeTruthy();
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
    expect(screen.queryByText("Subscribe Now")).toBeNull();
  });
});
