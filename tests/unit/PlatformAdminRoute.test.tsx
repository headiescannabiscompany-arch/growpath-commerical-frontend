import React from "react";
import { ActivityIndicator, Linking, StyleSheet, TextInput } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";

import PlatformAdminRoute, {
  createPlatformAdminStyles,
  moderationTargetHref,
  supportsModerationActions
} from "@/app/admin";
import { ApiError } from "@/api/apiRequest";
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
jest.mock("@/api/apiRequest", () => {
  const actual = jest.requireActual("@/api/apiRequest");
  return {
    ...actual,
    apiRequest: (...args: any[]) => mockApiRequest(...args)
  };
});
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
  return function MockAppCard({
    title,
    titleLevel,
    subtitle,
    children,
    accessibilityLabel
  }: any) {
    return React.createElement(
      View,
      { accessibilityLabel },
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
  maxTokens: 100,
  billingTruth: {
    source: "stripe",
    paymentState: "paid",
    stripeLinked: true,
    paidThrough: "2026-09-30T23:59:59.000Z",
    trialExpiry: null
  }
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
const restrictedModerationCase = {
  _id: "restricted-case-1",
  restricted: true,
  caseKind: "restricted_severe_harm",
  severity: "critical",
  status: "reviewing",
  action: "none",
  targetType: "forumPost",
  targetId: "must-stay-redacted-target",
  subjectUserId: "must-stay-redacted-subject",
  reason: "must-stay-redacted narrative",
  actionHistory: [{ action: "must-stay-redacted-action" }],
  evidenceSnapshot: {
    content: { body: "must-stay-redacted evidence" },
    classification: { category: "must-stay-redacted-category" }
  },
  reportCount: 1,
  lastReportedAt: "2026-08-15T14:00:00.000Z"
};
const restrictedModerationReview = {
  ...restrictedModerationCase,
  subjectUserId: "subject-user-1",
  createdAt: "2026-08-15T14:00:00.000Z",
  updatedAt: "2026-08-15T14:05:00.000Z",
  evidence: {
    categories: ["human_trafficking"],
    highestSeverity: "critical",
    categoryCounts: { human_trafficking: 1 },
    distinctTargetCount: 1,
    dispositionProgress: {
      retainedTargetCount: 1,
      actionableTargetCount: 1,
      completedTargetCount: 0,
      remainingTargetCount: 1,
      nonActionableTargetCount: 0,
      unknownTargetCount: 0,
      allTargetsDispositioned: false
    },
    caseDisposition: null,
    targetHistory: [
      {
        targetType: "forumPost",
        targetId: "restricted-post-1",
        subjectUserId: "subject-user-1",
        status: "active",
        hasMediaReferences: true,
        mediaReferenceCount: 2
      }
    ],
    preActionHistory: [],
    reports: [
      {
        reportId: "restricted-report-1",
        reporterUserId: "reporter-user-1",
        contentType: "forumPost",
        contentId: "restricted-post-1",
        category: "human_trafficking",
        reason: "Repeated coercive recruitment was reported.",
        status: "open",
        createdAt: "2026-08-15T14:00:00.000Z",
        resolvedAt: null
      }
    ],
    reportWindow: {
      ordering: "newest_first",
      limit: 100,
      returned: 1,
      truncated: false
    },
    handling: {
      minimumNecessary: true,
      snapshotMode: "metadata_only",
      rawMediaIncluded: false,
      storageLocationsIncluded: false,
      objectKeysIncluded: false,
      secretsIncluded: false,
      automaticExternalAuthorityContact: false,
      automaticLawEnforcementContact: false
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
  if (path.startsWith("/api/admin/removed-users"))
    return Promise.resolve({ ok: true, users: [], nextCursor: null });
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
  if (path === "/api/admin/harvest-operations?includeSettled=true")
    return Promise.resolve({
      operations: [
        {
          operationId: "6a8d51854cf08c2ed47a99d1",
          workspaceType: "facility",
          workspaceId: "facility-workspace",
          facilityId: "6a563bec2fb9f669d2319fa5",
          selectedEvidenceCount: 80,
          analyzedEvidenceCount: 80,
          batchCount: 7,
          completedBatchCount: 3,
          customerCredits: 7,
          state: "failed",
          creditState: "reserved",
          error: {
            code: "HARVEST_DEEP_DISPATCH_RECONCILIATION_REQUIRED",
            message: "Support review required.",
            retryable: false
          }
        },
        {
          operationId: "6b0000000000000000000002",
          workspaceType: "facility",
          workspaceId: "facility-workspace",
          facilityId: "6a563bec2fb9f669d2319fa5",
          selectedEvidenceCount: 80,
          analyzedEvidenceCount: 80,
          batchCount: 7,
          completedBatchCount: 0,
          customerCredits: 7,
          state: "failed",
          creditState: "refunded",
          error: {
            code: "HARVEST_DEEP_DISPATCH_RECONCILED_REFUNDED",
            message: "Administrative reconciliation refunded the reserved credits.",
            retryable: false
          },
          reconciliationDisposition: "refunded",
          reconciledAt: "2026-08-26T05:30:00.000Z"
        }
      ]
    });
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
    expect(screen.getByText("Harvest provider reconciliation")).toBeTruthy();
    expect(screen.getByText(/3\/7 provider batches completed/)).toBeTruthy();
    expect(screen.getByText("Recent Harvest failures without held credits")).toBeTruthy();
    expect(screen.getByText(/0\/7 provider batches completed/)).toBeTruthy();
    expect(screen.getByText(/Audited disposition: refunded/)).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Record refund for Harvest operation 6b0000000000000000000002"
      })
    ).toBeNull();
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
      screen.queryByRole("button", {
        name: "Review and remove test account member@example.com"
      })
    ).toBeNull();

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

  it("shows the server-authored billing source, Stripe link, payment state, and boundaries", async () => {
    const screen = render(<PlatformAdminRoute />);
    const billing = await screen.findByLabelText("Billing truth for member@example.com");

    expect(within(billing).getByText("Billing source: Stripe")).toBeTruthy();
    expect(within(billing).getByText("Stripe linked: Yes")).toBeTruthy();
    expect(within(billing).getByText("Payment state: Paid")).toBeTruthy();
    expect(within(billing).getByText(/Paid through: .*2026/)).toBeTruthy();
    expect(within(billing).getByText("Trial expiry: Not reported")).toBeTruthy();
  });

  it("labels every billing source without inferring unresolved legacy access as free", async () => {
    const sources = [
      ["stripe", "Stripe"],
      ["gift", "Gift"],
      ["app_store", "App Store"],
      ["free", "Free"],
      ["complimentary", "Complimentary access"],
      ["platform", "Protected platform account"],
      ["test", "Test access"],
      ["unknown", "Unknown / unresolved"]
    ] as const;
    mockApiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: sources.map(([source], index) => ({
            ...member,
            _id: `billing-source-${source}`,
            email: `${source}-${index}@example.com`,
            billingTruth: {
              source,
              paymentState:
                source === "stripe" || source === "gift" || source === "app_store"
                  ? "paid"
                  : "nonpaid",
              stripeLinked: source === "stripe",
              paidThrough: source === "free" ? null : "2026-08-01T00:00:00.000Z",
              trialExpiry: null
            }
          }))
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    for (const [source, label] of sources) {
      const index = sources.findIndex(([candidate]) => candidate === source);
      const billing = await screen.findByLabelText(
        `Billing truth for ${source}-${index}@example.com`
      );
      expect(within(billing).getByText(`Billing source: ${label}`)).toBeTruthy();
    }
  });

  it("keeps card-free local trials nonpaid even when a malformed row claims paid", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              subscriptionStatus: "trialing",
              billingTruth: {
                source: "local_trial",
                paymentState: "paid",
                stripeLinked: false,
                paidThrough: "2026-10-15T00:00:00.000Z",
                trialExpiry: "2026-09-15T00:00:00.000Z"
              }
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    const billing = await screen.findByLabelText("Billing truth for member@example.com");

    expect(
      within(billing).getByText("Billing source: Local / promotional trial (card-free)")
    ).toBeTruthy();
    expect(within(billing).getByText("Stripe linked: No")).toBeTruthy();
    expect(within(billing).getByText("Payment state: Not paid")).toBeTruthy();
    expect(within(billing).queryByText("Payment state: Paid")).toBeNull();
    expect(
      within(billing).getByText("Paid through: Not applicable to card-free trial")
    ).toBeTruthy();
    expect(within(billing).getByText(/Trial expiry: .*2026/)).toBeTruthy();
  });

  it("reports missing and invalid billing boundaries without exposing raw values", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              billingTruth: {
                source: "unknown",
                paymentState: "nonpaid",
                stripeLinked: false,
                paidThrough: "2026-99-99T00:00:00.000Z",
                trialExpiry: null
              }
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    const billing = await screen.findByLabelText("Billing truth for member@example.com");

    expect(within(billing).getByText("Paid through: Invalid date reported")).toBeTruthy();
    expect(within(billing).getByText("Trial expiry: Not reported")).toBeTruthy();
    expect(within(billing).queryByText(/2026-99-99/)).toBeNull();
  });

  it("records an explicit audited Harvest refund", async () => {
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Harvest provider reconciliation");
    fireEvent.changeText(
      screen.getByPlaceholderText("Required audited reason"),
      "Render exhausted memory after three completed provider batches."
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Record refund for Harvest operation 6a8d51854cf08c2ed47a99d1"
      })
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/harvest-operations/6a8d51854cf08c2ed47a99d1/reconcile",
        {
          method: "POST",
          body: {
            action: "refund",
            reason: "Render exhausted memory after three completed provider batches.",
            reconciliationKey: "admin-6a8d51854cf08c2ed47a99d1-refund-v1"
          }
        }
      )
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

  it("shows removal review for every server-approved nonprotected account and hides it for protected accounts", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              accountRemovalReviewAllowed: true,
              knownTestAccount: true,
              ownerControlledTestAccount: false
            },
            {
              ...member,
              _id: "owner-account-2",
              email: "owner-controlled@gmail.com",
              accountRemovalReviewAllowed: true,
              knownTestAccount: false,
              ownerControlledTestAccount: false
            },
            {
              ...member,
              _id: "marked-account-3",
              email: "marked-owner@gmail.com",
              accountRemovalReviewAllowed: true,
              knownTestAccount: false,
              ownerControlledTestAccount: true
            },
            {
              ...member,
              _id: "admin-2",
              email: "protected@example.com",
              role: "admin",
              accountRemovalReviewAllowed: false,
              knownTestAccount: false,
              ownerControlledTestAccount: false,
              platformIdentityProtected: true
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);

    expect(
      await screen.findByRole("button", {
        name: "Review account removal for member@example.com"
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Review account removal for owner-controlled@gmail.com"
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Review account removal for marked-owner@gmail.com"
      })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Review account removal for protected@example.com"
      })
    ).toBeNull();
    expect(
      within(screen.getByLabelText("Admin account protected@example.com")).getByText(
        "Protected platform identity"
      )
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Protect platform identity for protected@example.com"
      })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /unprotect/i })).toBeNull();
    expect(
      within(screen.getByLabelText("Admin account member@example.com")).getByText(
        "Known test account"
      )
    ).toBeTruthy();
    expect(
      within(
        screen.getByLabelText("Admin account owner-controlled@gmail.com")
      ).queryByText("Known test account")
    ).toBeNull();
    expect(
      within(screen.getByLabelText("Admin account marked-owner@gmail.com")).getByText(
        "Owner-marked test account"
      )
    ).toBeTruthy();
  });

  it("one-way protects a platform identity with a reason and exact confirmation", async () => {
    const exactConfirmation = "PROTECT PLATFORM IDENTITY user-1 member@example.com";
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/users/user-1/platform-identity-protection") {
        return Promise.resolve({
          ok: true,
          target: { id: "user-1" },
          platformIdentityProtected: true,
          alreadyProtected: false
        });
      }
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              accountRemovalReviewAllowed: true,
              platformIdentityProtected: false
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    const openProtection = await screen.findByRole("button", {
      name: "Protect platform identity for member@example.com"
    });

    fireEvent.press(openProtection);
    expect(
      screen.getByLabelText("Platform identity protection for member@example.com")
    ).toBeTruthy();
    expect(screen.getByText(new RegExp(exactConfirmation))).toBeTruthy();
    const confirmProtection = screen.getByRole("button", {
      name: "Confirm platform identity protection for member@example.com"
    });
    expect(confirmProtection.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );

    fireEvent.changeText(
      screen.getByLabelText("Exact platform identity protection confirmation"),
      exactConfirmation
    );
    fireEvent.changeText(
      screen.getByLabelText("Platform identity protection reason"),
      "Primary platform owner account"
    );
    expect(confirmProtection.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );
    fireEvent.press(confirmProtection);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/users/user-1/platform-identity-protection",
        {
          method: "PATCH",
          body: {
            expectedEmail: "member@example.com",
            reason: "Primary platform owner account",
            confirmation: exactConfirmation
          }
        }
      )
    );
    expect(await screen.findByText("Protected platform identity")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Protect platform identity for member@example.com"
      })
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Review account removal for member@example.com"
      })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /unprotect/i })).toBeNull();
  });

  it("cursor-lists only stripped archive records with private retention copy", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/removed-users?limit=50") {
        return Promise.resolve({
          ok: true,
          users: [
            {
              archiveId: "archive-1",
              anonymizedUserId: "deleted-account-user-1",
              status: "ready",
              archivedAt: "2026-08-20T12:00:00.000Z",
              purgeAfter: "2026-11-18T12:00:00.000Z",
              legalHold: false,
              purgedAt: null,
              failureCode: ""
            }
          ],
          nextCursor: "archive-1"
        });
      }
      if (path === "/api/admin/removed-users?limit=50&cursor=archive-1") {
        return Promise.resolve({
          ok: true,
          users: [
            {
              archiveId: "archive-2",
              anonymizedUserId: "deleted-account-user-2",
              status: "ready",
              archivedAt: "2026-08-19T12:00:00.000Z",
              purgeAfter: "2026-11-17T12:00:00.000Z",
              legalHold: true,
              purgedAt: null,
              failureCode: ""
            }
          ],
          nextCursor: null
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);

    expect(await screen.findByText("deleted-account-user-1")).toBeTruthy();
    expect(screen.getByText(/private 90-day evidence vault is not public/i)).toBeTruthy();
    expect(
      screen.getByText(
        /never sold or used for advertising, recommendations, or AI training/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/only a valid legal hold can require continued retention/i)
    ).toBeTruthy();
    expect(
      within(screen.getByLabelText("Removed account archive archive-1")).getByText(
        "Archive ID: archive-1"
      )
    ).toBeTruthy();
    expect(screen.queryByText(/User requested account removal/)).toBeNull();
    expect(screen.queryByText("former@example.com")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Load more removed accounts" }));

    expect(await screen.findByText("deleted-account-user-2")).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/admin/removed-users?limit=50&cursor=archive-1"
    );
    expect(
      within(screen.getByLabelText("Removed account archive archive-2")).getByText(
        /Paused by legal hold/
      )
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Load more removed accounts" })
    ).toBeNull();
  });

  it("reviews and opens only approved removed-account case scopes with a one-use in-memory token", async () => {
    const archiveId = "6a0000000000000000000001";
    const evidenceRequestId = "6b0000000000000000000002";
    const confirmation = `ACCESS ${archiveId} FOR ${evidenceRequestId}`;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/removed-users?limit=50") {
        return Promise.resolve({
          ok: true,
          users: [
            {
              archiveId,
              anonymizedUserId: "deleted-account-case-access",
              status: "ready",
              archivedAt: "2026-08-20T12:00:00.000Z",
              purgeAfter: "2026-11-18T12:00:00.000Z",
              legalHold: true,
              purgedAt: null,
              failureCode: ""
            }
          ],
          nextCursor: null
        });
      }
      if (
        path === `/api/admin/removed-users/${archiveId}/case-access-review` &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          caseAccessOnly: true,
          reviewToken: "one-use-case-review-token",
          reviewExpiresAt: "2099-09-02T12:15:00.000Z",
          scopes: ["account.identity"],
          nextConfirmation: confirmation
        });
      }
      if (
        path === `/api/admin/removed-users/${archiveId}/case-access` &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          caseAccessOnly: true,
          externalTransmissionPerformed: false,
          archiveId,
          evidenceRequestId,
          dateWindow: { from: null, to: null },
          itemCounts: { "account.identity": 1 },
          data: { "account.identity": { retainedAccountId: "subject-1" } }
        });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    fireEvent.press(
      await screen.findByRole("button", {
        name: `Open restricted case access for ${archiveId}`
      })
    );
    fireEvent.changeText(
      screen.getByLabelText(`Approved evidence request ID for ${archiveId}`),
      evidenceRequestId
    );
    fireEvent.changeText(
      screen.getByLabelText(`Restricted case access purpose for ${archiveId}`),
      "Review the approved identity scope for this case."
    );
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: "Case access scope Account identity"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText(`Exact restricted case access confirmation for ${archiveId}`),
      confirmation
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: `Review restricted case access for ${archiveId}`
      })
    );

    const sharedBody = {
      evidenceRequestId,
      purpose: "Review the approved identity scope for this case.",
      scopes: ["account.identity"],
      minimumNecessaryAcknowledged: true,
      confirmation
    };
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        `/api/admin/removed-users/${archiveId}/case-access-review`,
        { method: "POST", body: sharedBody }
      )
    );
    expect(screen.queryByText("one-use-case-review-token")).toBeNull();

    fireEvent.press(
      await screen.findByRole("button", {
        name: `View approved case data for ${archiveId}`
      })
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        `/api/admin/removed-users/${archiveId}/case-access`,
        {
          method: "POST",
          body: { ...sharedBody, reviewToken: "one-use-case-review-token" }
        }
      )
    );
    expect(await screen.findByText("Approved minimum-necessary case data")).toBeTruthy();
    expect(screen.getByText(/retainedAccountId/)).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: `View approved case data for ${archiveId}`
      })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /download|share|publish|export/i })
    ).toBeNull();
  });

  it("rejects an already-expired removed-account case-access review", async () => {
    const archiveId = "6a0000000000000000000003";
    const evidenceRequestId = "6b0000000000000000000004";
    const confirmation = `ACCESS ${archiveId} FOR ${evidenceRequestId}`;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/removed-users?limit=50") {
        return Promise.resolve({
          users: [
            {
              archiveId,
              anonymizedUserId: "deleted-account-expired-review",
              status: "ready",
              legalHold: true
            }
          ],
          nextCursor: null
        });
      }
      if (
        path === `/api/admin/removed-users/${archiveId}/case-access-review` &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          ok: true,
          caseAccessOnly: true,
          reviewToken: "expired-token-not-rendered",
          reviewExpiresAt: "2000-01-01T00:00:00.000Z"
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    fireEvent.press(
      await screen.findByRole("button", {
        name: `Open restricted case access for ${archiveId}`
      })
    );
    fireEvent.changeText(
      screen.getByLabelText(`Approved evidence request ID for ${archiveId}`),
      evidenceRequestId
    );
    fireEvent.changeText(
      screen.getByLabelText(`Restricted case access purpose for ${archiveId}`),
      "Approved minimum necessary case review."
    );
    fireEvent.press(
      screen.getByRole("checkbox", { name: "Case access scope Account identity" })
    );
    fireEvent.changeText(
      screen.getByLabelText(`Exact restricted case access confirmation for ${archiveId}`),
      confirmation
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: `Review restricted case access for ${archiveId}`
      })
    );

    expect(
      await screen.findByText(/did not return a usable authorization/i)
    ).toBeTruthy();
    expect(screen.queryByText("expired-token-not-rendered")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: `View approved case data for ${archiveId}`
      })
    ).toBeNull();
  });

  it("requires a successful dry run, category, detailed reason, permanent acknowledgement, and exact confirmation before removing an account", async () => {
    const nextConfirmation = "ANONYMIZE user-1 member@example.com";
    const preview = {
      ok: true,
      dryRun: true,
      target: { id: "user-1", email: "member@example.com" },
      accountRemovalReviewAllowed: true,
      knownTestAccount: true,
      ownerControlledTestAccount: false,
      blockers: [],
      deletionMode: "privacy_anonymization",
      nextConfirmation,
      reviewToken: "one-use-review-token-1",
      reviewExpiresAt: "2099-09-02T12:15:00.000Z",
      allowedRemovalCategories: [
        "test_cleanup",
        "user_request",
        "policy_enforcement",
        "security_fraud",
        "legal_process",
        "other"
      ]
    };
    let resolvePreview: (value: typeof preview) => void = () => undefined;
    const previewRequest = new Promise<typeof preview>((resolve) => {
      resolvePreview = resolve;
    });
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/users/user-1/remove-account") {
        if (options?.body?.execute) {
          return Promise.resolve({ ok: true, deletion: { deletionMode: "anonymized" } });
        }
        return previewRequest;
      }
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              accountRemovalReviewAllowed: true,
              knownTestAccount: true,
              ownerControlledTestAccount: false
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    await waitFor(() => expect(screen.getByText("Review account removal")).toBeTruthy());

    fireEvent.press(screen.getByText("Review account removal"));
    await screen.findByText("Reviewing safety checks…");
    expect(
      screen.getByRole("button", {
        name: "Reviewing account removal safety for member@example.com"
      }).props.accessibilityState
    ).toEqual(expect.objectContaining({ disabled: true }));
    resolvePreview(preview);
    await waitFor(() =>
      expect(screen.getByText("Remove member@example.com")).toBeTruthy()
    );
    expect(
      within(screen.getByLabelText("Admin account member@example.com")).getByText(
        "Remove member@example.com"
      )
    ).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/admin/users/user-1/remove-account",
      { method: "POST", body: { expectedEmail: "member@example.com" } }
    );

    const permanentAcknowledgement = screen.getByRole("checkbox", {
      name: "Acknowledge permanent account removal for member@example.com"
    });
    const executeButton = screen.getByRole("button", {
      name: "Permanently remove account member@example.com"
    });
    expect(permanentAcknowledgement.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false })
    );
    expect(executeButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );

    const confirmInput = screen.getByLabelText(
      "Exact account anonymization confirmation"
    );
    fireEvent.changeText(confirmInput, nextConfirmation);
    fireEvent.press(executeButton);
    expect(
      mockApiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/api/admin/users/user-1/remove-account" &&
          options?.body?.execute === true
      )
    ).toHaveLength(0);

    fireEvent.press(screen.getByRole("radio", { name: "Removal category User request" }));
    fireEvent.changeText(
      screen.getByLabelText("Detailed account removal reason"),
      "User requested permanent account removal"
    );
    fireEvent.press(permanentAcknowledgement);
    expect(permanentAcknowledgement.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true })
    );
    expect(executeButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );
    fireEvent.press(executeButton);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/users/user-1/remove-account",
        {
          method: "POST",
          body: {
            expectedEmail: "member@example.com",
            execute: true,
            confirmation: nextConfirmation,
            removalCategory: "user_request",
            reason: "User requested permanent account removal",
            permanentActionAcknowledged: true,
            reviewToken: "one-use-review-token-1"
          }
        }
      )
    );
  });

  it("keeps execution disabled when a blocker-free review has no usable token", async () => {
    const nextConfirmation = "ANONYMIZE user-1 member@example.com";
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/users/user-1/remove-account" && !options?.body?.execute) {
        return Promise.resolve({
          ok: true,
          dryRun: true,
          target: { id: "user-1", email: "member@example.com" },
          accountRemovalReviewAllowed: true,
          blockers: [],
          deletionMode: "privacy_anonymization",
          nextConfirmation,
          allowedRemovalCategories: ["user_request"],
          reviewExpiresAt: "2099-09-02T12:15:00.000Z"
        });
      }
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [{ ...member, accountRemovalReviewAllowed: true }]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Review account removal");

    fireEvent.press(screen.getByText("Review account removal"));
    await screen.findByText(/Review authorization is missing or expired/i);
    fireEvent.press(screen.getByRole("radio", { name: "Removal category User request" }));
    fireEvent.changeText(
      screen.getByLabelText("Detailed account removal reason"),
      "User requested permanent removal"
    );
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: "Acknowledge permanent account removal for member@example.com"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact account anonymization confirmation"),
      nextConfirmation
    );

    const executeButton = screen.getByRole("button", {
      name: "Permanently remove account member@example.com"
    });
    expect(executeButton.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
    fireEvent.press(executeButton);
    expect(
      mockApiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/api/admin/users/user-1/remove-account" &&
          options?.body?.execute === true
      )
    ).toHaveLength(0);
  });

  it("consumes a review token before a failed execution and requires a new review", async () => {
    const nextConfirmation = "ANONYMIZE user-1 member@example.com";
    let reviewCount = 0;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/users/user-1/remove-account") {
        if (options?.body?.execute) {
          return Promise.reject(new Error("Review token was already consumed."));
        }
        reviewCount += 1;
        return Promise.resolve({
          ok: true,
          dryRun: true,
          target: { id: "user-1", email: "member@example.com" },
          accountRemovalReviewAllowed: true,
          blockers: [],
          deletionMode: "privacy_anonymization",
          nextConfirmation,
          allowedRemovalCategories: ["user_request"],
          reviewToken: `one-use-review-token-${reviewCount}`,
          reviewExpiresAt: "2099-09-02T12:15:00.000Z"
        });
      }
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [{ ...member, accountRemovalReviewAllowed: true }]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Review account removal");

    fireEvent.press(screen.getByText("Review account removal"));
    await screen.findByText("Remove member@example.com");
    fireEvent.press(screen.getByRole("radio", { name: "Removal category User request" }));
    fireEvent.changeText(
      screen.getByLabelText("Detailed account removal reason"),
      "User requested permanent removal"
    );
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: "Acknowledge permanent account removal for member@example.com"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact account anonymization confirmation"),
      nextConfirmation
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Permanently remove account member@example.com"
      })
    );

    expect(await screen.findByText("Review token was already consumed.")).toBeTruthy();
    expect(
      screen.queryByLabelText("Account removal review for member@example.com")
    ).toBeNull();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/admin/users/user-1/remove-account",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          execute: true,
          reviewToken: "one-use-review-token-1"
        })
      })
    );

    fireEvent.press(screen.getByText("Review account removal"));
    await waitFor(() => expect(reviewCount).toBe(2));
    expect(
      await screen.findByLabelText("Account removal review for member@example.com")
    ).toBeTruthy();
  });

  it("shows dry-run safety blockers without exposing removal controls", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/users/user-1/remove-account") {
        return Promise.reject(
          new ApiError("HTTP_ERROR", 409, {
            ok: false,
            dryRun: true,
            target: { id: "user-1", email: "member@example.com" },
            accountRemovalReviewAllowed: true,
            knownTestAccount: true,
            ownerControlledTestAccount: false,
            blockers: ["course_creator"],
            deletionMode: "privacy_anonymization",
            nextConfirmation: "ANONYMIZE user-1 member@example.com",
            allowedRemovalCategories: [
              "test_cleanup",
              "user_request",
              "policy_enforcement",
              "security_fraud",
              "legal_process",
              "other"
            ]
          })
        );
      }
      if (path.startsWith("/api/admin/users")) {
        return Promise.resolve({
          users: [
            {
              ...member,
              accountRemovalReviewAllowed: true,
              knownTestAccount: true,
              ownerControlledTestAccount: false
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Review account removal");

    fireEvent.press(screen.getByText("Review account removal"));

    await screen.findByText("This account owns a course that must be handled first.");
    expect(screen.getByText(/Safety blockers: 1 · Dry run: blocked/)).toBeTruthy();
    expect(
      screen.queryByLabelText("Exact account anonymization confirmation")
    ).toBeNull();
    expect(
      screen.queryByRole("checkbox", {
        name: "Acknowledge permanent account removal for member@example.com"
      })
    ).toBeNull();
    expect(screen.queryByText("Permanently remove account")).toBeNull();
    expect(screen.queryByText("HTTP_ERROR")).toBeNull();
  });

  it.each(["day", "night"] as const)(
    "uses the active %s palette for loaded admin surfaces and form controls",
    async (mode) => {
      mockThemeMode = mode;
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const themedStyles = createPlatformAdminStyles(palette);
      const screen = render(<PlatformAdminRoute />);

      expect(screen.UNSAFE_getAllByType(ActivityIndicator)).not.toHaveLength(0);
      for (const indicator of screen.UNSAFE_getAllByType(ActivityIndicator)) {
        expect(indicator.props.color).toBe(palette.accent);
      }
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
        const inputStyle = StyleSheet.flatten(input.props.style);
        expect([palette.surface, palette.surfaceMuted]).toContain(
          inputStyle.backgroundColor
        );
        expect(inputStyle).toEqual(
          expect.objectContaining({
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
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: `Resolve ${supportRequest.subject}` })
      ).toBeTruthy()
    );

    expect(
      screen.getByRole("button", {
        name: `Mark ${supportRequest.subject} in progress`
      })
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: `Resolve ${supportRequest.subject}` })
    );

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

  it("lets platform admins assign support to themselves and retain an internal case note", async () => {
    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Admin work queue");

    fireEvent.press(
      screen.getByRole("button", {
        name: `Assign ${supportRequest.subject} to me`
      })
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/support-requests/support-1",
        { method: "PATCH", body: { assignToSelf: true } }
      )
    );

    const note = "Reviewed reproduction and retained the next action.";
    fireEvent.changeText(
      screen.getByLabelText(`Case note for ${supportRequest.subject}`),
      note
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: `Add case note to ${supportRequest.subject}`
      })
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/support-requests/support-1",
        {
          method: "PATCH",
          body: {
            note,
            reason: "Platform owner support case note"
          }
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

  it("records requester identity and authority verification during identity review", async () => {
    const evidenceRequest = {
      _id: "legal-identity-1",
      requestType: "subpoena",
      requesterName: "Officer Example",
      requesterOrganization: "Example Agency",
      requesterEmail: "officer@example.gov",
      authorityDescription: "Signed subpoena presented for independent review.",
      jurisdiction: "Maryland",
      targetUserId: "6a0000000000000000000001",
      scope: "Login activity for one specified day.",
      status: "identity_review",
      preservationHold: true,
      userNoticeStatus: "not_reviewed",
      evidenceItems: [],
      createdBy: "admin-creator"
    };
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/evidence-requests" && !options) {
        return Promise.resolve({ requests: [evidenceRequest] });
      }
      if (
        path === "/api/admin/evidence-requests/legal-identity-1" &&
        options?.method === "PATCH"
      ) {
        return Promise.resolve({ ok: true, request: evidenceRequest });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByLabelText("Requester verification review legal-identity-1");
    fireEvent.changeText(
      screen.getByLabelText("Review reason for subpoena request"),
      "Identity and authority were independently verified."
    );
    fireEvent.changeText(
      screen.getByLabelText("Requester identity verification method legal-identity-1"),
      "Government photo identification"
    );
    fireEvent.changeText(
      screen.getByLabelText("Requester identity verification reference legal-identity-1"),
      "Agency verification record IDV-101"
    );
    fireEvent.changeText(
      screen.getByLabelText("Requester authority verification method legal-identity-1"),
      "Issuing court docket verification"
    );
    fireEvent.changeText(
      screen.getByLabelText(
        "Requester authority verification reference legal-identity-1"
      ),
      "Court docket reference AUTH-202"
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Record identity and authority verification legal-identity-1"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/evidence-requests/legal-identity-1",
        {
          method: "PATCH",
          body: {
            reason: "Identity and authority were independently verified.",
            requesterIdentityVerification: {
              verified: true,
              method: "Government photo identification",
              reference: "Agency verification record IDV-101"
            },
            requesterAuthorityVerification: {
              verified: true,
              method: "Issuing court docket verification",
              reference: "Court docket reference AUTH-202"
            }
          }
        }
      )
    );
  });

  it("lets only the legal-review stage submit a held minimum-necessary approval", async () => {
    const evidenceRequest = {
      _id: "legal-approval-1",
      requestType: "search_warrant",
      requesterName: "Agent Example",
      requesterOrganization: "Example Agency",
      requesterEmail: "agent@example.gov",
      authorityDescription: "Signed warrant verified by agency counsel.",
      jurisdiction: "Maryland",
      targetUserId: "6a0000000000000000000001",
      scope: "Account identity and one day of communications activity.",
      status: "legal_review",
      preservationHold: true,
      userNoticeStatus: "not_reviewed",
      requesterIdentityVerification: { verified: true, verifiedBy: "admin-reviewer" },
      requesterAuthorityVerification: {
        verified: true,
        verifiedBy: "admin-reviewer"
      },
      evidenceItems: [],
      createdBy: "admin-creator"
    };
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/evidence-requests" && !options) {
        return Promise.resolve({ requests: [evidenceRequest] });
      }
      if (
        path === "/api/admin/evidence-requests/legal-approval-1" &&
        options?.method === "PATCH"
      ) {
        return Promise.resolve({ ok: true, request: evidenceRequest });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByLabelText("Legal approval review legal-approval-1");
    fireEvent.changeText(
      screen.getByLabelText("Review reason for search_warrant request"),
      "Independent legal review approved this minimum scope."
    );
    fireEvent.changeText(
      screen.getByLabelText("Reviewed jurisdiction legal-approval-1"),
      "Maryland"
    );
    fireEvent.changeText(
      screen.getByLabelText("Jurisdiction determination legal-approval-1"),
      "The issuing court has jurisdiction over the identified account records."
    );
    fireEvent.changeText(
      screen.getByLabelText("Jurisdiction review reference legal-approval-1"),
      "Legal review file JUR-303"
    );
    fireEvent.changeText(
      screen.getByLabelText("Minimum necessary description legal-approval-1"),
      "Account identity fields only for the approved date window."
    );
    fireEvent.press(
      screen.getByRole("checkbox", {
        name: "Approve archive scope Account identity for legal-approval-1"
      })
    );
    fireEvent.press(
      screen.getByRole("radio", {
        name: "User notice delayed for legal-approval-1"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText("Authenticated approver name legal-approval-1"),
      "Reviewing Counsel"
    );
    fireEvent.changeText(
      screen.getByLabelText("Authenticated approver email legal-approval-1"),
      "COUNSEL@GROWPATHAI.COM"
    );
    fireEvent.changeText(
      screen.getByLabelText("Authenticated approver role legal-approval-1"),
      "Configured legal approver"
    );
    fireEvent.changeText(
      screen.getByLabelText("Authenticated approver reference legal-approval-1"),
      "Internal legal review LEG-404"
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Approve evidence request legal-approval-1"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/evidence-requests/legal-approval-1",
        {
          method: "PATCH",
          body: {
            status: "approved",
            reason: "Independent legal review approved this minimum scope.",
            jurisdiction: "Maryland",
            jurisdictionReview: {
              reviewed: true,
              determination:
                "The issuing court has jurisdiction over the identified account records.",
              reference: "Legal review file JUR-303"
            },
            minimumNecessaryScope:
              "Account identity fields only for the approved date window.",
            approvedArchiveScopes: ["account.identity"],
            userNoticeStatus: "delayed",
            legalReview: {
              decision: "approve",
              approverName: "Reviewing Counsel",
              approverEmail: "counsel@growpathai.com",
              approverRole: "Configured legal approver",
              reference: "Internal legal review LEG-404"
            }
          }
        }
      )
    );
    expect(screen.queryByText("Disclose account data")).toBeNull();
  });

  it("renders a generic-admin redacted evidence request without sensitive controls", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/evidence-requests") {
        return Promise.resolve({
          requests: [
            {
              _id: "legal-restricted-1",
              restricted: true,
              status: "identity_review",
              preservationHold: true,
              evidenceItemCount: 2,
              createdAt: "2026-08-20T12:00:00.000Z",
              updatedAt: "2026-08-21T12:00:00.000Z"
            }
          ]
        });
      }
      return defaultAdminApi(path);
    });
    const screen = render(<PlatformAdminRoute />);
    expect(
      await screen.findByLabelText("Restricted evidence request legal-restricted-1")
    ).toBeTruthy();
    expect(screen.getByText(/hidden from general Admin access/i)).toBeTruthy();
    expect(screen.queryByText("Begin identity review")).toBeNull();
    expect(screen.queryByText("Disclose account data")).toBeNull();
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

  it("releases an active hold with a rejected disposition and hides new holds afterward", async () => {
    const evidenceRequest = {
      _id: "legal-held-1",
      requestType: "preservation",
      requesterName: "GrowPathAI QA",
      requesterEmail: "support@growpathai.com",
      authorityDescription: "QA-only synthetic request.",
      jurisdiction: "Internal QA",
      targetUserId: "user-1",
      scope: "No account data; lifecycle verification only.",
      status: "legal_review",
      preservationHold: true,
      userNoticeStatus: "not_reviewed",
      evidenceItems: [],
      createdBy: "admin-1"
    };
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/evidence-requests" && !options) {
        return Promise.resolve({ requests: [evidenceRequest] });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("preservation · legal_review");
    fireEvent.changeText(
      screen.getByLabelText("Review reason for preservation request"),
      "Reject the synthetic request and release its hold."
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Reject request and release hold" })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/evidence-requests/legal-held-1",
        {
          method: "PATCH",
          body: {
            status: "rejected",
            reason: "Reject the synthetic request and release its hold.",
            preservationHold: false
          }
        }
      )
    );

    evidenceRequest.status = "rejected";
    evidenceRequest.preservationHold = false;
    screen.rerender(<PlatformAdminRoute />);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Place preservation hold" })).toBeNull()
    );
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

  it("keeps severe-harm cases redacted until an audited memory-only review is opened", async () => {
    mockRouteParams = { moderationCaseId: "restricted-case-1" };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: restrictedModerationReview });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");

    expect(screen.queryByText("subject-user-1")).toBeNull();
    expect(screen.queryByText(/must-stay-redacted/)).toBeNull();
    expect(
      screen.getByText(
        /Reporter, subject, target, narrative, and evidence details remain hidden/
      )
    ).toBeTruthy();
    expect(screen.queryByText(/Repeated coercive recruitment/)).toBeNull();
    expect(screen.queryByText(/restricted-post-1/)).toBeNull();
    expect(screen.queryByText(/automatic authority/i)).toBeNull();

    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );

    await screen.findByText("Audited restricted safety review");
    expect(screen.getByText(/Repeated coercive recruitment/)).toBeTruthy();
    expect(screen.getByText(/Target restricted-post-1/)).toBeTruthy();
    expect(screen.getByText(/No raw media, storage location/)).toBeTruthy();
    expect(screen.queryByText(/contact law enforcement/i)).toBeNull();
    expect(screen.queryByText("Open target")).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Hide target"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/restricted-case-1/action",
        {
          method: "POST",
          body: {
            action: "hide",
            evidenceTargetType: "forumPost",
            evidenceTargetId: "restricted-post-1"
          }
        }
      )
    );
  });

  it.each([
    [
      new ApiError(
        "SEVERE_HARM_REVIEWER_REQUIRED",
        403,
        { code: "SEVERE_HARM_REVIEWER_REQUIRED" },
        null
      ),
      /not configured for restricted severe-harm review/i
    ],
    [
      new ApiError(
        "SEVERE_HARM_CASE_NOT_ACTIVE",
        409,
        { code: "SEVERE_HARM_CASE_NOT_ACTIVE" },
        null
      ),
      /restricted case is no longer active/i
    ]
  ])(
    "clears restricted evidence and explains an audited review denial %#",
    async (reviewError, expectedMessage) => {
      mockApiRequest.mockImplementation((path: string) => {
        if (path === "/api/admin/moderation-cases") {
          return Promise.resolve({ cases: [restrictedModerationCase] });
        }
        if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
          return Promise.reject(reviewError);
        }
        return defaultAdminApi(path);
      });

      const screen = render(<PlatformAdminRoute />);
      await screen.findByText("Restricted severe-harm case · critical · reviewing");
      fireEvent.press(
        screen.getByRole("button", {
          name: "Open restricted safety review restricted-case-1"
        })
      );

      expect(await screen.findByText(expectedMessage)).toBeTruthy();
      expect(screen.queryByText("Audited restricted safety review")).toBeNull();
      expect(screen.queryByText(/Repeated coercive recruitment/)).toBeNull();
      expect(screen.queryByText(/restricted-post-1/)).toBeNull();
      expect(screen.queryByText(/SEVERE_HARM_/)).toBeNull();
    }
  );

  it("states the bounded latest-report limitation without implying legal escalation unlocks pagination", async () => {
    const truncatedReview = {
      ...restrictedModerationReview,
      reportCount: 101,
      evidence: {
        ...restrictedModerationReview.evidence,
        reportWindow: {
          ordering: "newest_first",
          limit: 100,
          returned: 100,
          truncated: true
        }
      }
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: truncatedReview });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );

    expect(
      await screen.findByLabelText("Restricted report list is truncated")
    ).toHaveTextContent(/latest 100 reports, up to the server limit of 100/i);
    expect(
      screen.queryByText(/legal-evidence workflow before further access/i)
    ).toBeNull();
  });

  it("clears the restricted subject when escalation is canceled and when the review closes", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: restrictedModerationReview });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );
    await screen.findByText("Audited restricted safety review");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open preservation and legal escalation for restricted case restricted-case-1"
      })
    );

    expect(screen.queryByLabelText("Evidence target user ID")).toBeNull();
    expect(screen.getByText(/target account is bound to the restricted/i)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Cancel evidence request" }));
    expect(screen.queryByLabelText("Evidence target user ID")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open scoped request" }));
    expect(screen.getByLabelText("Evidence target user ID").props.value).toBe("");
    fireEvent.press(screen.getByRole("button", { name: "Cancel evidence request" }));
    fireEvent.press(
      screen.getByRole("button", {
        name: "Close restricted safety review restricted-case-1"
      })
    );

    expect(screen.queryByText("Audited restricted safety review")).toBeNull();
    expect(screen.queryByText(/Repeated coercive recruitment/)).toBeNull();
  });

  it("binds restricted preservation to the case without sending an editable target account", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: restrictedModerationReview });
      }
      if (
        path === "/api/admin/moderation-cases/restricted-case-1/escalate-legal" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({ ok: true });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );
    await screen.findByText("Audited restricted safety review");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open preservation and legal escalation for restricted case restricted-case-1"
      })
    );
    fireEvent.changeText(screen.getByLabelText("Evidence requester name"), "Counsel");
    fireEvent.changeText(
      screen.getByLabelText("Evidence requester email"),
      "counsel@example.gov"
    );
    fireEvent.changeText(
      screen.getByLabelText("Evidence authority description"),
      "Verified internal preservation review"
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Create restricted preservation request for case restricted-case-1"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/restricted-case-1/escalate-legal",
        {
          method: "POST",
          body: {
            requestType: "preservation",
            requesterName: "Counsel",
            requesterOrganization: "",
            requesterEmail: "counsel@example.gov",
            authorityDescription: "Verified internal preservation review",
            jurisdiction: "",
            scope: "Restricted moderation case restricted-case-1",
            dateFrom: null,
            dateTo: null
          }
        }
      )
    );
    expect(screen.queryByText("Audited restricted safety review")).toBeNull();
    expect(screen.queryByLabelText("Evidence target user ID")).toBeNull();
  });

  it("clears restricted evidence when reviewer authorization is lost before an action", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: restrictedModerationReview });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/action") {
        return Promise.reject(
          new ApiError(
            "SEVERE_HARM_REVIEWER_REQUIRED",
            403,
            { code: "SEVERE_HARM_REVIEWER_REQUIRED" },
            null
          )
        );
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );
    await screen.findByText("Audited restricted safety review");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Hide restricted target restricted-post-1"
      })
    );

    expect(
      await screen.findByText(/not configured for restricted severe-harm review/i)
    ).toBeTruthy();
    expect(screen.queryByText("Audited restricted safety review")).toBeNull();
    expect(screen.queryByText(/Repeated coercive recruitment/)).toBeNull();
    expect(screen.queryByText(/SEVERE_HARM_/)).toBeNull();
  });

  it("exposes independent target actions when an aggregated case returns reviewed disposition state", async () => {
    const multiTargetReview = {
      ...restrictedModerationReview,
      evidence: {
        ...restrictedModerationReview.evidence,
        distinctTargetCount: 2,
        dispositionProgress: {
          retainedTargetCount: 2,
          actionableTargetCount: 2,
          completedTargetCount: 0,
          remainingTargetCount: 2,
          nonActionableTargetCount: 0,
          unknownTargetCount: 0,
          allTargetsDispositioned: false
        },
        targetHistory: [
          ...restrictedModerationReview.evidence.targetHistory,
          {
            targetType: "video",
            targetId: "restricted-video-2",
            status: "published",
            hasMediaReferences: true,
            mediaReferenceCount: 1
          }
        ]
      }
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: multiTargetReview });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );

    expect(
      await screen.findByRole("button", {
        name: "Hide restricted target restricted-post-1"
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Hide restricted target restricted-video-2"
      })
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Restricted target disposition progress")
    ).toHaveTextContent(/0 of 2 actionable targets complete; 2 remain/i);
    expect(
      screen.getByRole("button", {
        name: "Open preservation and legal escalation for restricted case restricted-case-1"
      })
    ).toBeTruthy();
  });

  it("requires a typed reviewed decision before closing remaining restricted targets", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: restrictedModerationReview });
      }
      if (
        path === "/api/admin/moderation-cases/restricted-case-1/restricted-decision" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({ ok: true });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );
    await screen.findByText("Reviewed case-level no-action decision");

    const decisionButton = screen.getByRole("button", {
      name: "Close remaining restricted targets with reviewed decision restricted-case-1"
    });
    expect(decisionButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(
      screen.getByLabelText("Restricted case-level decision reason restricted-case-1"),
      "Reviewed all retained metadata and no further platform action is supported."
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact restricted case-level confirmation restricted-case-1"),
      "CLOSE RESTRICTED CASE restricted-case-1"
    );
    fireEvent.press(
      screen.getByRole("button", {
        name: "Close remaining restricted targets with reviewed decision restricted-case-1"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/admin/moderation-cases/restricted-case-1/restricted-decision",
        {
          method: "POST",
          body: {
            decision: "close_no_further_action",
            reason:
              "Reviewed all retained metadata and no further platform action is supported.",
            confirmation: "CLOSE RESTRICTED CASE restricted-case-1"
          }
        }
      )
    );
  });

  it("shows a completed exact target without offering a second conflicting action", async () => {
    const completedReview = {
      ...restrictedModerationReview,
      evidence: {
        ...restrictedModerationReview.evidence,
        dispositionProgress: {
          retainedTargetCount: 1,
          actionableTargetCount: 1,
          completedTargetCount: 1,
          remainingTargetCount: 0,
          nonActionableTargetCount: 0,
          unknownTargetCount: 0,
          allTargetsDispositioned: true
        },
        targetHistory: [
          {
            ...restrictedModerationReview.evidence.targetHistory[0],
            disposition: {
              state: "completed",
              action: "hide",
              startedAt: "2026-08-15T14:06:00.000Z",
              completedAt: "2026-08-15T14:07:00.000Z"
            }
          }
        ]
      }
    };
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/admin/moderation-cases") {
        return Promise.resolve({ cases: [restrictedModerationCase] });
      }
      if (path === "/api/admin/moderation-cases/restricted-case-1/restricted-review") {
        return Promise.resolve({ ok: true, case: completedReview });
      }
      return defaultAdminApi(path);
    });

    const screen = render(<PlatformAdminRoute />);
    await screen.findByText("Restricted severe-harm case · critical · reviewing");
    fireEvent.press(
      screen.getByRole("button", {
        name: "Open restricted safety review restricted-case-1"
      })
    );

    expect(
      await screen.findByLabelText("Restricted target disposition restricted-post-1")
    ).toHaveTextContent(/reviewed disposition completed: hide/i);
    expect(
      screen.queryByRole("button", {
        name: "Hide restricted target restricted-post-1"
      })
    ).toBeNull();
    expect(screen.queryByText("Reviewed case-level no-action decision")).toBeNull();
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
