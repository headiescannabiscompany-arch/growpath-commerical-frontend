import React from "react";
import { render } from "@testing-library/react-native";

import StorefrontScreen from "@/screens/StorefrontScreen";

jest.mock("@/screens/commercial/StorefrontOwnerScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    __esModule: true,
    default: () =>
      React.createElement(
        Text,
        { accessibilityLabel: "Canonical commercial storefront owner screen" },
        "Storefront owner workspace"
      )
  };
});

describe("StorefrontScreen", () => {
  it("delegates legacy storefront imports to the canonical commercial storefront workspace", () => {
    const screen = render(<StorefrontScreen />);

    expect(
      screen.getByLabelText("Canonical commercial storefront owner screen")
    ).toBeTruthy();
    expect(screen.queryByText("Save storefront")).toBeNull();
    expect(screen.queryByText("External purchase URL")).toBeNull();
  });
});
