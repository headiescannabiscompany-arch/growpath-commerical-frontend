import React from "react";
import { render } from "@testing-library/react-native";

import ToolsHubScreen from "@/app/home/personal/(tabs)/tools";

const mockCan = jest.fn();
let mockPlan = "pro";
let mockSearchParams: Record<string, string> = {};
let mockGrowInterests: Record<string, string[]> = {};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "tools-user", growInterests: mockGrowInterests } })
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: jest.fn().mockResolvedValue([])
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(View, { accessibilityLabel: `link-${String(href)}` }, children),
    useLocalSearchParams: () => mockSearchParams
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
  return () => React.createElement(Text, null, "AI Credits 10 / 10");
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
    mockSearchParams = {};
    mockGrowInterests = {};
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "" }
    });
  });

  it("removes cannabis-focused workflows for a fruit-tree grower", () => {
    mockGrowInterests = {
      crops: ["Fruit Trees & Bushes"],
      environment: ["Outdoor"],
      methods: ["Organic (Amended Soil)"]
    };

    const screen = render(<ToolsHubScreen />);

    expect(screen.getByText(/Fruit Trees & Bushes/)).toBeTruthy();
    expect(screen.getByText("Watering Planner")).toBeTruthy();
    expect(screen.getByText("IPM Scout / Pest & Organism Tool")).toBeTruthy();
    expect(screen.queryByText("Pheno Hunting")).toBeNull();
    expect(screen.queryByText("Dry / Cure Guard")).toBeNull();
  });

  it("shows a direct Ask AI entry point from Tools", () => {
    const screen = render(<ToolsHubScreen />);

    expect(screen.getByLabelText("Open personal Ask AI")).toBeTruthy();
    expect(screen.getAllByLabelText("link-/home/personal/ai").length).toBeGreaterThan(0);
    expect(screen.getByText("Start Here")).toBeTruthy();
    expect(screen.getByText("Recipe Builder")).toBeTruthy();
    expect(screen.getByText("Environment Monitor")).toBeTruthy();
    expect(screen.getByText("Tissue Culture")).toBeTruthy();
    expect(screen.getByText("Lab / Tissue Culture")).toBeTruthy();
    expect(screen.queryByText("Bud Rot Risk")).toBeNull();
  });

  it("keeps Ask AI and Plant Diagnose open for free users with token limits", () => {
    mockPlan = "free";
    mockCan.mockReturnValue(false);

    const screen = render(<ToolsHubScreen />);

    expect(screen.getByText(/limited weekly AI-credit allowance/)).toBeTruthy();
    expect(screen.getByText("AI Credits 10 / 10")).toBeTruthy();
    expect(screen.getAllByText("Ask AI").length).toBeGreaterThan(0);
    expect(screen.getByText("Plant Issue Diagnosis")).toBeTruthy();
    expect(screen.getByText("Tissue Culture")).toBeTruthy();
    expect(screen.getAllByText("Open").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryAllByText("Upgrade to unlock").length).toBeGreaterThan(0);
  });

  it("unlocks the paid tools hub with the dev plan query override", () => {
    mockPlan = "free";
    mockCan.mockReturnValue(false);
    mockSearchParams = { devPlan: "pro" };
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "localhost", search: "?paid=1" }
    });

    const screen = render(<ToolsHubScreen />);

    expect(screen.getByText(/AI-credit balance and usage/)).toBeTruthy();
    expect(screen.getByText("Tissue Culture")).toBeTruthy();
    expect(screen.queryAllByText("Upgrade to unlock")).toHaveLength(0);
  });
});
