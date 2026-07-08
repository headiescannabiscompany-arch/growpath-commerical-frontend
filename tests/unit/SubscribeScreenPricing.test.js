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
});
