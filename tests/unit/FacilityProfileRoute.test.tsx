import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityProfileRoute from "@/app/home/facility/(tabs)/profile";

const mockApiRequest = jest.fn();
const mockLogout = jest.fn();
const mockRetryMe = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockAuth = {
  user: {
    id: "facility-user-1",
    email: "facility@example.com",
    displayName: "Facility Lead"
  },
  logout: (...args: any[]) => mockLogout(...args),
  retryMe: (...args: any[]) => mockRetryMe(...args)
};
let mockFacilitySelection: {
  selectedId: string | null;
  selected?: Record<string, unknown>;
} = { selectedId: null };

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  usePathname: () => "/home/facility/profile"
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => mockFacilitySelection
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: "facility",
    mode: "facility",
    facilityId: "facility-1",
    facilityRole: "admin"
  })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({
    error: null,
    clearError: mockClearError,
    handleApiError: mockHandleApiError
  })
}));

describe("FacilityProfileRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockLogout.mockReset();
    mockRetryMe.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockClearError.mockReset();
    mockHandleApiError.mockReset();
    mockFacilitySelection = { selectedId: null };
    mockApiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/api/tokens/balance"
          ? { aiTokens: 100, maxTokens: 100, refreshCadence: "weekly" }
          : {}
      )
    );
  });

  it("shows workspace boundaries and opens account mode routes", async () => {
    const screen = render(<FacilityProfileRoute />);

    expect(screen.getByText("Facility workspace")).toBeTruthy();
    expect(screen.getByText("Operational facility identity")).toBeTruthy();
    expect(screen.getByLabelText("Parental content control PIN").props).toMatchObject({
      autoComplete: "one-time-code",
      textContentType: "oneTimeCode",
      importantForAutofill: "no"
    });

    fireEvent.press(screen.getByLabelText("Switch workspace mode"));
    fireEvent.press(screen.getByLabelText("Open account profile"));
    fireEvent.press(screen.getByLabelText("Manage facility plan and billing"));
    fireEvent.press(screen.getByLabelText("Log out"));

    expect(mockPush).toHaveBeenCalledWith("/account/mode");
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(mockPush).toHaveBeenCalledWith("/offers");
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Report Bug")).toBeNull();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/home/facility/select")
    );
  });

  it("shows the selected facility id when Viewer data has no facility record", async () => {
    mockFacilitySelection = { selectedId: "facility-1" };

    const screen = render(<FacilityProfileRoute />);

    await waitFor(() => expect(screen.getByText("Selected facility")).toBeTruthy());
    expect(screen.getByText("facility-1")).toBeTruthy();
    expect(screen.queryByText(/Facility details are unavailable/)).toBeNull();
  });
});
