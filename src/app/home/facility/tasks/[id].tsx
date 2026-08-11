import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import CalendarDateField from "@/components/forms/CalendarDateField";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { completeFacilityTask, deleteTask, getTask, updateTask } from "@/api/tasks";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { listTeamMembers, type TeamMember } from "@/api/team";
import { useFacilityRooms } from "@/features/facility/useFacilityRooms";
import { sourceObjectHref } from "@/utils/sourceLinks";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type AnyRec = Record<string, any>;

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

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.name ?? x?.label ?? x?.type ?? "Task Detail");
}

function pickId(value: unknown) {
  if (!value) return "";
  if (typeof value === "object") {
    const row = value as AnyRec;
    return String(row.id ?? row._id ?? "");
  }
  return String(value);
}

function isComplete(item: AnyRec | null) {
  if (!item) return false;
  const status = String(item.status ?? item.state ?? "").toUpperCase();
  return Boolean(item.completed) || status === "DONE" || status === "COMPLETE";
}

function dateOnly(value: unknown) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function sourceObjectLabel(sourceType: unknown) {
  const source = String(sourceType || "")
    .replace(/_/g, " ")
    .trim();
  if (!source) return "Source";
  return source.replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstSourceValue(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function taskSourceId(item: AnyRec | null): string {
  if (!item) return "";
  const sourceType = String(item.sourceType || "");
  const directSource = firstSourceValue(item.sourceObjectId, item.sourceId);
  if (directSource) return String(directSource);
  if (sourceType === "room") return String(item.linkedRoomId || item.roomId || "");
  if (sourceType === "facility_run")
    return String(item.linkedFacilityRunId || item.facilityRunId || "");
  if (sourceType === "sop") return String(item.linkedSopId || item.sopId || "");
  if (sourceType === "alert") return String(item.linkedAlertId || item.alertId || "");
  if (sourceType === "sensor_alert")
    return String(item.linkedSensorAlertId || item.sensorAlertId || "");
  if (sourceType === "course") return String(item.linkedCourseId || item.courseId || "");
  if (sourceType === "lesson")
    return String(item.linkedLessonId || item.lessonId || item.linkedCourseId || "");
  if (sourceType === "course_assignment")
    return String(
      item.linkedCourseAssignmentId ||
        item.courseAssignmentId ||
        item.linkedLessonId ||
        item.linkedCourseId ||
        ""
    );
  if (sourceType === "live") return String(item.linkedLiveId || item.liveId || "");
  if (sourceType === "feed_campaign" || sourceType === "feed_post") {
    return String(
      firstSourceValue(
        item.linkedFeedCampaignId,
        item.feedCampaignId,
        item.campaignId,
        item.linkedFeedPostId
      ) || ""
    );
  }
  if (sourceType === "toolrun" || sourceType === "tool_run")
    return String(item.linkedToolRunId || item.toolRunId || "");
  if (sourceType === "recipe")
    return String(item.linkedRecipeId || item.recipeId || item.linkedToolRunId || "");
  if (sourceType === "product")
    return String(item.linkedProductId || item.productId || "");
  if (sourceType === "product_batch")
    return String(item.linkedProductBatchId || item.productBatchId || "");
  if (sourceType === "product_trial")
    return String(item.linkedProductTrialId || item.linkedTrialId || "");
  if (sourceType === "forum") {
    return String(item.linkedForumThreadId || item.forumThreadId || "");
  }
  return String(
    firstSourceValue(
      item.linkedRoomId,
      item.linkedFacilityRunId,
      item.linkedSopId,
      item.linkedAlertId,
      item.linkedSensorAlertId,
      item.linkedCourseAssignmentId,
      item.linkedCourseId,
      item.linkedLessonId,
      item.linkedLiveId,
      item.linkedFeedCampaignId,
      item.linkedFeedPostId,
      item.linkedToolRunId,
      item.linkedRecipeId,
      item.linkedProductId,
      item.linkedProductBatchId,
      item.linkedProductTrialId,
      item.linkedForumThreadId
    ) || ""
  );
}

function taskSourceReference(item: AnyRec | null): string {
  if (!item) return "";
  return taskSourceId(item);
}

function taskSourcePath(item: AnyRec | null): string {
  if (!item) return "";
  return sourceObjectHref({
    ...item,
    sourceId: taskSourceId(item),
    workspaceType: "facility"
  });
}

function linkedObjectPath(item: AnyRec | null): string {
  if (!item) return "";
  const sourceByPriority = [
    item.linkedProductId && {
      sourceType: "product",
      sourceId: item.linkedProductId,
      linkedProductId: item.linkedProductId
    },
    item.linkedProductBatchId && {
      sourceType: "product_batch",
      sourceId: item.linkedProductBatchId,
      linkedProductBatchId: item.linkedProductBatchId,
      linkedProductId: item.linkedProductId || undefined
    },
    (item.linkedProductTrialId || item.linkedTrialId) && {
      sourceType: "product_trial",
      sourceId: item.linkedProductTrialId || item.linkedTrialId,
      linkedProductTrialId: item.linkedProductTrialId || item.linkedTrialId
    },
    item.linkedCourseAssignmentId && {
      sourceType: "course_assignment",
      sourceId: item.linkedCourseAssignmentId,
      linkedCourseAssignmentId: item.linkedCourseAssignmentId,
      linkedCourseId: item.linkedCourseId || undefined,
      linkedLessonId: item.linkedLessonId || undefined
    },
    item.linkedLessonId && {
      sourceType: "lesson",
      sourceId: item.linkedLessonId,
      linkedLessonId: item.linkedLessonId,
      linkedCourseId: item.linkedCourseId || undefined
    },
    item.linkedCourseId && {
      sourceType: "course",
      sourceId: item.linkedCourseId,
      linkedCourseId: item.linkedCourseId
    },
    item.linkedLiveId && {
      sourceType: "live",
      sourceId: item.linkedLiveId,
      linkedLiveId: item.linkedLiveId
    },
    (item.linkedFeedCampaignId || item.feedCampaignId || item.campaignId) && {
      sourceType: "feed_campaign",
      sourceId: item.linkedFeedCampaignId || item.feedCampaignId || item.campaignId,
      linkedFeedCampaignId:
        item.linkedFeedCampaignId || item.feedCampaignId || item.campaignId
    },
    item.linkedForumThreadId && {
      sourceType: "forum",
      sourceId: item.linkedForumThreadId,
      linkedForumThreadId: item.linkedForumThreadId
    }
  ].find(Boolean);

  if (!sourceByPriority) return "";

  return sourceObjectHref({
    ...item,
    ...(sourceByPriority as Record<string, string | undefined>),
    workspaceType: "facility"
  });
}

function canManageRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

function rowId(row: AnyRec) {
  return String(row?.id ?? row?._id ?? "");
}

function rowName(row: AnyRec, fallback: string) {
  return String(row?.name ?? row?.title ?? row?.label ?? fallback);
}

function memberId(member: TeamMember) {
  return String(member.userId || member.id || "");
}

function memberLabel(member: TeamMember) {
  return String(member.name || member.email || "Team member");
}

function formatDate(value: unknown) {
  if (!value) return "Not set";
  const text = String(value);
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
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

function taskFormFromItem(item?: AnyRec | null) {
  return {
    title: String(item?.title ?? item?.name ?? ""),
    notes: String(item?.notes ?? item?.description ?? ""),
    dueDate: dateOnly(item?.dueDate ?? item?.dueAt ?? item?.due),
    assignedTo: pickId(item?.assignedToUserId ?? item?.assignedTo ?? item?.assignee),
    sourceType: String(item?.sourceType ?? "manual"),
    sourceObjectId: String(item?.sourceObjectId ?? item?.sourceId ?? ""),
    roomId: String(item?.roomId ?? item?.linkedRoomId ?? ""),
    requiresProof: Boolean(item?.requiresProof),
    requiresApproval: Boolean(item?.requiresApproval)
  };
}

export default function FacilityTaskDetail() {
  const router = useRouter();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityTaskDetailStyles(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedId: facilityId } = useFacility();
  const { rooms } = useFacilityRooms(facilityId);

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

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAdvancedLinkage, setShowAdvancedLinkage] = useState(false);
  const loadInFlightRef = useRef(false);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const [form, setForm] = useState(() => taskFormFromItem());

  const canWrite = !!ent?.can?.(CAPABILITY_KEYS.TASKS_WRITE);
  const canAssign = canWrite && canManageRole(ent?.facilityRole);
  const canDelete = canWrite && canManageRole(ent?.facilityRole);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id || loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        setFeedback("");
        const [res, team] = await Promise.all([
          getTask(facilityId, String(id)),
          canAssign
            ? listTeamMembers(facilityId).catch(() => [] as TeamMember[])
            : Promise.resolve([] as TeamMember[])
        ]);
        const nextItem = (res as AnyRec) ?? null;
        setItem(nextItem);
        setForm(taskFormFromItem(nextItem));
        setMembers(team);
      } catch (e) {
        handleApiError(e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, id, canAssign, clearError, handleApiError]
  );

  const update = useCallback(
    async (patch: AnyRec, message = "Task updated.") => {
      if (!facilityId || !id || !canWrite || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setFeedback("");
      try {
        clearError();
        const res = await updateTask(facilityId, String(id), patch);
        const nextItem = {
          ...(item ?? {}),
          ...patch,
          ...(res ? (res as AnyRec) : {})
        };
        setItem(nextItem);
        setForm(taskFormFromItem(nextItem));
        setFeedback(message);
      } catch (e) {
        handleApiError(e);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [facilityId, id, canWrite, clearError, handleApiError, item]
  );

  async function saveDetails() {
    await update(
      {
        title: form.title.trim(),
        notes: form.notes.trim() || undefined,
        description: form.notes.trim() || undefined,
        dueDate: form.dueDate.trim() || undefined
      },
      "Task details saved."
    );
  }

  async function saveAssignment() {
    if (!canAssign) return;
    await update(
      {
        assignedTo: form.assignedTo.trim() || null,
        assignedToUserId: form.assignedTo.trim() || null
      },
      form.assignedTo.trim() ? "Task assigned." : "Assignment cleared."
    );
  }

  async function saveWorkflowContext() {
    const cleanSourceObjectId = form.sourceObjectId.trim();
    const cleanRoomId = form.roomId.trim();
    await update(
      {
        sourceType: form.sourceType,
        sourceObjectId: cleanSourceObjectId || undefined,
        roomId: cleanRoomId || undefined,
        ...linkedFieldsForSource(form.sourceType, cleanSourceObjectId, cleanRoomId),
        requiresProof: form.requiresProof,
        requiresApproval: form.requiresApproval
      },
      "Task workflow context saved."
    );
  }

  async function toggleComplete() {
    if (!facilityId || !id || !canWrite || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFeedback("");
    try {
      clearError();
      const nextCompleted = !isComplete(item);
      const res = await completeFacilityTask(facilityId, String(id), nextCompleted);
      const nextItem = res ? { ...item, ...(res as AnyRec) } : item;
      setItem(nextItem);
      setForm(taskFormFromItem(nextItem));
      setFeedback(nextCompleted ? "Task completed." : "Task reopened.");
    } catch (e) {
      handleApiError(e);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function remove() {
    if (!facilityId || !id || !canDelete || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setFeedback("");
    try {
      clearError();
      await deleteTask(facilityId, String(id));
      router.replace("/home/facility/tasks");
    } catch (e) {
      handleApiError(e);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!id) {
      router.back();
      return;
    }
    load();
  }, [facilityId, id, load, router]);

  const title = useMemo(() => (item ? pickTitle(item) : "Task Detail"), [item]);
  const complete = isComplete(item);
  const sourcePath = taskSourcePath(item);
  const targetPath = linkedObjectPath(item);
  const showTargetPath = targetPath && (!sourcePath || targetPath !== sourcePath);
  const sourceReference = taskSourceReference(item);
  const assignedId = pickId(item?.assignedToUserId ?? item?.assignedTo ?? item?.assignee);
  const assignedMember = members.find((member) => memberId(member) === assignedId);
  const assigneeName = assignedMember
    ? memberLabel(assignedMember)
    : item?.assigneeName
      ? String(item.assigneeName)
      : assignedId
        ? "Assigned team member"
        : "Unassigned";
  const linkedRoomId = pickId(item?.linkedRoomId ?? item?.roomId);
  const linkedRoom = rooms.find((room) => rowId(room) === linkedRoomId);
  const linkedRoomName = linkedRoom
    ? rowName(linkedRoom, "Room")
    : linkedRoomId
      ? "Linked room"
      : "No room";

  return (
    <ScreenBoundary title={title} showBack backFallbackHref="/home/facility/tasks">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}
        {loading ? (
          <View
            accessibilityLabel="Loading facility task details"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading task...</Text>
          </View>
        ) : null}
        {!loading && !item ? (
          <View style={styles.empty}>
            <Text accessibilityRole="header" aria-level={1} style={styles.emptyTitle}>
              Task not found
            </Text>
            <Text style={styles.muted}>This task could not be loaded.</Text>
          </View>
        ) : null}
        {item ? (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={1} style={styles.taskTitle}>
                {title}
              </Text>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Task Workflow
              </Text>
              <Text style={styles.summaryLine}>
                Source: {sourceObjectLabel(item.sourceType || "manual")}
                {sourceReference ? " · Linked record available" : " · No linked record"}
              </Text>
              <Text style={styles.summaryLine}>Room: {linkedRoomName}</Text>
              <Text style={styles.summaryLine}>Assigned to: {assigneeName}</Text>
              <Text style={styles.summaryLine}>
                {item.requiresProof ? "Proof required" : "Proof optional"} |{" "}
                {item.requiresApproval ? "Approval required" : "Approval optional"}
              </Text>
              {sourcePath ? (
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="View facility task source"
                  onPress={() => router.push(sourcePath as any)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>View Source</Text>
                </TouchableOpacity>
              ) : null}
              {showTargetPath ? (
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel="View facility task linked object"
                  onPress={() => router.push(targetPath as any)}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>View Linked Object</Text>
                </TouchableOpacity>
              ) : null}
              {!canWrite ? (
                <Text style={styles.muted}>
                  You do not have permission to update tasks.
                </Text>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    accessibilityLabel="Task detail title"
                    value={form.title}
                    onChangeText={(titleText) =>
                      setForm((current) => ({ ...current, title: titleText }))
                    }
                    style={styles.input}
                    placeholder="Task title"
                    placeholderTextColor={palette.textMuted}
                  />

                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    accessibilityLabel="Task detail notes"
                    value={form.notes}
                    onChangeText={(notes) =>
                      setForm((current) => ({ ...current, notes }))
                    }
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Task notes"
                    placeholderTextColor={palette.textMuted}
                    multiline
                  />

                  <CalendarDateField
                    accessibilityLabel="Task detail due date"
                    label="Due date"
                    value={form.dueDate}
                    onChange={(dueDate) =>
                      setForm((current) => ({ ...current, dueDate }))
                    }
                    placeholder="Choose task due date"
                  />

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Save task details"
                    accessibilityState={{
                      busy: saving,
                      disabled: saving || !form.title.trim()
                    }}
                    onPress={saveDetails}
                    disabled={saving || !form.title.trim()}
                    style={[
                      styles.primaryBtn,
                      (saving || !form.title.trim()) && styles.primaryBtnDisabled
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>
                      {saving ? "Saving..." : "Save Details"}
                    </Text>
                  </TouchableOpacity>

                  {canAssign ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Assign to team member</Text>
                      <View
                        accessibilityLabel="Facility task assignee"
                        accessibilityRole="radiogroup"
                        style={styles.chipRow}
                      >
                        <TouchableOpacity
                          accessibilityRole="radio"
                          accessibilityLabel="Clear facility task assignment"
                          accessibilityState={{ checked: !form.assignedTo }}
                          onPress={() =>
                            setForm((current) => ({ ...current, assignedTo: "" }))
                          }
                          style={[styles.chip, !form.assignedTo && styles.chipSelected]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              !form.assignedTo && styles.chipTextSelected
                            ]}
                          >
                            Unassigned
                          </Text>
                        </TouchableOpacity>
                        {members.map((member) => {
                          const memberUserId = memberId(member);
                          const label = memberLabel(member);
                          if (!memberUserId) return null;
                          return (
                            <TouchableOpacity
                              key={memberUserId}
                              accessibilityRole="radio"
                              accessibilityLabel={`Assign facility task to ${label}`}
                              accessibilityState={{
                                checked: form.assignedTo === memberUserId
                              }}
                              onPress={() =>
                                setForm((current) => ({
                                  ...current,
                                  assignedTo: memberUserId
                                }))
                              }
                              style={[
                                styles.chip,
                                form.assignedTo === memberUserId && styles.chipSelected
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  form.assignedTo === memberUserId &&
                                    styles.chipTextSelected
                                ]}
                              >
                                {label} · {String(member.role || "member").toLowerCase()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Save task assignment"
                        accessibilityState={{ busy: saving, disabled: saving }}
                        onPress={saveAssignment}
                        disabled={saving}
                        style={[styles.secondaryBtn, saving && styles.primaryBtnDisabled]}
                      >
                        <Text style={styles.secondaryBtnText}>
                          {saving ? "Saving..." : "Save Assignment"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.muted}>
                      Only owners and managers can assign facility tasks.
                    </Text>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Source</Text>
                    <View
                      accessibilityLabel="Facility task source"
                      accessibilityRole="radiogroup"
                      style={styles.chipRow}
                    >
                      {sourceTypes.map((sourceType) => (
                        <TouchableOpacity
                          key={sourceType}
                          accessibilityRole="radio"
                          accessibilityLabel={`Set task detail source ${sourceType}`}
                          accessibilityState={{
                            checked: form.sourceType === sourceType
                          }}
                          onPress={() =>
                            setForm((current) => ({ ...current, sourceType }))
                          }
                          style={[
                            styles.chip,
                            form.sourceType === sourceType && styles.chipSelected
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              form.sourceType === sourceType && styles.chipTextSelected
                            ]}
                          >
                            {sourceObjectLabel(sourceType)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Room</Text>
                    <View
                      accessibilityLabel="Facility task room"
                      accessibilityRole="radiogroup"
                      style={styles.chipRow}
                    >
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityLabel="Clear task detail room"
                        accessibilityState={{ checked: !form.roomId }}
                        onPress={() => setForm((current) => ({ ...current, roomId: "" }))}
                        style={[styles.chip, !form.roomId && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            !form.roomId && styles.chipTextSelected
                          ]}
                        >
                          No room
                        </Text>
                      </TouchableOpacity>
                      {rooms.map((room) => {
                        const roomId = rowId(room);
                        const label = rowName(room, "Room");
                        if (!roomId) return null;
                        return (
                          <TouchableOpacity
                            key={roomId}
                            accessibilityRole="radio"
                            accessibilityLabel={`Set task detail room ${label}`}
                            accessibilityState={{ checked: form.roomId === roomId }}
                            onPress={() => setForm((current) => ({ ...current, roomId }))}
                            style={[
                              styles.chip,
                              form.roomId === roomId && styles.chipSelected
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                form.roomId === roomId && styles.chipTextSelected
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Toggle advanced task linkage"
                      accessibilityState={{ expanded: showAdvancedLinkage }}
                      onPress={() => setShowAdvancedLinkage((current) => !current)}
                      style={styles.secondaryBtn}
                    >
                      <Text style={styles.secondaryBtnText}>
                        {showAdvancedLinkage
                          ? "Hide Advanced Linkage"
                          : "Show Advanced Linkage"}
                      </Text>
                    </TouchableOpacity>
                    {showAdvancedLinkage ? (
                      <View style={styles.advancedPanel}>
                        <Text style={styles.helpText}>
                          Only use this when linking a record that cannot be selected from
                          its own GrowPath screen.
                        </Text>
                        <TextInput
                          accessibilityLabel="Task detail source object"
                          value={form.sourceObjectId}
                          onChangeText={(sourceObjectId) =>
                            setForm((current) => ({ ...current, sourceObjectId }))
                          }
                          style={styles.input}
                          placeholder="Linked record reference"
                          placeholderTextColor={palette.textMuted}
                        />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      accessibilityRole="checkbox"
                      accessibilityLabel="Toggle task detail proof required"
                      accessibilityState={{ checked: form.requiresProof }}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          requiresProof: !current.requiresProof
                        }))
                      }
                      style={[styles.chip, form.requiresProof && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          form.requiresProof && styles.chipTextSelected
                        ]}
                      >
                        Proof required
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="checkbox"
                      accessibilityLabel="Toggle task detail approval required"
                      accessibilityState={{ checked: form.requiresApproval }}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          requiresApproval: !current.requiresApproval
                        }))
                      }
                      style={[styles.chip, form.requiresApproval && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          form.requiresApproval && styles.chipTextSelected
                        ]}
                      >
                        Approval required
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Save task workflow context"
                    accessibilityState={{ busy: saving, disabled: saving }}
                    onPress={saveWorkflowContext}
                    disabled={saving}
                    style={[styles.secondaryBtn, saving && styles.primaryBtnDisabled]}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {saving ? "Saving..." : "Save Workflow Context"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.statusRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={complete ? "Reopen task" : "Complete task"}
                      accessibilityState={{ busy: saving, disabled: saving }}
                      onPress={toggleComplete}
                      disabled={saving}
                      style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                    >
                      <Text style={styles.primaryBtnText}>
                        {complete ? "Reopen Task" : "Complete Task"}
                      </Text>
                    </TouchableOpacity>
                    {canDelete ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Delete task"
                        accessibilityState={{ busy: deleting, disabled: deleting }}
                        onPress={remove}
                        disabled={deleting}
                        style={[styles.dangerBtn, deleting && styles.primaryBtnDisabled]}
                      >
                        <Text style={styles.dangerBtnText}>
                          {deleting ? "Deleting..." : "Delete Task"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Record Summary
              </Text>
              <Text style={styles.summaryLine}>
                Status:{" "}
                {complete ? "Completed" : sourceObjectLabel(item.status || "open")}
              </Text>
              <Text style={styles.summaryLine}>
                Due: {formatDate(item.dueAt ?? item.dueDate ?? item.due)}
              </Text>
              <Text style={styles.summaryLine}>
                Created: {formatDate(item.createdAt)}
              </Text>
              <Text style={styles.summaryLine}>
                Updated: {formatDate(item.updatedAt)}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createFacilityTaskDetailStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: palette.page },
    loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
    muted: { color: palette.textMuted },

    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.card,
      gap: 10
    },

    sectionTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 8
    },
    taskTitle: { color: palette.text, fontSize: 22, fontWeight: "900" },
    form: { gap: 12 },
    formGroup: { gap: 8 },
    label: { color: palette.textMuted, fontSize: 12 },
    summaryLine: { color: palette.textMuted, fontWeight: "700" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    chipTextSelected: { color: palette.accentText },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    inputMultiline: { minHeight: 72, textAlignVertical: "top" },
    statusRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
    primaryBtn: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    dangerBtn: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: palette.accentText, fontWeight: "800" },
    secondaryBtnText: { color: palette.link, fontWeight: "800" },
    dangerBtnText: { color: palette.danger, fontWeight: "800" },
    advancedPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    helpText: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },

    empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    feedback: {
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700"
    }
  });
