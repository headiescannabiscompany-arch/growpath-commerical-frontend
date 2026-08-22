import React from "react";
import { render } from "@testing-library/react-native";

import FacilityMoreRoute from "@/app/home/facility/(tabs)/more";

let mockFacilityRole = "VIEWER";
const mockCan = jest.fn(() => false);

jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) => {
    const React = require("react");
    return React.cloneElement(React.Children.only(children), { href });
  }
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
  CAPABILITY_KEYS: { BUSINESS_DESK_READ: "business_desk_read" },
  useEntitlements: () => ({ facilityRole: mockFacilityRole, can: mockCan })
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
  beforeEach(() => {
    mockFacilityRole = "VIEWER";
    mockCan.mockReset();
    mockCan.mockReturnValue(false);
  });

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
    expect(screen.queryByLabelText("Open Business Desk")).toBeNull();
  });

  it.each(["OWNER", "MANAGER"])(
    "shows Business Desk to an eligible Facility %s",
    (role) => {
      mockFacilityRole = role;
      mockCan.mockReturnValue(true);

      const screen = render(<FacilityMoreRoute />);

      expect(screen.getByLabelText("Open Business Desk")).toBeTruthy();
      expect(screen.getByLabelText("Open Business Desk").props.href).toBe(
        "/home/facility/business-desk"
      );
    }
  );

  it.each(["STAFF", "VIEWER", "QA"])(
    "hides Business Desk from Facility %s even if a stale capability says yes",
    (role) => {
      mockFacilityRole = role;
      mockCan.mockReturnValue(true);

      const screen = render(<FacilityMoreRoute />);

      expect(screen.queryByLabelText("Open Business Desk")).toBeNull();
    }
  );

  it("hides Business Desk when an eligible role lacks the live capability", () => {
    mockFacilityRole = "OWNER";
    mockCan.mockReturnValue(false);

    const screen = render(<FacilityMoreRoute />);

    expect(screen.queryByLabelText("Open Business Desk")).toBeNull();
  });
});
