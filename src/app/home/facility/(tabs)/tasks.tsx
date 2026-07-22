import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { createTask as createFacilityTask, getFacilityTasks } from "@/api/tasks";
import { listTeamMembers, type TeamMember } from "@/api/team";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useEntitlements } from "@/entitlements";
import { getFacilityTaskAccess } from "@/features/facility/taskAccess";
import { useFacilityGrows } from "@/features/facility/useFacilityGrows";
import { useFacilityRooms } from "@/features/facility/useFacilityRooms";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;
type QueueFilter = "all" | "assigned" | "overdue" | "today" | "upcoming" | "completed";

const sourceTypes = [
  "manual",
  "room",
  "facility_run",
  "sop",
  "sensor_alert",
  "alert",
  "course",
  "lesson",
  "course_assignment",
  "live",
  "feed_campaign",
  "toolrun",
  "recipe",
  "product",
  "product_batch",
  "product_trial",
  "forum"
] as const;

const CULTIVATION_TASK_PRESETS = [
  { label: "Water", title: "Water and check dryback", recurrence: "weekly" },
  { label: "Feed", title: "Feed and check pH / EC response", recurrence: "weekly" },
  { label: "IPM", title: "Inspect IPM and record findings", recurrence: "weekly" },
  {
    label: "Defoliate",
    title: "Review canopy and defoliate if needed",
    recurrence: "monthly"
  }
] as const;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.tasks)) return res.tasks;
  return [];
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function rowId(row: AnyRec) {
  return String(row?.id ?? row?._id ?? row?.growId ?? row?.roomId ?? "");
}

function rowName(row: AnyRec, fallback: string) {
  return String(row?.name ?? row?.title ?? row?.label ?? fallback);
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.taskId ?? x?.uuid ?? "");
}

function mergeTaskQueue(fetched: AnyRec[], preserved: AnyRec[] = []) {
  const fetchedIds = new Set(fetched.map(pickId).filter(Boolean));
  const missingPreserved = preserved.filter((task) => {
    const id = pickId(task);
    return id && !fetchedIds.has(id);
  });
  return [...missingPreserved, ...fetched];
}

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.name ?? x?.label ?? x?.type ?? "Task");
}

function dateKey(value?: unknown) {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function isTaskComplete(task: AnyRec) {
  const status = String(task?.status || task?.state || "").toLowerCase();
  return Boolean(task?.completed) || ["complete", "completed", "done"].includes(status);
}

function taskQueue(task: AnyRec, today = new Date().toISOString().slice(0, 10)) {
  if (isTaskComplete(task)) return "completed";
  const due = dateKey(task?.dueAt ?? task?.dueDate ?? task?.due);
  if (due && due < today) return "overdue";
  if (due === today) return "today";
  return "upcoming";
}

function sourceReference(x: AnyRec): string {
  const values = [
    x?.sourceObjectId ?? x?.sourceId,
    x?.linkedAlertId,
    x?.linkedSensorAlertId,
    x?.linkedCourseAssignmentId,
    x?.linkedCourseId,
    x?.linkedLessonId,
    x?.linkedLiveId,
    x?.linkedFeedCampaignId,
    x?.linkedFeedPostId,
    x?.linkedToolRunId,
    x?.linkedRecipeId,
    x?.linkedProductId,
    x?.linkedProductBatchId,
    x?.linkedProductTrialId,
    x?.linkedForumThreadId,
    x?.linkedFacilityRunId,
    x?.linkedSopId,
    x?.sourceType === "room" ? x?.linkedRoomId : undefined
  ];
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item)
  );
  return value ? String(value) : "";
}

function pickSubtitle(x: AnyRec): string {
  const due = x?.dueAt ?? x?.dueDate ?? x?.due;
  const status = x?.status ?? x?.state;
  const assignee = x?.assigneeName ?? x?.assignee ?? x?.assignedTo;
  const sourceType = x?.sourceType;
  const sourceObjectId = sourceReference(x);
  const roomId = x?.roomId ?? x?.linkedRoomId;
  const proof = x?.requiresProof ? "Proof required" : "";
  const approval = x?.requiresApproval ? "Approval required" : "";

  const a = due ? `Due: ${String(due)}` : "";
  const b = status ? `Status: ${String(status)}` : "";
  const c = assignee ? `Assignee: ${String(assignee)}` : "";
  const d = sourceType
    ? `Source: ${String(sourceType).replace(/_/g, " ")}${sourceObjectId ? ` ${String(sourceObjectId)}` : ""}`
    : sourceObjectId
      ? `Source: ${sourceObjectId}`
      : "";
  const e = roomId ? `Room: ${String(roomId)}` : "";

  return [a, b, c, d, e, proof, approval].filter(Boolean).join(" -  ");
}

function linkedFieldsForSource(
  sourceType: string,
  sourceObjectId: string,
  roomId: string
) {
  const roomLink = roomId ? { linkedRoomId: roomId } : {};
  switch (sourceType) {
    case "room":
      return { ...roomLink, linkedRoomId: sourceObjectId || roomId || undefined };
    case "facility_run":
      return { ...roomLink, linkedFacilityRunId: sourceObjectId || undefined };
    case "sop":
      return { ...roomLink, linkedSopId: sourceObjectId || undefined };
    case "alert":
      return { ...roomLink, linkedAlertId: sourceObjectId || undefined };
    case "sensor_alert":
      return { ...roomLink, linkedSensorAlertId: sourceObjectId || undefined };
    case "course":
      return { ...roomLink, linkedCourseId: sourceObjectId || undefined };
    case "lesson":
      return { ...roomLink, linkedLessonId: sourceObjectId || undefined };
    case "course_assignment":
      return { ...roomLink, linkedCourseAssignmentId: sourceObjectId || undefined };
    case "live":
      return { ...roomLink, linkedLiveId: sourceObjectId || undefined };
    case "feed_campaign":
      return { ...roomLink, linkedFeedCampaignId: sourceObjectId || undefined };
    case "toolrun":
      return { ...roomLink, linkedToolRunId: sourceObjectId || undefined };
    case "recipe":
      return { ...roomLink, linkedRecipeId: sourceObjectId || undefined };
    case "product":
      return { ...roomLink, linkedProductId: sourceObjectId || undefined };
    case "product_batch":
      return { ...roomLink, linkedProductBatchId: sourceObjectId || undefined };
    case "product_trial":
      return { ...roomLink, linkedProductTrialId: sourceObjectId || undefined };
    case "forum":
      return { ...roomLink, linkedForumThreadId: sourceObjectId || undefined };
    default:
      return roomLink;
  }
}

function calendarMetadataForFacilityTask(sourceType: string) {
  const normalized = sourceType || "manual";
  const stageBySource: Record<string, string> = {
    room: "room_work",
    facility_run: "facility_run_work",
    sop: "sop_work",
    sensor_alert: "sensor_alert_followup",
    alert: "alert_followup",
    course: "training_course_review",
    lesson: "training_lesson_review",
    course_assignment: "training_assignment_review",
    live: "training_live_prep",
    feed_campaign: "facility_outreach_review",
    toolrun: "toolrun_followup",
    recipe: "recipe_work",
    product: "product_review",
    product_batch: "product_batch_review",
    product_trial: "product_trial_review",
    forum: "forum_followup"
  };
  return {
    allDay: true,
    calendarType: `${normalized}_facility_task`,
    sourceStage: stageBySource[normalized] || "facility_followup"
  };
}

export default function FacilityTasksRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    assignee?: string | string[];
    growId?: string | string[];
    roomId?: string | string[];
    contextName?: string | string[];
  }>();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();
  const { rooms } = useFacilityRooms(facilityId);
  const { grows } = useFacilityGrows(facilityId);
  const contextGrowId = String(firstParam(params.growId) || "");
  const contextRoomId = String(firstParam(params.roomId) || "");
  const contextName = String(firstParam(params.contextName) || "");

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [items, setItems] = useState<AnyRec[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [newRecurrence, setNewRecurrence] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newSourceType, setNewSourceType] =
    useState<(typeof sourceTypes)[number]>("manual");
  const [newSourceObjectId, setNewSourceObjectId] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const [newGrowId, setNewGrowId] = useState("");
  const [newRequiresProof, setNewRequiresProof] = useState(false);
  const [newRequiresApproval, setNewRequiresApproval] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(
    Boolean(contextGrowId || contextRoomId || firstParam(params.assignee))
  );
  const [showAdvancedLinkage, setShowAdvancedLinkage] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const taskAccess = getFacilityTaskAccess({
    can: ent?.can,
    facilityRole: ent?.facilityRole
  });
  const canWrite = taskAccess.canCreateTask;
  const canAssign = taskAccess.canAssignTask;
  const availableGrows = useMemo(
    () =>
      newRoomId
        ? grows.filter(
            (grow) =>
              String(grow?.roomId ?? grow?.room?._id ?? grow?.room?.id ?? "") ===
              newRoomId
          )
        : grows,
    [grows, newRoomId]
  );

  useEffect(() => {
    const requested = firstParam(params.assignee);
    if (requested) setNewAssignedTo(String(requested));
  }, [params.assignee]);

  useEffect(() => {
    if (contextGrowId) setNewGrowId(contextGrowId);
    if (contextRoomId) setNewRoomId(contextRoomId);
  }, [contextGrowId, contextRoomId]);

  const load = useCallback(
    async (opts?: { refresh?: boolean; preserve?: AnyRec[] }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const [res, team] = await Promise.all([
          getFacilityTasks(facilityId, {
            growId: contextGrowId || undefined,
            roomId: contextRoomId || undefined
          }),
          canAssign ? listTeamMembers(facilityId) : Promise.resolve([])
        ]);
        setItems(mergeTaskQueue(asArray(res), opts?.preserve));
        setMembers(team);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, canAssign, contextGrowId, contextRoomId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const createTask = useCallback(async () => {
    if (!facilityId || !canWrite) return;
    const title = newTitle.trim();
    if (!title) return;
    const cleanSourceObjectId = newSourceObjectId.trim();
    const cleanRoomId = newRoomId.trim();
    setCreating(true);
    try {
      clearError();
      const createdTask = await createFacilityTask(facilityId, {
        title,
        notes: newNotes.trim() || undefined,
        dueDate: newDueDate.trim() || undefined,
        assignedToUserId: canAssign ? newAssignedTo.trim() || undefined : undefined,
        sourceType: newSourceType,
        sourceObjectId: cleanSourceObjectId || undefined,
        roomId: cleanRoomId || undefined,
        growId: newGrowId.trim() || undefined,
        ...calendarMetadataForFacilityTask(newSourceType),
        ...linkedFieldsForSource(newSourceType, cleanSourceObjectId, cleanRoomId),
        reminderPlan: newReminder.trim()
          ? { label: newReminder.trim(), channels: ["in_app"] }
          : undefined,
        recurrence: newRecurrence.trim() ? { rule: newRecurrence.trim() } : undefined,
        requiresProof: newRequiresProof || undefined,
        requiresApproval: newRequiresApproval || undefined,
        scope: "facility"
      });
      const preservedTask =
        createdTask && typeof createdTask === "object" && pickId(createdTask)
          ? (createdTask as AnyRec)
          : null;
      if (preservedTask) {
        setItems((current) => mergeTaskQueue(current, [preservedTask]));
      }
      setNewTitle("");
      setNewNotes("");
      setNewDueDate("");
      setNewReminder("");
      setNewRecurrence("");
      setNewAssignedTo("");
      setNewSourceType("manual");
      setNewSourceObjectId("");
      setNewRoomId(contextRoomId);
      setNewGrowId(contextGrowId);
      setNewRequiresProof(false);
      setNewRequiresApproval(false);
      await load({
        refresh: true,
        preserve: preservedTask ? [preservedTask] : undefined
      });
    } catch (e) {
      handleApiError(e);
    } finally {
      setCreating(false);
    }
  }, [
    facilityId,
    canWrite,
    canAssign,
    newTitle,
    newNotes,
    newDueDate,
    newReminder,
    newRecurrence,
    newAssignedTo,
    newSourceType,
    newSourceObjectId,
    newRoomId,
    newGrowId,
    newRequiresProof,
    newRequiresApproval,
    contextGrowId,
    contextRoomId,
    clearError,
    handleApiError,
    load
  ]);

  const availableSourceFilters = useMemo(
    () => [
      "all",
      ...Array.from(new Set(items.map((task) => String(task.sourceType || "manual"))))
    ],
    [items]
  );
  const visibleItems = useMemo(
    () =>
      items.filter((task) => {
        const assigned = Boolean(
          task.assignedToUserId || task.assignedTo || task.assignee || task.assigneeName
        );
        const matchesQueue =
          queueFilter === "all" ||
          (queueFilter === "assigned" ? assigned : taskQueue(task) === queueFilter);
        return (
          matchesQueue &&
          (sourceFilter === "all" || String(task.sourceType || "manual") === sourceFilter)
        );
      }),
    [items, queueFilter, sourceFilter]
  );
  const header = useMemo(() => {
    const visible = visibleItems.length;
    const total = items.length;
    if (visible === total) return total === 1 ? "1 task" : `${total} tasks`;
    return `${visible} of ${total} tasks`;
  }, [items.length, visibleItems.length]);

  return (
    <ScreenBoundary
      title={contextName ? `${contextName} tasks` : "Tasks"}
      showBack={Boolean(contextGrowId)}
      backFallbackHref={
        contextGrowId ? `/home/facility/grows/${contextGrowId}` : undefined
      }
    >
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Task</Text>
          {canWrite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle facility task creator"
              onPress={() => setShowTaskCreator((current) => !current)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>
                {showTaskCreator ? "Hide task creator" : "Create a task"}
              </Text>
            </Pressable>
          ) : null}
          {contextName ? (
            <View style={styles.contextBanner}>
              <Text style={styles.contextTitle}>{contextName}</Text>
              <Text style={styles.muted}>
                New tasks and the work queue are scoped to this grow workspace.
              </Text>
            </View>
          ) : null}
          {!canWrite ? (
            <Text style={styles.muted}>{taskAccess.hiddenCreateReason}</Text>
          ) : showTaskCreator ? (
            <View style={styles.form}>
              <Text style={styles.label}>Title</Text>
              <View style={styles.chipRow}>
                {CULTIVATION_TASK_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${preset.label} task template`}
                    onPress={() => {
                      setNewTitle(preset.title);
                      setNewRecurrence(preset.recurrence);
                      setNewSourceType("room");
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Facility task title"
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.input}
                placeholder="Task title"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                accessibilityLabel="Facility task notes"
                value={newNotes}
                onChangeText={setNewNotes}
                style={[styles.input, styles.inputMultiline]}
                placeholder="Notes"
                multiline
              />

              <Text style={styles.label}>Room</Text>
              <View style={styles.chipRow}>
                {rooms.map((room) => {
                  const id = rowId(room);
                  const label = rowName(room, "Room");
                  if (!id) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={`Set facility task room ${label}`}
                      onPress={() => {
                        setNewRoomId(id);
                        if (
                          newGrowId &&
                          !grows.some(
                            (grow) =>
                              rowId(grow) === newGrowId &&
                              String(
                                grow?.roomId ?? grow?.room?._id ?? grow?.room?.id ?? ""
                              ) === id
                          )
                        ) {
                          setNewGrowId("");
                        }
                      }}
                      style={[styles.chip, newRoomId === id && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newRoomId === id && styles.chipTextSelected
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Grow (optional)</Text>
              <View style={styles.chipRow}>
                {availableGrows.map((grow) => {
                  const id = rowId(grow);
                  const label = rowName(grow, "Grow");
                  if (!id) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={`Set facility task grow ${label}`}
                      onPress={() => setNewGrowId(id)}
                      style={[styles.chip, newGrowId === id && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newGrowId === id && styles.chipTextSelected
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <SchedulePicker
                dueDate={newDueDate}
                reminder={newReminder}
                recurrence={newRecurrence}
                onDueDateChange={setNewDueDate}
                onReminderChange={setNewReminder}
                onRecurrenceChange={setNewRecurrence}
                accessibilityPrefix="Facility task"
                dueDatePlaceholder="Due date, e.g. YYYY-MM-DD"
                reminderPlaceholder="Reminder, e.g. 24 hours before"
                recurrencePlaceholder="Recurrence, e.g. weekly SOP"
              />

              {canAssign ? (
                <>
                  <Text style={styles.label}>Assign to team member</Text>
                  <View style={styles.chipRow}>
                    {members.map((member) => {
                      const memberId = String(member.userId || member.id || "");
                      const label = member.name || member.email || memberId;
                      return (
                        <Pressable
                          key={memberId}
                          accessibilityRole="button"
                          accessibilityLabel={`Assign facility task to ${label}`}
                          onPress={() => setNewAssignedTo(memberId)}
                          style={[
                            styles.chip,
                            newAssignedTo === memberId && styles.chipSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              newAssignedTo === memberId && styles.chipTextSelected
                            ]}
                          >
                            {label} · {String(member.role || "member").toLowerCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <Text style={styles.muted}>
                  Only owners and managers can assign facility tasks.
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle advanced facility task linkage"
                onPress={() => setShowAdvancedLinkage((current) => !current)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>
                  {showAdvancedLinkage
                    ? "Hide advanced linkage"
                    : "Advanced: link an SOP, alert, course, tool result, or forum post"}
                </Text>
              </Pressable>

              {showAdvancedLinkage ? (
                <View style={styles.advancedPanel}>
                  <Text style={styles.label}>Source type</Text>
                  <View style={styles.chipRow}>
                    {sourceTypes.map((sourceType) => (
                      <Pressable
                        key={sourceType}
                        accessibilityRole="button"
                        accessibilityLabel={`Set facility task source ${sourceType}`}
                        onPress={() => setNewSourceType(sourceType)}
                        style={[
                          styles.chip,
                          newSourceType === sourceType && styles.chipSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            newSourceType === sourceType && styles.chipTextSelected
                          ]}
                        >
                          {sourceType.replace(/_/g, " ")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.label}>Linked record identifier</Text>
                  <Text style={styles.muted}>
                    Usually filled automatically when this task starts from another
                    workflow.
                  </Text>
                  <TextInput
                    accessibilityLabel="Facility task source object"
                    value={newSourceObjectId}
                    onChangeText={setNewSourceObjectId}
                    style={styles.input}
                    placeholder="Optional linked record ID"
                  />
                </View>
              ) : null}

              <View style={styles.chipRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle proof required"
                  onPress={() => setNewRequiresProof((current) => !current)}
                  style={[styles.chip, newRequiresProof && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, newRequiresProof && styles.chipTextSelected]}
                  >
                    Proof required
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toggle approval required"
                  onPress={() => setNewRequiresApproval((current) => !current)}
                  style={[styles.chip, newRequiresApproval && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      newRequiresApproval && styles.chipTextSelected
                    ]}
                  >
                    Approval required
                  </Text>
                </Pressable>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Create facility task"
                onPress={createTask}
                disabled={creating || !newTitle.trim()}
                style={[
                  styles.primaryBtn,
                  (creating || !newTitle.trim()) && styles.primaryBtnDisabled
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {creating ? "Creating..." : "Create Task"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.muted}>
              Keep the work queue in view. Open the creator when you need to add a task.
            </Text>
          )}
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading tasks...</Text>
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task queue</Text>
          <Text style={styles.muted}>{header}</Text>
          <Text style={styles.label}>Status</Text>
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
                accessibilityLabel={`Facility task queue filter ${option}`}
                onPress={() => setQueueFilter(option)}
                style={[styles.chip, queueFilter === option && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    queueFilter === option && styles.chipTextSelected
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Source</Text>
          <View style={styles.chipRow}>
            {availableSourceFilters.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Facility task source filter ${option}`}
                onPress={() => setSourceFilter(option)}
                style={[styles.chip, sourceFilter === option && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    sourceFilter === option && styles.chipTextSelected
                  ]}
                >
                  {option.replace(/_/g, " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <FlatList
          data={visibleItems}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
            />
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.muted}>
                  Create a task above or generate one from a room, SOP, alert, course,
                  live, tool run, product, or forum source.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open task ${title}`}
                onPress={() => {
                  if (id) {
                    router.push(`/home/facility/tasks/${encodeURIComponent(id)}` as any);
                  }
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {id ? <Text style={styles.chev}>{">"}</Text> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  muted: { opacity: 0.7 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  contextBanner: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    marginBottom: 8,
    padding: 10
  },
  contextTitle: { color: "#166534", fontWeight: "900" },
  form: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "white"
  },
  chipSelected: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  chipText: { color: "#0f172a", fontSize: 12, fontWeight: "800" },
  chipTextSelected: { color: "white" },
  inlineInputs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inlineInput: { minWidth: 160, flexGrow: 1 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "white"
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },
  secondaryBtn: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  secondaryText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  advancedPanel: {
    backgroundColor: "#f8fafc",
    borderRadius: radius.card,
    gap: 8,
    padding: 10
  },

  loading: { paddingVertical: 18, alignItems: "center" },

  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 }
});
