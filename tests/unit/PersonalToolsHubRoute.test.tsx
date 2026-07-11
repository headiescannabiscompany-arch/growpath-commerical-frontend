import React from "react";
import { render } from "@testing-library/react-native";

import ToolsHubScreen from "@/app/home/personal/(tabs)/tools";

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(View, { accessibilityLabel: `link-${String(href)}` }, children),
    useLocalSearchParams: () => ({})
  };
});

jest.mock("@/components/feed/FeedBanner", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { accessibilityLabel: "feed-banner" });
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    can: () => true,
    mode: "personal",
    plan: "pro"
  })
}));

describe("personal tools hub", () => {
  it("shows a direct Ask AI entry point from Tools", () => {
    const screen = render(<ToolsHubScreen />);

    expect(screen.getByLabelText("Open personal Ask AI")).toBeTruthy();
    expect(screen.getAllByLabelText("link-/home/personal/ai").length).toBeGreaterThan(0);
    expect(screen.getByText("Start Here")).toBeTruthy();
    expect(screen.getByText("Recipe Builder")).toBeTruthy();
    expect(screen.getByText("Environment Monitor")).toBeTruthy();
    expect(screen.queryByText("Bud Rot Risk")).toBeNull();
  });
});
