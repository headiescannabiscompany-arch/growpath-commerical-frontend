import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ModeSwitcher } from "@/components/ModeSwitcher";

const mockPush = jest.fn();
const mockSwitchTo = jest.fn();
const mockUseEntitlements = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth()
}));

jest.mock("@/features/mode/useModeSwitcher", () => ({
  useModeSwitcher: () => ({ mode: "personal", switchTo: mockSwitchTo })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_HOME: "COMMERCIAL_HOME",
    FACILITY_ACCESS: "FACILITY_ACCESS"
  },
  useEntitlements: () => mockUseEntitlements()
}));

describe("ModeSwitcher", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSwitchTo.mockReset();
    mockUseEntitlements.mockReset();
    mockUseAuth.mockReturnValue({
      user: { email: "owner@growpathai.com", name: "GrowPath Owner", role: "user" }
    });
  });

  it("shows current identity and workspace boundaries", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: () => false,
      facilityId: null,
      facilityRole: null
    });

    const screen = render(<ModeSwitcher />);

    expect(screen.getByText("GrowPath Owner")).toBeTruthy();
    expect(screen.getByText("Acting in Personal workspace mode")).toBeTruthy();
    expect(screen.getByText("Continue as Personal")).toBeTruthy();
    expect(screen.getByText("Create Commercial Account")).toBeTruthy();
    expect(screen.getByText("Create Facility Account")).toBeTruthy();
    expect(
      screen.getByText(/Feed\/Campaigns, orders, analytics, and Stripe/i)
    ).toBeTruthy();
    expect(screen.getByText(/Rooms, operational runs, tasks, staff/i)).toBeTruthy();
    expect(
      screen.getByLabelText("Open Personal: Continue as Personal").props
        .accessibilityState
    ).toEqual({ checked: true });
    expect(
      screen.getByLabelText("Continue as Personal").props.accessibilityState
    ).toEqual({
      selected: true
    });
  });

  it("keeps workspace selectors and cards large enough to operate by touch", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: () => false,
      facilityId: null,
      facilityRole: null
    });

    const screen = render(<ModeSwitcher />);

    expect(
      screen.getByLabelText("Open Personal: Continue as Personal").props.style
    ).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 44 })]));
    expect(screen.getByLabelText("Continue as Personal").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 44 })])
    );
  });

  it("opens setup instead of switching to unavailable commercial or facility modes", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: () => false,
      facilityId: null,
      facilityRole: null
    });

    const screen = render(<ModeSwitcher />);

    fireEvent.press(screen.getByLabelText("Create Commercial Account"));
    fireEvent.press(screen.getByLabelText("Create Facility Account"));

    expect(mockSwitchTo).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenNthCalledWith(1, "/offers");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/offers");
  });

  it("shows only workspaces the signed-in identity can actually enter at login", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: (capability: string) => capability === "FACILITY_ACCESS",
      facilityId: "facility-1",
      facilityRole: "STAFF"
    });

    const screen = render(<ModeSwitcher availableOnly />);

    expect(screen.getByText("Continue as Personal")).toBeTruthy();
    expect(screen.getByText("Manage Facility")).toBeTruthy();
    expect(screen.queryByText("Create Commercial Account")).toBeNull();
  });

  it("switches directly to commercial and facility when access exists", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "commercial",
      can: (capability: string) =>
        capability === "COMMERCIAL_HOME" || capability === "FACILITY_ACCESS",
      facilityId: "facility-1",
      facilityRole: "OWNER"
    });

    const screen = render(<ModeSwitcher />);

    fireEvent.press(screen.getByLabelText("Manage Commercial Brand"));
    fireEvent.press(screen.getByLabelText("Manage Facility"));

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSwitchTo).toHaveBeenCalledWith("commercial");
    expect(mockSwitchTo).toHaveBeenCalledWith("facility");
  });

  it("gives platform administrators a direct governance destination", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "admin@growpathai.com", name: "GrowPath Admin", role: "ADMIN" }
    });
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: () => false,
      facilityId: null,
      facilityRole: null
    });

    const screen = render(<ModeSwitcher availableOnly />);

    fireEvent.press(screen.getByLabelText("Platform Administration"));
    expect(screen.getByText("Open Admin Tools")).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith("/admin");
    expect(mockSwitchTo).not.toHaveBeenCalled();
  });

  it("does not expose platform administration to ordinary accounts", () => {
    mockUseEntitlements.mockReturnValue({
      mode: "personal",
      can: () => false,
      facilityId: null,
      facilityRole: null
    });

    const screen = render(<ModeSwitcher />);

    expect(screen.queryByLabelText("Platform Administration")).toBeNull();
  });
});
