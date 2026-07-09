import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { RequireAuth } from "@/auth/RequireAuth";
import { RouteAccessGuard } from "@/navigation/RouteAccessGuard";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRetryMe = jest.fn();
const mockLogout = jest.fn();
let mockPathname = "/home/facility";
let mockSegments: string[] = ["home", "facility"];
let mockAuth: any;
let mockEntitlements: any;

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSegments: () => mockSegments
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

describe("auth bootstrap route guards", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockRetryMe.mockReset();
    mockLogout.mockReset();
    mockPathname = "/home/facility";
    mockSegments = ["home", "facility"];
    mockAuth = {
      token: "session-token",
      user: null,
      isHydrating: false,
      meStatus: "error",
      meError:
        "Unable to verify session from /api/me. Check backend connectivity and retry.",
      retryMe: mockRetryMe,
      logout: mockLogout
    };
    mockEntitlements = {
      ready: false,
      bootstrapError:
        "Unable to verify session from /api/me. Check backend connectivity and retry.",
      mode: "personal",
      capabilities: {},
      facilityId: null
    };
  });

  it("keeps RequireAuth on a retryable /api/me failure instead of redirecting", () => {
    const screen = render(
      <RequireAuth>
        <></>
      </RequireAuth>
    );

    expect(screen.getByText("Session check failed")).toBeTruthy();
    expect(screen.getByLabelText("Retry /api/me")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Retry /api/me"));
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
  });

  it("shows the bootstrap error on protected deep routes instead of an infinite spinner", () => {
    const screen = render(
      <RouteAccessGuard>
        <></>
      </RouteAccessGuard>
    );

    expect(screen.getByText("Session check failed")).toBeTruthy();
    expect(
      screen.getByText(
        "Unable to verify session from /api/me. Check backend connectivity and retry."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Retry /api/me"));
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
  });
});
