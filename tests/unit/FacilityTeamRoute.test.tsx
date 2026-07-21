import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTeamTab from "@/app/home/facility/(tabs)/team";

const mockInvite = jest.fn();
const mockCan = jest.fn();
const mockListTeamMembers = jest.fn();
const mockPush = jest.fn();
let mockFacilityRole = "OWNER";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TEAM_INVITE: "TEAM_INVITE" },
  useEntitlements: () => ({ facilityRole: mockFacilityRole, can: mockCan })
}));
jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockListTeamMembers(...args),
  inviteTeamMember: (...args: any[]) => mockInvite(...args)
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack ? React.createElement(Text, null, `Back ${backFallbackHref}`) : null,
        children
      )
  };
});

describe("FacilityTeamTab", () => {
  beforeEach(() => {
    mockFacilityRole = "OWNER";
    mockCan.mockImplementation((capability) => capability === "TASKS_WRITE");
    mockInvite.mockReset();
    mockListTeamMembers.mockReset();
    mockListTeamMembers.mockResolvedValue([]);
    mockPush.mockReset();
  });

  it("lets an owner enter an invite email and provides a dashboard back route", async () => {
    mockInvite.mockResolvedValue({});
    const screen = render(<FacilityTeamTab />);

    expect(screen.getByText("Back /home/facility/dashboard")).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText("Invite team member email"),
      "staff@example.com"
    );
    expect(screen.getByDisplayValue("staff@example.com")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Send team invite"));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith("facility-1", {
        email: "staff@example.com",
        role: "STAFF"
      })
    );
  });

  it("shows managers a clear read-and-assign surface without owner invite controls", async () => {
    mockFacilityRole = "MANAGER";
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex Grower", role: "STAFF" }
    ]);

    const screen = render(<FacilityTeamTab />);

    await waitFor(() => expect(screen.getByText("Team access")).toBeTruthy());
    expect(
      screen.getByText(
        "You can view the team and assign work. Only the facility owner can invite members or change access roles."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Invite team member email")).toBeNull();
    expect(screen.queryByLabelText("Send team invite")).toBeNull();
    expect(screen.getByLabelText("Assign task to Alex Grower")).toBeTruthy();
  });

  it("keeps the Viewer team list read-only without unusable assignment controls", async () => {
    mockFacilityRole = "VIEWER";
    mockCan.mockReturnValue(false);
    mockListTeamMembers.mockResolvedValue([
      { userId: "staff-1", name: "Alex Grower", role: "STAFF" }
    ]);

    const screen = render(<FacilityTeamTab />);

    await waitFor(() => expect(screen.getByText("Alex Grower")).toBeTruthy());
    expect(
      screen.getByText(
        "You can view the team. Only owners and managers can assign work, and only the facility owner can manage access roles."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Assign task to Alex Grower")).toBeNull();
    expect(screen.queryByLabelText("Invite team member email")).toBeNull();
  });
});
