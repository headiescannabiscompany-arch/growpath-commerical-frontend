import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import SearchScreen from "@/screens/SearchScreen";

let mockSearchEnabled = true;

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SEARCH: "search" },
  useEntitlements: () => ({
    can: () => mockSearchEnabled
  })
}));

jest.mock("@/components/AppShell.js", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("SearchScreen", () => {
  beforeEach(() => {
    mockSearchEnabled = true;
  });

  it("routes storefront discovery to Storefront instead of pricing", () => {
    const navigate = jest.fn();
    const screen = render(<SearchScreen navigation={{ navigate }} />);

    expect(
      screen.getByText(
        "Find storefronts, Feed / Campaigns, courses, Forum/Q&A, and grow records."
      )
    ).toBeTruthy();
    expect(screen.getByText("Storefront")).toBeTruthy();
    expect(
      screen.getByText("Public brand storefronts, products, courses, lives, and offers")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open Storefront"));
    fireEvent.press(screen.getByLabelText("Open Feed / Campaigns"));
    fireEvent.press(screen.getByLabelText("Open Forum"));

    expect(navigate).toHaveBeenCalledWith("Storefront");
    expect(navigate).toHaveBeenCalledWith("Feed");
    expect(navigate).toHaveBeenCalledWith("Forum");
    expect(navigate).not.toHaveBeenCalledWith("PricingMatrix");
  });

  it("keeps locked search routed to subscription", () => {
    mockSearchEnabled = false;
    const navigate = jest.fn();
    const screen = render(<SearchScreen navigation={{ navigate }} />);

    fireEvent.press(screen.getByLabelText("Upgrade to unlock search"));
    fireEvent.press(screen.getByLabelText("Open Storefront"));

    expect(navigate).toHaveBeenCalledWith("Subscription");
    expect(navigate).not.toHaveBeenCalledWith("Storefront");
  });
});
