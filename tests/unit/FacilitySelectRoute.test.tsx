import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilitySelectRoute from "@/app/home/facility/select";

const mockApiRequest = jest.fn();
const mockHandleApiError = jest.fn();
const mockLogout = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSelectFacility = jest.fn();
const mockFacilityStore = {
  selectedId: "facility-current",
  selectFacility: (...args: any[]) => mockSelectFacility(...args)
};
const mockApiErrorState = {
  error: null,
  clearError: jest.fn(),
  handleApiError: (...args: any[]) => mockHandleApiError(...args)
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ logout: (...args: any[]) => mockLogout(...args) })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorState
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => mockFacilityStore
}));

describe("FacilitySelectRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue([
      { id: "facility-current", name: "Current Facility" },
      { id: "facility-next", name: "Next Facility" }
    ]);
    mockLogout.mockResolvedValue(undefined);
  });

  it("announces loading and exposes current and pending facility selection", async () => {
    const screen = render(<FacilitySelectRoute />);

    expect(screen.getByLabelText("Loading facilities").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

    const current = await screen.findByLabelText("Select facility Current Facility");
    expect(current.props.accessibilityState).toMatchObject({ selected: true });

    const next = screen.getByLabelText("Select facility Next Facility");
    fireEvent.press(next);

    expect(mockSelectFacility).toHaveBeenCalledWith({
      id: "facility-next",
      name: "Next Facility"
    });
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/dashboard");
    expect(
      screen.getByLabelText("Select facility Next Facility").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true, selected: false });
    expect(
      screen.getByLabelText("Select facility Current Facility").props.accessibilityState
    ).toMatchObject({ disabled: true, selected: true });
    screen.unmount();
  });

  it("prevents duplicate logout actions while logout is pending", async () => {
    let finishLogout: (() => void) | undefined;
    mockLogout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve;
        })
    );
    const screen = render(<FacilitySelectRoute />);
    const logout = screen.getByLabelText("Log out");

    fireEvent.press(logout);
    fireEvent.press(logout);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Log out").props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true
    });
    finishLogout?.();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
    screen.unmount();
  });
});
