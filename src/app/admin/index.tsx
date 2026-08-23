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

import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
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
};

type SyntheticCleanupPreview = {
  ok: boolean;
  dryRun: boolean;
  target: { id: string; email: string };
  allowlisted: boolean;
  blockers: string[];
  deletionMode: string;
  nextConfirmation: string;
};

type ModerationCase = {
  _id: string;
  targetType: string;
  targetId: string;
  reason: string;
  severity: string;
  status: string;
  action: string;
  subjectUserId?: string;
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

export function supportsModerationActions(targetType: string) {
  return MODERATABLE_TARGETS.has(targetType);
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
  const submitted = String(item.evidenceSnapshot?.targetUrl || "").trim();
  if (submitted) {
    try {
      const parsed = new URL(submitted, "https://growpathai.com");
      if (
        (parsed.hostname === "growpathai.com" ||
          parsed.hostname.endsWith(".growpathai.com")) &&
        matchesModerationTargetRoute(item.targetType, parsed.pathname)
      ) {
        if (item.targetType === "course") {
          parsed.searchParams.set("moderationCaseId", String(item._id || ""));
        }
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Fall back to the canonical route for the stored target type.
    }
  }

  const id = encodeURIComponent(String(item.targetId || ""));
  if (item.targetType === "forumPost") return `/forum/post/${id}`;
  if (item.targetType === "course") {
    return `/courses?courseId=${id}&moderationCaseId=${encodeURIComponent(
      String(item._id || "")
    )}`;
  }
  if (item.targetType === "video") return `/videos/${id}`;
  if (item.targetType === "commercialPost") return `/feed?campaignId=${id}`;
  if (item.targetType === "feedItem") return `/feed?feedItemId=${id}`;
  if (item.targetType === "storefrontProduct") return `/store?q=${id}`;
  if (item.targetType === "liveSession") return `/live-session?sessionId=${id}`;
  return `/admin?targetType=${encodeURIComponent(item.targetType)}&targetId=${id}`;
}

type EvidenceRequest = {
  _id: string;
  requestType: string;
  requesterName: string;
  requesterOrganization?: string;
  requesterEmail?: string;
  authorityDescription?: string;
  jurisdiction?: string;
  targetUserId?: string | { _id?: string; email?: string; displayName?: string } | null;
  scope: string;
  status: string;
  preservationHold: boolean;
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
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
};

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
  const orderedUsers = useMemo(() => {
    if (focusedTargetKind !== "user" || !focusedTargetId) return users;
    return [...users].sort((left, right) => {
      if (left._id === focusedTargetId) return -1;
      if (right._id === focusedTargetId) return 1;
      return 0;
    });
  }, [focusedTargetId, focusedTargetKind, users]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
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
  const [cleanupPreview, setCleanupPreview] = useState<SyntheticCleanupPreview | null>(
    null
  );
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [supportReopenReasons, setSupportReopenReasons] = useState<
    Record<string, string>
  >({});
  const [evidenceReasons, setEvidenceReasons] = useState<Record<string, string>>({});
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
          ? `${item.targetType} moderation · ${item.status}`
          : `Moderation case ${focusedModerationCaseId}`,
        detail: item?.reason || "The linked case is not in the current result set."
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
          ? `${item.requestType.replaceAll("_", " ")} · ${item.status}`
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
        "Harvest calibration queue"
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
        apiRequest("/api/ai/training/harvest-trichome-calibration")
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
      if (moderationResponse)
        setModerationCases(
          Array.isArray(moderationResponse.cases) ? moderationResponse.cases : []
        );
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

  async function reviewSyntheticCleanup(target: AdminUser) {
    setBusyId(target._id);
    setError("");
    try {
      const preview = await apiRequest<SyntheticCleanupPreview>(
        `/api/admin/users/${target._id}/anonymize-synthetic-account`,
        {
          method: "POST",
          body: { expectedEmail: target.email }
        }
      );
      setCleanupPreview(preview);
      setCleanupConfirmation("");
    } catch (err: any) {
      setError(err?.message || "This account is not approved for synthetic cleanup.");
    } finally {
      setBusyId("");
    }
  }

  async function executeSyntheticCleanup() {
    if (!cleanupPreview) return;
    setBusyId(cleanupPreview.target.id);
    setError("");
    try {
      await apiRequest(
        `/api/admin/users/${cleanupPreview.target.id}/anonymize-synthetic-account`,
        {
          method: "POST",
          body: {
            expectedEmail: cleanupPreview.target.email,
            execute: true,
            confirmation: cleanupConfirmation
          }
        }
      );
      setCleanupPreview(null);
      setCleanupConfirmation("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Synthetic-account anonymization failed safely.");
    } finally {
      setBusyId("");
    }
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
      | "move"
  ) {
    setBusyId(item._id);
    try {
      await apiRequest(`/api/admin/moderation-cases/${item._id}/action`, {
        method: "POST",
        body: { action, ...(action === "move" ? { category: moveCategory.trim() } : {}) }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Content moderation action failed.");
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

  async function updateEvidenceStatus(item: EvidenceRequest, status: string) {
    const reason = String(evidenceReasons[item._id] || "").trim();
    if (!reason) {
      setError("A typed review reason is required before changing request status.");
      return;
    }
    setBusyId(item._id);
    setError("");
    try {
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: { status, reason }
      });
      setEvidenceReasons((current) => ({ ...current, [item._id]: "" }));
      await load();
    } catch (err: any) {
      setError(err?.message || "Evidence request review failed.");
    } finally {
      setBusyId("");
    }
  }

  async function createEvidenceRequest() {
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
        sourceModerationCaseId
          ? `/api/admin/moderation-cases/${sourceModerationCaseId}/escalate-legal`
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
            targetUserId: targetUserId || null,
            scope,
            dateFrom: evidenceDraft.dateFrom || null,
            dateTo: evidenceDraft.dateTo || null
          }
        }
      );
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
      setError(err?.message || "Unable to open the scoped evidence request.");
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
          <Pressable style={styles.primaryButton} onPress={() => void load()}>
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
            <Text style={styles.meta}>
              Last active:{" "}
              {item.lastActiveAt
                ? new Date(item.lastActiveAt).toLocaleString()
                : "Never recorded"}
            </Text>
            <View style={styles.actions}>
              <Pressable
                disabled={busyId === item._id}
                style={styles.secondaryButton}
                onPress={() => void refreshTokens(item)}
              >
                <Text style={styles.secondaryText}>Refresh tokens</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setNoticeUser(item)}
              >
                <Text style={styles.secondaryText}>Email notice</Text>
              </Pressable>
              {item.accountStatus === "active" ? (
                <Pressable
                  disabled={busyId === item._id}
                  style={styles.warningButton}
                  onPress={() => void changeStatus(item, "suspended")}
                >
                  <Text style={styles.warningText}>Suspend</Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={busyId === item._id}
                  style={styles.secondaryButton}
                  onPress={() => void changeStatus(item, "active")}
                >
                  <Text style={styles.secondaryText}>Restore</Text>
                </Pressable>
              )}
              <Pressable
                disabled={busyId === item._id}
                style={styles.dangerButton}
                onPress={() => void changeStatus(item, "banned")}
              >
                <Text style={styles.dangerText}>Ban</Text>
              </Pressable>
              <Pressable
                disabled={busyId === item._id}
                style={styles.secondaryButton}
                onPress={() => void reviewSyntheticCleanup(item)}
              >
                <Text style={styles.secondaryText}>Review test-account cleanup</Text>
              </Pressable>
            </View>
          </AppCard>
        ))}
      </View>

      {cleanupPreview ? (
        <AppCard
          title={`Anonymize ${cleanupPreview.target.email}`}
          subtitle="This is permanent. GrowPath will reuse the complete privacy deletion process and retain only records required for security, compliance, billing, disputes, or audit."
        >
          <Text style={styles.meta}>
            Exact production allowlist: approved · Safety blockers: none · Dry run: passed
          </Text>
          <Text style={styles.meta}>
            Type this exact confirmation: {cleanupPreview.nextConfirmation}
          </Text>
          <TextInput
            {...inputThemeProps}
            accessibilityLabel="Exact synthetic account anonymization confirmation"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste the exact confirmation"
            value={cleanupConfirmation}
            onChangeText={setCleanupConfirmation}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable
              disabled={
                busyId === cleanupPreview.target.id ||
                cleanupConfirmation !== cleanupPreview.nextConfirmation
              }
              style={styles.dangerButton}
              onPress={() => void executeSyntheticCleanup()}
            >
              <Text style={styles.dangerText}>Anonymize approved test account</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setCleanupPreview(null);
                setCleanupConfirmation("");
              }}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </AppCard>
      ) : null}

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
                <View style={styles.actions}>
                  <Pressable
                    disabled={busyId === item._id || item.status === "in_progress"}
                    style={styles.secondaryButton}
                    onPress={() => void updateSupportStatus(item, "in_progress")}
                  >
                    <Text style={styles.secondaryText}>Mark in progress</Text>
                  </Pressable>
                  <Pressable
                    disabled={busyId === item._id}
                    style={styles.primaryButton}
                    onPress={() => void updateSupportStatus(item, "resolved")}
                  >
                    <Text style={styles.primaryText}>Resolve</Text>
                  </Pressable>
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
                  {item.targetType} · {item.severity} · {item.status}
                </Text>
                <Text style={styles.meta}>{item.reason}</Text>
                {moderationPreview(item) ? (
                  <Text style={styles.evidencePreview} numberOfLines={4}>
                    “{moderationPreview(item)}”
                  </Text>
                ) : null}
                {item.evidenceSnapshot?.classification ? (
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
                {item.actionHistory?.length ? (
                  <Text style={styles.meta}>
                    Audit: {item.actionHistory.map((entry) => entry.action).join(" -> ")}
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
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
                      <Text style={styles.secondaryText}>Mark cannabis-restricted</Text>
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
                  <Text style={styles.secondaryText}>Preserve / legal escalation</Text>
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
          Approval and disclosure are unavailable here until the backend enforces legal
          approval, minimum-scope manifests, recipient/method recording, and chain of
          custody. This screen cannot release account data.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showEvidenceRequestForm }}
          style={styles.secondaryButton}
          onPress={() => setShowEvidenceRequestForm((current) => !current)}
        >
          <Text style={styles.secondaryText}>
            {showEvidenceRequestForm ? "Cancel new request" : "Open scoped request"}
          </Text>
        </Pressable>
        {showEvidenceRequestForm ? (
          <View style={styles.evidencePreview}>
            <Text style={styles.caseTitle}>New Admin-only evidence request</Text>
            <Text style={styles.meta}>
              Record only the received request and its exact scope. Creating this record
              does not preserve, approve, disclose, or notify anyone.
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
            const canBeginIdentity = item.status === "received";
            const canSendLegal = ["identity_review", "preserved"].includes(item.status);
            const canRejectOrClose = [
              "received",
              "identity_review",
              "legal_review",
              "preserved"
            ].includes(item.status);
            const canClose = canRejectOrClose && !item.preservationHold;
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
                    {item.requestType} · {item.status}
                  </Text>
                  <Text style={styles.meta}>
                    {item.requesterName}
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
                    Requested scope: {item.scope}
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
                    accessibilityLabel={`Review reason for ${item.requestType} request`}
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
                  <View style={styles.actions}>
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
                        <Text style={styles.warningText}>Reject request</Text>
                      </Pressable>
                    ) : null}
                    {canClose ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={busyId === item._id}
                        style={styles.secondaryButton}
                        onPress={() => void updateEvidenceStatus(item, "closed")}
                      >
                        <Text style={styles.secondaryText}>Close without disclosure</Text>
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
