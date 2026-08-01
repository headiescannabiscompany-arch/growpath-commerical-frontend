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
    expect(screen.getByRole("header", { name: "Session check failed" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByLabelText("Retry /api/me")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Retry /api/me"));
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
  });

  it("presents wrong-workspace denial as an H1 with safe navigation actions", () => {
    mockPathname = "/home/commercial/orders";
    mockAuth = {
      ...mockAuth,
      user: { id: "viewer-1" },
      meStatus: "ready",
      meError: ""
    };
    mockEntitlements = {
      ready: true,
      bootstrapError: "",
      mode: "facility",
      capabilities: {},
      facilityId: "facility-1"
    };

    const screen = render(
      <RouteAccessGuard>
        <></>
      </RouteAccessGuard>
    );

    expect(screen.getByRole("header", { name: "Access denied" })).toHaveProp(
      "aria-level",
      1
    );
    expect(
      screen.getByText("This page is only available in commercial mode.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Go to my dashboard")).toBeTruthy();
    expect(screen.getByLabelText("Log out")).toBeTruthy();
    expect(screen.getByLabelText("Contact support")).toBeTruthy();
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
