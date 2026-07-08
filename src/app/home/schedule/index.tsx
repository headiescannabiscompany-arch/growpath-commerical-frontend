import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { sourceObjectHref } from "@/utils/sourceLinks";

type CalendarItem = {
  id: string;
  itemType: string;
  title: string;
  startAt?: string;
  endAt?: string;
  status?: string;
  priority?: string;
  workspaceType?: string;
  sourceType?: string;
  sourceId?: string;
  reminder?: string;
  recurrence?: string;
  href?: string;
};

type SectionKey = "overdue" | "today" | "upcoming" | "completed";

function asArray(res: any, key: string) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.[key])) return res.data[key];
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function taskId(row: any) {
  return String(row?.id || row?._id || row?.title || "task");
}

function rowStatus(row: any) {
  return String(row?.status || (row?.completed ? "complete" : "open")).toLowerCase();
}

function isComplete(item: CalendarItem) {
  return ["complete", "completed", "done", "ended", "replay_available"].includes(
    String(item.status || "").toLowerCase()
  );
}

function dateKey(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sectionForItem(item: CalendarItem, today = todayKey()): SectionKey {
  if (isComplete(item)) return "completed";
  const key = dateKey(item.startAt);
  if (key && key < today) return "overdue";
  if (key === today) return "today";
  return "upcoming";
}

function sourceLabel(item: CalendarItem) {
  return [item.workspaceType, item.itemType, item.sourceType]
    .filter(Boolean)
    .join(" / ")
    .replace(/_/g, " ");
}

function reminderLabel(row: any) {
  if (typeof row?.reminderPlan?.label === "string") return row.reminderPlan.label;
  if (typeof row?.reminderPlan?.summary === "string") return row.reminderPlan.summary;
  if (typeof row?.reminder === "string") return row.reminder;
  return "";
}

function recurrenceLabel(row: any) {
  if (typeof row?.recurrence?.rule === "string") return row.recurrence.rule;
  if (typeof row?.recurrenceRule === "string") return row.recurrenceRule;
  return "";
}

function taskHref(task: any, id: string) {
  const workspace = String(task?.workspaceType || "").toLowerCase();
  if (workspace === "facility") return `/home/facility/tasks/${id}`;
  if (workspace === "personal") {
    const growId = String(task?.linkedGrowId || task?.growId || "");
    return growId ? `/home/personal/grows/${growId}/tasks` : "/home/personal/tasks";
  }
  if (workspace === "commercial") return `/home/commercial/tasks/${id}`;
  return "/home/personal/tasks";
}

function taskToItem(task: any): CalendarItem {
  const id = taskId(task);
  const sourceType = String(task?.sourceType || "task");
  const rawSourceId = task?.sourceId || task?.sourceObjectId;
  const sourceHref =
    sourceType !== "task" || rawSourceId
      ? sourceObjectHref({
          ...task,
          sourceType,
          sourceId: rawSourceId,
          workspaceType: task?.workspaceType || "personal"
        })
      : "";
  return {
    id,
    itemType: "task",
    title: String(task?.title || task?.name || "Task"),
    startAt: String(task?.dueAt || task?.dueDate || task?.startAt || ""),
    endAt: String(task?.endAt || ""),
    status: rowStatus(task),
    priority: String(task?.priority || ""),
    workspaceType: String(task?.workspaceType || "personal"),
    sourceType,
    sourceId: String(task?.sourceId || task?.sourceObjectId || ""),
    reminder: reminderLabel(task),
    recurrence: recurrenceLabel(task),
    href: sourceHref || taskHref(task, id)
  };
}

function liveToItem(live: any): CalendarItem {
  const id = String(live?.id || live?._id || live?.title || "live");
  const workspaceType = String(
    live?.workspaceType || live?.ownerType || "commercial"
  ).toLowerCase();
  return {
    id,
    itemType: "live",
    title: String(live?.title || "Live event"),
    startAt: String(live?.scheduledStart || ""),
    endAt: String(live?.scheduledEnd || ""),
    status: String(live?.status || "scheduled"),
    workspaceType,
    sourceType: "live",
    sourceId: id,
    reminder: String(live?.reminderPreference || ""),
    recurrence: String(live?.recurrenceRule || ""),
    href: sourceObjectHref({ sourceType: "live", sourceId: id, workspaceType })
  };
}

function courseToItem(course: any): CalendarItem {
  const id = String(
    course?.id || course?._id || course?.slug || course?.title || "course"
  );
  const date = String(
    course?.releaseAt || course?.publishedAt || course?.updatedAt || ""
  );
  const workspaceType = String(
    course?.workspaceType || course?.ownerType || "commercial"
  ).toLowerCase();
  return {
    id,
    itemType: "course_release",
    title: String(course?.title || "Course"),
    startAt: date,
    status: String(course?.status || "draft"),
    workspaceType,
    sourceType: "course",
    sourceId: id,
    href: sourceObjectHref({ sourceType: "course", sourceId: id, workspaceType })
  };
}

function campaignToItem(campaign: any): CalendarItem {
  const id = String(campaign?.id || campaign?._id || campaign?.title || "campaign");
  const workspaceType = String(campaign?.workspaceType || "commercial");
  return {
    id,
    itemType: "feed_campaign",
    title: String(campaign?.title || campaign?.headline || campaign?.name || "Campaign"),
    startAt: String(
      campaign?.scheduledAt || campaign?.startsAt || campaign?.publishedAt || ""
    ),
    endAt: String(campaign?.endsAt || ""),
    status: String(campaign?.status || "draft"),
    workspaceType,
    sourceType: "feed_campaign",
    sourceId: id,
    reminder: String(campaign?.reminderPreference || ""),
    recurrence: String(campaign?.recurrenceRule || ""),
    href: sourceObjectHref({ sourceType: "feed_campaign", sourceId: id, workspaceType })
  };
}

export default function HomeScheduleRoute() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  async function loadSchedule() {
    setLoading(true);
    setFeedback("");
    try {
      const [tasksRes, livesRes, coursesRes, feedRes] = await Promise.all([
        apiRequest(endpoints.tasksGlobal, { method: "GET" }),
        apiRequest("/api/commercial/lives", { method: "GET" }).catch(() => ({
          lives: []
        })),
        apiRequest("/api/commercial/courses", { method: "GET" }).catch(() => ({
          courses: []
        })),
        apiRequest("/api/commercial/feed", { method: "GET" }).catch(() => ({ items: [] }))
      ]);
      setItems([
        ...asArray(tasksRes, "tasks").map(taskToItem),
        ...asArray(livesRes, "lives").map(liveToItem),
        ...asArray(coursesRes, "courses").map(courseToItem),
        ...asArray(feedRes, "items").map(campaignToItem)
      ]);
    } catch {
      setItems([]);
      setFeedback("Unable to load schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule();
  }, []);

  const sections = useMemo(() => {
    const grouped: Record<SectionKey, CalendarItem[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };
    items.forEach((item) => grouped[sectionForItem(item)].push(item));
    return grouped;
  }, [items]);
  const agendaStats = useMemo(
    () => [
      { label: "Overdue", value: sections.overdue.length, tone: "red" as const },
      { label: "Today", value: sections.today.length, tone: "green" as const },
      { label: "Upcoming", value: sections.upcoming.length, tone: "blue" as const },
      { label: "Completed", value: sections.completed.length, tone: "slate" as const }
    ],
    [sections]
  );

  function renderItem(item: CalendarItem) {
    return (
      <View key={`${item.itemType}-${item.id}`} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.typePill}>{item.itemType.replace(/_/g, " ")}</Text>
        </View>
        <Text style={styles.meta}>{sourceLabel(item)}</Text>
        <Text style={styles.meta}>
          {[
            item.startAt && `Starts ${item.startAt.slice(0, 16)}`,
            item.endAt && `Ends ${item.endAt.slice(0, 16)}`,
            item.status && `Status ${item.status}`,
            item.priority && `Priority ${item.priority}`,
            item.reminder && `Reminder ${item.reminder}`,
            item.recurrence && `Repeats ${item.recurrence}`
          ]
            .filter(Boolean)
            .join(" | ") || "No schedule metadata."}
        </Text>
        {item.href ? (
          <Link href={item.href as any} asChild>
            <Pressable accessibilityRole="link" style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Open Source</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    );
  }

  function renderSection(key: SectionKey, label: string) {
    const rows = sections[key];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <Text style={styles.countPill}>{rows.length}</Text>
        </View>
        {rows.length ? rows.map(renderItem) : <Text style={styles.empty}>No items.</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>GrowPath schedule</Text>
          <Text style={styles.title}>Schedule / Agenda</Text>
          <Text style={styles.subtitle}>
            One calendar view for tasks, lives, course releases, feed campaigns,
            storefront work, grow reminders, and facility follow-up.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.refreshButton}
          onPress={loadSchedule}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.metricGrid}>
        {agendaStats.map((item) => (
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

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading schedule...</Text>
        </View>
      ) : (
        <>
          {renderSection("overdue", "Overdue")}
          {renderSection("today", "Today")}
          {renderSection("upcoming", "Upcoming")}
          {renderSection("completed", "Completed")}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F8FAFC", flex: 1 },
  content: { gap: 12, padding: 20, paddingBottom: 44 },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  headerText: { flex: 1, minWidth: 240 },
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
    borderRadius: 8,
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
  refreshButton: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  refreshText: { color: "#FFFFFF", fontWeight: "900" },
  feedback: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#B91C1C",
    fontWeight: "800",
    padding: 10
  },
  section: { gap: 8 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  countPill: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitle: { color: "#0F172A", flex: 1, fontSize: 16, fontWeight: "900" },
  typePill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  meta: { color: "#475569", lineHeight: 19 },
  linkButton: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  linkButtonText: { color: "#FFFFFF", fontWeight: "900" },
  empty: { color: "#64748B", fontWeight: "700" }
});
