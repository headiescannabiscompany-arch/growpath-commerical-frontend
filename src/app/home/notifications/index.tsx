import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { apiRequest } from "@/api/apiRequest";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { updateNotificationPreferences } from "@/api/users";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_OPTIONS,
  NOTIFICATION_PREFERENCE_TITLES,
  NotificationPreferenceState,
  notificationPreferenceKeyForSourceType
} from "@/notifications/notificationPreferences";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";

type NotificationRow = {
  [key: string]: any;
  id?: string;
  _id?: string;
  title?: string;
  body?: string;
  message?: string;
  channel?: string;
  sourceType?: string;
  sourceId?: string;
  actionUrl?: string;
  workspaceType?: string;
  read?: boolean;
  readAt?: string | null;
  status?: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt?: string;
};

type FilterKey =
  | "unread"
  | "all"
  | Exclude<keyof NotificationPreferenceState, "pushEnabled">;

function rows(response: any): NotificationRow[] {
  const normalize = (row: NotificationRow): NotificationRow => {
    const source = row?.source && typeof row.source === "object" ? row.source : {};
    const data = row?.data && typeof row.data === "object" ? row.data : {};
    const nestedSourceType = source.model || data.sourceType;
    const nestedSourceId = source.id || data.taskId || data.sourceId;
    const normalizedSourceType = String(nestedSourceType || "")
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .toLowerCase();
    return {
      ...row,
      sourceType: row.sourceType || normalizedSourceType || undefined,
      sourceId: row.sourceId || nestedSourceId || undefined,
      linkedTaskId:
        row.linkedTaskId ||
        (normalizedSourceType === "task" ? nestedSourceId || undefined : undefined),
      workspaceType: row.workspaceType || (data.facilityId ? "facility" : undefined)
    };
  };
  if (Array.isArray(response)) return response.map(normalize);
  const value =
    response?.notifications ??
    response?.items ??
    response?.data?.notifications ??
    response?.data?.items;
  return Array.isArray(value) ? value.map(normalize) : [];
}

function rowId(row: NotificationRow) {
  return String(row.id || row._id || "");
}

function sourceHref(row: NotificationRow) {
  if (row.courseId)
    return `/courses?courseId=${encodeURIComponent(String(row.courseId))}`;
  return sourceObjectHref(row) || "/home/schedule";
}

function sourceReference(row: NotificationRow) {
  const values = [
    row.sourceId,
    row.sourceObjectId,
    row.linkedAlertId,
    row.linkedTaskId,
    row.linkedCourseId,
    row.linkedLessonId,
    row.linkedVideoId,
    row.linkedLiveId,
    row.linkedSensorAlertId,
    row.linkedProductBatchId,
    row.linkedProductTrialId,
    row.linkedTrialId,
    row.linkedProductId,
    row.storefrontSlug,
    row.linkedStorefrontSlug,
    row.brandSlug,
    row.publicSlug,
    row.linkedStorefrontId,
    row.linkedFeedCampaignId,
    row.linkedFeedPostId,
    row.linkedOrderId,
    row.linkedForumThreadId,
    row.linkedRoomId,
    row.linkedFacilityRunId,
    row.linkedSopId,
    row.linkedRecipeId,
    row.linkedToolRunId
  ];
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item)
  );
  return value ? String(value) : "";
}

function storefrontMetadata(row: NotificationRow) {
  const slug =
    row.storefrontSlug || row.linkedStorefrontSlug || row.brandSlug || row.publicSlug;
  return slug
    ? {
        storefrontSlug: String(slug),
        linkedStorefrontSlug: String(slug)
      }
    : {};
}

function linkedFieldsForNotificationSource(row: NotificationRow) {
  const sourceType = String(row.sourceType || "");
  const sourceId = sourceReference(row);
  if (!sourceId) return {};
  switch (sourceType) {
    case "task":
      return { linkedTaskId: sourceId };
    case "alert":
      return { linkedAlertId: sourceId };
    case "course":
      return { linkedCourseId: sourceId };
    case "lesson":
      return {
        linkedCourseId: row.linkedCourseId || row.courseId || undefined,
        linkedLessonId: sourceId
      };
    case "course_assignment":
      return {
        linkedCourseId: row.linkedCourseId || row.courseId || undefined,
        linkedLessonId: row.linkedLessonId || undefined,
        linkedCourseAssignmentId: sourceId
      };
    case "live":
    case "live_event":
    case "replay":
      return { linkedLiveId: sourceId };
    case "product":
      return { linkedProductId: sourceId };
    case "storefront":
      return { linkedStorefrontId: sourceId };
    case "product_batch":
      return { linkedProductBatchId: sourceId };
    case "product_trial":
      return { linkedProductTrialId: sourceId, linkedTrialId: sourceId };
    case "feed_campaign":
      return { linkedFeedCampaignId: sourceId };
    case "sensor_alert":
      return { linkedSensorAlertId: sourceId };
    case "order":
      return { linkedOrderId: sourceId };
    case "forum":
      return { linkedForumThreadId: sourceId };
    case "room":
      return { linkedRoomId: sourceId };
    case "facility_run":
      return { linkedFacilityRunId: sourceId };
    case "sop":
      return { linkedSopId: sourceId };
    case "recipe":
      return { linkedRecipeId: sourceId };
    case "toolrun":
    case "tool_run":
      return { linkedToolRunId: sourceId };
    default:
      return {};
  }
}

function notificationText(row: NotificationRow) {
  return row.body || row.message || "Open the linked workflow for details.";
}

function notificationScheduleMetadata(row: NotificationRow) {
  const sourceType = String(row.sourceType || "notification");
  const normalized = sourceType.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const stageBySource: Record<string, string> = {
    alert: "alert_review",
    course: "course_notice_review",
    course_assignment: "course_assignment_followup",
    feed_campaign: "campaign_notification_followup",
    forum: "forum_notification_followup",
    lesson: "lesson_notification_followup",
    live: "live_notification_followup",
    live_event: "live_notification_followup",
    notification: "notification_followup",
    order: "order_notification_followup",
    product: "product_notification_followup",
    product_batch: "batch_notification_followup",
    product_trial: "trial_notification_followup",
    replay: "replay_notification_followup",
    storefront: "storefront_notification_followup",
    task: "task_notification_followup"
  };
  return {
    allDay: true,
    calendarType: `${normalized}_notification_followup`,
    sourceStage: stageBySource[normalized] || `${normalized}_notification_followup`,
    dueAt: row.scheduledFor
      ? String(row.scheduledFor).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    reminderPlan: { label: "24 hours before", channels: ["in_app"] }
  };
}

function statusText(
  row: NotificationRow,
  prefs: NotificationPreferenceState = DEFAULT_NOTIFICATION_PREFERENCES
) {
  const preferenceKey = notificationPreferenceKeyForSourceType(row.sourceType);
  const preferenceTitle = preferenceKey
    ? NOTIFICATION_PREFERENCE_TITLES[preferenceKey] || preferenceKey
    : "Other";
  const pushLabel = prefs.pushEnabled
    ? preferenceKey && prefs[preferenceKey]
      ? "push eligible"
      : preferenceKey
        ? "muted in Profile"
        : "in-app only"
    : "device push off";
  const parts = [
    row.workspaceType && `Workspace ${row.workspaceType}`,
    row.sourceType && `Source ${row.sourceType}`,
    `Category ${preferenceTitle}`,
    `Delivery ${pushLabel}`,
    row.channel && `Channel ${row.channel}`,
    row.sentAt && `Sent ${String(row.sentAt).slice(0, 10)}`,
    row.scheduledFor && `Scheduled ${String(row.scheduledFor).slice(0, 10)}`
  ].filter(Boolean);
  return parts.join(" | ");
}

function isUnread(row: NotificationRow) {
  return !row.read && !row.readAt && row.status !== "read";
}

function preferenceState(raw: any): NotificationPreferenceState {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw || {})
  };
}

const NOTIFICATION_INBOX_FILTERS = NOTIFICATION_PREFERENCE_OPTIONS.filter(
  (option) => option.key !== "pushEnabled"
);

export default function NotificationCenterRoute() {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createNotificationCenterStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    notificationId?: string | string[];
    workspace?: string | string[];
  }>();
  const requestedWorkspace = Array.isArray(params.workspace)
    ? params.workspace[0]
    : params.workspace;
  const workspaceMode = requestedWorkspace || entitlements.mode || auth.ctx?.mode;
  const profileHref =
    workspaceMode === "facility"
      ? "/home/facility/profile"
      : workspaceMode === "commercial"
        ? "/home/commercial/profile"
        : "/home/personal/profile";
  const focusedNotificationId = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("unread");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const savedNotificationPreferences = auth.user?.notificationPreferences;
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferenceState>(
    () => preferenceState(savedNotificationPreferences)
  );
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  useEffect(() => {
    if (!savedNotificationPreferences) return;
    setNotificationPrefs(preferenceState(savedNotificationPreferences));
  }, [savedNotificationPreferences]);
  const enabledCategories = useMemo(
    () =>
      NOTIFICATION_INBOX_FILTERS.filter((option) => notificationPrefs[option.key]).map(
        (option) => option.title
      ),
    [notificationPrefs]
  );

  async function saveNotificationPreferences() {
    setPreferencesSaving(true);
    setError("");
    setFeedback("");
    try {
      await updateNotificationPreferences(notificationPrefs);
      await auth.retryMe?.();
      setFeedback("Notification settings saved.");
    } catch (err: any) {
      setError(err?.message || "Unable to save notification settings.");
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const [response, courseLivesResponse] = await Promise.all([
        apiRequest("/api/notifications", { method: "GET" }),
        apiRequest("/api/courses/mine/live-events", { method: "GET" }).catch(() => ({
          liveEvents: []
        }))
      ]);
      const liveReminders = rows(courseLivesResponse)
        .filter((session) => session.rsvped && session.scheduledStart)
        .map((session) => ({
          id: `course-live-${session.courseId}-${session.sessionId || session.id}`,
          title: `Upcoming live: ${session.title || session.courseTitle || "Course session"}`,
          body: `Scheduled for ${session.scheduledStart}${session.timezone ? ` (${session.timezone})` : ""}.`,
          sourceType: "live_event",
          sourceId: session.sessionId || session.id,
          linkedLiveId: session.sessionId || session.id,
          linkedCourseId: session.courseId,
          courseId: session.courseId,
          actionUrl: session.watchUrl || session.meetingUrl,
          scheduledFor: session.scheduledStart,
          channel: "in_app",
          workspaceType: "personal",
          status: "scheduled",
          read: false,
          _courseLive: true
        }));
      setNotifications([...liveReminders, ...rows(response)]);
    } catch (err: any) {
      setError(err?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter(isUnread);
    if (filter === "all") return notifications;
    return notifications.filter(
      (row) =>
        notificationPreferenceKeyForSourceType(String(row.sourceType || "")) === filter
    );
  }, [filter, notifications]);

  async function markRead(row: NotificationRow) {
    const id = rowId(row);
    if (!id || saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      if (row._courseLive) {
        setNotifications((current) =>
          current.map((item) =>
            rowId(item) === id
              ? { ...item, read: true, readAt: new Date().toISOString(), status: "read" }
              : item
          )
        );
        setFeedback("Live reminder marked read.");
        return;
      }
      await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST"
      });
      setNotifications((current) =>
        current.map((item) =>
          rowId(item) === id
            ? { ...item, read: true, readAt: new Date().toISOString(), status: "read" }
            : item
        )
      );
      setFeedback("Notification marked read.");
    } catch (err: any) {
      setError(err?.message || "Unable to mark notification read.");
    } finally {
      setSaving(false);
    }
  }

  async function markAllRead() {
    if (saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "POST" });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true, readAt, status: "read" }))
      );
      setFeedback("All notifications marked read.");
    } catch (err: any) {
      setError(err?.message || "Unable to mark notifications read.");
    } finally {
      setSaving(false);
    }
  }

  async function createTaskFromNotification(row: NotificationRow) {
    const id = rowId(row);
    if (!id || saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: row.workspaceType || "personal",
          title: `Follow up: ${row.title || "Notification"}`,
          description: notificationText(row),
          sourceType: "notification",
          sourceId: id,
          linkedNotificationId: id,
          notificationSourceType: row.sourceType || undefined,
          notificationSourceId: sourceReference(row) || undefined,
          ...notificationScheduleMetadata(row),
          ...linkedFieldsForNotificationSource(row),
          ...storefrontMetadata(row),
          priority: ["alert", "task", "course_assignment"].includes(
            String(row.sourceType || "")
          )
            ? "high"
            : "normal",
          status: "open"
        }
      });
      setFeedback("Task created from notification.");
    } catch (err: any) {
      setError(err?.message || "Unable to create task from notification.");
    } finally {
      setSaving(false);
    }
  }

  const filterOptions: Array<{ key: FilterKey; title: string }> = [
    { key: "unread", title: "Unread" },
    { key: "all", title: "All" },
    ...NOTIFICATION_INBOX_FILTERS.map((option) => ({
      key: option.key as FilterKey,
      title: option.title
    }))
  ];
  const pushStatusText = notificationPrefs.pushEnabled
    ? "Device push is enabled for this account."
    : "Device push is off. Notifications still appear in-app.";

  return (
    <ScreenBoundary name="NotificationCenter" showBack backFallbackHref={profileHref}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>GrowPath reminders</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Notification Center
          </Text>
          <Text style={styles.subtitle}>
            One inbox for task reminders, forum replies, videos, courses, commerce, and
            facility follow-up.
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Delivery status
          </Text>
          <Text style={styles.cardText}>{pushStatusText}</Text>
          <Text style={styles.metaText}>
            {enabledCategories.length
              ? `Enabled categories: ${enabledCategories.join(", ")}`
              : "All notification categories are muted in Profile."}
          </Text>
          <View style={styles.preferenceList}>
            {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => (
              <View key={String(option.key)} style={styles.preferenceRow}>
                <View style={styles.preferenceCopy}>
                  <Text
                    accessibilityRole="header"
                    aria-level={3}
                    style={styles.preferenceTitle}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles.metaText}>{option.description}</Text>
                </View>
                <Switch
                  accessibilityLabel={`Toggle ${option.title}`}
                  ios_backgroundColor={palette.surfaceStrong}
                  thumbColor={palette.accentText}
                  trackColor={{ false: palette.surfaceStrong, true: palette.accent }}
                  value={Boolean(notificationPrefs[option.key])}
                  onValueChange={(value) =>
                    setNotificationPrefs((current) => ({
                      ...current,
                      [option.key]: value
                    }))
                  }
                />
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save notification settings"
            disabled={preferencesSaving}
            onPress={saveNotificationPreferences}
            style={[styles.primaryButton, preferencesSaving && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {preferencesSaving ? "Saving..." : "Save notification settings"}
            </Text>
          </Pressable>
          <Link href={profileHref as any} asChild>
            <Pressable accessibilityRole="link" style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Open Profile settings</Text>
            </Pressable>
          </Link>
        </View>

        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Notification inbox
        </Text>
        <View style={styles.toolbar}>
          {filterOptions.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Notification filter ${item.key}`}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterButton,
                filter === item.key && styles.filterButtonActive
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === item.key && styles.filterButtonTextActive
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications read"
          disabled={saving || !notifications.some(isUnread)}
          onPress={markAllRead}
          style={[
            styles.primaryButton,
            (saving || !notifications.some(isUnread)) && styles.disabledButton
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Mark All Read"}
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {feedback ? <Text style={styles.success}>{feedback}</Text> : null}

        {loading ? <ActivityIndicator color={palette.accent} /> : null}

        {!loading && !filtered.length ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
              No notifications
            </Text>
            <Text style={styles.cardText}>
              Notifications that match your current filter will appear here when
              available.
            </Text>
          </View>
        ) : null}

        {filtered.map((row) => {
          const id = rowId(row);
          const unread = isUnread(row);
          const isFocused = Boolean(
            focusedNotificationId && focusedNotificationId === id
          );
          return (
            <View
              key={id || row.title}
              accessibilityLabel={
                isFocused ? `Focused notification ${focusedNotificationId}` : undefined
              }
              style={[
                styles.card,
                unread && styles.unreadCard,
                isFocused && styles.focusedCard
              ]}
            >
              <View style={styles.cardHeader}>
                <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                  {row.title || "Notification"}
                </Text>
                <Text style={[styles.badge, unread && styles.unreadBadge]}>
                  {unread ? "unread" : "read"}
                </Text>
              </View>
              <Text style={styles.cardText}>{notificationText(row)}</Text>
              {statusText(row, notificationPrefs) ? (
                <Text style={styles.metaText}>{statusText(row, notificationPrefs)}</Text>
              ) : null}

              <View style={styles.actions}>
                {unread ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mark notification read"
                    disabled={saving}
                    onPress={() => markRead(row)}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Mark Read</Text>
                  </Pressable>
                ) : null}
                <Link href={sourceHref(row) as any} asChild>
                  <Pressable accessibilityRole="link" style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>View Source</Text>
                  </Pressable>
                </Link>
                {row.actionUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Open live stream from reminder"
                    onPress={() => void Linking.openURL(String(row.actionUrl))}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Watch on Twitch</Text>
                  </Pressable>
                ) : null}
                {String(row.sourceType || "").toLowerCase() !== "task" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create task from notification"
                    disabled={saving}
                    onPress={() => createTaskFromNotification(row)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Create Task</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createNotificationCenterStyles(palette: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.page },
    content: { padding: 16, gap: 14 },
    header: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 16,
      gap: 6
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0
    },
    title: { color: palette.text, fontSize: 24, fontWeight: "900" },
    subtitle: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filterButton: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    filterButtonActive: { borderColor: palette.accent, backgroundColor: palette.accent },
    filterButtonText: { color: palette.textMuted, fontSize: 13, fontWeight: "800" },
    filterButtonTextActive: { color: palette.accentText },
    primaryButton: {
      alignItems: "center",
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingHorizontal: 14,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    disabledButton: { opacity: 0.45 },
    card: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: 14,
      gap: 8
    },
    unreadCard: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    focusedCard: {
      borderColor: palette.accent,
      borderWidth: 2
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900", flex: 1 },
    cardText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    preferenceList: { marginTop: 12, gap: 10 },
    preferenceRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between"
    },
    preferenceCopy: { flex: 1 },
    preferenceTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
    metaText: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    badge: {
      overflow: "hidden",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong,
      color: palette.textMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    unreadBadge: { backgroundColor: palette.accent, color: palette.accentText },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    secondaryButton: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.accent,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    linkButton: {
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    linkButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    error: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    success: { color: palette.success, fontSize: 13, fontWeight: "800" }
  });
}
