import React from "react";
import { render } from "@testing-library/react-native";

import FacilityMoreRoute from "@/app/home/facility/(tabs)/more";

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ children, header }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: "VIEWER" })
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      surface: "#151D27",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      accent: "#78AAFF"
    }
  })
}));

describe("FacilityMoreRoute", () => {
  it("uses viewer-safe descriptions for restricted Facility actions", () => {
    const screen = render(<FacilityMoreRoute />);

    expect(
      screen.getByText("View facility members and their access roles.")
    ).toBeTruthy();
    expect(screen.getByText("Review facility inventory and lot records.")).toBeTruthy();
    expect(
      screen.queryByText("Invite members, manage roles, and assign work.")
    ).toBeNull();
    expect(
      screen.getByRole("header", { name: "More Facility Workspaces" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "Facility operations" }).props["aria-level"]
    ).toBe(2);
    expect(screen.getByRole("header", { name: "Dashboard" }).props["aria-level"]).toBe(3);
    expect(
      screen.getByRole("header", { name: "Switch workspace" }).props["aria-level"]
    ).toBe(3);
    expect(screen.getByLabelText("Open Discover")).toBeTruthy();
    expect(
      screen.getByText(
        "Browse public videos, courses, storefronts, and shared field findings."
      )
    ).toBeTruthy();
  });
});
