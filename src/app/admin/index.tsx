import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError, apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import ComplimentaryGrantsAdminCard from "@/features/admin/ComplimentaryGrantsAdminCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Overview = {
  totalUsers: number;
  onlineNow: number;
  activeToday: number;
  onlineWindowMinutes: number;
  byMode: Record<string, number>;
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
};

type Usage = {
  activeUsers: { last7Days: number; last30Days: number };
  newUsers: { last7Days: number; last30Days: number };
  activity: {
    last24Hours: Record<string, number>;
    last7Days: Record<string, number>;
  };
  note?: string;
};

type SecurityIssue = {
  id: string;
  source: string;
  kind: "security" | "safety" | "enforcement" | "reliability";
  category: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "resolved";
  affected: string;
  occurredAt: string;
  resolvedAt?: string | null;
  investigationHref: string;
};

type SecurityCenter = {
  tally: {
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byKind: Record<string, number>;
    bySource: Record<string, number>;
  };
  issues: SecurityIssue[];
  coverage: Array<{
    source: string;
    label: string;
    state: "connected" | "external_only" | "not_configured" | "error" | "truncated";
    note?: string;
  }>;
  note?: string;
};

type RegulatedCommerceAdmin = {
  tallies: {
    authorizations: Record<string, number>;
    decisions: Record<string, number>;
  };
  authorizations: Array<{
    _id: string;
    storefrontId?: { _id?: string; name?: string; slug?: string };
    userId?: { email?: string; name?: string; displayName?: string };
    businessRoles: string[];
    productClasses: string[];
    jurisdiction: {
      countryCode: string;
      subdivisionCode?: string;
      locality?: string;
    };
    authorizationType: string;
    authorizationIdentifier: string;
    issuer: string;
    evidenceUrl?: string;
    effectiveAt?: string | null;
    expiresAt?: string | null;
    reviewStatus: string;
    reviewNotes?: string;
    createdAt?: string;
  }>;
  decisions: Array<{ _id: string; decision: string }>;
  capabilities: string[];
  fulfillmentMethods: string[];
};

type AdminUser = {
  _id: string;
  email: string;
  displayName?: string;
  name?: string;
  role?: string;
  plan?: string;
  mode?: string;
  subscriptionStatus?: string;
  accountStatus?: string;
  aiTokens?: number;
  maxTokens?: number;
  lastActiveAt?: string;
  accountRemovalReviewAllowed?: boolean;
  knownTestAccount?: boolean;
  ownerControlledTestAccount?: boolean;
  platformIdentityProtected?: boolean;
  billingTruth?: {
    source:
      | "stripe"
      | "gift"
      | "app_store"
      | "local_trial"
      | "free"
      | "complimentary"
      | "platform"
      | "test"
      | "unknown";
    paymentState: "paid" | "nonpaid";
    stripeLinked: boolean;
    paidThrough: string | null;
    trialExpiry: string | null;
  };
};

const ADMIN_BILLING_SOURCE_LABELS: Record<
  NonNullable<AdminUser["billingTruth"]>["source"],
  string
> = {
  stripe: "Stripe",
  gift: "Gift",
  app_store: "App Store",
  local_trial: "Local / promotional trial (card-free)",
  free: "Free",
  complimentary: "Complimentary access",
  platform: "Protected platform account",
  test: "Test access",
  unknown: "Unknown / unresolved"
};

function displayAdminBillingDate(value: string | null) {
  const dateKey = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "Not reported";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "Invalid date reported";
  }
  return date.toLocaleDateString();
}

function AdminBillingTruth({
  target,
  styles
}: {
  target: AdminUser;
  styles: ReturnType<typeof createPlatformAdminStyles>;
}) {
  const truth = target.billingTruth;

  if (!truth) {
    return (
      <View
        accessibilityLabel={`Billing truth for ${target.email}`}
        style={styles.billingTruth}
      >
        <Text accessibilityRole="header" style={styles.billingTruthTitle}>
          Billing truth
        </Text>
        <Text accessibilityRole="alert" style={styles.meta}>
          Billing truth was not reported by the server. Do not infer payment from the
          account plan or subscription status.
        </Text>
      </View>
    );
  }

  const isLocalTrial = truth.source === "local_trial";
  const isPaid = truth.paymentState === "paid" && !isLocalTrial;

  return (
    <View
      accessibilityLabel={`Billing truth for ${target.email}`}
      style={styles.billingTruth}
    >
      <Text accessibilityRole="header" style={styles.billingTruthTitle}>
        Billing truth
      </Text>
      <Text style={styles.meta}>
        Billing source:{" "}
        {ADMIN_BILLING_SOURCE_LABELS[truth.source] || ADMIN_BILLING_SOURCE_LABELS.unknown}
      </Text>
      <Text style={styles.meta}>Stripe linked: {truth.stripeLinked ? "Yes" : "No"}</Text>
      <Text style={styles.meta}>Payment state: {isPaid ? "Paid" : "Not paid"}</Text>
      <Text style={styles.meta}>
        Paid through:{" "}
        {isLocalTrial
          ? "Not applicable to card-free trial"
          : displayAdminBillingDate(truth.paidThrough)}
      </Text>
      <Text style={styles.meta}>
        Trial expiry: {displayAdminBillingDate(truth.trialExpiry)}
      </Text>
    </View>
  );
}

function platformIdentityProtectionConfirmation(target: AdminUser) {
  return `PROTECT PLATFORM IDENTITY ${target._id} ${target.email.toLowerCase()}`;
}

type RemovalCategory =
  | "test_cleanup"
  | "user_request"
  | "policy_enforcement"
  | "security_fraud"
  | "legal_process"
  | "other";

const REMOVAL_CATEGORY_LABELS: Record<RemovalCategory, string> = {
  test_cleanup: "Test account cleanup",
  user_request: "User request",
  policy_enforcement: "Policy enforcement",
  security_fraud: "Security or fraud",
  legal_process: "Legal process",
  other: "Other"
};

function isRemovalCategory(value: unknown): value is RemovalCategory {
  return typeof value === "string" && value in REMOVAL_CATEGORY_LABELS;
}

type AccountRemovalPreview = {
  ok: boolean;
  dryRun: boolean;
  target: { id: string; email: string };
  accountRemovalReviewAllowed: boolean;
  knownTestAccount?: boolean;
  ownerControlledTestAccount?: boolean;
  blockers: string[];
  deletionMode: string;
  nextConfirmation: string;
  allowedRemovalCategories: RemovalCategory[];
  reviewToken?: string;
  reviewExpiresAt?: string;
};

function hasUsableAccountRemovalReview(preview: AccountRemovalPreview) {
  if (typeof preview.reviewToken !== "string" || !preview.reviewToken.trim()) {
    return false;
  }
  if (typeof preview.reviewExpiresAt !== "string") return false;
  const expiresAt = new Date(preview.reviewExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

type RemovedAdminUser = {
  archiveId: string;
  anonymizedUserId: string;
  status?: string;
  archivedAt?: string | null;
  purgeAfter?: string | null;
  legalHold?: boolean;
  purgedAt?: string | null;
  failureCode?: string;
};

const REMOVED_ACCOUNT_CASE_SCOPES = [
  "account.identity",
  "account.profile",
  "account.subscription",
  "account.security",
  "account.operations",
  "grow.lifecycle",
  "grow.commercial_tools",
  "ai.activity",
  "communications.activity",
  "community.activity",
  "commerce.activity",
  "courses.activity",
  "payments.activity",
  "moderation.safety",
  "media.activity",
  "facility.membership",
  "facility.operations",
  "creator.profile",
  "businessdesk.commercial",
  "businessdesk.facility_activity"
] as const;

type RemovedAccountCaseScope = (typeof REMOVED_ACCOUNT_CASE_SCOPES)[number];

const REMOVED_ACCOUNT_CASE_SCOPE_LABELS: Record<RemovedAccountCaseScope, string> = {
  "account.identity": "Account identity",
  "account.profile": "Profile, preferences, and relationship metadata",
  "account.subscription": "Subscriptions and payouts",
  "account.security": "Security and account status",
  "account.operations": "Support, audit, export, and delivery history",
  "grow.lifecycle": "Grows, plants, logs, and tasks",
  "grow.commercial_tools": "Recipes, soil mixes, pheno, profiles, and inventory",
  "ai.activity": "AI tools and diagnoses",
  "communications.activity": "Lives, chat, comments, and notifications",
  "community.activity": "Feed, forum, posts, and community activity",
  "commerce.activity": "Storefront, products, orders, and advertising",
  "courses.activity": "Courses and learning activity",
  "payments.activity": "Purchases, earnings, gifts, and billing records",
  "moderation.safety": "Reports and moderation history",
  "media.activity": "Media-record metadata",
  "facility.membership": "Facility roles and memberships",
  "facility.operations": "Facility operations and compliance participation",
  "creator.profile": "Creator profile activity",
  "businessdesk.commercial": "Commercial Business Desk",
  "businessdesk.facility_activity": "Facility Business Desk activity"
};

type RemovedAccountCaseAccessDraft = {
  evidenceRequestId: string;
  purpose: string;
  scopes: RemovedAccountCaseScope[];
  confirmation: string;
  reviewToken: string;
  reviewExpiresAt: string;
};

type RemovedAccountCaseAccessResult = {
  caseAccessOnly?: boolean;
  externalTransmissionPerformed?: boolean;
  archiveId: string;
  evidenceRequestId: string;
  dateWindow?: { from?: string | null; to?: string | null };
  itemCounts?: Record<string, number>;
  data?: Record<string, unknown>;
};

function removedAccountCaseConfirmation(archiveId: string, evidenceRequestId: string) {
  return `ACCESS ${archiveId} FOR ${evidenceRequestId.trim()}`;
}

function emptyRemovedAccountCaseAccessDraft(): RemovedAccountCaseAccessDraft {
  return {
    evidenceRequestId: "",
    purpose: "",
    scopes: [],
    confirmation: "",
    reviewToken: "",
    reviewExpiresAt: ""
  };
}

function hasUsableRemovedAccountCaseReview(draft: RemovedAccountCaseAccessDraft) {
  if (!draft.reviewToken || !draft.reviewExpiresAt) return false;
  const expiresAt = new Date(draft.reviewExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

const ACCOUNT_REMOVAL_BLOCKER_LABELS: Record<string, string> = {
  platform_admin: "This is a protected platform Admin account.",
  facility_owner: "This account owns a facility that must be handled first.",
  course_creator: "This account owns a course that must be handled first.",
  active_or_unsettled_subscription:
    "This account has an active, trialing, past-due, or otherwise unsettled subscription.",
  stripe_customer: "This account is linked to a Stripe customer.",
  stripe_subscription: "This account is linked to a Stripe subscription.",
  stripe_unsettled_invoice:
    "Stripe reports an open, draft, or uncollectible invoice that must be resolved first.",
  stripe_reconciliation_unavailable:
    "Stripe could not be verified. Removal stays blocked until the live payment check succeeds.",
  stripe_reconciliation_incomplete:
    "Stripe returned more payment history than the bounded safety review could verify. Review it in Stripe before removal.",
  stripe_connect_account: "This account is linked to a Stripe Connect account.",
  gift_subscription: "This account is linked to a gift subscription."
};

function accountRemovalBlockerLabel(code: string) {
  return (
    ACCOUNT_REMOVAL_BLOCKER_LABELS[code] ||
    `Removal is blocked by retained account state: ${code.replace(/_/g, " ")}.`
  );
}

function blockedAccountRemovalPreview(
  error: unknown,
  target: AdminUser
): AccountRemovalPreview | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const data = error.data;
  if (
    !data ||
    typeof data !== "object" ||
    data.ok !== false ||
    data.dryRun !== true ||
    data.target?.id !== target._id ||
    String(data.target?.email || "").toLowerCase() !== target.email.toLowerCase() ||
    data.accountRemovalReviewAllowed !== true ||
    !Array.isArray(data.blockers) ||
    data.blockers.length === 0 ||
    data.blockers.some((blocker: unknown) => typeof blocker !== "string") ||
    typeof data.deletionMode !== "string" ||
    typeof data.nextConfirmation !== "string" ||
    !Array.isArray(data.allowedRemovalCategories) ||
    data.allowedRemovalCategories.length === 0 ||
    data.allowedRemovalCategories.some(
      (category: unknown) => !isRemovalCategory(category)
    )
  ) {
    return null;
  }
  return data as AccountRemovalPreview;
}

type ModerationCase = {
  _id: string;
  restricted?: boolean;
  caseKind?: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  severity: string;
  status: string;
  action: string;
  subjectUserId?: string;
  reportCount?: number;
  lastReportedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  actionHistory?: Array<{
    action: string;
    reason?: string;
    createdAt?: string;
    metadata?: { previousCategory?: string; category?: string };
  }>;
  evidenceSnapshot?: {
    automated?: boolean;
    targetUrl?: string;
    classification?: {
      category?: string;
      confidence?: number;
      matchedSignals?: string[];
      policyVersion?: string;
    };
    content?: { title?: string; body?: string; content?: string; tags?: string[] };
  };
};

type RestrictedSevereTarget = {
  targetType: string;
  targetId: string;
  subjectUserId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  status?: string;
  isPublished?: boolean;
  isHidden?: boolean;
  hasMediaReferences?: boolean;
  mediaReferenceCount?: number;
  disposition?: {
    state: "started" | "completed";
    action: string;
    actorUserId?: string;
    startedAt?: string | null;
    completedAt?: string | null;
  };
};

type RestrictedSevereReview = ModerationCase & {
  restricted: true;
  caseKind: "restricted_severe_harm";
  evidence: {
    categories: string[];
    highestSeverity?: string;
    categoryCounts?: Record<string, number>;
    distinctTargetCount?: number;
    dispositionProgress?: {
      retainedTargetCount: number;
      actionableTargetCount: number;
      completedTargetCount: number;
      remainingTargetCount: number;
      nonActionableTargetCount: number;
      unknownTargetCount: number;
      allTargetsDispositioned: boolean;
    };
    caseDisposition?: {
      decision: string;
      createdAt?: string | null;
    } | null;
    targetHistory: RestrictedSevereTarget[];
    preActionHistory?: Array<{
      action?: string;
      actorUserId?: string;
      capturedAt?: string | null;
      target?: RestrictedSevereTarget;
    }>;
    reports: Array<{
      reportId: string;
      reporterUserId?: string;
      contentType?: string;
      contentId?: string;
      category?: string;
      reason?: string;
      status?: string;
      createdAt?: string | null;
      resolvedAt?: string | null;
    }>;
    reportWindow?: {
      ordering?: string;
      limit?: number;
      returned?: number;
      truncated?: boolean;
    };
    handling: {
      minimumNecessary?: boolean;
      snapshotMode?: string;
      rawMediaIncluded?: boolean;
      storageLocationsIncluded?: boolean;
      objectKeysIncluded?: boolean;
      secretsIncluded?: boolean;
      automaticExternalAuthorityContact?: boolean;
      automaticLawEnforcementContact?: boolean;
    };
  };
};

function validRestrictedReviewTarget(value: unknown): value is RestrictedSevereTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as RestrictedSevereTarget;
  const disposition = target.disposition;
  const dispositionValid =
    disposition === undefined ||
    (Boolean(disposition) &&
      ["started", "completed"].includes(String(disposition.state || "")) &&
      typeof disposition.action === "string" &&
      Boolean(disposition.action.trim()));
  return Boolean(
    typeof target.targetType === "string" &&
    target.targetType.trim() &&
    typeof target.targetId === "string" &&
    target.targetId.trim() &&
    dispositionValid
  );
}

function uniqueRestrictedReviewTargets(review: RestrictedSevereReview) {
  const seen = new Set<string>();
  return review.evidence.targetHistory.filter((target) => {
    const key = `${target.targetType}:${target.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validRestrictedDispositionProgress(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const progress = value as NonNullable<
    RestrictedSevereReview["evidence"]["dispositionProgress"]
  >;
  return (
    [
      progress.retainedTargetCount,
      progress.actionableTargetCount,
      progress.completedTargetCount,
      progress.remainingTargetCount,
      progress.nonActionableTargetCount,
      progress.unknownTargetCount
    ].every((count) => Number.isInteger(count) && count >= 0) &&
    typeof progress.allTargetsDispositioned === "boolean"
  );
}

function restrictedReviewErrorMessage(error: unknown, operation: "open" | "action") {
  if (error instanceof ApiError) {
    if (error.status === 403 || error.code === "SEVERE_HARM_REVIEWER_REQUIRED") {
      return "Your Admin account is not configured for restricted severe-harm review. No case details were retained on this screen.";
    }
    if (error.status === 409 || error.code === "SEVERE_HARM_CASE_NOT_ACTIVE") {
      return "This restricted case is no longer active. Refresh the Admin queue before taking any action.";
    }
    if (error.status === 404) {
      return "This restricted case is no longer available in the active review lane.";
    }
  }
  const fallback =
    operation === "open"
      ? "The audited restricted review could not be opened. No case details were retained on this screen."
      : "The restricted moderation action did not complete. Reopen the audited review before trying again.";
  return fallback;
}

function moderationPreview(item: ModerationCase) {
  const content = item.evidenceSnapshot?.content;
  return String(content?.content || content?.body || content?.title || "").trim();
}

const MODERATABLE_TARGETS = new Set([
  "post",
  "forumPost",
  "comment",
  "course",
  "commercialPost",
  "feedItem",
  "storefrontProduct",
  "video",
  "videoComment",
  "liveSession",
  "liveChatMessage",
  "growTimelinePublicCopy"
]);

export function supportsModerationActions(targetType?: string) {
  return MODERATABLE_TARGETS.has(String(targetType || ""));
}

function matchesModerationTargetRoute(targetType: string, pathname: string) {
  if (targetType === "forumPost" || targetType === "comment") {
    return pathname.startsWith("/forum/post/") || pathname === "/forum/post";
  }
  if (targetType === "course") {
    return pathname === "/courses" || /^\/store\/[^/]+\/courses\/[^/]+$/.test(pathname);
  }
  if (targetType === "video" || targetType === "videoComment") {
    return pathname.startsWith("/videos/");
  }
  if (targetType === "commercialPost") {
    return pathname === "/feed" || pathname.endsWith("/feed");
  }
  if (targetType === "feedItem" || targetType === "post") return pathname === "/feed";
  if (targetType === "storefrontProduct") {
    return pathname === "/store" || /^\/store\/[^/]+\/products\/[^/]+$/.test(pathname);
  }
  if (targetType === "liveSession" || targetType === "liveChatMessage") {
    return pathname === "/live-session";
  }
  if (targetType === "growTimelinePublicCopy") {
    return pathname.startsWith("/grow-timeline/");
  }
  if (targetType === "user") return pathname === "/profile";
  return false;
}

export function moderationTargetHref(item: ModerationCase) {
  const targetType = String(item.targetType || "");
  const submitted = String(item.evidenceSnapshot?.targetUrl || "").trim();
  if (submitted) {
    try {
      const parsed = new URL(submitted, "https://growpathai.com");
      if (
        (parsed.hostname === "growpathai.com" ||
          parsed.hostname.endsWith(".growpathai.com")) &&
        matchesModerationTargetRoute(targetType, parsed.pathname)
      ) {
        if (targetType === "course") {
          parsed.searchParams.set("moderationCaseId", String(item._id || ""));
        }
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Fall back to the canonical route for the stored target type.
    }
  }

  const id = encodeURIComponent(String(item.targetId || ""));
  if (targetType === "forumPost") return `/forum/post/${id}`;
  if (targetType === "course") {
    return `/courses?courseId=${id}&moderationCaseId=${encodeURIComponent(
      String(item._id || "")
    )}`;
  }
  if (targetType === "video") return `/videos/${id}`;
  if (targetType === "commercialPost") return `/feed?campaignId=${id}`;
  if (targetType === "feedItem") return `/feed?feedItemId=${id}`;
  if (targetType === "storefrontProduct") return `/store?q=${id}`;
  if (targetType === "liveSession") return `/live-session?sessionId=${id}`;
  return `/admin?targetType=${encodeURIComponent(targetType)}&targetId=${id}`;
}

type EvidenceRequest = {
  _id: string;
  restricted?: boolean;
  requestType?: string;
  requesterName?: string;
  requesterOrganization?: string;
  requesterEmail?: string;
  authorityDescription?: string;
  jurisdiction?: string;
  targetUserId?: string | { _id?: string; email?: string; displayName?: string } | null;
  scope?: string;
  status: string;
  preservationHold: boolean;
  evidenceItemCount?: number;
  userNoticeStatus?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  evidenceItems?: Array<{
    _id?: string;
    sourceType: string;
    sourceId: string;
    description?: string;
    sha256?: string;
    preservedAt?: string | null;
    preservedBy?: string | { _id?: string; email?: string } | null;
  }>;
  createdBy?: string | { _id?: string; email?: string } | null;
  reviewedBy?: string | { _id?: string; email?: string } | null;
  approvedBy?: string | { _id?: string; email?: string } | null;
  requesterIdentityVerification?: {
    verified?: boolean;
    method?: string;
    reference?: string;
    verifiedAt?: string | null;
    verifiedBy?: string | { _id?: string; email?: string } | null;
  };
  requesterAuthorityVerification?: {
    verified?: boolean;
    method?: string;
    reference?: string;
    verifiedAt?: string | null;
    verifiedBy?: string | { _id?: string; email?: string } | null;
  };
  jurisdictionReview?: {
    reviewed?: boolean;
    determination?: string;
    reference?: string;
    reviewedAt?: string | null;
    reviewedBy?: string | { _id?: string; email?: string } | null;
  };
  minimumNecessaryScope?: string;
  approvedArchiveScopes?: RemovedAccountCaseScope[];
  legalReview?: {
    decision?: string;
    approverName?: string;
    approverEmail?: string;
    approverRole?: string;
    reference?: string;
    reviewedAt?: string | null;
    reviewedBy?: string | { _id?: string; email?: string } | null;
  };
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
};

type EvidenceIdentityReviewDraft = {
  identityMethod: string;
  identityReference: string;
  authorityMethod: string;
  authorityReference: string;
};

type EvidenceLegalReviewDraft = {
  jurisdiction: string;
  jurisdictionDetermination: string;
  jurisdictionReference: string;
  minimumNecessaryScope: string;
  approvedArchiveScopes: RemovedAccountCaseScope[];
  userNoticeStatus: "" | "permitted" | "delayed" | "prohibited" | "sent";
  approverName: string;
  approverEmail: string;
  approverRole: string;
  approverReference: string;
};

function emptyEvidenceIdentityReviewDraft(): EvidenceIdentityReviewDraft {
  return {
    identityMethod: "",
    identityReference: "",
    authorityMethod: "",
    authorityReference: ""
  };
}

function evidenceLegalReviewDraft(item?: EvidenceRequest): EvidenceLegalReviewDraft {
  const approvedArchiveScopes = Array.isArray(item?.approvedArchiveScopes)
    ? item.approvedArchiveScopes.filter((scope): scope is RemovedAccountCaseScope =>
        REMOVED_ACCOUNT_CASE_SCOPES.includes(scope as RemovedAccountCaseScope)
      )
    : [];
  const notice = String(item?.userNoticeStatus || "");
  return {
    jurisdiction: item?.jurisdiction || "",
    jurisdictionDetermination: "",
    jurisdictionReference: "",
    minimumNecessaryScope: item?.minimumNecessaryScope || "",
    approvedArchiveScopes,
    userNoticeStatus: ["permitted", "delayed", "prohibited", "sent"].includes(notice)
      ? (notice as EvidenceLegalReviewDraft["userNoticeStatus"])
      : "",
    approverName: "",
    approverEmail: "",
    approverRole: "",
    approverReference: ""
  };
}

type AdminAuditEvent = {
  _id?: string;
  actorUserId?: string | { _id?: string; email?: string; displayName?: string } | null;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

const EVIDENCE_REQUEST_TYPES = [
  "user_export",
  "authorized_representative",
  "preservation",
  "subpoena",
  "court_order",
  "search_warrant",
  "emergency",
  "other"
] as const;

type EvidenceRequestType = (typeof EVIDENCE_REQUEST_TYPES)[number];

function routeParam(value: string | string[] | undefined) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
}

function adminReferenceLabel(
  value:
    | string
    | { _id?: string; email?: string; displayName?: string }
    | null
    | undefined
) {
  if (!value) return "not recorded";
  if (typeof value === "string") return value;
  return value.email || value.displayName || value._id || "not recorded";
}

function displayAdminDate(value: string | null | undefined) {
  const dateKey = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "not specified";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString();
}

type SupportRequest = {
  _id: string;
  name: string;
  replyEmail: string;
  accountEmail?: string;
  topic: string;
  subject: string;
  message: string;
  workspace?: string;
  page?: string;
  status: "open" | "in_progress" | "resolved" | "spam";
  createdAt: string;
  emailDelivery?: { sent?: boolean };
  assignedTo?: string | null;
  assignedAt?: string | null;
  adminNotes?: Array<{
    _id?: string;
    body: string;
    createdBy?: string;
    createdAt?: string;
  }>;
};

type KnowledgeEntry = {
  _id: string;
  entryId: string;
  entryType: "source" | "method";
  title: string;
  domain?: string;
  status: "draft" | "approved" | "retired";
  reliabilityTier?: "A" | "B" | "C" | "D" | "";
  guidance?: string;
  preferredAuthors?: string[];
  trustedFor?: string[];
  notTrustedFor?: string[];
  requiresCrossCheck?: boolean;
  crossCheckRequirements?: string[];
  revision: number;
  reviewDueAt?: string;
  reviewStatus?:
    | "current"
    | "review_overdue"
    | "review_date_missing"
    | "review_date_invalid";
};

type MethodReviewProposal = {
  _id: string;
  methodId: string;
  status: "pending_review" | "accepted_for_edit" | "rejected" | "superseded";
  outcomeCount: number;
  proposedReview: string;
  limitations?: string[];
  agreementCounts?: Record<string, number>;
  decisionCounts?: Record<string, number>;
};

type HarvestCalibrationCandidate = {
  feedbackId: string;
  reviewId: string;
  submittedAt?: string;
  provider?: string;
  model?: string;
  reviewPolicyVersion?: string;
  evidenceAssetIds?: string[];
  aiVisibleSample?: {
    confirmedAmber?: number | null;
    possibleAmber?: number | null;
    resolvedHeadCount?: number;
    countingConfidence?: string;
  };
  ownerReview?: {
    estimateAlignment?: string;
    visibleAmberPercent?: number | null;
  };
  eligibility?: {
    status?: string;
    groundTruth?: boolean;
    requiredNextSteps?: string[];
  };
};

type HarvestReconciliationOperation = {
  operationId: string;
  workspaceType: string;
  workspaceId: string;
  facilityId?: string | null;
  selectedEvidenceCount: number;
  analyzedEvidenceCount: number;
  batchCount: number;
  completedBatchCount: number;
  customerCredits: number;
  state: string;
  creditState: string;
  error?: { code?: string; message?: string; retryable?: boolean } | null;
  reconciliationDisposition?: string;
  reconciledAt?: string | null;
  updatedAt?: string;
};

function percentLabel(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "not available";
  const numeric = Number(value);
  return `${Math.round(numeric <= 1 ? numeric * 100 : numeric)}%`;
}

const RELIABILITY_TIERS = ["A", "B", "C", "D"] as const;

function splitAdminList(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

function nextReliabilityTier(value: string) {
  const current = RELIABILITY_TIERS.indexOf(value as (typeof RELIABILITY_TIERS)[number]);
  return RELIABILITY_TIERS[(current + 1) % RELIABILITY_TIERS.length];
}

function defaultKnowledgeReviewDate() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 180);
  return value.toISOString().slice(0, 10);
}

function Metric({
  label,
  value,
  helper
}: {
  label: string;
  value: number;
  helper: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPlatformAdminStyles(palette), [palette]);

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{Number(value || 0).toLocaleString()}</Text>
      <Text style={styles.meta}>{helper}</Text>
    </View>
  );
}

export default function PlatformAdminRoute() {
  const { user, logout } = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPlatformAdminStyles(palette), [palette]);
  const inputThemeProps = useMemo(
    () => ({
      placeholderTextColor: palette.textMuted,
      selectionColor: palette.accent
    }),
    [palette.accent, palette.textMuted]
  );
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    moderationCaseId?: string | string[];
    section?: string | string[];
    targetType?: string | string[];
    targetId?: string | string[];
  }>();
  const focusedSection = routeParam(routeParams.section).toLowerCase();
  const focusedTargetType = routeParam(routeParams.targetType);
  const focusedTargetKind = focusedTargetType.toLowerCase();
  const focusedTargetId = routeParam(routeParams.targetId);
  const focusedModerationCaseId =
    routeParam(routeParams.moderationCaseId) ||
    (focusedTargetKind === "moderationcase" ? focusedTargetId : "");
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [securityCenter, setSecurityCenter] = useState<SecurityCenter | null>(null);
  const [showResolvedSecurity, setShowResolvedSecurity] = useState(false);
  const orderedSecurityIssues = useMemo(() => {
    const issues = securityCenter?.issues || [];
    if (focusedTargetKind !== "securityissue" || !focusedTargetId) return issues;
    return [...issues].sort((left, right) => {
      if (left.id === focusedTargetId) return -1;
      if (right.id === focusedTargetId) return 1;
      return 0;
    });
  }, [focusedTargetId, focusedTargetKind, securityCenter?.issues]);
  const visibleSecurityIssues = useMemo(
    () =>
      orderedSecurityIssues.filter(
        (issue) =>
          showResolvedSecurity ||
          issue.status === "open" ||
          (focusedTargetKind === "securityissue" && issue.id === focusedTargetId)
      ),
    [focusedTargetId, focusedTargetKind, orderedSecurityIssues, showResolvedSecurity]
  );
  const [regulatedCommerce, setRegulatedCommerce] =
    useState<RegulatedCommerceAdmin | null>(null);
  const [regulatedReviewNotes, setRegulatedReviewNotes] = useState<
    Record<string, string>
  >({});
  const [regulatedDecisionDraft, setRegulatedDecisionDraft] = useState({
    storefrontId: "",
    authorizationIds: [] as string[],
    capability: "external_product_handoff",
    productClass: "",
    originCountryCode: "",
    originSubdivisionCode: "",
    destinationCountryCode: "",
    destinationSubdivisionCode: "",
    buyerEligibility: "",
    fulfillmentMethod: "external_handoff",
    decision: "review_required",
    policyVersion: "regulated-commerce-v1",
    reasonCodes: ""
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [removedUsers, setRemovedUsers] = useState<RemovedAdminUser[]>([]);
  const [removedUsersNextCursor, setRemovedUsersNextCursor] = useState<string | null>(
    null
  );
  const [selectedRemovedArchiveId, setSelectedRemovedArchiveId] = useState("");
  const [removedCaseAccessDrafts, setRemovedCaseAccessDrafts] = useState<
    Record<string, RemovedAccountCaseAccessDraft>
  >({});
  const [removedCaseAccessResults, setRemovedCaseAccessResults] = useState<
    Record<string, RemovedAccountCaseAccessResult | null>
  >({});
  const orderedUsers = useMemo(() => {
    if (focusedTargetKind !== "user" || !focusedTargetId) return users;
    return [...users].sort((left, right) => {
      if (left._id === focusedTargetId) return -1;
      if (right._id === focusedTargetId) return 1;
      return 0;
    });
  }, [focusedTargetId, focusedTargetKind, users]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  // Restricted safety evidence is deliberately memory-only. It is never put in
  // route params, persisted storage, exported files, or the generic Admin list.
  const [restrictedCaseReviews, setRestrictedCaseReviews] = useState<
    Record<string, RestrictedSevereReview | null>
  >({});
  const [restrictedCaseDecisionDrafts, setRestrictedCaseDecisionDrafts] = useState<
    Record<string, { reason: string; confirmation: string }>
  >({});
  const orderedModerationCases = useMemo(() => {
    if (!focusedModerationCaseId) return moderationCases;
    return [...moderationCases].sort((left, right) => {
      if (left._id === focusedModerationCaseId) return -1;
      if (right._id === focusedModerationCaseId) return 1;
      return 0;
    });
  }, [focusedModerationCaseId, moderationCases]);
  const [evidenceRequests, setEvidenceRequests] = useState<EvidenceRequest[]>([]);
  const orderedEvidenceRequests = useMemo(() => {
    if (focusedTargetKind !== "legalevidencerequest" || !focusedTargetId) {
      return evidenceRequests;
    }
    return [...evidenceRequests].sort((left, right) => {
      if (left._id === focusedTargetId) return -1;
      if (right._id === focusedTargetId) return 1;
      return 0;
    });
  }, [evidenceRequests, focusedTargetId, focusedTargetKind]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const orderedSupportRequests = useMemo(() => {
    if (focusedTargetKind !== "supportrequest" || !focusedTargetId) {
      return supportRequests;
    }
    return [...supportRequests].sort((left, right) => {
      if (left._id === focusedTargetId) return -1;
      if (right._id === focusedTargetId) return 1;
      return 0;
    });
  }, [focusedTargetId, focusedTargetKind, supportRequests]);
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const activeSupportRequests = useMemo(
    () => supportRequests.filter((item) => !["resolved", "spam"].includes(item.status)),
    [supportRequests]
  );
  const completedSupportRequests = useMemo(
    () => supportRequests.filter((item) => ["resolved", "spam"].includes(item.status)),
    [supportRequests]
  );
  const visibleSupportRequests = useMemo(() => {
    if (showCompletedWork) return orderedSupportRequests;
    const active = orderedSupportRequests.filter(
      (item) => !["resolved", "spam"].includes(item.status)
    );
    if (focusedTargetKind !== "supportrequest" || !focusedTargetId) return active;
    const focused = orderedSupportRequests.find((item) => item._id === focusedTargetId);
    return focused && ["resolved", "spam"].includes(focused.status)
      ? [focused, ...active]
      : active;
  }, [focusedTargetId, focusedTargetKind, orderedSupportRequests, showCompletedWork]);
  const activeModerationCases = useMemo(
    () =>
      orderedModerationCases.filter(
        (item) => !["actioned", "closed"].includes(item.status)
      ),
    [orderedModerationCases]
  );
  const completedModerationCases = useMemo(
    () =>
      orderedModerationCases.filter((item) =>
        ["actioned", "closed"].includes(item.status)
      ),
    [orderedModerationCases]
  );
  const visibleModerationCases = useMemo(() => {
    if (showCompletedWork) return orderedModerationCases;
    if (!focusedModerationCaseId) return activeModerationCases;
    const focused = orderedModerationCases.find(
      (item) => item._id === focusedModerationCaseId
    );
    return focused && ["actioned", "closed"].includes(focused.status)
      ? [focused, ...activeModerationCases]
      : activeModerationCases;
  }, [
    activeModerationCases,
    focusedModerationCaseId,
    orderedModerationCases,
    showCompletedWork
  ]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [methodReviewProposals, setMethodReviewProposals] = useState<
    MethodReviewProposal[]
  >([]);
  const [harvestCalibrationCandidates, setHarvestCalibrationCandidates] = useState<
    HarvestCalibrationCandidate[]
  >([]);
  const [harvestOperations, setHarvestOperations] = useState<
    HarvestReconciliationOperation[]
  >([]);
  const [harvestReconciliationReasons, setHarvestReconciliationReasons] = useState<
    Record<string, string>
  >({});
  const [harvestReconciliationActions, setHarvestReconciliationActions] = useState<
    Record<string, "refund" | "charge">
  >({});
  const [reviewMethodId, setReviewMethodId] = useState("");
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    entryId: "",
    entryType: "source" as "source" | "method",
    title: "",
    domain: "",
    reliabilityTier: "B",
    preferredAuthors: "",
    trustedFor: "",
    notTrustedFor: "",
    requiresCrossCheck: true,
    crossCheckRequirements: "",
    guidance: "",
    reviewDueAt: defaultKnowledgeReviewDate(),
    changeNote: "Initial governance review"
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [moveCategory, setMoveCategory] = useState("general");
  const [sourceModerationCaseId, setSourceModerationCaseId] = useState("");
  const [noticeUser, setNoticeUser] = useState<AdminUser | null>(null);
  const [noticeSubject, setNoticeSubject] = useState("GrowPathAI account warning");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [cleanupPreview, setCleanupPreview] = useState<AccountRemovalPreview | null>(
    null
  );
  const [cleanupReviewId, setCleanupReviewId] = useState("");
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");
  const [removalCategory, setRemovalCategory] = useState<RemovalCategory | "">("");
  const [removalReason, setRemovalReason] = useState("");
  const [permanentActionAcknowledged, setPermanentActionAcknowledged] = useState(false);
  const [platformProtectionTargetId, setPlatformProtectionTargetId] = useState("");
  const [platformProtectionReason, setPlatformProtectionReason] = useState("");
  const [platformProtectionConfirmation, setPlatformProtectionConfirmation] =
    useState("");
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [supportReopenReasons, setSupportReopenReasons] = useState<
    Record<string, string>
  >({});
  const [supportCaseNotes, setSupportCaseNotes] = useState<Record<string, string>>({});
  const [evidenceReasons, setEvidenceReasons] = useState<Record<string, string>>({});
  const [evidenceIdentityReviewDrafts, setEvidenceIdentityReviewDrafts] = useState<
    Record<string, EvidenceIdentityReviewDraft>
  >({});
  const [evidenceLegalReviewDrafts, setEvidenceLegalReviewDrafts] = useState<
    Record<string, EvidenceLegalReviewDraft>
  >({});
  const [evidenceAudit, setEvidenceAudit] = useState<
    Record<string, { loading: boolean; error: string; events: AdminAuditEvent[] }>
  >({});
  const [showEvidenceRequestForm, setShowEvidenceRequestForm] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState({
    requestType: "preservation" as EvidenceRequestType,
    requesterName: "",
    requesterOrganization: "",
    requesterEmail: "",
    authorityDescription: "",
    jurisdiction: "",
    targetUserId: "",
    scope: "",
    dateFrom: "",
    dateTo: ""
  });
  const focusedInvestigation = useMemo(() => {
    if (focusedModerationCaseId) {
      const item = moderationCases.find((entry) => entry._id === focusedModerationCaseId);
      return {
        title: item
          ? item.restricted
            ? `Restricted severe-harm case · ${item.status}`
            : `${item.targetType} moderation · ${item.status}`
          : `Moderation case ${focusedModerationCaseId}`,
        detail: item?.restricted
          ? "Reporter, subject, target, narrative, and evidence details remain hidden until an authorized audited review is opened below."
          : item?.reason || "The linked case is not in the current result set."
      };
    }
    if (focusedTargetKind === "securityissue" && focusedTargetId) {
      const item = securityCenter?.issues.find((entry) => entry.id === focusedTargetId);
      return {
        title: item
          ? `${item.title} · ${item.status}`
          : `Security issue ${focusedTargetId}`,
        detail: item?.summary || "The linked issue is not in the current result set."
      };
    }
    if (focusedTargetKind === "supportrequest" && focusedTargetId) {
      const item = supportRequests.find((entry) => entry._id === focusedTargetId);
      return {
        title: item
          ? `${item.subject} · ${item.status}`
          : `Support request ${focusedTargetId}`,
        detail: item?.message || "The linked request is not in the current result set."
      };
    }
    if (focusedTargetKind === "user" && focusedTargetId) {
      const item = users.find((entry) => entry._id === focusedTargetId);
      return {
        title: item
          ? `${item.email} · ${item.accountStatus || "active"}`
          : `Account ${focusedTargetId}`,
        detail: item
          ? `${item.mode || "personal"} · ${item.plan || "free"}`
          : "The linked account is not in the current result set."
      };
    }
    if (focusedTargetKind === "legalevidencerequest" && focusedTargetId) {
      const item = evidenceRequests.find((entry) => entry._id === focusedTargetId);
      return {
        title: item
          ? `${(item.requestType || "restricted evidence request").replaceAll("_", " ")} · ${item.status}`
          : `Legal/evidence request ${focusedTargetId}`,
        detail: item?.scope || "The linked request is not in the current result set."
      };
    }
    if (focusedSection) {
      return {
        title: `${focusedSection.replaceAll("_", " ")} investigation queue`,
        detail:
          "The linked Admin section is identified below; opening it did not mutate data."
      };
    }
    if (focusedTargetType || focusedTargetId) {
      return {
        title: `${focusedTargetType || "Admin target"} ${focusedTargetId}`.trim(),
        detail:
          "This target type does not have a dedicated focus card. No record was changed."
      };
    }
    return null;
  }, [
    evidenceRequests,
    focusedModerationCaseId,
    focusedSection,
    focusedTargetId,
    focusedTargetKind,
    focusedTargetType,
    moderationCases,
    securityCenter?.issues,
    supportRequests,
    users
  ]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const labels = [
        "Overview",
        "Usage",
        "Security center",
        "Regulated commerce",
        "Users",
        "Moderation",
        "Evidence requests",
        "Support requests",
        "Knowledge registry",
        "Method review",
        "Harvest calibration queue",
        "Harvest provider reconciliation",
        "Removed accounts"
      ];
      const settled = await Promise.allSettled([
        apiRequest("/api/admin/overview"),
        apiRequest("/api/admin/usage"),
        apiRequest("/api/admin/security-center"),
        apiRequest("/api/admin/regulated-commerce"),
        apiRequest(`/api/admin/users${suffix}`),
        apiRequest("/api/admin/moderation-cases"),
        apiRequest("/api/admin/evidence-requests"),
        apiRequest("/api/admin/support-requests"),
        apiRequest("/api/admin/knowledge-registry"),
        apiRequest("/api/admin/method-review-proposals"),
        apiRequest("/api/ai/training/harvest-trichome-calibration"),
        apiRequest("/api/admin/harvest-operations?includeSettled=true"),
        apiRequest("/api/admin/removed-users?limit=50")
      ]);
      const failures: string[] = [];
      const responseAt = (index: number) => {
        const result = settled[index];
        if (result.status === "fulfilled") return result.value;
        const detail = result.reason?.message || "request failed";
        failures.push(`${labels[index]}: ${detail}`);
        return null;
      };

      const overviewResponse = responseAt(0);
      const usageResponse = responseAt(1);
      const securityResponse = responseAt(2);
      const regulatedCommerceResponse = responseAt(3);
      const usersResponse = responseAt(4);
      const moderationResponse = responseAt(5);
      const evidenceResponse = responseAt(6);
      const supportResponse = responseAt(7);
      const knowledgeResponse = responseAt(8);
      const methodReviewResponse = responseAt(9);
      const harvestCalibrationResponse = responseAt(10);
      const harvestOperationsResponse = responseAt(11);
      const removedUsersResponse = responseAt(12);

      if (overviewResponse) setOverview(overviewResponse.overview || null);
      if (usageResponse) setUsage(usageResponse.usage || null);
      if (securityResponse)
        setSecurityCenter({
          tally: securityResponse.tally,
          issues: Array.isArray(securityResponse.issues) ? securityResponse.issues : [],
          coverage: Array.isArray(securityResponse.coverage)
            ? securityResponse.coverage
            : [],
          note: securityResponse.note
        });
      if (regulatedCommerceResponse)
        setRegulatedCommerce({
          tallies: regulatedCommerceResponse.tallies || {
            authorizations: {},
            decisions: {}
          },
          authorizations: Array.isArray(regulatedCommerceResponse.authorizations)
            ? regulatedCommerceResponse.authorizations
            : [],
          decisions: Array.isArray(regulatedCommerceResponse.decisions)
            ? regulatedCommerceResponse.decisions
            : [],
          capabilities: Array.isArray(regulatedCommerceResponse.capabilities)
            ? regulatedCommerceResponse.capabilities
            : [],
          fulfillmentMethods: Array.isArray(regulatedCommerceResponse.fulfillmentMethods)
            ? regulatedCommerceResponse.fulfillmentMethods
            : []
        });
      if (usersResponse)
        setUsers(Array.isArray(usersResponse.users) ? usersResponse.users : []);
      if (moderationResponse) {
        const nextModerationCases = Array.isArray(moderationResponse.cases)
          ? (moderationResponse.cases as ModerationCase[])
          : [];
        setModerationCases(nextModerationCases);
        const retainedRestrictedCaseIds = new Set(
          nextModerationCases
            .filter(
              (item) =>
                item.restricted === true &&
                ["open", "reviewing", "appealed"].includes(item.status)
            )
            .map((item) => item._id)
        );
        setRestrictedCaseReviews((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([caseId]) =>
              retainedRestrictedCaseIds.has(caseId)
            )
          )
        );
        setRestrictedCaseDecisionDrafts((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([caseId]) =>
              retainedRestrictedCaseIds.has(caseId)
            )
          )
        );
      }
      if (evidenceResponse)
        setEvidenceRequests(
          Array.isArray(evidenceResponse.requests) ? evidenceResponse.requests : []
        );
      if (supportResponse)
        setSupportRequests(
          Array.isArray(supportResponse.requests) ? supportResponse.requests : []
        );
      if (knowledgeResponse)
        setKnowledgeEntries(
          Array.isArray(knowledgeResponse.entries) ? knowledgeResponse.entries : []
        );
      if (methodReviewResponse)
        setMethodReviewProposals(
          Array.isArray(methodReviewResponse.proposals)
            ? methodReviewResponse.proposals
            : []
        );
      if (harvestCalibrationResponse)
        setHarvestCalibrationCandidates(
          Array.isArray(harvestCalibrationResponse.items)
            ? harvestCalibrationResponse.items
            : []
        );
      if (harvestOperationsResponse)
        setHarvestOperations(
          Array.isArray(harvestOperationsResponse.operations)
            ? harvestOperationsResponse.operations
            : []
        );
      if (removedUsersResponse) {
        setRemovedUsers(
          Array.isArray(removedUsersResponse.users) ? removedUsersResponse.users : []
        );
        setRemovedUsersNextCursor(
          typeof removedUsersResponse.nextCursor === "string" &&
            removedUsersResponse.nextCursor
            ? removedUsersResponse.nextCursor
            : null
        );
      }
      setError(
        failures.length
          ? `Some administration sections could not load. ${failures.join("; ")}`
          : ""
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load platform administration data.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, query]);

  async function loadMoreRemovedUsers() {
    if (!removedUsersNextCursor || busyId === "removed-users-page") return;
    setBusyId("removed-users-page");
    setError("");
    try {
      const response = await apiRequest(
        `/api/admin/removed-users?limit=50&cursor=${encodeURIComponent(
          removedUsersNextCursor
        )}`
      );
      const page = Array.isArray(response.users)
        ? (response.users as RemovedAdminUser[])
        : [];
      setRemovedUsers((current) => {
        const seenArchiveIds = new Set(current.map((item) => item.archiveId));
        return [
          ...current,
          ...page.filter((item) => !seenArchiveIds.has(item.archiveId))
        ];
      });
      setRemovedUsersNextCursor(
        typeof response.nextCursor === "string" && response.nextCursor
          ? response.nextCursor
          : null
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load more removed-account archive records.");
    } finally {
      setBusyId("");
    }
  }

  function updateRemovedCaseAccessDraft(
    archiveId: string,
    patch: Partial<RemovedAccountCaseAccessDraft>,
    invalidateReview = true
  ) {
    setRemovedCaseAccessDrafts((current) => {
      const existing = current[archiveId] || emptyRemovedAccountCaseAccessDraft();
      return {
        ...current,
        [archiveId]: {
          ...existing,
          ...patch,
          ...(invalidateReview ? { reviewToken: "", reviewExpiresAt: "" } : {})
        }
      };
    });
    if (invalidateReview) {
      setRemovedCaseAccessResults((current) => ({ ...current, [archiveId]: null }));
    }
  }

  function closeRemovedCaseAccess(archiveId: string) {
    setSelectedRemovedArchiveId("");
    setRemovedCaseAccessDrafts((current) => {
      const next = { ...current };
      delete next[archiveId];
      return next;
    });
    setRemovedCaseAccessResults((current) => {
      const next = { ...current };
      delete next[archiveId];
      return next;
    });
  }

  async function reviewRemovedAccountCaseAccess(item: RemovedAdminUser) {
    const archiveId = item.archiveId;
    const draft =
      removedCaseAccessDrafts[archiveId] || emptyRemovedAccountCaseAccessDraft();
    const evidenceRequestId = draft.evidenceRequestId.trim();
    const purpose = draft.purpose.trim();
    const confirmation = removedAccountCaseConfirmation(archiveId, evidenceRequestId);
    if (
      !/^[a-f\d]{24}$/i.test(archiveId) ||
      !/^[a-f\d]{24}$/i.test(evidenceRequestId) ||
      purpose.length < 8 ||
      draft.scopes.length === 0 ||
      draft.confirmation !== confirmation
    ) {
      setError(
        "Choose at least one minimum-necessary scope, enter the exact evidence-request ID and purpose, and type the exact restricted-access confirmation."
      );
      return;
    }
    setBusyId(`case-access-review-${archiveId}`);
    setError("");
    updateRemovedCaseAccessDraft(
      archiveId,
      { reviewToken: "", reviewExpiresAt: "" },
      false
    );
    setRemovedCaseAccessResults((current) => ({ ...current, [archiveId]: null }));
    try {
      const response = await apiRequest<{
        ok?: boolean;
        caseAccessOnly?: boolean;
        reviewToken?: string;
        reviewExpiresAt?: string;
      }>(`/api/admin/removed-users/${archiveId}/case-access-review`, {
        method: "POST",
        body: {
          evidenceRequestId,
          purpose,
          scopes: draft.scopes,
          minimumNecessaryAcknowledged: true,
          confirmation
        }
      });
      const reviewToken = String(response.reviewToken || "");
      const reviewExpiresAt = String(response.reviewExpiresAt || "");
      const expiry = new Date(reviewExpiresAt).getTime();
      if (
        response.ok !== true ||
        response.caseAccessOnly !== true ||
        !reviewToken ||
        !Number.isFinite(expiry) ||
        expiry <= Date.now()
      ) {
        throw new Error(
          "The restricted case-access review did not return a usable authorization."
        );
      }
      updateRemovedCaseAccessDraft(archiveId, { reviewToken, reviewExpiresAt }, false);
    } catch (err: any) {
      updateRemovedCaseAccessDraft(
        archiveId,
        { reviewToken: "", reviewExpiresAt: "" },
        false
      );
      setError(err?.message || "Restricted case-access review failed safely.");
    } finally {
      setBusyId("");
    }
  }

  async function executeRemovedAccountCaseAccess(item: RemovedAdminUser) {
    const archiveId = item.archiveId;
    const draft =
      removedCaseAccessDrafts[archiveId] || emptyRemovedAccountCaseAccessDraft();
    const evidenceRequestId = draft.evidenceRequestId.trim();
    const purpose = draft.purpose.trim();
    const confirmation = removedAccountCaseConfirmation(archiveId, evidenceRequestId);
    if (!hasUsableRemovedAccountCaseReview(draft)) {
      updateRemovedCaseAccessDraft(
        archiveId,
        { reviewToken: "", reviewExpiresAt: "" },
        false
      );
      setError(
        "The one-use restricted case-access review is missing or expired. Run the review again."
      );
      return;
    }
    const reviewToken = draft.reviewToken;
    setBusyId(`case-access-execute-${archiveId}`);
    setError("");
    // Consume the UI copy before the request. A failed, repeated, or expired
    // execution must always go through a new restricted review.
    updateRemovedCaseAccessDraft(
      archiveId,
      { reviewToken: "", reviewExpiresAt: "" },
      false
    );
    try {
      const response = await apiRequest<
        RemovedAccountCaseAccessResult & {
          ok?: boolean;
        }
      >(`/api/admin/removed-users/${archiveId}/case-access`, {
        method: "POST",
        body: {
          evidenceRequestId,
          purpose,
          scopes: draft.scopes,
          minimumNecessaryAcknowledged: true,
          confirmation,
          reviewToken
        }
      });
      if (
        response.ok !== true ||
        response.caseAccessOnly !== true ||
        response.externalTransmissionPerformed !== false ||
        response.archiveId !== archiveId ||
        response.evidenceRequestId !== evidenceRequestId ||
        !response.data ||
        typeof response.data !== "object" ||
        Array.isArray(response.data)
      ) {
        throw new Error("The restricted case-access response failed validation.");
      }
      setRemovedCaseAccessResults((current) => ({
        ...current,
        [archiveId]: response
      }));
    } catch (err: any) {
      setRemovedCaseAccessResults((current) => ({ ...current, [archiveId]: null }));
      setError(
        err?.message ||
          "Restricted case access failed safely. Run a new review before retrying."
      );
    } finally {
      setBusyId("");
    }
  }

  async function reconcileHarvestOperation(item: HarvestReconciliationOperation) {
    const action = harvestReconciliationActions[item.operationId] || "refund";
    const reason = String(harvestReconciliationReasons[item.operationId] || "").trim();
    if (reason.length < 12) {
      setError("Enter a specific reconciliation reason of at least 12 characters.");
      return;
    }
    setBusyId(`harvest-reconcile-${item.operationId}`);
    setError("");
    try {
      await apiRequest(`/api/admin/harvest-operations/${item.operationId}/reconcile`, {
        method: "POST",
        body: {
          action,
          reason,
          reconciliationKey: `admin-${item.operationId}-${action}-v1`
        }
      });
      setHarvestReconciliationReasons((current) => ({
        ...current,
        [item.operationId]: ""
      }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Harvest reconciliation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewRegulatedAuthorization(
    authorizationId: string,
    reviewStatus: "verified" | "rejected" | "revoked"
  ) {
    const reviewNotes = String(regulatedReviewNotes[authorizationId] || "").trim();
    if (!reviewNotes) {
      setError("Review notes are required before changing authorization status.");
      return;
    }
    setBusyId(`regulated-${authorizationId}`);
    setError("");
    try {
      await apiRequest(
        `/api/admin/regulated-commerce/authorizations/${authorizationId}`,
        { method: "PATCH", body: { reviewStatus, reviewNotes } }
      );
      setRegulatedReviewNotes((current) => ({ ...current, [authorizationId]: "" }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Authorization review failed.");
    } finally {
      setBusyId("");
    }
  }

  async function createRegulatedDecision() {
    const reasonCodes = splitAdminList(regulatedDecisionDraft.reasonCodes);
    if (
      !regulatedDecisionDraft.storefrontId ||
      !regulatedDecisionDraft.productClass ||
      !regulatedDecisionDraft.originCountryCode ||
      !regulatedDecisionDraft.destinationCountryCode ||
      !regulatedDecisionDraft.buyerEligibility.trim() ||
      !regulatedDecisionDraft.policyVersion.trim() ||
      !reasonCodes.length
    ) {
      setError(
        "Choose authorization evidence and complete product, origin, destination, buyer eligibility, policy version, and reason codes."
      );
      return;
    }
    setBusyId("regulated-decision");
    setError("");
    try {
      await apiRequest("/api/admin/regulated-commerce/decisions", {
        method: "POST",
        body: {
          storefrontId: regulatedDecisionDraft.storefrontId,
          authorizationIds: regulatedDecisionDraft.authorizationIds,
          capability: regulatedDecisionDraft.capability,
          productClass: regulatedDecisionDraft.productClass,
          origin: {
            countryCode: regulatedDecisionDraft.originCountryCode,
            subdivisionCode: regulatedDecisionDraft.originSubdivisionCode
          },
          destination: {
            countryCode: regulatedDecisionDraft.destinationCountryCode,
            subdivisionCode: regulatedDecisionDraft.destinationSubdivisionCode
          },
          buyerEligibility: regulatedDecisionDraft.buyerEligibility.trim(),
          fulfillmentMethod: regulatedDecisionDraft.fulfillmentMethod,
          decision: regulatedDecisionDraft.decision,
          policyVersion: regulatedDecisionDraft.policyVersion.trim(),
          reasonCodes
        }
      });
      setRegulatedDecisionDraft((current) => ({
        ...current,
        storefrontId: "",
        authorizationIds: [],
        productClass: "",
        originCountryCode: "",
        originSubdivisionCode: "",
        destinationCountryCode: "",
        destinationSubdivisionCode: "",
        buyerEligibility: "",
        reasonCodes: ""
      }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Route decision could not be recorded.");
    } finally {
      setBusyId("");
    }
  }

  async function createKnowledgeEntry() {
    const preferredAuthors = splitAdminList(knowledgeDraft.preferredAuthors);
    const trustedFor = splitAdminList(knowledgeDraft.trustedFor);
    const notTrustedFor = splitAdminList(knowledgeDraft.notTrustedFor);
    const crossCheckRequirements = splitAdminList(knowledgeDraft.crossCheckRequirements);
    if (
      !knowledgeDraft.entryId.trim() ||
      !knowledgeDraft.title.trim() ||
      !knowledgeDraft.guidance.trim() ||
      !knowledgeDraft.changeNote.trim()
    ) {
      setError("Knowledge entry ID, title, guidance, and change note are required.");
      return;
    }
    if (
      knowledgeDraft.entryType === "source" &&
      ((!knowledgeDraft.domain.trim() && !preferredAuthors.length) ||
        !trustedFor.length ||
        !notTrustedFor.length ||
        (knowledgeDraft.requiresCrossCheck && !crossCheckRequirements.length))
    ) {
      setError(
        "A source needs a domain or preferred author/channel, approved uses, exclusions, and cross-check requirements when cross-checking is on."
      );
      return;
    }
    setBusyId("knowledge-new");
    setError("");
    try {
      await apiRequest("/api/admin/knowledge-registry", {
        method: "POST",
        body: {
          ...knowledgeDraft,
          preferredAuthors,
          trustedFor,
          notTrustedFor,
          crossCheckRequirements
        }
      });
      setKnowledgeDraft((value) => ({
        ...value,
        entryId: "",
        title: "",
        domain: "",
        guidance: "",
        preferredAuthors: "",
        trustedFor: "",
        notTrustedFor: "",
        crossCheckRequirements: "",
        reviewDueAt: defaultKnowledgeReviewDate(),
        changeNote: "Initial governance review"
      }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to create knowledge entry.");
    } finally {
      setBusyId("");
    }
  }

  async function setKnowledgeStatus(
    entry: KnowledgeEntry,
    status: KnowledgeEntry["status"]
  ) {
    setBusyId(entry._id);
    setError("");
    try {
      await apiRequest(`/api/admin/knowledge-registry/${entry._id}`, {
        method: "PATCH",
        body: {
          status,
          reviewDueAt: entry.reviewDueAt || defaultKnowledgeReviewDate(),
          changeNote: `${status === "approved" ? "Approved" : "Status changed"} in platform knowledge review`
        }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to revise knowledge entry.");
    } finally {
      setBusyId("");
    }
  }

  async function generateMethodReview() {
    if (!reviewMethodId.trim()) return;
    setBusyId("method-review-new");
    setError("");
    try {
      await apiRequest("/api/admin/method-review-proposals/generate", {
        method: "POST",
        body: { methodId: reviewMethodId.trim() }
      });
      setReviewMethodId("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to generate method review proposal.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewMethodProposal(
    proposal: MethodReviewProposal,
    status: "accepted_for_edit" | "rejected"
  ) {
    setBusyId(proposal._id);
    setError("");
    try {
      await apiRequest(`/api/admin/method-review-proposals/${proposal._id}`, {
        method: "PATCH",
        body: {
          status,
          reviewNote:
            status === "accepted_for_edit"
              ? "Accepted for separate editorial review; runtime method unchanged."
              : "Outcome evidence did not justify an editorial review."
        }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to review method proposal.");
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) return;
    setRestrictedCaseReviews({});
    setRestrictedCaseDecisionDrafts({});
    setSourceModerationCaseId("");
    setShowEvidenceRequestForm(false);
    setEvidenceDraft((current) => ({
      ...current,
      targetUserId: "",
      scope: ""
    }));
  }, [isAdmin]);

  const modeSummary = useMemo(
    () =>
      Object.entries(overview?.byMode || {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(" · "),
    [overview]
  );

  async function refreshTokens(target: AdminUser) {
    setBusyId(target._id);
    try {
      await apiRequest(`/api/admin/users/${target._id}/tokens`, {
        method: "POST",
        body: { reason: "Platform owner token refresh" }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Token refresh failed.");
    } finally {
      setBusyId("");
    }
  }

  async function changeStatus(
    target: AdminUser,
    status: "active" | "suspended" | "banned"
  ) {
    const reason =
      status === "active" ? "" : noticeMessage.trim() || "Platform policy enforcement";
    setBusyId(target._id);
    try {
      await apiRequest(`/api/admin/users/${target._id}/status`, {
        method: "PATCH",
        body: { status, reason }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Account status update failed.");
    } finally {
      setBusyId("");
    }
  }

  async function sendNotice() {
    if (!noticeUser || !noticeSubject.trim() || !noticeMessage.trim()) return;
    setBusyId(noticeUser._id);
    try {
      await apiRequest(`/api/admin/users/${noticeUser._id}/notice`, {
        method: "POST",
        body: { subject: noticeSubject.trim(), message: noticeMessage.trim() }
      });
      setNoticeUser(null);
      setNoticeMessage("");
    } catch (err: any) {
      setError(err?.message || "Notice delivery failed.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewAccountRemoval(target: AdminUser) {
    setBusyId(target._id);
    setCleanupReviewId(target._id);
    setError("");
    setPlatformProtectionTargetId("");
    setPlatformProtectionReason("");
    setPlatformProtectionConfirmation("");
    setCleanupPreview(null);
    setCleanupConfirmation("");
    setRemovalCategory("");
    setRemovalReason("");
    setPermanentActionAcknowledged(false);
    try {
      const preview = await apiRequest<AccountRemovalPreview>(
        `/api/admin/users/${target._id}/remove-account`,
        {
          method: "POST",
          body: { expectedEmail: target.email }
        }
      );
      setCleanupPreview(preview);
    } catch (err: unknown) {
      const blockedPreview = blockedAccountRemovalPreview(err, target);
      if (blockedPreview) {
        setCleanupPreview(blockedPreview);
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "This account is protected from Admin removal review."
      );
    } finally {
      setBusyId("");
      setCleanupReviewId("");
    }
  }

  async function protectPlatformIdentity(target: AdminUser) {
    const expectedConfirmation = platformIdentityProtectionConfirmation(target);
    if (
      target.platformIdentityProtected === true ||
      platformProtectionReason.trim().length < 8 ||
      platformProtectionConfirmation !== expectedConfirmation
    ) {
      return;
    }
    setBusyId(target._id);
    setError("");
    try {
      const response = await apiRequest(
        `/api/admin/users/${target._id}/platform-identity-protection`,
        {
          method: "PATCH",
          body: {
            expectedEmail: target.email.toLowerCase(),
            reason: platformProtectionReason.trim(),
            confirmation: expectedConfirmation
          }
        }
      );
      if (response.platformIdentityProtected !== true) {
        throw new Error("Platform identity protection was not confirmed.");
      }
      setUsers((current) =>
        current.map((item) =>
          item._id === target._id
            ? {
                ...item,
                platformIdentityProtected: true,
                accountRemovalReviewAllowed: false
              }
            : item
        )
      );
      setCleanupPreview(null);
      setCleanupConfirmation("");
      setRemovalCategory("");
      setRemovalReason("");
      setPermanentActionAcknowledged(false);
      setPlatformProtectionTargetId("");
      setPlatformProtectionReason("");
      setPlatformProtectionConfirmation("");
    } catch (err: any) {
      setError(err?.message || "Platform identity protection failed safely.");
    } finally {
      setBusyId("");
    }
  }

  async function executeAccountRemoval() {
    if (
      !cleanupPreview ||
      !cleanupPreview.ok ||
      cleanupPreview.dryRun !== true ||
      cleanupPreview.accountRemovalReviewAllowed !== true ||
      cleanupPreview.blockers.length > 0 ||
      !hasUsableAccountRemovalReview(cleanupPreview) ||
      !removalCategory ||
      !cleanupPreview.allowedRemovalCategories.includes(removalCategory) ||
      removalReason.trim().length < 8 ||
      !permanentActionAcknowledged ||
      cleanupConfirmation !== cleanupPreview.nextConfirmation
    ) {
      return;
    }
    const reviewedTarget = cleanupPreview.target;
    const reviewToken = cleanupPreview.reviewToken as string;
    const selectedRemovalCategory = removalCategory;
    const detailedRemovalReason = removalReason.trim();
    const exactConfirmation = cleanupConfirmation;
    setBusyId(reviewedTarget.id);
    setError("");
    // A review authorization is one-use. Remove it from UI state before the
    // request so errors, double clicks, and replay attempts all require a new review.
    setCleanupPreview(null);
    setCleanupConfirmation("");
    setRemovalCategory("");
    setRemovalReason("");
    setPermanentActionAcknowledged(false);
    try {
      await apiRequest(`/api/admin/users/${reviewedTarget.id}/remove-account`, {
        method: "POST",
        body: {
          expectedEmail: reviewedTarget.email,
          execute: true,
          confirmation: exactConfirmation,
          removalCategory: selectedRemovalCategory,
          reason: detailedRemovalReason,
          permanentActionAcknowledged: true,
          reviewToken
        }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Account removal failed safely.");
    } finally {
      setBusyId("");
    }
  }

  async function openRestrictedCaseReview(item: ModerationCase) {
    setBusyId(`restricted-review-${item._id}`);
    setError("");
    setRestrictedCaseReviews((current) => ({ ...current, [item._id]: null }));
    try {
      const response = await apiRequest<{
        ok?: boolean;
        case?: RestrictedSevereReview;
      }>(`/api/admin/moderation-cases/${encodeURIComponent(item._id)}/restricted-review`);
      const review = response.case;
      if (
        response.ok !== true ||
        !review ||
        String(review._id || "") !== item._id ||
        review.restricted !== true ||
        review.caseKind !== "restricted_severe_harm" ||
        !Array.isArray(review.evidence?.targetHistory) ||
        review.evidence.targetHistory.some(
          (target) => !validRestrictedReviewTarget(target)
        ) ||
        (review.evidence.dispositionProgress !== undefined &&
          !validRestrictedDispositionProgress(review.evidence.dispositionProgress)) ||
        !Array.isArray(review.evidence?.reports) ||
        review.evidence.reports.some(
          (report) =>
            !report ||
            typeof report !== "object" ||
            typeof report.reportId !== "string" ||
            !report.reportId.trim()
        ) ||
        !Array.isArray(review.evidence?.categories) ||
        review.evidence.categories.some((category) => typeof category !== "string") ||
        review.evidence?.handling?.minimumNecessary !== true ||
        review.evidence?.handling?.rawMediaIncluded !== false ||
        review.evidence?.handling?.storageLocationsIncluded !== false ||
        review.evidence?.handling?.objectKeysIncluded !== false ||
        review.evidence?.handling?.secretsIncluded !== false ||
        review.evidence?.handling?.automaticExternalAuthorityContact !== false ||
        review.evidence?.handling?.automaticLawEnforcementContact !== false
      ) {
        throw new Error("The restricted review response failed validation.");
      }
      setRestrictedCaseReviews((current) => ({ ...current, [item._id]: review }));
    } catch (err: any) {
      setRestrictedCaseReviews((current) => ({ ...current, [item._id]: null }));
      setError(restrictedReviewErrorMessage(err, "open"));
    } finally {
      setBusyId("");
    }
  }

  function closeRestrictedCaseReview(caseId: string) {
    setRestrictedCaseReviews((current) => {
      const next = { ...current };
      delete next[caseId];
      return next;
    });
    setRestrictedCaseDecisionDrafts((current) => {
      const next = { ...current };
      delete next[caseId];
      return next;
    });
    if (sourceModerationCaseId === caseId) {
      setSourceModerationCaseId("");
      setShowEvidenceRequestForm(false);
      setEvidenceDraft((current) => ({
        ...current,
        targetUserId: "",
        scope: ""
      }));
    }
  }

  function cancelEvidenceRequestForm() {
    setShowEvidenceRequestForm(false);
    if (!sourceModerationCaseId) return;
    setSourceModerationCaseId("");
    setEvidenceDraft((current) => ({
      ...current,
      targetUserId: "",
      scope: ""
    }));
  }

  async function moderateContent(
    item: ModerationCase,
    action:
      | "hide"
      | "restore"
      | "remove"
      | "leave"
      | "mark_cannabis"
      | "clear_cannabis"
      | "lock"
      | "unlock"
      | "pin"
      | "unpin"
      | "move",
    evidenceTarget?: { targetType: string; targetId: string }
  ) {
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(
        `/api/admin/moderation-cases/${encodeURIComponent(item._id)}/action`,
        {
          method: "POST",
          body: {
            action,
            ...(action === "move" ? { category: moveCategory.trim() } : {}),
            ...(evidenceTarget
              ? {
                  evidenceTargetType: evidenceTarget.targetType,
                  evidenceTargetId: evidenceTarget.targetId
                }
              : {})
          }
        }
      );
      closeRestrictedCaseReview(item._id);
      await load();
    } catch (err: any) {
      if (evidenceTarget) {
        closeRestrictedCaseReview(item._id);
        setError(restrictedReviewErrorMessage(err, "action"));
      } else {
        setError(err?.message || "Content moderation action failed.");
      }
    } finally {
      setBusyId("");
    }
  }

  async function closeRestrictedCaseWithDecision(item: ModerationCase) {
    const draft = restrictedCaseDecisionDrafts[item._id] || {
      reason: "",
      confirmation: ""
    };
    const reason = draft.reason.trim();
    const confirmation = draft.confirmation.trim();
    const expectedConfirmation = `CLOSE RESTRICTED CASE ${item._id}`;
    if (reason.length < 20 || confirmation !== expectedConfirmation) {
      setError(
        "A reviewed reason of at least 20 characters and the exact restricted-case confirmation are required."
      );
      return;
    }
    setBusyId(`restricted-decision-${item._id}`);
    setError("");
    try {
      await apiRequest(
        `/api/admin/moderation-cases/${encodeURIComponent(item._id)}/restricted-decision`,
        {
          method: "POST",
          body: {
            decision: "close_no_further_action",
            reason,
            confirmation
          }
        }
      );
      closeRestrictedCaseReview(item._id);
      await load();
    } catch (err: any) {
      closeRestrictedCaseReview(item._id);
      setError(restrictedReviewErrorMessage(err, "action"));
    } finally {
      setBusyId("");
    }
  }

  async function preserveEvidence(item: EvidenceRequest) {
    const reason = String(evidenceReasons[item._id] || "").trim();
    if (!reason) {
      setError("A typed preservation reason is required before placing a hold.");
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: {
          preservationHold: true,
          reason
        }
      });
      setEvidenceReasons((current) => ({ ...current, [item._id]: "" }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Evidence preservation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateSupportStatus(
    item: SupportRequest,
    status: SupportRequest["status"],
    reason = "Platform owner support review"
  ) {
    const normalizedReason = String(reason || "").trim();
    if (status === "open" && !normalizedReason) {
      setError("A typed reason is required to reopen a completed support request.");
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/support-requests/${item._id}`, {
        method: "PATCH",
        body: { status, reason: normalizedReason }
      });
      if (status === "open") {
        setSupportReopenReasons((current) => ({ ...current, [item._id]: "" }));
      }
      await load();
    } catch (err: any) {
      setError(err?.message || "Support request update failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateSupportOwnership(
    item: SupportRequest,
    options: { assignToSelf?: boolean; note?: string }
  ) {
    const note = String(options.note || "").trim();
    if (!options.assignToSelf && !note) {
      setError("Enter a case note or assign the request before saving support triage.");
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/support-requests/${item._id}`, {
        method: "PATCH",
        body: {
          ...(options.assignToSelf ? { assignToSelf: true } : {}),
          ...(note ? { note, reason: "Platform owner support case note" } : {})
        }
      });
      if (note) {
        setSupportCaseNotes((current) => ({ ...current, [item._id]: "" }));
      }
      await load();
    } catch (err: any) {
      setError(err?.message || "Support assignment or case note failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateEvidenceStatus(item: EvidenceRequest, status: string) {
    const reason = String(evidenceReasons[item._id] || "").trim();
    if (!reason) {
      setError("A typed review reason is required before changing request status.");
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      const releasesPreservationHold =
        item.preservationHold && ["rejected", "closed"].includes(status);
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: {
          status,
          reason,
          ...(releasesPreservationHold ? { preservationHold: false } : {})
        }
      });
      setEvidenceReasons((current) => ({ ...current, [item._id]: "" }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Evidence request review failed.");
    } finally {
      setBusyId("");
    }
  }

  async function recordEvidenceIdentityReview(item: EvidenceRequest) {
    const reason = String(evidenceReasons[item._id] || "").trim();
    const draft =
      evidenceIdentityReviewDrafts[item._id] || emptyEvidenceIdentityReviewDraft();
    if (
      !reason ||
      !draft.identityMethod.trim() ||
      !draft.identityReference.trim() ||
      !draft.authorityMethod.trim() ||
      !draft.authorityReference.trim()
    ) {
      setError(
        "A typed reason plus identity and authority verification methods and non-secret references are required."
      );
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: {
          reason,
          requesterIdentityVerification: {
            verified: true,
            method: draft.identityMethod.trim(),
            reference: draft.identityReference.trim()
          },
          requesterAuthorityVerification: {
            verified: true,
            method: draft.authorityMethod.trim(),
            reference: draft.authorityReference.trim()
          }
        }
      });
      setEvidenceReasons((current) => ({ ...current, [item._id]: "" }));
      setEvidenceIdentityReviewDrafts((current) => {
        const next = { ...current };
        delete next[item._id];
        return next;
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Identity and authority review failed safely.");
    } finally {
      setBusyId("");
    }
  }

  async function approveEvidenceRequest(item: EvidenceRequest) {
    const reason = String(evidenceReasons[item._id] || "").trim();
    const draft = evidenceLegalReviewDrafts[item._id] || evidenceLegalReviewDraft(item);
    const approverEmail = draft.approverEmail.trim().toLowerCase();
    if (!item.preservationHold) {
      setError(
        "An active preservation hold is required before removed-account archive scopes can be approved."
      );
      return;
    }
    if (
      !reason ||
      !draft.jurisdiction.trim() ||
      !draft.jurisdictionDetermination.trim() ||
      !draft.jurisdictionReference.trim() ||
      !draft.minimumNecessaryScope.trim() ||
      draft.approvedArchiveScopes.length === 0 ||
      !draft.userNoticeStatus ||
      !draft.approverName.trim() ||
      !approverEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail) ||
      !draft.approverRole.trim() ||
      !draft.approverReference.trim()
    ) {
      setError(
        "Complete jurisdiction review, minimum-necessary archive scopes, notice decision, configured approver details, and a typed reason before approval."
      );
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: {
          status: "approved",
          reason,
          jurisdiction: draft.jurisdiction.trim(),
          jurisdictionReview: {
            reviewed: true,
            determination: draft.jurisdictionDetermination.trim(),
            reference: draft.jurisdictionReference.trim()
          },
          minimumNecessaryScope: draft.minimumNecessaryScope.trim(),
          approvedArchiveScopes: draft.approvedArchiveScopes,
          userNoticeStatus: draft.userNoticeStatus,
          legalReview: {
            decision: "approve",
            approverName: draft.approverName.trim(),
            approverEmail,
            approverRole: draft.approverRole.trim(),
            reference: draft.approverReference.trim()
          }
        }
      });
      setEvidenceReasons((current) => ({ ...current, [item._id]: "" }));
      setEvidenceLegalReviewDrafts((current) => {
        const next = { ...current };
        delete next[item._id];
        return next;
      });
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "Legal approval failed safely. The backend still requires an independent configured approver."
      );
    } finally {
      setBusyId("");
    }
  }

  function renderEvidenceIdentityReview(
    item: EvidenceRequest,
    draft: EvidenceIdentityReviewDraft,
    reason: string
  ) {
    const setDraft = (patch: Partial<EvidenceIdentityReviewDraft>) =>
      setEvidenceIdentityReviewDrafts((current) => ({
        ...current,
        [item._id]: {
          ...(current[item._id] || emptyEvidenceIdentityReviewDraft()),
          ...patch
        }
      }));
    const ready =
      Boolean(reason) &&
      Boolean(draft.identityMethod.trim()) &&
      Boolean(draft.identityReference.trim()) &&
      Boolean(draft.authorityMethod.trim()) &&
      Boolean(draft.authorityReference.trim());
    return (
      <View
        accessibilityLabel={`Requester verification review ${item._id}`}
        style={styles.evidencePreview}
      >
        <Text style={styles.caseTitle}>
          Requester identity and authority verification
        </Text>
        <Text style={styles.meta}>
          Record how identity and legal authority were independently checked. References
          must identify the reviewed record without including a password, access token, or
          other secret.
        </Text>
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Requester identity verification method ${item._id}`}
          placeholder="Identity verification method"
          value={draft.identityMethod}
          onChangeText={(identityMethod) => setDraft({ identityMethod })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Requester identity verification reference ${item._id}`}
          placeholder="Non-secret identity reference"
          value={draft.identityReference}
          onChangeText={(identityReference) => setDraft({ identityReference })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Requester authority verification method ${item._id}`}
          placeholder="Authority verification method"
          value={draft.authorityMethod}
          onChangeText={(authorityMethod) => setDraft({ authorityMethod })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Requester authority verification reference ${item._id}`}
          placeholder="Non-secret authority or document reference"
          value={draft.authorityReference}
          onChangeText={(authorityReference) => setDraft({ authorityReference })}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Record identity and authority verification ${item._id}`}
          accessibilityState={{ disabled: busyId === item._id || !ready }}
          disabled={busyId === item._id || !ready}
          style={styles.primaryButton}
          onPress={() => void recordEvidenceIdentityReview(item)}
        >
          <Text style={styles.primaryText}>Record verified identity and authority</Text>
        </Pressable>
      </View>
    );
  }

  function renderEvidenceLegalReview(
    item: EvidenceRequest,
    draft: EvidenceLegalReviewDraft,
    ready: boolean
  ) {
    const setDraft = (patch: Partial<EvidenceLegalReviewDraft>) =>
      setEvidenceLegalReviewDrafts((current) => ({
        ...current,
        [item._id]: {
          ...(current[item._id] || evidenceLegalReviewDraft(item)),
          ...patch
        }
      }));
    return (
      <View
        accessibilityLabel={`Legal approval review ${item._id}`}
        style={styles.evidencePreview}
      >
        <Text style={styles.caseTitle}>Independent legal approval</Text>
        <Text style={styles.meta}>
          The signed-in Admin must be in the configured legal approver list and must be
          different from both the request creator and the later case-access Admin. The
          server enforces those two-person controls.
        </Text>
        <Text style={styles.meta}>
          Preservation hold: {item.preservationHold ? "active" : "required"}
        </Text>
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Reviewed jurisdiction ${item._id}`}
          placeholder="Named jurisdiction"
          value={draft.jurisdiction}
          onChangeText={(jurisdiction) => setDraft({ jurisdiction })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Jurisdiction determination ${item._id}`}
          multiline
          placeholder="Why this jurisdiction and authority apply"
          value={draft.jurisdictionDetermination}
          onChangeText={(jurisdictionDetermination) =>
            setDraft({ jurisdictionDetermination })
          }
          style={[styles.input, styles.messageInput]}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Jurisdiction review reference ${item._id}`}
          placeholder="Non-secret jurisdiction reference"
          value={draft.jurisdictionReference}
          onChangeText={(jurisdictionReference) => setDraft({ jurisdictionReference })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Minimum necessary description ${item._id}`}
          multiline
          placeholder="Exact minimum-necessary records and purpose"
          value={draft.minimumNecessaryScope}
          onChangeText={(minimumNecessaryScope) => setDraft({ minimumNecessaryScope })}
          style={[styles.input, styles.messageInput]}
        />
        <Text style={styles.meta}>
          Approve only the removed-account archive scopes that are necessary.
        </Text>
        <View
          accessibilityLabel={`Approved archive scopes ${item._id}`}
          style={styles.actions}
        >
          {REMOVED_ACCOUNT_CASE_SCOPES.map((scope) => {
            const selected = draft.approvedArchiveScopes.includes(scope);
            return (
              <Pressable
                key={scope}
                accessibilityRole="checkbox"
                accessibilityLabel={`Approve archive scope ${REMOVED_ACCOUNT_CASE_SCOPE_LABELS[scope]} for ${item._id}`}
                accessibilityState={{ checked: selected }}
                style={styles.secondaryButton}
                onPress={() =>
                  setDraft({
                    approvedArchiveScopes: selected
                      ? draft.approvedArchiveScopes.filter((value) => value !== scope)
                      : [...draft.approvedArchiveScopes, scope]
                  })
                }
              >
                <Text style={styles.secondaryText}>
                  {selected ? "☑" : "☐"} {REMOVED_ACCOUNT_CASE_SCOPE_LABELS[scope]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.meta}>User-notice decision</Text>
        <View style={styles.actions}>
          {(["permitted", "delayed", "prohibited", "sent"] as const).map((notice) => (
            <Pressable
              key={notice}
              accessibilityRole="radio"
              accessibilityLabel={`User notice ${notice} for ${item._id}`}
              accessibilityState={{ checked: draft.userNoticeStatus === notice }}
              style={styles.secondaryButton}
              onPress={() => setDraft({ userNoticeStatus: notice })}
            >
              <Text style={styles.secondaryText}>{notice}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Authenticated approver name ${item._id}`}
          placeholder="Authenticated configured approver name"
          value={draft.approverName}
          onChangeText={(approverName) => setDraft({ approverName })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Authenticated approver email ${item._id}`}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Authenticated configured approver email"
          value={draft.approverEmail}
          onChangeText={(approverEmail) => setDraft({ approverEmail })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Authenticated approver role ${item._id}`}
          placeholder="Approver role"
          value={draft.approverRole}
          onChangeText={(approverRole) => setDraft({ approverRole })}
          style={styles.input}
        />
        <TextInput
          {...inputThemeProps}
          accessibilityLabel={`Authenticated approver reference ${item._id}`}
          placeholder="Non-secret approval reference"
          value={draft.approverReference}
          onChangeText={(approverReference) => setDraft({ approverReference })}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Approve evidence request ${item._id}`}
          accessibilityState={{ disabled: busyId === item._id || !ready }}
          disabled={busyId === item._id || !ready}
          style={styles.dangerButton}
          onPress={() => void approveEvidenceRequest(item)}
        >
          <Text style={styles.dangerText}>Approve minimum-necessary case access</Text>
        </Pressable>
      </View>
    );
  }

  async function createEvidenceRequest() {
    const restrictedSourceCaseId = sourceModerationCaseId;
    const requestType = String(evidenceDraft.requestType || "").trim();
    const requesterName = evidenceDraft.requesterName.trim();
    const requesterEmail = evidenceDraft.requesterEmail.trim().toLowerCase();
    const authorityDescription = evidenceDraft.authorityDescription.trim();
    const scope = evidenceDraft.scope.trim();
    if (!EVIDENCE_REQUEST_TYPES.includes(requestType as EvidenceRequestType)) {
      setError("Choose a supported legal or evidence request type.");
      return;
    }
    if (!requesterName || !requesterEmail || !authorityDescription || !scope) {
      setError(
        "Requester name, requester email, authority description, and exact scope are required."
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
      setError("Enter a valid requester email address.");
      return;
    }
    const targetUserId = evidenceDraft.targetUserId.trim();
    if (targetUserId && !/^[a-f\d]{24}$/i.test(targetUserId)) {
      setError("Target user ID must be the exact 24-character account ID.");
      return;
    }
    if (evidenceDraft.dateFrom && evidenceDraft.dateTo) {
      if (evidenceDraft.dateFrom > evidenceDraft.dateTo) {
        setError("Evidence request start date must be on or before the end date.");
        return;
      }
    }

    setBusyId("evidence-new");
    setError("");
    try {
      await apiRequest(
        restrictedSourceCaseId
          ? `/api/admin/moderation-cases/${encodeURIComponent(restrictedSourceCaseId)}/escalate-legal`
          : "/api/admin/evidence-requests",
        {
          method: "POST",
          body: {
            requestType,
            requesterName,
            requesterOrganization: evidenceDraft.requesterOrganization.trim(),
            requesterEmail,
            authorityDescription,
            jurisdiction: evidenceDraft.jurisdiction.trim(),
            ...(restrictedSourceCaseId ? {} : { targetUserId: targetUserId || null }),
            scope,
            dateFrom: evidenceDraft.dateFrom || null,
            dateTo: evidenceDraft.dateTo || null
          }
        }
      );
      if (restrictedSourceCaseId) {
        closeRestrictedCaseReview(restrictedSourceCaseId);
      }
      setEvidenceDraft({
        requestType: "preservation",
        requesterName: "",
        requesterOrganization: "",
        requesterEmail: "",
        authorityDescription: "",
        jurisdiction: "",
        targetUserId: "",
        scope: "",
        dateFrom: "",
        dateTo: ""
      });
      setShowEvidenceRequestForm(false);
      setSourceModerationCaseId("");
      await load();
    } catch (err: any) {
      if (
        restrictedSourceCaseId &&
        err instanceof ApiError &&
        ([403, 404, 409].includes(Number(err.status)) ||
          ["SEVERE_HARM_REVIEWER_REQUIRED", "SEVERE_HARM_CASE_NOT_ACTIVE"].includes(
            err.code
          ))
      ) {
        closeRestrictedCaseReview(restrictedSourceCaseId);
        setError(restrictedReviewErrorMessage(err, "action"));
      } else {
        setError(err?.message || "Unable to open the scoped evidence request.");
      }
    } finally {
      setBusyId("");
    }
  }

  async function loadEvidenceAudit(item: EvidenceRequest) {
    setEvidenceAudit((current) => ({
      ...current,
      [item._id]: { loading: true, error: "", events: current[item._id]?.events || [] }
    }));
    try {
      const response = await apiRequest(
        `/api/admin/audit?targetType=legalEvidenceRequest&targetId=${encodeURIComponent(
          item._id
        )}`
      );
      setEvidenceAudit((current) => ({
        ...current,
        [item._id]: {
          loading: false,
          error: "",
          events: Array.isArray(response.events) ? response.events : []
        }
      }));
    } catch (err: any) {
      setEvidenceAudit((current) => ({
        ...current,
        [item._id]: {
          loading: false,
          error: err?.message || "Unable to load retained audit history.",
          events: current[item._id]?.events || []
        }
      }));
    }
  }

  async function confirmAdminLogout() {
    setBusyId("admin-logout");
    setError("");
    try {
      await logout();
      router.replace("/login" as never);
    } catch (err: any) {
      setError(err?.message || "Unable to log out safely.");
    } finally {
      setBusyId("");
      setLogoutConfirmationOpen(false);
    }
  }

  async function openSecurityInvestigation(href: string) {
    const destination = String(href || "").trim();
    if (!destination) return;
    try {
      const parsed = new URL(destination, "https://growpathai.com");
      if (parsed.hostname === "sentry.io" || parsed.hostname.endsWith(".sentry.io")) {
        await Linking.openURL(parsed.toString());
        return;
      }
      if (
        parsed.hostname !== "growpathai.com" &&
        !parsed.hostname.endsWith(".growpathai.com")
      ) {
        setError(
          "The investigation link is outside the approved GrowPathAI/Sentry hosts."
        );
        return;
      }
      router.push(`${parsed.pathname}${parsed.search}${parsed.hash}` as never);
      return;
    } catch {
      return;
    }
  }

  const harvestOperationsHeldForDecision = harvestOperations.filter(
    (item) => item.state === "failed" && item.creditState === "reserved"
  );
  const harvestOperationsWithoutHeldCredits = harvestOperations.filter(
    (item) => !(item.state === "failed" && item.creditState === "reserved")
  );

  if (!isAdmin) {
    return (
      <View accessibilityRole="alert" style={styles.denied}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Platform owner access required
        </Text>
        <Text style={styles.body}>
          This workspace is separate from Facility ownership.
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/home" as any)}
        >
          <Text style={styles.secondaryText}>Return to GrowPathAI</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AppPage
      routeKey="platform-admin"
      railOverride={null}
      header={
        <View>
          <Text style={styles.eyebrow}>GROWPATHAI PLATFORM OWNER</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Administration
          </Text>
          <Text style={styles.body}>
            Users, presence, account safety, notices, access, and audited enforcement.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.secondaryButton}
              onPress={() => router.push("/account/workspace" as never)}
            >
              <Text style={styles.secondaryText}>Switch workspace</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.dangerButton}
              onPress={() => setLogoutConfirmationOpen(true)}
            >
              <Text style={styles.dangerText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {focusedInvestigation ? (
        <AppCard
          title="Focused investigation"
          titleLevel={2}
          subtitle="Opened from an exact Admin deep link. No record was changed."
        >
          <Text accessibilityLiveRegion="polite" style={styles.caseTitle}>
            {focusedInvestigation.title}
          </Text>
          <Text style={styles.evidencePreview}>{focusedInvestigation.detail}</Text>
          <Text style={styles.meta}>
            {[focusedSection, focusedTargetType, focusedTargetId, focusedModerationCaseId]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </AppCard>
      ) : null}
      {logoutConfirmationOpen ? (
        <AppCard
          title="Confirm platform Admin logout"
          titleLevel={2}
          subtitle="This clears the authenticated identity and saved workspace selections on this device."
        >
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busyId === "admin-logout"}
              style={styles.dangerButton}
              onPress={() => void confirmAdminLogout()}
            >
              <Text style={styles.dangerText}>Confirm log out</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busyId === "admin-logout"}
              style={styles.secondaryButton}
              onPress={() => setLogoutConfirmationOpen(false)}
            >
              <Text style={styles.secondaryText}>Keep working</Text>
            </Pressable>
          </View>
        </AppCard>
      ) : null}
      {loading && !overview ? <ActivityIndicator color={palette.accent} /> : null}
      <ComplimentaryGrantsAdminCard />
      {overview ? (
        <View style={styles.metrics}>
          <Metric
            label="Online now"
            value={overview.onlineNow}
            helper={`Last ${overview.onlineWindowMinutes} minutes`}
          />
          <Metric
            label="Active today"
            value={overview.activeToday}
            helper="Authenticated activity"
          />
          <Metric
            label="Registered users"
            value={overview.totalUsers}
            helper={modeSummary || "All account types"}
          />
        </View>
      ) : null}

      {securityCenter ? (
        <AppCard
          title="Security and investigations"
          titleLevel={2}
          subtitle="Platform-wide security visibility is separate from the task queue. Open an issue to follow its evidence and affected record."
        >
          {focusedSection === "security" ? (
            <Text style={styles.focusedCaseLabel}>Opened from a security deep link</Text>
          ) : null}
          <View style={styles.metrics}>
            <Metric
              label="Open investigations"
              value={securityCenter.tally.open}
              helper={`${securityCenter.tally.total} recorded across connected sources`}
            />
            <Metric
              label="Security reports"
              value={Number(securityCenter.tally.byKind.security || 0)}
              helper="Submitted account or platform security concerns"
            />
            <Metric
              label="Resolved"
              value={securityCenter.tally.resolved}
              helper="Retained investigation history"
            />
          </View>
          <Text style={styles.caseTitle}>Source coverage</Text>
          {securityCenter.coverage.map((source) => (
            <View key={source.source} style={styles.activityRow}>
              <Text style={styles.activityLabel}>{source.label}</Text>
              <Text style={styles.activityValue}>
                {source.state.replaceAll("_", " ")}
              </Text>
              {source.note ? <Text style={styles.meta}>{source.note}</Text> : null}
            </View>
          ))}
          <Text style={styles.meta}>{securityCenter.note}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showResolvedSecurity }}
            style={styles.secondaryButton}
            onPress={() => setShowResolvedSecurity((current) => !current)}
          >
            <Text style={styles.secondaryText}>
              {showResolvedSecurity
                ? "Hide resolved security history"
                : "Show resolved security history"}
            </Text>
          </Pressable>
          {visibleSecurityIssues.slice(0, 50).map((issue) => (
            <View
              key={issue.id}
              style={[
                styles.caseRow,
                focusedTargetKind === "securityissue" && issue.id === focusedTargetId
                  ? styles.focusedCaseRow
                  : null
              ]}
            >
              <View style={styles.caseCopy}>
                {focusedTargetKind === "securityissue" && issue.id === focusedTargetId ? (
                  <Text style={styles.focusedCaseLabel}>
                    Opened from a security investigation link
                  </Text>
                ) : null}
                <Text style={styles.caseTitle}>
                  {issue.kind} · {issue.severity} · {issue.status} · {issue.title}
                </Text>
                <Text style={styles.meta}>
                  {issue.source.replaceAll("_", " ")} ·{" "}
                  {issue.category.replaceAll("_", " ")}
                </Text>
                <Text style={styles.meta}>
                  Affected: {issue.affected} ·{" "}
                  {new Date(issue.occurredAt).toLocaleString()}
                </Text>
                <Text style={styles.evidencePreview}>{issue.summary}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Investigate ${issue.title}`}
                style={styles.secondaryButton}
                onPress={() => void openSecurityInvestigation(issue.investigationHref)}
              >
                <Text style={styles.secondaryText}>Investigate</Text>
              </Pressable>
            </View>
          ))}
          {!visibleSecurityIssues.length ? (
            <Text style={styles.meta}>No open security issues in connected sources.</Text>
          ) : null}
        </AppCard>
      ) : null}

      {regulatedCommerce ? (
        <AppCard
          title="Regulated commerce review"
          titleLevel={2}
          subtitle="Review authorization evidence without treating a plan, profile, warning, or business label as transaction permission."
        >
          <View style={styles.metrics}>
            <Metric
              label="Pending authorizations"
              value={Number(regulatedCommerce.tallies.authorizations.pending || 0)}
              helper={`${regulatedCommerce.authorizations.length} retained authorization records`}
            />
            <Metric
              label="Verified authorizations"
              value={Number(regulatedCommerce.tallies.authorizations.verified || 0)}
              helper="Evidence only; not blanket sales permission"
            />
            <Metric
              label="Allowed exact routes"
              value={Number(regulatedCommerce.tallies.decisions.allowed || 0)}
              helper={`${regulatedCommerce.decisions.length} versioned route decisions`}
            />
          </View>
          <Text style={styles.meta}>
            Verify the exact seller authorization, roles, product classes, jurisdiction,
            issuer, dates, and evidence. Checkout, payment, pickup, delivery, shipping,
            import, and export require a separate exact-route decision.
          </Text>
          {regulatedCommerce.authorizations.length ? (
            regulatedCommerce.authorizations.slice(0, 100).map((authorization) => {
              const reviewBusy = busyId === `regulated-${authorization._id}`;
              const storefrontName =
                authorization.storefrontId?.name || "Unknown storefront";
              return (
                <View key={authorization._id} style={styles.caseRow}>
                  <View style={styles.caseCopy}>
                    <Text style={styles.caseTitle}>
                      {storefrontName} · {authorization.reviewStatus}
                    </Text>
                    <Text style={styles.meta}>
                      {authorization.authorizationType} · {authorization.issuer} ·{" "}
                      {authorization.authorizationIdentifier}
                    </Text>
                    <Text style={styles.meta}>
                      Roles: {authorization.businessRoles.join(", ")} · Products:{" "}
                      {authorization.productClasses.join(", ")}
                    </Text>
                    <Text style={styles.meta}>
                      Jurisdiction: {authorization.jurisdiction.countryCode}
                      {authorization.jurisdiction.subdivisionCode
                        ? `-${authorization.jurisdiction.subdivisionCode}`
                        : ""}
                      {authorization.jurisdiction.locality
                        ? ` · ${authorization.jurisdiction.locality}`
                        : ""}
                    </Text>
                    {authorization.evidenceUrl ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Open evidence for ${storefrontName}`}
                        onPress={() =>
                          void Linking.openURL(authorization.evidenceUrl || "")
                        }
                      >
                        <Text style={styles.secondaryText}>Open submitted evidence</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.meta}>No evidence URL supplied.</Text>
                    )}
                    {authorization.reviewNotes ? (
                      <Text style={styles.evidencePreview}>
                        Prior review: {authorization.reviewNotes}
                      </Text>
                    ) : null}
                    <TextInput
                      {...inputThemeProps}
                      accessibilityLabel={`Review notes for ${storefrontName}`}
                      value={regulatedReviewNotes[authorization._id] || ""}
                      onChangeText={(value) =>
                        setRegulatedReviewNotes((current) => ({
                          ...current,
                          [authorization._id]: value
                        }))
                      }
                      placeholder="Required evidence review notes"
                      multiline
                      style={[styles.input, styles.messageInput]}
                    />
                    <View style={styles.searchRow}>
                      {(["verified", "rejected", "revoked"] as const).map(
                        (reviewStatus) => (
                          <Pressable
                            key={reviewStatus}
                            accessibilityRole="button"
                            accessibilityLabel={`${reviewStatus} authorization for ${storefrontName}`}
                            accessibilityState={{ disabled: reviewBusy }}
                            disabled={reviewBusy}
                            style={styles.secondaryButton}
                            onPress={() =>
                              void reviewRegulatedAuthorization(
                                authorization._id,
                                reviewStatus
                              )
                            }
                          >
                            <Text style={styles.secondaryText}>
                              {reviewStatus.replace(/^./, (letter) =>
                                letter.toUpperCase()
                              )}
                            </Text>
                          </Pressable>
                        )
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Use authorization for ${storefrontName} route decision`}
                        style={styles.secondaryButton}
                        onPress={() =>
                          setRegulatedDecisionDraft((current) => ({
                            ...current,
                            storefrontId: String(authorization.storefrontId?._id || ""),
                            authorizationIds: [authorization._id],
                            productClass: authorization.productClasses[0] || "",
                            originCountryCode:
                              authorization.jurisdiction.countryCode || "",
                            originSubdivisionCode:
                              authorization.jurisdiction.subdivisionCode || ""
                          }))
                        }
                      >
                        <Text style={styles.secondaryText}>Use for route decision</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.meta}>
              No regulated authorization evidence submitted.
            </Text>
          )}
          <View style={styles.evidencePreview}>
            <Text style={styles.caseTitle}>
              Create an exact capability route decision
            </Text>
            <Text style={styles.meta}>
              Start with reviewed evidence above. An allowed decision applies only to the
              exact capability, product class, origin, destination, buyer rule,
              fulfillment method, and policy version entered here.
            </Text>
            <Text style={styles.meta}>
              Storefront: {regulatedDecisionDraft.storefrontId || "not selected"} ·
              Evidence: {regulatedDecisionDraft.authorizationIds.join(", ") || "none"}
            </Text>
            {[
              ["Route capability", "capability", "external_product_handoff"],
              ["Route product class", "productClass", "regulated_cannabis_product"],
              ["Route origin country", "originCountryCode", "US"],
              ["Route origin subdivision", "originSubdivisionCode", "MA"],
              ["Route destination country", "destinationCountryCode", "US"],
              ["Route destination subdivision", "destinationSubdivisionCode", "MA"],
              ["Route buyer eligibility", "buyerEligibility", "age_21_verified"],
              ["Route fulfillment method", "fulfillmentMethod", "external_handoff"],
              ["Route decision", "decision", "allowed, denied, or review_required"],
              ["Route policy version", "policyVersion", "regulated-commerce-v1"],
              ["Route reason codes", "reasonCodes", "Comma-separated reason codes"]
            ].map(([label, field, placeholder]) => (
              <TextInput
                key={field}
                {...inputThemeProps}
                accessibilityLabel={label}
                value={(regulatedDecisionDraft as any)[field]}
                onChangeText={(value) =>
                  setRegulatedDecisionDraft((current) => ({
                    ...current,
                    [field]:
                      field.toLowerCase().includes("country") ||
                      field.toLowerCase().includes("subdivision")
                        ? value.toUpperCase()
                        : value
                  }))
                }
                placeholder={placeholder}
                style={styles.input}
              />
            ))}
            <Text style={styles.meta}>
              Supported capabilities: {regulatedCommerce.capabilities.join(", ")}
            </Text>
            <Text style={styles.meta}>
              Supported fulfillment: {regulatedCommerce.fulfillmentMethods.join(", ")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record exact regulated route decision"
              accessibilityState={{ disabled: busyId === "regulated-decision" }}
              disabled={busyId === "regulated-decision"}
              style={styles.primaryButton}
              onPress={() => void createRegulatedDecision()}
            >
              <Text style={styles.primaryText}>Record Exact Route Decision</Text>
            </Pressable>
          </View>
        </AppCard>
      ) : null}

      {usage ? (
        <AppCard
          title="Actual product activity"
          titleLevel={2}
          subtitle="Authenticated presence and records created or updated in GrowPathAI."
        >
          <View style={styles.metrics}>
            <Metric
              label="Active users · 7 days"
              value={usage.activeUsers.last7Days}
              helper={`${usage.activeUsers.last30Days} active in 30 days`}
            />
            <Metric
              label="New accounts · 7 days"
              value={usage.newUsers.last7Days}
              helper={`${usage.newUsers.last30Days} new in 30 days`}
            />
          </View>
          <View style={styles.activityGrid}>
            {Object.entries(usage.activity.last24Hours).map(([key, value]) => (
              <View key={key} style={styles.activityRow}>
                <Text style={styles.activityLabel}>{key.replace(/([A-Z])/g, " $1")}</Text>
                <Text style={styles.activityValue}>{Number(value || 0)}</Text>
                <Text style={styles.meta}>
                  24h · {Number(usage.activity.last7Days[key] || 0)} in 7d
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.meta}>{usage.note}</Text>
        </AppCard>
      ) : null}

      <AppCard
        title="Harvest provider reconciliation"
        titleLevel={2}
        subtitle="Failed provider operations with credits held for an audited decision, plus recent settled failures for verification. This view excludes submitted media and provider payloads."
      >
        {harvestOperationsHeldForDecision.length ? (
          harvestOperationsHeldForDecision.map((item) => {
            const action = harvestReconciliationActions[item.operationId] || "refund";
            const busy = busyId === `harvest-reconcile-${item.operationId}`;
            return (
              <View key={item.operationId} style={styles.caseRow}>
                <View style={styles.caseCopy}>
                  <Text style={styles.caseTitle}>Operation {item.operationId}</Text>
                  <Text style={styles.meta}>
                    {item.workspaceType} workspace · {item.completedBatchCount}/
                    {item.batchCount} provider batches completed · {item.customerCredits}{" "}
                    credits {item.creditState}
                  </Text>
                  <Text style={styles.meta}>
                    {item.selectedEvidenceCount} selected · {item.analyzedEvidenceCount}{" "}
                    analyzed · status {item.state}
                  </Text>
                  <Text style={styles.evidencePreview}>
                    {item.error?.code || "failure code unavailable"}:{" "}
                    {item.error?.message || "No safe failure detail was recorded."}
                  </Text>
                  <View style={styles.searchRow}>
                    {(["refund", "charge"] as const).map((candidate) => (
                      <Pressable
                        key={candidate}
                        accessibilityRole="button"
                        accessibilityLabel={`${candidate} Harvest credits`}
                        accessibilityState={{ selected: action === candidate }}
                        style={
                          action === candidate
                            ? styles.primaryButton
                            : styles.secondaryButton
                        }
                        onPress={() =>
                          setHarvestReconciliationActions((current) => ({
                            ...current,
                            [item.operationId]: candidate
                          }))
                        }
                      >
                        <Text
                          style={
                            action === candidate
                              ? styles.primaryText
                              : styles.secondaryText
                          }
                        >
                          {candidate === "refund"
                            ? "Refund held credits"
                            : "Charge used credits"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    {...inputThemeProps}
                    value={harvestReconciliationReasons[item.operationId] || ""}
                    onChangeText={(reason) =>
                      setHarvestReconciliationReasons((current) => ({
                        ...current,
                        [item.operationId]: reason
                      }))
                    }
                    placeholder="Required audited reason"
                    multiline
                    style={styles.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Record ${action} for Harvest operation ${item.operationId}`}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    style={styles.primaryButton}
                    onPress={() => void reconcileHarvestOperation(item)}
                  >
                    <Text style={styles.primaryText}>
                      {busy ? "Recording…" : `Record ${action}`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.meta}>
            No failed Harvest operations currently hold credits for reconciliation.
          </Text>
        )}
        {harvestOperationsWithoutHeldCredits.length ? (
          <View style={styles.caseRow}>
            <View style={styles.caseCopy}>
              <Text style={styles.caseTitle}>
                Recent Harvest failures without held credits
              </Text>
              <Text style={styles.meta}>
                Read-only audit history. These entries do not require an Admin credit
                decision; retry availability is determined by the exact Harvest operation
                state.
              </Text>
              {harvestOperationsWithoutHeldCredits.map((item) => (
                <View key={item.operationId} style={styles.caseRow}>
                  <View style={styles.caseCopy}>
                    <Text style={styles.caseTitle}>Operation {item.operationId}</Text>
                    <Text style={styles.meta}>
                      {item.workspaceType} workspace · {item.completedBatchCount}/
                      {item.batchCount} provider batches completed ·{" "}
                      {item.customerCredits} credits {item.creditState}
                    </Text>
                    <Text style={styles.meta}>
                      {item.selectedEvidenceCount} selected · {item.analyzedEvidenceCount}{" "}
                      analyzed · status {item.state}
                    </Text>
                    <Text style={styles.evidencePreview}>
                      {item.error?.code || "settled without a failure code"}:{" "}
                      {item.error?.message || "No safe failure detail was recorded."}
                    </Text>
                    {item.reconciliationDisposition ? (
                      <Text style={styles.meta}>
                        Audited disposition: {item.reconciliationDisposition}
                        {item.reconciledAt
                          ? ` · ${new Date(item.reconciledAt).toLocaleString()}`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </AppCard>

      <AppCard
        title="Harvest trichome calibration queue"
        titleLevel={2}
        subtitle="Only versioned, rights-confirmed, private-use calibration submissions appear here. Owner corrections remain hypotheses until two independent head-level reviews and adjudication are complete."
      >
        {harvestCalibrationCandidates.length ? (
          harvestCalibrationCandidates.map((item) => (
            <View key={item.feedbackId} style={styles.caseRow}>
              <View style={styles.caseCopy}>
                <Text style={styles.caseTitle}>
                  Review {item.reviewId} - {item.eligibility?.status || "not ready"}
                </Text>
                <Text style={styles.meta}>
                  AI amber {percentLabel(item.aiVisibleSample?.confirmedAmber)} to{" "}
                  {percentLabel(item.aiVisibleSample?.possibleAmber)} - owner visible-area
                  estimate {percentLabel(item.ownerReview?.visibleAmberPercent)}
                </Text>
                <Text style={styles.meta}>
                  {item.aiVisibleSample?.resolvedHeadCount || 0} resolved heads -{" "}
                  {item.aiVisibleSample?.countingConfidence || "unknown"} counting
                  confidence - {item.evidenceAssetIds?.length || 0} protected evidence
                  assets
                </Text>
                <Text style={styles.meta}>
                  {item.provider || "provider unavailable"}
                  {item.model ? ` / ${item.model}` : ""} -{" "}
                  {item.reviewPolicyVersion || "policy unavailable"}
                </Text>
                <Text style={styles.evidencePreview}>
                  Not ground truth. Next:{" "}
                  {item.eligibility?.requiredNextSteps?.join("; ") ||
                    "independent review and adjudication"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No current rights-authorized Harvest calibration cases. Older boolean-only
            consent and private product feedback are excluded.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Knowledge registry review"
        titleLevel={2}
        subtitle="Create an audited review ledger for source reliability and GrowPath methods. Approval records editorial intent; runtime guidance changes only in a separate reviewed code release."
      >
        <Text style={styles.meta}>
          Do not invent a source. Enter the owner-supplied domain or author, approved
          uses, explicit exclusions, cross-check rule, and next review date.
        </Text>
        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Knowledge entry type"
            style={styles.secondaryButton}
            onPress={() =>
              setKnowledgeDraft((value) => ({
                ...value,
                entryType: value.entryType === "source" ? "method" : "source"
              }))
            }
          >
            <Text style={styles.secondaryText}>{knowledgeDraft.entryType}</Text>
          </Pressable>
          <TextInput
            {...inputThemeProps}
            value={knowledgeDraft.entryId}
            onChangeText={(entryId) =>
              setKnowledgeDraft((value) => ({ ...value, entryId }))
            }
            placeholder="Stable entry ID"
            style={styles.input}
          />
          <TextInput
            {...inputThemeProps}
            value={knowledgeDraft.title}
            onChangeText={(title) => setKnowledgeDraft((value) => ({ ...value, title }))}
            placeholder="Source or method title"
            style={styles.input}
          />
        </View>
        <TextInput
          {...inputThemeProps}
          value={knowledgeDraft.domain}
          onChangeText={(domain) => setKnowledgeDraft((value) => ({ ...value, domain }))}
          placeholder="Domain (sources only)"
          style={styles.input}
        />
        {knowledgeDraft.entryType === "source" ? (
          <>
            <TextInput
              {...inputThemeProps}
              value={knowledgeDraft.preferredAuthors}
              onChangeText={(preferredAuthors) =>
                setKnowledgeDraft((value) => ({ ...value, preferredAuthors }))
              }
              placeholder="Preferred authors or channels, comma-separated"
              style={styles.input}
            />
            <TextInput
              {...inputThemeProps}
              value={knowledgeDraft.trustedFor}
              onChangeText={(trustedFor) =>
                setKnowledgeDraft((value) => ({ ...value, trustedFor }))
              }
              placeholder="Approved uses, comma-separated"
              style={styles.input}
            />
            <TextInput
              {...inputThemeProps}
              value={knowledgeDraft.notTrustedFor}
              onChangeText={(notTrustedFor) =>
                setKnowledgeDraft((value) => ({ ...value, notTrustedFor }))
              }
              placeholder="Explicit exclusions, comma-separated"
              style={styles.input}
            />
            <View style={styles.searchRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Source reliability tier"
                style={styles.secondaryButton}
                onPress={() =>
                  setKnowledgeDraft((value) => ({
                    ...value,
                    reliabilityTier: nextReliabilityTier(value.reliabilityTier)
                  }))
                }
              >
                <Text style={styles.secondaryText}>
                  Reliability tier {knowledgeDraft.reliabilityTier}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Cross-check required"
                accessibilityState={{ checked: knowledgeDraft.requiresCrossCheck }}
                style={styles.secondaryButton}
                onPress={() =>
                  setKnowledgeDraft((value) => ({
                    ...value,
                    requiresCrossCheck: !value.requiresCrossCheck
                  }))
                }
              >
                <Text style={styles.secondaryText}>
                  Cross-check{" "}
                  {knowledgeDraft.requiresCrossCheck ? "required" : "not required"}
                </Text>
              </Pressable>
            </View>
            {knowledgeDraft.requiresCrossCheck ? (
              <TextInput
                {...inputThemeProps}
                value={knowledgeDraft.crossCheckRequirements}
                onChangeText={(crossCheckRequirements) =>
                  setKnowledgeDraft((value) => ({
                    ...value,
                    crossCheckRequirements
                  }))
                }
                placeholder="Cross-check requirements, comma-separated"
                style={styles.input}
              />
            ) : null}
          </>
        ) : null}
        <TextInput
          {...inputThemeProps}
          value={knowledgeDraft.guidance}
          onChangeText={(guidance) =>
            setKnowledgeDraft((value) => ({ ...value, guidance }))
          }
          placeholder={
            knowledgeDraft.entryType === "source"
              ? "Source guidance and limitations"
              : "Proposed method guidance and limitations"
          }
          multiline
          style={[styles.input, styles.messageInput]}
        />
        <TextInput
          {...inputThemeProps}
          value={knowledgeDraft.changeNote}
          onChangeText={(changeNote) =>
            setKnowledgeDraft((value) => ({ ...value, changeNote }))
          }
          placeholder="Required review/change note"
          style={styles.input}
        />
        <CalendarDateField
          accessibilityLabel="Knowledge source next review date"
          label="Next review date"
          value={knowledgeDraft.reviewDueAt}
          onChange={(reviewDueAt) =>
            setKnowledgeDraft((value) => ({ ...value, reviewDueAt }))
          }
          placeholder="Choose next review date"
        />
        <Pressable
          disabled={busyId === "knowledge-new"}
          style={styles.primaryButton}
          onPress={() => void createKnowledgeEntry()}
        >
          <Text style={styles.primaryText}>Create governed draft revision</Text>
        </Pressable>
        {knowledgeEntries.map((entry) => (
          <View key={entry._id} style={styles.caseRow}>
            <View style={styles.caseCopy}>
              <Text style={styles.caseTitle}>
                {entry.title} · {entry.entryType} · {entry.status}
              </Text>
              <Text style={styles.meta}>
                {entry.entryId} · revision {entry.revision}
                {entry.reliabilityTier ? ` · Tier ${entry.reliabilityTier}` : ""}
                {entry.domain ? ` · ${entry.domain}` : ""}
              </Text>
              <Text style={styles.meta}>
                Freshness: {entry.reviewStatus || "not evaluated"} · review due{" "}
                {entry.reviewDueAt
                  ? new Date(entry.reviewDueAt).toLocaleDateString()
                  : "not set"}
              </Text>
              {entry.guidance ? (
                <Text style={styles.evidencePreview}>{entry.guidance}</Text>
              ) : null}
              {entry.preferredAuthors?.length ? (
                <Text style={styles.meta}>
                  Preferred authors/channels: {entry.preferredAuthors.join(", ")}
                </Text>
              ) : null}
              {entry.trustedFor?.length ? (
                <Text style={styles.meta}>
                  Approved uses: {entry.trustedFor.join(", ")}
                </Text>
              ) : null}
              {entry.notTrustedFor?.length ? (
                <Text style={styles.meta}>
                  Exclusions: {entry.notTrustedFor.join(", ")}
                </Text>
              ) : null}
              {entry.entryType === "source" ? (
                <Text style={styles.meta}>
                  Cross-check:{" "}
                  {entry.requiresCrossCheck
                    ? entry.crossCheckRequirements?.join(", ") || "required"
                    : "not required"}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                Runtime guidance unchanged until a separate reviewed code release.
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                disabled={busyId === entry._id || entry.status === "approved"}
                style={styles.primaryButton}
                onPress={() => void setKnowledgeStatus(entry, "approved")}
              >
                <Text style={styles.primaryText}>Approve new revision</Text>
              </Pressable>
              <Pressable
                disabled={busyId === entry._id || entry.status === "retired"}
                style={styles.secondaryButton}
                onPress={() => void setKnowledgeStatus(entry, "retired")}
              >
                <Text style={styles.secondaryText}>Retire</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {!knowledgeEntries.length ? (
          <Text style={styles.meta}>No governed knowledge revisions yet.</Text>
        ) : null}
      </AppCard>

      <AppCard
        title="Outcome-based method review"
        titleLevel={2}
        subtitle="Generate a human review proposal from at least three recorded outcomes. Proposals never edit runtime methods."
      >
        <View style={styles.searchRow}>
          <TextInput
            {...inputThemeProps}
            value={reviewMethodId}
            onChangeText={setReviewMethodId}
            placeholder="Method ID, for example plant-diagnosis-etgu"
            style={styles.input}
          />
          <Pressable
            disabled={busyId === "method-review-new"}
            style={styles.primaryButton}
            onPress={() => void generateMethodReview()}
          >
            <Text style={styles.primaryText}>Analyze recorded outcomes</Text>
          </Pressable>
        </View>
        {methodReviewProposals.map((proposal) => (
          <View key={proposal._id} style={styles.caseRow}>
            <View style={styles.caseCopy}>
              <Text style={styles.caseTitle}>
                {proposal.methodId} · {proposal.status}
              </Text>
              <Text style={styles.meta}>
                {proposal.outcomeCount} outcome records · runtime method unchanged
              </Text>
              <Text style={styles.evidencePreview}>{proposal.proposedReview}</Text>
              <Text style={styles.meta}>
                Agreement: {JSON.stringify(proposal.agreementCounts || {})} · decisions:{" "}
                {JSON.stringify(proposal.decisionCounts || {})}
              </Text>
              {proposal.limitations?.length ? (
                <Text style={styles.meta}>Limits: {proposal.limitations.join(" ")}</Text>
              ) : null}
            </View>
            {proposal.status === "pending_review" ? (
              <View style={styles.actions}>
                <Pressable
                  disabled={busyId === proposal._id}
                  style={styles.primaryButton}
                  onPress={() => void reviewMethodProposal(proposal, "accepted_for_edit")}
                >
                  <Text style={styles.primaryText}>Accept for editing</Text>
                </Pressable>
                <Pressable
                  disabled={busyId === proposal._id}
                  style={styles.secondaryButton}
                  onPress={() => void reviewMethodProposal(proposal, "rejected")}
                >
                  <Text style={styles.secondaryText}>Reject proposal</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {!methodReviewProposals.length ? (
          <Text style={styles.meta}>No outcome-based method proposals yet.</Text>
        ) : null}
      </AppCard>

      <AppCard
        title="Find users"
        titleLevel={2}
        subtitle="Search every GrowPathAI account by email or name."
      >
        <View style={styles.searchRow}>
          <TextInput
            {...inputThemeProps}
            accessibilityLabel="Search users"
            placeholder="Email or display name"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void load()}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search users"
            style={styles.primaryButton}
            onPress={() => void load()}
          >
            <Text style={styles.primaryText}>Search</Text>
          </Pressable>
        </View>
      </AppCard>

      <View style={styles.userList}>
        {focusedTargetKind === "user" &&
        focusedTargetId &&
        !orderedUsers.some((item) => item._id === focusedTargetId) ? (
          <Text accessibilityRole="alert" style={styles.meta}>
            The linked account {focusedTargetId} is not in the current result set. Search
            by the account email or name to load its context without changing it.
          </Text>
        ) : null}
        {orderedUsers.map((item) => (
          <AppCard
            key={item._id}
            accessibilityLabel={`Admin account ${item.email}`}
            title={item.displayName || item.name || item.email}
            subtitle={`${item.email} · ${item.mode || "personal"} · ${item.plan || "free"}`}
          >
            {focusedTargetKind === "user" && item._id === focusedTargetId ? (
              <Text style={styles.focusedCaseLabel}>
                Opened from an account investigation link
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {item.accountStatus || "active"} · {item.subscriptionStatus || "inactive"} ·
              AI {item.aiTokens ?? 0}/{item.maxTokens ?? 0}
            </Text>
            <AdminBillingTruth target={item} styles={styles} />
            <Text style={styles.meta}>
              Last active:{" "}
              {item.lastActiveAt
                ? new Date(item.lastActiveAt).toLocaleString()
                : "Never recorded"}
            </Text>
            {item.platformIdentityProtected === true ? (
              <Text style={styles.protectedIdentityLabel}>
                Protected platform identity
              </Text>
            ) : null}
            {item.knownTestAccount === true ? (
              <Text style={styles.knownTestAccountLabel}>Known test account</Text>
            ) : item.ownerControlledTestAccount === true ? (
              <Text style={styles.knownTestAccountLabel}>Owner-marked test account</Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Refresh tokens for ${item.email}`}
                accessibilityState={{ disabled: busyId === item._id }}
                disabled={busyId === item._id}
                style={styles.secondaryButton}
                onPress={() => void refreshTokens(item)}
              >
                <Text style={styles.secondaryText}>Refresh tokens</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Email notice to ${item.email}`}
                style={styles.secondaryButton}
                onPress={() => setNoticeUser(item)}
              >
                <Text style={styles.secondaryText}>Email notice</Text>
              </Pressable>
              {item.accountStatus === "active" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Suspend ${item.email}`}
                  accessibilityState={{ disabled: busyId === item._id }}
                  disabled={busyId === item._id}
                  style={styles.warningButton}
                  onPress={() => void changeStatus(item, "suspended")}
                >
                  <Text style={styles.warningText}>Suspend</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Restore ${item.email}`}
                  accessibilityState={{ disabled: busyId === item._id }}
                  disabled={busyId === item._id}
                  style={styles.secondaryButton}
                  onPress={() => void changeStatus(item, "active")}
                >
                  <Text style={styles.secondaryText}>Restore</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ban ${item.email}`}
                accessibilityState={{ disabled: busyId === item._id }}
                disabled={busyId === item._id}
                style={styles.dangerButton}
                onPress={() => void changeStatus(item, "banned")}
              >
                <Text style={styles.dangerText}>Ban</Text>
              </Pressable>
              {item.platformIdentityProtected !== true ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Protect platform identity for ${item.email}`}
                  accessibilityState={{ disabled: busyId === item._id }}
                  disabled={busyId === item._id}
                  style={styles.secondaryButton}
                  onPress={() => {
                    setCleanupPreview(null);
                    setCleanupConfirmation("");
                    setRemovalCategory("");
                    setRemovalReason("");
                    setPermanentActionAcknowledged(false);
                    setPlatformProtectionTargetId(item._id);
                    setPlatformProtectionReason("");
                    setPlatformProtectionConfirmation("");
                  }}
                >
                  <Text style={styles.secondaryText}>Protect platform identity</Text>
                </Pressable>
              ) : null}
              {item.accountRemovalReviewAllowed === true &&
              item.platformIdentityProtected !== true ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    cleanupReviewId === item._id
                      ? `Reviewing account removal safety for ${item.email}`
                      : `Review account removal for ${item.email}`
                  }
                  accessibilityState={{
                    disabled: Boolean(cleanupReviewId) || busyId === item._id
                  }}
                  disabled={Boolean(cleanupReviewId) || busyId === item._id}
                  style={styles.secondaryButton}
                  onPress={() => void reviewAccountRemoval(item)}
                >
                  <Text accessibilityLiveRegion="polite" style={styles.secondaryText}>
                    {cleanupReviewId === item._id
                      ? "Reviewing safety checks…"
                      : "Review account removal"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {platformProtectionTargetId === item._id &&
            item.platformIdentityProtected !== true ? (
              <View
                accessibilityLabel={`Platform identity protection for ${item.email}`}
                style={styles.cleanupReview}
              >
                <Text style={styles.cleanupReviewTitle}>
                  Protect {item.email} as a platform identity
                </Text>
                <Text style={styles.meta}>
                  This one-way protection permanently excludes the account from Admin
                  account-removal controls. This screen never offers an unprotect action.
                </Text>
                <TextInput
                  {...inputThemeProps}
                  accessibilityLabel="Platform identity protection reason"
                  autoCapitalize="sentences"
                  multiline
                  placeholder="Specific reason (at least 8 characters)"
                  value={platformProtectionReason}
                  onChangeText={setPlatformProtectionReason}
                  style={[styles.input, styles.messageInput]}
                />
                <Text style={styles.meta}>
                  Type this exact confirmation:{" "}
                  {platformIdentityProtectionConfirmation(item)}
                </Text>
                <TextInput
                  {...inputThemeProps}
                  accessibilityLabel="Exact platform identity protection confirmation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Paste the exact confirmation"
                  value={platformProtectionConfirmation}
                  onChangeText={setPlatformProtectionConfirmation}
                  style={styles.input}
                />
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm platform identity protection for ${item.email}`}
                    accessibilityState={{
                      disabled:
                        busyId === item._id ||
                        platformProtectionReason.trim().length < 8 ||
                        platformProtectionConfirmation !==
                          platformIdentityProtectionConfirmation(item)
                    }}
                    disabled={
                      busyId === item._id ||
                      platformProtectionReason.trim().length < 8 ||
                      platformProtectionConfirmation !==
                        platformIdentityProtectionConfirmation(item)
                    }
                    style={styles.dangerButton}
                    onPress={() => void protectPlatformIdentity(item)}
                  >
                    <Text style={styles.dangerText}>Protect platform identity</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel platform identity protection for ${item.email}`}
                    style={styles.secondaryButton}
                    onPress={() => {
                      setPlatformProtectionTargetId("");
                      setPlatformProtectionReason("");
                      setPlatformProtectionConfirmation("");
                    }}
                  >
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {cleanupPreview?.target.id === item._id ? (
              <View
                accessibilityLabel={`Account removal review for ${item.email}`}
                style={styles.cleanupReview}
              >
                <Text style={styles.cleanupReviewTitle}>
                  Remove {cleanupPreview.target.email}
                </Text>
                <Text style={styles.meta}>
                  This is permanent. GrowPath will reuse the complete privacy deletion
                  process and retain only records required for security, compliance,
                  billing, disputes, or audit.
                </Text>
                <Text style={styles.meta}>
                  Removal review: allowed · Safety blockers:{" "}
                  {cleanupPreview.blockers.length || "none"} · Dry run:{" "}
                  {cleanupPreview.ok && cleanupPreview.blockers.length === 0
                    ? "passed"
                    : "blocked"}
                </Text>
                {cleanupPreview.blockers.map((blocker) => (
                  <Text key={blocker} style={styles.meta}>
                    {accountRemovalBlockerLabel(blocker)}
                  </Text>
                ))}
                {cleanupPreview.ok && cleanupPreview.blockers.length === 0 ? (
                  <>
                    <Text style={styles.meta}>
                      {hasUsableAccountRemovalReview(cleanupPreview)
                        ? `One-use review authorization expires ${new Date(
                            cleanupPreview.reviewExpiresAt as string
                          ).toLocaleString()}.`
                        : "Review authorization is missing or expired. Run the account removal review again before execution."}
                    </Text>
                    <Text style={styles.meta}>Choose the audited removal category.</Text>
                    <View
                      accessibilityLabel="Account removal category"
                      style={styles.actions}
                    >
                      {cleanupPreview.allowedRemovalCategories.map((category) => (
                        <Pressable
                          key={category}
                          accessibilityRole="radio"
                          accessibilityLabel={`Removal category ${REMOVAL_CATEGORY_LABELS[category]}`}
                          accessibilityState={{ checked: removalCategory === category }}
                          style={styles.secondaryButton}
                          onPress={() => setRemovalCategory(category)}
                        >
                          <Text style={styles.secondaryText}>
                            {REMOVAL_CATEGORY_LABELS[category]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      {...inputThemeProps}
                      accessibilityLabel="Detailed account removal reason"
                      autoCapitalize="sentences"
                      multiline
                      placeholder="Detailed reason (at least 8 characters)"
                      value={removalReason}
                      onChangeText={setRemovalReason}
                      style={[styles.input, styles.messageInput]}
                    />
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Acknowledge permanent account removal for ${item.email}`}
                      accessibilityState={{
                        checked: permanentActionAcknowledged,
                        disabled: busyId === cleanupPreview.target.id
                      }}
                      disabled={busyId === cleanupPreview.target.id}
                      style={styles.secondaryButton}
                      onPress={() =>
                        setPermanentActionAcknowledged((current) => !current)
                      }
                    >
                      <Text style={styles.secondaryText}>
                        {permanentActionAcknowledged ? "☑" : "☐"} I understand this
                        permanently removes account access and anonymizes personal data;
                        it is not an ordinary suspension or reversible UI action.
                      </Text>
                    </Pressable>
                    <Text style={styles.meta}>
                      Type this exact confirmation: {cleanupPreview.nextConfirmation}
                    </Text>
                    <TextInput
                      {...inputThemeProps}
                      accessibilityLabel="Exact account anonymization confirmation"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Paste the exact confirmation"
                      value={cleanupConfirmation}
                      onChangeText={setCleanupConfirmation}
                      style={styles.input}
                    />
                  </>
                ) : (
                  <Text style={styles.meta}>
                    Removal is disabled until every safety blocker is resolved.
                  </Text>
                )}
                <View style={styles.actions}>
                  {cleanupPreview.ok && cleanupPreview.blockers.length === 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Permanently remove account ${item.email}`}
                      accessibilityState={{
                        disabled:
                          busyId === cleanupPreview.target.id ||
                          !hasUsableAccountRemovalReview(cleanupPreview) ||
                          !removalCategory ||
                          !cleanupPreview.allowedRemovalCategories.includes(
                            removalCategory
                          ) ||
                          removalReason.trim().length < 8 ||
                          !permanentActionAcknowledged ||
                          cleanupConfirmation !== cleanupPreview.nextConfirmation
                      }}
                      disabled={
                        busyId === cleanupPreview.target.id ||
                        !hasUsableAccountRemovalReview(cleanupPreview) ||
                        !removalCategory ||
                        !cleanupPreview.allowedRemovalCategories.includes(
                          removalCategory
                        ) ||
                        removalReason.trim().length < 8 ||
                        !permanentActionAcknowledged ||
                        cleanupConfirmation !== cleanupPreview.nextConfirmation
                      }
                      style={styles.dangerButton}
                      onPress={() => void executeAccountRemoval()}
                    >
                      <Text style={styles.dangerText}>Permanently remove account</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel account removal review ${item.email}`}
                    style={styles.secondaryButton}
                    onPress={() => {
                      setCleanupPreview(null);
                      setCleanupConfirmation("");
                      setRemovalCategory("");
                      setRemovalReason("");
                      setPermanentActionAcknowledged(false);
                    }}
                  >
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </AppCard>
        ))}
      </View>

      <AppCard
        title="Removed accounts"
        titleLevel={2}
        subtitle="PII-stripped removal records and private archive-retention status."
      >
        <Text style={styles.meta}>
          Original email addresses, names, and other original personal data are never
          shown in this view. The private 90-day evidence vault is not public, is excluded
          from normal exports, and is never sold or used for advertising, recommendations,
          or AI training. Archives are scheduled for permanent purge after 90 days; only a
          valid legal hold can require continued retention, and case access requires the
          restricted, logged legal-and-safety workflow.
        </Text>
        {removedUsers.length ? (
          <View style={styles.userList}>
            {removedUsers.map((item) => {
              const draft =
                removedCaseAccessDrafts[item.archiveId] ||
                emptyRemovedAccountCaseAccessDraft();
              const result = removedCaseAccessResults[item.archiveId];
              const panelOpen = selectedRemovedArchiveId === item.archiveId;
              const accessAvailable =
                item.status === "ready" && item.legalHold === true && !item.purgedAt;
              const expectedConfirmation = removedAccountCaseConfirmation(
                item.archiveId,
                draft.evidenceRequestId
              );
              const reviewReady =
                accessAvailable &&
                /^[a-f\d]{24}$/i.test(item.archiveId) &&
                /^[a-f\d]{24}$/i.test(draft.evidenceRequestId.trim()) &&
                draft.purpose.trim().length >= 8 &&
                draft.scopes.length > 0 &&
                draft.confirmation === expectedConfirmation;
              return (
                <AppCard
                  key={item.archiveId}
                  accessibilityLabel={`Removed account archive ${item.archiveId}`}
                  title={
                    item.anonymizedUserId || `Removed account archive ${item.archiveId}`
                  }
                  subtitle={`${item.status || "unknown"}${
                    item.legalHold ? " · Legal hold" : ""
                  }`}
                >
                  <Text style={styles.meta}>Archive ID: {item.archiveId}</Text>
                  <Text style={styles.meta}>
                    Archived:{" "}
                    {item.archivedAt
                      ? new Date(item.archivedAt).toLocaleString()
                      : "Timestamp unavailable"}{" "}
                    · Status: {item.status || "unknown"}
                  </Text>
                  <Text style={styles.meta}>
                    Archive purge:{" "}
                    {item.legalHold
                      ? "Paused by legal hold"
                      : item.purgeAfter
                        ? new Date(item.purgeAfter).toLocaleString()
                        : "Not scheduled"}
                    {item.purgedAt
                      ? ` · Purged: ${new Date(item.purgedAt).toLocaleString()}`
                      : ""}
                  </Text>
                  {item.failureCode ? (
                    <Text style={styles.meta}>Archive failure: {item.failureCode}</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open restricted case access for ${item.archiveId}`}
                    accessibilityState={{
                      disabled: !accessAvailable,
                      expanded: panelOpen
                    }}
                    disabled={!accessAvailable}
                    style={styles.secondaryButton}
                    onPress={() => {
                      if (panelOpen) {
                        closeRemovedCaseAccess(item.archiveId);
                        return;
                      }
                      setSelectedRemovedArchiveId(item.archiveId);
                      setRemovedCaseAccessDrafts((current) => ({
                        ...current,
                        [item.archiveId]:
                          current[item.archiveId] || emptyRemovedAccountCaseAccessDraft()
                      }));
                    }}
                  >
                    <Text style={styles.secondaryText}>
                      {accessAvailable
                        ? panelOpen
                          ? "Close restricted case access"
                          : "Open restricted case access"
                        : "Active legal hold required for case access"}
                    </Text>
                  </Pressable>
                  {panelOpen ? (
                    <View
                      accessibilityLabel={`Restricted case access panel ${item.archiveId}`}
                      style={styles.cleanupReview}
                    >
                      <Text style={styles.cleanupReviewTitle}>
                        Restricted, logged case access
                      </Text>
                      <Text style={styles.meta}>
                        This in-app view is limited to an approved LegalEvidenceRequest,
                        its active hold, its approved granular scopes, and the approved
                        date window. It does not publish, share, or add retained data to
                        an ordinary account export.
                      </Text>
                      <TextInput
                        {...inputThemeProps}
                        accessibilityLabel={`Approved evidence request ID for ${item.archiveId}`}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Approved 24-character LegalEvidenceRequest ID"
                        value={draft.evidenceRequestId}
                        onChangeText={(evidenceRequestId) =>
                          updateRemovedCaseAccessDraft(item.archiveId, {
                            evidenceRequestId
                          })
                        }
                        style={styles.input}
                      />
                      <TextInput
                        {...inputThemeProps}
                        accessibilityLabel={`Restricted case access purpose for ${item.archiveId}`}
                        multiline
                        placeholder="Exact case purpose (at least 8 characters)"
                        value={draft.purpose}
                        onChangeText={(purpose) =>
                          updateRemovedCaseAccessDraft(item.archiveId, { purpose })
                        }
                        style={[styles.input, styles.messageInput]}
                      />
                      <Text style={styles.meta}>
                        Select only the minimum necessary approved archive scopes.
                      </Text>
                      <View
                        accessibilityLabel={`Restricted case access scopes for ${item.archiveId}`}
                        style={styles.actions}
                      >
                        {REMOVED_ACCOUNT_CASE_SCOPES.map((scope) => {
                          const selected = draft.scopes.includes(scope);
                          return (
                            <Pressable
                              key={scope}
                              accessibilityRole="checkbox"
                              accessibilityLabel={`Case access scope ${REMOVED_ACCOUNT_CASE_SCOPE_LABELS[scope]}`}
                              accessibilityState={{ checked: selected }}
                              style={styles.secondaryButton}
                              onPress={() =>
                                updateRemovedCaseAccessDraft(item.archiveId, {
                                  scopes: selected
                                    ? draft.scopes.filter((value) => value !== scope)
                                    : [...draft.scopes, scope]
                                })
                              }
                            >
                              <Text style={styles.secondaryText}>
                                {selected ? "☑" : "☐"}{" "}
                                {REMOVED_ACCOUNT_CASE_SCOPE_LABELS[scope]}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={styles.meta}>
                        Type this exact confirmation: {expectedConfirmation}
                      </Text>
                      <TextInput
                        {...inputThemeProps}
                        accessibilityLabel={`Exact restricted case access confirmation for ${item.archiveId}`}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Type the exact confirmation"
                        value={draft.confirmation}
                        onChangeText={(confirmation) =>
                          updateRemovedCaseAccessDraft(item.archiveId, { confirmation })
                        }
                        style={styles.input}
                      />
                      <View style={styles.actions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Review restricted case access for ${item.archiveId}`}
                          accessibilityState={{
                            disabled:
                              !reviewReady ||
                              busyId === `case-access-review-${item.archiveId}` ||
                              busyId === `case-access-execute-${item.archiveId}`
                          }}
                          disabled={
                            !reviewReady ||
                            busyId === `case-access-review-${item.archiveId}` ||
                            busyId === `case-access-execute-${item.archiveId}`
                          }
                          style={styles.primaryButton}
                          onPress={() => void reviewRemovedAccountCaseAccess(item)}
                        >
                          <Text style={styles.primaryText}>
                            {busyId === `case-access-review-${item.archiveId}`
                              ? "Reviewing restricted access…"
                              : "Run restricted access review"}
                          </Text>
                        </Pressable>
                        {hasUsableRemovedAccountCaseReview(draft) ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View approved case data for ${item.archiveId}`}
                            accessibilityState={{
                              disabled: busyId === `case-access-execute-${item.archiveId}`
                            }}
                            disabled={busyId === `case-access-execute-${item.archiveId}`}
                            style={styles.dangerButton}
                            onPress={() => void executeRemovedAccountCaseAccess(item)}
                          >
                            <Text style={styles.dangerText}>
                              {busyId === `case-access-execute-${item.archiveId}`
                                ? "Opening approved case data…"
                                : "View approved case data once"}
                            </Text>
                          </Pressable>
                        ) : draft.reviewExpiresAt ? (
                          <Text style={styles.meta}>
                            The restricted review expired. Run a new review.
                          </Text>
                        ) : null}
                      </View>
                      {hasUsableRemovedAccountCaseReview(draft) ? (
                        <Text style={styles.meta}>
                          One-use review authorization expires{" "}
                          {new Date(draft.reviewExpiresAt).toLocaleString()}. Any scope,
                          purpose, request-ID, or confirmation change invalidates it.
                        </Text>
                      ) : null}
                      {result ? (
                        <View
                          accessibilityLabel={`Restricted case access result ${item.archiveId}`}
                          style={styles.evidencePreview}
                        >
                          <Text style={styles.caseTitle}>
                            Approved minimum-necessary case data
                          </Text>
                          <Text style={styles.meta}>
                            Evidence request: {result.evidenceRequestId} · External
                            transmission: none
                          </Text>
                          <Text style={styles.meta}>
                            Item counts: {JSON.stringify(result.itemCounts || {})}
                          </Text>
                          <Text selectable style={styles.meta}>
                            {JSON.stringify(result.data || {}, null, 2)}
                          </Text>
                        </View>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Close restricted case access for ${item.archiveId}`}
                        style={styles.secondaryButton}
                        onPress={() => closeRemovedCaseAccess(item.archiveId)}
                      >
                        <Text style={styles.secondaryText}>
                          Close and clear case view
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </AppCard>
              );
            })}
            {removedUsersNextCursor ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more removed accounts"
                accessibilityState={{ disabled: busyId === "removed-users-page" }}
                disabled={busyId === "removed-users-page"}
                style={styles.secondaryButton}
                onPress={() => void loadMoreRemovedUsers()}
              >
                <Text style={styles.secondaryText}>
                  {busyId === "removed-users-page"
                    ? "Loading removed accounts…"
                    : "Load more removed accounts"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.meta}>
            No removed account archive records are available.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Admin work queue"
        titleLevel={2}
        subtitle="Resolved support and actioned moderation records are achieved work. They remain in the audit history without crowding active work."
      >
        <Text style={styles.meta}>
          Active: {activeSupportRequests.length + activeModerationCases.length} ·
          Completed: {completedSupportRequests.length + completedModerationCases.length}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCompletedWork }}
          style={styles.secondaryButton}
          onPress={() => setShowCompletedWork((current) => !current)}
        >
          <Text style={styles.secondaryText}>
            {showCompletedWork ? "Hide completed work" : "Show completed work"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard
        title="Bug and support inbox"
        titleLevel={2}
        subtitle={
          showCompletedWork
            ? "Active and completed requests. Completed records remain available as audit history."
            : "Active requests only. Resolved and spam records are retained under Show completed work."
        }
      >
        {focusedSection === "support" ? (
          <Text style={styles.focusedCaseLabel}>Opened from a support/security link</Text>
        ) : null}
        {visibleSupportRequests.length ? (
          visibleSupportRequests.slice(0, 30).map((item) => (
            <View
              key={item._id}
              style={[
                styles.caseRow,
                focusedTargetKind === "supportrequest" && item._id === focusedTargetId
                  ? styles.focusedCaseRow
                  : null
              ]}
            >
              <View style={styles.caseCopy}>
                {focusedTargetKind === "supportrequest" &&
                item._id === focusedTargetId ? (
                  <Text style={styles.focusedCaseLabel}>
                    Opened from a support investigation link
                  </Text>
                ) : null}
                <Text style={styles.caseTitle}>
                  {item.topic} · {item.status} · {item.subject}
                </Text>
                <Text style={styles.meta}>
                  {item.name} · {item.replyEmail} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
                {item.workspace || item.page ? (
                  <Text style={styles.meta}>
                    {[item.workspace, item.page].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                <Text style={styles.evidencePreview}>{item.message}</Text>
                <Text style={styles.meta}>
                  Email delivery: {item.emailDelivery?.sent ? "sent" : "not confirmed"}
                </Text>
                <Text style={styles.meta}>
                  Assignment:{" "}
                  {item.assignedTo ? "assigned to an administrator" : "unassigned"}
                  {item.assignedAt
                    ? ` · ${new Date(item.assignedAt).toLocaleString()}`
                    : ""}
                </Text>
                {(item.adminNotes || []).slice(-5).map((note, index) => (
                  <Text key={note._id || `${item._id}-note-${index}`} style={styles.meta}>
                    Case note
                    {note.createdAt
                      ? ` · ${new Date(note.createdAt).toLocaleString()}`
                      : ""}
                    : {note.body}
                  </Text>
                ))}
              </View>
              {["resolved", "spam"].includes(item.status) ? (
                <View style={styles.caseCopy}>
                  <Text style={styles.meta}>Completed · retained for audit</Text>
                  <TextInput
                    {...inputThemeProps}
                    accessibilityLabel={`Reason to reopen ${item.subject}`}
                    value={supportReopenReasons[item._id] || ""}
                    onChangeText={(reason) =>
                      setSupportReopenReasons((current) => ({
                        ...current,
                        [item._id]: reason
                      }))
                    }
                    placeholder="Required reason to reopen"
                    style={styles.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      busyId === item._id ||
                      !String(supportReopenReasons[item._id] || "").trim()
                    }
                    style={styles.secondaryButton}
                    onPress={() =>
                      void updateSupportStatus(
                        item,
                        "open",
                        supportReopenReasons[item._id]
                      )
                    }
                  >
                    <Text style={styles.secondaryText}>Reopen request</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.caseCopy}>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Assign ${item.subject} to me`}
                      accessibilityState={{ disabled: busyId === item._id }}
                      disabled={busyId === item._id}
                      style={styles.secondaryButton}
                      onPress={() =>
                        void updateSupportOwnership(item, { assignToSelf: true })
                      }
                    >
                      <Text style={styles.secondaryText}>Assign to me</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    {...inputThemeProps}
                    accessibilityLabel={`Case note for ${item.subject}`}
                    value={supportCaseNotes[item._id] || ""}
                    onChangeText={(note) =>
                      setSupportCaseNotes((current) => ({ ...current, [item._id]: note }))
                    }
                    placeholder="Internal case note"
                    multiline
                    style={styles.input}
                  />
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add case note to ${item.subject}`}
                      accessibilityState={{
                        disabled:
                          busyId === item._id ||
                          !String(supportCaseNotes[item._id] || "").trim()
                      }}
                      disabled={
                        busyId === item._id ||
                        !String(supportCaseNotes[item._id] || "").trim()
                      }
                      style={styles.secondaryButton}
                      onPress={() =>
                        void updateSupportOwnership(item, {
                          note: supportCaseNotes[item._id]
                        })
                      }
                    >
                      <Text style={styles.secondaryText}>Add case note</Text>
                    </Pressable>
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${item.subject} in progress`}
                      accessibilityState={{
                        disabled: busyId === item._id || item.status === "in_progress"
                      }}
                      disabled={busyId === item._id || item.status === "in_progress"}
                      style={styles.secondaryButton}
                      onPress={() => void updateSupportStatus(item, "in_progress")}
                    >
                      <Text style={styles.secondaryText}>Mark in progress</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Resolve ${item.subject}`}
                      accessibilityState={{ disabled: busyId === item._id }}
                      disabled={busyId === item._id}
                      style={styles.primaryButton}
                      onPress={() => void updateSupportStatus(item, "resolved")}
                    >
                      <Text style={styles.primaryText}>Resolve</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No active bug or support requests. Completed history is retained and can be
            shown above.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Moderation cases"
        titleLevel={2}
        subtitle="Review reports and evidence before acting. Hide and soft-remove clear shared feeds; restore is reversible. Every action remains in the case and platform audit trail."
      >
        <TextInput
          {...inputThemeProps}
          value={moveCategory}
          onChangeText={setMoveCategory}
          placeholder="Destination category"
          style={styles.input}
        />
        {visibleModerationCases.length ? (
          visibleModerationCases.slice(0, 20).map((item) => (
            <View
              key={item._id}
              style={[
                styles.caseRow,
                item._id === focusedModerationCaseId ? styles.focusedCaseRow : null
              ]}
            >
              <View style={styles.caseCopy}>
                {item._id === focusedModerationCaseId ? (
                  <Text style={styles.focusedCaseLabel}>
                    Opened from a moderation investigation link
                  </Text>
                ) : null}
                <Text style={styles.caseTitle}>
                  {item.restricted
                    ? `Restricted severe-harm case · ${item.severity} · ${item.status}`
                    : `${item.targetType} · ${item.severity} · ${item.status}`}
                </Text>
                <Text style={styles.meta}>
                  {item.restricted
                    ? `${item.reportCount || 0} report${item.reportCount === 1 ? "" : "s"}. Reporter, subject, target, and evidence details are hidden from the general Admin queue.`
                    : item.reason}
                </Text>
                {!item.restricted && moderationPreview(item) ? (
                  <Text style={styles.evidencePreview} numberOfLines={4}>
                    “{moderationPreview(item)}”
                  </Text>
                ) : null}
                {!item.restricted && item.evidenceSnapshot?.classification ? (
                  <Text style={styles.meta}>
                    Automated triage · {item.evidenceSnapshot.classification.category} ·{" "}
                    {Math.round(
                      Number(item.evidenceSnapshot.classification.confidence || 0) * 100
                    )}
                    % confidence
                    {item.evidenceSnapshot.classification.matchedSignals?.length
                      ? ` · ${item.evidenceSnapshot.classification.matchedSignals.join(", ")}`
                      : ""}
                  </Text>
                ) : null}
                {!item.restricted && item.actionHistory?.length ? (
                  <Text style={styles.meta}>
                    Audit: {item.actionHistory.map((entry) => entry.action).join(" -> ")}
                  </Text>
                ) : null}
                {item.restricted && restrictedCaseReviews[item._id] ? (
                  <View
                    accessibilityLabel={`Audited restricted safety review ${item._id}`}
                    style={styles.evidencePreview}
                  >
                    <Text style={styles.caseTitle}>Audited restricted safety review</Text>
                    <Text style={styles.meta}>
                      Categories:{" "}
                      {restrictedCaseReviews[item._id]?.evidence.categories.join(", ") ||
                        "not recorded"}
                      {" · "}Highest severity:{" "}
                      {restrictedCaseReviews[item._id]?.evidence.highestSeverity ||
                        item.severity}
                      {" · "}Targets:{" "}
                      {restrictedCaseReviews[item._id]?.evidence.distinctTargetCount || 0}
                    </Text>
                    <Text style={styles.meta}>
                      Minimum-necessary metadata only. No raw media, storage location,
                      credential, automatic authority contact, download, or share control
                      is included here.
                    </Text>
                    {restrictedCaseReviews[item._id]?.evidence.reports.map((report) => (
                      <View key={report.reportId} style={styles.caseRow}>
                        <Text style={styles.caseTitle}>
                          {report.category || "restricted report"} ·{" "}
                          {report.status || "unknown"}
                        </Text>
                        <Text style={styles.meta}>
                          Report {report.reportId}
                          {report.createdAt
                            ? ` · ${new Date(report.createdAt).toLocaleString()}`
                            : ""}
                        </Text>
                        {report.reason ? (
                          <Text style={styles.meta}>{report.reason}</Text>
                        ) : null}
                      </View>
                    ))}
                    {restrictedCaseReviews[item._id]?.evidence.reportWindow?.truncated ? (
                      <Text
                        accessibilityRole="alert"
                        accessibilityLabel="Restricted report list is truncated"
                        style={styles.meta}
                      >
                        This view contains only the latest{" "}
                        {restrictedCaseReviews[item._id]?.evidence.reportWindow
                          ?.returned || 0}{" "}
                        reports, up to the server limit of{" "}
                        {restrictedCaseReviews[item._id]?.evidence.reportWindow?.limit ||
                          100}
                        . Additional report pagination is not available in this Admin
                        panel yet.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <View style={styles.actions}>
                {item.restricted ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open restricted safety review ${item._id}`}
                      accessibilityState={{
                        disabled:
                          busyId === `restricted-review-${item._id}` ||
                          !["open", "reviewing", "appealed"].includes(item.status)
                      }}
                      disabled={
                        busyId === `restricted-review-${item._id}` ||
                        !["open", "reviewing", "appealed"].includes(item.status)
                      }
                      style={styles.warningButton}
                      onPress={() => void openRestrictedCaseReview(item)}
                    >
                      <Text style={styles.warningText}>
                        {busyId === `restricted-review-${item._id}`
                          ? "Opening audited review…"
                          : restrictedCaseReviews[item._id]
                            ? "Refresh audited safety review"
                            : "Open audited safety review"}
                      </Text>
                    </Pressable>
                    <Text style={styles.meta}>
                      Available only to a configured safety reviewer. Every open and
                      action is recorded in the platform audit trail.
                    </Text>
                    {restrictedCaseReviews[item._id] ? (
                      <>
                        {(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                          .evidence.dispositionProgress ? (
                          <Text
                            accessibilityLiveRegion="polite"
                            accessibilityLabel="Restricted target disposition progress"
                            style={styles.meta}
                          >
                            Target review progress:{" "}
                            {(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                              .evidence.dispositionProgress?.completedTargetCount || 0}
                            {" of "}
                            {(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                              .evidence.dispositionProgress?.actionableTargetCount || 0}
                            {" actionable targets complete; "}
                            {(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                              .evidence.dispositionProgress?.remainingTargetCount || 0}
                            {" remain."}
                          </Text>
                        ) : Math.max(
                            Number(
                              (restrictedCaseReviews[item._id] as RestrictedSevereReview)
                                .evidence.distinctTargetCount
                            ) || 0,
                            uniqueRestrictedReviewTargets(
                              restrictedCaseReviews[item._id] as RestrictedSevereReview
                            ).length
                          ) > 1 ? (
                          <Text accessibilityRole="alert" style={styles.meta}>
                            This server did not return per-target disposition state. The
                            multi-target controls remain unavailable until the reviewed
                            backend is active.
                          </Text>
                        ) : null}
                        {uniqueRestrictedReviewTargets(
                          restrictedCaseReviews[item._id] as RestrictedSevereReview
                        ).map((target) => {
                          const review = restrictedCaseReviews[
                            item._id
                          ] as RestrictedSevereReview;
                          const progress = review.evidence.dispositionProgress;
                          const multiTargetWithoutSupport =
                            !progress &&
                            Math.max(
                              Number(review.evidence.distinctTargetCount) || 0,
                              uniqueRestrictedReviewTargets(review).length
                            ) > 1;
                          const disposition = target.disposition;
                          const canAct =
                            !multiTargetWithoutSupport &&
                            disposition?.state !== "completed" &&
                            target.targetType !== "user" &&
                            supportsModerationActions(target.targetType);
                          const canTakeAction = (candidateAction: string) =>
                            canAct &&
                            (!disposition ||
                              (disposition.state === "started" &&
                                disposition.action === candidateAction));
                          return (
                            <View
                              key={`${target.targetType}:${target.targetId}`}
                              accessibilityLabel={`Restricted target ${target.targetId}`}
                              style={styles.evidencePreview}
                            >
                              <Text style={styles.caseTitle}>
                                {target.targetType} · {target.status || "status unknown"}
                              </Text>
                              <Text style={styles.meta}>
                                Target {target.targetId}
                                {target.hasMediaReferences
                                  ? ` · ${target.mediaReferenceCount || 0} media reference${target.mediaReferenceCount === 1 ? "" : "s"}`
                                  : " · no media reference recorded"}
                              </Text>
                              {disposition ? (
                                <Text
                                  accessibilityLabel={
                                    "Restricted target disposition " + target.targetId
                                  }
                                  style={styles.meta}
                                >
                                  {disposition.state === "completed"
                                    ? "Reviewed disposition completed: " +
                                      disposition.action.replaceAll("_", " ") +
                                      "."
                                    : "Reviewed " +
                                      disposition.action.replaceAll("_", " ") +
                                      " action started. Only that exact action can be retried."}
                                </Text>
                              ) : null}
                              {canAct ? (
                                <View style={styles.actions}>
                                  {canTakeAction("hide") ? (
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Hide restricted target ${target.targetId}`}
                                      accessibilityState={{
                                        disabled: busyId === item._id
                                      }}
                                      disabled={busyId === item._id}
                                      style={styles.warningButton}
                                      onPress={() =>
                                        void moderateContent(item, "hide", target)
                                      }
                                    >
                                      <Text style={styles.warningText}>Hide target</Text>
                                    </Pressable>
                                  ) : null}
                                  {target.targetType === "forumPost" &&
                                  canTakeAction("remove") ? (
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Soft-remove restricted target ${target.targetId}`}
                                      accessibilityState={{
                                        disabled: busyId === item._id
                                      }}
                                      disabled={busyId === item._id}
                                      style={styles.warningButton}
                                      onPress={() =>
                                        void moderateContent(item, "remove", target)
                                      }
                                    >
                                      <Text style={styles.warningText}>
                                        Soft-remove target
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                  {canTakeAction("leave") ? (
                                    <Pressable
                                      accessibilityRole="button"
                                      accessibilityLabel={`Leave restricted target unchanged and dismiss its reports ${target.targetId}`}
                                      accessibilityState={{
                                        disabled: busyId === item._id
                                      }}
                                      disabled={busyId === item._id}
                                      style={styles.secondaryButton}
                                      onPress={() =>
                                        void moderateContent(item, "leave", target)
                                      }
                                    >
                                      <Text style={styles.secondaryText}>
                                        Leave target unchanged / dismiss its reports
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                </View>
                              ) : (
                                <Text style={styles.meta}>
                                  {disposition?.state === "completed"
                                    ? "This target is complete; unrelated targets remain open until separately reviewed."
                                    : multiTargetWithoutSupport
                                      ? "Per-target action is unavailable until the reviewed backend returns disposition state."
                                      : "This metadata-only target requires a reviewed case-level decision."}
                                </Text>
                              )}
                            </View>
                          );
                        })}
                        {(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                          .evidence.dispositionProgress &&
                        !(restrictedCaseReviews[item._id] as RestrictedSevereReview)
                          .evidence.dispositionProgress?.allTargetsDispositioned ? (
                          <View
                            accessibilityLabel={
                              "Reviewed case-level decision " + item._id
                            }
                            style={styles.evidencePreview}
                          >
                            <Text style={styles.caseTitle}>
                              Reviewed case-level no-action decision
                            </Text>
                            <Text style={styles.meta}>
                              Use only after reviewing the remaining metadata. This
                              dismisses all still-open reports and closes the aggregate
                              case. It does not contact an outside party or authority.
                            </Text>
                            <Text style={styles.meta}>
                              Exact confirmation: CLOSE RESTRICTED CASE {item._id}
                            </Text>
                            <TextInput
                              {...inputThemeProps}
                              accessibilityLabel={
                                "Restricted case-level decision reason " + item._id
                              }
                              value={restrictedCaseDecisionDrafts[item._id]?.reason || ""}
                              onChangeText={(reason) =>
                                setRestrictedCaseDecisionDrafts((current) => ({
                                  ...current,
                                  [item._id]: {
                                    reason,
                                    confirmation: current[item._id]?.confirmation || ""
                                  }
                                }))
                              }
                              placeholder="Reviewed reason (at least 20 characters)"
                              multiline
                              style={[styles.input, styles.messageInput]}
                            />
                            <TextInput
                              {...inputThemeProps}
                              accessibilityLabel={
                                "Exact restricted case-level confirmation " + item._id
                              }
                              value={
                                restrictedCaseDecisionDrafts[item._id]?.confirmation || ""
                              }
                              onChangeText={(confirmation) =>
                                setRestrictedCaseDecisionDrafts((current) => ({
                                  ...current,
                                  [item._id]: {
                                    reason: current[item._id]?.reason || "",
                                    confirmation
                                  }
                                }))
                              }
                              placeholder={"CLOSE RESTRICTED CASE " + item._id}
                              autoCapitalize="characters"
                              style={styles.input}
                            />
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={
                                "Close remaining restricted targets with reviewed decision " +
                                item._id
                              }
                              accessibilityState={{
                                disabled:
                                  busyId === "restricted-decision-" + item._id ||
                                  (
                                    restrictedCaseDecisionDrafts[item._id]?.reason || ""
                                  ).trim().length < 20 ||
                                  (
                                    restrictedCaseDecisionDrafts[item._id]
                                      ?.confirmation || ""
                                  ).trim() !==
                                    "CLOSE RESTRICTED CASE " + item._id
                              }}
                              disabled={
                                busyId === "restricted-decision-" + item._id ||
                                (
                                  restrictedCaseDecisionDrafts[item._id]?.reason || ""
                                ).trim().length < 20 ||
                                (
                                  restrictedCaseDecisionDrafts[item._id]?.confirmation ||
                                  ""
                                ).trim() !==
                                  "CLOSE RESTRICTED CASE " + item._id
                              }
                              style={styles.warningButton}
                              onPress={() => void closeRestrictedCaseWithDecision(item)}
                            >
                              <Text style={styles.warningText}>
                                Close remaining with reviewed no-action decision
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open preservation and legal escalation for restricted case ${item._id}`}
                          accessibilityState={{ disabled: busyId === item._id }}
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => {
                            setSourceModerationCaseId(item._id);
                            setEvidenceDraft((current) => ({
                              ...current,
                              requestType: "preservation",
                              targetUserId: "",
                              scope: `Restricted moderation case ${item._id}`
                            }));
                            setShowEvidenceRequestForm(true);
                          }}
                        >
                          <Text style={styles.secondaryText}>
                            Preserve / legal escalation
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Close restricted safety review ${item._id}`}
                          style={styles.secondaryButton}
                          onPress={() => closeRestrictedCaseReview(item._id)}
                        >
                          <Text style={styles.secondaryText}>
                            Close restricted review
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Pressable
                      accessibilityLabel={`Open reported ${item.targetType}`}
                      accessibilityRole="button"
                      style={styles.secondaryButton}
                      onPress={() => router.push(moderationTargetHref(item) as never)}
                    >
                      <Text style={styles.secondaryText}>Open reported content</Text>
                    </Pressable>
                    {supportsModerationActions(item.targetType) ? (
                      <>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.warningButton}
                          onPress={() => void moderateContent(item, "hide")}
                        >
                          <Text style={styles.warningText}>Hide content</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "restore")}
                        >
                          <Text style={styles.secondaryText}>Approve / restore</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.warningButton}
                          onPress={() => void moderateContent(item, "remove")}
                        >
                          <Text style={styles.warningText}>Soft-remove content</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "mark_cannabis")}
                        >
                          <Text style={styles.secondaryText}>
                            Mark cannabis-restricted
                          </Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "clear_cannabis")}
                        >
                          <Text style={styles.secondaryText}>Remove cannabis label</Text>
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable
                      disabled={busyId === item._id}
                      style={styles.secondaryButton}
                      onPress={() => void moderateContent(item, "leave")}
                    >
                      <Text style={styles.secondaryText}>Leave content / close case</Text>
                    </Pressable>
                    <Pressable
                      disabled={busyId === item._id}
                      style={styles.secondaryButton}
                      onPress={() => {
                        setSourceModerationCaseId(item._id);
                        setEvidenceDraft((current) => ({
                          ...current,
                          requestType: "preservation",
                          targetUserId: item.subjectUserId || "",
                          scope: `Moderation case ${item._id} · ${item.targetType}:${item.targetId}`
                        }));
                        setShowEvidenceRequestForm(true);
                      }}
                    >
                      <Text style={styles.secondaryText}>
                        Preserve / legal escalation
                      </Text>
                    </Pressable>
                    {item.targetType === "forumPost" ? (
                      <>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "lock")}
                        >
                          <Text style={styles.secondaryText}>Lock</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "unlock")}
                        >
                          <Text style={styles.secondaryText}>Unlock</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "pin")}
                        >
                          <Text style={styles.secondaryText}>Pin</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "unpin")}
                        >
                          <Text style={styles.secondaryText}>Unpin</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === item._id || !moveCategory.trim()}
                          style={styles.secondaryButton}
                          onPress={() => void moderateContent(item, "move")}
                        >
                          <Text style={styles.secondaryText}>Move category</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No active moderation cases. Completed history is retained and can be shown
            above.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Legal and evidence requests"
        titleLevel={2}
        subtitle="Preservation is separate from disclosure. Identity, authority, legal review, minimization, approval, and a disclosure manifest remain distinct controls."
      >
        <Text style={styles.evidencePreview}>
          The backend enforces legal approval, minimum-scope manifests, recipient/method
          recording, immutable custody, and audited transitions. A configured independent
          approver can approve the minimum-necessary case scopes here after identity,
          authority, jurisdiction, notice, and hold checks. This screen has no external
          disclosure control.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showEvidenceRequestForm ? "Cancel evidence request" : "Open scoped request"
          }
          accessibilityState={{ expanded: showEvidenceRequestForm }}
          style={styles.secondaryButton}
          onPress={() =>
            showEvidenceRequestForm
              ? cancelEvidenceRequestForm()
              : setShowEvidenceRequestForm(true)
          }
        >
          <Text style={styles.secondaryText}>
            {showEvidenceRequestForm ? "Cancel new request" : "Open scoped request"}
          </Text>
        </Pressable>
        {showEvidenceRequestForm ? (
          <View style={styles.evidencePreview}>
            <Text style={styles.caseTitle}>
              {sourceModerationCaseId
                ? "New restricted preservation request"
                : "New Admin-only evidence request"}
            </Text>
            <Text style={styles.meta}>
              {sourceModerationCaseId
                ? "This records an internal preservation-first legal review for the selected restricted case. It does not disclose evidence, notify an outside party, or contact an authority."
                : "Record only the received request and its exact scope. Creating this record does not preserve, approve, disclose, or notify anyone."}
            </Text>
            <View style={styles.pickerWrap}>
              <Text style={styles.metricLabel}>Request type</Text>
              <Picker
                accessibilityLabel="Evidence request type"
                selectedValue={evidenceDraft.requestType}
                onValueChange={(requestType) =>
                  setEvidenceDraft((current) => ({
                    ...current,
                    requestType: requestType as EvidenceRequestType
                  }))
                }
                style={styles.picker}
              >
                {EVIDENCE_REQUEST_TYPES.map((requestType) => (
                  <Picker.Item
                    key={requestType}
                    label={requestType.replaceAll("_", " ")}
                    value={requestType}
                  />
                ))}
              </Picker>
            </View>
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence requester name"
              value={evidenceDraft.requesterName}
              onChangeText={(requesterName) =>
                setEvidenceDraft((current) => ({ ...current, requesterName }))
              }
              placeholder="Required requester name"
              style={styles.input}
            />
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence requester organization"
              value={evidenceDraft.requesterOrganization}
              onChangeText={(requesterOrganization) =>
                setEvidenceDraft((current) => ({
                  ...current,
                  requesterOrganization
                }))
              }
              placeholder="Requester organization (optional)"
              style={styles.input}
            />
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence requester email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={evidenceDraft.requesterEmail}
              onChangeText={(requesterEmail) =>
                setEvidenceDraft((current) => ({ ...current, requesterEmail }))
              }
              placeholder="Required requester email"
              style={styles.input}
            />
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence authority description"
              value={evidenceDraft.authorityDescription}
              onChangeText={(authorityDescription) =>
                setEvidenceDraft((current) => ({
                  ...current,
                  authorityDescription
                }))
              }
              placeholder="Required identity, authority, and document description"
              multiline
              style={[styles.input, styles.messageInput]}
            />
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence jurisdiction"
              value={evidenceDraft.jurisdiction}
              onChangeText={(jurisdiction) =>
                setEvidenceDraft((current) => ({ ...current, jurisdiction }))
              }
              placeholder="Jurisdiction (optional)"
              style={styles.input}
            />
            {sourceModerationCaseId ? (
              <Text style={styles.meta}>
                The target account is bound to the restricted moderation case. Its
                identifier is not copied into this editable request draft.
              </Text>
            ) : (
              <TextInput
                {...inputThemeProps}
                accessibilityLabel="Evidence target user ID"
                autoCapitalize="none"
                value={evidenceDraft.targetUserId}
                onChangeText={(targetUserId) =>
                  setEvidenceDraft((current) => ({ ...current, targetUserId }))
                }
                placeholder="Exact target user ID (optional)"
                style={styles.input}
              />
            )}
            <TextInput
              {...inputThemeProps}
              accessibilityLabel="Evidence request scope"
              value={evidenceDraft.scope}
              onChangeText={(scope) =>
                setEvidenceDraft((current) => ({ ...current, scope }))
              }
              placeholder="Required minimum requested records and purpose"
              multiline
              style={[styles.input, styles.messageInput]}
            />
            <CalendarDateField
              accessibilityLabel="Evidence scope start date"
              label="Requested start date"
              value={evidenceDraft.dateFrom}
              onChange={(dateFrom) =>
                setEvidenceDraft((current) => ({ ...current, dateFrom }))
              }
              placeholder="Optional start date"
            />
            <CalendarDateField
              accessibilityLabel="Evidence scope end date"
              label="Requested end date"
              value={evidenceDraft.dateTo}
              onChange={(dateTo) =>
                setEvidenceDraft((current) => ({ ...current, dateTo }))
              }
              placeholder="Optional end date"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                sourceModerationCaseId
                  ? `Create restricted preservation request for case ${sourceModerationCaseId}`
                  : "Create received evidence request record"
              }
              accessibilityState={{ disabled: busyId === "evidence-new" }}
              disabled={busyId === "evidence-new"}
              style={styles.primaryButton}
              onPress={() => void createEvidenceRequest()}
            >
              <Text style={styles.primaryText}>Create received request record</Text>
            </Pressable>
          </View>
        ) : null}
        {focusedTargetKind === "legalevidencerequest" &&
        focusedTargetId &&
        !orderedEvidenceRequests.some((item) => item._id === focusedTargetId) ? (
          <Text accessibilityRole="alert" style={styles.meta}>
            The linked evidence request {focusedTargetId} is not in the current retained
            result set.
          </Text>
        ) : null}
        {orderedEvidenceRequests.length ? (
          orderedEvidenceRequests.slice(0, 20).map((item) => {
            const audit = evidenceAudit[item._id];
            const isFocused =
              focusedTargetKind === "legalevidencerequest" &&
              item._id === focusedTargetId;
            if (item.restricted === true) {
              return (
                <View
                  key={item._id}
                  accessibilityLabel={`Restricted evidence request ${item._id}`}
                  style={[styles.caseRow, isFocused ? styles.focusedCaseRow : null]}
                >
                  <View style={styles.caseCopy}>
                    {isFocused ? (
                      <Text style={styles.focusedCaseLabel}>
                        Opened from a restricted legal/evidence investigation link
                      </Text>
                    ) : null}
                    <Text style={styles.caseTitle}>
                      Restricted evidence request · {item.status || "unknown"}
                    </Text>
                    <Text style={styles.meta}>
                      Preservation hold: {item.preservationHold ? "active" : "not active"}
                      {" · "}Evidence items: {item.evidenceItemCount || 0}
                    </Text>
                    <Text style={styles.meta}>
                      Requester identity, authority details, target identity, scope, and
                      evidence contents are hidden from general Admin access.
                    </Text>
                    <Text style={styles.meta}>
                      Created {displayAdminDate(item.createdAt)} · Updated{" "}
                      {displayAdminDate(item.updatedAt)}
                    </Text>
                  </View>
                </View>
              );
            }
            const requestType = item.requestType || "evidence";
            const identityDraft =
              evidenceIdentityReviewDrafts[item._id] ||
              emptyEvidenceIdentityReviewDraft();
            const legalDraft =
              evidenceLegalReviewDrafts[item._id] || evidenceLegalReviewDraft(item);
            const evidenceReason = String(evidenceReasons[item._id] || "").trim();
            const legalApprovalReady =
              item.status === "legal_review" &&
              item.preservationHold === true &&
              evidenceReason.length > 0 &&
              legalDraft.jurisdiction.trim().length > 0 &&
              legalDraft.jurisdictionDetermination.trim().length > 0 &&
              legalDraft.jurisdictionReference.trim().length > 0 &&
              legalDraft.minimumNecessaryScope.trim().length > 0 &&
              legalDraft.approvedArchiveScopes.length > 0 &&
              Boolean(legalDraft.userNoticeStatus) &&
              legalDraft.approverName.trim().length > 0 &&
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalDraft.approverEmail.trim()) &&
              legalDraft.approverRole.trim().length > 0 &&
              legalDraft.approverReference.trim().length > 0;
            const canBeginIdentity = item.status === "received";
            const canSendLegal =
              ["identity_review", "preserved"].includes(item.status) &&
              item.requesterIdentityVerification?.verified === true &&
              item.requesterAuthorityVerification?.verified === true;
            const canRejectOrClose = [
              "received",
              "identity_review",
              "legal_review",
              "preserved"
            ].includes(item.status);
            const canClose = canRejectOrClose;
            const canPlaceHold = [
              "received",
              "identity_review",
              "legal_review",
              "preserved"
            ].includes(item.status);
            return (
              <View
                key={item._id}
                style={[styles.caseRow, isFocused ? styles.focusedCaseRow : null]}
              >
                <View style={styles.caseCopy}>
                  {isFocused ? (
                    <Text style={styles.focusedCaseLabel}>
                      Opened from a legal/evidence investigation link
                    </Text>
                  ) : null}
                  <Text style={styles.caseTitle}>
                    {requestType} · {item.status}
                  </Text>
                  <Text style={styles.meta}>
                    {item.requesterName || "Requester identity not recorded"}
                    {item.requesterOrganization ? ` · ${item.requesterOrganization}` : ""}
                  </Text>
                  <Text style={styles.meta}>
                    Contact: {item.requesterEmail || "not recorded"} · Jurisdiction:{" "}
                    {item.jurisdiction || "not recorded"}
                  </Text>
                  <Text style={styles.meta}>
                    Target account: {adminReferenceLabel(item.targetUserId)}
                  </Text>
                  <Text style={styles.evidencePreview}>
                    Authority supplied: {item.authorityDescription || "not recorded"}
                  </Text>
                  <Text style={styles.evidencePreview}>
                    Requested scope: {item.scope || "not recorded"}
                  </Text>
                  <Text style={styles.meta}>
                    Date scope: {displayAdminDate(item.dateFrom)}
                    {" to "}
                    {displayAdminDate(item.dateTo)}
                  </Text>
                  <Text style={styles.meta}>
                    User notice: {item.userNoticeStatus || "not reviewed"} · Evidence
                    items: {item.evidenceItems?.length || 0}
                  </Text>
                  <Text style={styles.meta}>
                    Created by {adminReferenceLabel(item.createdBy)}
                    {item.createdAt
                      ? ` · ${new Date(item.createdAt).toLocaleString()}`
                      : ""}
                    {item.reviewedBy
                      ? ` · last reviewed by ${adminReferenceLabel(item.reviewedBy)}`
                      : ""}
                    {item.updatedAt
                      ? ` · updated ${new Date(item.updatedAt).toLocaleString()}`
                      : ""}
                  </Text>
                  {item.closedAt ? (
                    <Text style={styles.meta}>
                      Closed {new Date(item.closedAt).toLocaleString()}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    Requester identity verification:{" "}
                    {item.requesterIdentityVerification?.verified
                      ? `verified by ${adminReferenceLabel(
                          item.requesterIdentityVerification.verifiedBy
                        )}`
                      : "not verified"}
                    {" · "}Authority verification:{" "}
                    {item.requesterAuthorityVerification?.verified
                      ? `verified by ${adminReferenceLabel(
                          item.requesterAuthorityVerification.verifiedBy
                        )}`
                      : "not verified"}
                  </Text>
                  {item.approvedArchiveScopes?.length ? (
                    <Text style={styles.meta}>
                      Approved archive scopes:{" "}
                      {item.approvedArchiveScopes
                        .map((scope) => REMOVED_ACCOUNT_CASE_SCOPE_LABELS[scope] || scope)
                        .join(", ")}
                    </Text>
                  ) : null}
                  {item.evidenceItems?.length ? (
                    <View style={styles.evidencePreview}>
                      <Text style={styles.caseTitle}>Retained evidence manifest</Text>
                      {item.evidenceItems.map((entry, index) => (
                        <Text
                          key={entry._id || `${entry.sourceType}-${index}`}
                          style={styles.meta}
                        >
                          {entry.sourceType}:{entry.sourceId}
                          {entry.description ? ` · ${entry.description}` : ""}
                          {entry.sha256 ? ` · SHA-256 ${entry.sha256}` : ""}
                          {entry.preservedAt
                            ? ` · preserved ${new Date(entry.preservedAt).toLocaleString()}`
                            : ""}
                          {entry.preservedBy
                            ? ` · by ${adminReferenceLabel(entry.preservedBy)}`
                            : ""}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <TextInput
                    {...inputThemeProps}
                    accessibilityLabel={`Review reason for ${requestType} request`}
                    value={evidenceReasons[item._id] || ""}
                    onChangeText={(reason) =>
                      setEvidenceReasons((current) => ({
                        ...current,
                        [item._id]: reason
                      }))
                    }
                    placeholder="Required preservation or review reason"
                    multiline
                    style={styles.input}
                  />
                  {item.status === "identity_review"
                    ? renderEvidenceIdentityReview(item, identityDraft, evidenceReason)
                    : null}
                  {item.status === "legal_review"
                    ? renderEvidenceLegalReview(item, legalDraft, legalApprovalReady)
                    : null}
                  <View style={styles.actions}>
                    {canPlaceHold ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id || item.preservationHold}
                        style={
                          item.preservationHold
                            ? styles.secondaryButton
                            : styles.primaryButton
                        }
                        onPress={() => void preserveEvidence(item)}
                      >
                        <Text
                          style={
                            item.preservationHold
                              ? styles.secondaryText
                              : styles.primaryText
                          }
                        >
                          {item.preservationHold
                            ? "Preservation active"
                            : "Place preservation hold"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {canBeginIdentity ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id}
                        style={styles.secondaryButton}
                        onPress={() => void updateEvidenceStatus(item, "identity_review")}
                      >
                        <Text style={styles.secondaryText}>Begin identity review</Text>
                      </Pressable>
                    ) : null}
                    {canSendLegal ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id}
                        style={styles.secondaryButton}
                        onPress={() => void updateEvidenceStatus(item, "legal_review")}
                      >
                        <Text style={styles.secondaryText}>Send to legal review</Text>
                      </Pressable>
                    ) : null}
                    {canRejectOrClose ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id}
                        style={styles.warningButton}
                        onPress={() => void updateEvidenceStatus(item, "rejected")}
                      >
                        <Text style={styles.warningText}>
                          {item.preservationHold
                            ? "Reject request and release hold"
                            : "Reject request"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {canClose ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id}
                        style={styles.secondaryButton}
                        onPress={() => void updateEvidenceStatus(item, "closed")}
                      >
                        <Text style={styles.secondaryText}>
                          {item.preservationHold
                            ? "Close without disclosure and release hold"
                            : "Close without disclosure"}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={audit?.loading}
                      style={styles.secondaryButton}
                      onPress={() => void loadEvidenceAudit(item)}
                    >
                      <Text style={styles.secondaryText}>
                        {audit?.loading ? "Loading audit…" : "Load retained audit"}
                      </Text>
                    </Pressable>
                  </View>
                  {audit?.error ? (
                    <Text accessibilityRole="alert" style={styles.error}>
                      {audit.error}
                    </Text>
                  ) : null}
                  {audit && !audit.loading && !audit.error ? (
                    audit.events.length ? (
                      audit.events.map((event, index) => (
                        <Text
                          key={event._id || `${event.action}-${index}`}
                          style={styles.meta}
                        >
                          {event.createdAt
                            ? new Date(event.createdAt).toLocaleString()
                            : "Time not recorded"}
                          {" · "}
                          {event.action.replaceAll("_", " ")}
                          {event.reason ? ` · ${event.reason}` : ""}
                          {` · actor ${adminReferenceLabel(event.actorUserId)}`}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.meta}>No retained audit events returned.</Text>
                    )
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.meta}>No legal or evidence requests have been opened.</Text>
        )}
      </AppCard>

      {noticeUser ? (
        <AppCard
          title={`Email ${noticeUser.email}`}
          subtitle="The delivery and administrator are recorded in the audit trail."
        >
          <TextInput
            {...inputThemeProps}
            value={noticeSubject}
            onChangeText={setNoticeSubject}
            placeholder="Subject"
            style={styles.input}
          />
          <TextInput
            {...inputThemeProps}
            value={noticeMessage}
            onChangeText={setNoticeMessage}
            placeholder="Explain the concern, required action, and policy involved"
            multiline
            style={[styles.input, styles.messageInput]}
          />
          <View style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={() => void sendNotice()}>
              <Text style={styles.primaryText}>Send notice</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setNoticeUser(null)}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </AppCard>
      ) : null}
    </AppPage>
  );
}

export const createPlatformAdminStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    activityRow: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 150,
      padding: 10
    },
    activityLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    activityValue: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "900",
      marginTop: 3
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    body: { color: palette.textMuted, lineHeight: 21, marginTop: 6 },
    billingTruth: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 10
    },
    billingTruthTitle: { color: palette.text, fontWeight: "900" },
    caseCopy: { flex: 1, minWidth: 220 },
    caseRow: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      paddingVertical: 12
    },
    focusedCaseRow: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 2,
      marginVertical: 8,
      paddingHorizontal: 12
    },
    focusedCaseLabel: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 4
    },
    caseTitle: {
      color: palette.text,
      fontWeight: "900",
      textTransform: "capitalize"
    },
    cleanupReview: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 14,
      padding: 12
    },
    cleanupReviewTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900"
    },
    evidencePreview: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.textSoft,
      lineHeight: 19,
      marginTop: 6,
      padding: 9
    },
    dangerButton: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    dangerText: { color: palette.danger, fontWeight: "800" },
    denied: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center",
      padding: 24
    },
    error: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.danger,
      padding: 12
    },
    eyebrow: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      flex: 1,
      minWidth: 220,
      padding: 12
    },
    knownTestAccountLabel: {
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.link,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    protectedIdentityLabel: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radius.card,
      color: palette.danger,
      fontSize: 11,
      fontWeight: "900",
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    messageInput: { minHeight: 120, marginTop: 10, textAlignVertical: "top" },
    meta: { color: palette.textMuted, lineHeight: 20, marginTop: 4 },
    metric: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      minWidth: 180,
      padding: 16
    },
    metricLabel: { color: palette.textMuted, fontWeight: "800" },
    metricValue: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900",
      marginTop: 6
    },
    metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    picker: { backgroundColor: palette.surface, color: palette.text },
    pickerWrap: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 8,
      overflow: "hidden",
      paddingHorizontal: 10
    },
    searchRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    title: { color: palette.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
    userList: { gap: 12 },
    warningButton: {
      backgroundColor: palette.surface,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    warningText: { color: palette.warning, fontWeight: "800" }
  });
