import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
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

type FilterKey = "unread" | "all" | "tasks" | "lives";

function rows(response: any): NotificationRow[] {
  if (Array.isArray(response)) return response;
  const value =
    response?.notifications ??
    response?.items ??
    response?.data?.notifications ??
    response?.data?.items;
  return Array.isArray(value) ? value : [];
}

function rowId(row: NotificationRow) {
  return String(row.id || row._id || "");
}

function sourceHref(row: NotificationRow) {
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
    row.linkedLiveId,
    row.linkedSensorAlertId,
    row.linkedProductBatchId,
    row.linkedProductTrialId,
    row.linkedTrialId,
    row.linkedProductId,
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

function statusText(row: NotificationRow) {
  const parts = [
    row.workspaceType && `Workspace ${row.workspaceType}`,
    row.sourceType && `Source ${row.sourceType}`,
    row.channel && `Channel ${row.channel}`,
    row.sentAt && `Sent ${String(row.sentAt).slice(0, 10)}`,
    row.scheduledFor && `Scheduled ${String(row.scheduledFor).slice(0, 10)}`
  ].filter(Boolean);
  return parts.join(" | ");
}

function isUnread(row: NotificationRow) {
  return !row.read && !row.readAt && row.status !== "read";
}

export default function NotificationCenterRoute() {
  const params = useLocalSearchParams<{ notificationId?: string | string[] }>();
  const focusedNotificationId = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("unread");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/api/notifications", { method: "GET" });
      setNotifications(rows(response));
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
    if (filter === "tasks") {
      return notifications.filter((row) =>
        ["task", "alert", "course_assignment", "lesson"].includes(
          String(row.sourceType || "")
        )
      );
    }
    if (filter === "lives") {
      return notifications.filter((row) =>
        ["live", "replay", "live_event"].includes(String(row.sourceType || ""))
      );
    }
    return notifications;
  }, [filter, notifications]);

  async function markRead(row: NotificationRow) {
    const id = rowId(row);
    if (!id || saving) return;
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      await apiRequest(`/api/notifications/read/${encodeURIComponent(id)}`, {
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>GrowPath reminders</Text>
        <Text style={styles.title}>Notification Center</Text>
        <Text style={styles.subtitle}>
          One inbox for task reminders, live reminders, course notices, replay updates,
          storefront setup, alerts, and facility follow-up.
        </Text>
      </View>

      <View style={styles.toolbar}>
        {(["unread", "all", "tasks", "lives"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Notification filter ${item}`}
            onPress={() => setFilter(item)}
            style={[styles.filterButton, filter === item && styles.filterButtonActive]}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === item && styles.filterButtonTextActive
              ]}
            >
              {item}
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

      {loading ? <ActivityIndicator color="#166534" /> : null}

      {!loading && !filtered.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No notifications</Text>
          <Text style={styles.cardText}>
            Task, alert, live, course, storefront, and facility notifications will appear
            here when available.
          </Text>
        </View>
      ) : null}

      {filtered.map((row) => {
        const id = rowId(row);
        const unread = isUnread(row);
        const isFocused = Boolean(focusedNotificationId && focusedNotificationId === id);
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
              <Text style={styles.cardTitle}>{row.title || "Notification"}</Text>
              <Text style={[styles.badge, unread && styles.unreadBadge]}>
                {unread ? "unread" : "read"}
              </Text>
            </View>
            <Text style={styles.cardText}>{notificationText(row)}</Text>
            {statusText(row) ? (
              <Text style={styles.metaText}>{statusText(row)}</Text>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create task from notification"
                disabled={saving}
                onPress={() => createTaskFromNotification(row)}
                style={styles.linkButton}
              >
                <Text style={styles.linkButtonText}>Create Task</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f8f5" },
  content: { padding: 16, gap: 14 },
  header: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfe3d5",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 6
  },
  eyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: { color: "#111827", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#374151", fontSize: 14, lineHeight: 20 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  filterButtonActive: { borderColor: "#166534", backgroundColor: "#166534" },
  filterButtonText: { color: "#374151", fontSize: 13, fontWeight: "800" },
  filterButtonTextActive: { color: "#ffffff" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#166534",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe3ea",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 8
  },
  unreadCard: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  focusedCard: {
    borderColor: "#166534",
    borderWidth: 2
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  cardTitle: { color: "#111827", fontSize: 16, fontWeight: "900", flex: 1 },
  cardText: { color: "#374151", fontSize: 13, lineHeight: 19 },
  metaText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  badge: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    color: "#374151",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  unreadBadge: { backgroundColor: "#166534", color: "#ffffff" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  linkButton: {
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  linkButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  error: { color: "#b91c1c", fontSize: 13, fontWeight: "800" },
  success: { color: "#166534", fontSize: 13, fontWeight: "800" }
});
