import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityProfileRoute from "@/app/home/facility/(tabs)/profile";

const mockApiRequest = jest.fn();
const mockLogout = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

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
  useFacility: () => ({ selectedId: null })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "facility-user-1",
      email: "facility@example.com",
      displayName: "Facility Lead"
    },
    logout: (...args: any[]) => mockLogout(...args)
  })
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
    clearError: jest.fn(),
    handleApiError: jest.fn()
  })
}));

describe("FacilityProfileRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockLogout.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
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

    fireEvent.press(screen.getByLabelText("Switch workspace mode"));
    fireEvent.press(screen.getByLabelText("Open account profile"));
    fireEvent.press(screen.getByLabelText("Manage facility plan and billing"));
    fireEvent.press(screen.getByLabelText("Report bug"));

    expect(mockPush).toHaveBeenCalledWith("/account/mode");
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(mockPush).toHaveBeenCalledWith("/offers");
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/support",
        params: expect.objectContaining({
          topic: "technical",
          email: "facility@example.com",
          accountEmail: "facility@example.com",
          subject: "Bug report - facility - Facility profile",
          message: expect.stringContaining("Facility ID: facility-1")
        })
      })
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/home/facility/select")
    );
  });
});
