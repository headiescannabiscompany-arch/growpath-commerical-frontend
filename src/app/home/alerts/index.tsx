import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";

type AlertRow = Record<string, any>;
type FilterKey = "active" | "today" | "critical" | "resolved";
type AlertSourceMode = "alerts" | "notifications";

function asArray(res: any): AlertRow[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.alerts)) return res.alerts;
  if (Array.isArray(res?.notifications)) return res.notifications;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.alerts)) return res.data.alerts;
  if (Array.isArray(res?.data?.notifications)) return res.data.notifications;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

export function alertFromNotification(row: AlertRow): AlertRow {
  const data = row?.data && typeof row.data === "object" ? row.data : {};
  const source = row?.source && typeof row.source === "object" ? row.source : {};
  const sourceModel = String(source.model || "").toLowerCase();
  const linkedTaskId =
    row.linkedTaskId ||
    data.linkedTaskId ||
    data.taskId ||
    (sourceModel === "task" ? source.id : undefined);
  const linkedSensorAlertId =
    row.linkedSensorAlertId || data.linkedSensorAlertId || data.sensorAlertId;
  const sourceType = String(
    row.sourceType ||
      data.sourceType ||
      (linkedTaskId ? "task" : linkedSensorAlertId ? "sensor_alert" : "notification")
  ).toLowerCase();
  const sourceId =
    row.sourceId ||
    data.sourceId ||
    linkedTaskId ||
    linkedSensorAlertId ||
    source.id ||
    "";
  const read = Boolean(
    row.read || row.readAt || String(row.status || "").toLowerCase() === "read"
  );
  const dataFacilityId = String(data.facilityId || "");

  return {
    ...data,
    ...row,
    id: row.id || row._id,
    message: row.message || row.body || data.message || data.body || "",
    severity:
      row.severity ||
      data.severity ||
      (["task", "sensor_alert", "alert"].includes(sourceType) ? "warning" : "info"),
    status: read ? "resolved" : "active",
    workspaceType:
      row.workspaceType ||
      data.workspaceType ||
      (dataFacilityId && !dataFacilityId.startsWith("personal:")
        ? "facility"
        : "personal"),
    sourceType,
    sourceId,
    linkedTaskId,
    linkedSensorAlertId,
    _notificationBacked: true
  };
}

function idOf(alert: AlertRow) {
  return String(alert.id || alert._id || "");
}

function readableAssignee(alert: AlertRow) {
  const assignedObject =
    alert.assignedTo && typeof alert.assignedTo === "object" ? alert.assignedTo : {};
  const preferred = [
    alert.assignedToName,
    alert.assigneeName,
    alert.assignedToEmail,
    alert.assigneeEmail,
    assignedObject.displayName,
    assignedObject.name,
    assignedObject.email,
    typeof alert.assignedTo === "string" ? alert.assignedTo : ""
  ].find((value) => value !== undefined && value !== null && String(value).trim());
  if (preferred && !/^\s*[a-f0-9]{24}\s*$/i.test(String(preferred))) {
    return String(preferred).trim();
  }
  const identifier = String(alert.assignedToUserId || "").trim();
  return identifier.includes("@") ? identifier : "";
}

function isResolved(alert: AlertRow) {
  return ["resolved", "dismissed"].includes(String(alert.status || "").toLowerCase());
}

function isCritical(alert: AlertRow) {
  return ["urgent", "critical"].includes(String(alert.severity || "").toLowerCase());
}

function isToday(alert: AlertRow) {
  const raw = String(alert.createdAt || alert.triggeredAt || alert.snoozedUntil || "");
  if (!raw) return false;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()))
    return raw.slice(0, 10) === new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function sourceHref(alert: AlertRow) {
  if (String(alert.sourceType || "").toLowerCase() === "setup") {
    const workspace = String(alert.workspaceType || "personal").toLowerCase();
    if (workspace === "facility") return "/home/facility";
    if (workspace === "commercial") return "/home/commercial";
    return "/home/personal";
  }
  return sourceObjectHref(alert);
}

function askAiHref(alert: AlertRow) {
  const id = encodeURIComponent(idOf(alert));
  const sourceType = encodeURIComponent(String(alert.sourceType || "alert"));
  const workspace = String(alert.workspaceType || "personal").toLowerCase();
  if (workspace === "facility") {
    return `/home/facility/ai-ask?preset=alerts&alertId=${id}&sourceType=${sourceType}`;
  }
  if (workspace === "commercial") {
    return `/home/commercial?ai=alerts&alertId=${id}&sourceType=${sourceType}`;
  }
  return `/home/personal/ai?alertId=${id}&sourceType=${sourceType}`;
}

function taskCollectionHref(alert: AlertRow) {
  const workspace = String(alert.workspaceType || "personal").toLowerCase();
  if (workspace === "facility") return "/home/facility/tasks";
  if (workspace === "commercial") return "/home/commercial/tasks";
  return "/home/personal/tasks";
}

function sourceReference(alert: AlertRow) {
  const values = [
    alert.sourceId,
    alert.sourceObjectId,
    alert.linkedProductId,
    alert.linkedCourseId,
    alert.linkedLiveId,
    alert.storefrontSlug,
    alert.linkedStorefrontSlug,
    alert.brandSlug,
    alert.publicSlug,
    alert.linkedStorefrontId,
    alert.linkedGrowId,
    alert.linkedPlantId,
    alert.linkedGrowLogId,
    alert.linkedTaskId,
    alert.linkedRoomId,
    alert.linkedFacilityId,
    alert.linkedFacilityRunId,
    alert.linkedSopId,
    alert.linkedToolRunId,
    alert.linkedRecipeId,
    alert.linkedProductBatchId,
    alert.linkedProductTrialId,
    alert.linkedTrialId,
    alert.linkedLessonId,
    alert.linkedCourseAssignmentId,
    alert.linkedFeedCampaignId,
    alert.linkedFeedPostId,
    alert.linkedOrderId,
    alert.linkedSensorAlertId,
    alert.linkedForumThreadId
  ];
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item)
  );
  return value ? String(value) : "";
}

function storefrontMetadata(row: AlertRow) {
  const slug =
    row.storefrontSlug || row.linkedStorefrontSlug || row.brandSlug || row.publicSlug;
  return slug
    ? {
        storefrontSlug: String(slug),
        linkedStorefrontSlug: String(slug)
      }
    : {};
}

function linkedFieldsForAlertSource(alert: AlertRow) {
  const sourceType = String(alert.sourceType || "");
  const sourceId = sourceReference(alert);
  if (!sourceId) return {};
  switch (sourceType) {
    case "product":
      return { linkedProductId: sourceId };
    case "course":
      return { linkedCourseId: sourceId };
    case "live":
      return { linkedLiveId: sourceId };
    case "storefront":
      return { linkedStorefrontId: sourceId };
    case "grow":
      return { linkedGrowId: sourceId };
    case "plant":
      return { linkedPlantId: sourceId };
    case "grow_log":
      return { linkedGrowLogId: sourceId };
    case "task":
      return { linkedTaskId: sourceId };
    case "room":
      return { linkedRoomId: sourceId };
    case "facility":
      return { linkedFacilityId: sourceId };
    case "facility_run":
      return { linkedFacilityRunId: sourceId };
    case "sop":
      return { linkedSopId: sourceId };
    case "toolrun":
      return { linkedToolRunId: sourceId };
    case "recipe":
      return { linkedRecipeId: sourceId };
    case "product_batch":
      return { linkedProductBatchId: sourceId };
    case "product_trial":
      return { linkedProductTrialId: sourceId, linkedTrialId: sourceId };
    case "lesson":
      return {
        linkedCourseId: alert.linkedCourseId || alert.courseId || undefined,
        linkedLessonId: sourceId
      };
    case "course_assignment":
      return {
        linkedCourseId: alert.linkedCourseId || alert.courseId || undefined,
        linkedLessonId: alert.linkedLessonId || undefined,
        linkedCourseAssignmentId: sourceId
      };
    case "feed_campaign":
      return { linkedFeedCampaignId: sourceId };
    case "order":
      return { linkedOrderId: sourceId };
    case "sensor_alert":
      return { linkedSensorAlertId: sourceId };
    case "forum":
      return { linkedForumThreadId: sourceId };
    default:
      return {};
  }
}

function alertTaskMetadata(alert: AlertRow) {
  const workspace = String(alert.workspaceType || "commercial").toLowerCase();
  const sourceType = String(alert.sourceType || "alert").toLowerCase();
  return {
    allDay: true,
    calendarType: `${workspace}_alert_followup`,
    sourceStage: `${sourceType}_alert_followup`
  };
}

function filterAlert(alert: AlertRow, filter: FilterKey) {
  if (filter === "resolved") return isResolved(alert);
  if (filter === "critical") return !isResolved(alert) && isCritical(alert);
  if (filter === "today") return !isResolved(alert) && isToday(alert);
  return !isResolved(alert);
}

export default function AlertCenterRoute() {
  const params = useLocalSearchParams<{ alertId?: string | string[] }>();
  const focusedAlertId = Array.isArray(params.alertId)
    ? params.alertId[0]
    : params.alertId;
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [sourceMode, setSourceMode] = useState<AlertSourceMode>("alerts");
  const [filter, setFilter] = useState<FilterKey>("active");
  const [snoozeUntil, setSnoozeUntil] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [assignee, setAssignee] = useState("");

  async function loadAlerts() {
    setLoading(true);
    setFeedback("");
    setNotice("");
    try {
      const res = await apiRequest(endpoints.alertsGlobal, { method: "GET" });
      setAlerts(asArray(res));
      setSourceMode("alerts");
    } catch {
      try {
        const res = await apiRequest("/api/notifications", { method: "GET" });
        setAlerts(asArray(res).map(alertFromNotification));
        setSourceMode("notifications");
        setNotice(
          "Showing live notification-backed alerts. Mark Read and Create Task use your saved notification records."
        );
      } catch {
        setAlerts([]);
        setFeedback("Unable to load alerts or notification records.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => filterAlert(alert, filter)),
    [alerts, filter]
  );
  const alertStats = useMemo(
    () => [
      {
        label: "Active",
        value: alerts.filter((alert) => filterAlert(alert, "active")).length,
        tone: "blue" as const
      },
      {
        label: "Today",
        value: alerts.filter((alert) => filterAlert(alert, "today")).length,
        tone: "green" as const
      },
      {
        label: "Critical",
        value: alerts.filter((alert) => filterAlert(alert, "critical")).length,
        tone: "red" as const
      },
      {
        label: "Resolved",
        value: alerts.filter((alert) => filterAlert(alert, "resolved")).length,
        tone: "slate" as const
      }
    ],
    [alerts]
  );

  async function patchAlert(
    alert: AlertRow,
    patch: Record<string, any>,
    message: string
  ) {
    const id = idOf(alert);
    if (!id) return;
    setFeedback("");
    try {
      if (alert._notificationBacked) {
        if (patch.status !== "resolved") {
          setFeedback("This action is not available for notification-backed alerts.");
          return;
        }
        await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
          method: "POST"
        });
        setAlerts((current) =>
          current.map((item) =>
            idOf(item) === id
              ? {
                  ...item,
                  read: true,
                  readAt: new Date().toISOString(),
                  status: "resolved"
                }
              : item
          )
        );
        setFeedback("Notification marked read.");
        return;
      }
      await apiRequest(endpoints.alertGlobal(id), {
        method: "PATCH",
        body: patch
      });
      await loadAlerts();
      setFeedback(message);
    } catch {
      setFeedback("Unable to update alert.");
    }
  }

  async function createTaskFromAlert(alert: AlertRow) {
    const id = idOf(alert);
    if (!id) return;
    setFeedback("");
    try {
      const notificationBacked = Boolean(alert._notificationBacked);
      await apiRequest(endpoints.tasksGlobal, {
        method: "POST",
        body: {
          workspaceType: alert.workspaceType || "commercial",
          title: `Follow up: ${alert.title || "Alert"}`,
          description: alert.message || alert.description || "",
          dueAt: snoozeUntil.trim() || undefined,
          priority: isCritical(alert) ? "critical" : "normal",
          sourceType: notificationBacked ? "notification" : "alert",
          sourceId: id,
          ...(notificationBacked
            ? {
                linkedNotificationId: id,
                notificationSourceType: alert.sourceType || undefined,
                notificationSourceId: sourceReference(alert) || undefined
              }
            : {
                linkedAlertId: id,
                alertSourceType: alert.sourceType || undefined,
                alertSourceId: sourceReference(alert) || undefined
              }),
          ...alertTaskMetadata(alert),
          ...linkedFieldsForAlertSource(alert),
          ...storefrontMetadata(alert),
          assignedToUserId: assignee.trim() || undefined,
          status: "open",
          reminderPlan: reminder.trim()
            ? { label: reminder.trim(), channels: ["in_app"] }
            : undefined,
          recurrence: recurrence.trim() ? { rule: recurrence.trim() } : undefined
        }
      });
      setFeedback("Task created from alert.");
    } catch {
      setFeedback("Unable to create task from alert.");
    }
  }

  function renderAlert(alert: AlertRow) {
    const notificationBacked = Boolean(alert._notificationBacked);
    const notificationTask =
      notificationBacked && String(alert.sourceType || "").toLowerCase() === "task";
    const href = notificationTask ? taskCollectionHref(alert) : sourceHref(alert);
    const sourceActionLabel = notificationTask ? "Open Tasks" : "View Source";
    const aiHref = askAiHref(alert);
    const assignedToLabel = readableAssignee(alert);
    const isFocused = Boolean(
      focusedAlertId &&
      (focusedAlertId === idOf(alert) || focusedAlertId === String(alert.sourceId || ""))
    );
    return (
      <View
        key={idOf(alert) || alert.title}
        accessibilityLabel={isFocused ? `Focused alert ${focusedAlertId}` : undefined}
        style={[styles.card, isFocused && styles.focusedCard]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{alert.title || "Alert"}</Text>
          <Text style={[styles.badge, isCritical(alert) && styles.badgeCritical]}>
            {alert.severity || "info"}
          </Text>
        </View>
        <Text style={styles.meta}>
          {alert.message || alert.description || "No message."}
        </Text>
        <Text style={styles.meta}>
          {[
            alert.workspaceType && `Workspace ${alert.workspaceType}`,
            alert.sourceType && `Source ${String(alert.sourceType).replace(/_/g, " ")}`,
            alert.status && `Status ${alert.status}`
          ]
            .filter(Boolean)
            .join(" | ")}
        </Text>
        {assignedToLabel ? (
          <Text style={styles.meta}>Assigned to {assignedToLabel}</Text>
        ) : null}
        <View style={styles.actionRow}>
          {!notificationBacked ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Assign alert"
              style={[styles.secondaryButton, !assignee.trim() && styles.disabledButton]}
              disabled={!assignee.trim()}
              onPress={() =>
                void patchAlert(
                  alert,
                  {
                    assignedToUserId: assignee.trim(),
                    assignedAt: new Date().toISOString()
                  },
                  "Alert assigned."
                )
              }
            >
              <Text style={styles.secondaryText}>Assign</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              notificationBacked ? "Mark notification read" : "Resolve alert"
            }
            style={styles.secondaryButton}
            onPress={() =>
              void patchAlert(
                alert,
                { status: "resolved", resolvedAt: new Date().toISOString() },
                "Alert resolved."
              )
            }
          >
            <Text style={styles.secondaryText}>
              {notificationBacked ? "Mark Read" : "Resolve"}
            </Text>
          </Pressable>
          {!notificationBacked ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Snooze alert"
              style={styles.secondaryButton}
              onPress={() =>
                void patchAlert(
                  alert,
                  {
                    status: "snoozed",
                    snoozedUntil: snoozeUntil.trim() || undefined
                  },
                  "Alert snoozed."
                )
              }
            >
              <Text style={styles.secondaryText}>Snooze</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create task from alert"
            style={styles.primaryButton}
            onPress={() => void createTaskFromAlert(alert)}
          >
            <Text style={styles.primaryText}>Create Task</Text>
          </Pressable>
          {href ? (
            <Link href={href as any} asChild>
              <Pressable accessibilityRole="link" style={styles.ghostButton}>
                <Text style={styles.ghostText}>{sourceActionLabel}</Text>
              </Pressable>
            </Link>
          ) : null}
          {!notificationBacked ? (
            <Link href={aiHref as any} asChild>
              <Pressable accessibilityRole="link" style={styles.ghostButton}>
                <Text style={styles.ghostText}>Ask AI</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>GrowPath alerts</Text>
      <Text style={styles.title}>Alert Center</Text>
      <Text style={styles.subtitle}>
        {sourceMode === "notifications"
          ? "Review live notification records, mark them read, or create source-linked follow-up tasks."
          : "Resolve, snooze, or turn alerts into source-linked tasks across storefront, product, course, live, grow, sensor, and facility workflows."}
      </Text>
      <View style={styles.metricGrid}>
        {alertStats.map((item) => (
          <View
            key={item.label}
            style={[
              styles.metricCard,
              item.tone === "red" && styles.redMetric,
              item.tone === "green" && styles.greenMetric,
              item.tone === "blue" && styles.blueMetric,
              item.tone === "slate" && styles.slateMetric
            ]}
          >
            <Text style={styles.metricValue}>{item.value}</Text>
            <Text style={styles.metricLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.formTitle}>
          {sourceMode === "notifications"
            ? "Follow-up Task Schedule"
            : "Alert Schedule Actions"}
        </Text>
        <SchedulePicker
          dueDate={snoozeUntil}
          reminder={reminder}
          recurrence={recurrence}
          onDueDateChange={setSnoozeUntil}
          onReminderChange={setReminder}
          onRecurrenceChange={setRecurrence}
          accessibilityPrefix="Alert center"
          dueDatePlaceholder={
            sourceMode === "notifications"
              ? "Follow-up task due date"
              : "Snooze/task due date"
          }
        />
        <TextInput
          style={styles.input}
          placeholder="Assign created task to team member email"
          value={assignee}
          onChangeText={setAssignee}
          accessibilityLabel="Alert task assignee"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.filterRow}>
        {(["active", "today", "critical", "resolved"] as FilterKey[]).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Alert filter ${item}`}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading alerts...</Text>
        </View>
      ) : visibleAlerts.length ? (
        visibleAlerts.map(renderAlert)
      ) : (
        <Text style={styles.empty}>No alerts in this view.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8FAFC", flex: 1 },
  content: { gap: 12, padding: 20, paddingBottom: 44 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  redMetric: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  greenMetric: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  blueMetric: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  slateMetric: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  metricValue: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  metricLabel: { color: "#475569", fontSize: 11, fontWeight: "900" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 14
  },
  formTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  filterChipActive: { backgroundColor: "#166534", borderColor: "#166534" },
  filterText: { color: "#334155", fontSize: 12, fontWeight: "900" },
  filterTextActive: { color: "#FFFFFF" },
  notice: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#1E3A8A",
    fontWeight: "800",
    padding: 10
  },
  feedback: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#047857",
    fontWeight: "800",
    padding: 10
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  focusedCard: {
    borderColor: "#166534",
    borderWidth: 2
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitle: { color: "#0F172A", flex: 1, fontSize: 16, fontWeight: "900" },
  badge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  badgeCritical: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  meta: { color: "#475569", lineHeight: 19 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryButton: {
    backgroundColor: "#0F172A",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryText: { color: "#FFFFFF", fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  ghostButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ghostText: { color: "#0F172A", fontWeight: "900" },
  empty: { color: "#64748B", fontWeight: "700" }
});
