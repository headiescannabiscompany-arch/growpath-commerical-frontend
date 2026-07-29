import React from "react";
import { render } from "@testing-library/react-native";

import { LoginWorkspaceChoiceContent } from "@/app/account/workspace";
import {
  availableWorkspaceModes,
  workspaceHomeHref
} from "@/features/mode/workspaceOptions";

const mockUseEntitlements = jest.fn();

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_HOME: "COMMERCIAL_HOME",
    FACILITY_ACCESS: "FACILITY_ACCESS"
  },
  useEntitlements: () => mockUseEntitlements()
}));

jest.mock("@/components/ModeSwitcher", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ModeSwitcher: ({ availableOnly }: { availableOnly?: boolean }) => (
      <Text>{availableOnly ? "Available workspaces" : "All workspaces"}</Text>
    )
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => (
    <View>
      {header}
      {children}
    </View>
  );
});

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: { href: string }) => <Text>{`Redirect:${href}`}</Text>
  };
});

describe("login workspace choice", () => {
  beforeEach(() => {
    mockUseEntitlements.mockReset();
  });

  it("recognizes Personal and Facility as separate available workspaces", () => {
    expect(
      availableWorkspaceModes({
        mode: "facility",
        facilityId: "facility-1",
        facilityRole: "STAFF",
        can: () => false
      })
    ).toEqual(["personal", "facility"]);
  });

  it("sends a single-workspace account directly to Personal", () => {
    mockUseEntitlements.mockReturnValue({
      ready: true,
      mode: "personal",
      facilityId: null,
      selectedFacilityId: null,
      facilityRole: null,
      can: () => false
    });

    const screen = render(<LoginWorkspaceChoiceContent />);

    expect(screen.getByText("Redirect:/home/personal")).toBeTruthy();
    expect(screen.queryByText("Available workspaces")).toBeNull();
  });

  it("shows an explicit chooser when the login has Personal and Facility access", () => {
    mockUseEntitlements.mockReturnValue({
      ready: true,
      mode: "facility",
      facilityId: "facility-1",
      selectedFacilityId: "facility-1",
      facilityRole: "MANAGER",
      can: (capability: string) => capability === "FACILITY_ACCESS"
    });

    const screen = render(<LoginWorkspaceChoiceContent />);

    expect(screen.getByText("Choose where you are working")).toBeTruthy();
    expect(screen.getByText("Available workspaces")).toBeTruthy();
    expect(screen.queryByText("Redirect:/home/facility")).toBeNull();
  });

  it("uses Facility selection when no Facility is selected yet", () => {
    expect(workspaceHomeHref("facility", null)).toBe("/home/facility/select");
    expect(workspaceHomeHref("facility", "facility-1")).toBe("/home/facility");
  });
});
