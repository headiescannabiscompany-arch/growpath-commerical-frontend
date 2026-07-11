import React from "react";
import { render } from "@testing-library/react-native";

import ToolsHubScreen from "@/app/home/personal/(tabs)/tools";

const mockCan = jest.fn();
let mockPlan = "pro";

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

jest.mock("@/components/TokenBalanceWidget", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "AI Tokens 10 / 10");
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    can: mockCan,
    mode: "personal",
    plan: mockPlan
  })
}));

describe("personal tools hub", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockPlan = "pro";
  });

  it("shows a direct Ask AI entry point from Tools", () => {
    const screen = render(<ToolsHubScreen />);

    expect(screen.getByLabelText("Open personal Ask AI")).toBeTruthy();
    expect(screen.getAllByLabelText("link-/home/personal/ai").length).toBeGreaterThan(0);
    expect(screen.getByText("Start Here")).toBeTruthy();
    expect(screen.getByText("Recipe Builder")).toBeTruthy();
    expect(screen.getByText("Environment Monitor")).toBeTruthy();
    expect(screen.queryByText("Bud Rot Risk")).toBeNull();
  });

  it("keeps Ask AI and Plant Diagnose open for free users with token limits", () => {
    mockPlan = "free";
    mockCan.mockReturnValue(false);

    const screen = render(<ToolsHubScreen />);

    expect(screen.getByText(/limited AI tokens/)).toBeTruthy();
    expect(screen.getByText("AI Tokens 10 / 10")).toBeTruthy();
    expect(screen.getAllByText("Ask AI").length).toBeGreaterThan(0);
    expect(screen.getByText("Plant Issue Diagnosis")).toBeTruthy();
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryAllByText("Upgrade to unlock").length).toBeGreaterThan(0);
  });
});
