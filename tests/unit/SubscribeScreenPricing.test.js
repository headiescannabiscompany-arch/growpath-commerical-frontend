import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { getSubscription } from "../../src/api/subscription";
import { PRO_PLAN_PRICE_DISPLAY } from "../../src/constants/pricing";
import SubscribeScreen from "../../src/screens/SubscribeScreen";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  verifyIapReceipt: jest.fn()
}));

jest.mock("../../src/utils/iap", () => ({
  buySubscription: jest.fn(),
  initIAP: jest.fn()
}));

jest.mock("../../src/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("SubscribeScreen pricing", () => {
  beforeEach(() => {
    getSubscription.mockResolvedValue({ status: "inactive" });
  });

  it("uses the shared Pro pricing display", async () => {
    const screen = render(<SubscribeScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText(PRO_PLAN_PRICE_DISPLAY)).toBeTruthy();
    });

    expect(screen.queryByText("$9.99 / month")).toBeNull();
    expect(screen.getByText("Growers Forum/Q&A access")).toBeTruthy();
    expect(screen.queryByText("Growers Forum access and community")).toBeNull();
  });

  it("keeps trialing IAP access out of every purchase path", async () => {
    getSubscription.mockResolvedValueOnce({
      status: "trialing",
      plan: "pro",
      source: "iap",
      managementUrl: "https://apps.apple.com/account/subscriptions"
    });
    const screen = render(<SubscribeScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() =>
      expect(screen.getByText("Subscription confirmed by backend")).toBeTruthy()
    );
    expect(screen.queryByText("Unlock Premium")).toBeNull();
    expect(screen.queryByText("View Plans & Pricing")).toBeNull();
    expect(screen.getByText("Open Provider Subscription Management")).toBeTruthy();
  });
});
