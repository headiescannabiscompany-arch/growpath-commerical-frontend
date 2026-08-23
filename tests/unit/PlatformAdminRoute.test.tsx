import React from "react";
import { ActivityIndicator, Linking, StyleSheet, TextInput } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PlatformAdminRoute, {
  createPlatformAdminStyles,
  moderationTargetHref,
  supportsModerationActions
} from "@/app/admin";
import { getThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogout = jest.fn();
let mockRouteParams: Record<string, string> = {};
let mockRole = "admin";
let mockThemeMode: "day" | "night" = "night";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockRouteParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", role: mockRole }, logout: mockLogout })
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
        titleLevel ? { accessibilityRole: "header", "aria-level": titleLevel } : null,
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
const securityCenter = {
  tally: {
    total: 3,
    open: 2,
    resolved: 1,
    bySeverity: { critical: 1, high: 1, medium: 1, low: 0 },
    byKind: { security: 1, safety: 0, enforcement: 1, reliability: 1 },
    bySource: { security_report: 1, moderation_escalation: 1, account_enforcement: 1 }
  },
  issues: [
    {
      id: "support:security-1",
      source: "security_report",
      kind: "security",
      category: "reported_security_issue",
      title: "Suspicious account access",
      summary: "The account owner reported an unexpected access notice.",
      severity: "critical",
      status: "open",
      affected: "member@example.com",
      occurredAt: "2026-08-15T12:00:00.000Z",
      investigationHref: "/admin?section=support"
    },
    {
      id: "audit:security-2",
      source: "account_enforcement",
      kind: "enforcement",
      category: "user_suspended",
      title: "user suspended",
      summary: "Investigation completed.",
      severity: "high",
      status: "resolved",
      affected: "user:user-2",
      occurredAt: "2026-08-14T12:00:00.000Z",
      resolvedAt: "2026-08-14T12:00:00.000Z",
      investigationHref: "/admin?targetType=user&targetId=user-2"
    },
    {
      id: "sentry:123",
      source: "application_monitoring",
      kind: "reliability",
      category: "TypeError",
      title: "Map renderer cleanup error",
      summary: "An unresolved production application error.",
      severity: "high",
      status: "open",
      affected: "react-native",
      occurredAt: "2026-08-15T13:00:00.000Z",
      investigationHref: "https://growpath.sentry.io/issues/123"
    }
  ],
  coverage: [
    {
      source: "security_report",
      label: "Submitted security reports",
      state: "connected"
    },
    {
      source: "application_monitoring",
      label: "Sentry application errors",
      state: "external_only",
      note: "Open Sentry for the authoritative application-error tally."
    }
  ],
  note: "Totals include every issue in connected sources."
};
const regulatedCommerce = {
  tallies: {
    authorizations: { pending: 1, verified: 0 },
    decisions: { allowed: 0 }
  },
  businessRoles: ["nursery", "cultivator"],
  productClasses: ["cannabis_seed"],
  capabilities: ["catalog_display", "external_product_handoff", "growpath_checkout"],
  fulfillmentMethods: ["none", "external_handoff", "domestic_shipping"],
  authorizations: [
    {
      _id: "authorization-1",
      storefrontId: {
        _id: "store-1",
        name: "Living Soil Labs",
        slug: "living-soil-labs"
      },
      userId: { email: "owner@example.com", displayName: "Owner" },
      businessRoles: ["nursery", "cultivator"],
      productClasses: ["cannabis_seed"],
      jurisdiction: { countryCode: "US", subdivisionCode: "MA" },
      authorizationType: "Cannabis establishment license",
      authorizationIdentifier: "LIC-123",
      issuer: "Massachusetts CCC",
      evidenceUrl: "https://example.gov/licenses/LIC-123",
      reviewStatus: "pending"
    }
  ],
  decisions: []
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
  if (path === "/api/admin/security-center") return Promise.resolve(securityCenter);
  if (path === "/api/admin/regulated-commerce") return Promise.resolve(regulatedCommerce);
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
    "video",
    "videoComment",
    "liveSession",
    "liveChatMessage",
    "growTimelinePublicCopy",
    "course",
    "forumPost",
    "comment",
    "commercialPost",
    "storefrontProduct"
  ])(
    "offers the audited Admin moderation actions for reported %s content",
    (targetType) => {
      expect(supportsModerationActions(targetType)).toBe(true);
    }
  );

  it.each([
    ["forumPost", "forum-1", "/forum/post/forum-1"],
    ["commercialPost", "campaign-1", "/feed?campaignId=campaign-1"],
    ["storefrontProduct", "product-1", "/store?q=product-1"],
    ["course", "course-1", "/courses?courseId=course-1&moderationCaseId=case-1"],
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

  it("preserves the report's exact public grow timeline URL", () => {
    const token = "A".repeat(43);
    expect(
      moderationTargetHref({
        _id: "case-1",
        targetType: "growTimelinePublicCopy",
        targetId: "507f1f77bcf86cd799439012",
        reason: "Reported",
        severity: "medium",
        status: "open",
        action: "none",
        evidenceSnapshot: {
          targetUrl: `https://growpathai.com/grow-timeline/${token}`
        }
      })
    ).toBe(`/grow-timeline/${token}`);
  });

  it.each([
    [
      "videoComment",
      "comment-1",
      "https://growpathai.com/videos/video-1?commentId=comment-1",
      "/videos/video-1?commentId=comment-1"
    ],
    [
      "liveChatMessage",
      "message-1",
      "https://growpathai.com/live-session?sessionId=live-1&messageId=message-1",
      "/live-session?sessionId=live-1&messageId=message-1"
    ]
  ])(
    "preserves the exact reported %s parent and message link",
    (targetType, targetId, targetUrl, href) => {
      expect(
        moderationTargetHref({
          _id: "case-1",
          targetType,
          targetId,
          reason: "Reported",
          severity: "medium",
          status: "open",
          action: "none",
          evidenceSnapshot: { targetUrl }
        })
      ).toBe(href);
    }
  );

  it("keeps a submitted course URL and adds the focused moderation case", () => {
    expect(
      moderationTargetHref({
        _id: "case-course",
        targetType: "course",
        targetId: "course-1",
        reason: "Reported",
        severity: "medium",
        status: "open",
        action: "none",
        evidenceSnapshot: {
          targetUrl: "https://growpathai.com/courses?courseId=course-1"
        }
      })
    ).toBe("/courses?courseId=course-1&moderationCaseId=case-course");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = "admin";
    mockThemeMode = "night";
    mockRouteParams = {};
    mockPush.mockReset();
    mockReplace.mockReset();
    mockLogout.mockResolvedValue(undefined);
    mockApiRequest.mockImplementation(defaultAdminApi);
  });

  it("offers workspace switching and a confirmed Admin logout", async () => {
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Online now");

    fireEvent.press(screen.getByRole("button", { name: "Switch workspace" }));
    expect(mockPush).toHaveBeenCalledWith("/account/workspace");

    fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    expect(screen.getByText("Confirm platform Admin logout")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Confirm log out" }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockReplace).toHaveBeenCalledWith("/login");
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

    expect(
      screen.getByRole("button", { name: "Email notice to member@example.com" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Suspend member@example.com" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ban member@example.com" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Review test-account cleanup for member@example.com"
      })
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "Refresh tokens for member@example.com" })
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/users/user-1/tokens", {
        method: "POST",
        body: { reason: "Platform owner token refresh" }
      })
    );
  });

  it("shows security tallies, source coverage, and direct investigations outside tasks", async () => {
    const screen = render(<PlatformAdminRoute />);

    await waitFor(() =>
      expect(screen.getByText("Security and investigations")).toBeTruthy()
    );
    expect(screen.getByText("Open investigations")).toBeTruthy();
    expect(screen.getByText("Security reports")).toBeTruthy();
    expect(screen.getByText("Sentry application errors")).toBeTruthy();
    expect(screen.queryByText("user suspended")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", { name: "Investigate Suspicious account access" })
    );
    expect(mockPush).toHaveBeenCalledWith("/admin?section=support");

    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(undefined);
    fireEvent.press(
      screen.getByRole("button", { name: "Investigate Map renderer cleanup error" })
    );
    await waitFor(() =>
      expect(openUrl).toHaveBeenCalledWith("https://growpath.sentry.io/issues/123")
    );
    openUrl.mockRestore();

    fireEvent.press(screen.getByText("Show resolved security history"));
    expect(screen.getAllByText(/user suspended/).length).toBeGreaterThan(0);
  });

  it("reviews regulated authorization evidence without enabling blanket sales", async () => {
    const screen = render(<PlatformAdminRoute />);

    expect(await screen.findByText("Regulated commerce review")).toBeTruthy();
    expect(screen.getByText("Pending authorizations")).toBeTruthy();
    expect(screen.getByText("Allowed exact routes")).toBeTruthy();
    expect(screen.getByText(/not blanket sales permission/i)).toBeTruthy();
    expect(screen.getByText(/require a separate exact-route decision/i)).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Review notes for Living Soil Labs"),
      "Verified against the issuing authority record."
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "verified authorization for Living Soil Labs"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/regulated-commerce/authorizations/authorization-1",
        {
          method: "PATCH",
          body: {
            reviewStatus: "verified",
            reviewNotes: "Verified against the issuing authority record."
          }
        }
      )
    );
  });

  it("records a versioned decision for one exact regulated route", async () => {
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Regulated commerce review");

    fireEvent.press(
      screen.getByRole("button", {
        name: "Use authorization for Living Soil Labs route decision"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText("Route capability"),
      "external_product_handoff"
    );
    fireEvent.changeText(screen.getByLabelText("Route destination country"), "us");
    fireEvent.changeText(screen.getByLabelText("Route destination subdivision"), "ma");
    fireEvent.changeText(
      screen.getByLabelText("Route buyer eligibility"),
      "age_21_verified"
    );
    fireEvent.changeText(
      screen.getByLabelText("Route fulfillment method"),
      "external_handoff"
    );
    fireEvent.changeText(screen.getByLabelText("Route decision"), "allowed");
    fireEvent.changeText(
      screen.getByLabelText("Route reason codes"),
      "verified_license, local_route_reviewed"
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Record exact regulated route decision" })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/regulated-commerce/decisions",
        {
          method: "POST",
          body: expect.objectContaining({
            storefrontId: "store-1",
            authorizationIds: ["authorization-1"],
            capability: "external_product_handoff",
            productClass: "cannabis_seed",
            origin: { countryCode: "US", subdivisionCode: "MA" },
            destination: { countryCode: "US", subdivisionCode: "MA" },
            buyerEligibility: "age_21_verified",
            fulfillmentMethod: "external_handoff",
            decision: "allowed",
            policyVersion: "regulated-commerce-v1",
            reasonCodes: ["verified_license", "local_route_reviewed"]
          })
        }
      )
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
    await waitFor(() =>
      expect(screen.getByText("Review test-account cleanup")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Review test-account cleanup"));
    await waitFor(() =>
      expect(screen.getByText("Anonymize member@example.com")).toBeTruthy()
    );
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
      expect(screen.getByRole("header", { name: "Actual product activity" })).toHaveProp(
        "aria-level",
        2
      );
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

  it("requires a typed reason before reopening completed support work", async () => {
    const resolvedSupport = {
      ...supportRequest,
      _id: "support-resolved",
      subject: "Resolved support history",
      status: "resolved"
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/support-requests") {
        return Promise.resolve({ requests: [resolvedSupport] });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Admin work queue");
    fireEvent.press(screen.getByRole("button", { name: "Show completed work" }));

    const reopen = screen.getByRole("button", { name: "Reopen request" });
    expect(reopen).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText("Reason to reopen Resolved support history"),
      "New owner evidence shows the issue is still reproducible."
    );
    fireEvent.press(reopen);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/support-requests/support-resolved",
        {
          method: "PATCH",
          body: {
            status: "open",
            reason: "New owner evidence shows the issue is still reproducible."
          }
        }
      )
    );
  });

  it("honors account deep links without silently changing the linked account", async () => {
    mockRouteParams = { targetType: "user", targetId: "user-1" };
    const screen = render(<PlatformAdminRoute />);

    await screen.findByText("Opened from an account investigation link");
    expect(screen.getByText("member@example.com · active")).toBeTruthy();
    expect(screen.getByText("member@example.com · personal · pro")).toBeTruthy();
  });

  it("honors generic moderation and resolved-security target deep links", async () => {
    mockRouteParams = { targetType: "moderationCase", targetId: "case-1" };
    const moderationScreen = render(<PlatformAdminRoute />);
    await moderationScreen.findByText("Opened from a moderation investigation link");
    moderationScreen.unmount();

    mockRouteParams = { targetType: "securityIssue", targetId: "audit:security-2" };
    const securityScreen = render(<PlatformAdminRoute />);
    await securityScreen.findByText("Opened from a security investigation link");
    expect(securityScreen.getAllByText(/user suspended/).length).toBeGreaterThan(0);
  });

  it("keeps preservation separate, exposes safe review steps, and loads retained audit", async () => {
    const evidenceRequest = {
      _id: "legal-1",
      requestType: "subpoena",
      requesterName: "Officer Example",
      requesterOrganization: "Example Agency",
      requesterEmail: "officer@example.gov",
      authorityDescription: "Signed subpoena received; authority not yet verified.",
      jurisdiction: "Maryland",
      targetUserId: "user-1",
      scope: "Account activity from July 1 through July 2",
      status: "received",
      preservationHold: false,
      userNoticeStatus: "not_reviewed",
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-07-02T00:00:00.000Z",
      evidenceItems: [],
      createdBy: "admin-1",
      createdAt: "2026-08-20T12:00:00.000Z"
    };
    mockRouteParams = {
      targetType: "legalEvidenceRequest",
      targetId: "legal-1"
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/evidence-requests") {
        return Promise.resolve({ requests: [evidenceRequest] });
      }
      if (path === "/api/admin/audit?targetType=legalEvidenceRequest&targetId=legal-1") {
        return Promise.resolve({
          events: [
            {
              _id: "audit-1",
              actorUserId: "admin-1",
              action: "evidence_request_created",
              targetType: "legalEvidenceRequest",
              targetId: "legal-1",
              reason: evidenceRequest.scope,
              createdAt: "2026-08-20T12:00:00.000Z"
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Opened from a legal/evidence investigation link");
    expect(screen.getByText(/Contact: officer@example.gov/)).toBeTruthy();
    expect(screen.getByText(/Signed subpoena received/)).toBeTruthy();
    expect(screen.getByText(/User notice: not_reviewed/)).toBeTruthy();
    expect(screen.queryByText("Approve evidence request")).toBeNull();
    expect(screen.queryByText("Disclose account data")).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText("Review reason for subpoena request"),
      "Preserve the narrowly scoped records while identity review is pending."
    );
    fireEvent.press(screen.getByRole("button", { name: "Place preservation hold" }));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/evidence-requests/legal-1",
        {
          method: "PATCH",
          body: {
            preservationHold: true,
            reason:
              "Preserve the narrowly scoped records while identity review is pending."
          }
        }
      )
    );

    fireEvent.press(screen.getByRole("button", { name: "Load retained audit" }));
    expect(await screen.findByText(/evidence request created/)).toBeTruthy();
  });

  it("creates only a scoped received evidence-request record", async () => {
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Legal and evidence requests");
    fireEvent.press(screen.getByRole("button", { name: "Open scoped request" }));

    fireEvent.changeText(screen.getByLabelText("Evidence requester name"), "Agent Doe");
    fireEvent.changeText(
      screen.getByLabelText("Evidence requester email"),
      "AGENT@EXAMPLE.GOV"
    );
    fireEvent.changeText(
      screen.getByLabelText("Evidence authority description"),
      "Written preservation request pending legal review."
    );
    fireEvent.changeText(
      screen.getByLabelText("Evidence request scope"),
      "Login audit events for account user-1 on August 20 only."
    );
    fireEvent.changeText(
      screen.getByLabelText("Evidence target user ID"),
      "000000000000000000000001"
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Create received request record" })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/evidence-requests", {
        method: "POST",
        body: {
          requestType: "preservation",
          requesterName: "Agent Doe",
          requesterOrganization: "",
          requesterEmail: "agent@example.gov",
          authorityDescription: "Written preservation request pending legal review.",
          jurisdiction: "",
          targetUserId: "000000000000000000000001",
          scope: "Login audit events for account user-1 on August 20 only.",
          dateFrom: null,
          dateTo: null
        }
      })
    );
    expect(
      mockApiRequest.mock.calls.some(
        ([, options]) =>
          options?.body?.status === "approved" || options?.body?.status === "disclosed"
      )
    ).toBe(false);
  });

  it("keeps resolved support and actioned moderation out of the active work queue", async () => {
    const resolvedSupport = {
      ...supportRequest,
      _id: "support-resolved",
      subject: "Resolved support history",
      status: "resolved"
    };
    const actionedCase = {
      ...moderationCase,
      _id: "case-actioned",
      reason: "Completed moderation history",
      status: "actioned"
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/support-requests") {
        return Promise.resolve({ requests: [supportRequest, resolvedSupport] });
      }
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [moderationCase, actionedCase] });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Admin work queue")).toBeTruthy());

    expect(screen.getByText(/Active: 2/)).toBeTruthy();
    expect(screen.getByText(/Completed: 2/)).toBeTruthy();
    expect(screen.queryByText("Resolved support history")).toBeNull();
    expect(screen.queryByText("Completed moderation history")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Show completed work" }));

    expect(screen.getByText(/Resolved support history/)).toBeTruthy();
    expect(screen.getByText("Completed moderation history")).toBeTruthy();
    expect(screen.getByText("Completed · retained for audit")).toBeTruthy();
  });

  it("focuses a moderation case opened from email and links to its exact content", async () => {
    mockRouteParams = { moderationCaseId: "case-1" };
    const screen = render(<PlatformAdminRoute />);

    await waitFor(() =>
      expect(screen.getByText("Opened from a moderation investigation link")).toBeTruthy()
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
    await waitFor(() => expect(screen.getByText("Soft-remove content")).toBeTruthy());
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

    fireEvent.press(screen.getByText("Soft-remove content"));
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
