import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityTeamTab from "@/app/home/facility/(tabs)/team";

const mockInvite = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TEAM_INVITE: "TEAM_INVITE" },
  useEntitlements: () => ({ facilityRole: "OWNER", can: () => true })
}));
jest.mock("@/api/team", () => ({
  listTeamMembers: jest.fn().mockResolvedValue([]),
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
});
