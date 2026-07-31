import React from "react";
import { render } from "@testing-library/react-native";

import FacilityMoreRoute from "@/app/home/facility/(tabs)/more";

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
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
  });
});
