import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { createCheckoutSession } from "../../src/api/subscription";
import {
  COMMERCIAL_PLAN_PRICE_DISPLAY,
  FACILITY_PLAN_PRICE_DISPLAY,
  PRO_PLAN_PRICE_DISPLAY
} from "../../src/constants/pricing";
import UpgradePlan from "../../src/features/billing/screens/UpgradePlan";
import { openExternalUrl } from "../../src/utils/openExternalUrl";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn()
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
  });

  it("uses shared plan prices and sends the selected yearly interval to checkout", async () => {
    const screen = render(<UpgradePlan />);

    expect(screen.getByText(PRO_PLAN_PRICE_DISPLAY)).toBeTruthy();
    expect(screen.getByText(COMMERCIAL_PLAN_PRICE_DISPLAY)).toBeTruthy();
    expect(screen.getByText(FACILITY_PLAN_PRICE_DISPLAY)).toBeTruthy();
    expect(
      screen.getByText("Annual: Billed once yearly. Equivalent to $41.67/month.")
    ).toBeTruthy();
    expect(
      screen.queryByText(/annual monthly-equivalent/i)
    ).toBeNull();

    fireEvent.press(screen.getByLabelText("Choose Commercial yearly"));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({
        plan: "commercial",
        interval: "yearly"
      })
    );
    expect(openExternalUrl).toHaveBeenCalledWith("https://checkout.example.com/session");
  });
});
