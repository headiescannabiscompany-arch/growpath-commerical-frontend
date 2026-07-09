import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PaywallScreen from "@/screens/PaywallScreen";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: "token-1" })
}));

jest.mock("@/api/subscribe", () => ({
  startSubscription: jest.fn()
}));

jest.mock("@/api/subscription", () => ({
  createCheckoutSession: jest.fn()
}));

jest.mock("@/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("PaywallScreen", () => {
  it("keeps pro benefits aligned with storefront discovery and pricing navigation", () => {
    const navigate = jest.fn();
    const screen = render(<PaywallScreen navigation={{ navigate, goBack: jest.fn() }} />);

    expect(screen.getByText("Grow templates and storefront discovery")).toBeTruthy();
    expect(screen.queryByText("Grow Templates and Storefront Offers")).toBeNull();

    fireEvent.press(screen.getByText("View Plans & Pricing"));

    expect(navigate).toHaveBeenCalledWith("PricingMatrix");
  });
});
