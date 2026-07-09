import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
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
  deletePersonalTask,
  listPersonalTasks,
  updatePersonalTask,
  type PersonalTask
} from "@/api/tasks";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, fmtDate, getRowId } from "@/features/grows/routeUtils";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";

const priorities = ["low", "medium", "high"] as const;
const sourceTypes = [
  "manual",
  "grow",
  "plant",
  "tool_run",
  "ai_diagnosis",
  "recipe",
  "product",
  "product_batch",
  "course",
  "lesson",
  "course_assignment",
  "live",
  "live_replay",
  "alert",
  "sensor_alert",
  "forum"
] as const;

function storefrontAlias(task: PersonalTask) {
  return String(
    task.storefrontSlug ||
      task.linkedStorefrontSlug ||
      task.brandSlug ||
      task.publicSlug ||
      task.linkedStorefrontId ||
      ""
  );
}

function linkedFieldsForSource(
  sourceType: string,
  sourceObjectId: string,
  growId: string,
  toolRunId: string
) {
  const source = sourceObjectId.trim();
  const runId = toolRunId.trim();
  const links: Record<string, string> = {
    linkedGrowId: growId
  };
  if (runId) links.linkedToolRunId = runId;
  if (!source) return links;
  switch (sourceType) {
    case "grow":
      links.linkedGrowId = source;
      break;
    case "plant":
      links.linkedPlantId = source;
      break;
    case "tool_run":
      links.linkedToolRunId = source;
      break;
    case "recipe":
      links.linkedRecipeId = source;
      break;
    case "product":
      links.linkedProductId = source;
      break;
    case "product_batch":
      links.linkedProductBatchId = source;
      break;
    case "product_trial":
      links.linkedProductTrialId = source;
      break;
    case "storefront":
      links.linkedStorefrontId = source;
      break;
    case "order":
      links.linkedOrderId = source;
      break;
    case "course":
      links.linkedCourseId = source;
      break;
    case "lesson":
      links.linkedLessonId = source;
      break;
    case "course_assignment":
      links.linkedCourseAssignmentId = source;
      break;
    case "live":
    case "live_replay":
      links.linkedLiveId = source;
      break;
    case "alert":
      links.linkedAlertId = source;
      break;
    case "sensor_alert":
      links.linkedSensorAlertId = source;
      break;
    case "facility":
      links.linkedFacilityId = source;
      break;
    case "room":
      links.linkedRoomId = source;
      break;
    case "facility_run":
      links.linkedFacilityRunId = source;
      break;
    case "sop":
      links.linkedSopId = source;
      break;
    case "forum":
      links.linkedForumThreadId = source;
      break;
    default:
      break;
  }
  return links;
}

function taskSource(task: PersonalTask) {
  if (task.sourceType) return task.sourceType.replace(/_/g, " ");
  if (task.sourceToolRunId) return "tool run";
  if (task.sourceDiagnosisId) return "AI diagnosis";
  if (task.linkedLogId) return "journal";
  return "";
}

function sourceObjectLabel(task: PersonalTask) {
  if (task.sourceType === "ai_diagnosis") return "AI Diagnosis";
  const source = String(task.sourceType || "")
    .replace(/_/g, " ")
    .trim();
  if (!source) return "Source";
  return source.replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourceReference(task: PersonalTask) {
  const sourceType = String(task.sourceType || "");
  const linkedSource =
    task.sourceObjectId ||
    task.linkedRecipeId ||
    task.linkedProductId ||
    task.linkedProductBatchId ||
    task.linkedProductTrialId ||
    storefrontAlias(task) ||
    task.linkedOrderId ||
    task.linkedCourseAssignmentId ||
    task.linkedCourseId ||
    task.linkedLessonId ||
    task.linkedLiveId ||
    task.linkedAlertId ||
    task.linkedSensorAlertId ||
    task.linkedForumThreadId ||
    task.linkedFacilityId ||
    task.linkedRoomId ||
    task.linkedFacilityRunId ||
    task.linkedSopId;
  const contextualSource =
    sourceType === "plant"
      ? task.linkedPlantId
      : sourceType === "grow"
        ? task.linkedGrowId
        : "";
  const value = linkedSource || contextualSource;
  return value ? String(value) : "";
}

function taskLinks(task: PersonalTask) {
  const linkedSource = sourceReference(task);
  const linkedObjectDetails = [
    task.linkedProductId &&
      linkedSource !== task.linkedProductId &&
      `Product: ${task.linkedProductId}`,
    task.linkedCourseId &&
      linkedSource !== task.linkedCourseId &&
      `Course: ${task.linkedCourseId}`,
    task.linkedCourseAssignmentId &&
      linkedSource !== task.linkedCourseAssignmentId &&
      `Assignment: ${task.linkedCourseAssignmentId}`,
    task.linkedLiveId &&
      linkedSource !== task.linkedLiveId &&
      `Live: ${task.linkedLiveId}`,
    storefrontAlias(task) &&
      linkedSource !== storefrontAlias(task) &&
      `Storefront: ${storefrontAlias(task)}`
  ];
  return [
    linkedSource && `${sourceObjectLabel(task)}: ${linkedSource}`,
    ...linkedObjectDetails,
    task.sourceToolRunId && `ToolRun: ${task.sourceToolRunId}`,
    !task.sourceToolRunId && task.linkedToolRunId && `ToolRun: ${task.linkedToolRunId}`,
    task.sourceDiagnosisId && `Diagnosis: ${task.sourceDiagnosisId}`,
    task.linkedLogId && `Log: ${task.linkedLogId}`
  ]
    .filter(Boolean)
    .join(" | ");
}

function taskSourcePath(task: PersonalTask, growId: string) {
  let sourceType = String(task.sourceType || "");
  if (!sourceType && task.linkedLogId) sourceType = "grow_log";
  else if (!sourceType && (task.sourceToolRunId || task.linkedToolRunId)) {
    sourceType = "tool_run";
  } else if (!sourceType && task.sourceDiagnosisId) sourceType = "ai_diagnosis";
  else if (!sourceType && task.linkedForumThreadId) sourceType = "forum";

  if (!sourceType || sourceType === "manual") return "";

  const sourceId = String(
    sourceReference(task) ||
      task.linkedLogId ||
      task.sourceToolRunId ||
      task.linkedToolRunId ||
      task.sourceDiagnosisId ||
      growId ||
      ""
  );
  return sourceObjectHref({
    ...task,
    sourceType,
    sourceId,
    growId,
    workspaceType: "personal"
  });
}

function explicitLinkedObjectPath(task: PersonalTask, growId: string) {
  const storefrontSlug = storefrontAlias(task);
  const sourceByPriority = [
    task.linkedProductId && {
      sourceType: "product",
      sourceId: task.linkedProductId,
      linkedProductId: task.linkedProductId
    },
    task.linkedProductBatchId && {
      sourceType: "product_batch",
      sourceId: task.linkedProductBatchId,
      linkedProductBatchId: task.linkedProductBatchId,
      linkedProductId: task.linkedProductId || undefined
    },
    task.linkedProductTrialId && {
      sourceType: "product_trial",
      sourceId: task.linkedProductTrialId,
      linkedProductTrialId: task.linkedProductTrialId
    },
    task.linkedCourseAssignmentId && {
      sourceType: "course_assignment",
      sourceId: task.linkedCourseAssignmentId,
      linkedCourseAssignmentId: task.linkedCourseAssignmentId,
      linkedCourseId: task.linkedCourseId || undefined,
      linkedLessonId: task.linkedLessonId || undefined
    },
    task.linkedLessonId && {
      sourceType: "lesson",
      sourceId: task.linkedLessonId,
      linkedLessonId: task.linkedLessonId,
      linkedCourseId: task.linkedCourseId || undefined
    },
    task.linkedCourseId && {
      sourceType: "course",
      sourceId: task.linkedCourseId,
      linkedCourseId: task.linkedCourseId
    },
    task.linkedLiveId && {
      sourceType: "live",
      sourceId: task.linkedLiveId,
      linkedLiveId: task.linkedLiveId
    },
    storefrontSlug && {
      sourceType: "storefront",
      sourceId: storefrontSlug || task.linkedStorefrontId || "",
      linkedStorefrontSlug: storefrontSlug || undefined,
      linkedStorefrontId: task.linkedStorefrontId || undefined
    },
    task.linkedForumThreadId && {
      sourceType: "forum",
      sourceId: task.linkedForumThreadId,
      linkedForumThreadId: task.linkedForumThreadId
    }
  ].find(Boolean);

  if (!sourceByPriority) return "";

  return sourceObjectHref({
    ...task,
    ...(sourceByPriority as Record<string, string | undefined>),
    storefrontSlug,
    growId,
    workspaceType: "personal"
  });
}

function scheduleSummary(task: PersonalTask) {
  const parts = [
    `Due: ${fmtDate(task?.dueDate)}`,
    `Priority: ${task.priority || "medium"}`
  ];
  const reminderLabel =
    typeof task.reminderPlan?.label === "string"
      ? task.reminderPlan.label
      : typeof task.reminderPlan?.summary === "string"
        ? task.reminderPlan.summary
        : "";
  if (reminderLabel) parts.push(`Reminder: ${reminderLabel}`);
  if (task.recurrence?.rule) parts.push(`Repeats: ${task.recurrence.rule}`);
  return parts.join(" | ");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  form: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8,
    marginBottom: 10
  },
  label: { color: "#334155", fontWeight: "800", fontSize: 12 },
  input: {
    minWidth: 170,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  addBtn: {
    minHeight: 40,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: radius.card,
    backgroundColor: "#166534"
  },
  addBtnText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  taskTitle: { fontWeight: "700", color: "#0F172A" },
  taskMeta: { color: "#64748B", marginTop: 4, fontSize: 12 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: radius.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  actionText: { fontWeight: "700", color: "#0F172A" },
  dangerText: { fontWeight: "800", color: "#B91C1C" },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF"
  },
  chipOn: { backgroundColor: "#166534", borderColor: "#166534" },
  chipText: { color: "#334155", fontWeight: "800", fontSize: 12 },
  chipTextOn: { color: "#FFFFFF" }
});

export default function GrowTasksScreen() {
  const entitlements = useEntitlements();
  const canWriteTasks = entitlements.can(CAPABILITY_KEYS.TASK_REMINDERS);
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<(typeof priorities)[number]>("medium");
  const [newSourceType, setNewSourceType] =
    useState<(typeof sourceTypes)[number]>("manual");
  const [newSourceObjectId, setNewSourceObjectId] = useState("");
  const [newToolRunId, setNewToolRunId] = useState("");
  const [newDiagnosisId, setNewDiagnosisId] = useState("");
  const [newLinkedLogId, setNewLinkedLogId] = useState("");
  const [newReminderNote, setNewReminderNote] = useState("");
  const [newRecurrenceRule, setNewRecurrenceRule] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listPersonalTasks({ growId });
      setTasks(Array.isArray(rows) ? rows : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function createTask() {
    if (!growId || !newTitle.trim() || creating) return;
    setCreating(true);
    setFeedback("");
    try {
      const created = await createPersonalTask({
        growId,
        linkedGrowId: growId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        dueDate: newDueDate.trim() || undefined,
        priority: newPriority,
        sourceType: newSourceType,
        sourceObjectId: newSourceObjectId.trim() || undefined,
        sourceToolRunId: newToolRunId.trim() || undefined,
        sourceDiagnosisId: newDiagnosisId.trim() || undefined,
        linkedLogId: newLinkedLogId.trim() || undefined,
        ...linkedFieldsForSource(newSourceType, newSourceObjectId, growId, newToolRunId),
        reminderPlan: newReminderNote.trim()
          ? { label: newReminderNote.trim(), channels: ["in_app"] }
          : undefined,
        recurrence: newRecurrenceRule.trim()
          ? { rule: newRecurrenceRule.trim() }
          : undefined
      });
      if (created) {
        setNewTitle("");
        setNewDescription("");
        setNewDueDate("");
        setNewPriority("medium");
        setNewSourceType("manual");
        setNewSourceObjectId("");
        setNewToolRunId("");
        setNewDiagnosisId("");
        setNewLinkedLogId("");
        setNewReminderNote("");
        setNewRecurrenceRule("");
        setFeedback("Task created.");
        await load();
      } else {
        setFeedback("Unable to create task.");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>Personal grow tasks linked to this grow.</Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_tasks"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="tasks" />

      {canWriteTasks ? (
        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Add task title"
            value={newTitle}
            onChangeText={setNewTitle}
            accessibilityLabel="Task title"
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="What needs to happen?"
            value={newDescription}
            onChangeText={setNewDescription}
            accessibilityLabel="Task description"
          />
          <Text style={styles.label}>Due date</Text>
          <SchedulePicker
            dueDate={newDueDate}
            reminder={newReminderNote}
            recurrence={newRecurrenceRule}
            onDueDateChange={setNewDueDate}
            onReminderChange={setNewReminderNote}
            onRecurrenceChange={setNewRecurrenceRule}
            accessibilityPrefix="Grow task"
            dueDateAccessibilityLabel="Task due date"
            reminderAccessibilityLabel="Task reminder note"
            recurrenceAccessibilityLabel="Task recurrence rule"
            reminderPlaceholder="Reminder note, e.g. 24 hours before"
            recurrencePlaceholder="Repeat rule, e.g. every 7 days"
          />
          <Text style={styles.label}>Priority</Text>
          <View style={styles.row}>
            {priorities.map((priority) => (
              <Pressable
                key={priority}
                style={[styles.chip, newPriority === priority && styles.chipOn]}
                onPress={() => setNewPriority(priority)}
                accessibilityRole="button"
                accessibilityLabel={`Set task priority ${priority}`}
              >
                <Text
                  style={[styles.chipText, newPriority === priority && styles.chipTextOn]}
                >
                  {priority}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Source</Text>
          <View style={styles.row}>
            {sourceTypes.map((sourceType) => (
              <Pressable
                key={sourceType}
                style={[styles.chip, newSourceType === sourceType && styles.chipOn]}
                onPress={() => setNewSourceType(sourceType)}
                accessibilityRole="button"
                accessibilityLabel={`Set task source ${sourceType}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    newSourceType === sourceType && styles.chipTextOn
                  ]}
                >
                  {sourceType.replace(/_/g, " ")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Linked records</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Source object ID"
              value={newSourceObjectId}
              onChangeText={setNewSourceObjectId}
              accessibilityLabel="Task source object"
            />
            <TextInput
              style={styles.input}
              placeholder="ToolRun ID"
              value={newToolRunId}
              onChangeText={setNewToolRunId}
              accessibilityLabel="Task ToolRun"
            />
            <TextInput
              style={styles.input}
              placeholder="Diagnosis ID"
              value={newDiagnosisId}
              onChangeText={setNewDiagnosisId}
              accessibilityLabel="Task diagnosis"
            />
            <TextInput
              style={styles.input}
              placeholder="Linked grow log ID"
              value={newLinkedLogId}
              onChangeText={setNewLinkedLogId}
              accessibilityLabel="Task linked log"
            />
          </View>
          <Pressable
            style={[styles.addBtn, (!newTitle.trim() || creating) && { opacity: 0.55 }]}
            disabled={!newTitle.trim() || creating}
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={createTask}
          >
            <Text style={styles.addBtnText}>{creating ? "Adding..." : "Add Task"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Task reminders are Pro</Text>
          <Text style={styles.taskMeta}>
            Free accounts can review existing grow tasks. Upgrade to create, complete,
            reopen, snooze, or archive reminders.
          </Text>
        </View>
      )}

      {feedback ? <Text style={styles.taskMeta}>{feedback}</Text> : null}
      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grows_growid_tasks"
        longContent
      />

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.taskMeta}>No tasks yet.</Text>
        </View>
      ) : (
        tasks.map((task) => {
          const id = getRowId(task);
          const done = Boolean(task?.completed);
          const source = taskSource(task);
          const links = taskLinks(task);
          const sourcePath = taskSourcePath(task, growId);
          const linkedObjectPath = explicitLinkedObjectPath(task, growId);
          const showLinkedObjectPath =
            linkedObjectPath && (!sourcePath || linkedObjectPath !== sourcePath);
          return (
            <View key={id || `${task.title}-${task.dueDate}`} style={styles.card}>
              <Text style={styles.taskTitle}>
                {done ? "Done: " : ""}
                {task?.title || "Untitled task"}
              </Text>
              {task.description ? (
                <Text style={styles.taskMeta}>{task.description}</Text>
              ) : null}
              <Text style={styles.taskMeta}>{scheduleSummary(task)}</Text>
              {task.snoozeUntil ? (
                <Text style={styles.taskMeta}>
                  Snoozed until: {fmtDate(task.snoozeUntil)}
                </Text>
              ) : null}
              {source ? <Text style={styles.taskMeta}>Source: {source}</Text> : null}
              {links ? <Text style={styles.taskMeta}>{links}</Text> : null}
              {task.recurrence ? (
                <Text style={styles.taskMeta}>Recurring task</Text>
              ) : null}
              {canWriteTasks ? (
                <View style={styles.actionRow}>
                  {id ? (
                    <>
                      <Pressable
                        style={styles.actionBtn}
                        accessibilityRole="button"
                        accessibilityLabel={done ? "Reopen task" : "Complete task"}
                        onPress={async () => {
                          const updated = await updatePersonalTask(id, {
                            completed: !done
                          });
                          if (updated) {
                            setFeedback(done ? "Task reopened." : "Task completed.");
                            await load();
                          } else {
                            setFeedback("Unable to update task.");
                          }
                        }}
                      >
                        <Text style={styles.actionText}>
                          {done ? "Reopen" : "Complete"}
                        </Text>
                      </Pressable>
                      {!done ? (
                        <Pressable
                          style={styles.actionBtn}
                          accessibilityRole="button"
                          accessibilityLabel="Snooze task one day"
                          onPress={async () => {
                            const snoozeUntil = new Date(
                              Date.now() + 86400000
                            ).toISOString();
                            const updated = await updatePersonalTask(id, { snoozeUntil });
                            if (updated) {
                              setFeedback("Task snoozed until tomorrow.");
                              await load();
                            } else {
                              setFeedback("Unable to snooze task.");
                            }
                          }}
                        >
                          <Text style={styles.actionText}>Snooze</Text>
                        </Pressable>
                      ) : null}
                      {sourcePath ? (
                        <Link href={sourcePath as any} asChild>
                          <Pressable
                            style={styles.actionBtn}
                            accessibilityRole="link"
                            accessibilityLabel="View grow task source"
                          >
                            <Text style={styles.actionText}>View Source</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                      {showLinkedObjectPath ? (
                        <Link href={linkedObjectPath as any} asChild>
                          <Pressable
                            style={styles.actionBtn}
                            accessibilityRole="link"
                            accessibilityLabel="View grow task linked object"
                          >
                            <Text style={styles.actionText}>View Linked Object</Text>
                          </Pressable>
                        </Link>
                      ) : null}
                      <Pressable
                        style={styles.dangerBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Delete task"
                        onPress={async () => {
                          const deleted = await deletePersonalTask(id);
                          if (deleted) {
                            setFeedback("Task archived.");
                            await load();
                          } else {
                            setFeedback("Unable to archive task.");
                          }
                        }}
                      >
                        <Text style={styles.dangerText}>Delete</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_tasks"
        longContent
      />
    </ScrollView>
  );
}
