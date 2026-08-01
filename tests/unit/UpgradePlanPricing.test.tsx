import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  createCheckoutSession,
  getSubscriptionSetupStatus
} from "../../src/api/subscription";
import UpgradePlan from "../../src/features/billing/screens/UpgradePlan";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

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
});
