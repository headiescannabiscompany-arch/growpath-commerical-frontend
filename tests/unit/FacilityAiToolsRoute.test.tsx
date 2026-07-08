import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAiToolsRoute from "@/app/home/facility/(tabs)/ai-tools";

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Link: ({ children, href, accessibilityLabel }: any) =>
      React.createElement(
        Text,
        { accessibilityLabel, href },
        children
      ),
    useLocalSearchParams: () => ({ toolRunId: "toolrun-1" })
  };
});

describe("FacilityAiToolsRoute", () => {
  it("shows the linked ToolRun or recipe context from source links", () => {
    const screen = render(<FacilityAiToolsRoute />);

    expect(screen.getByText("AI Tools")).toBeTruthy();
    expect(screen.getByLabelText("Linked facility tool run toolrun-1")).toBeTruthy();
    expect(screen.getByText("toolrun-1")).toBeTruthy();
  });
});
