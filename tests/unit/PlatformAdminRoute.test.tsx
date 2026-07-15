import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PlatformAdminRoute from "@/app/admin";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
let mockRole = "admin";

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", role: mockRole } })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});
jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
});

const overview = {
  totalUsers: 42,
  onlineNow: 3,
  activeToday: 18,
  onlineWindowMinutes: 5,
  byMode: { personal: 30, commercial: 8, facility: 4 },
  byPlan: {},
  byStatus: { active: 42 }
};
const member = {
  _id: "user-1",
  email: "member@example.com",
  displayName: "Member",
  plan: "pro",
  mode: "personal",
  subscriptionStatus: "active",
  accountStatus: "active",
  aiTokens: 2,
  maxTokens: 100
};

describe("PlatformAdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/overview") return Promise.resolve({ overview });
      if (path.startsWith("/api/admin/users"))
        return Promise.resolve({ users: [member] });
      return Promise.resolve({ ok: true });
    });
  });

  it("shows global presence and account controls to platform admins", async () => {
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Online now")).toBeTruthy());
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("member@example.com · personal · pro")).toBeTruthy();

    fireEvent.press(screen.getByText("Refresh tokens"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/users/user-1/tokens", {
        method: "POST",
        body: { reason: "Platform owner token refresh" }
      })
    );
  });

  it("denies ordinary users even when they know the route", () => {
    mockRole = "user";
    const screen = render(<PlatformAdminRoute />);
    expect(screen.getByText("Platform owner access required")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
