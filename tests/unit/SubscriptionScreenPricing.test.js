import React from "react";
import { render } from "@testing-library/react-native";

import { PRO_PLAN_PRICE_DISPLAY } from "../../src/constants/pricing";
import SubscriptionScreen from "../../src/screens/SubscriptionScreen";

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn()
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
  });

  it("uses shared Pro pricing and interval-neutral renewal copy", () => {
    const screen = render(<SubscriptionScreen navigation={navigation} />);

    expect(screen.getByText(PRO_PLAN_PRICE_DISPLAY)).toBeTruthy();
    expect(screen.getByText("Forum/Q&A Access")).toBeTruthy();
    expect(screen.queryByText("Community Access")).toBeNull();
    expect(screen.queryByText(/auto-renew monthly/i)).toBeNull();
    expect(screen.getByText(/auto-renew based on the billing interval/i)).toBeTruthy();
  });
});
