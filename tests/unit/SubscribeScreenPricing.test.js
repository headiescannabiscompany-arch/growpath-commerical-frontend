import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";

import {
  createCheckoutSession,
  getSubscription,
  getSubscriptionSetupStatus
} from "../../src/api/subscription";
import SubscribeScreen from "../../src/screens/SubscribeScreen";
import { buySubscription, initIAP } from "../../src/utils/iap";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  getSubscriptionSetupStatus: jest.fn(),
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
    jest.clearAllMocks();
    getSubscription.mockResolvedValue({ status: "inactive" });
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

  it("uses the shared Pro pricing display", async () => {
    const screen = render(<SubscribeScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText("$10/month or $100/year")).toBeTruthy();
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

  it("uses the existing browser checkout on native instead of the disabled IAP adapter", async () => {
    const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, "OS");
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    createCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/test-session"
    });
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);

    try {
      const screen = render(<SubscribeScreen navigation={{ navigate: jest.fn() }} />);
      await waitFor(() =>
        expect(screen.getByText("Unlock Premium — $10/month")).toBeTruthy()
      );

      fireEvent.press(screen.getByText("Unlock Premium — $10/month"));

      await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
      expect(openExternalUrl).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/test-session"
      );
      expect(initIAP).not.toHaveBeenCalled();
      expect(buySubscription).not.toHaveBeenCalled();
    } finally {
      if (platformDescriptor) Object.defineProperty(Platform, "OS", platformDescriptor);
    }
  });
});
