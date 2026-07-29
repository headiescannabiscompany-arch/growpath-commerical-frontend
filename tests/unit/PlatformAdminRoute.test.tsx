import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PlatformAdminRoute from "@/app/admin";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockRouteParams: Record<string, string> = {};
let mockRole = "admin";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockRouteParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));
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
const moderationCase = {
  _id: "case-1",
  targetType: "forumPost",
  targetId: "post-1",
  reason: "Reported promotional sale",
  severity: "high",
  status: "reviewing",
  action: "none",
  actionHistory: [],
  evidenceSnapshot: {
    automated: false,
    targetUrl: "https://growpathai.com/forum/post/post-1",
    content: {
      title: "Plant health discussion",
      body: "Review this reported Forum post."
    }
  }
};

function defaultAdminApi(path: string) {
  if (path === "/api/admin/overview") return Promise.resolve({ overview });
  if (path === "/api/admin/usage") return Promise.resolve({ usage });
  if (path.startsWith("/api/admin/users")) return Promise.resolve({ users: [member] });
  if (path === "/api/admin/moderation-cases")
    return Promise.resolve({ cases: [moderationCase] });
  if (path === "/api/admin/evidence-requests") return Promise.resolve({ requests: [] });
  if (path === "/api/admin/support-requests")
    return Promise.resolve({ requests: [supportRequest] });
  if (path === "/api/admin/knowledge-registry") return Promise.resolve({ entries: [] });
  if (path === "/api/admin/method-review-proposals")
    return Promise.resolve({ proposals: [] });
  return Promise.resolve({ ok: true });
}

describe("PlatformAdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockRouteParams = {};
    mockPush.mockReset();
    mockReplace.mockReset();
    mockApiRequest.mockImplementation(defaultAdminApi);
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

  it("keeps working Admin sections visible when one independent section fails", async () => {
    mockApiRequest.mockImplementation((path: string) =>
      path === "/api/admin/knowledge-registry"
        ? Promise.reject(new Error("Not found"))
        : defaultAdminApi(path)
    );

    const screen = render(<PlatformAdminRoute />);

    await waitFor(() => expect(screen.getByText("Online now")).toBeTruthy());
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText(/Knowledge registry: Not found/)).toBeTruthy();
    expect(screen.getByText("member@example.com · personal · pro")).toBeTruthy();
  });

  it("submits complete owner-supplied source governance fields as arrays", async () => {
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Online now")).toBeTruthy());

    fireEvent.changeText(
      screen.getByPlaceholderText("Stable entry ID"),
      "extension-example"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Source or method title"),
      "Example Extension"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Domain (sources only)"),
      "extension.example.edu"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Preferred authors or channels, comma-separated"),
      "Horticulture Team"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Approved uses, comma-separated"),
      "education, IPM"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Explicit exclusions, comma-separated"),
      "cultivar claims, medical advice"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Cross-check requirements, comma-separated"),
      "Confirm crop scope, check publication date"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Source guidance and limitations"),
      "Use only within the reviewed publication scope."
    );
    fireEvent.press(screen.getByText("Create governed draft revision"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/knowledge-registry",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            entryId: "extension-example",
            entryType: "source",
            reliabilityTier: "B",
            preferredAuthors: ["Horticulture Team"],
            trustedFor: ["education", "IPM"],
            notTrustedFor: ["cultivar claims", "medical advice"],
            requiresCrossCheck: true,
            crossCheckRequirements: ["Confirm crop scope", "check publication date"]
          })
        })
      )
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

  it("focuses a moderation case opened from email and links to its exact content", async () => {
    mockRouteParams = { moderationCaseId: "case-1" };
    const screen = render(<PlatformAdminRoute />);

    await waitFor(() =>
      expect(screen.getByText("Opened from report email")).toBeTruthy()
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open reported forumPost"
      })
    );

    expect(mockPush).toHaveBeenCalledWith("/forum/post/post-1");
  });

  it("sends the enforced Forum moderation actions from the administrator review card", async () => {
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Soft-remove post")).toBeTruthy());
    const expectReloadCount = (count: number) =>
      waitFor(() =>
        expect(
          mockApiRequest.mock.calls.filter(
            ([path]) => path === "/api/admin/moderation-cases"
          )
        ).toHaveLength(count)
      );

    fireEvent.press(screen.getByText("Lock"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/case-1/action",
        {
          method: "POST",
          body: { action: "lock" }
        }
      )
    );
    await expectReloadCount(2);

    fireEvent.press(screen.getByText("Pin"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/case-1/action",
        {
          method: "POST",
          body: { action: "pin" }
        }
      )
    );
    await expectReloadCount(3);

    fireEvent.changeText(screen.getByPlaceholderText("Destination category"), "help");
    fireEvent.press(screen.getByText("Move category"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/case-1/action",
        {
          method: "POST",
          body: { action: "move", category: "help" }
        }
      )
    );
    await expectReloadCount(4);

    fireEvent.press(screen.getByText("Soft-remove post"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/case-1/action",
        {
          method: "POST",
          body: { action: "remove" }
        }
      )
    );
    await expectReloadCount(5);

    fireEvent.press(screen.getByText("Approve / restore"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/case-1/action",
        {
          method: "POST",
          body: { action: "restore" }
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
