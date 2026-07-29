import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockUsePushRegistration = jest.fn();
const mockReadToken = jest.fn();
const mockApiMe = jest.fn();
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
  apiRequest: jest.fn(),
  setOnUnauthorized: (...args: any[]) => mockSetOnUnauthorized(...args)
}));

jest.mock("@/api/me", () => ({
  apiMe: (...args: any[]) => mockApiMe(...args)
}));

jest.mock("@/auth/tokenStore", () => ({
  setToken: jest.fn(),
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

import { AuthProvider } from "@/auth/AuthContext";

describe("AuthProvider push registration handoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadToken.mockResolvedValue("session-token");
    mockApiMe.mockResolvedValue({
      user: {
        id: "user-1",
        email: "grower@example.com",
        displayName: "Grower",
        role: "user",
        plan: "pro",
        subscriptionStatus: "active"
      },
      ctx: { mode: "personal", plan: "pro" }
    });
  });

  it("passes the hydrated session into push registration", async () => {
    render(
      <AuthProvider>
        <React.Fragment />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(mockUsePushRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          token: "session-token",
          isHydrating: false
        })
      )
    );
  });
});
