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

import {
  createPersonalTask,
  listPersonalTasks,
  updatePersonalTask,
  type PersonalTask
} from "@/api/tasks";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { fmtDate, getRowId } from "@/features/grows/routeUtils";

const priorities = ["low", "medium", "high"] as const;
const sourceTypes = [
  "manual",
  "grow",
  "plant",
  "tool_run",
  "recipe",
  "course",
  "lesson",
  "live",
  "alert",
  "sensor_alert",
  "forum"
] as const;

type SectionKey = "overdue" | "today" | "upcoming" | "completed";

function dateKey(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sectionForTask(task: PersonalTask, today = todayKey()): SectionKey {
  if (task.completed) return "completed";
  const due = dateKey(task.dueDate);
  if (due && due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function taskSource(task: PersonalTask) {
  if (task.sourceType) return task.sourceType.replace(/_/g, " ");
  if (task.sourceToolRunId) return "tool run";
  if (task.sourceDiagnosisId) return "AI diagnosis";
  if (task.linkedLogId) return "grow log";
  return "manual";
}

function taskLinks(task: PersonalTask) {
  return [
    task.growId && `Grow: ${task.growId}`,
    task.plantId && `Plant: ${task.plantId}`,
    task.sourceObjectId && `Source: ${task.sourceObjectId}`,
    task.sourceToolRunId && `ToolRun: ${task.sourceToolRunId}`,
    task.sourceDiagnosisId && `Diagnosis: ${task.sourceDiagnosisId}`,
    task.linkedLogId && `Log: ${task.linkedLogId}`
  ]
    .filter(Boolean)
    .join(" | ");
}

function scheduleSummary(task: PersonalTask) {
  const reminder =
    typeof task.reminderPlan?.label === "string"
      ? task.reminderPlan.label
      : typeof task.reminderPlan?.summary === "string"
        ? task.reminderPlan.summary
        : "";
  return [
    `Due: ${fmtDate(task.dueDate)}`,
    `Priority: ${task.priority || "medium"}`,
    reminder && `Reminder: ${reminder}`,
    task.recurrence?.rule && `Repeats: ${task.recurrence.rule}`
  ]
    .filter(Boolean)
    .join(" | ");
}

export default function PersonalTaskCenterRoute() {
  const entitlements = useEntitlements();
  const canWriteTasks = entitlements.can(CAPABILITY_KEYS.TASK_REMINDERS);

  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [growId, setGrowId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("medium");
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]>("manual");
  const [sourceObjectId, setSourceObjectId] = useState("");
  const [toolRunId, setToolRunId] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState("");

  async function load() {
    setLoading(true);
    try {
      const rows = await listPersonalTasks();
      setTasks(Array.isArray(rows) ? rows : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sections = useMemo(() => {
    const grouped: Record<SectionKey, PersonalTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };
    tasks.forEach((task) => grouped[sectionForTask(task)].push(task));
    return grouped;
  }, [tasks]);

  async function createTask() {
    if (!canWriteTasks || creating || !growId.trim() || !title.trim()) return;
    setCreating(true);
    setFeedback("");
    const created = await createPersonalTask({
      growId: growId.trim(),
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.trim() || undefined,
      priority,
      sourceType,
      sourceObjectId: sourceObjectId.trim() || undefined,
      sourceToolRunId: toolRunId.trim() || undefined,
      reminderPlan: reminderNote.trim()
        ? { label: reminderNote.trim(), channels: ["in_app"] }
        : undefined,
      recurrence: recurrenceRule.trim() ? { rule: recurrenceRule.trim() } : undefined
    });
    setCreating(false);
    if (!created) {
      setFeedback("Unable to create task.");
      return;
    }
    setGrowId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("medium");
    setSourceType("manual");
    setSourceObjectId("");
    setToolRunId("");
    setReminderNote("");
    setRecurrenceRule("");
    setFeedback("Task created.");
    await load();
  }

  async function toggleTask(task: PersonalTask) {
    const id = getRowId(task);
    if (!id || !canWriteTasks) return;
    const updated = await updatePersonalTask(id, { completed: !task.completed });
    if (updated) {
      setFeedback(task.completed ? "Task reopened." : "Task completed.");
      await load();
    } else {
      setFeedback("Unable to update task.");
    }
  }

  function renderTask(task: PersonalTask) {
    const id = getRowId(task);
    return (
      <View
        key={id || `${task.growId}-${task.title}-${task.dueDate}`}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>
            {task.completed ? "Done: " : ""}
            {task.title || "Untitled task"}
          </Text>
          <Text style={styles.sourcePill}>{taskSource(task)}</Text>
        </View>
        {task.description ? <Text style={styles.meta}>{task.description}</Text> : null}
        <Text style={styles.meta}>{scheduleSummary(task)}</Text>
        <Text style={styles.meta}>{taskLinks(task)}</Text>
        {task.snoozeUntil ? (
          <Text style={styles.meta}>Snoozed until: {fmtDate(task.snoozeUntil)}</Text>
        ) : null}
        {canWriteTasks ? (
          <Pressable
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel={task.completed ? "Reopen task" : "Complete task"}
            onPress={() => void toggleTask(task)}
          >
            <Text style={styles.secondaryButtonText}>
              {task.completed ? "Reopen" : "Complete"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function renderSection(key: SectionKey, titleText: string) {
    const rows = sections[key];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{titleText}</Text>
          <Text style={styles.countPill}>{rows.length}</Text>
        </View>
        {rows.length ? rows.map(renderTask) : <Text style={styles.empty}>No tasks.</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Task Center / Schedule</Text>
      <Text style={styles.subtitle}>
        One action layer for grow work, ToolRuns, recipes, course assignments, lives,
        alerts, and sensor follow-ups.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_task_center"
        longContent
      />

      {canWriteTasks ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Linked Task</Text>
          <TextInput
            style={styles.input}
            placeholder="Grow ID"
            value={growId}
            onChangeText={setGrowId}
            accessibilityLabel="Task center grow ID"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Task title"
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Task center title"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            accessibilityLabel="Task center description"
            multiline
          />
          <View style={styles.row}>
            <TextInput
              style={styles.flexInput}
              placeholder="YYYY-MM-DD or ISO date"
              value={dueDate}
              onChangeText={setDueDate}
              accessibilityLabel="Task center due date"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.flexInput}
              placeholder="Reminder, e.g. 24 hours before"
              value={reminderNote}
              onChangeText={setReminderNote}
              accessibilityLabel="Task center reminder"
            />
          </View>
          <Text style={styles.label}>Quick schedule</Text>
          <View style={styles.chipRow}>
            {[
              ["Today", todayKey()],
              ["Tomorrow", addDaysKey(1)],
              ["In 7 days", addDaysKey(7)],
              ["In 14 days", addDaysKey(14)],
              ["In 21 days", addDaysKey(21)]
            ].map(([label, value]) => (
              <Pressable
                key={label}
                style={[styles.chip, dueDate === value && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Task center quick date ${label}`}
                onPress={() => setDueDate(value)}
              >
                <Text style={[styles.chipText, dueDate === value && styles.chipTextOn]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {["at due time", "15 minutes before", "1 hour before", "24 hours before"].map(
              (label) => (
                <Pressable
                  key={label}
                  style={[styles.chip, reminderNote === label && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Task center reminder preset ${label}`}
                  onPress={() => setReminderNote(label)}
                >
                  <Text
                    style={[styles.chipText, reminderNote === label && styles.chipTextOn]}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            )}
          </View>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipRow}>
            {priorities.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, priority === option && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Task center priority ${option}`}
                onPress={() => setPriority(option)}
              >
                <Text style={[styles.chipText, priority === option && styles.chipTextOn]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Source</Text>
          <View style={styles.chipRow}>
            {sourceTypes.map((option) => (
              <Pressable
                key={option}
                style={[styles.chip, sourceType === option && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Task center source ${option}`}
                onPress={() => setSourceType(option)}
              >
                <Text
                  style={[styles.chipText, sourceType === option && styles.chipTextOn]}
                >
                  {option.replace(/_/g, " ")}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <TextInput
              style={styles.flexInput}
              placeholder="Source object ID"
              value={sourceObjectId}
              onChangeText={setSourceObjectId}
              accessibilityLabel="Task center source object"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.flexInput}
              placeholder="ToolRun ID"
              value={toolRunId}
              onChangeText={setToolRunId}
              accessibilityLabel="Task center ToolRun"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.flexInput}
              placeholder="Recurrence, e.g. every 7 days"
              value={recurrenceRule}
              onChangeText={setRecurrenceRule}
              accessibilityLabel="Task center recurrence"
            />
          </View>
          <View style={styles.chipRow}>
            {["does not repeat", "daily", "weekly", "every 14 days", "every 21 days"].map(
              (label) => (
                <Pressable
                  key={label}
                  style={[
                    styles.chip,
                    (label === "does not repeat"
                      ? !recurrenceRule
                      : recurrenceRule === label) && styles.chipSelected
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Task center recurrence preset ${label}`}
                  onPress={() =>
                    setRecurrenceRule(label === "does not repeat" ? "" : label)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      (label === "does not repeat"
                        ? !recurrenceRule
                        : recurrenceRule === label) && styles.chipTextOn
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            )}
          </View>
          <Pressable
            style={[
              styles.primaryButton,
              (!growId.trim() || !title.trim()) && styles.disabled
            ]}
            disabled={!growId.trim() || !title.trim() || creating}
            accessibilityRole="button"
            accessibilityLabel="Create task center task"
            onPress={() => void createTask()}
          >
            <Text style={styles.primaryButtonText}>
              {creating ? "Creating..." : "Create Task"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Task reminders are Pro</Text>
          <Text style={styles.meta}>
            Free accounts can review tasks. Pro accounts can create linked tasks,
            reminders, recurrence, and source records.
          </Text>
        </View>
      )}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_task_center"
        longContent
      />

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {renderSection("overdue", "Overdue")}
          {renderSection("today", "Today")}
          {renderSection("upcoming", "Upcoming")}
          {renderSection("completed", "Completed")}
        </>
      )}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_task_center"
        longContent
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { gap: 12, padding: 20, paddingBottom: 40 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  form: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  formTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
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
  textArea: { minHeight: 76, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#FFFFFF",
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
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  feedback: { color: "#166534", fontWeight: "900" },
  section: { gap: 8 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  countPill: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between"
  },
  taskTitle: { color: "#0F172A", flex: 1, fontSize: 15, fontWeight: "900" },
  sourcePill: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  empty: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  secondaryButton: {
    alignSelf: "flex-start",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "900" }
});
