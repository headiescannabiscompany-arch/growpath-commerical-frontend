import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { RequireAuth } from "@/auth/RequireAuth";
import { RouteAccessGuard } from "@/navigation/RouteAccessGuard";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRetryMe = jest.fn();
const mockLogout = jest.fn();
let mockPathname = "/home/facility";
let mockSegments: string[] = ["home", "facility"];
let mockSearchParams: Record<string, string | string[]> = {};
let mockAuth: any;
let mockEntitlements: any;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
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
    mockSearchParams = {};
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

  it("preserves one validated gift return without mounting protected children", async () => {
    const mounted = jest.fn();
    function ProtectedChild() {
      React.useEffect(() => mounted(), []);
      return <></>;
    }
    mockPathname = "/account/gift-checkout/cancel";
    mockSegments = ["account", "gift-checkout", "cancel"];
    mockSearchParams = {
      checkout_attempt_id: "123e4567-e89b-42d3-a456-426614174000"
    };
    mockAuth = {
      ...mockAuth,
      token: null,
      user: null,
      meStatus: "idle",
      meError: ""
    };

    const screen = render(
      <RequireAuth>
        <ProtectedChild />
      </RequireAuth>
    );

    expect(screen.getByLabelText("Redirecting to sign in")).toBeTruthy();
    expect(mounted).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/login",
        params: {
          next: "/account/gift-checkout/cancel?checkout_attempt_id=123e4567-e89b-42d3-a456-426614174000"
        }
      })
    );
  });

  it("preserves the exact bare legacy cancel through sign-in without mounting children", async () => {
    const mounted = jest.fn();
    function ProtectedChild() {
      React.useEffect(() => mounted(), []);
      return <></>;
    }
    mockPathname = "/account/gift-checkout/cancel";
    mockSegments = ["account", "gift-checkout", "cancel"];
    mockSearchParams = {};
    mockAuth = {
      ...mockAuth,
      token: null,
      user: null,
      meStatus: "idle",
      meError: ""
    };

    render(
      <RequireAuth>
        <ProtectedChild />
      </RequireAuth>
    );

    expect(mounted).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/login",
        params: { next: "/account/gift-checkout/cancel" }
      })
    );
  });

  it("drops an invalid protected return instead of forwarding extra parameters", async () => {
    mockPathname = "/account/gift-checkout/success";
    mockSegments = ["account", "gift-checkout", "success"];
    mockSearchParams = { session_id: "cs_test_valid_session", paid: "true" };
    mockAuth = {
      ...mockAuth,
      token: null,
      user: null,
      meStatus: "idle",
      meError: ""
    };

    render(
      <RequireAuth>
        <></>
      </RequireAuth>
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
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
