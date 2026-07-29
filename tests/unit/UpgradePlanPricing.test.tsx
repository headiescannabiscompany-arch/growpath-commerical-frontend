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
    (getSubscriptionSetupStatus as jest.Mock).mockResolvedValue({ mode: "test" });
  });

  it("uses shared plan prices and sends the selected yearly interval to checkout", async () => {
    const screen = render(<UpgradePlan />);

    await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());
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

  it("supports gift checkout with recipient email and custom return URLs", async () => {
    const previousWindow = global.window;
    global.window = { location: { origin: "https://app.example" } } as any;

    try {
      const screen = render(<UpgradePlan />);
      await waitFor(() => expect(getSubscriptionSetupStatus).toHaveBeenCalled());

      fireEvent.press(screen.getByLabelText("Gift subscription mode"));
      fireEvent.changeText(
        screen.getByLabelText("Gift recipient email"),
        "friend@example.com"
      );
      fireEvent.changeText(screen.getByLabelText("Gift recipient name"), "Friend Name");
      fireEvent.changeText(screen.getByLabelText("Gift message"), "Happy growing!");
      fireEvent.press(screen.getByLabelText("Gift Pro Grower checkout"));

      await waitFor(() =>
        expect(createCheckoutSession).toHaveBeenCalledWith({
          plan: "pro",
          interval: "monthly",
          giftMode: true,
          giftRecipientEmail: "friend@example.com",
          giftRecipientName: "Friend Name",
          giftMessage: "Happy growing!",
          giftTerm: "monthly",
          successUrl: "https://app.example/home/personal/upgrade?gift=success",
          cancelUrl: "https://app.example/home/personal/upgrade?gift=canceled"
        })
      );
      expect(openExternalUrl).toHaveBeenCalledWith(
        "https://checkout.example.com/session"
      );
    } finally {
      global.window = previousWindow;
    }
  });
});
