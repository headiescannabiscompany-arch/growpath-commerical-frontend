import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AcceptFacilityInviteScreen from "@/app/accept-facility-invite";

const mockApiRequest = jest.fn();
const mockLogin = jest.fn();
const mockReplace = jest.fn();
const mockSelectFacility = jest.fn();
const mockSetMode = jest.fn();
const mockSetPreferredMode = jest.fn();
const mockRouter = { replace: mockReplace };

let mockAuthState: any;
let mockEntitlementsState: any;

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlementsState
}));

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => ({
    selectFacility: (...args: any[]) => mockSelectFacility(...args)
  })
}));

jest.mock("@/state/useAccountMode", () => ({
  useAccountMode: () => ({
    setMode: (...args: any[]) => mockSetMode(...args)
  })
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ token: "invite-token" }),
  useRouter: () => mockRouter
}));

describe("AcceptFacilityInviteScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      login: (...args: any[]) => mockLogin(...args),
      meStatus: "ready"
    };
    mockEntitlementsState = {
      ready: true,
      mode: "personal",
      facilityId: null,
      setPreferredMode: (...args: any[]) => mockSetPreferredMode(...args)
    };
    mockApiRequest.mockResolvedValue({
      accepted: true,
      email: "member@example.com",
      facilityId: "facility-1",
      facilityName: "Test Facility",
      facilityRole: "STAFF"
    });
    mockLogin.mockResolvedValue(undefined);
    mockSetPreferredMode.mockResolvedValue(undefined);
  });

  it("selects Facility mode and waits for the refreshed canonical session before routing", async () => {
    const screen = render(<AcceptFacilityInviteScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Password (8+ characters)"),
      "password123"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Confirm password"), "password123");
    fireEvent.press(screen.getByText("Accept invitation and sign in"));

    await waitFor(() => {
      expect(mockSetPreferredMode).toHaveBeenCalledWith("facility");
      expect(mockSetMode).toHaveBeenCalledWith("facility");
      expect(mockSelectFacility).toHaveBeenCalledWith({
        id: "facility-1",
        name: "Test Facility"
      });
      expect(mockLogin).toHaveBeenCalledWith("member@example.com", "password123");
      expect(screen.getByText(/Invitation accepted/)).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();

    mockEntitlementsState = {
      ...mockEntitlementsState,
      mode: "facility",
      facilityId: "facility-1"
    };
    screen.rerender(<AcceptFacilityInviteScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home/facility");
    });
  }, 15_000);
});
