import React from "react";
import { ActivityIndicator, StyleSheet, TextInput } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PlatformAdminRoute, {
  createPlatformAdminStyles,
  moderationTargetHref
} from "@/app/admin";
import { getThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockRouteParams: Record<string, string> = {};
let mockRole = "admin";
let mockThemeMode: "day" | "night" = "night";

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
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette(
        mockThemeMode,
        mockThemeMode === "night" ? "dark" : "light"
      )
    })
  };
});
jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});
jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, titleLevel, subtitle, children }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(
        Text,
        titleLevel
          ? { accessibilityRole: "header", "aria-level": titleLevel }
          : null,
        title
      ),
      React.createElement(Text, null, subtitle),
      children
    );
  };
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
const harvestCalibrationCandidate = {
  feedbackId: "harvest-feedback-1",
  reviewId: "harvest-review-1",
  provider: "openai",
  model: "gpt-5.4",
  reviewPolicyVersion: "harvest-trichome-server-attestation-v2-full-grid",
  evidenceAssetIds: ["evidence-1", "evidence-2"],
  aiVisibleSample: {
    confirmedAmber: 0.01,
    possibleAmber: 0.23,
    resolvedHeadCount: 323,
    countingConfidence: "high"
  },
  ownerReview: {
    estimateAlignment: "amber_higher",
    visibleAmberPercent: 30
  },
  eligibility: {
    status: "awaiting_independent_review",
    groundTruth: false,
    requiredNextSteps: ["two independent head-level reviews", "adjudication"]
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
  if (path === "/api/ai/training/harvest-trichome-calibration")
    return Promise.resolve({ items: [harvestCalibrationCandidate] });
  return Promise.resolve({ ok: true });
}

describe("PlatformAdminRoute", () => {
  it.each([
    ["forumPost", "forum-1", "/forum/post/forum-1"],
    ["commercialPost", "campaign-1", "/feed?campaignId=campaign-1"],
    ["storefrontProduct", "product-1", "/store?q=product-1"],
    ["course", "course-1", "/courses?courseId=course-1"],
    ["video", "video-1", "/videos/video-1"],
    ["liveSession", "live-1", "/live-session?sessionId=live-1"]
  ])("builds the canonical %s moderation content link", (targetType, targetId, href) => {
    expect(
      moderationTargetHref({
        _id: "case-1",
        targetType,
        targetId,
        reason: "Reported",
        severity: "medium",
        status: "open",
        action: "none"
      })
    ).toBe(href);
  });

  it("rejects a same-origin submitted URL for the wrong content type", () => {
    expect(
      moderationTargetHref({
        _id: "case-1",
        targetType: "video",
        targetId: "video-1",
        reason: "Reported",
        severity: "medium",
        status: "open",
        action: "none",
        evidenceSnapshot: { targetUrl: "https://growpathai.com/admin" }
      })
    ).toBe("/videos/video-1");
  });

  it("preserves a matching exact storefront product URL", () => {
    expect(
      moderationTargetHref({
        _id: "case-1",
        targetType: "storefrontProduct",
        targetId: "product-1",
        reason: "Reported",
        severity: "medium",
        status: "open",
        action: "none",
        evidenceSnapshot: {
          targetUrl: "https://growpathai.com/store/living-soil-labs/products/product-1"
        }
      })
    ).toBe("/store/living-soil-labs/products/product-1");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockThemeMode = "night";
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
    expect(screen.getByText("Harvest trichome calibration queue")).toBeTruthy();
    expect(screen.getByText(/AI amber 1% to 23%/)).toBeTruthy();
    expect(screen.getByText(/owner visible-area estimate 30%/)).toBeTruthy();
    expect(screen.getByText(/Not ground truth/)).toBeTruthy();

    fireEvent.press(screen.getByText("Refresh tokens"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/users/user-1/tokens", {
        method: "POST",
        body: { reason: "Platform owner token refresh" }
      })
    );
  });

  it("requires a successful dry run and exact confirmation before anonymizing a test account", async () => {
    const nextConfirmation = "ANONYMIZE user-1 member@example.com";
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/users/user-1/anonymize-synthetic-account") {
        if (options?.body?.execute) {
          return Promise.resolve({ ok: true, deletion: { deletionMode: "anonymized" } });
        }
        return Promise.resolve({
          ok: true,
          dryRun: true,
          target: { id: "user-1", email: "member@example.com" },
          allowlisted: true,
          blockers: [],
          deletionMode: "privacy_anonymization",
          nextConfirmation
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Review test-account cleanup")).toBeTruthy());

    fireEvent.press(screen.getByText("Review test-account cleanup"));
    await waitFor(() => expect(screen.getByText("Anonymize member@example.com")).toBeTruthy());
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/admin/users/user-1/anonymize-synthetic-account",
      { method: "POST", body: { expectedEmail: "member@example.com" } }
    );

    const confirmInput = screen.getByLabelText(
      "Exact synthetic account anonymization confirmation"
    );
    fireEvent.changeText(confirmInput, nextConfirmation);
    fireEvent.press(screen.getByText("Anonymize approved test account"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/users/user-1/anonymize-synthetic-account",
        {
          method: "POST",
          body: {
            expectedEmail: "member@example.com",
            execute: true,
            confirmation: nextConfirmation
          }
        }
      )
    );
  });

  it.each(["day", "night"] as const)(
    "uses the active %s palette for loaded admin surfaces and form controls",
    async (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const themedStyles = createPlatformAdminStyles(palette);
      const screen = render(<PlatformAdminRoute />);

      expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe(palette.accent);
      await waitFor(() => expect(screen.getByText("Online now")).toBeTruthy());

      expect(screen.getByRole("header", { name: "Administration" })).toHaveProp(
        "aria-level",
        1
      );
      expect(
        screen.getByRole("header", { name: "Actual product activity" })
      ).toHaveProp("aria-level", 2);
      expect(
        screen.getByRole("header", { name: "Harvest trichome calibration queue" })
      ).toHaveProp("aria-level", 2);

      expect(
        StyleSheet.flatten(screen.getByText("Administration").props.style).color
      ).toBe(palette.text);
      expect(StyleSheet.flatten(screen.getByText("Online now").props.style).color).toBe(
        palette.textMuted
      );
      expect(StyleSheet.flatten(screen.getByText("42").props.style).color).toBe(
        palette.text
      );
      expect(StyleSheet.flatten(themedStyles.metric)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(StyleSheet.flatten(themedStyles.activityRow)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.borderSoft
        })
      );
      expect(StyleSheet.flatten(themedStyles.secondaryButton)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border
        })
      );
      expect(StyleSheet.flatten(themedStyles.error)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.danger,
          color: palette.danger
        })
      );
      expect(StyleSheet.flatten(themedStyles.warningButton)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.warning
        })
      );
      expect(StyleSheet.flatten(themedStyles.dangerButton)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.danger
        })
      );
      expect(themedStyles.warningText.color).toBe(palette.warning);
      expect(themedStyles.dangerText.color).toBe(palette.danger);

      fireEvent.press(screen.getByText("Email notice"));
      screen.UNSAFE_getAllByType(TextInput).forEach((input) => {
        expect(input.props.placeholderTextColor).toBe(palette.textMuted);
        expect(input.props.selectionColor).toBe(palette.accent);
        expect(StyleSheet.flatten(input.props.style)).toEqual(
          expect.objectContaining({
            backgroundColor: palette.surface,
            borderColor: palette.border,
            color: palette.text
          })
        );
      });
    }
  );

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

  it.each(["day", "night"] as const)(
    "denies the current non-admin account with the active %s palette",
    (mode) => {
      mockRole = "user";
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const screen = render(<PlatformAdminRoute />);

      const denial = screen.UNSAFE_getByProps({ accessibilityRole: "alert" });
      expect(StyleSheet.flatten(denial.props.style).backgroundColor).toBe(palette.page);
      expect(
        screen.getByRole("header", { name: "Platform owner access required" }).props[
          "aria-level"
        ]
      ).toBe(1);
      expect(
        StyleSheet.flatten(screen.getByText("Platform owner access required").props.style)
          .color
      ).toBe(palette.text);
      expect(
        StyleSheet.flatten(
          screen.getByText("This workspace is separate from Facility ownership.").props
            .style
        ).color
      ).toBe(palette.textMuted);
      expect(mockApiRequest).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText("Return to GrowPathAI"));
      expect(mockReplace).toHaveBeenCalledWith("/home");
    }
  );
});
