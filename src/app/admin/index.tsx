import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
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

type ModerationCase = {
  _id: string;
  targetType: string;
  targetId: string;
  reason: string;
  severity: string;
  status: string;
  action: string;
  evidenceSnapshot?: {
    automated?: boolean;
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
  revision: number;
  reviewDueAt?: string;
  reviewStatus?:
    | "current"
    | "review_overdue"
    | "review_date_missing"
    | "review_date_invalid";
};

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
  const router = useRouter();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [moderationCases, setModerationCases] = useState<ModerationCase[]>([]);
  const [evidenceRequests, setEvidenceRequests] = useState<EvidenceRequest[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [knowledgeDraft, setKnowledgeDraft] = useState({
    entryId: "",
    entryType: "source" as "source" | "method",
    title: "",
    domain: "",
    reliabilityTier: "B",
    guidance: "",
    reviewDueAt: defaultKnowledgeReviewDate(),
    changeNote: "Initial admin review"
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [noticeUser, setNoticeUser] = useState<AdminUser | null>(null);
  const [noticeSubject, setNoticeSubject] = useState("GrowPathAI account warning");
  const [noticeMessage, setNoticeMessage] = useState("");

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      const [
        overviewResponse,
        usageResponse,
        usersResponse,
        moderationResponse,
        evidenceResponse,
        supportResponse,
        knowledgeResponse
      ] = await Promise.all([
        apiRequest("/api/admin/overview"),
        apiRequest("/api/admin/usage"),
        apiRequest(`/api/admin/users${suffix}`),
        apiRequest("/api/admin/moderation-cases"),
        apiRequest("/api/admin/evidence-requests"),
        apiRequest("/api/admin/support-requests"),
        apiRequest("/api/admin/knowledge-registry")
      ]);
      setOverview(overviewResponse?.overview || null);
      setUsage(usageResponse?.usage || null);
      setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users : []);
      setModerationCases(
        Array.isArray(moderationResponse?.cases) ? moderationResponse.cases : []
      );
      setEvidenceRequests(
        Array.isArray(evidenceResponse?.requests) ? evidenceResponse.requests : []
      );
      setSupportRequests(
        Array.isArray(supportResponse?.requests) ? supportResponse.requests : []
      );
      setKnowledgeEntries(
        Array.isArray(knowledgeResponse?.entries) ? knowledgeResponse.entries : []
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load platform administration data.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, query]);

  async function createKnowledgeEntry() {
    if (!knowledgeDraft.entryId.trim() || !knowledgeDraft.title.trim()) {
      setError("Knowledge entry ID and title are required.");
      return;
    }
    setBusyId("knowledge-new");
    setError("");
    try {
      await apiRequest("/api/admin/knowledge-registry", {
        method: "POST",
        body: knowledgeDraft
      });
      setKnowledgeDraft((value) => ({
        ...value,
        entryId: "",
        title: "",
        domain: "",
        guidance: "",
        reviewDueAt: defaultKnowledgeReviewDate(),
        changeNote: "Initial admin review"
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

  async function moderateContent(item: ModerationCase, action: "hide" | "restore") {
    setBusyId(item._id);
    try {
      await apiRequest(`/api/admin/moderation-cases/${item._id}/action`, {
        method: "POST",
        body: { action }
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
        <Text style={styles.title}>Platform owner access required</Text>
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
          <Text style={styles.title}>Administration</Text>
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
      {loading && !overview ? <ActivityIndicator /> : null}
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
        title="Knowledge registry review"
        subtitle="Version source reliability and GrowPath methods. Drafts do not silently replace approved runtime guidance."
      >
        <View style={styles.searchRow}>
          <Pressable
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
            value={knowledgeDraft.entryId}
            onChangeText={(entryId) =>
              setKnowledgeDraft((value) => ({ ...value, entryId }))
            }
            placeholder="Stable entry ID"
            style={styles.input}
          />
          <TextInput
            value={knowledgeDraft.title}
            onChangeText={(title) => setKnowledgeDraft((value) => ({ ...value, title }))}
            placeholder="Source or method title"
            style={styles.input}
          />
        </View>
        <TextInput
          value={knowledgeDraft.domain}
          onChangeText={(domain) => setKnowledgeDraft((value) => ({ ...value, domain }))}
          placeholder="Domain (sources only)"
          style={styles.input}
        />
        <TextInput
          value={knowledgeDraft.guidance}
          onChangeText={(guidance) =>
            setKnowledgeDraft((value) => ({ ...value, guidance }))
          }
          placeholder="Trusted use, exclusions, or method guidance"
          multiline
          style={[styles.input, styles.messageInput]}
        />
        <TextInput
          value={knowledgeDraft.changeNote}
          onChangeText={(changeNote) =>
            setKnowledgeDraft((value) => ({ ...value, changeNote }))
          }
          placeholder="Required review/change note"
          style={styles.input}
        />
        <TextInput
          value={knowledgeDraft.reviewDueAt}
          onChangeText={(reviewDueAt) =>
            setKnowledgeDraft((value) => ({ ...value, reviewDueAt }))
          }
          placeholder="Next review date (YYYY-MM-DD)"
          style={styles.input}
        />
        <Pressable
          disabled={busyId === "knowledge-new"}
          style={styles.primaryButton}
          onPress={() => void createKnowledgeEntry()}
        >
          <Text style={styles.primaryText}>Create draft revision 1</Text>
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
          <Text style={styles.meta}>No reviewed runtime overrides yet.</Text>
        ) : null}
      </AppCard>

      <AppCard
        title="Find users"
        subtitle="Search every GrowPathAI account by email or name."
      >
        <View style={styles.searchRow}>
          <TextInput
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
            </View>
          </AppCard>
        ))}
      </View>

      <AppCard
        title="Bug and support inbox"
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
        subtitle="Review evidence snapshots before hiding or restoring public content."
      >
        {moderationCases.length ? (
          moderationCases.slice(0, 20).map((item) => (
            <View key={item._id} style={styles.caseRow}>
              <View style={styles.caseCopy}>
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
              </View>
              <View style={styles.actions}>
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
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No moderation cases are waiting for review.</Text>
        )}
      </AppCard>

      <AppCard
        title="Legal and evidence requests"
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
            value={noticeSubject}
            onChangeText={setNoticeSubject}
            placeholder="Subject"
            style={styles.input}
          />
          <TextInput
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

const styles = StyleSheet.create({
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  activityRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.card,
    minWidth: 150,
    padding: 10
  },
  activityLabel: { color: "#475569", fontSize: 12, fontWeight: "800" },
  activityValue: { color: "#0F172A", fontSize: 22, fontWeight: "900", marginTop: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  body: { color: "#475569", lineHeight: 21, marginTop: 6 },
  caseCopy: { flex: 1, minWidth: 220 },
  caseRow: {
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 12
  },
  caseTitle: { color: "#0F172A", fontWeight: "900", textTransform: "capitalize" },
  evidencePreview: {
    color: "#334155",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.card,
    marginTop: 6,
    padding: 9,
    lineHeight: 19
  },
  dangerButton: {
    backgroundColor: "#991B1B",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  dangerText: { color: "#FFFFFF", fontWeight: "800" },
  denied: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  error: { backgroundColor: "#FEF2F2", color: "#991B1B", padding: 12 },
  eyebrow: { color: "#166534", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minWidth: 220,
    padding: 12
  },
  messageInput: { minHeight: 120, marginTop: 10, textAlignVertical: "top" },
  meta: { color: "#64748B", lineHeight: 20, marginTop: 4 },
  metric: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE7E0",
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minWidth: 180,
    padding: 16
  },
  metricLabel: { color: "#475569", fontWeight: "800" },
  metricValue: { color: "#0F172A", fontSize: 30, fontWeight: "900", marginTop: 6 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  searchRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  secondaryText: { color: "#0F172A", fontWeight: "800" },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900", marginTop: 4 },
  userList: { gap: 12 },
  warningButton: {
    backgroundColor: "#FEF3C7",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  warningText: { color: "#92400E", fontWeight: "800" }
});
