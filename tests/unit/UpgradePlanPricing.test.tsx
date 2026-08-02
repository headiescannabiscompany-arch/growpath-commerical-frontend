import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  createCheckoutSession,
  getSubscriptionSetupStatus
} from "../../src/api/subscription";
import UpgradePlan from "../../src/features/billing/screens/UpgradePlan";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams
}));

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscriptionSetupStatus: jest.fn()
}));

jest.mock("../../src/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("UpgradePlan pricing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    (createCheckoutSession as jest.Mock).mockResolvedValue({
      url: "https://checkout.example.com/session"
    });
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({
      mode: "test",
      giftCheckoutConfigured: false
    });
  });

  it("uses shared plan prices and sends the selected yearly interval to checkout", async () => {
    const screen = render(<UpgradePlan />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());
    expect(
      screen.getByText(
        "Compare the cards below. Each one explains who it is for, what it unlocks, and what Stripe does next when you continue."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Solo growers and personal accounts that want AI guidance, diagnosis, planning, exports, and saved run history without storefront or facility admin overhead."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Best for one grower managing a personal grow or a small private set of plants\./
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Stripe opens with Commercial selected and the chosen monthly or yearly interval. Payment is collected there."
      )
    ).toBeTruthy();
    expect(screen.getByText("Checkout $10/month")).toBeTruthy();
    expect(screen.getByText("Checkout $50/month")).toBeTruthy();
    expect(screen.getByText("Checkout $100/month")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Yearly billing"));
    expect(
      screen.getByText("Billed once yearly. Equivalent to $41.67/month.")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Choose Commercial yearly checkout"));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "yearly"
      })
    );
    expect(openExternalUrl).toHaveBeenCalledWith("https://checkout.example.com/session");
  });

  it("blocks gift checkout until recipient fulfillment is configured", async () => {
    const screen = render(<UpgradePlan />);
    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

    expect(screen.getByLabelText("Gift subscriptions unavailable")).toBeDisabled();
    expect(
      screen.getByText(
        "Gift checkout is not available yet because recipient fulfillment and claim delivery are not configured. No gift payment can be started."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Gift recipient email")).toBeNull();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("does not treat a gift query parameter as checkout confirmation", async () => {
    mockSearchParams = { gift: "success" };
    const screen = render(<UpgradePlan />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());
    expect(screen.queryByText(/Gift checkout completed/)).toBeNull();
    expect(screen.queryByText(/prepaid Pro gift will be delivered/)).toBeNull();
  });

  it("limits configured gifts to prepaid Pro and sends interval instead of giftTerm", async () => {
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValueOnce({
      mode: "test",
      giftCheckoutConfigured: true
    });
    (createCheckoutSession as jest.Mock).mockResolvedValueOnce({});
    const screen = render(<UpgradePlan />);

    await waitFor(() =>
      expect(screen.getByLabelText("Gift subscription mode")).toBeEnabled()
    );
    fireEvent.press(screen.getByLabelText("Gift subscription mode"));

    expect(screen.getByText("Prepaid Pro gift")).toBeTruthy();
    expect(screen.queryByLabelText("Gift Commercial checkout")).toBeNull();
    expect(screen.queryByLabelText("Gift Facility checkout")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Gift recipient email"),
      "Friend@Example.com"
    );
    fireEvent.press(screen.getByLabelText("One year of prepaid access"));
    fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

    await waitFor(() => expect(createCheckoutSession).toHaveBeenCalledTimes(1));
    const request = (createCheckoutSession as jest.Mock).mock.calls[0][0];
    expect(request).toEqual(
      expect.objectContaining({
        plan: "pro",
        interval: "yearly",
        giftMode: true,
        giftRecipientEmail: "friend@example.com",
        successUrl: expect.not.stringContaining("gift="),
        cancelUrl: expect.not.stringContaining("gift=")
      })
    );
    expect(request).not.toHaveProperty("giftTerm");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
