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
  })
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
    logout: (...args: any[]) => mockLogout(...args)
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
    mockApiRequest.mockResolvedValue({});
  });

  it("shows workspace boundaries and opens account mode routes", async () => {
    const screen = render(<FacilityProfileRoute />);

    expect(screen.getByText("Facility workspace")).toBeTruthy();
    expect(screen.getByText("Operational facility identity")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Switch workspace mode"));
    fireEvent.press(screen.getByLabelText("Open account profile"));

    expect(mockPush).toHaveBeenCalledWith("/account/mode");
    expect(mockPush).toHaveBeenCalledWith("/profile");
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home/facility/select"));
  });
});
