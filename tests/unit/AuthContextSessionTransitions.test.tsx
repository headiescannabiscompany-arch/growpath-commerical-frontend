import React from "react";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockUsePushRegistration = jest.fn();
const mockReadToken = jest.fn();
const mockPersistToken = jest.fn();
const mockApiMe = jest.fn();
const mockApiRequest = jest.fn();
const mockSetOnUnauthorized = jest.fn();
const mockApiLogin = jest.fn();
const mockResetWorkspaceSessionState = jest.fn();
const mockSubscribeToExternalTokenChanges = jest.fn();
const mockClearAdminSecurityForLogout = jest.fn();

jest.mock("@/api/adminPasskeys", () => ({
  clearAdminStepUp: jest.fn(),
  clearAdminSecurityForLogout: (...args: any[]) =>
    mockClearAdminSecurityForLogout(...args)
}));

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
  login: (...args: any[]) => mockApiLogin(...args),
  signup: jest.fn()
}));

jest.mock("@/auth/workspaceSessionReset", () => ({
  resetWorkspaceSessionState: (...args: any[]) => mockResetWorkspaceSessionState(...args)
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
  getToken: (...args: any[]) => mockReadToken(...args),
  subscribeToExternalTokenChanges: (...args: any[]) =>
    mockSubscribeToExternalTokenChanges(...args)
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
      <Pressable accessibilityLabel="Log out session" onPress={() => void auth.logout()}>
        <Text>Log out session</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Log in second account"
        onPress={() => void auth.login("second@example.com", "password")}
      >
        <Text>Log in second account</Text>
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
    mockResetWorkspaceSessionState.mockResolvedValue(undefined);
    mockApiRequest.mockResolvedValue({});
    mockClearAdminSecurityForLogout.mockResolvedValue(undefined);
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
    expect(mockResetWorkspaceSessionState).toHaveBeenCalledTimes(1);
    expect(mockApiMe).toHaveBeenCalledWith({ invalidateOn401: false });

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
    expect(mockApiMe).toHaveBeenNthCalledWith(2, {
      force: true,
      invalidateOn401: false
    });
    expect(mockPersistToken).not.toHaveBeenCalled();
  });

  it("clears account-scoped workspace state on explicit logout", async () => {
    mockApiMe.mockResolvedValue(hydratedMe);
    const screen = renderProvider();

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        user: hydratedMe.user,
        ctx: hydratedMe.ctx,
        isAuthed: true
      })
    );
    fireEvent.press(screen.getByLabelText("Log out session"));

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        token: null,
        user: null,
        ctx: null,
        isAuthed: false
      })
    );
    expect(mockPersistToken).toHaveBeenCalledWith(null);
    expect(mockResetWorkspaceSessionState).toHaveBeenCalledTimes(1);
  });

  it("reloads an old Facility session after another tab signs in without clearing shared auth", async () => {
    const reload = jest.fn();
    const unsubscribe = jest.fn();
    const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "growpathai.com",
        pathname: "/home/facility/profile",
        search: "",
        reload
      }
    });
    mockSubscribeToExternalTokenChanges.mockReturnValue(unsubscribe);
    mockApiMe.mockResolvedValue({
      ...hydratedMe,
      ctx: { mode: "facility", facilityId: "owner-facility", facilityRole: "OWNER" }
    });
    const screen = renderProvider();
    try {
      await waitFor(() => expect(authState(screen).ctx?.mode).toBe("facility"));
      mockSubscribeToExternalTokenChanges.mock.calls[0][0]();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(mockPersistToken).not.toHaveBeenCalled();
      expect(mockResetWorkspaceSessionState).not.toHaveBeenCalled();
      screen.unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      screen.unmount();
      if (originalLocation) Object.defineProperty(window, "location", originalLocation);
      else delete (window as any).location;
    }
  });

  it("clears the first account workspace before applying a second account login", async () => {
    const secondUser = {
      ...hydratedMe.user,
      id: "user-2",
      email: "second@example.com",
      displayName: "Second Grower"
    };
    mockApiMe.mockResolvedValueOnce(hydratedMe).mockResolvedValueOnce({
      user: secondUser,
      ctx: { mode: "commercial", plan: "commercial" }
    });
    mockApiLogin.mockResolvedValue({
      token: "second-session-token",
      user: secondUser
    });
    const screen = renderProvider();

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({ user: hydratedMe.user, isAuthed: true })
    );
    fireEvent.press(screen.getByLabelText("Log in second account"));

    await waitFor(() =>
      expect(authState(screen)).toMatchObject({
        token: "second-session-token",
        user: secondUser,
        ctx: { mode: "commercial", plan: "commercial" },
        isAuthed: true
      })
    );
    expect(mockResetWorkspaceSessionState).toHaveBeenCalledTimes(1);
    expect(mockPersistToken).toHaveBeenNthCalledWith(1, null);
    expect(mockPersistToken).toHaveBeenNthCalledWith(2, "second-session-token");
    expect(mockPersistToken.mock.invocationCallOrder[0]).toBeLessThan(
      mockResetWorkspaceSessionState.mock.invocationCallOrder[0]
    );
    expect(mockResetWorkspaceSessionState.mock.invocationCallOrder[0]).toBeLessThan(
      mockPersistToken.mock.invocationCallOrder[1]
    );
  });

  it.each(["success", "failure"])(
    "a delayed departing Admin lock %s cannot sign out a newer login",
    async (outcome) => {
      let resolveLock!: () => void;
      let rejectLock!: (error: Error) => void;
      mockClearAdminSecurityForLogout.mockReturnValueOnce(
        new Promise<void>((resolve, reject) => {
          resolveLock = resolve;
          rejectLock = reject;
        })
      );
      const secondUser = {
        ...hydratedMe.user,
        id: "user-2",
        email: "second@example.com"
      };
      mockApiMe.mockResolvedValueOnce(hydratedMe).mockResolvedValueOnce({
        user: secondUser,
        ctx: { mode: "personal", plan: "free" }
      });
      mockApiLogin.mockResolvedValue({ token: "second-session-token", user: secondUser });
      const screen = renderProvider();
      await waitFor(() => expect(authState(screen).meStatus).toBe("ready"));
      fireEvent.press(screen.getByLabelText("Log out session"));
      await waitFor(() => expect(authState(screen).isAuthed).toBe(false));
      expect(mockClearAdminSecurityForLogout).toHaveBeenCalledWith("session-token");
      fireEvent.press(screen.getByLabelText("Log in second account"));
      await waitFor(() => expect(authState(screen).token).toBe("second-session-token"));
      const persistedWrites = mockPersistToken.mock.calls.length;
      await act(async () => {
        if (outcome === "success") resolveLock();
        else rejectLock(new Error("Synthetic offline lock"));
      });
      expect(authState(screen)).toMatchObject({
        token: "second-session-token",
        user: secondUser,
        isAuthed: true
      });
      expect(mockPersistToken).toHaveBeenCalledTimes(persistedWrites);
    }
  );

  it.each(["success", "401", "outage"])(
    "ignores the former account's delayed refresh %s after a second login",
    async (outcome) => {
      let resolveOld!: (value: any) => void;
      let rejectOld!: (reason: any) => void;
      const oldRefresh = new Promise((resolve, reject) => {
        resolveOld = resolve;
        rejectOld = reject;
      });
      const secondUser = {
        ...hydratedMe.user,
        id: "user-2",
        email: "second@example.com"
      };
      const secondContext = { mode: "commercial", plan: "commercial" };
      mockApiMe
        .mockResolvedValueOnce(hydratedMe)
        .mockReturnValueOnce(oldRefresh)
        .mockResolvedValueOnce({ user: secondUser, ctx: secondContext });
      mockApiLogin.mockResolvedValue({ token: "second-session-token", user: secondUser });
      const screen = renderProvider();
      await waitFor(() => expect(authState(screen).meStatus).toBe("ready"));
      fireEvent.press(screen.getByLabelText("Retry session"));
      expect(mockApiMe).toHaveBeenNthCalledWith(2, {
        force: true,
        invalidateOn401: false
      });
      fireEvent.press(screen.getByLabelText("Log in second account"));
      await waitFor(() =>
        expect(authState(screen)).toMatchObject({
          token: "second-session-token",
          user: secondUser,
          ctx: secondContext,
          meStatus: "ready"
        })
      );
      const persistedWrites = mockPersistToken.mock.calls.length;
      await act(async () => {
        if (outcome === "success") {
          resolveOld({ ...hydratedMe, user: { ...hydratedMe.user, ageBand: "21_plus" } });
        } else {
          rejectOld(
            Object.assign(new Error("Old request failed"), {
              status: outcome === "401" ? 401 : 503
            })
          );
        }
      });
      expect(authState(screen)).toMatchObject({
        token: "second-session-token",
        user: secondUser,
        ctx: secondContext,
        meStatus: "ready",
        meError: null,
        isAuthed: true
      });
      expect(authState(screen).user.ageBand).toBeUndefined();
      expect(mockPersistToken).toHaveBeenCalledTimes(persistedWrites);
      expect(mockResetWorkspaceSessionState).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["success", "401"])(
    "does not resurrect or invalidate a signed-out account on delayed refresh %s",
    async (outcome) => {
      let resolveOld!: (value: any) => void;
      let rejectOld!: (reason: any) => void;
      const oldRefresh = new Promise((resolve, reject) => {
        resolveOld = resolve;
        rejectOld = reject;
      });
      mockApiMe.mockResolvedValueOnce(hydratedMe).mockReturnValueOnce(oldRefresh);
      const screen = renderProvider();
      await waitFor(() => expect(authState(screen).meStatus).toBe("ready"));
      fireEvent.press(screen.getByLabelText("Retry session"));
      fireEvent.press(screen.getByLabelText("Log out session"));
      await waitFor(() => expect(authState(screen).isAuthed).toBe(false));
      await act(async () => {
        if (outcome === "success") resolveOld(hydratedMe);
        else rejectOld(Object.assign(new Error("Old request expired"), { status: 401 }));
      });
      expect(authState(screen)).toMatchObject({
        token: null,
        user: null,
        ctx: null,
        meStatus: "idle",
        meError: null,
        isAuthed: false
      });
      expect(mockPersistToken).toHaveBeenCalledTimes(1);
      expect(mockResetWorkspaceSessionState).toHaveBeenCalledTimes(1);
    }
  );
});
