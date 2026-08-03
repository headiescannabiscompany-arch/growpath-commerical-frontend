import React from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockUsePushRegistration = jest.fn();
const mockReadToken = jest.fn();
const mockPersistToken = jest.fn();
const mockApiMe = jest.fn();
const mockApiRequest = jest.fn();
const mockSetOnUnauthorized = jest.fn();

jest.mock("expo-router", () => ({
  useGlobalSearchParams: () => ({}),
  usePathname: () => "/home/personal"
}));

jest.mock("@/hooks/usePushRegistration", () => ({
  usePushRegistration: (...args: any[]) => mockUsePushRegistration(...args)
}));

jest.mock("@/api/events", () => ({
  logEvent: jest.fn()
}));

jest.mock("@/api/auth", () => ({
  login: jest.fn(),
  signup: jest.fn()
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args),
  setOnUnauthorized: (...args: any[]) => mockSetOnUnauthorized(...args)
}));

jest.mock("@/api/me", () => ({
  apiMe: (...args: any[]) => mockApiMe(...args)
}));

jest.mock("@/auth/tokenStore", () => ({
  setToken: (...args: any[]) => mockPersistToken(...args),
  getToken: (...args: any[]) => mockReadToken(...args)
}));

jest.mock("@/config/planLimits", () => ({
  PLAN_LIMITS: {
    commercial: {},
    facility: {},
    pro: {},
    free: {}
  }
}));

import { AuthProvider, useAuth } from "@/auth/AuthContext";

function AuthStateProbe() {
  const auth = useAuth();
  return (
    <>
      <Text testID="auth-state">
        {JSON.stringify({
          token: auth.token,
          user: auth.user,
          ctx: auth.ctx,
          meStatus: auth.meStatus,
          meError: auth.meError,
          isHydrating: auth.isHydrating,
          isAuthed: auth.isAuthed
        })}
      </Text>
      <Pressable accessibilityLabel="Retry session" onPress={() => void auth.retryMe()}>
        <Text>Retry session</Text>
      </Pressable>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthStateProbe />
    </AuthProvider>
  );
}

function authState(screen: ReturnType<typeof render>) {
  return JSON.parse(String(screen.getByTestId("auth-state").props.children));
}

const hydratedMe = {
  user: {
    id: "user-1",
    email: "grower@example.com",
    displayName: "Grower",
    role: "user",
    plan: "pro",
    subscriptionStatus: "active"
  },
  ctx: { mode: "personal", plan: "pro" }
};

describe("AuthProvider persisted-session transitions", () => {
  beforeEach(() => {
    mockReadToken.mockResolvedValue("session-token");
    mockPersistToken.mockResolvedValue(undefined);
    mockApiRequest.mockResolvedValue({});
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("clears persisted auth and in-memory session when /api/me returns 401", async () => {
    mockApiMe.mockRejectedValue(
      Object.assign(new Error("Session expired."), { status: 401 })
    );

    const screen = renderProvider();

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        token: null,
        user: null,
        ctx: null,
        meStatus: "idle",
        meError: null,
        isHydrating: false,
        isAuthed: false
      })
    );

    expect(mockPersistToken).toHaveBeenCalledTimes(1);
    expect(mockPersistToken).toHaveBeenCalledWith(null);

    fireEvent.press(screen.getByLabelText("Retry session"));
    expect(mockApiMe).toHaveBeenCalledTimes(1);
  });

  it("retains the persisted session on outage and exposes a successful retry", async () => {
    mockApiMe
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(hydratedMe);

    const screen = renderProvider();

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        token: "session-token",
        user: null,
        ctx: null,
        meStatus: "error",
        meError:
          "Unable to verify session from /api/me. Check backend connectivity and retry.",
        isHydrating: false,
        isAuthed: true
      })
    );
    expect(mockPersistToken).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Retry session"));

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        token: "session-token",
        user: hydratedMe.user,
        ctx: hydratedMe.ctx,
        meStatus: "ready",
        meError: null,
        isHydrating: false,
        isAuthed: true
      })
    );
    expect(mockApiMe).toHaveBeenNthCalledWith(2, { force: true });
    expect(mockPersistToken).not.toHaveBeenCalled();
  });
});
