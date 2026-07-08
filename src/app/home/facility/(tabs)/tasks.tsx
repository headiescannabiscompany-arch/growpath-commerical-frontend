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
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { createTask as createFacilityTask, getFacilityTasks } from "@/api/tasks";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useEntitlements } from "@/entitlements";
import { getFacilityTaskAccess } from "@/features/facility/taskAccess";
import SchedulePicker from "@/components/schedule/SchedulePicker";

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
  "live",
  "toolrun",
  "recipe",
  "product",
  "product_batch",
  "product_trial",
  "forum"
] as const;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.tasks)) return res.tasks;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.taskId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.name ?? x?.label ?? x?.type ?? "Task");
}

function pickSubtitle(x: AnyRec): string {
  const due = x?.dueAt ?? x?.dueDate ?? x?.due;
  const status = x?.status ?? x?.state;
  const assignee = x?.assigneeName ?? x?.assignee ?? x?.assignedTo;
  const sourceType = x?.sourceType;
  const sourceObjectId = x?.sourceObjectId ?? x?.sourceId;
  const roomId = x?.roomId ?? x?.linkedRoomId;
  const proof = x?.requiresProof ? "Proof required" : "";
  const approval = x?.requiresApproval ? "Approval required" : "";

  const a = due ? `Due: ${String(due)}` : "";
  const b = status ? `Status: ${String(status)}` : "";
  const c = assignee ? `Assignee: ${String(assignee)}` : "";
  const d = sourceType
    ? `Source: ${String(sourceType).replace(/_/g, " ")}${sourceObjectId ? ` ${String(sourceObjectId)}` : ""}`
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
    case "sensor_alert":
    case "alert":
      return { ...roomLink, linkedAlertId: sourceObjectId || undefined };
    case "course":
      return { ...roomLink, linkedCourseId: sourceObjectId || undefined };
    case "lesson":
      return { ...roomLink, linkedLessonId: sourceObjectId || undefined };
    case "live":
      return { ...roomLink, linkedLiveId: sourceObjectId || undefined };
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

export default function FacilityTasksRoute() {
  const router = useRouter();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();

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
  const [newRequiresProof, setNewRequiresProof] = useState(false);
  const [newRequiresApproval, setNewRequiresApproval] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await getFacilityTasks(facilityId);
        setItems(asArray(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const taskAccess = getFacilityTaskAccess({
    can: ent?.can,
    facilityRole: ent?.facilityRole
  });
  const canWrite = taskAccess.canCreateTask;
  const canAssign = taskAccess.canAssignTask;

  const createTask = useCallback(async () => {
    if (!facilityId || !canWrite) return;
    const title = newTitle.trim();
    if (!title) return;
    const cleanSourceObjectId = newSourceObjectId.trim();
    const cleanRoomId = newRoomId.trim();
    setCreating(true);
    try {
      clearError();
      await createFacilityTask(facilityId, {
        title,
        notes: newNotes.trim() || undefined,
        dueDate: newDueDate.trim() || undefined,
        assignedTo: canAssign ? newAssignedTo.trim() || undefined : undefined,
        sourceType: newSourceType,
        sourceObjectId: cleanSourceObjectId || undefined,
        roomId: cleanRoomId || undefined,
        ...linkedFieldsForSource(newSourceType, cleanSourceObjectId, cleanRoomId),
        reminderPlan: newReminder.trim()
          ? { label: newReminder.trim(), channels: ["in_app"] }
          : undefined,
        recurrence: newRecurrence.trim() ? { rule: newRecurrence.trim() } : undefined,
        requiresProof: newRequiresProof || undefined,
        requiresApproval: newRequiresApproval || undefined,
        scope: "facility"
      });
      setNewTitle("");
      setNewNotes("");
      setNewDueDate("");
      setNewReminder("");
      setNewRecurrence("");
      setNewAssignedTo("");
      setNewSourceType("manual");
      setNewSourceObjectId("");
      setNewRoomId("");
      setNewRequiresProof(false);
      setNewRequiresApproval(false);
      await load({ refresh: true });
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
    newRequiresProof,
    newRequiresApproval,
    clearError,
    handleApiError,
    load
  ]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 task" : `${n} tasks`;
  }, [items.length]);

  return (
    <ScreenBoundary title="Tasks">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Task</Text>
          {!canWrite ? (
            <Text style={styles.muted}>{taskAccess.hiddenCreateReason}</Text>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Title</Text>
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
                  <Text style={styles.label}>Assign to user id (optional)</Text>
                  <TextInput
                    accessibilityLabel="Facility task assignee"
                    value={newAssignedTo}
                    onChangeText={setNewAssignedTo}
                    style={styles.input}
                    placeholder="user id"
                  />
                </>
              ) : (
                <Text style={styles.muted}>
                  Only owners and managers can assign facility tasks.
                </Text>
              )}

              <Text style={styles.label}>Source</Text>
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

              <Text style={styles.label}>Linked source / room</Text>
              <View style={styles.inlineInputs}>
                <TextInput
                  accessibilityLabel="Facility task source object"
                  value={newSourceObjectId}
                  onChangeText={setNewSourceObjectId}
                  style={[styles.input, styles.inlineInput]}
                  placeholder="source object id"
                />
                <TextInput
                  accessibilityLabel="Facility task room"
                  value={newRoomId}
                  onChangeText={setNewRoomId}
                  style={[styles.input, styles.inlineInput]}
                  placeholder="room id"
                />
              </View>

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
          )}
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading tasks...</Text>
          </View>
        ) : null}
        <FlatList
          data={items}
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
                  When tasks exist on the backend, they will show up here.
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
                  if (!id) return;
                  router.push({ pathname: "/home/facility/tasks/[id]", params: { id } });
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
                <Text style={styles.chev}>{">"}</Text>
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
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
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
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },

  loading: { paddingVertical: 18, alignItems: "center" },

  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
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
