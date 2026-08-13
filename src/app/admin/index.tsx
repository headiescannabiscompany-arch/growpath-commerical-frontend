import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  "storefrontProduct"
]);

function matchesModerationTargetRoute(targetType: string, pathname: string) {
  if (targetType === "forumPost" || targetType === "comment") {
    return pathname.startsWith("/forum/post/") || pathname === "/forum/post";
  }
  if (targetType === "course") {
    return pathname === "/courses" || /^\/store\/[^/]+\/courses\/[^/]+$/.test(pathname);
  }
  if (targetType === "video") return pathname.startsWith("/videos/");
  if (targetType === "commercialPost") {
    return pathname === "/feed" || pathname.endsWith("/feed");
  }
  if (targetType === "feedItem" || targetType === "post") return pathname === "/feed";
  if (targetType === "storefrontProduct") {
    return pathname === "/store" || /^\/store\/[^/]+\/products\/[^/]+$/.test(pathname);
  }
  if (targetType === "liveSession") return pathname === "/live-session";
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
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Fall back to the canonical route for the stored target type.
    }
  }

  const id = encodeURIComponent(String(item.targetId || ""));
  if (item.targetType === "forumPost") return `/forum/post/${id}`;
  if (item.targetType === "course") return `/courses?courseId=${id}`;
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
  scope: string;
  status: string;
  preservationHold: boolean;
};

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
  const { user } = useAuth();
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
  const routeParams = useLocalSearchParams<{ moderationCaseId?: string | string[] }>();
  const focusedModerationCaseId = String(
    Array.isArray(routeParams.moderationCaseId)
      ? routeParams.moderationCaseId[0]
      : routeParams.moderationCaseId || ""
  );
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
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
  const [noticeUser, setNoticeUser] = useState<AdminUser | null>(null);
  const [noticeSubject, setNoticeSubject] = useState("GrowPathAI account warning");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [cleanupPreview, setCleanupPreview] =
    useState<SyntheticCleanupPreview | null>(null);
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const labels = [
        "Overview",
        "Usage",
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
      const usersResponse = responseAt(2);
      const moderationResponse = responseAt(3);
      const evidenceResponse = responseAt(4);
      const supportResponse = responseAt(5);
      const knowledgeResponse = responseAt(6);
      const methodReviewResponse = responseAt(7);
      const harvestCalibrationResponse = responseAt(8);

      if (overviewResponse) setOverview(overviewResponse.overview || null);
      if (usageResponse) setUsage(usageResponse.usage || null);
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
    action: "hide" | "restore" | "remove" | "lock" | "unlock" | "pin" | "unpin" | "move"
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
    setBusyId(item._id);
    try {
      await apiRequest(`/api/admin/evidence-requests/${item._id}`, {
        method: "PATCH",
        body: {
          status: "preserved",
          preservationHold: true,
          reason: "Platform owner approved preservation hold"
        }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Evidence preservation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function updateSupportStatus(
    item: SupportRequest,
    status: SupportRequest["status"]
  ) {
    setBusyId(item._id);
    try {
      await apiRequest(`/api/admin/support-requests/${item._id}`, {
        method: "PATCH",
        body: { status, reason: "Platform owner support review" }
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Support request update failed.");
    } finally {
      setBusyId("");
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
        </View>
      }
    >
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
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
        {users.map((item) => (
          <AppCard
            key={item._id}
            title={item.displayName || item.name || item.email}
            subtitle={`${item.email} · ${item.mode || "personal"} · ${item.plan || "free"}`}
          >
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
        title="Bug and support inbox"
        titleLevel={2}
        subtitle="Stored in GrowPathAI even if email delivery fails. Newest requests appear first."
      >
        {supportRequests.length ? (
          supportRequests.slice(0, 30).map((item) => (
            <View key={item._id} style={styles.caseRow}>
              <View style={styles.caseCopy}>
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
              <View style={styles.actions}>
                <Pressable
                  disabled={busyId === item._id}
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
            </View>
          ))
        ) : (
          <Text style={styles.meta}>
            No stored bug or support requests yet. Email-only history before this release
            is not backfilled.
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
        {orderedModerationCases.length ? (
          orderedModerationCases.slice(0, 20).map((item) => (
            <View
              key={item._id}
              style={[
                styles.caseRow,
                item._id === focusedModerationCaseId ? styles.focusedCaseRow : null
              ]}
            >
              <View style={styles.caseCopy}>
                {item._id === focusedModerationCaseId ? (
                  <Text style={styles.focusedCaseLabel}>Opened from report email</Text>
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
                {MODERATABLE_TARGETS.has(item.targetType) ? (
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
                  </>
                ) : null}
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
                    <Pressable
                      disabled={busyId === item._id}
                      accessibilityLabel="Soft-remove Forum post"
                      accessibilityHint="Removes the post from readers and shared feeds while preserving evidence for review and restoration."
                      style={styles.warningButton}
                      onPress={() => void moderateContent(item, "remove")}
                    >
                      <Text style={styles.warningText}>Soft-remove post</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No moderation cases are waiting for review.</Text>
        )}
      </AppCard>

      <AppCard
        title="Legal and evidence requests"
        titleLevel={2}
        subtitle="Preservation is separate from disclosure. Legal review is still required."
      >
        {evidenceRequests.length ? (
          evidenceRequests.slice(0, 20).map((item) => (
            <View key={item._id} style={styles.caseRow}>
              <View style={styles.caseCopy}>
                <Text style={styles.caseTitle}>
                  {item.requestType} · {item.status}
                </Text>
                <Text style={styles.meta}>
                  {item.requesterName}
                  {item.requesterOrganization ? ` · ${item.requesterOrganization}` : ""}
                </Text>
                <Text style={styles.meta}>{item.scope}</Text>
              </View>
              <Pressable
                disabled={busyId === item._id || item.preservationHold}
                style={
                  item.preservationHold ? styles.secondaryButton : styles.primaryButton
                }
                onPress={() => void preserveEvidence(item)}
              >
                <Text
                  style={
                    item.preservationHold ? styles.secondaryText : styles.primaryText
                  }
                >
                  {item.preservationHold ? "Preservation active" : "Preserve evidence"}
                </Text>
              </Pressable>
            </View>
          ))
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
