import React from "react";
import { render } from "@testing-library/react-native";

import ToolsRootRoute from "@/app/tools";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: any) =>
      React.createElement(Text, { accessibilityLabel: `Redirect ${href}` }, href)
  };
});

describe("ToolsRootRoute", () => {
  it("redirects the old root tools shell to the connected personal tools hub", () => {
    const screen = render(<ToolsRootRoute />);

    expect(screen.getByLabelText("Redirect /home/personal/tools")).toBeTruthy();
    expect(screen.queryByText(/tools hub shell/i)).toBeNull();
  });
});
