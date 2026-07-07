import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { completeFacilityTask, deleteTask, getTask, updateTask } from "@/api/tasks";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

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

function canManageRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

function renderKV(obj: AnyRec, key: string) {
  const v = obj?.[key];
  if (v === undefined || v === null || v === "") return null;
  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
}

export default function FacilityTaskDetail() {
  const router = useRouter();
  const ent = useEntitlements();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({
    title: "",
    notes: "",
    dueDate: "",
    assignedTo: "",
    sourceType: "manual",
    sourceObjectId: "",
    roomId: "",
    requiresProof: false,
    requiresApproval: false
  });

  const canWrite = !!ent?.can?.(CAPABILITY_KEYS.TASKS_WRITE);
  const canAssign = canWrite && canManageRole(ent?.facilityRole);
  const canDelete = canWrite && canManageRole(ent?.facilityRole);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        setFeedback("");
        const res = await getTask(facilityId, String(id));
        setItem((res as AnyRec) ?? null);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, id, clearError, handleApiError]
  );

  useEffect(() => {
    if (!item) return;
    setForm({
      title: String(item.title ?? item.name ?? ""),
      notes: String(item.notes ?? item.description ?? ""),
      dueDate: dateOnly(item.dueDate ?? item.dueAt ?? item.due),
      assignedTo: pickId(item.assignedTo ?? item.assignee),
      sourceType: String(item.sourceType ?? "manual"),
      sourceObjectId: String(item.sourceObjectId ?? item.sourceId ?? ""),
      roomId: String(item.roomId ?? item.linkedRoomId ?? ""),
      requiresProof: Boolean(item.requiresProof),
      requiresApproval: Boolean(item.requiresApproval)
    });
  }, [item]);

  const update = useCallback(
    async (patch: AnyRec, message = "Task updated.") => {
      if (!facilityId || !id || !canWrite) return;
      setSaving(true);
      setFeedback("");
      try {
        clearError();
        const res = await updateTask(facilityId, String(id), patch);
        setItem((res as AnyRec) ?? item);
        setFeedback(message);
      } catch (e) {
        handleApiError(e);
      } finally {
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
      { assignedTo: form.assignedTo.trim() || null },
      form.assignedTo.trim() ? "Task assigned." : "Assignment cleared."
    );
  }

  async function saveWorkflowContext() {
    await update(
      {
        sourceType: form.sourceType,
        sourceObjectId: form.sourceObjectId.trim() || undefined,
        roomId: form.roomId.trim() || undefined,
        requiresProof: form.requiresProof,
        requiresApproval: form.requiresApproval
      },
      "Task workflow context saved."
    );
  }

  async function toggleComplete() {
    if (!facilityId || !id || !canWrite) return;
    setSaving(true);
    setFeedback("");
    try {
      clearError();
      const nextCompleted = !isComplete(item);
      const res = await completeFacilityTask(facilityId, String(id), nextCompleted);
      setItem((res as AnyRec) ?? item);
      setFeedback(nextCompleted ? "Task completed." : "Task reopened.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!facilityId || !id || !canDelete) return;
    setDeleting(true);
    setFeedback("");
    try {
      clearError();
      await deleteTask(facilityId, String(id));
      router.replace("/home/facility/tasks");
    } catch (e) {
      handleApiError(e);
    } finally {
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

  const keys = useMemo(() => {
    if (!item) return [];
    const preferred = [
      "id",
      "_id",
      "title",
      "status",
      "completed",
      "dueAt",
      "dueDate",
      "assignedTo",
      "assignee",
      "createdAt",
      "updatedAt",
      "notes",
      "description"
    ];
    const rest = Object.keys(item)
      .filter((k) => !preferred.includes(k))
      .sort();
    return [...preferred.filter((k) => k in item), ...rest];
  }, [item]);

  return (
    <ScreenBoundary title={title}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading task...</Text>
          </View>
        ) : null}
        {!loading && !item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.muted}>This task could not be loaded.</Text>
          </View>
        ) : null}
        {item ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Task Workflow</Text>
              <Text style={styles.summaryLine}>
                {sourceObjectLabel(item.sourceType)}{" "}
                {item.sourceObjectId || item.sourceId
                  ? String(item.sourceObjectId ?? item.sourceId)
                  : "source not linked"}
                {item.roomId || item.linkedRoomId
                  ? ` | Room: ${String(item.roomId ?? item.linkedRoomId)}`
                  : ""}
              </Text>
              <Text style={styles.summaryLine}>
                {item.requiresProof ? "Proof required" : "Proof optional"} |{" "}
                {item.requiresApproval ? "Approval required" : "Approval optional"}
              </Text>
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
                    multiline
                  />

                  <Text style={styles.label}>Due date</Text>
                  <TextInput
                    accessibilityLabel="Task detail due date"
                    value={form.dueDate}
                    onChangeText={(dueDate) =>
                      setForm((current) => ({ ...current, dueDate }))
                    }
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                  />

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Save task details"
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
                      <Text style={styles.label}>Assign to user id</Text>
                      <TextInput
                        accessibilityLabel="Task detail assignee"
                        value={form.assignedTo}
                        onChangeText={(assignedTo) =>
                          setForm((current) => ({ ...current, assignedTo }))
                        }
                        style={styles.input}
                        placeholder="user id"
                      />
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Save task assignment"
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
                    <View style={styles.chipRow}>
                      {sourceTypes.map((sourceType) => (
                        <TouchableOpacity
                          key={sourceType}
                          accessibilityRole="button"
                          accessibilityLabel={`Set task detail source ${sourceType}`}
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
                            {sourceType.replace(/_/g, " ")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Linked source / room</Text>
                    <View style={styles.inlineInputs}>
                      <TextInput
                        accessibilityLabel="Task detail source object"
                        value={form.sourceObjectId}
                        onChangeText={(sourceObjectId) =>
                          setForm((current) => ({ ...current, sourceObjectId }))
                        }
                        style={[styles.input, styles.inlineInput]}
                        placeholder="source object id"
                      />
                      <TextInput
                        accessibilityLabel="Task detail room"
                        value={form.roomId}
                        onChangeText={(roomId) =>
                          setForm((current) => ({ ...current, roomId }))
                        }
                        style={[styles.input, styles.inlineInput]}
                        placeholder="room id"
                      />
                    </View>
                  </View>

                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Toggle task detail proof required"
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
                      accessibilityRole="button"
                      accessibilityLabel="Toggle task detail approval required"
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
              <Text style={styles.sectionTitle}>Task Details</Text>
              <View style={styles.kvWrap}>{keys.map((key) => renderKV(item, key))}</View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  muted: { opacity: 0.7 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  form: { gap: 12 },
  formGroup: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  summaryLine: { color: "#334155", fontWeight: "700" },
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
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  statusRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  primaryBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },
  secondaryBtnText: { fontWeight: "800" },
  dangerBtnText: { color: "#B91C1C", fontWeight: "800" },

  kvWrap: { gap: 10, marginTop: 8 },
  kv: { gap: 4 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },

  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  }
});
