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
import { Link } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import SchedulePicker from "@/components/schedule/SchedulePicker";

type CommercialTask = Record<string, any>;

const priorities = ["low", "normal", "high", "critical"] as const;
const sourceTypes = [
  "manual",
  "storefront",
  "product",
  "product_batch",
  "product_trial",
  "course",
  "lesson",
  "live",
  "feed_campaign",
  "order",
  "stripe",
  "analytics",
  "alert",
  "forum"
] as const;

type SectionKey = "overdue" | "today" | "upcoming" | "completed";

function asArray(res: any): CommercialTask[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.tasks)) return res.tasks;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.tasks)) return res.data.tasks;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function idOf(task: CommercialTask) {
  return String(task.id || task._id || "");
}

function dueValue(task: CommercialTask) {
  return String(task.dueAt || task.dueDate || task.startAt || "");
}

function dateKey(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isComplete(task: CommercialTask) {
  const status = String(task.status || "").toLowerCase();
  return Boolean(task.completed) || ["complete", "completed", "done"].includes(status);
}

function sectionForTask(task: CommercialTask, today = todayKey()): SectionKey {
  if (isComplete(task)) return "completed";
  const due = dateKey(dueValue(task));
  if (due && due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function titleForSource(sourceType: unknown) {
  return String(sourceType || "manual")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourcePath(task: CommercialTask) {
  const sourceType = String(task.sourceType || "");
  const sourceId = String(task.sourceId || task.sourceObjectId || "");
  if (sourceType === "storefront") return "/home/commercial/storefront";
  if (sourceType === "product" && sourceId) {
    return `/home/commercial/products/${sourceId}`;
  }
  if (sourceType === "product_batch") return "/home/commercial/batch-planner";
  if (sourceType === "product_trial")
    return sourceId ? `/home/commercial/trials/${sourceId}` : "/home/commercial/trials";
  if (sourceType === "course" && sourceId) return `/home/commercial/courses/${sourceId}`;
  if (sourceType === "live") return "/home/commercial/lives";
  if (sourceType === "feed_campaign") return "/home/commercial/feed";
  if (sourceType === "order") return "/home/commercial/orders";
  if (sourceType === "alert" && sourceId) return `/alerts/${sourceId}`;
  return "";
}

function linkedFieldsForSource(sourceType: string, sourceId: string) {
  if (!sourceId) return {};
  switch (sourceType) {
    case "storefront":
      return { linkedStorefrontId: sourceId };
    case "product":
      return { linkedProductId: sourceId };
    case "product_batch":
      return { linkedProductBatchId: sourceId };
    case "product_trial":
      return { linkedProductTrialId: sourceId };
    case "course":
      return { linkedCourseId: sourceId };
    case "lesson":
      return { linkedLessonId: sourceId };
    case "live":
      return { linkedLiveId: sourceId };
    case "feed_campaign":
      return { linkedFeedPostId: sourceId };
    case "order":
      return { linkedOrderId: sourceId };
    case "alert":
      return { linkedAlertId: sourceId };
    case "forum":
      return { linkedForumThreadId: sourceId };
    default:
      return {};
  }
}

function scheduleSummary(task: CommercialTask) {
  const reminder =
    typeof task.reminderPlan?.label === "string"
      ? task.reminderPlan.label
      : typeof task.reminderPlan?.summary === "string"
        ? task.reminderPlan.summary
        : "";
  return [
    dueValue(task) && `Due: ${dueValue(task).slice(0, 16)}`,
    task.priority && `Priority: ${task.priority}`,
    reminder && `Reminder: ${reminder}`,
    task.recurrence?.rule && `Repeats: ${task.recurrence.rule}`
  ]
    .filter(Boolean)
    .join(" | ");
}

export default function CommercialTasksRoute() {
  const [tasks, setTasks] = useState<CommercialTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reminder, setReminder] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("normal");
  const [sourceType, setSourceType] =
    useState<(typeof sourceTypes)[number]>("storefront");
  const [sourceId, setSourceId] = useState("");
  const [assignee, setAssignee] = useState("");

  async function loadTasks(opts?: { preserveFeedback?: boolean }) {
    setLoading(true);
    if (!opts?.preserveFeedback) setFeedback("");
    try {
      const res = await apiRequest(endpoints.tasksGlobal, {
        method: "GET",
        params: { workspaceType: "commercial" }
      });
      setTasks(asArray(res));
    } catch {
      setTasks([]);
      setFeedback("Unable to load commercial tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const sections = useMemo(() => {
    const grouped: Record<SectionKey, CommercialTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };
    tasks.forEach((task) => grouped[sectionForTask(task)].push(task));
    return grouped;
  }, [tasks]);
  const taskStats = useMemo(
    () => [
      { label: "Overdue", value: sections.overdue.length, tone: "red" as const },
      { label: "Today", value: sections.today.length, tone: "green" as const },
      { label: "Upcoming", value: sections.upcoming.length, tone: "blue" as const },
      { label: "Completed", value: sections.completed.length, tone: "slate" as const }
    ],
    [sections]
  );

  async function createTask() {
    if (!title.trim() || creating) return;
    setCreating(true);
    setFeedback("");
    const cleanSourceId = sourceId.trim();
    try {
      await apiRequest(endpoints.tasksGlobal, {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: title.trim(),
          description: description.trim(),
          dueAt: dueDate.trim() || undefined,
          priority,
          sourceType,
          sourceId: cleanSourceId || undefined,
          ...linkedFieldsForSource(sourceType, cleanSourceId),
          assignedToUserId: assignee.trim() || undefined,
          status: "open",
          reminderPlan: reminder.trim()
            ? { label: reminder.trim(), channels: ["in_app"] }
            : undefined,
          recurrence: recurrence.trim() ? { rule: recurrence.trim() } : undefined
        }
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setReminder("");
      setRecurrence("");
      setPriority("normal");
      setSourceType("storefront");
      setSourceId("");
      setAssignee("");
      await loadTasks({ preserveFeedback: true });
      setFeedback("Commercial task created.");
    } catch {
      setFeedback("Unable to create commercial task.");
    } finally {
      setCreating(false);
    }
  }

  async function completeTask(task: CommercialTask) {
    const id = idOf(task);
    if (!id) return;
    setFeedback("");
    try {
      await apiRequest(endpoints.taskGlobal(id), {
        method: "PATCH",
        body: {
          status: isComplete(task) ? "open" : "complete",
          completed: !isComplete(task),
          completedAt: isComplete(task) ? null : new Date().toISOString()
        }
      });
      await loadTasks({ preserveFeedback: true });
      setFeedback(isComplete(task) ? "Task reopened." : "Task completed.");
    } catch {
      setFeedback("Unable to update commercial task.");
    }
  }

  function renderTask(task: CommercialTask) {
    const source = titleForSource(task.sourceType);
    const path = sourcePath(task);
    return (
      <View key={idOf(task) || task.title} style={styles.taskCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>{task.title || "Untitled task"}</Text>
          <Text style={styles.sourcePill}>{source}</Text>
        </View>
        {task.description ? <Text style={styles.meta}>{task.description}</Text> : null}
        <Text style={styles.meta}>{scheduleSummary(task) || "No schedule set."}</Text>
        {task.sourceId || task.sourceObjectId ? (
          <Text style={styles.meta}>
            Source ID: {String(task.sourceId || task.sourceObjectId)}
          </Text>
        ) : null}
        <View style={styles.taskActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isComplete(task) ? "Reopen commercial task" : "Complete commercial task"
            }
            style={styles.secondaryButton}
            onPress={() => void completeTask(task)}
          >
            <Text style={styles.secondaryButtonText}>
              {isComplete(task) ? "Reopen" : "Complete"}
            </Text>
          </Pressable>
          {path ? (
            <Link href={path as any} asChild>
              <Pressable accessibilityRole="link" style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>View Source</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
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
        {rows.length ? rows.map(renderTask) : <Text style={styles.empty}>No tasks.</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Commercial workspace</Text>
      <Text style={styles.title}>Commercial Task Center</Text>
      <Text style={styles.subtitle}>
        One action layer for storefront setup, product readiness, course launches, live
        reminders, feed campaigns, orders, Stripe, alerts, and forum follow-up.
      </Text>
      <View style={styles.metricGrid}>
        {taskStats.map((item) => (
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

      <View style={styles.form}>
        <Text style={styles.formTitle}>Create Commercial Task</Text>
        <TextInput
          accessibilityLabel="Commercial task title"
          style={styles.input}
          placeholder="Task title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          accessibilityLabel="Commercial task description"
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <SchedulePicker
          dueDate={dueDate}
          reminder={reminder}
          recurrence={recurrence}
          onDueDateChange={setDueDate}
          onReminderChange={setReminder}
          onRecurrenceChange={setRecurrence}
          accessibilityPrefix="Commercial task"
        />
        <Text style={styles.label}>Priority</Text>
        <View style={styles.chipRow}>
          {priorities.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Commercial task priority ${item}`}
              style={[styles.chip, priority === item && styles.chipSelected]}
              onPress={() => setPriority(item)}
            >
              <Text style={[styles.chipText, priority === item && styles.chipTextOn]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Source</Text>
        <View style={styles.chipRow}>
          {sourceTypes.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Commercial task source ${item}`}
              style={[styles.chip, sourceType === item && styles.chipSelected]}
              onPress={() => setSourceType(item)}
            >
              <Text style={[styles.chipText, sourceType === item && styles.chipTextOn]}>
                {item.replace(/_/g, " ")}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <TextInput
            accessibilityLabel="Commercial task source ID"
            style={styles.flexInput}
            placeholder="Source ID"
            value={sourceId}
            onChangeText={setSourceId}
            autoCapitalize="none"
          />
          <TextInput
            accessibilityLabel="Commercial task assignee"
            style={styles.flexInput}
            placeholder="Assignee user ID"
            value={assignee}
            onChangeText={setAssignee}
            autoCapitalize="none"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create commercial task"
          style={[styles.primaryButton, (!title.trim() || creating) && styles.disabled]}
          disabled={!title.trim() || creating}
          onPress={() => void createTask()}
        >
          <Text style={styles.primaryButtonText}>
            {creating ? "Creating..." : "Create Task"}
          </Text>
        </Pressable>
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {loading ? (
        <View style={styles.taskCard}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading commercial tasks...</Text>
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
  form: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 14
  },
  formTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  label: { color: "#334155", fontSize: 12, fontWeight: "900" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: { minHeight: 76, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flexInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flex: 1,
    minWidth: 190,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  chipSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  chipText: { color: "#334155", fontSize: 12, fontWeight: "900" },
  chipTextOn: { color: "#FFFFFF" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  feedback: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#047857",
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
  taskCard: {
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
  taskTitle: { color: "#0F172A", flex: 1, fontSize: 16, fontWeight: "900" },
  sourcePill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  meta: { color: "#475569", lineHeight: 19 },
  taskActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  ghostButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  ghostButtonText: { color: "#0F172A", fontWeight: "900" },
  empty: { color: "#64748B", fontWeight: "700" }
});
