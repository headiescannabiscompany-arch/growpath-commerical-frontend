import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";

import {
  createPersonalTask,
  listPersonalTasks,
  updatePersonalTask,
  type PersonalTask
} from "@/api/tasks";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { fmtDate, getRowId } from "@/features/grows/routeUtils";
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

type SectionKey = "overdue" | "today" | "upcoming" | "completed";
type QueueFilter = "all" | "assigned" | SectionKey;

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

function dateKey(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sectionForTask(task: PersonalTask, today = todayKey()): SectionKey {
  if (task.completed) return "completed";
  const due = dateKey(task.dueDate);
  if (due && due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function taskSource(task: PersonalTask) {
  if (task.sourceType === "ai_diagnosis") return "AI diagnosis";
  if (task.sourceType) return task.sourceType.replace(/_/g, " ");
  if (task.sourceToolRunId) return "tool run";
  if (task.sourceDiagnosisId) return "AI diagnosis";
  if (task.linkedLogId) return "grow log";
  return "manual";
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
    task.growId && `Grow: ${task.growId}`,
    task.plantId && `Plant: ${task.plantId}`,
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

function taskSourcePath(task: PersonalTask) {
  let sourceType = String(task.sourceType || "");
  const linkedSource = sourceReference(task);
  const sourceId = String(
    linkedSource ||
      task.sourceObjectId ||
      task.sourceToolRunId ||
      task.linkedToolRunId ||
      task.sourceDiagnosisId ||
      task.linkedLogId ||
      task.growId ||
      ""
  );
  const growId = String(task.growId || "");
  if (!sourceType && (task.sourceToolRunId || task.linkedToolRunId)) {
    sourceType = "tool_run";
  } else if (!sourceType && task.sourceDiagnosisId) {
    sourceType = "ai_diagnosis";
  } else if (!sourceType && task.linkedLogId) {
    sourceType = "grow_log";
  } else if (!sourceType && growId) {
    sourceType = "grow";
  }
  if (!sourceType || sourceType === "manual") return "";
  return sourceObjectHref({
    ...task,
    sourceType,
    sourceId,
    workspaceType: "personal"
  });
}

function explicitLinkedObjectPath(task: PersonalTask) {
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
    task.linkedCourseId && {
      sourceType: "course",
      sourceId: task.linkedCourseId,
      linkedCourseId: task.linkedCourseId
    },
    task.linkedLessonId && {
      sourceType: "lesson",
      sourceId: task.linkedLessonId,
      linkedLessonId: task.linkedLessonId,
      linkedCourseId: task.linkedCourseId || undefined
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
    workspaceType: "personal"
  });
}

function linkedFieldsForSource(
  sourceType: string,
  sourceObjectId: string,
  growId: string,
  toolRunId: string
) {
  const toolRunSourceId = toolRunId || (sourceType === "tool_run" ? sourceObjectId : "");
  const toolRunLink = toolRunSourceId ? { linkedToolRunId: toolRunSourceId } : {};
  switch (sourceType) {
    case "grow":
      return { ...toolRunLink, linkedGrowId: sourceObjectId || growId };
    case "plant":
      return {
        ...toolRunLink,
        plantId: sourceObjectId || undefined,
        linkedPlantId: sourceObjectId
      };
    case "tool_run":
      return toolRunLink;
    case "ai_diagnosis":
      return { ...toolRunLink, linkedDiagnosisId: sourceObjectId || undefined };
    case "recipe":
      return { ...toolRunLink, linkedRecipeId: sourceObjectId || undefined };
    case "product":
      return { ...toolRunLink, linkedProductId: sourceObjectId || undefined };
    case "product_batch":
      return { ...toolRunLink, linkedProductBatchId: sourceObjectId || undefined };
    case "product_trial":
      return { ...toolRunLink, linkedProductTrialId: sourceObjectId || undefined };
    case "storefront":
      return { ...toolRunLink, linkedStorefrontId: sourceObjectId || undefined };
    case "order":
      return { ...toolRunLink, linkedOrderId: sourceObjectId || undefined };
    case "course":
      return { ...toolRunLink, linkedCourseId: sourceObjectId || undefined };
    case "lesson":
      return { ...toolRunLink, linkedLessonId: sourceObjectId || undefined };
    case "course_assignment":
      return { ...toolRunLink, linkedCourseAssignmentId: sourceObjectId || undefined };
    case "live":
    case "live_replay":
      return { ...toolRunLink, linkedLiveId: sourceObjectId || undefined };
    case "alert":
      return { ...toolRunLink, linkedAlertId: sourceObjectId || undefined };
    case "sensor_alert":
      return { ...toolRunLink, linkedSensorAlertId: sourceObjectId || undefined };
    case "facility":
      return { ...toolRunLink, linkedFacilityId: sourceObjectId || undefined };
    case "room":
      return { ...toolRunLink, linkedRoomId: sourceObjectId || undefined };
    case "facility_run":
      return { ...toolRunLink, linkedFacilityRunId: sourceObjectId || undefined };
    case "sop":
      return { ...toolRunLink, linkedSopId: sourceObjectId || undefined };
    case "forum":
      return { ...toolRunLink, linkedForumThreadId: sourceObjectId || undefined };
    default:
      return toolRunLink;
  }
}

function calendarMetadataForTaskSource(sourceType: string) {
  const normalized = sourceType || "manual";
  const stageBySource: Record<string, string> = {
    ai_diagnosis: "diagnosis_recheck",
    ai_assistant: "ai_suggested_action",
    alert: "alert_followup",
    sensor_alert: "sensor_alert_followup",
    forum: "forum_advice_review",
    course_assignment: "course_assignment_due",
    live_replay: "live_replay_review",
    live: "live_followup",
    product_batch: "product_batch_review",
    product: "product_review",
    recipe: "recipe_followup",
    tool_run: "toolrun_followup",
    plant: "plant_followup",
    grow: "grow_followup"
  };
  return {
    allDay: true,
    calendarType: `${normalized}_task`,
    sourceStage: stageBySource[normalized] || "manual_followup"
  };
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
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");

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

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const assigned = Boolean(task.assignedToUserId || task.assignedTo);
        return (
          (queueFilter === "all" ||
            (queueFilter === "assigned"
              ? assigned
              : sectionForTask(task) === queueFilter)) &&
          (sourceFilter === "all" || String(task.sourceType || "manual") === sourceFilter)
        );
      }),
    [tasks, queueFilter, sourceFilter]
  );
  const availableSourceFilters = useMemo(
    () => [
      "all",
      ...Array.from(new Set(tasks.map((task) => String(task.sourceType || "manual"))))
    ],
    [tasks]
  );
  const sections = useMemo(() => {
    const grouped: Record<SectionKey, PersonalTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };
    visibleTasks.forEach((task) => grouped[sectionForTask(task)].push(task));
    return grouped;
  }, [visibleTasks]);
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
    if (!canWriteTasks || creating || !growId.trim() || !title.trim()) return;
    setCreating(true);
    setFeedback("");
    const cleanGrowId = growId.trim();
    const cleanSourceObjectId = sourceObjectId.trim();
    const cleanToolRunId = toolRunId.trim();
    const created = await createPersonalTask({
      growId: cleanGrowId,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate.trim() || undefined,
      priority,
      sourceType,
      sourceObjectId: cleanSourceObjectId || undefined,
      sourceToolRunId: cleanToolRunId || undefined,
      ...calendarMetadataForTaskSource(sourceType),
      ...linkedFieldsForSource(
        sourceType,
        cleanSourceObjectId,
        cleanGrowId,
        cleanToolRunId
      ),
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
    const sourcePath = taskSourcePath(task);
    const linkedObjectPath = explicitLinkedObjectPath(task);
    const showLinkedObjectPath =
      linkedObjectPath && (!sourcePath || linkedObjectPath !== sourcePath);
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
          <View style={styles.actionRow}>
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
            {sourcePath ? (
              <Link href={sourcePath as any} asChild>
                <Pressable
                  style={styles.ghostButton}
                  accessibilityRole="link"
                  accessibilityLabel="View personal task source"
                >
                  <Text style={styles.ghostButtonText}>View Source</Text>
                </Pressable>
              </Link>
            ) : null}
            {task.actionUrl ? (
              <Pressable
                style={styles.ghostButton}
                accessibilityRole="link"
                accessibilityLabel="Open scheduled live stream"
                onPress={() => void Linking.openURL(String(task.actionUrl))}
              >
                <Text style={styles.ghostButtonText}>Open Live Stream</Text>
              </Pressable>
            ) : null}
            {showLinkedObjectPath ? (
              <Link href={linkedObjectPath as any} asChild>
                <Pressable
                  style={styles.ghostButton}
                  accessibilityRole="link"
                  accessibilityLabel="View personal task linked object"
                >
                  <Text style={styles.ghostButtonText}>View Linked Object</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
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
      <Text accessibilityRole="header" style={styles.title}>
        Task Center / Schedule
      </Text>
      <Text style={styles.subtitle}>
        One action layer for grow work, ToolRuns, recipes, course assignments, lives,
        product-linked notes, alerts, and sensor follow-ups.
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
        <Text style={styles.formTitle}>Queue filters</Text>
        <View style={styles.chipRow}>
          {(
            [
              "all",
              "assigned",
              "overdue",
              "today",
              "upcoming",
              "completed"
            ] as QueueFilter[]
          ).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Personal task queue filter ${option}`}
              onPress={() => setQueueFilter(option)}
              style={[styles.chip, queueFilter === option && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, queueFilter === option && styles.chipTextOn]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Source filter</Text>
        <View style={styles.chipRow}>
          {availableSourceFilters.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Personal task source filter ${option}`}
              onPress={() => setSourceFilter(option)}
              style={[styles.chip, sourceFilter === option && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, sourceFilter === option && styles.chipTextOn]}
              >
                {option.replace(/_/g, " ")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ContextualWorkflowLinks
        title="Task planning tools"
        helper="These planners belong here because their main output is a real grow task or calendar entry. Select the grow inside the planner when one is not already in context."
        source="personal_tasks_calendar"
        workflows={[
          "auto-grow-calendar",
          "watering",
          "feeding-schedule",
          "topdress",
          "timeline-planner"
        ]}
      />
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
          <SchedulePicker
            dueDate={dueDate}
            reminder={reminderNote}
            recurrence={recurrenceRule}
            onDueDateChange={setDueDate}
            onReminderChange={setReminderNote}
            onRecurrenceChange={setRecurrenceRule}
            accessibilityPrefix="Task center"
          />
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
  form: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  formTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  label: { color: "#334155", fontSize: 12, fontWeight: "900" },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  flexInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    alignSelf: "flex-start",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "900" },
  ghostButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  ghostButtonText: { color: "#334155", fontWeight: "900" }
});
