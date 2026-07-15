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
const usage = {
  activeUsers: { last7Days: 5, last30Days: 12 },
  newUsers: { last7Days: 2, last30Days: 7 },
  activity: {
    last24Hours: { grows: 1, toolRuns: 3, forumPosts: 0 },
    last7Days: { grows: 4, toolRuns: 9, forumPosts: 2 }
  },
  note: "Activity counts are records, not time spent."
};
const supportRequest = {
  _id: "support-1",
  name: "Outside Grower",
  replyEmail: "grower@example.net",
  topic: "technical",
  subject: "Bug report - personal - tasks",
  message: "The task did not save after I submitted the form.",
  status: "open",
  createdAt: "2026-07-15T12:00:00.000Z",
  emailDelivery: { sent: true }
};

describe("PlatformAdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/overview") return Promise.resolve({ overview });
      if (path === "/api/admin/usage") return Promise.resolve({ usage });
      if (path.startsWith("/api/admin/users"))
        return Promise.resolve({ users: [member] });
      if (path === "/api/admin/support-requests")
        return Promise.resolve({ requests: [supportRequest] });
      return Promise.resolve({ ok: true });
    });
  });

  it("shows global presence and account controls to platform admins", async () => {
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Online now")).toBeTruthy());
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("member@example.com · personal · pro")).toBeTruthy();
    expect(screen.getByText("Active users · 7 days")).toBeTruthy();
    expect(screen.getByText(/Bug report - personal - tasks/)).toBeTruthy();

    fireEvent.press(screen.getByText("Refresh tokens"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/users/user-1/tokens", {
        method: "POST",
        body: { reason: "Platform owner token refresh" }
      })
    );
  });

  it("lets platform admins resolve a stored bug report", async () => {
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Resolve")).toBeTruthy());

    fireEvent.press(screen.getByText("Resolve"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/support-requests/support-1",
        {
          method: "PATCH",
          body: { status: "resolved", reason: "Platform owner support review" }
        }
      )
    );
  });

  it("denies ordinary users even when they know the route", () => {
    mockRole = "user";
    const screen = render(<PlatformAdminRoute />);
    expect(screen.getByText("Platform owner access required")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
