import React from "react";
import { render } from "@testing-library/react-native";

import DashboardScreen from "@/screens/DashboardScreen";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn()
  })
}));

jest.mock("@/components/AppShell.js", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ placement }: { placement: string }) => (
    <Text>{`Campaign placement ${placement}`}</Text>
  );
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    DASHBOARD_ANALYTICS: "dashboard_analytics",
    DASHBOARD_EXPORT: "dashboard_export"
  },
  useEntitlements: () => ({
    can: (key: string) => key === "dashboard_analytics"
  })
}));

jest.mock("@/theme/theme.js", () => ({
  colors: {
    accent: "#0F766E",
    card: "#FFFFFF",
    text: "#0F172A",
    textSoft: "#475569"
  },
  radius: {
    card: 8
  },
  spacing: (value: number) => value * 4
}));

describe("DashboardScreen feed policy", () => {
  it("uses campaign placements and sends discussion to Forum/Q&A", () => {
    const screen = render(<DashboardScreen />);

    expect(screen.getByText("Grower Dashboard")).toBeTruthy();
    expect(screen.getByText(/Feed placements here are promotional campaigns/)).toBeTruthy();
    expect(screen.getByText("Forum / Q&A")).toBeTruthy();
    expect(screen.getByText("Campaign placement top")).toBeTruthy();
    expect(screen.getByText("Campaign placement middle")).toBeTruthy();
    expect(screen.getByText("Campaign placement bottom")).toBeTruthy();
    expect(screen.queryByText("Latest Updates")).toBeNull();
  });
});
